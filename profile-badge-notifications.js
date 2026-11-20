/* Shadows Byte Gaming V2 — avisos privados de logros de enlaces gamer */
(() => {
  'use strict';

  const badges={
    link_promising_10:{icon:'🥉',name:'Enlace Prometedor',tier:'bronze'},
    link_creator_50:{icon:'🥈',name:'Creador Destacado',tier:'silver'},
    link_star_100:{icon:'🥇',name:'Estrella Gamer',tier:'gold'},
    link_legend_500:{icon:'💎',name:'Leyenda de la Comunidad',tier:'diamond'}
  };
  const el=(tag,cls,value)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=value;
    return node;
  };
  const root=el('aside','sb-badge-notify');
  root.setAttribute('aria-label','Notificaciones de insignias');
  root.hidden=false;
  const trigger=el('button','sb-badge-notify-toggle','🔔 Logros');
  trigger.type='button';
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-controls','sb-badge-notify-panel');
  const count=el('span','sb-badge-notify-count');
  count.hidden=true;
  trigger.append(count);
  const panel=el('section','sb-badge-notify-panel');
  panel.id='sb-badge-notify-panel';
  panel.hidden=true;
  panel.setAttribute('aria-label','Mis notificaciones de logros');
  const panelTitle=el('h2','','🏆 Notificaciones de insignias');
  const subtitle=el('p','sb-badge-notify-help','Solo tú puedes ver estos avisos. No afectan a los logros obtenidos.');
  const feedback=el('p','sb-badge-notify-feedback','Consultando tus logros…');
  feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  const list=el('div','sb-badge-notify-list');
  const footer=el('div','sb-badge-notify-footer');
  const refreshBtn=el('button','outline-btn mini','↻ Actualizar');
  const myProfileBtn=el('button','outline-btn mini','🎖️ Mi vitrina');
  const rewardsBtn=el('button','outline-btn mini sb-badge-rewards-btn',
    '💰 Ver mi historial de recompensas');
  refreshBtn.type='button';myProfileBtn.type='button';rewardsBtn.type='button';
  footer.append(refreshBtn,myProfileBtn,rewardsBtn);
  panel.append(panelTitle,subtitle,feedback,list,footer);
  const toast=el('section','sb-badge-unlock-toast');
  toast.hidden=true;
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  root.append(trigger,panel,toast);

  let userId=null;
  let data=[];
  let loading=false;
  let opBusy=false;
  let generation=0;
  let toastKey=null;
  const announced=new Set();

  const loggedIn=()=>Boolean(userId);
  const validClient=()=>typeof sb!=='undefined'&&sb&&sb.rpc&&sb.auth;

  function navigateRewards(){
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    const app=document.getElementById('app');
    let observer=null;
    const attempt=()=>{
      const section=document.querySelector('#account-profile .sb-reward-history');
      if(!section)return false;
      section.scrollIntoView({behavior:'smooth',block:'start'});
      window.dispatchEvent(new Event('sb:open-reward-history'));
      if(observer)observer.disconnect();
      return true;
    };
    if(location.hash.split('?')[0]!=='#/cuenta')location.hash='#/cuenta';
    if(attempt()||!app)return;
    observer=new MutationObserver(attempt);
    observer.observe(app,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),8000);
  }

  function navigateShowcase(){
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    location.hash='#/cuenta';
    const scroll=()=>{
      const target=document.querySelector('#account-profile .sbv-editor');
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    };
    requestAnimationFrame(()=>requestAnimationFrame(scroll));
  }

  const setButtonLabel=(button,value)=>{button.textContent=value;};
  const number=x=>Math.max(0,Number(x)||0).toLocaleString('es-ES');

  function reset(){
    generation++;
    userId=null;
    data=[];
    announced.clear();
    toastKey=null;
    root.hidden=false;
    list.replaceChildren(el('p','sb-badge-notify-empty',
      'Inicia sesión para consultar tus insignias y las recompensas que hayas obtenido.'));
    feedback.textContent='Inicia sesión para consultar las notificaciones.';
    count.hidden=true;
    toast.hidden=true;
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
  }

  function drawToast(record){
    const badge=badges[record.key];
    if(!badge)return;
    toastKey=record.key;
    announced.add(record.key);
    toast.hidden=false;
    toast.className='sb-badge-unlock-toast sb-badge-unlock-toast--'+badge.tier;
    toast.replaceChildren();
    const header=el('div','sb-badge-unlock-header');
    const symbol=el('span','sb-badge-unlock-icon',badge.icon);
    const copy=el('div','sb-badge-unlock-copy');
    copy.append(
      el('strong','','¡Nueva insignia desbloqueada!'),
      el('span','',badge.name)
    );
    header.append(symbol,copy);
    const points=Number(record.reward_points)||0;
    const desc=el('p','sb-badge-unlock-note',
      points>0
        ?'🎁 +'+number(points)+' puntos acreditados en tu saldo de la tienda por este logro.'
        :'Has conseguido un nuevo logro en Shadows Byte Gaming Official.');
    const buttons=el('div','sb-badge-unlock-actions');
    const add=el('button','sb-badge-unlock-add','🎖️ Añadir a mi vitrina');
    const dismiss=el('button','sb-badge-unlock-dismiss','Entendido');
    add.type='button';dismiss.type='button';
    if(record.in_showcase===true)add.textContent='✓ En mi vitrina';
    add.disabled=record.in_showcase===true;
    add.addEventListener('click',()=>addBadge(record.key,add));
    dismiss.addEventListener('click',()=>markRead(record.key,true));
    buttons.append(add,dismiss);
    toast.append(header,desc,buttons);
    if(badge.tier==='gold'||badge.tier==='diamond'){
      const glimmer=el('span','sb-badge-unlock-sparkles','✦ ✧ ✦');
      glimmer.setAttribute('aria-hidden','true');
      toast.append(glimmer);
    }
  }

  function hideToast(){
    toast.hidden=true;
    toastKey=null;
  }

  function drawList(){
    const unread=data.filter(x=>!x.read_at).length;
    count.textContent=number(unread);
    count.hidden=unread===0;
    trigger.setAttribute('aria-label',unread
      ?'Logros: '+number(unread)+' notificaciones sin leer'
      :'Notificaciones de logros');
    list.replaceChildren();
    if(!data.length){
      list.append(el('p','sb-badge-notify-empty',
        'Todavía no tienes avisos: las notificaciones y los puntos aparecerán cuando desbloquees una insignia (el primer logro requiere 10 clics en tus enlaces públicos).'));
      return;
    }
    for(const record of data.slice(0,20)){
      const badge=badges[record.key];
      if(!badge)continue;
      const row=el('article','sb-badge-notify-item'+(record.read_at?' is-read':' is-unread'));
      const head=el('div','sb-badge-notify-item-head');
      head.append(el('span','sb-badge-notify-item-icon',badge.icon));
      const copy=el('div','sb-badge-notify-item-copy');
      copy.append(el('strong','',badge.name));
      if(record.created_at){
        const date=new Date(record.created_at);
        if(Number.isFinite(date.getTime())){
          copy.append(el('small','',date.toLocaleDateString('es-ES',{
            day:'numeric',month:'short',year:'numeric'
          })));
        }
      }
      const reward=Number(record.reward_points)||0;
      if(reward>0){
        copy.append(el('span','sb-badge-notify-points',
          '🎁 +'+number(reward)+' puntos acreditados'));
      }
      head.append(copy);
      if(!record.read_at)head.append(el('span','sb-badge-notify-new','Nuevo'));
      const controls=el('div','sb-badge-notify-item-actions');
      if(!record.in_showcase){
        const add=el('button','sb-badge-notify-action','+ Añadir a mi vitrina');
        add.type='button';
        add.addEventListener('click',()=>addBadge(record.key,add));
        controls.append(add);
      }else{
        controls.append(el('span','sb-badge-notify-in-showcase','✓ En mi vitrina'));
      }
      if(!record.read_at){
        const mark=el('button','sb-badge-notify-secondary','Marcar como leído');
        mark.type='button';
        mark.addEventListener('click',()=>markRead(record.key,false));
        controls.append(mark);
      }
      row.append(head,controls);
      list.append(row);
    }
  }

  async function addBadge(key,button){
    if(button.dataset.showcaseFull==='true'){navigateShowcase();return;}
    if(opBusy||!loggedIn()||!badges[key]||!validClient())return;
    opBusy=true;
    const currentUser=userId;
    button.disabled=true;
    const original=button.textContent;
    setButtonLabel(button,'Guardando…');
    try{
      const {data:result,error}=await sb.rpc('add_my_gamer_badge_to_showcase',{p_badge_key:key});
      if(error)throw error;
      if(currentUser!==userId)return;
      if(result?.status==='full'){
        button.dataset.showcaseFull='true';
        setButtonLabel(button,'Vitrina llena · Gestionar');
        button.disabled=false;
        return;
      }
      if(result?.status!=='added'&&result?.status!=='already'){
        throw Error('No se pudo confirmar el cambio de vitrina');
      }
      window.dispatchEvent(new Event('sb:badge-showcase-updated'));
      await markRead(key,false);
      if(currentUser!==userId)return;
      if(toastKey===key)hideToast();
      await refresh();
    }catch(error){
      if(currentUser===userId){
        setButtonLabel(button,'No se pudo guardar · Reintentar');
        button.disabled=false;
        console.debug('Añadir insignia desde aviso:',error);
      }
    }finally{
      opBusy=false;
      if(button.isConnected&&button.textContent==='Guardando…')setButtonLabel(button,original);
    }
  }

  async function markRead(key,dismissToast){
    if(opBusy&&dismissToast)return;
    if(!badges[key]||!loggedIn()||!validClient())return;
    const currentUser=userId;
    try{
      const {data:result,error}=await sb.rpc('mark_my_gamer_badge_notification_read',{p_badge_key:key});
      if(error||result!==true)throw error||Error('No se pudo marcar como leído');
      if(currentUser!==userId)return;
      if(dismissToast||toastKey===key)hideToast();
      await refresh();
    }catch(error){
      console.debug('Marcar notificación como leída:',error);
    }
  }

  async function refresh(){
    if(loading||!validClient())return;
    loading=true;
    const ticket=++generation;
    try{
      const auth=await sb.auth.getUser();
      if(auth.error){
        reset();
        feedback.textContent='No se pudo comprobar tu sesión. Pulsa ↻ Actualizar para volver a intentar.';
        return;
      }
      if(!auth.data?.user?.id){
        reset();return;
      }
      const nextUser=auth.data.user.id;
      if(userId&&userId!==nextUser){
        reset();
      }
      userId=nextUser;
      const {data:records,error}=await sb.rpc('get_my_gamer_badge_notifications');
      if(error)throw error;
      if(ticket!==generation&&userId!==nextUser)return;
      if(!Array.isArray(records))throw Error('Lista de notificaciones no válida');
      data=records.filter(x=>x&&badges[x.key]).slice(0,50);
      root.hidden=false;
      feedback.textContent=data.length
        ?'Tienes '+number(data.length)+' avisos de insignias.'
        :'No hay notificaciones pendientes de desbloqueos.';
      drawList();
      if(!toastKey){
        const latest=data.find(x=>!x.read_at&&!announced.has(x.key));
        if(latest)drawToast(latest);
      }
    }catch(error){
      root.hidden=false;
      feedback.textContent='No se pudieron cargar los avisos. Comprueba tu conexión y pulsa ↻ Actualizar.';
      list.replaceChildren(el('p','sb-badge-notify-empty',
        'El historial está temporalmente no disponible; tus logros y puntos no se han borrado.'));
      console.debug('Notificaciones de insignias:',error);
    }finally{
      loading=false;
    }
  }

  trigger.addEventListener('click',()=>{
    panel.hidden=!panel.hidden;
    trigger.setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden)refresh();
  });
  refreshBtn.addEventListener('click',refresh);
  myProfileBtn.addEventListener('click',navigateShowcase);
  rewardsBtn.addEventListener('click',navigateRewards);

  function init(){
    if(!document.body)return;
    document.body.append(root);
    feedback.textContent='Inicia sesión para ver los avisos.';
    list.replaceChildren(el('p','sb-badge-notify-empty',
      'Abre la campana para consultar tus insignias. Si aún no tienes ninguna, aquí verás cómo obtenerlas.'));
    refresh();
    // Poll while the page is open; badges are earned when someone else clicks.
    setInterval(()=>{if(document.visibilityState==='visible')refresh();},45000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')refresh();
    });
    window.addEventListener('hashchange',refresh);
    window.addEventListener('sb:badge-showcase-updated',refresh);
    const authClient=typeof sb!=='undefined'&&sb.auth;
    if(authClient?.onAuthStateChange){
      sb.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'||!session?.user?.id){
          reset();
        }else if(event==='SIGNED_IN'){
          Promise.resolve().then(refresh);
        }
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
