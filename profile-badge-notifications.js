/* Shadows Byte Gaming V2 — avisos privados de insignias y progreso de metas */
(() => {
  'use strict';

  const badges={
    link_promising_10:{icon:'🥉',name:'Enlace Prometedor',tier:'bronze'},
    link_creator_50:{icon:'🥈',name:'Creador Destacado',tier:'silver'},
    link_star_100:{icon:'🥇',name:'Estrella Gamer',tier:'gold'},
    link_legend_500:{icon:'💎',name:'Leyenda de la Comunidad',tier:'diamond'}
  };
  const boxBadges={
    box_first:{icon:'🎁',name:'Primer misterio',goal:1,tier:'bronze'},
    box_explorer:{icon:'🥉',name:'Explorador de cajas',goal:5,tier:'bronze'},
    box_collector:{icon:'🥇',name:'Coleccionista de sorpresas',goal:10,tier:'gold'},
    box_master:{icon:'🏆',name:'Maestro de cajas',goal:25,tier:'gold'},
    box_legend:{icon:'🌌',name:'Leyenda de las cajas',goal:50,tier:'diamond'}
  };
  const el=(tag,cls,value)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=value;
    return node;
  };
  const root=el('aside','sb-badge-notify');
  root.setAttribute('aria-label','Notificaciones de insignias y metas de puntos');
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
  const panelTitle=el('h2','','🏆 Notificaciones de logros y metas');
  const subtitle=el('p','sb-badge-notify-help','Solo tú puedes ver estos avisos. No cambian tu saldo ni los logros obtenidos.');
  const feedback=el('p','sb-badge-notify-feedback','Consultando tus logros…');
  feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  const list=el('div','sb-badge-notify-list');
  const footer=el('div','sb-badge-notify-footer');
  const refreshBtn=el('button','outline-btn mini','↻ Actualizar');
  const myProfileBtn=el('button','outline-btn mini','🎖️ Mi vitrina');
  const rewardsBtn=el('button','outline-btn mini sb-badge-rewards-btn',
    '💰 Ver mi historial de recompensas');
  const goalsBtn=el('button','outline-btn mini sb-goal-notify-goals-btn',
    '🎯 Ver mis metas de puntos');
  refreshBtn.type='button';myProfileBtn.type='button';rewardsBtn.type='button';goalsBtn.type='button';
  footer.append(refreshBtn,myProfileBtn,rewardsBtn,goalsBtn);
  panel.append(panelTitle,subtitle,feedback,list,footer);
  const toast=el('section','sb-badge-unlock-toast');
  toast.hidden=true;
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  const goalToast=el('section','sb-goal-unlock-toast');
  goalToast.hidden=true;
  goalToast.setAttribute('role','status');
  goalToast.setAttribute('aria-live','polite');
  const boxToast=el('section','sbb-unlock-celebration');
  boxToast.hidden=true;
  boxToast.setAttribute('role','status');
  boxToast.setAttribute('aria-live','polite');
  boxToast.setAttribute('aria-label','Nueva insignia de cajas misteriosas desbloqueada');
  root.append(trigger,panel,toast,goalToast,boxToast);

  let userId=null;
  let data=[];
  let goalData=[];
  let boxData=[];
  let loading=false;
  let opBusy=false;
  let generation=0;
  let toastKey=null;
  let goalToastKey=null;
  let boxToastKey=null,boxBusy=false,boxReadBusy=false,boxTimer=null;
  const announced=new Set();
  const goalAnnounced=new Set();
  const boxAnnounced=new Set();
  const goalKey=record=>String(record.goal_id)+':'+String(record.milestone);
  const validGoal=record=>record&&Number.isSafeInteger(Number(record.goal_id))&&
    [25,50,75,100].includes(Number(record.milestone))&&
    Number(record.target_points)>0;

  const loggedIn=()=>Boolean(userId);
  const validClient=()=>typeof sb!=='undefined'&&sb&&sb.rpc&&sb.auth;

  function navigateGoals(){
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    const app=document.getElementById('app');
    let observer=null;
    const attempt=()=>{
      const section=document.querySelector('#account-profile .sbpg-panel');
      if(!section)return false;
      section.scrollIntoView({behavior:'smooth',block:'start'});
      window.dispatchEvent(new Event('sb:open-point-goals'));
      if(observer)observer.disconnect();
      return true;
    };
    if(location.hash.split('?')[0]!=='#/cuenta')location.hash='#/cuenta';
    if(attempt()||!app)return;
    observer=new MutationObserver(attempt);
    observer.observe(app,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),8000);
  }

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

  function navigateBoxBadges(){
    panel.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    const app=document.getElementById('app');
    let observer=null;
    const attempt=()=>{
      const section=document.querySelector('#account-profile .sbb-awards');
      if(!section)return false;
      section.scrollIntoView({behavior:'smooth',block:'center'});
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
    goalData=[];
    boxData=[];
    announced.clear();
    boxAnnounced.clear();
    if(boxTimer!==null){clearTimeout(boxTimer);boxTimer=null;}
    boxToastKey=null;boxBusy=false;boxReadBusy=false;
    boxToast.hidden=true;boxToast.replaceChildren();
    goalAnnounced.clear();
    toastKey=null;
    goalToastKey=null;
    root.hidden=false;
    list.replaceChildren(el('p','sb-badge-notify-empty',
      'Inicia sesión para consultar tus insignias y las recompensas que hayas obtenido.'));
    feedback.textContent='Inicia sesión para consultar las notificaciones.';
    count.hidden=true;
    toast.hidden=true;
    goalToast.hidden=true;
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

  function drawGoalToast(record){
    const percentage=Number(record.milestone);
    const key=goalKey(record);
    goalToastKey=key;
    goalAnnounced.add(key);
    goalToast.hidden=false;
    goalToast.className='sb-goal-unlock-toast'+(percentage===100?' is-complete':'');
    goalToast.replaceChildren();
    goalToast.append(
      el('strong','sb-goal-toast-heading',percentage===100
        ?'🎉 ¡Has completado tu meta de puntos!'
        :'🎯 ¡Has alcanzado el '+percentage+' % de tu meta!'),
      el('p','sb-goal-toast-text','Meta: '+number(record.target_points)+
        ' puntos · Progreso al detectar: '+number(record.earned_points)+
        ' puntos · Restantes: '+number(record.remaining_points)+' puntos.')
    );
    const controls=el('div','sb-goal-toast-controls');
    const go=el('button','sb-goal-toast-go','🎯 Ver mi meta');
    go.type='button';
    go.addEventListener('click',()=>{goalToast.hidden=true;goalToastKey=null;navigateGoals();});
    const dismiss=el('button','sb-goal-toast-dismiss','Entendido');
    dismiss.type='button';
    dismiss.addEventListener('click',()=>markGoalRead(record.goal_id,percentage,true));
    controls.append(go,dismiss);
    goalToast.append(controls);
  }

  function hideBoxToast(){
    if(boxTimer!==null){clearTimeout(boxTimer);boxTimer=null;}
    boxToast.hidden=true;boxToast.replaceChildren();
    boxToastKey=null;
  }

  function drawBoxToast(record){
    const badge=boxBadges[record.key];
    if(!badge)return;
    boxToastKey=record.key;
    boxToast.hidden=false;
    boxToast.className='sbb-unlock-celebration sbb-unlock-celebration--'+badge.tier;
    boxToast.replaceChildren();
    const sparkleLayer=el('div','sbb-unlock-celebration__particles');
    sparkleLayer.setAttribute('aria-hidden','true');
    for(let i=0;i<14;i++){
      const particle=el('span',null,i%3===0?'✦':'✧');
      const angle=2*Math.PI*i/14;
      particle.style.setProperty('--sbb-x',Math.round(Math.cos(angle)*(85+i%3*15))+'px');
      particle.style.setProperty('--sbb-y',Math.round(Math.sin(angle)*(52+i%4*9))+'px');
      particle.style.setProperty('--sbb-delay',(i%5*0.07)+'s');
      sparkleLayer.append(particle);
    }
    const trophy=el('div','sbb-unlock-celebration__icon',badge.icon);
    trophy.setAttribute('aria-hidden','true');
    const heading=el('strong','sbb-unlock-celebration__title','🎉 ¡Insignia desbloqueada!');
    const name=el('p','sbb-unlock-celebration__name',badge.name);
    const description=el('p','sbb-unlock-celebration__description',
      'Has abierto '+number(badge.goal)+' '+(badge.goal===1?'caja misteriosa.':'cajas misteriosas.')+
      ' ¡El logro es tuyo para siempre!');
    const actions=el('div','sbb-unlock-celebration__actions');
    const view=el('button','sbb-unlock-celebration__view','🏅 Ver mi insignia');
    view.type='button';
    view.addEventListener('click',()=>markBoxRead(record.key,true));
    const dismiss=el('button','sbb-unlock-celebration__dismiss','Entendido');
    dismiss.type='button';
    dismiss.addEventListener('click',()=>markBoxRead(record.key,false));
    actions.append(view,dismiss);
    boxToast.append(sparkleLayer,trophy,heading,name,description,actions);
    if(boxTimer!==null)clearTimeout(boxTimer);
    boxTimer=setTimeout(()=>{
      if(boxToastKey===record.key){
        hideBoxToast();
        maybeCelebrateBoxBadge();
      }
    },12000);
  }

  async function maybeCelebrateBoxBadge(){
    if(boxToastKey||boxBusy||!loggedIn()||!validClient())return;
    const badge=boxData.find(record=>boxBadges[record?.key]&&
      !record.celebrated_at&&!boxAnnounced.has(record.key));
    if(!badge)return;
    const nextUser=userId;
    boxBusy=true;boxAnnounced.add(badge.key);
    try{
      const {data:ok,error}=await sb.rpc('ack_my_surprise_box_badge_notification',{
        p_badge_key:badge.key,p_action:'celebrate'
      });
      if(error||ok!==true)throw error||Error('No se pudo confirmar la celebración');
      if(nextUser!==userId)return;
      badge.celebrated_at=new Date().toISOString();
      drawBoxToast(badge);
    }catch(error){
      if(nextUser===userId){
        boxAnnounced.delete(badge.key);
        console.debug('Celebración de insignia de cajas:',error);
      }
    }finally{
      boxBusy=false;
    }
  }

  async function markBoxRead(key,openProfile){
    if(boxReadBusy||!loggedIn()||!boxBadges[key]||!validClient())return;
    const currentUser=userId;
    boxReadBusy=true;
    try{
      const {data:ok,error}=await sb.rpc('ack_my_surprise_box_badge_notification',{
        p_badge_key:key,p_action:'read'
      });
      if(error||ok!==true)throw error||Error('No se pudo marcar como leído');
      if(currentUser!==userId)return;
      const badge=boxData.find(item=>item.key===key);
      if(badge){badge.read_at=new Date().toISOString();badge.celebrated_at=badge.celebrated_at||badge.read_at;}
      if(boxToastKey===key)hideBoxToast();
      drawList();
      if(openProfile)navigateBoxBadges();
      await refresh();
      maybeCelebrateBoxBadge();
    }catch(error){
      console.debug('Marcar logro de cajas como leído:',error);
      if(boxToastKey===key){
        const note=boxToast.querySelector('.sbb-unlock-celebration__description');
        if(note)note.textContent='No se pudo guardar la lectura. Revisa tu conexión y vuelve a intentarlo.';
      }
    }finally{
      boxReadBusy=false;
    }
  }

  function drawBoxEntries(){
    if(!boxData.length)return;
    list.append(el('h3','sb-goal-notify-heading','🎁 Insignias de cajas misteriosas'));
    for(const record of boxData.slice(0,30)){
      const badge=boxBadges[record.key];
      if(!badge)continue;
      const row=el('article','sb-badge-notify-item sbb-badge-notify-item'+
        (record.read_at?' is-read':' is-unread'));
      const head=el('div','sb-badge-notify-item-head');
      head.append(el('span','sb-badge-notify-item-icon',badge.icon));
      const copy=el('div','sb-badge-notify-item-copy');
      copy.append(el('strong','',badge.name),
        el('span','','Abre '+number(badge.goal)+' '+
          (badge.goal===1?'caja misteriosa':'cajas misteriosas')));
      if(record.created_at){
        const date=new Date(record.created_at);
        if(Number.isFinite(date.getTime()))
          copy.append(el('small','',date.toLocaleDateString('es-ES',{
            day:'numeric',month:'short',year:'numeric'
          })));
      }
      head.append(copy);
      if(!record.read_at)head.append(el('span','sb-badge-notify-new','Nuevo'));
      const controls=el('div','sb-badge-notify-item-actions');
      const go=el('button','sb-badge-notify-action','🏅 Ver insignia');
      go.type='button';go.addEventListener('click',navigateBoxBadges);
      controls.append(go);
      if(!record.read_at){
        const mark=el('button','sb-badge-notify-secondary','Marcar como leído');
        mark.type='button';mark.addEventListener('click',()=>markBoxRead(record.key,false));
        controls.append(mark);
      }
      row.append(head,controls);list.append(row);
    }
  }

  function drawGoalEntries(){
    if(!goalData.length)return;
    list.append(el('h3','sb-goal-notify-heading','🎯 Progreso de mis metas'));
    for(const record of goalData.slice(0,30)){
      const pct=Number(record.milestone);
      const row=el('article','sb-goal-notify-item'+(record.read_at?' is-read':' is-unread'));
      const info=el('div','sb-goal-notify-info');
      info.append(
        el('strong','',pct===100
          ?'🎉 ¡Meta de '+number(record.target_points)+' puntos completada!'
          :'🎯 '+pct+' % de tu meta de '+number(record.target_points)+' puntos'),
        el('span','',
          'Al detectarse: '+number(record.earned_points)+' puntos ganados · '+
          (pct===100?'¡Objetivo alcanzado!':
             'Te faltaban '+number(record.remaining_points)+' puntos.'))
      );
      if(record.created_at){
        const d=new Date(record.created_at);
        if(Number.isFinite(d.getTime()))
          info.append(el('small','',d.toLocaleDateString('es-ES',{
            day:'numeric',month:'short',year:'numeric'
          })));
      }
      row.append(info);
      if(!record.read_at)row.append(el('span','sb-badge-notify-new','Nuevo'));
      const actions=el('div','sb-goal-notify-actions');
      const go=el('button','sb-badge-notify-action','🎯 Ver mi meta');
      go.type='button';go.addEventListener('click',navigateGoals);
      actions.append(go);
      if(!record.read_at){
        const mark=el('button','sb-badge-notify-secondary','Marcar como leído');
        mark.type='button';
        mark.addEventListener('click',()=>markGoalRead(record.goal_id,pct,false));
        actions.append(mark);
      }
      row.append(actions);
      list.append(row);
    }
  }

  async function markGoalRead(goalId,milestone,dismissToast){
    if(!loggedIn()||!validClient())return;
    const previousUser=userId;
    try{
      const {data:ok,error}=await sb.rpc('mark_my_point_goal_notification_read',{
        p_goal_id:Number(goalId),p_milestone:Number(milestone)
      });
      if(error||ok!==true)throw error||Error('Aviso no encontrado');
      if(previousUser!==userId)return;
      if(dismissToast||goalToastKey===String(goalId)+':'+milestone){
        goalToast.hidden=true;goalToastKey=null;
      }
      await refresh();
    }catch(error){
      console.debug('Marcar aviso de meta como leído:',error);
    }
  }

  function drawList(){
    const unread=data.filter(x=>!x.read_at).length+
      goalData.filter(x=>!x.read_at).length+boxData.filter(x=>!x.read_at).length;
    count.textContent=number(unread);
    count.hidden=unread===0;
    trigger.setAttribute('aria-label',unread
      ?'Logros y metas: '+number(unread)+' notificaciones sin leer'
      :'Notificaciones de logros y metas');
    list.replaceChildren();
    if(!data.length&&!goalData.length&&!boxData.length){
      list.append(el('p','sb-badge-notify-empty',
        'Todavía no tienes avisos. Recibirás uno al desbloquear una insignia o alcanzar el 25 %, 50 %, 75 % o 100 % de una meta.'));
      return;
    }
    drawBoxEntries();
    drawGoalEntries();
    if(data.length)list.append(el('h3','sb-goal-notify-heading','🏅 Insignias desbloqueadas'));
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
      const [badgesResponse,goalsResponse,boxesResponse]=await Promise.all([
        sb.rpc('get_my_gamer_badge_notifications'),
        sb.rpc('get_my_point_goal_notifications'),
        sb.rpc('get_my_surprise_box_badge_notifications')
      ]);
      if(ticket!==generation&&userId!==nextUser)return;
      if(badgesResponse.error)throw badgesResponse.error;
      const records=badgesResponse.data;
      if(!Array.isArray(records))throw Error('Lista de insignias no válida');
      data=records.filter(x=>x&&badges[x.key]).slice(0,50);
      if(goalsResponse.error){
        goalData=[];
        console.debug('No se pudieron consultar metas:',goalsResponse.error);
      }else{
        if(!Array.isArray(goalsResponse.data))throw Error('Lista de metas no válida');
        goalData=goalsResponse.data.filter(validGoal).slice(0,60);
      }
      if(boxesResponse.error){
        boxData=[];
        console.debug('Avisos de insignias de cajas:',boxesResponse.error);
      }else{
        if(!Array.isArray(boxesResponse.data))throw Error('Lista de logros de cajas inválida');
        boxData=boxesResponse.data.filter(x=>x&&boxBadges[x.key]).slice(0,50);
      }
      root.hidden=false;
      const total=data.length+goalData.length+boxData.length;
      feedback.textContent=goalsResponse.error
        ?'Los avisos de metas no están disponibles. Pulsa ↻ Actualizar.'
        :total?'Tienes '+number(total)+' avisos de logros y metas.'
              :'No hay notificaciones de logros ni metas todavía.';
      drawList();
      if(!toastKey){
        const latest=data.find(x=>!x.read_at&&!announced.has(x.key));
        if(latest)drawToast(latest);
      }
      if(!goalToastKey){
        const latestGoal=goalData.find(x=>!x.read_at&&!goalAnnounced.has(goalKey(x)));
        if(latestGoal)drawGoalToast(latestGoal);
      }
      maybeCelebrateBoxBadge();
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
  goalsBtn.addEventListener('click',navigateGoals);

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
    window.addEventListener('sb:point-goal-updated',refresh);
    window.addEventListener('sb:surprise-box-opened',refresh);
    window.addEventListener('sb:surprise-box-badges-updated',refresh);
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
