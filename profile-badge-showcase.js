/* Shadows Byte V2 — vitrina de hasta tres insignias desbloqueadas */
(() => {
  'use strict';
  const catalog=[
    {key:'link_promising_10',icon:'🥉',label:'Enlace Prometedor'},
    {key:'link_creator_50',icon:'🥈',label:'Creador Destacado'},
    {key:'link_star_100',icon:'🥇',label:'Estrella Gamer'},
    {key:'link_legend_500',icon:'💎',label:'Leyenda de la Comunidad'}
  ];
  const byKey=new Map(catalog.map(item=>[item.key,item]));
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const el=(tag,cls,label)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(label!==undefined)node.textContent=label;
    return node;
  };

  function mount(root,own){
    const identity=root.querySelector('.sbp-identity-card');
    if(!identity||identity.querySelector('.sbv-identity-showcase'))return;
    const heading=identity.querySelector('.sbp-identity-text h2');
    if(!heading)return;

    // Present the selected awards directly below the profile name.
    const strip=el('div','sbv-identity-showcase');
    strip.setAttribute('aria-label','Vitrina de insignias destacadas');
    strip.hidden=true;
    heading.after(strip);

    let editor=null,output=null,list=null,available=null,refresh=null;
    if(own){
      editor=el('section','profile-panel sbv-editor');
      editor.setAttribute('aria-label','Personalizar vitrina de insignias');
      editor.append(
        el('h2','','🎖️ Mi vitrina de insignias'),
        el('p','sbv-intro','Elige hasta tres insignias que ya hayas desbloqueado. Puedes cambiar el orden o quitarlas de la vitrina sin perder el logro.')
      );
      refresh=el('button','outline-btn mini','↻ Actualizar insignias');
      refresh.type='button';
      const seeNotices=el('button','outline-btn mini sbv-open-notifications','🔔 Ver avisos de logros');
      seeNotices.type='button';
      seeNotices.addEventListener('click',()=>{
        const bell=document.querySelector('.sb-badge-notify-toggle');
        if(bell){
          if(bell.getAttribute('aria-expanded')!=='true')bell.click();
          document.getElementById('sb-badge-notify-panel')?.scrollIntoView({
            behavior:'smooth',block:'nearest'
          });
        }else{
          output.textContent='La campana todavía no está disponible. Recarga la página.';
        }
      });
      output=el('p','sbv-status','Cargando vitrina…');
      output.setAttribute('role','status');
      output.setAttribute('aria-live','polite');
      list=el('div','sbv-selected');
      available=el('div','sbv-available');
      editor.append(refresh,seeNotices,output,el('h3','','Insignias destacadas'),list,
        el('h3','','Insignias desbloqueadas disponibles'),available);
      const anchor=root.querySelector('.sbgl-badges')||identity;
      anchor.after(editor);
    }

    const active=()=>root.isConnected&&strip.isConnected&&
      location.hash.slice(1).split('?')[0]===(own?'/cuenta':'/perfil');
    let seq=0,busy=false,personId=null,selected=[],unlocked=[];

    function drawStrip(){
      strip.replaceChildren();
      const display=selected.filter(key=>byKey.has(key)).slice(0,3);
      if(!display.length){
        strip.hidden=!own;
        if(own){
          strip.hidden=false;
          strip.append(el('small','sbv-strip-empty','🎖️ Sin insignias destacadas'));
        }
        return;
      }
      strip.hidden=false;
      const title=el('small','sbv-strip-title','🎖️ Vitrina de insignias');
      const tray=el('div','sbv-strip-tray');
      tray.setAttribute('role','list');
      display.forEach(key=>{
        const item=byKey.get(key);
        const chip=el('span','sbv-strip-chip',item.icon+' '+item.label);
        chip.setAttribute('role','listitem');
        chip.title=item.label;
        tray.append(chip);
      });
      strip.append(title,tray);
    }

    function drawEditor(){
      if(!own||!editor||!active())return;
      list.replaceChildren();
      available.replaceChildren();
      const total=selected.length;
      if(!total){
        list.append(el('p','sbv-empty','Todavía no has seleccionado insignias. Añade una desde la lista inferior.'));
      }
      const unlockedSet=new Set(unlocked);
      selected.forEach((key,index)=>{
        const badge=byKey.get(key);
        if(!badge)return;
        const row=el('div','sbv-selected-row');
        const name=el('strong','sbv-selected-label',badge.icon+' '+badge.label);
        const controls=el('div','sbv-controls');
        const up=el('button','outline-btn mini','↑ Subir');
        const down=el('button','outline-btn mini','↓ Bajar');
        const remove=el('button','outline-btn mini sbv-remove','Quitar');
        [up,down,remove].forEach(btn=>{btn.type='button';btn.disabled=busy;});
        up.disabled=busy||index===0;
        down.disabled=busy||index===total-1;
        up.setAttribute('aria-label','Subir '+badge.label);
        down.setAttribute('aria-label','Bajar '+badge.label);
        remove.setAttribute('aria-label','Quitar '+badge.label+' de la vitrina');
        up.addEventListener('click',()=>{
          if(busy||index===0)return;
          const next=selected.slice();
          [next[index-1],next[index]]=[next[index],next[index-1]];
          save(next,'Orden guardado.');
        });
        down.addEventListener('click',()=>{
          if(busy||index===total-1)return;
          const next=selected.slice();
          [next[index],next[index+1]]=[next[index+1],next[index]];
          save(next,'Orden guardado.');
        });
        remove.addEventListener('click',()=>{
          if(!busy)save(selected.filter(x=>x!==key),'Insignia quitada de la vitrina. El logro sigue desbloqueado.');
        });
        controls.append(up,down,remove);row.append(name,controls);list.append(row);
      });

      const candidateKeys=unlocked.filter(key=>byKey.has(key)&&!selected.includes(key));
      if(!candidateKeys.length){
        available.append(el('p','sbv-empty',unlockedSet.size===0
          ?'Todavía no has desbloqueado insignias de enlaces gamer. Conseguirás la primera al alcanzar 10 clics registrados.'
          :selected.length===unlockedSet.size
            ?'Todas tus insignias desbloqueadas ya están en la vitrina.'
            :'No hay más insignias disponibles.'));
      }else{
        for(const key of candidateKeys){
          const badge=byKey.get(key);
          const row=el('div','sbv-available-row');
          const title=el('span','',badge.icon+' '+badge.label);
          const add=el('button','gradient-btn mini','+ Añadir');
          add.type='button';add.disabled=busy||total>=3;
          add.setAttribute('aria-label','Añadir '+badge.label+' a la vitrina');
          add.addEventListener('click',()=>{
            if(!busy&&selected.length<3)save([...selected,key],'Insignia añadida a la vitrina.');
          });
          row.append(title,add);available.append(row);
        }
      }
      const legend=el('p','sbv-legend',
        total+' de 3 plazas ocupadas. Solo las insignias seleccionadas aparecen junto al nombre en el perfil público.');
      list.append(legend);
    }

    async function save(next,message){
      if(!own||busy||!personId||!active())return;
      busy=true;
      output.textContent='Guardando cambios…';
      drawEditor();
      try{
        const {data,error}=await sb.rpc('set_my_gamer_badge_showcase',{p_badges:next});
        if(error)throw error;
        if(!data||data.saved!==true)throw Error('No se confirmó el guardado.');
        if(!active())return;
        selected=next.slice();
        drawStrip();drawEditor();
        window.dispatchEvent(new Event('sb:badge-showcase-updated'));
        output.textContent=message;
      }catch(error){
        if(active()){
          output.textContent='No se pudieron guardar los cambios: '+String(error.message||'Error desconocido');
          drawEditor();
        }
      }finally{
        busy=false;
        if(active())drawEditor();
      }
    }

    async function load(){
      const ticket=++seq;
      if(own){refresh.disabled=true;output.textContent='Actualizando vitrina…';}
      try{
        if(typeof sb==='undefined'||!sb.rpc)throw Error('Supabase no disponible');
        let id;
        if(own){
          const {data,error}=await sb.auth.getUser();
          if(error||!data?.user?.id)throw Error('Inicia sesión para gestionar tu vitrina.');
          id=data.user.id;
        }else{
          id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
          if(!uuid.test(String(id)))throw Error('Perfil no disponible');
        }
        personId=id;
        const results=await Promise.all([
          sb.rpc('get_member_gamer_badge_showcase',{target_member:id}),
          ...(own?[sb.rpc('get_member_gamer_link_badges',{target_member:id})]:[])
        ]);
        if(!active()||ticket!==seq)return;
        if(results.some(res=>res.error))throw Error(results.find(res=>res.error).error.message);
        const records=results[0].data;
        if(!Array.isArray(records))throw Error('Datos de vitrina inesperados.');
        const unlockData=own?results[1].data:null;
        if(own&&(!unlockData||!Array.isArray(unlockData.badges)))throw Error('No se pudieron consultar tus logros.');
        unlocked=own?catalog.filter(info=>unlockData.badges.some(a=>a.key===info.key)).map(a=>a.key):[];
        selected=records.map(item=>item?.key).filter(key=>byKey.has(key)).slice(0,3);
        drawStrip();
        if(own){
          drawEditor();
          output.textContent=selected.length+' de 3 insignias destacadas · '+
            unlocked.length+' insignias desbloqueadas disponibles.';
        }
      }catch(error){
        if(!active()||ticket!==seq)return;
        if(own)output.textContent='No se pudo cargar la vitrina: '+String(error.message||'Error desconocido');
        else strip.hidden=true;
      }finally{
        if(own&&active()&&ticket===seq)refresh.disabled=false;
      }
    }
    if(own){
      refresh.addEventListener('click',()=>{if(!busy)load();});
      const sync=()=>{if(!busy&&active())load();};
      window.addEventListener('sb:gamer-links-updated',sync);
      window.addEventListener('sb:badge-showcase-updated',sync);
      const app=document.getElementById('app');
      if(app){
        const observer=new MutationObserver(()=>{
          if(root.isConnected&&strip.isConnected)return;
          window.removeEventListener('sb:gamer-links-updated',sync);
          window.removeEventListener('sb:badge-showcase-updated',sync);
          observer.disconnect();
        });
        observer.observe(app,{childList:true,subtree:true});
      }
    }
    load();
  }

  let queued=false;
  function scan(){
    queued=false;
    const own=document.getElementById('account-profile');
    if(own?.querySelector('.sbp-identity-card'))mount(own,true);
    const other=document.getElementById('public-member-profile');
    if(other?.querySelector('.sbp-identity-card'))mount(other,false);
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan);}
  function init(){
    const root=document.getElementById('app');
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
