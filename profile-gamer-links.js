/* Shadows Byte Gaming Official V2 — enlaces gamer privados o públicos */
(() => {
  'use strict';

  const platforms = {
    twitch: {name:'Twitch',icon:'🟣',hosts:['twitch.tv','www.twitch.tv'],example:'https://www.twitch.tv/tu_canal'},
    youtube: {name:'YouTube',icon:'▶️',hosts:['youtube.com','www.youtube.com','m.youtube.com','youtu.be'],example:'https://www.youtube.com/@tu_canal'},
    steam: {name:'Steam',icon:'🎮',hosts:['steamcommunity.com','www.steamcommunity.com'],example:'https://steamcommunity.com/id/tu_usuario'},
    discord: {name:'Discord',icon:'💬',hosts:['discord.gg','discord.com','www.discord.com'],example:'https://discord.gg/tu_invitacion'},
    tiktok: {name:'TikTok',icon:'🎵',hosts:['tiktok.com','www.tiktok.com'],example:'https://www.tiktok.com/@tu_usuario'},
    instagram: {name:'Instagram',icon:'📸',hosts:['instagram.com','www.instagram.com'],example:'https://www.instagram.com/tu_usuario/'},
    github: {name:'GitHub',icon:'🧑‍💻',hosts:['github.com','www.github.com'],example:'https://github.com/tu_usuario'},
    kick: {name:'Kick',icon:'🟢',hosts:['kick.com','www.kick.com'],example:'https://kick.com/tu_usuario'},
    x: {name:'X / Twitter',icon:'✖️',hosts:['x.com','www.x.com','twitter.com','www.twitter.com'],example:'https://x.com/tu_usuario'}
  };
  const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const create=(tag,klass,label)=>{
    const node=document.createElement(tag);
    if(klass)node.className=klass;
    if(label!==undefined)node.textContent=label;
    return node;
  };
  const safeUrl=(platform,url)=>{
    if(!platforms[platform]||typeof url!=='string'||url.length>300)return '';
    try{
      const parsed=new URL(url.trim());
      if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port
         ||!platforms[platform].hosts.includes(parsed.hostname.toLowerCase())
         ||!parsed.pathname.startsWith('/'))return '';
      if(!/^https:\/\/[a-z0-9.-]+\/[^\s]*$/i.test(url.trim()))return '';
      return parsed.href;
    }catch(_){return '';}
  };
  function mount(host,own){
    if(host.querySelector('.sbgl-links'))return;
    const identity=host.querySelector('.sbp-identity-card');
    if(!identity)return;
    const panel=create('section','profile-panel sbgl-links');
    const heading=create('h2','','🔗 Mis enlaces gamer');
    const lead=create('p','sbgl-intro',own
      ?'Añade hasta cinco enlaces. Ordena los guardados con ↑ y ↓ y destaca uno con ⭐. Solo se comparten los que tú hagas públicos.'
      :'Redes y plataformas que este miembro ha decidido compartir.');
    const message=create('p','sbgl-message',own?'Cargando tus enlaces…':'Consultando enlaces públicos…');
    message.setAttribute('role','status');
    message.setAttribute('aria-live','polite');
    const content=create('div','sbgl-content');
    panel.append(heading,lead,message,content);
    identity.after(panel);
    let revision=0;
    const active=()=>panel.isConnected &&
      location.hash.split('?')[0]===(own?'#/cuenta':'#/perfil');

    async function resolveId(){
      if(!own){
        const value=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
        return validId.test(String(value))?value:null;
      }
      if(typeof sb==='undefined'||!sb.auth)return null;
      const {data,error}=await sb.auth.getUser();
      if(error)throw error;
      return data?.user?.id||null;
    }


    const publicList=rows=>{
      panel.hidden=false;
      content.replaceChildren();
      const list=create('div','sbgl-public-list');
      const sorted=rows.slice().sort((a,b)=>
        Number(a.display_order??a.slot)-Number(b.display_order??b.slot)||
        Number(a.slot)-Number(b.slot));
      for(const item of sorted){
        if(item.is_public!==true||!platforms[item.platform])continue;
        const href=safeUrl(item.platform,item.url);
        if(!href)continue;
        const link=create('a','sbgl-public-link');
        if(item.is_featured===true)link.classList.add('is-featured');
        link.href=href;
        link.target='_blank';
        link.rel='noopener noreferrer nofollow ugc';
        link.referrerPolicy='no-referrer';
        link.append(create('span','sbgl-platform-icon',platforms[item.platform].icon));
        link.append(create('span','',platforms[item.platform].name));
        if(item.is_featured===true)link.append(create('span','sbgl-featured-badge','⭐ Favorito'));
        link.append(create('span','sbgl-external','↗'));
        link.setAttribute('aria-label',
          'Abrir '+platforms[item.platform].name+
          (item.is_featured===true?', enlace favorito':'')+' en una pestaña nueva');
        list.append(link);
      }
      if(!list.childElementCount){
        panel.hidden=true;return;
      }
      content.append(list);
      message.textContent=list.childElementCount+' enlace(s) compartido(s) por este miembro.';
    };

    function ownerEditor(id,rows){
      content.replaceChildren();
      const saved=new Map(rows.map(item=>[Number(item.slot),item]));
      const sortedSaved=rows.slice().sort((a,b)=>
        Number(a.display_order??a.slot)-Number(b.display_order??b.slot)||
        Number(a.slot)-Number(b.slot));
      const savedOrder=sortedSaved.map(item=>Number(item.slot));
      const allSlots=[...savedOrder];
      for(let slot=1;slot<=5;slot++)if(!saved.has(slot))allSlots.push(slot);
      const editor=create('div','sbgl-editor');

      const showStatus=text=>{if(active())message.textContent=text;};
      for(const slot of allSlots){
        const initial=saved.get(slot);
        const row=create('div','sbgl-editor-row');
        if(initial?.is_featured===true)row.classList.add('is-featured');
        const rowLabel=create('strong','sbgl-row-title',
          'Enlace '+slot+(initial?' · Guardado':' · Sin configurar')+
          (initial?.is_featured===true?' · ⭐ Favorito':''));

        const fields=create('div','sbgl-fields');
        const platformLabel=create('label','sbgl-field','Plataforma');
        const platform=create('select');
        platform.setAttribute('aria-label','Plataforma del enlace '+slot);
        for(const [key,option] of Object.entries(platforms)){
          const opt=create('option','',option.icon+' '+option.name);
          opt.value=key;
          platform.append(opt);
        }
        platform.value=initial?.platform&&platforms[initial.platform]?initial.platform:'twitch';
        platformLabel.append(platform);
        const urlLabel=create('label','sbgl-field sbgl-url-label','Dirección HTTPS de tu perfil o canal');
        const url=create('input');
        url.type='url';
        url.inputMode='url';
        url.maxLength=300;
        url.autocomplete='url';
        url.spellcheck=false;
        url.value=initial?.url||'';
        url.placeholder=platforms[platform.value].example;
        url.setAttribute('aria-label','URL del enlace '+slot);
        platform.addEventListener('change',()=>{url.placeholder=platforms[platform.value].example;});
        urlLabel.append(url);
        fields.append(platformLabel,urlLabel);

        const actions=create('div','sbgl-row-actions');
        const visibleLabel=create('label','sbgl-visible');
        const visible=create('input');
        visible.type='checkbox';
        visible.checked=initial?initial.is_public===true:true;
        visibleLabel.append(visible,document.createTextNode(' Mostrar en mi perfil público'));

        const orderActions=create('div','sbgl-order-controls');
        orderActions.setAttribute('role','group');
        orderActions.setAttribute('aria-label','Orden del enlace '+slot);
        const up=create('button','outline-btn mini sbgl-order-btn','↑ Subir');
        const down=create('button','outline-btn mini sbgl-order-btn','↓ Bajar');
        up.type='button';down.type='button';
        orderActions.append(up,down);

        const featured=create('button','outline-btn mini sbgl-favorite-btn',
          initial?.is_featured===true?'⭐ Quitar favorito':'☆ Destacar');
        featured.type='button';
        featured.setAttribute('aria-pressed',String(initial?.is_featured===true));
        featured.setAttribute('aria-label',
          (initial?.is_featured===true?'Quitar favorito del':'Destacar como favorito el')+' enlace '+slot);
        const save=create('button','gradient-btn mini','💾 Guardar');
        save.type='button';
        const remove=create('button','outline-btn mini','Eliminar');
        remove.type='button';

        const status=create('small','sbgl-row-status','');
        status.setAttribute('role','status');
        const updateButtons=busy=>{
          const exists=saved.has(slot);
          const position=savedOrder.indexOf(slot);
          save.disabled=busy;
          remove.disabled=busy||!exists;
          up.disabled=busy||!exists||position<=0;
          down.disabled=busy||!exists||position===savedOrder.length-1;
          featured.disabled=busy||!exists;
        };
        updateButtons(false);
        const changed=()=>{status.textContent='Cambios sin guardar';};
        platform.addEventListener('change',changed);
        url.addEventListener('input',changed);
        visible.addEventListener('change',changed);

        save.addEventListener('click',async()=>{
          const normalized=safeUrl(platform.value,url.value.trim());
          if(!normalized){
            status.textContent='Introduce una URL HTTPS válida de '+platforms[platform.value].name+'.';
            url.focus();return;
          }
          updateButtons(true);
          status.textContent='Guardando…';
          try{
            // No se sobrescribe la posición ni la estrella al editar un enlace.
            const {error}=await sb.from('member_profile_links')
              .upsert({user_id:id,slot,platform:platform.value,url:normalized,
                is_public:visible.checked,updated_at:new Date().toISOString()},
                {onConflict:'user_id,slot'});
            if(error)throw error;
            if(!active())return;
            await load();
            showStatus('Enlace '+slot+' guardado. Ya puedes ordenarlo o marcarlo con ⭐.');
          }catch(err){
            if(active())status.textContent='No se pudo guardar: '+String(err.message||'Error desconocido');
          }finally{if(active())updateButtons(false);}
        });

        remove.addEventListener('click',async()=>{
          if(!saved.has(slot))return;
          updateButtons(true);status.textContent='Eliminando…';
          try{
            const {error}=await sb.from('member_profile_links').delete()
              .eq('user_id',id).eq('slot',slot);
            if(error)throw error;
            if(!active())return;
            await load();
            showStatus('Enlace '+slot+' eliminado.');
          }catch(err){
            if(active())status.textContent='No se pudo eliminar: '+String(err.message||'Error desconocido');
          }finally{if(active())updateButtons(false);}
        });

        const move=async direction=>{
          if(!saved.has(slot))return;
          updateButtons(true);
          status.textContent='Guardando nuevo orden…';
          try{
            const {data,error}=await sb.rpc('move_member_profile_link',
              {p_slot:slot,p_direction:direction});
            if(error)throw error;
            if(!active())return;
            await load();
            showStatus(data===true
              ?'Nuevo orden guardado. También se aplicará en tu perfil público.'
              :'Este enlace ya está en el extremo de la lista.');
          }catch(err){
            if(active())status.textContent='No se pudo cambiar el orden: '+String(err.message||'Error desconocido');
          }finally{if(active())updateButtons(false);}
        };
        up.addEventListener('click',()=>move('up'));
        down.addEventListener('click',()=>move('down'));

        featured.addEventListener('click',async()=>{
          if(!saved.has(slot))return;
          const next=saved.get(slot)?.is_featured!==true;
          updateButtons(true);
          status.textContent='Guardando favorito…';
          try{
            const {data,error}=await sb.rpc('set_member_profile_link_featured',
              {p_slot:slot,p_featured:next});
            if(error)throw error;
            if(data!==true)throw Error('No se pudo actualizar el favorito');
            if(!active())return;
            await load();
            showStatus(next
              ?'⭐ Enlace '+slot+' destacado. Solo aparecerá a otros si es público.'
              :'El enlace '+slot+' ya no está destacado.');
          }catch(err){
            if(active())status.textContent='No se pudo cambiar el favorito: '+String(err.message||'Error desconocido');
          }finally{if(active())updateButtons(false);}
        });

        actions.append(visibleLabel,orderActions,featured,save,remove);
        row.append(rowLabel,fields,actions,status);
        editor.append(row);
      }
      content.append(editor);
      message.textContent=rows.length+' de 5 enlaces configurados. Usa ↑ y ↓ para ordenarlos; ⭐ destaca uno. Guarda primero los enlaces nuevos.';
    }

    async function load(){
      const ticket=++revision;
      try{
        if(typeof sb==='undefined'||!sb.from||!sb.rpc)throw Error('Supabase no disponible');
        const id=await resolveId();
        if(!active()||ticket!==revision)return;
        if(!id){message.textContent='Inicia sesión para gestionar tus enlaces.';return;}
        if(own){
          const {data,error}=await sb.from('member_profile_links')
            .select('slot,platform,url,is_public,display_order,is_featured').eq('user_id',id)
            .order('slot',{ascending:true}).limit(5);
          if(!active()||ticket!==revision)return;
          if(error)throw error;
          ownerEditor(id,data||[]);
        }else{
          const {data,error}=await sb.rpc('get_member_profile_links',{target_member:id});
          if(!active()||ticket!==revision)return;
          if(error)throw error;
          publicList(Array.isArray(data)?data:[]);
        }
      }catch(error){
        if(active()&&ticket===revision)
          message.textContent='No se pudieron cargar los enlaces gamer. Actualiza la página para reintentarlo.';
        console.warn('Error en enlaces del perfil:',error);
      }
    }
    load();
  }
  let scheduled=false;
  function scan(){
    scheduled=false;
    const account=document.getElementById('account-profile');
    if(account?.querySelector('.sbp-identity-card'))mount(account,true);
    const other=document.getElementById('public-member-profile');
    if(other?.querySelector('.sbp-identity-card'))mount(other,false);
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan);}
  function init(){
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
