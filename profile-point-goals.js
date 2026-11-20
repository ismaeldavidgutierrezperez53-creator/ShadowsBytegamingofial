/* Shadows Byte Gaming V2 — metas privadas de puntos acumulados */
(() => {
 'use strict';
 const format=x=>Math.max(0,Number(x)||0).toLocaleString('es-ES',{maximumFractionDigits:0});
 const create=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
 };
 const medalForTarget=target=>{
  const points=Number(target)||0;
  if(points>=10000)return {tier:'diamond',icon:'💎',label:'Medalla Diamante'};
  if(points>=5000)return {tier:'gold',icon:'🥇',label:'Medalla de Oro'};
  if(points>=1000)return {tier:'silver',icon:'🥈',label:'Medalla de Plata'};
  return {tier:'bronze',icon:'🥉',label:'Medalla de Bronce'};
 };
 const dateLabel=raw=>{
  const d=new Date(raw);
  return Number.isFinite(d.getTime())?d.toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'}):'';
 };
 function mount(root){
  if(root.querySelector('.sbpg-panel'))return;
  const anchor=root.querySelector('.sbrs-panel')||root.querySelector('.sb-reward-history')||
    root.querySelector('.sbv-editor')||root.querySelector('.sbp-identity-card');
  if(!anchor)return;

  const section=create('section','profile-panel sbpg-panel');
  section.id='my-point-goals';
  section.setAttribute('aria-label','Mis metas personales de puntos');
  const title=create('h2','','🏆 Mis metas de puntos');
  const explain=create('p','sbpg-explain',
    'El progreso se mide con los puntos que has GANADO en total, incluidos los que ya gastaste. No modifica tu saldo ni concede puntos adicionales.');
  const stats=create('div','sbpg-stats');
  const earnedItem=create('div','sbpg-stat');
  earnedItem.append(create('span','','✨ Puntos ganados acumulados'));
  const earnedText=create('strong','','—');earnedItem.append(earnedText);
  const balanceItem=create('div','sbpg-stat');
  balanceItem.append(create('span','','💰 Saldo disponible en tienda'));
  const balanceText=create('strong','','—');balanceItem.append(balanceText);
  stats.append(earnedItem,balanceItem);
  const current=create('div','sbpg-current');
  const currentHeading=create('h3','','🎯 Meta actual');
  const currentLabel=create('p','sbpg-goal-label','Consultando tu meta…');
  const progress=create('progress','sbpg-progress');
  progress.max=1;progress.value=0;
  progress.setAttribute('aria-label','Progreso hacia la meta de puntos');
  const progressLine=create('p','sbpg-progress-line','');
  const remaining=create('p','sbpg-remaining','');
  current.append(currentHeading,currentLabel,progress,progressLine,remaining);

  const form=create('form','sbpg-form');
  form.setAttribute('aria-label','Crear o cambiar una meta de puntos');
  const formHeading=create('h3','','✨ Crear o cambiar mi meta');
  const help=create('p','sbpg-help','Elige una cifra mayor que tus puntos ganados actuales.');
  const presets=create('div','sbpg-presets');
  presets.setAttribute('role','group');
  presets.setAttribute('aria-label','Metas rápidas');
  const targetLabel=create('label','sbpg-target-label','Objetivo personalizado (puntos)');
  const input=create('input','sbpg-input');
  input.id='sbpg-target-points';
  input.type='number';input.min='100';input.max='10000000';input.step='1';
  input.inputMode='numeric';input.required=true;
  targetLabel.htmlFor=input.id;
  const formControls=create('div','sbpg-form-controls');
  const save=create('button','gradient-btn mini','Guardar meta');
  save.type='submit';
  const reload=create('button','outline-btn mini','↻ Actualizar progreso');
  reload.type='button';
  formControls.append(save,reload);
  form.append(formHeading,help,presets,targetLabel,input,formControls);

  const status=create('p','sbpg-status','Cargando metas…');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const historyTitle=create('h3','','🏅 Metas completadas');
  const history=create('div','sbpg-history');
  const notice=create('p','sbpg-footnote',
    'Solo tú puedes consultar y cambiar tus metas. La campana 🔔 avisa al llegar al 25 %, 50 %, 75 % y 100 %. Al completar una meta se desbloquea una medalla decorativa visible en tu perfil público, respetando su privacidad y los bloqueos. No se entregan puntos extra.');
  section.append(title,explain,stats,current,form,status,historyTitle,history,notice);
  anchor.after(section);

  let ownerId=null,earned=0,goal=null,working=false,requested=0;
  let celebratedId=null,toast=null;
  const active=()=>section.isConnected&&location.hash.split('?')[0]==='#/cuenta';

  function suggestedGoal(points){
   return [500,1000,5000,10000,25000,50000,100000,500000,1000000,10000000]
    .find(p=>p>points)||null;
  }

  function drawPresets(){
   presets.replaceChildren();
   for(const num of [500,1000,5000]){
    const btn=create('button','outline-btn mini',format(num)+' puntos');
    btn.type='button';
    btn.disabled=working||num<=earned;
    btn.title=num<=earned?'Objetivo ya alcanzado':'Seleccionar '+format(num)+' puntos';
    btn.addEventListener('click',()=>{input.value=String(num);input.focus();});
    presets.append(btn);
   }
  }

  function drawHistory(entries){
   history.replaceChildren();
   if(!entries.length){
    history.append(create('p','sbpg-empty',
      'Todavía no has completado ninguna meta. ¡Empieza con tu primer objetivo!'));
    return;
   }
   for(const item of entries){
    const medal=medalForTarget(item.target_points);
    const row=create('div','sbpg-history-row sbpg-history-row--'+medal.tier);
    row.append(
      create('strong','',medal.icon+' '+medal.label+' · '+format(item.target_points)+' puntos'),
      create('span','','Completada el '+dateLabel(item.completed_at))
    );
    history.append(row);
   }
  }

  function showCelebration(pending){
   if(!pending?.id||toast&&celebratedId===pending.id)return;
   if(toast){toast.remove();toast=null;}
   celebratedId=pending.id;
   const medal=medalForTarget(pending.target_points);
   toast=create('aside','sbpg-celebration sbpg-celebration--'+medal.tier);
   toast.setAttribute('role','status');
   toast.setAttribute('aria-live','polite');
   const burst=create('div','sbpg-confetti-burst');
   burst.setAttribute('aria-hidden','true');
   for(let i=0;i<16;i++){
    const piece=create('span','sbpg-confetti-piece',i%3===0?'✦':'◆');
    const angle=i*Math.PI/8;
    piece.style.setProperty('--dx',Math.round(Math.cos(angle)*(85+i%4*15))+'px');
    piece.style.setProperty('--dy',Math.round(Math.sin(angle)*(65+i%3*15))+'px');
    piece.style.setProperty('--delay',String(i%5*45)+'ms');
    burst.append(piece);
   }
   const content=create('div','sbpg-celebration-content');
   content.append(
    create('span','sbpg-celebration-icon','🎉 '+medal.icon),
    create('strong','','¡Meta completada y medalla desbloqueada!'),
    create('p','sbpg-new-medal-name',medal.icon+' '+medal.label),
    create('p','','Has alcanzado '+format(pending.target_points)+
      ' puntos acumulados. ¡Enhorabuena! La medalla aparecerá en tu perfil.'),
    create('small','','Esta recompensa es decorativa. No añade puntos a tu saldo.')
   );
   const dismiss=create('button','gradient-btn mini','¡Genial! Continuar');
   dismiss.type='button';
   dismiss.addEventListener('click',async()=>{
    if(dismiss.disabled)return;
    dismiss.disabled=true;
    try{
     const {data,error}=await sb.rpc('ack_my_point_goal_completion',{p_goal_id:pending.id});
     if(error||data!==true)throw error||Error('No se pudo confirmar');
     toast?.remove();toast=null;celebratedId=null;
     window.dispatchEvent(new Event('sb:point-goal-medal-unlocked'));
     if(active())refresh();
    }catch(err){
     dismiss.disabled=false;
     status.textContent='No se pudo confirmar la felicitación. Inténtalo otra vez.';
    }
   });
   toast.append(burst,content,dismiss);
   document.body.append(toast);
  }

  function hideCelebration(){
   if(toast)toast.remove();
   toast=null;celebratedId=null;
  }

  function paint(payload){
   earned=Number(payload.earned_points)||0;
   goal=payload.active||null;
   earnedText.textContent=format(earned)+' puntos';
   balanceText.textContent=format(payload.current_balance)+' puntos';
   if(goal){
    const target=Number(goal.target_points)||1;
    const percentage=Math.min(100,Math.max(0,earned/target*100));
    currentLabel.textContent='Objetivo: '+format(target)+' puntos ganados';
    progress.max=target;progress.value=Math.min(target,earned);
    progress.setAttribute('aria-valuetext',Math.round(percentage)+'% completado');
    progressLine.textContent=format(earned)+' / '+format(target)+' puntos · '+percentage.toFixed(1)+'%';
    remaining.textContent='Te faltan '+format(Math.max(0,target-earned))+' puntos para completar la meta.';
    input.value=String(target);
    save.textContent='Cambiar mi meta';
   }else{
    currentLabel.textContent='Aún no tienes una meta activa.';
    progress.max=1;progress.value=0;
    progressLine.textContent='Elige una cifra mayor que tus puntos ganados.';
    remaining.textContent='';
    const next=suggestedGoal(earned);
    input.value=next?String(next):'';
    save.textContent='Crear mi meta';
   }
   save.disabled=false;input.disabled=false;
   drawPresets();
   drawHistory(Array.isArray(payload.completed)?payload.completed:[]);
   status.textContent=goal
    ?'Meta guardada. Tu progreso se actualiza al visitar tu perfil.'
    :'Puedes crear una meta nueva sin afectar a tus recompensas.';
   if(payload.pending_celebration)showCelebration(payload.pending_celebration);
   else hideCelebration();
  }

  async function refresh(){
   if(!active())return;
   const ticket=++requested;
   reload.disabled=true;
   status.textContent='Actualizando progreso…';
   try{
    if(typeof sb==='undefined'||!sb.auth||!sb.rpc)throw Error('Supabase no disponible');
    const auth=await sb.auth.getUser();
    if(auth.error||!auth.data?.user?.id)throw Error('Inicia sesión para gestionar tus metas.');
    const memberId=auth.data.user.id;
    if(ownerId&&ownerId!==memberId){
     hideCelebration();
     goal=null;earned=0;
    }
    ownerId=memberId;
    const {data,error}=await sb.rpc('get_my_point_goals');
    if(error)throw error;
    if(ticket!==requested||!active())return;
    if(!data||!Number.isFinite(Number(data.earned_points))||
      !Array.isArray(data.completed))throw Error('Datos de metas incompletos');
    paint(data);
    // Refresh the bell promptly when milestones are reached or a goal changes.
    window.dispatchEvent(new Event('sb:point-goal-updated'));
   }catch(err){
    if(ticket===requested&&active()){
     status.textContent='No se pudo actualizar: '+String(err.message||'Error desconocido')+
      '. Pulsa ↻ Actualizar progreso.';
    }
   }finally{
    if(ticket===requested&&active())reload.disabled=false;
   }
  }

  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(working||!active())return;
   const value=Number(input.value);
   if(!Number.isSafeInteger(value)||value<100||value>10000000||value<=earned){
    status.textContent='Elige un número entero entre 100 y 10.000.000, superior a los puntos ya ganados ('+
     format(earned)+').';
    input.focus();return;
   }
   working=true;save.disabled=true;input.disabled=true;
   drawPresets();
   status.textContent='Guardando meta…';
   try{
    const auth=await sb.auth.getUser();
    if(auth.error||!auth.data?.user?.id||auth.data.user.id!==ownerId)
     throw Error('La sesión ha cambiado. Vuelve a iniciar sesión.');
    const {data,error}=await sb.rpc('set_my_point_goal',{p_target_points:value});
    if(error||!data?.saved)throw error||Error('No se confirmó el guardado.');
    await refresh();
    if(active())status.textContent='✅ Meta de '+format(value)+' puntos guardada.';
   }catch(err){
    if(active())status.textContent='No se pudo guardar la meta: '+
      String(err.message||'Error desconocido');
   }finally{
    working=false;save.disabled=false;input.disabled=false;drawPresets();
   }
  });
  reload.addEventListener('click',refresh);
  const open=()=>{
   if(!active())return;
   refresh();
   section.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.addEventListener('sb:open-point-goals',open);
  const focus=()=>{if(active()&&document.visibilityState==='visible'&&!working)refresh();};
  window.addEventListener('focus',focus);
  const visibility=()=>{if(document.visibilityState==='visible'&&active())refresh();};
  document.addEventListener('visibilitychange',visibility);
  const interval=setInterval(()=>{
   if(document.visibilityState==='visible'&&active()&&!working)refresh();
  },60000);
  const app=document.getElementById('app');
  if(app){
   const observer=new MutationObserver(()=>{
    if(section.isConnected)return;
    hideCelebration();
    clearInterval(interval);
    window.removeEventListener('sb:open-point-goals',open);
    window.removeEventListener('focus',focus);
    document.removeEventListener('visibilitychange',visibility);
    observer.disconnect();
   });
   observer.observe(app,{childList:true,subtree:true});
  }
  refresh();
 }
 let queued=false;
 function scan(){
  queued=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sbp-identity-card'))mount(account);
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan);}
 function start(){
  const app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
