/* Shadows Byte Gaming Official V2 — Torneos anime y gaming V9.
   Cada inscripción, emparejamiento y premio se comprueba en Supabase. */
(function(){
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const original=renderRewardShop;
 let generation=0;
 let lastMessage='',lastTournament='';
 const e=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const date=iso=>iso?new Date(iso).toLocaleString('es-ES',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Sin fecha';
 const fmt=value=>Number(value||0).toLocaleString('es-ES');
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const jump=id=>{
  document.getElementById('community-tournament-'+id)?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
 };
 const request=async(fn,args)=>{
  const {data,error}=await sb.rpc(fn,args);
  if(error)throw new Error(error.message);
  return data;
 };
 const buildMatch=(match)=>{
  const card=e('article','community-tournament-v9-match'+(match.winner_id?' is-complete':''));
  const phase=match.stage==='semi'?'Semifinal '+match.match_no:
    match.stage==='bronze'?'Partido por el bronce':'Gran final';
  const top=e('div','community-tournament-v9-match-top');
  top.append(e('strong','',phase),e('span','',match.winner_id?'✓ Finalizado':'Pendiente'));
  card.append(top);
  for(const which of [1,2]){
   const user=e('div','community-tournament-v9-fighter');
   const name=which===1?match.player1_label:match.player2_label;
   const id=which===1?match.player1_id:match.player2_id;
   const isMe=which===1?match.player1_is_me:match.player2_is_me;
   const winner=match.winner_id&&match.winner_id===id;
   if(winner)user.classList.add('is-winner');
   if(isMe)user.classList.add('is-me');
   user.append(e('span','',winner?'🏅':which===1?'⚔️':'🛡️'),
    e('span','',isMe?'Tú · '+(name||'Participante'):(name||'Participante privado')));
   if(winner)user.append(e('strong','','Ganador'));
   card.append(user);
  }
  if(!match.winner_id)card.append(e('small','','El administrador confirmará el resultado después del enfrentamiento.'));
  return card;
 };
 const tournamentCard=(t,matches,rank,token)=>{
  const card=e('article','community-tournament-v9-card '+t.kind);
  card.id='community-tournament-'+t.tournament_id;
  const head=e('div','community-tournament-v9-card-head');
  const name=e('div','community-tournament-v9-title');
  name.append(e('span','community-tournament-v9-emoji',t.emoji||'🏆'),e('h4','',t.title));
  const state=t.finished?'✓ Finalizado':t.started?'🔴 En competición':
   new Date(t.starts_at)>new Date()?'📅 Próximamente':'⏳ Esperando inicio';
  head.append(name,e('span','community-tournament-v9-state',state));
  card.append(head,e('p','community-tournament-v9-description',t.description));
  const dates=e('p','community-tournament-v9-dates','🗓️ '+date(t.starts_at)+' — '+date(t.ends_at));
  card.append(dates);
  const slotbar=e('div','community-tournament-v9-slots');
  slotbar.append(e('strong','','👥 '+fmt(t.participant_count)+' / 4 plazas'),
   e('span','',t.registered?'✓ Inscrito':t.started?'Inscripciones cerradas':'Abiertas hasta el comienzo'));
  card.append(slotbar);
  const row=e('div','community-tournament-v9-actions');
  const btn=e('button','gradient-btn mini community-tournament-v9-signup');
  btn.type='button';
  const beforeStart=!t.started&&!t.finished&&new Date()<new Date(t.starts_at);
  const canJoin=beforeStart&&!t.registered&&Number(t.participant_count)<4;
  const canLeave=beforeStart&&t.registered;
  btn.textContent=canLeave?'Cancelar inscripción':t.registered?'✓ Ya estás inscrito':canJoin?'🎟️ Inscribirme':'🔒 Inscripciones cerradas';
  btn.disabled=!canJoin&&!canLeave;
  const msg=e('p','community-tournament-v9-status');msg.setAttribute('role','status');
  btn.onclick=async()=>{
   if(btn.disabled)return;
   if(canLeave&&!confirm('¿Quieres cancelar tu plaza en '+t.title+'?'))return;
   btn.disabled=true;msg.textContent=canLeave?'Cancelando plaza…':'Inscribiendo…';
   try{
    const ok=await request(canLeave?'leave_community_tournament':'join_community_tournament',{p_id:t.tournament_id});
    if(token!==generation||!card.isConnected)return;
    lastMessage=ok?(canLeave?'✓ Has cancelado tu inscripción.':'🎟️ Inscripción confirmada para '+t.title+'.'):
     'Tu inscripción ya estaba actualizada.';
    lastTournament=t.tournament_id;
    await renderRewardShop();
   }catch(err){if(card.isConnected){msg.textContent=err.message;btn.disabled=false}}
  };
  row.append(btn);
  if(t.my_place){
   row.append(e('strong','community-tournament-v9-awarded',
    ['','🥇','🥈','🥉'][Number(t.my_place)]+' Ganador del puesto '+t.my_place+' · +'+fmt(t.my_prize_points)+' puntos'));
  }
  card.append(row,msg);
  const prizeTitle=e('h5','','🎖️ Premios del torneo');card.append(prizeTitle);
  const prizes=e('div','community-tournament-v9-prizes');
  for(const [symbol,points,description] of [
   ['🥇','125','Campeón del torneo'],
   ['🥈','75','Finalista del torneo'],
   ['🥉','40','Estrella del torneo']
  ]){
   const prize=e('div','community-tournament-v9-prize');
   prize.append(e('strong','',symbol+' +'+points+' pts'),
    e('small','',description+' · insignia exclusiva'));
   prizes.append(prize);
  }
  card.append(prizes);
  const box=e('div','community-tournament-v9-bracket');
  box.append(e('h5','','⚔️ Enfrentamientos 1 contra 1'));
  if(!matches.length){
   box.append(e('p','community-tournament-v9-help',
    'Cuatro participantes deben inscribirse. Cuando llegue el día, el administrador iniciará las semifinales y aparecerán aquí los emparejamientos.'));
  }else{
   const stages=e('div','community-tournament-v9-matches');
   for(const match of matches)stages.append(buildMatch(match));
   box.append(stages);
  }
  card.append(box);
  const ranking=e('div','community-tournament-v9-rank');
  ranking.append(e('h5','',t.finished?'🏆 Clasificación final':'📊 Clasificación de participantes'));
  if(!rank.length){
   ranking.append(e('p','community-tournament-v9-help','Todavía no hay participantes. ¡Inscríbete para ocupar una plaza!'));
  }else{
   for(const player of rank){
    const line=e('div','community-tournament-v9-rank-item'+(player.is_me?' is-me':''));
    line.append(e('strong','community-tournament-v9-placement',
     Number(player.place_no)<=3?['🥇','🥈','🥉'][Number(player.place_no)-1]:'#'+player.place_no),
     e('span','',player.is_me?'Tú · '+player.display_label:player.display_label||'Participante'),
     e('small','',fmt(player.wins)+' victorias · '+fmt(player.losses)+' derrotas'));
    if(player.award_points)line.append(e('strong','community-tournament-v9-rank-reward','+'+fmt(player.award_points)+' pts'));
    ranking.append(line);
   }
  }
  card.append(ranking);
  card.append(e('p','community-tournament-v9-footer',
   'Los resultados de los encuentros los confirma el administrador. El cuadro y los premios se actualizan desde Supabase; los empates de la clasificación provisional se ordenan por inscripción.'));
  return card;
 };
 renderRewardShop=async function(){
  const token=++generation;
  await original();
  const host=document.getElementById('reward-shop');
  if(!host?.isConnected||token!==generation)return;
  const anchor=host.querySelector('#shop-season-events-v7')||
   host.querySelector('#shop-challenges-v6')||host.querySelector('#shop-catalog-filters');
  if(!anchor)return;
  const insert=node=>anchor.insertAdjacentElement(anchor.id==='shop-catalog-filters'?'beforebegin':'afterend',node);
  const section=e('section','community-tournaments-v9');section.id='community-tournaments-v9';
  const heading=e('div','community-tournament-v9-header');
  const title=e('div','');
  title.append(e('h3','','🏆 Torneos especiales de Anime y Gaming'),
   e('p','','Compite contra otros miembros en torneos 1 contra 1 de cuatro plazas. El administrador confirma los enfrentamientos; al terminar se entregan puntos e insignias exclusivas a los tres primeros.'));
  heading.append(title);
  section.append(heading);
  try{
   const {data:{user}}=await sb.auth.getUser();
   if(!user||token!==generation||!host.isConnected)return;
   const tournaments=await request('get_community_tournaments');
   if(token!==generation||!host.isConnected)return;
   if(!(tournaments||[]).length)section.append(e('p','community-tournament-v9-help','No hay torneos publicados. El administrador puede programar una Copa Anime o una Arena Gaming.'));
   else{
    const content=await Promise.all(tournaments.map(async t=>{
     const [matches,ranking]=await Promise.all([
      sb.rpc('get_community_tournament_matches',{p_id:t.tournament_id}),
      sb.rpc('get_community_tournament_ranking',{p_id:t.tournament_id})
     ]);
     return {t,matches:matches.data||[],ranking:ranking.data||[],error:matches.error?.message||ranking.error?.message};
    }));
    if(token!==generation||!host.isConnected)return;
    for(const item of content){
     if(item.error){
      section.append(e('p','community-tournament-v9-error','Error al cargar '+item.t.title+': '+item.error));
     }else section.append(tournamentCard(item.t,item.matches,item.ranking,token));
    }
   }
   insert(section);
   if(lastMessage&&lastTournament){
    const card=document.getElementById('community-tournament-'+lastTournament);
    if(card){
     const banner=e('p','community-tournament-v9-toast',lastMessage);
     banner.setAttribute('role','status');card.prepend(banner);jump(lastTournament);
    }
    lastMessage='';lastTournament='';
   }
   const shortcut=e('button','outline-btn mini community-tournament-v9-shortcut','🏆 Ver torneos anime y gaming');
   shortcut.type='button';shortcut.onclick=()=>section.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
   const old=host.querySelector('.shop-season-v7-shortcut')||host.querySelector('.shop-explorer-shortcut');
   if(old)old.insertAdjacentElement('afterend',shortcut);
  }catch(err){
   if(token!==generation||!host.isConnected)return;
   section.append(e('p','community-tournament-v9-error','No se pudieron cargar los torneos: '+(err?.message||String(err))));
   insert(section);
  }
 };
})();