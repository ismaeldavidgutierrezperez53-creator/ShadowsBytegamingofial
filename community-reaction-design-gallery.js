/* Galería privada de diseños reutilizables para insignias comunitarias. */
(() => {
  'use strict';
  const TABLE='member_community_reaction_frame_designs';
  const SHOWCASE='member_community_reaction_badge_showcase';
  const CATALOG='member_community_reaction_badge_catalog';
  const STYLES=new Map([['anime','🌸 Anime'],['neon','💜 Neón'],['gold','👑 Dorado']]);
  const HEX=/^#[0-9a-fA-F]{6}$/;
  const el=(tag,cls,label)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(label!==undefined)node.textContent=label;
    return node;
  };
  const api=()=>typeof sb!=='undefined'?sb:null;
  const path=()=>location.hash.split('?')[0];
  const labelFor=row=>(STYLES.get(row.frame_style)||'Marco')+' · '+row.primary_color.toUpperCase()+
    ' / '+row.glow_color.toUpperCase();
  const valid=row=>STYLES.has(row.frame_style)&&HEX.test(row.primary_color)&&HEX.test(row.glow_color);
  function decorateChip(chip,row){
    if(!valid(row))return;
    chip.className='sb-community-fav-strip-chip sb-community-fav-style-'+
      row.frame_style+' sb-community-fav-custom-colors';
    chip.style.setProperty('--sb-fav-main',row.primary_color);
    chip.style.setProperty('--sb-fav-glow',row.glow_color);
  }
  function mount(panel,route){
    if(panel.querySelector('.sb-community-frame-gallery'))return;
    const preview=panel.querySelector('.sb-community-fav-style-preview');
    if(!preview)return;
    const root=el('section','sb-community-frame-gallery');
    root.setAttribute('aria-label','Galería de diseños de marcos');
    root.append(el('h3','sb-community-frame-gallery-heading','🎨 Mi galería de diseños'));
    root.append(el('p','sb-community-frame-gallery-intro',
      'Guarda tus combinaciones con nombre y aplícalas a cualquier insignia que tengas destacada. Puedes guardar hasta 20 diseños privados.'));
    const form=el('div','sb-community-frame-gallery-form');
    const label=el('label','sb-community-frame-gallery-name');
    label.append(el('span',null,'Nombre del diseño'));
    const input=el('input','sb-community-frame-gallery-input');
    input.type='text';
    input.maxLength=40;
    input.placeholder='Ej.: Sakura violeta';
    input.autocomplete='off';
    input.setAttribute('aria-label','Nombre del diseño a guardar');
    label.append(input);
    const save=el('button','gradient-btn mini sb-community-frame-gallery-save',
      '💾 Guardar diseño de la vista previa');
    save.type='button';
    form.append(label,save);
    root.append(form);
    root.append(el('p','sb-community-frame-gallery-hint',
      'Si guardas otro diseño con el mismo nombre, se actualizará su combinación.'));
    const status=el('p','sb-community-frame-gallery-status',
      'Abre el apartado para consultar tus diseños.');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const list=el('div','sb-community-frame-gallery-list');
    root.append(status,list);
    const refresh=el('button','outline-btn mini','↻ Actualizar galería');
    refresh.type='button';
    root.append(refresh);
    preview.after(root);

    const isAccount=route==='#/cuenta';
    const active=()=>root.isConnected&&path()===route;
    const available=()=>active()&&(!isAccount||panel.open);
    let busy=false,loading=false,designs=[],badges=[],owner='',lastLoaded=0,seq=0;
    function announce(message){if(active())status.textContent=message;}
    function draw(){
      if(!active())return;
      list.replaceChildren();
      save.disabled=busy;
      refresh.disabled=busy||loading;
      if(!designs.length){
        list.append(el('p','sb-community-frame-gallery-empty',
          'Todavía no tienes diseños guardados. Personaliza el marco de arriba y guarda tu primera combinación.'));
        return;
      }
      for(const row of designs){
        if(!valid(row))continue;
        const card=el('article','sb-community-frame-gallery-card');
        const top=el('div','sb-community-frame-gallery-card-top');
        const chip=el('span','',row.frame_style==='anime'?'🌸':row.frame_style==='neon'?'💜':'👑');
        decorateChip(chip,row);
        const info=el('div','sb-community-frame-gallery-info');
        info.append(el('strong','sb-community-frame-gallery-design-name',row.design_name));
        info.append(el('small','sb-community-frame-gallery-caption',labelFor(row)));
        top.append(chip,info);
        card.append(top);
        const controls=el('div','sb-community-frame-gallery-controls');
        const see=el('button','outline-btn mini','👀 Vista previa');
        see.type='button';see.disabled=busy;
        see.addEventListener('click',()=>previewDesign(row));
        const target=el('select','sb-community-frame-gallery-target');
        target.setAttribute('aria-label','Insignia en la que aplicar '+row.design_name);
        const placeholder=el('option',null,'Elegir insignia destacada');
        placeholder.value='';
        target.append(placeholder);
        for(const badge of badges){
          const option=el('option',null,badge.emoji+' '+badge.title);
          option.value=badge.badge_key;
          target.append(option);
        }
        target.value='';
        target.disabled=busy||!badges.length;
        const apply=el('button','gradient-btn mini','✨ Aplicar diseño');
        apply.type='button';
        apply.disabled=true;
        target.addEventListener('change',()=>{
          apply.disabled=busy||!target.value;
        });
        apply.addEventListener('click',()=>{
          if(target.value)void runMutation(
            ()=>api().rpc('apply_my_community_frame_design',{
              p_design_id:row.design_id,p_badge_key:target.value
            }),
            'Diseño «'+row.design_name+'» aplicado correctamente.',true);
        });
        const remove=el('button','outline-btn mini sb-community-frame-gallery-delete','Eliminar');
        remove.type='button';remove.disabled=busy;
        remove.addEventListener('click',()=>{
          if(!window.confirm('¿Eliminar «'+row.design_name+'» de tu galería? Las insignias que ya usan sus colores no se modificarán.'))return;
          void runMutation(
            ()=>api().rpc('delete_my_community_frame_design',{p_design_id:row.design_id}),
            'Diseño «'+row.design_name+'» eliminado de la galería.',false);
        });
        controls.append(see,target,apply,remove);
        card.append(controls);
        list.append(card);
      }
      if(!badges.length){
        list.append(el('p','sb-community-frame-gallery-empty',
          'Para aplicar un diseño, destaca primero una insignia desde el apartado «Insignias desbloqueadas disponibles».'));
      }
    }
    async function getOwner(){
      const client=api();
      if(!client)throw Error('Supabase no está disponible.');
      const {data,error}=await client.auth.getUser();
      if(error||!data?.user?.id)throw Error('Inicia sesión para gestionar tu galería.');
      return data.user.id;
    }
    async function load(){
      if(!available()||busy||loading)return;
      loading=true;
      refresh.disabled=true;
      const ticket=++seq;
      announce('Cargando tus diseños…');
      try{
        const uid=await getOwner();
        const [saved,highlighted,catalog]=await Promise.all([
          api().from(TABLE)
            .select('design_id,design_name,frame_style,primary_color,glow_color,updated_at')
            .eq('user_id',uid).order('updated_at',{ascending:false}).limit(20),
          api().from(SHOWCASE).select('badge_key,position').eq('user_id',uid).order('position'),
          api().from(CATALOG).select('badge_key,title,emoji')
        ]);
        const failed=[saved,highlighted,catalog].find(r=>r.error);
        if(failed)throw failed.error;
        const {data:session}=await api().auth.getSession();
        if(!available()||ticket!==seq||session?.session?.user?.id!==uid)return;
        const names=new Map((catalog.data||[]).map(row=>[row.badge_key,row]));
        designs=(saved.data||[]).filter(valid);
        badges=(highlighted.data||[])
          .filter(b=>names.has(b.badge_key))
          .map(b=>({...names.get(b.badge_key)}));
        owner=uid;
        lastLoaded=Date.now();
        draw();
        announce(designs.length+' de 20 diseños guardados · '+badges.length+
          ' insignias destacadas disponibles para aplicar.');
      }catch(error){
        console.warn('Galería de diseños:',error);
        announce('No se pudo cargar la galería: '+String(error?.message||'Error desconocido'));
      }finally{
        loading=false;
        if(active())refresh.disabled=false;
      }
    }
    function previewDesign(row){
      if(!active()||!valid(row))return;
      const style=preview.querySelector('.sb-community-fav-preview-select');
      const colors=preview.querySelectorAll('.sb-community-fav-color-input');
      if(!style||colors.length<2)return;
      style.value=row.frame_style;
      style.dispatchEvent(new Event('change',{bubbles:true}));
      colors[0].value=row.primary_color;
      colors[1].value=row.glow_color;
      colors[0].dispatchEvent(new Event('input',{bubbles:true}));
      colors[1].dispatchEvent(new Event('input',{bubbles:true}));
      announce('Vista previa del diseño «'+row.design_name+'». Selecciona una insignia para aplicarlo.');
      preview.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    }
    async function runMutation(action,success,applied){
      if(!available()||busy)return;
      busy=true;
      save.disabled=true;
      refresh.disabled=true;
      announce('Guardando cambios…');
      draw();
      try{
        const uid=await getOwner();
        if(owner && owner!==uid)throw Error('La sesión cambió. Actualiza la página.');
        const {data,error}=await action();
        if(error)throw error;
        if(data===false||data==null)throw Error('Supabase no confirmó la operación.');
        if(!active())return;
        if(applied){
          window.dispatchEvent(new Event('sb-community-reaction-frame-gallery-applied'));
          window.dispatchEvent(new Event('sb-community-reaction-showcase-updated'));
        }
        busy=false;
        await load();
        announce(success);
      }catch(error){
        console.warn('Guardado de la galería:',error);
        announce('No se pudo completar la operación: '+String(error?.message||'Error desconocido'));
      }finally{
        busy=false;
        if(active())draw();
      }
    }
    save.addEventListener('click',()=>{
      const name=input.value.trim();
      const style=preview.querySelector('.sb-community-fav-preview-select')?.value;
      const colorInputs=preview.querySelectorAll('.sb-community-fav-color-input');
      const primary=colorInputs[0]?.value;
      const glow=colorInputs[1]?.value;
      if(name.length<2||name.length>40){
        announce('Escribe un nombre de entre 2 y 40 caracteres.');return;
      }
      if(!STYLES.has(style)||!HEX.test(primary||'')||!HEX.test(glow||'')){
        announce('Selecciona un marco y dos colores válidos.');return;
      }
      void runMutation(
        ()=>api().rpc('save_my_community_frame_design',{
          p_name:name,p_style:style,p_primary_color:primary,p_glow_color:glow
        }),
        'Diseño «'+name+'» guardado en tu galería.',false);
    });
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();save.click();}
    });
    refresh.addEventListener('click',()=>void load());
    if(isAccount){
      panel.addEventListener('toggle',()=>{if(panel.open)void load();});
    }else void load();
    window.addEventListener('sb-community-reaction-showcase-updated',()=>{
      if(available()&&!busy)void load();
    });
    window.addEventListener('focus',()=>{
      if(available()&&!busy&&Date.now()-lastLoaded>30000)void load();
    });
  }

  let scheduled=false;
  function scan(){
    const route=path();
    if(route!=='#/cuenta'&&route!=='#/logros')return;
    const panel=route==='#/cuenta'
      ?document.querySelector('#account-profile .sb-community-fav-editor-account')
      :document.getElementById('sb-community-fav-editor-logros');
    if(panel)mount(panel,route);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;scan();});
  }
  function start(){
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {subtree:true,childList:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
