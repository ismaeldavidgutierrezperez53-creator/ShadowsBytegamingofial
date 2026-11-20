// Ranking de participación y metas de encuestas. Solo publica perfiles públicos.
(function(){
 'use strict';
 const goals=[
  {count:5,bonus:50,badge:'🥉 Explorador de Encuestas'},
  {count:10,bonus:100,badge:'🥈 Voz de la Comunidad'},
  {count:20,bonus:250,badge:'🥇 Leyenda del Voto'}
 ];
 let revision=0;
 const format=n=>new Intl.NumberFormat('es-ES').format(Number(n)||0);
 const make=(tag,klass,text)=>{
  const el=document.createElement(tag);
  if(klass)el.className=klass;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 function progressBar(current,total,label){
  const track=make('div','poll-journey-track');
  track.setAttribute('role','progressbar');
  track.setAttribute('aria-label',label);
  track.setAttribute('aria-valuemin','0');
  track.setAttribute('aria-valuemax',String(total));
  track.setAttribute('aria-valuenow',String(Math.max(0,Math.min(total,current))));
  const fill=make('div','poll-journey-track-fill');
  fill.style.width=(Math.max(0,Math.min(total,current))*100/total)+'%';
  track.append(fill);
  return track;
 }
 function renderRank(root,data){
  root.replaceChildren();
  if(!data?.length){
   root.append(make('p','poll-journey-empty','Todavía no hay participantes con un perfil público. ¡Sé el primero en aparecer!'));
   return;
  }
  const ordered=[...data].sort((a,b)=>Number(b.votes_count)-Number(a.votes_count)||
   String(a.display_name||'').localeCompare(String(b.display_name||''),'es'));
  for(let i=0;i<ordered.length;i++){
   const member=ordered[i];
   const votes=Number(member.votes_count)||0;
   const item=make('div','poll-leaderboard-row');
   const place=make('span','poll-leaderboard-place',i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1)+'.');
   const details=make('div','poll-leaderboard-member');
   const name=make('a','poll-leaderboard-name',member.display_name||'Miembro');
   name.href='#/perfil?id='+encodeURIComponent(member.user_id);
   details.append(name);
   const earned=[...goals].reverse().find(g=>votes>=g.count);
   if(earned)details.append(make('span','poll-leaderboard-badge',earned.badge));
   const number=make('strong','poll-leaderboard-votes',format(votes)+' voto'+(votes===1?'':'s'));
   item.append(place,details,number);
   root.append(item);
  }
 }
 function renderMyProgress(root,user,voteCount,awards){
  root.replaceChildren();
  const earned=new Set((awards||[]).map(a=>Number(a.milestone)));
  if(!user){
   root.append(make('p','poll-journey-empty','Inicia sesión para guardar tus votos, desbloquear insignias y ganar puntos.'));
   const login=make('a','outline-btn mini','Iniciar sesión');
   login.href='#/auth';root.append(login);
   return;
  }
  root.append(make('p','poll-journey-my-count','🗳️ Has votado en '+format(voteCount)+' encuesta'+(voteCount===1?'':'s')+'.'));
  const next=goals.find(g=>!earned.has(g.count));
  if(next){
   root.append(make('p','poll-journey-progress-label','Siguiente insignia: '+next.count+' encuestas · '+Math.max(0,next.count-voteCount)+' voto(s) restantes'));
   root.append(progressBar(voteCount,next.count,'Progreso para la insignia de '+next.count+' encuestas'));
  }else{
   root.append(make('p','poll-journey-completed','🏆 ¡Has conseguido las tres insignias!'));
  }
  const grid=make('div','poll-journey-milestones');
  for(const goal of goals){
   const done=earned.has(goal.count);
   const tile=make('article','poll-journey-milestone'+(done?' is-earned':''));
   tile.append(make('strong','poll-journey-badge',goal.badge));
   tile.append(make('span','poll-journey-goal',goal.count+' encuestas · +'+goal.bonus+' puntos extra'));
   tile.append(make('span','poll-journey-status',done?'✓ Conseguida':'🔒 Por desbloquear'));
   grid.append(tile);
  }
  root.append(grid);
  const bonusEarned=(awards||[]).reduce((sum,a)=>sum+(Number(a.points)||0),0);
  root.append(make('p','poll-journey-reward-total','Bonificaciones ganadas: +'+format(bonusEarned)+' puntos · Cada voto también suma 15 puntos.'));
 }
 async function render(){
  const host=document.getElementById('poll-participation');
  if(!host)return;
  const run=++revision;
  host.replaceChildren();
  const heading=make('div','poll-journey-heading');
  const left=make('div');
  left.append(make('span','poll-journey-kicker','PARTICIPACIÓN · COMUNIDAD'));
  left.append(make('h2',null,'🏆 Ranking y premios de encuestas'));
  left.append(make('p',null,'Participa, sube posiciones y desbloquea insignias por 5, 10 y 20 votos.'));
  const refresh=make('button','poll-journey-refresh','↻ Actualizar');
  refresh.type='button';refresh.addEventListener('click',render);
  heading.append(left,refresh);host.append(heading);
  const layout=make('div','poll-journey-columns');
  const top=make('div','poll-journey-block');
  top.append(make('h3',null,'🥇 Miembros más participativos'));
  top.append(make('p','poll-journey-helper','Solo aparecen los miembros con perfil público; nunca se muestran sus respuestas.'));
  const rankRoot=make('div','poll-journey-leaderboard','Cargando clasificación…');
  top.append(rankRoot);
  const my=make('div','poll-journey-block');
  my.append(make('h3',null,'✨ Mis metas y recompensas'));
  const myRoot=make('div','poll-journey-self','Consultando tus premios…');
  my.append(myRoot);
  layout.append(top,my);host.append(layout);
  window.SBPollSeasons?.mount(host,layout);
  try{
   const [rankResult,authResult]=await Promise.all([
    sb.from('community_poll_leaderboard')
      .select('user_id,display_name,votes_count')
      .order('votes_count',{ascending:false}).order('display_name',{ascending:true}).limit(10),
    sb.auth.getUser()
   ]);
   if(!host.isConnected||revision!==run)return;
   if(rankResult.error)rankRoot.textContent='No se pudo cargar el ranking: '+rankResult.error.message;
   else renderRank(rankRoot,rankResult.data||[]);
   const user=authResult?.data?.user;
   if(authResult?.error){myRoot.textContent='No se pudo consultar tu sesión.';return;}
   if(!user){renderMyProgress(myRoot,null,0,[]);return;}
   const [countResult,awardsResult]=await Promise.all([
    sb.from('community_poll_participation').select('votes_count').eq('user_id',user.id).maybeSingle(),
    sb.from('member_poll_milestone_awards').select('milestone,points,awarded_at')
      .eq('user_id',user.id).order('milestone',{ascending:true})
   ]);
   if(!host.isConnected||revision!==run)return;
   if(countResult.error||awardsResult.error){
    myRoot.textContent='No se pudieron cargar tus metas. Usa Actualizar para intentarlo de nuevo.';
    return;
   }
   renderMyProgress(myRoot,user,Number(countResult.data?.votes_count||0),awardsResult.data||[]);
  }catch(error){
   if(!host.isConnected||revision!==run)return;
   rankRoot.textContent='No se pudo conectar con el ranking.';
   myRoot.textContent='No se pudieron cargar los premios.';
   console.warn('Ranking de encuestas:',error);
  }
 }
 window.SBPollParticipation={render};
})();
