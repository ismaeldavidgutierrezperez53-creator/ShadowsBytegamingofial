// Celebración de temporadas. Solo los resultados DEFINITIVOS originan anuncios oficiales.
(function(){
 'use strict';
 const prizes=[
  {position:1,icon:'🥇',title:'Rey de Encuestas',points:100,theme:'gold'},
  {position:2,icon:'🥈',title:'Voz de Plata',points:50,theme:'silver'},
  {position:3,icon:'🥉',title:'Voz de Bronce',points:25,theme:'bronze'}
 ];
 let watchTimer=null;
 const locallyCelebrated=new Set();
 const create=(tag,className,value)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(value!==undefined)el.textContent=value;
  return el;
 };
 const monthTitle=month=>new Intl.DateTimeFormat('es-ES',{
  timeZone:'Europe/Madrid',month:'long',year:'numeric'
 }).format(new Date(month+'T12:00:00Z'));
 const previousMonth=month=>{
  const [y,m]=month.split('-').map(Number);
  return new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7)+'-01';
 };
 function addConfetti(banner){
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const layer=create('div','poll-season-confetti');
  layer.setAttribute('aria-hidden','true');
  for(let i=0;i<42;i++){
   const part=create('i','poll-season-confetti-piece');
   const hue=[42,195,282,327,146][i%5];
   part.style.setProperty('--confetti-hue',String(hue));
   part.style.setProperty('--confetti-left',(2+(i*67%96))+'%');
   part.style.setProperty('--confetti-delay',((i*37%83)/100)+'s');
   part.style.setProperty('--confetti-duration',(2.5+(i*23%17)/10)+'s');
   part.style.setProperty('--confetti-drift',((i%2?1:-1)*(15+i*9%90))+'px');
   layer.append(part);
  }
  banner.append(layer);
  setTimeout(()=>layer.remove(),5700);
 }
 function announceCard(prize,rank,available,preview){
  const card=create('article','poll-season-champion poll-season-champion-'+prize.theme);
  card.append(create('span','poll-season-champion-medal',prize.icon));
  card.append(create('strong','poll-season-champion-award',prize.title));
  const name=rank?.display_name||null;
  if(rank?.user_id&&name){
   const link=create('a','poll-season-champion-name',name);
   link.href='#/perfil?id='+encodeURIComponent(rank.user_id);
   card.append(link);
  }else{
   card.append(create('span','poll-season-champion-name',
    available?(preview?'Participante privado o por confirmar':'Ganador con perfil privado'):
              (preview?'Puesto aún vacante':'Sin ganador en este puesto')));
  }
  card.append(create('span','poll-season-champion-points',
   preview?'Premio previsto: +'+prize.points+' puntos':'+'+prize.points+' puntos'+(available?' entregados':' · sin adjudicar')));
  return card;
 }
 function buildBanner(season,ranking,preview){
  const root=create('section','poll-season-celebration'+(preview?' is-preview':' is-final'));
  root.setAttribute('aria-label',preview?'Vista previa de la celebración':'Ganadores de la temporada finalizada');
  const kicker=create('span','poll-season-celebration-kicker',
   preview?'VISTA PREVIA · SIN PREMIOS ENTREGADOS':'RESULTADOS OFICIALES · TEMPORADA FINALIZADA');
  const title=create('h3',null,
   preview?'🎊 Así será la celebración anime':'🎉 ¡Enhorabuena, campeones de '+monthTitle(season.month_start)+'!');
  const description=create('p','poll-season-celebration-description',
   preview?'Los puestos son provisionales. La celebración real y los avisos de premios se activarán cuando cierre la temporada.':
   'La clasificación es definitiva. Los ganadores han recibido sus puntos, insignias y un aviso especial en la campana 🔔.');
  root.append(kicker,title,description);
  const podium=create('div','poll-season-champions');
  const byPosition=new Map((ranking||[]).map(x=>[Number(x.position),x]));
  const assigned=Math.min(3,Math.max(0,Number(season.participant_count)||0));
  for(const prize of prizes){
   const rank=byPosition.get(prize.position);
   const available=preview?!!rank:prize.position<=assigned;
   podium.append(announceCard(prize,rank,available,preview));
  }
  root.append(podium);
  if(preview){
   root.append(create('p','poll-season-celebration-note','✨ Ejemplo visual: no se generan trofeos, puntos ni notificaciones.'));
  }else{
   const link=create('a','poll-season-celebration-link','🏆 Ver historial de campeones');
   link.href='#/encuestas?temporada='+encodeURIComponent(season.month_start);
   root.append(link);
  }
  return root;
 }
 function playOnce(banner,season,userId){
  if(!season||!season.month_start)return;
  const month=season.month_start;
  const end=window.SBPollSeasonExtras?.endOfMadridMonth?.(month);
  if(!Number.isFinite(end))return;
  const age=Date.now()-end;
  if(age<0||age>7*86400000)return;
  const key='sb-poll-season-celebrated:'+month+':'+(userId||'visitante');
  let already=locallyCelebrated.has(key);
  try{already=already||localStorage.getItem(key)==='1';}catch(_){}
  if(already)return;
  locallyCelebrated.add(key);
  try{localStorage.setItem(key,'1');}catch(_){}
  addConfetti(banner);
 }
 async function showFinal(host,season,userId){
  if(!host?.isConnected||!season?.month_start)return;
  const old=host.querySelector('.poll-season-celebration');
  old?.remove();
  const banner=buildBanner(season,[],false);
  host.insertBefore(banner,host.firstChild);
  try{
   const {data,error}=await sb.from('community_poll_season_leaderboard')
    .select('position,user_id,display_name,votes_count')
    .eq('month_start',season.month_start).lte('position',3)
    .order('position',{ascending:true});
   if(!banner.isConnected)return;
   if(error){
    banner.querySelector('.poll-season-champions')?.replaceChildren(
     create('p','poll-season-celebration-error','No se pudieron cargar los ganadores. Reintenta al actualizar la temporada.'));
    return;
   }
   const ranks=data||[];
   const revised=buildBanner(season,ranks,false);
   banner.replaceWith(revised);
   playOnce(revised,season,userId);
  }catch(error){
   if(banner.isConnected)banner.querySelector('.poll-season-champions')?.replaceChildren(
    create('p','poll-season-celebration-error','No se pudo cargar el anuncio de ganadores.'));
   console.warn('Celebración de encuestas:',error);
  }
 }
 function preview(host,season,ranking){
  if(!host?.isConnected)return;
  const existing=host.querySelector('.poll-season-celebration.is-preview');
  if(existing){existing.remove();return;}
  host.querySelector('.poll-season-celebration.is-final')?.remove();
  const banner=buildBanner(season,ranking,true);
  host.insertBefore(banner,host.firstChild);
  addConfetti(banner);
  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   banner.scrollIntoView({behavior:'smooth',block:'center'});
  }
 }
 function watch(host,currentMonth,seasons,onFinalized){
  if(watchTimer!==null){clearInterval(watchTimer);watchTimer=null;}
  if(!host?.isConnected||typeof onFinalized!=='function')return;
  const madridToday=new Intl.DateTimeFormat('en-GB',{
   day:'2-digit',timeZone:'Europe/Madrid'
  }).format(new Date());
  if(madridToday!=='01')return;
  const previous=previousMonth(currentMonth);
  if((seasons||[]).some(s=>s.month_start===previous))return;
  const check=async()=>{
   if(!host.isConnected){clearInterval(watchTimer);watchTimer=null;return;}
   const {data,error}=await sb.from('community_poll_seasons')
    .select('month_start').eq('month_start',previous).maybeSingle();
   if(!error&&data?.month_start===previous){
    clearInterval(watchTimer);watchTimer=null;onFinalized();
   }
  };
  watchTimer=setInterval(check,60000);
 }
 window.SBPollSeasonCelebration={showFinal,preview,watch};
})();
