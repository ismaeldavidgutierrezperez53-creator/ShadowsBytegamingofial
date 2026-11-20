/* Shadows Byte Gaming Official V2 — inscripciones, participantes, ranking y podio V8.
 * Solo Supabase valida las inscripciones, calcula los puntos y adjudica premios. */
(function(){
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=renderRewardShop;
 let generation=0,feedback='',focusEventId='';
 const node=(tag,className,text)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=String(text);
  return element;
 };
 const points=num=>Number(num||0).toLocaleString('es-ES');
 const prefersLess=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const goToEvent=id=>{
  const elem=[...document.querySelectorAll('[data-shop-season-event-id]')]
   .find(card=>card.dataset.shopSeasonEventId===id);
  elem?.scrollIntoView({behavior:prefersLess()?'auto':'smooth',block:'center'});
 };
 const makeCompetition=(event,status,rows,token)=>{
  const eventId=event.dataset.shopSeasonEventId,when=event.dataset.shopSeasonStatus;
  const wrap=node('section','shop-competition-v8');
  wrap.setAttribute('aria-label','Participación y ranking del evento');
  const head=node('div','shop-competition-v8-head');
  const title=node('div','');
  title.append(node('h5','','🏆 Participantes y clasificación'),
   node('p','','Los puntos de competición proceden de las misiones del evento que reclames después de inscribirte. Los empates se resuelven por fecha de inscripción.'));
  head.append(title);
  const counter=node('strong','shop-competition-v8-count',
   '👥 '+points(status.participant_count)+' participante'+(Number(status.participant_count)===1?'':'s'));
  head.append(counter);wrap.append(head);
  const myRow=rows.find(r=>r.is_me);
  const already=!!status.registered;
  const isFinal=!!status.finalized;
  const actionRow=node('div','shop-competition-v8-actions');
  const statusText=node('p','shop-competition-v8-status');
  statusText.setAttribute('role','status');
  const join=node('button','gradient-btn mini shop-competition-v8-join','');
  join.type='button';
  const canJoin=!already&&!isFinal&&(when==='upcoming'||when==='live');
  const canLeave=already&&!isFinal&&when==='upcoming';
  if(isFinal){join.textContent='✓ Clasificación cerrada';join.disabled=true}
  else if(canLeave){join.textContent='Cancelar inscripción'}
  else if(already){join.textContent='✓ Ya estás inscrito';join.disabled=true}
  else if(canJoin){join.textContent='🎟️ Inscribirme al evento'}
  else{join.textContent='🔒 Inscripciones cerradas';join.disabled=true}
  join.onclick=async()=>{
   if(join.disabled)return;
   if(canLeave&&!confirm('¿Cancelar tu inscripción antes de que comience el evento?'))return;
   join.disabled=true;statusText.textContent=canLeave?'Cancelando inscripción…':'Registrando tu inscripción…';
   try{
    const method=canLeave?'leave_shop_season_event':'join_shop_season_event';
    const {data:ok,error}=await sb.rpc(method,{p_event_id:eventId});
    if(token!==generation||!wrap.isConnected)return;
    if(error){statusText.textContent='Error: '+error.message;join.disabled=false;return}
    feedback=ok?(canLeave?'✓ Inscripción cancelada.':'🎟️ ¡Inscripción confirmada! Ya puedes sumar puntos de competición.'):
     'La inscripción ya estaba actualizada.';
    focusEventId=eventId;
    await renderRewardShop();
   }catch(error){
    if(wrap.isConnected){statusText.textContent='Error de conexión: '+(error?.message||String(error));join.disabled=false}
   }
  };
  actionRow.append(join);
  if(already){
   const label=node('span','shop-competition-v8-registered',
    '✓ Inscrito · '+(myRow?'Puesto #'+myRow.place_no+' · '+points(myRow.score)+' puntos':'En la clasificación'));
   actionRow.append(label);
  }
  if(status.my_place){
   actionRow.append(node('strong','shop-competition-v8-winner',
    ['','🥇 Oro','🥈 Plata','🥉 Bronce'][Number(status.my_place)]+' · +'+points(status.my_award_points)+' puntos'));
  }
  wrap.append(actionRow,statusText);
  const prizes=node('div','shop-competition-v8-prizes');
  const prizeTitle=node('p','shop-competition-v8-prize-heading',
   isFinal?'🎉 Premios entregados al cerrar el evento':'🎖️ Premios reservados para el podio al finalizar el evento');
  prizes.append(prizeTitle);
  for(const [medal,rank,reward,label] of [
   ['🥇',1,100,'Insignia Campeón Anime'],
   ['🥈',2,50,'Insignia Subcampeón Anime'],
   ['🥉',3,25,'Insignia Estrella Anime']
  ]){
   const item=node('div','shop-competition-v8-prize');
   item.append(node('span','shop-competition-v8-medal',medal),
    node('span','',rank+'.º lugar · '+points(reward)+' puntos'),
    node('small','',label));
   prizes.append(item);
  }
  wrap.append(prizes);
  const rankTitle=node('h6','shop-competition-v8-rank-heading',
   isFinal?'🏅 Clasificación final':'📊 Clasificación provisional');
  wrap.append(rankTitle);
  if(!rows.length){
   wrap.append(node('p','shop-competition-v8-empty',
    'Aún no hay participantes. Puedes inscribirte para aparecer en la clasificación.'));
  }else{
   const list=node('div','shop-competition-v8-ranking');
   for(const r of rows){
    const item=node('div','shop-competition-v8-player'+(r.is_me?' is-me':'')+
     (isFinal&&Number(r.award_points)>0?' is-awarded':''));
    item.append(node('strong','shop-competition-v8-place',
     Number(r.place_no)<=3?['🥇','🥈','🥉'][Number(r.place_no)-1]:'#'+r.place_no));
    const player=node('div','shop-competition-v8-player-meta');
    const name=node('strong','',r.is_me?'Tú'+(r.display_label&&r.display_label!=='Tú'?' · '+r.display_label:''):r.display_label||'Participante');
    player.append(name,node('small','',Number(r.missions_completed||0)+' misión(es) completada(s)'));
    item.append(player,node('strong','shop-competition-v8-points',points(r.score)+' pts'));
    if(isFinal&&Number(r.award_points)>0){
     item.append(node('small','shop-competition-v8-award',
      '🎁 +'+points(r.award_points)+' puntos · '+(r.prize_name||'Premio especial')));
    }
    list.append(item);
   }
   wrap.append(list);
  }
  if(!isFinal){
   wrap.append(node('p','shop-competition-v8-footnote',
    when==='ended'?
     'El evento ha terminado. El administrador debe cerrar el ranking para asignar los premios del podio.':
     'El podio es provisional hasta que el administrador cierre el evento. Solo los miembros inscritos con puntos de competición pueden ganar premios.'));
  }else{
   wrap.append(node('p','shop-competition-v8-footnote',
    'Clasificación cerrada. Los premios de los ganadores se han añadido al saldo y a sus colecciones de perfil.'));
  }
  return wrap;
 };
 renderRewardShop=async function(){
  const token=++generation;
  await previous();
  const host=document.getElementById('reward-shop');
  if(!host?.isConnected||token!==generation)return;
  const cards=[...host.querySelectorAll('[data-shop-season-event-id]')];
  if(!cards.length)return;
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||token!==generation)return;
   const {data:statuses,error}=await sb.rpc('get_my_shop_season_registrations');
   if(error){console.warn('Inscripciones de eventos:',error.message);return}
   const statusMap=new Map((statuses||[]).map(s=>[s.event_id,s]));
   const loaded=await Promise.all(cards.map(async card=>{
    const id=card.dataset.shopSeasonEventId;
    const s=statusMap.get(id);
    if(!s)return {card,error:'Estado no disponible'};
    const result=await sb.rpc('get_shop_season_leaderboard',{p_event_id:id});
    return {card,status:s,rows:result.data||[],error:result.error?.message};
   }));
   if(token!==generation||!host.isConnected)return;
   for(const item of loaded){
    if(!item.card.isConnected)continue;
    if(item.error){
     const alert=node('div','shop-competition-v8 shop-competition-v8-error');
     alert.textContent='No se ha podido cargar la clasificación: '+item.error;
     item.card.append(alert);continue;
    }
    item.card.append(makeCompetition(item.card,item.status,item.rows,token));
   }
   if(feedback&&focusEventId){
    const target=loaded.find(x=>x.card.dataset.shopSeasonEventId===focusEventId);
    if(target?.card?.isConnected){
     const message=node('p','shop-competition-v8-toast',feedback);
     message.setAttribute('role','status');
     target.card.querySelector('.shop-competition-v8')?.prepend(message);
     goToEvent(focusEventId);
    }
    feedback='';focusEventId='';
   }
  }catch(err){
   console.warn('No se pudo cargar la clasificación de temporadas:',err);
  }
 };
})();