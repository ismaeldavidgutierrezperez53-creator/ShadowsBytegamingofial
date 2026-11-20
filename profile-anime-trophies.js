/* Shadows Byte Gaming Official V2 — galería anime de trofeos verificables */
(() => {
  'use strict';
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const awards={
    bronze:{icon:'🥉',name:'Bronce',requirement:'Meta de 100 a 999 puntos',hint:'Completa una meta de al menos 100 puntos y menos de 1.000.'},
    silver:{icon:'🥈',name:'Plata',requirement:'Meta de 1.000 a 4.999 puntos',hint:'Completa una meta de 1.000 a 4.999 puntos.'},
    gold:{icon:'🥇',name:'Oro',requirement:'Meta de 5.000 a 9.999 puntos',hint:'Completa una meta de 5.000 a 9.999 puntos.'},
    diamond:{icon:'💎',name:'Diamante',requirement:'Meta de 10.000 puntos o más',hint:'Completa una meta de 10.000 puntos o más.'}
  };
  const validTheme=['sakura','neon','dragon','diamond'];
  const number=n=>Math.max(0,Number(n)||0).toLocaleString('es-ES');
  const dateLabel=value=>{
    const date=new Date(value);
    return Number.isFinite(date.getTime())
      ?date.toLocaleDateString('es-ES',{year:'numeric',month:'short',day:'2-digit'}):'';
  };
  const el=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };

  function mount(root,isOwner){
    if(root.querySelector('.sbgt-gallery'))return;
    const identity=root.querySelector('.sbp-identity-card');
    if(!identity)return;
    const anchor=root.querySelector('.sbpm-panel')||root.querySelector('.sbpg-panel')||identity;
    const panel=el('section','profile-panel sbgt-gallery');
    panel.id=isOwner?'my-anime-trophies':'member-anime-trophies';
    panel.setAttribute('aria-label','Galería de trofeos anime');
    const heading=el('h2','','🏆 Galería de trofeos anime');
    const intro=el('p','sbgt-intro',
      isOwner?'Explora tus trofeos ganados y los que todavía puedes desbloquear.':
        'Colección de trofeos por metas completadas de este miembro.');
    const summary=el('div','sbgt-summary');
    const overview=el('p','sbgt-overview','Consultando trofeos…');
    const actions=el('div','sbgt-toolbar');
    const shareAll=el('button','outline-btn mini sbgt-share-all','🔗 Compartir mi galería');
    shareAll.type='button';
    shareAll.disabled=true;
    shareAll.addEventListener('click',()=>share());
    const refresh=el('button','outline-btn mini sbgt-refresh','↻ Actualizar trofeos');
    refresh.type='button';
    refresh.addEventListener('click',()=>load(true));
    if(isOwner)actions.append(refresh);
    actions.append(shareAll);
    const status=el('p','sbgt-status','Cargando trofeos…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const grid=el('div','sbgt-tier-grid');
    grid.setAttribute('role','list');
    const archiveTitle=el('h3','','📜 Todas las medallas ganadas');
    const archive=el('div','sbgt-award-archive');
    archive.setAttribute('role','list');
    const more=el('button','outline-btn mini sbgt-load-more','Mostrar más trofeos');
    more.type='button';
    more.hidden=true;
    more.addEventListener('click',()=>loadMore());
    const note=el('p','sbgt-note',
      'Cada trofeo corresponde a una meta completada y verificada en Supabase. No da puntos adicionales.');
    panel.append(heading,intro,summary,overview,actions,status,grid,archiveTitle,archive,more,note);
    anchor.after(panel);

    let memberId=null,publicSharing=false,total=0,tierData=[],items=[];
    let loading=false,loadingMore=false,request=0;
    let currentTheme='neon',motionEnabled=false;
    let highlighted=false;
    const active=()=>root.isConnected&&panel.isConnected&&
      location.hash.split('?')[0]===(isOwner?'#/cuenta':'#/perfil');

    function decorate(){
      panel.className=panel.className
        .replace(/\s?sbgt-theme--(?:sakura|neon|dragon|diamond)/g,'')
        .replace(/\s?sbgt-motion--(?:on|off)/g,'')+
        ' sbgt-theme--'+currentTheme+' sbgt-motion--'+(motionEnabled?'on':'off');
    }

    function shareUrl(tier){
      const base=new URL(window.location.href);
      base.hash='#/perfil?id='+encodeURIComponent(memberId)+
        (tier?'&trofeo='+encodeURIComponent(tier):'');
      return base.href;
    }
    async function copyLink(value){
      if(window.navigator?.clipboard?.writeText){
        await window.navigator.clipboard.writeText(value);return true;
      }
      const input=el('textarea','sbgt-copy-helper');
      input.value=value;
      input.setAttribute('readonly','');
      document.body.append(input);
      input.select();
      try{
        if(typeof document.execCommand==='function'&&document.execCommand('copy'))return true;
      }finally{input.remove();}
      return false;
    }
    async function share(tier){
      if(!memberId||!publicSharing||!active()){
        status.textContent='Tu perfil debe ser público para compartir los trofeos.';
        return;
      }
      if(tier&&!tierData.some(x=>x.tier===tier&&Number(x.count)>0)){
        status.textContent='Todavía no has desbloqueado ese trofeo.';
        return;
      }
      const name=tier&&awards[tier]?awards[tier].name:null;
      const url=shareUrl(name?tier:null);
      const title=name?'Trofeo anime de '+name:'Mi galería de trofeos anime';
      try{
        if(window.navigator?.share){
          await window.navigator.share({
            title,
            text:name?'Mira mi trofeo anime de '+name+' en Shadows Byte Gaming Official V2':
              'Mira mi galería de trofeos anime en Shadows Byte Gaming Official V2',
            url
          });
          if(active())status.textContent='Enlace enviado a la aplicación para compartir.';
        }else if(await copyLink(url)){
          if(active())status.textContent='✅ Enlace público copiado. ¡Ya puedes compartirlo!';
        }else if(active()){
          status.replaceChildren('Selecciona y copia este enlace: ');
          const link=el('a','sbgt-manual-link',url);
          link.href=url;link.target='_blank';link.rel='noopener noreferrer';
          status.append(link);
        }
      }catch(error){
        if(active()&&error?.name!=='AbortError')
          status.textContent='No se pudo compartir. Puedes intentarlo de nuevo.';
      }
    }

    function highlightShared(){
      if(isOwner||highlighted||!active())return;
      const tier=new URLSearchParams(location.hash.split('?')[1]||'').get('trofeo');
      if(!tier||!awards[tier])return;
      const card=grid.querySelector('[data-trophy-tier="'+tier+'"]');
      if(card){
        highlighted=true;
        card.classList.add('sbgt-shared-highlight');
        card.scrollIntoView({behavior:'smooth',block:'center'});
        if(!tierData.some(x=>x.tier===tier&&Number(x.count)>0))
          status.textContent='Este trofeo aún no se ha desbloqueado en este perfil.';
      }
    }

    function drawTiers(){
      grid.replaceChildren();
      const countByTier=new Map(tierData.map(x=>[x.tier,x]));
      const typesUnlocked=Object.keys(awards).filter(key=>
        Number(countByTier.get(key)?.count)>0).length;
      summary.replaceChildren(
        el('strong','sbgt-total',number(total)+' medallas obtenidas'),
        el('span','sbgt-collection-count',typesUnlocked+' de 4 tipos desbloqueados')
      );
      overview.textContent=typesUnlocked===4
        ?'✨ ¡Colección de categorías completa! Puedes seguir acumulando medallas.'
        :'🔒 Te faltan '+(4-typesUnlocked)+' tipos por desbloquear. Cada tipo se gana completando una meta de su categoría.';
      shareAll.disabled=!publicSharing||total===0;
      shareAll.textContent=isOwner?'🔗 Compartir mi galería':'🔗 Compartir esta galería';
      for(const [key,info] of Object.entries(awards)){
        const row=countByTier.get(key);
        const count=Math.max(0,Number(row?.count)||0);
        const unlocked=count>0;
        const card=el('article','sbgt-tier sbgt-tier--'+key+
          (unlocked?' sbgt-tier--unlocked':' sbgt-tier--locked'));
        card.dataset.trophyTier=key;
        card.setAttribute('role','listitem');
        card.setAttribute('aria-label',
          info.name+': '+(unlocked?count+' medallas obtenidas':'Pendiente de desbloquear'));
        const icon=el('span','sbgt-tier-icon',unlocked?info.icon:'🔒');
        icon.setAttribute('aria-hidden','true');
        const name=el('h4','',info.icon+' '+info.name);
        const state=el('strong','sbgt-tier-state',unlocked
          ?'✅ Desbloqueado · '+number(count)+(count===1?' medalla':' medallas')
          :'🔒 Por desbloquear');
        const requirement=el('p','sbgt-tier-requirement',info.requirement);
        card.append(icon,name,state,requirement);
        if(unlocked){
          const target=Number(row?.latest_target_points);
          if(Number.isSafeInteger(target)&&target>=100)
            card.append(el('small','sbgt-tier-last','Última meta: '+number(target)+' puntos'));
          if(row?.latest_awarded_at)
            card.append(el('small','sbgt-tier-date','Conseguida: '+dateLabel(row.latest_awarded_at)));
          const button=el('button','outline-btn mini sbgt-share-tier','Compartir trofeo');
          button.type='button';button.disabled=!publicSharing;
          button.title=publicSharing?'Compartir trofeo '+info.name:
            'Activa la visibilidad pública del perfil para compartir';
          button.addEventListener('click',()=>share(key));
          card.append(button);
        }else{
          card.append(el('small','sbgt-tier-hint',info.hint));
        }
        grid.append(card);
      }
      if(isOwner&&!publicSharing)
        status.textContent='Tu galería es privada. Puedes verla, pero para compartirla debes hacer público tu perfil.';
      else status.textContent='Galería actualizada. Desbloquea más trofeos completando metas de puntos.';
      highlightShared();
    }

    function drawAwards(){
      archive.replaceChildren();
      if(!items.length){
        archive.append(el('p','sbgt-empty',
          total?'No se pudieron cargar las medallas de esta página.':
            'Aún no hay trofeos ganados. Completa tu primera meta para conseguir uno.'));
      }else{
        for(const item of items){
          const info=awards[item.tier];
          if(!info)continue;
          const card=el('article','sbgt-award sbgt-award--'+item.tier);
          card.setAttribute('role','listitem');
          card.append(
            el('span','sbgt-award-icon',info.icon),
            el('strong','',info.name+' · '+number(item.target_points)+' puntos'),
            el('small','',dateLabel(item.awarded_at))
          );
          archive.append(card);
        }
      }
      more.hidden=items.length>=total||total===0;
      more.disabled=loadingMore||loading;
      if(!more.hidden)more.textContent='Mostrar más · '+number(total-items.length)+' restantes';
    }

    async function load(reset){
      if(!active())return;
      if(!reset)return loadMore();
      const ticket=++request;
      loading=true;refresh.disabled=true;
      status.textContent='Consultando la colección en Supabase…';
      try{
        if(typeof sb==='undefined'||!sb?.rpc||!sb?.auth)throw Error('Supabase no disponible');
        let target;
        if(isOwner){
          const auth=await sb.auth.getUser();
          if(auth.error||!auth.data?.user?.id)throw Error('Inicia sesión para consultar tus trofeos');
          target=auth.data.user.id;
        }else{
          target=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
          if(!uuid.test(String(target)))throw Error('Perfil no disponible');
        }
        const [gallery,style,motion]=await Promise.all([
          sb.rpc('get_member_anime_trophy_gallery',{target_member:target,p_offset:0,p_limit:24}),
          sb.rpc('get_member_point_goal_showcase_style',{target_member:target}),
          sb.rpc('get_member_point_goal_showcase_motion',{target_member:target})
        ]);
        if(ticket!==request||!active())return;
        if(gallery.error)throw gallery.error;
        const data=gallery.data;
        if(!data||typeof data!=='object'||typeof data.visible!=='boolean')
          throw Error('Respuesta de galería no válida');
        if(!data.visible){
          panel.hidden=true;
          return;
        }
        if(!Array.isArray(data.tiers)||!Array.isArray(data.awards)||
           !Number.isSafeInteger(Number(data.total))||Number(data.total)<0)
          throw Error('Datos de trofeos incompletos');
        memberId=target;publicSharing=data.shareable===true;
        total=Number(data.total);tierData=data.tiers;items=data.awards;
        currentTheme=validTheme.includes(style.data)?style.data:'neon';
        motionEnabled=!motion.error&&motion.data===true;
        decorate();
        panel.hidden=false;
        highlighted=false;
        drawTiers();drawAwards();
      }catch(error){
        if(ticket===request&&active()){
          status.textContent='No se pudo cargar la galería: '+
            String(error?.message||'Error de conexión');
          if(!isOwner)panel.hidden=true;
        }
      }finally{
        if(ticket===request){loading=false;refresh.disabled=false;}
      }
    }

    async function loadMore(){
      if(!active()||!memberId||loading||loadingMore||items.length>=total)return;
      loadingMore=true;more.disabled=true;
      status.textContent='Cargando más trofeos…';
      try{
        const {data,error}=await sb.rpc('get_member_anime_trophy_gallery',{
          target_member:memberId,p_offset:items.length,p_limit:24
        });
        if(error)throw error;
        if(!active()||!data?.visible||!Array.isArray(data.awards))
          throw Error('La colección ya no está disponible');
        if(!data.awards.length&&items.length<total)
          throw Error('No se han podido cargar más trofeos');
        items=items.concat(data.awards);
        total=Number(data.total);
        publicSharing=data.shareable===true;
        drawAwards();
        status.textContent='Se muestran '+number(items.length)+' de '+number(total)+' medallas.';
      }catch(error){
        if(active())status.textContent='Error al cargar más trofeos: '+
          String(error?.message||'Vuelve a intentarlo');
      }finally{
        loadingMore=false;
        if(active())drawAwards();
      }
    }
    const themeChanged=event=>{
      if(!isOwner||!active()||!validTheme.includes(event?.detail?.theme))return;
      currentTheme=event.detail.theme;decorate();
    };
    const motionChanged=event=>{
      if(!isOwner||!active()||typeof event?.detail?.enabled!=='boolean')return;
      motionEnabled=event.detail.enabled;decorate();
    };
    window.addEventListener('sb:medal-theme-changed',themeChanged);
    window.addEventListener('sb:medal-motion-changed',motionChanged);
    if(isOwner){
      window.addEventListener('sb:point-goal-updated',()=>load(true));
      window.addEventListener('sb:point-goal-medal-unlocked',()=>load(true));
    }
    const app=document.getElementById('app');
    if(app){
      const observer=new MutationObserver(()=>{
        if(panel.isConnected)return;
        ++request;
        window.removeEventListener('sb:medal-theme-changed',themeChanged);
        window.removeEventListener('sb:medal-motion-changed',motionChanged);
        observer.disconnect();
      });
      observer.observe(app,{childList:true,subtree:true});
    }
    load(true);
  }

  let queued=false;
  function scan(){
    queued=false;
    const own=document.getElementById('account-profile');
    if(own?.querySelector('.sbp-identity-card'))mount(own,true);
    const other=document.getElementById('public-member-profile');
    if(other?.querySelector('.sbp-identity-card'))mount(other,false);
  }
  function schedule(){
    if(queued)return;
    queued=true;requestAnimationFrame(scan);
  }
  function init(){
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
