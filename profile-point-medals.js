/* Shadows Byte Gaming Official V2 — medallas de metas, decorativas y permanentes */
(() => {
  'use strict';
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
  const medals={
    bronze:{icon:'🥉',label:'Medalla de Bronce',className:'bronze',description:'Meta de 100 a 999 puntos'},
    silver:{icon:'🥈',label:'Medalla de Plata',className:'silver',description:'Meta de 1.000 a 4.999 puntos'},
    gold:{icon:'🥇',label:'Medalla de Oro',className:'gold',description:'Meta de 5.000 a 9.999 puntos'},
    diamond:{icon:'💎',label:'Medalla Diamante',className:'diamond',description:'Meta de 10.000 puntos o más'}
  };
  const toNumber=x=>Math.max(0,Number(x)||0).toLocaleString('es-ES');
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const dateLabel=raw=>{
    const d=new Date(raw);
    return Number.isFinite(d.getTime())
      ?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'';
  };
  const valid=x=>x&&Number.isSafeInteger(Number(x.goal_id))&&
    Number.isFinite(Number(x.target_points))&&Number(x.target_points)>=100&&
    medals[x.tier]&&typeof x.awarded_at==='string';

  function mount(root,isOwner){
    const identity=root.querySelector('.sbp-identity-card');
    if(!identity||root.querySelector('.sbpm-panel'))return;
    const heading=identity.querySelector('.sbp-identity-text h2');
    if(!heading)return;

    const strip=el('div','sbpm-identity-strip');
    strip.hidden=true;
    strip.setAttribute('aria-label','Medallas por metas completadas');
    heading.after(strip);

    const panel=el('section','profile-panel sbpm-panel');
    panel.setAttribute('aria-label','Medallas por metas completadas');
    const h2=el('h2','','🎖️ Medallero de metas');
    const intro=el('p','sbpm-intro',isOwner
      ?'Estas medallas decorativas se desbloquean al completar objetivos de puntos. Se mantienen aunque elijas una nueva meta.'
      :'Medallas decorativas obtenidas por este miembro al completar metas personales de puntos.');
    const toolbar=el('div','sbpm-toolbar');
    const refresh=el('button','outline-btn mini','↻ Actualizar medallas');
    refresh.type='button';
    if(isOwner)toolbar.append(refresh);
    const status=el('p','sbpm-status','Cargando medallas…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const summary=el('div','sbpm-summary');
    const historyTitle=el('h3','','🏅 Historial de medallas desbloqueadas');
    const history=el('div','sbpm-history');
    history.setAttribute('role','list');
    const note=el('p','sbpm-note',isOwner
      ?'No se conceden puntos extra. Al completar una meta, la medalla se guarda automáticamente en Supabase. Se muestran las 50 medallas más recientes.'
      :'Las medallas son reconocimientos visuales; no representan premios canjeables.');
    panel.append(h2,intro,toolbar,status,summary,historyTitle,history,note);
    const anchor=isOwner
      ?(root.querySelector('.sbpg-panel')||root.querySelector('.sbrs-panel')||identity)
      :(root.querySelector('.sbgl-badges')||identity);
    anchor.after(panel);

    let last=0;
    const active=()=>root.isConnected&&panel.isConnected&&
      location.hash.split('?')[0]===(isOwner?'#/cuenta':'#/perfil');

    function drawStrip(items){
      strip.replaceChildren();
      if(!items.length){strip.hidden=true;return;}
      strip.hidden=false;
      strip.append(el('small','sbpm-strip-caption','🎖️ Medallas por metas'));
      const tray=el('div','sbpm-strip-tray');
      tray.setAttribute('role','list');
      for(const item of items.slice(0,3)){
        const t=medals[item.tier];
        const chip=el('span','sbpm-strip-chip sbpm--'+t.className,
          t.icon+' '+toNumber(item.target_points)+' pts');
        chip.title=t.label+' · Meta completada: '+toNumber(item.target_points)+' puntos';
        chip.setAttribute('role','listitem');
        tray.append(chip);
      }
      strip.append(tray);
    }

    function draw(items){
      drawStrip(items);
      panel.hidden=!isOwner&&items.length===0;
      if(panel.hidden)return;
      status.textContent=items.length
        ?toNumber(items.length)+(items.length===1?' medalla desbloqueada.':' medallas desbloqueadas.')
        :isOwner?'Todavía no has completado ninguna meta.':'';
      const counts={bronze:0,silver:0,gold:0,diamond:0};
      for(const item of items)counts[item.tier]++;
      summary.replaceChildren();
      for(const [key,tier] of Object.entries(medals)){
        const box=el('div','sbpm-summary-item sbpm--'+tier.className);
        box.append(
          el('span','sbpm-summary-icon',tier.icon),
          el('span','sbpm-summary-name',tier.label),
          el('strong','sbpm-summary-count',toNumber(counts[key]))
        );
        summary.append(box);
      }
      history.replaceChildren();
      if(!items.length){
        history.append(el('p','sbpm-empty',
          'Completa tu primera meta para desbloquear una medalla. Puedes crearla en «🏆 Mis metas de puntos».'));
        return;
      }
      for(const item of items){
        const tier=medals[item.tier];
        const row=el('article','sbpm-medal-card sbpm--'+tier.className);
        row.setAttribute('role','listitem');
        row.append(el('div','sbpm-medal-icon',tier.icon));
        const details=el('div','sbpm-medal-details');
        details.append(
          el('strong','',tier.label),
          el('span','','🎯 Objetivo completado: '+toNumber(item.target_points)+' puntos'),
          el('small','','🏅 Desbloqueada el '+dateLabel(item.awarded_at))
        );
        row.append(details);
        history.append(row);
      }
    }

    async function load(){
      const ticket=++last;
      if(isOwner)refresh.disabled=true;
      status.textContent='Consultando medallas…';
      try{
        if(typeof sb==='undefined'||!sb?.auth||!sb?.rpc)throw Error('Supabase no disponible');
        let memberId;
        if(isOwner){
          const session=await sb.auth.getUser();
          if(session.error||!session.data?.user?.id)throw Error('Inicia sesión');
          memberId=session.data.user.id;
        }else{
          memberId=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
          if(!uuid.test(String(memberId)))throw Error('Perfil no disponible');
        }
        const {data,error}=await sb.rpc('get_member_point_goal_medals',{target_member:memberId});
        if(ticket!==last||!active())return;
        if(error)throw error;
        if(!Array.isArray(data))throw Error('Respuesta de medallas no válida');
        draw(data.filter(valid).slice(0,50));
      }catch(error){
        if(ticket!==last||!active())return;
        status.textContent='No se pudieron cargar las medallas. '+(isOwner?'Pulsa ↻ Actualizar.':'');
        if(!isOwner){strip.hidden=true;panel.hidden=true;}
        console.debug('Medallero de metas:',error);
      }finally{
        if(isOwner&&ticket===last&&active())refresh.disabled=false;
      }
    }

    if(isOwner){
      refresh.addEventListener('click',load);
      window.addEventListener('sb:point-goal-updated',load);
      window.addEventListener('sb:point-goal-medal-unlocked',load);
      const app=document.getElementById('app');
      if(app){
        const observer=new MutationObserver(()=>{
          if(panel.isConnected)return;
          window.removeEventListener('sb:point-goal-updated',load);
          window.removeEventListener('sb:point-goal-medal-unlocked',load);
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