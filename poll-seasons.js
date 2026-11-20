// Temporadas mensuales de encuestas: ranking en hora de Madrid y premios irrevocables.
(function(){
 'use strict';
 const prizes=[
  {position:1,symbol:'🥇',badge:'Rey de Encuestas',points:100},
  {position:2,symbol:'🥈',badge:'Voz de Plata',points:50},
  {position:3,symbol:'🥉',badge:'Voz de Bronce',points:25}
 ];
 let requestId=0;
 const format=n=>new Intl.NumberFormat('es-ES').format(Number(n)||0);
 const make=(tag,className,text)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
 };
 function monthNowMadrid(){
  const parts=new Intl.DateTimeFormat('en-US',{
   timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'
  }).formatToParts(new Date());
  const year=parts.find(p=>p.type==='year')?.value;
  const month=parts.find(p=>p.type==='month')?.value;
  return year+'-'+month+'-01';
 }
 function labelMonth(month){
  return new Intl.DateTimeFormat('es-ES',{
   month:'long',year:'numeric',timeZone:'Europe/Madrid'
  }).format(new Date(month+'T12:00:00Z'));
 }
 function lastDay(month){
  const [y,m]=month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES',{
   day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'
  }).format(new Date(Date.UTC(y,m,0,12,0,0)));
 }
 function awardFor(position){return prizes.find(p=>p.position===Number(position));}
 function rowFor(rank,archived=false){
  const position=Number(rank.position)||0;
  const prize=awardFor(position);
  const row=make('div','poll-season-row');
  const medal=make('span','poll-season-rank',prize?.symbol||position+'.');
  const info=make('div','poll-season-member');
  const name=make('a','poll-season-name',rank.display_name||'Miembro');
  name.href='#/perfil?id='+encodeURIComponent(rank.user_id);
  info.append(name);
  if(archived&&prize){
   info.append(make('span','poll-season-award',prize.badge+' · +'+format(prize.points)+' puntos'));
  }
  const votes=Number(rank.votes_count)||0;
  const amount=make('strong','poll-season-votes',format(votes)+' voto'+(votes===1?'':'s'));
  row.append(medal,info,amount);
  return row;
 }
 function renderPrizeGuide(root){
  const list=make('div','poll-season-prize-list');
  for(const prize of prizes){
   const tile=make('div','poll-season-prize');
   tile.append(make('strong',null,prize.symbol+' '+prize.badge));
   tile.append(make('span',null,'+'+prize.points+' puntos'));
   list.append(tile);
  }
  root.append(list);
 }
 async function render(root){
  if(!root?.isConnected)return;
  const id=++requestId;
  const currentMonth=monthNowMadrid();
  root.replaceChildren();
  const header=make('div','poll-season-heading');
  const heading=make('div');
  heading.append(make('span','poll-season-kicker','TEMPORADAS MENSUALES · HORA DE ESPAÑA'));
  heading.append(make('h3',null,'🏆 Temporada de '+labelMonth(currentMonth)));
  heading.append(make('p',null,'Se cuentan los votos del mes en curso. Al cambiar de mes, la clasificación empieza de cero sin afectar a los puntos ni al ranking histórico.'));
  const refresh=make('button','poll-season-refresh','↻ Actualizar temporada');
  refresh.type='button';refresh.onclick=()=>render(root);
  header.append(heading,refresh);root.append(header);
  const note=make('p','poll-season-deadline','📅 Finaliza el '+lastDay(currentMonth)+'. Los premios se asignan automáticamente después del cierre.');
  root.append(note);
  const countdown=make('div','poll-anime-countdown-host');
  root.append(countdown);
  window.SBPollSeasonExtras?.mountCountdown(countdown,currentMonth);
  const columns=make('div','poll-season-columns');
  const live=make('div','poll-season-panel');
  live.append(make('h4',null,'📊 Clasificación de este mes'));
  live.append(make('p','poll-season-help','Los puestos son globales. Solo se muestran los perfiles públicos y nunca las respuestas elegidas.'));
  const ranks=make('div','poll-season-list','Cargando posiciones…');
  live.append(ranks);
  const rewards=make('div','poll-season-panel');
  rewards.append(make('h4',null,'🎁 Premios al finalizar'));
  rewards.append(make('p','poll-season-help','Oro, plata y bronce se entregan a los tres miembros con más votos del mes. Los empates se resuelven por el primer voto emitido.'));
  renderPrizeGuide(rewards);
  const my=make('div','poll-season-my','Consultando tu participación…');
  rewards.append(my);
  columns.append(live,rewards);root.append(columns);
  const archive=make('div','poll-season-archive');
  archive.append(make('h4',null,'📜 Historial de temporadas'));
  const filter=make('label','poll-season-history-select');
  filter.append(make('span',null,'Consultar mes finalizado'));
  const picker=make('select',null);
  picker.setAttribute('aria-label','Seleccionar temporada mensual finalizada');
  filter.append(picker);archive.append(filter);
  const archiveRoot=make('div','poll-season-archive-results','Consultando historial…');
  archive.append(archiveRoot);
  root.append(archive);
  const ownAwards=make('div','poll-season-own-awards');
  root.append(ownAwards);
  try{
   const [rankingResult,authResult,seasonResult]=await Promise.all([
    sb.from('community_poll_monthly_leaderboard')
     .select('user_id,display_name,votes_count,position')
     .eq('month_start',currentMonth)
     .order('position',{ascending:true}).limit(10),
    sb.auth.getUser(),
    sb.from('community_poll_seasons')
     .select('month_start,participant_count,votes_total,finalized_at')
     .order('month_start',{ascending:false}).limit(12)
   ]);
   if(!root.isConnected||id!==requestId)return;
   if(rankingResult.error){
    ranks.textContent='No se pudo cargar el ranking de la temporada.';
    console.warn('Ranking mensual:',rankingResult.error.message);
   }else{
    ranks.replaceChildren();
    window.SBPollSeasonExtras?.renderPodium(ranks,rankingResult.data||[],false);
    if(!rankingResult.data?.length)ranks.append(make('p','poll-season-empty','Aún no hay votos de perfiles públicos durante este mes.'));
    else for(const row of rankingResult.data)ranks.append(rowFor(row));
   }
   const user=authResult?.data?.user;
   if(authResult.error){
    my.textContent='No se pudo consultar tu sesión.';
   }else if(!user){
    my.replaceChildren();
    my.append(make('p','poll-season-help','Inicia sesión para ver tu puesto y ganar premios de temporada.'));
    const login=make('a','outline-btn mini','Iniciar sesión');
    login.href='#/auth';my.append(login);
   }else{
    const [countResult,awardsResult]=await Promise.all([
     sb.from('community_poll_monthly_participation')
      .select('votes_count,position').eq('month_start',currentMonth)
      .eq('user_id',user.id).maybeSingle(),
     sb.from('community_poll_season_results')
      .select('month_start,position,points,badge')
      .eq('user_id',user.id).gt('points',0)
      .order('month_start',{ascending:false}).limit(8)
    ]);
    if(!root.isConnected||id!==requestId)return;
    my.replaceChildren();
    if(countResult.error)my.append(make('p','poll-season-help','No se pudo consultar tu posición mensual.'));
    else{
     const myCount=Number(countResult.data?.votes_count)||0;
     const position=countResult.data?.position;
     my.append(make('p','poll-season-my-title','🗳️ Mis votos de '+labelMonth(currentMonth)));
     my.append(make('strong','poll-season-my-count',format(myCount)+' voto'+(myCount===1?'':'s')));
     my.append(make('span','poll-season-my-position',position?'Puesto actual: #'+position:'Participa para entrar en el ranking'));
    }
    ownAwards.replaceChildren();
    if(awardsResult.error){
     ownAwards.append(make('p','poll-season-help','No se pudo consultar tu historial de premios.'));
    }else if(awardsResult.data?.length){
     ownAwards.append(make('h4',null,'🏅 Mis premios de temporadas anteriores'));
     for(const a of awardsResult.data){
      ownAwards.append(make('p','poll-season-my-award',labelMonth(a.month_start)+' · '+(awardFor(a.position)?.symbol||'🏅')+' '+a.badge+' · +'+a.points+' puntos'));
     }
    }
   }
   archiveRoot.replaceChildren();
   picker.replaceChildren();
   if(seasonResult.error){
    picker.disabled=true;
    archiveRoot.append(make('p','poll-season-help','No se pudo consultar el historial de temporadas.'));
    return;
   }
   const past=seasonResult.data||[];
   if(!past.length){
    picker.disabled=true;
    const option=document.createElement('option');option.value='';option.textContent='Sin temporadas finalizadas';picker.append(option);
    archiveRoot.append(make('p','poll-season-empty','La primera temporada terminará el '+lastDay(currentMonth)+'. Los resultados quedarán guardados aquí.'));
    return;
   }
   for(const season of past){
    const option=document.createElement('option');option.value=season.month_start;
    option.textContent=labelMonth(season.month_start);
    picker.append(option);
   }
   const loadHistory=async()=>{
    const month=picker.value;
    const token=id;
    archiveRoot.replaceChildren(make('p','poll-season-help','Cargando resultados de '+labelMonth(month)+'…'));
    const {data,error}=await sb.from('community_poll_season_leaderboard')
     .select('position,user_id,display_name,votes_count,points,badge')
     .eq('month_start',month).order('position',{ascending:true}).limit(10);
    if(!root.isConnected||token!==requestId||picker.value!==month)return;
    archiveRoot.replaceChildren();
    if(error){
     archiveRoot.append(make('p','poll-season-empty','No se pudieron cargar los resultados.'));
     return;
    }
    const details=past.find(item=>item.month_start===month);
    archiveRoot.append(make('p','poll-season-summary',
     'Participantes: '+format(details?.participant_count)+' · Votos: '+format(details?.votes_total)));
    window.SBPollSeasonExtras?.renderPodium(archiveRoot,data||[],true);
    if(!data?.length){
     archiveRoot.append(make('p','poll-season-empty','No hay resultados visibles de perfiles públicos en esta temporada.'));
    }else for(const member of data)archiveRoot.append(rowFor(member,true));
    archiveRoot.append(make('p','poll-season-help','Los puestos de miembros con perfil privado no aparecen públicamente, aunque sus premios se conservan.'));
   };
   picker.onchange=loadHistory;
   await loadHistory();
  }catch(error){
   if(!root.isConnected||id!==requestId)return;
   ranks.textContent='Error de conexión al cargar la temporada.';
   archiveRoot.textContent='No se pudo cargar el historial.';
   console.warn('Temporadas de encuestas:',error);
  }
 }
 function mount(host,following){
  if(!host||!following)return;
  const root=make('section','poll-seasons');
  root.id='poll-seasons';
  host.insertBefore(root,following);
  render(root);
 }
 window.SBPollSeasons={mount};
})();
