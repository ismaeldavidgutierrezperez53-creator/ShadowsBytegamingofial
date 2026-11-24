/* Diseños de marcos compartidos por miembros; likes y reutilización segura. */
(() => {
  'use strict';
  const SHOWCASE='member_community_reaction_badge_showcase';
  const CATALOG='member_community_reaction_badge_catalog';
  const STYLES=new Map([['anime','🌸 Anime'],['neon','💜 Neón'],['gold','👑 Dorado']]);
  const HEX=/^#[0-9a-fA-F]{6}$/;
  const el=(tag,cls,content)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=content;
    return node;
  };
  const client=()=>typeof sb!=='undefined'?sb:null;
  const route=()=>location.hash.split('?')[0];
  const isValid=x=>x && STYLES.has(x.frame_style)&&HEX.test(x.primary_color||'')&&HEX.test(x.glow_color||'');
  const ownOnly=id=>typeof id==='string' && /^[0-9a-f-]{36}$/i.test(id);
  function decorate(node,item){
    node.className='sb-community-fav-strip-chip sb-community-fav-style-'+
      item.frame_style+' sb-community-fav-custom-colors';
    node.style.setProperty('--sb-fav-main',item.primary_color);
    node.style.setProperty('--sb-fav-glow',item.glow_color);
  }
  function startPanel(parent,where){
    if(parent.querySelector('.sb-community-designs-public'))return;
    const personal=parent.querySelector('.sb-community-frame-gallery');
    if(!personal)return;
    const box=el('section','sb-community-designs-public');
    box.setAttribute('aria-label','Galería de diseños de la comunidad');
    box.append(el('h3','sb-community-designs-title','🌟 Galería de diseños de la comunidad'));
    box.append(el('p','sb-community-designs-intro',
      'Descubre marcos anime y gaming creados por otros miembros. Dale ❤️ Me gusta, guarda una copia privada o aplica el diseño a tus propias insignias destacadas. Solo aparecen diseños publicados voluntariamente.'));
    const actions=el('div','sb-community-designs-toolbar');
    const select=el('select','sb-community-designs-sort');
    select.setAttribute('aria-label','Orden de diseños de la comunidad');
    for(const [value,title] of [['recent','🆕 Más recientes'],['popular','❤️ Más populares']]){
      const option=el('option',null,title);
      option.value=value;select.append(option);
    }
    const reload=el('button','outline-btn mini','↻ Actualizar diseños');
    reload.type='button';
    actions.append(select,reload);
    const status=el('p','sb-community-designs-status','Abre el apartado para explorar los diseños.');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const list=el('div','sb-community-designs-list');
    box.append(actions,status,list);
    personal.after(box);

    const available=()=>box.isConnected&&route()===where&&
      (where!=='#/cuenta'||parent.open);
    let records=[],myBadges=[],myId='',busy=false,loading=false,sequence=0,lastLoad=0;
    const say=message=>{if(available())status.textContent=message;};
    async function who(){
      if(!client())throw Error('Supabase no disponible.');
      const {data,error}=await client().auth.getUser();
      if(error||!data?.user?.id)throw Error('Inicia sesión para ver y usar la galería.');
      return data.user.id;
    }
    function display(){
      if(!available())return;
      reload.disabled=busy||loading;
      list.replaceChildren();
      if(!records.length){
        list.append(el('p','sb-community-designs-empty',
          'Todavía no hay diseños compartidos. Publica uno desde «🎨 Mi galería de diseños» con el botón «🌟 Publicar en comunidad».'));
        return;
      }
      const sorted=records.slice().sort((a,b)=>{
        if(select.value==='popular'){
          const likes=(Number(b.like_count)||0)-(Number(a.like_count)||0);
          if(likes)return likes;
        }
        return new Date(b.shared_at).getTime()-new Date(a.shared_at).getTime();
      });
      for(const design of sorted){
        if(!isValid(design))continue;
        const own=design.creator_id===myId;
        const card=el('article','sb-community-designs-card');
        const heading=el('div','sb-community-designs-card-head');
        const chip=el('span','',design.frame_style==='anime'?'🌸':design.frame_style==='neon'?'💜':'👑');
        decorate(chip,design);
        chip.setAttribute('aria-hidden','true');
        const info=el('div','sb-community-designs-card-info');
        info.append(el('strong','sb-community-designs-name',design.design_name));
        const author=el('span','sb-community-designs-author',
          '👤 '+(own?'Tu diseño':(design.creator_name||'Miembro')));
        const styleLabel=el('small','sb-community-designs-colors',
          STYLES.get(design.frame_style)+' · '+design.primary_color.toUpperCase()+
          ' · '+design.glow_color.toUpperCase());
        info.append(author,styleLabel);
        heading.append(chip,info);
        card.append(heading);
        const choices=el('div','sb-community-designs-buttons');
        const likes=el('button','outline-btn mini sb-community-designs-like',
          (design.liked_by_me?'💖 Te gusta':'❤️ Me gusta')+
          ' ('+(Number(design.like_count)||0).toLocaleString('es-ES')+')');
        likes.type='button';
        likes.disabled=busy||own;
        likes.setAttribute('aria-pressed',String(Boolean(design.liked_by_me)));
        if(own)likes.title='No puedes dar Me gusta a tu propio diseño.';
        likes.addEventListener('click',()=>void mutate(
          ()=>client().rpc('toggle_community_frame_design_like',{
            p_design_id:design.design_id
          }),
          '❤️ Reacción actualizada.',false));
        const copy=el('button','outline-btn mini','📥 Guardar copia');
        copy.type='button';copy.disabled=busy||own;
        copy.addEventListener('click',()=>{
          const suggested=(design.design_name+' · copia').slice(0,40);
          const answer=window.prompt('Nombre para tu copia privada (2 a 40 caracteres):',suggested);
          if(answer===null)return;
          const name=answer.trim();
          if(name.length<2||name.length>40){
            say('El nombre de la copia debe tener entre 2 y 40 caracteres.');return;
          }
          void mutate(()=>client().rpc('copy_shared_community_frame_design',{
            p_design_id:design.design_id,p_new_name:name
          }),'📥 Copia guardada en «Mi galería de diseños».',false,true);
        });
        const target=el('select','sb-community-designs-target');
        target.setAttribute('aria-label','Insignia para aplicar el diseño '+design.design_name);
        const placeholder=el('option',null,'Selecciona insignia destacada');
        placeholder.value='';
        target.append(placeholder);
        for(const badge of myBadges){
          const option=el('option',null,(badge.emoji||'🏅')+' '+badge.title);
          option.value=badge.badge_key;target.append(option);
        }
        target.disabled=busy||!myBadges.length;
        target.value='';
        const apply=el('button','gradient-btn mini','✨ Usar en mi insignia');
        apply.type='button';apply.disabled=true;
        target.addEventListener('change',()=>{apply.disabled=busy||!target.value;});
        apply.addEventListener('click',()=>{
          if(!target.value)return;
          void mutate(()=>client().rpc('apply_shared_community_frame_design',{
            p_design_id:design.design_id,p_badge_key:target.value
          }),'✨ Diseño aplicado a tu insignia destacada.',true);
        });
        choices.append(likes,copy,target,apply);
        card.append(choices);
        list.append(card);
      }
      if(!myBadges.length){
        list.append(el('p','sb-community-designs-empty',
          'Para usar un diseño en tu perfil, destaca primero una insignia. También puedes guardar una copia en tu galería privada.'));
      }
    }
    async function load(){
      if(!available()||busy||loading)return;
      const ticket=++sequence;
      loading=true;reload.disabled=true;
      say('Cargando diseños compartidos…');
      try{
        const userId=await who();
        const [feed,highlights,catalog]=await Promise.all([
          client().rpc('list_shared_community_frame_designs'),
          client().from(SHOWCASE).select('badge_key,position').eq('user_id',userId).order('position'),
          client().from(CATALOG).select('badge_key,title,emoji')
        ]);
        const error=[feed,highlights,catalog].find(res=>res.error)?.error;
        if(error)throw error;
        const {data:session}=await client().auth.getSession();
        if(!available()||ticket!==sequence||session?.session?.user?.id!==userId)return;
        const names=new Map((catalog.data||[]).map(row=>[row.badge_key,row]));
        myBadges=(highlights.data||[])
          .filter(row=>names.has(row.badge_key))
          .map(row=>names.get(row.badge_key));
        records=(feed.data||[]).filter(isValid);
        myId=userId;
        lastLoad=Date.now();
        display();
        say(records.length+' diseños compartidos · '+myBadges.length+
          ' insignias destacadas en tu perfil.');
      }catch(error){
        console.warn('Galería comunitaria de diseños:',error);
        say('No se pudieron cargar los diseños: '+String(error?.message||'Error desconocido'));
      }finally{
        loading=false;
        if(available())reload.disabled=false;
      }
    }
    async function mutate(action,message,applied,imported=false){
      if(!available()||busy)return;
      busy=true;
      say('Guardando cambios…');
      display();
      try{
        const id=await who();
        if(myId && id!==myId)throw Error('Sesión cambiada. Recarga la página.');
        const {data,error}=await action();
        if(error)throw error;
        if(data===false||data==null&&applied)throw Error('Supabase no confirmó el guardado.');
        if(!available())return;
        if(applied){
          window.dispatchEvent(new Event('sb-community-reaction-frame-gallery-applied'));
          window.dispatchEvent(new Event('sb-community-reaction-showcase-updated'));
        }
        if(imported)window.dispatchEvent(new Event('sb-community-frame-designs-imported'));
        busy=false;
        await load();
        say(message);
      }catch(error){
        console.warn('Cambios de galería comunitaria:',error);
        say('No se pudieron guardar los cambios: '+String(error?.message||'Error desconocido'));
      }finally{
        busy=false;
        if(available())display();
      }
    }
    select.addEventListener('change',display);
    reload.addEventListener('click',()=>void load());
    if(where==='#/cuenta'){
      parent.addEventListener('toggle',()=>{if(parent.open)void load();});
    }else void load();
    window.addEventListener('sb-community-frame-designs-changed',()=>{
      if(available()&&!busy)void load();
    });
    window.addEventListener('sb-community-reaction-showcase-updated',()=>{
      if(available()&&!busy)void load();
    });
    window.addEventListener('focus',()=>{
      if(available()&&!busy&&Date.now()-lastLoad>30000)void load();
    });
  }
  let queued=false;
  function scan(){
    const current=route();
    if(current!=='#/cuenta'&&current!=='#/logros')return;
    const panel=current==='#/cuenta'
      ?document.querySelector('#account-profile .sb-community-fav-editor-account')
      :document.querySelector('#sb-community-fav-editor-logros');
    if(panel)startPanel(panel,current);
  }
  function schedule(){
    if(queued)return;
    queued=true;requestAnimationFrame(()=>{queued=false;scan();});
  }
  function init(){
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {subtree:true,childList:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
