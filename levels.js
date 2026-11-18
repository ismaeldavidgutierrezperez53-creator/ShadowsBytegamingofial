// Puntos derivados de actividad real; no se aceptan puntos escritos desde el navegador.
const LEVEL_RULES=[['member_posts','author_id',20],['member_comments','author_id',10],['member_likes','user_id',2],['member_catalog_favorites','user_id',5],['community_poll_votes','user_id',15]];
const levelFromXP=xp=>Math.floor(Math.sqrt(xp/100))+1;
const LEVEL_REWARDS=[{min:1,title:'Recluta Byte',icon:'🎮'},{min:2,title:'Explorador Otaku',icon:'🌟'},{min:3,title:'Guardián Gamer',icon:'⚔️'},{min:5,title:'Maestro de Sombras',icon:'👑'},{min:8,title:'Leyenda Shadows Byte',icon:'💎'}];
function rewardForLevel(level){return [...LEVEL_REWARDS].reverse().find(r=>level>=r.min)||LEVEL_REWARDS[0]}
function createRewardPanel(level){const reward=rewardForLevel(level),next=LEVEL_REWARDS.find(r=>r.min>level);const panel=document.createElement('section');panel.className='profile-panel';panel.style.cssText='margin-top:16px;border:1px solid #a855f777;border-radius:14px;padding:16px';const heading=document.createElement('h3');heading.textContent=reward.icon+' Rango: '+reward.title;panel.append(heading);const info=document.createElement('p');info.textContent=next?'Próximo título: '+next.title+' (nivel '+next.min+')':'¡Has desbloqueado el rango máximo!';panel.append(info);const title=document.createElement('p');title.textContent='Recompensas por nivel: '+LEVEL_REWARDS.map(r=>(level>=r.min?'✓ ':'🔒 ')+r.icon+' '+r.title+' (nivel '+r.min+')').join(' · ');panel.append(title);return panel}
async function memberXP(userId){
 const counts=await Promise.all(LEVEL_RULES.map(async([table,column,points])=>{const {count,error}=await sb.from(table).select('*',{count:'exact',head:true}).eq(column,userId);return error?{count:0,error:error.message,points}:{count:count||0,points}}));
 return {xp:counts.reduce((sum,x)=>sum+x.count*x.points,0),counts,errors:counts.filter(x=>x.error)};
}
const STREAK_MEDALS=[{days:3,icon:'🥉',title:'Constancia Byte'},{days:7,icon:'🥈',title:'Guardián de la Racha'},{days:30,icon:'🥇',title:'Leyenda Imparable'}];
function createStreakMedalsPanel(best){
 const section=document.createElement('section');section.className='profile-panel';section.style.cssText='margin-top:16px;padding:16px';const heading=document.createElement('h3');heading.textContent='🏅 Medallas de rachas';section.append(heading);
 const description=document.createElement('p');description.textContent='Mejor racha histórica: '+best+' días. Las medallas conseguidas permanecen en tu perfil.';section.append(description);
 const list=document.createElement('div');list.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
 for(const medal of STREAK_MEDALS){const earned=best>=medal.days;const item=document.createElement('span');item.textContent=medal.icon+' '+medal.title+' · '+medal.days+' días '+(earned?'✓':'🔒');item.style.cssText='padding:10px;border:1px solid #ffffff44;border-radius:12px;opacity:'+(earned?'1':'.5');list.append(item)}section.append(list);return section;
}
function createDailyCalendar(userId){
 const section=document.createElement('section');section.className='profile-panel';section.style.cssText='margin-top:16px;padding:16px';
 const heading=document.createElement('h3');heading.textContent='📅 Calendario de recompensas';section.append(heading);
 const navigation=document.createElement('div');navigation.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0';
 const previous=document.createElement('button');previous.type='button';previous.className='outline-btn mini';previous.textContent='← Anterior';
 const monthLabel=document.createElement('strong');monthLabel.setAttribute('aria-live','polite');
 const next=document.createElement('button');next.type='button';next.className='outline-btn mini';next.textContent='Siguiente →';
 navigation.append(previous,monthLabel,next);section.append(navigation);
 const info=document.createElement('p');section.append(info);
 const calendar=document.createElement('div');calendar.style.cssText='display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;text-align:center';section.append(calendar);
 const now=new Date(),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 let year=now.getUTCFullYear(),month=now.getUTCMonth(),request=0;
 const draw=async()=>{
  const current=++request;const first=new Date(Date.UTC(year,month,1)),last=new Date(Date.UTC(year,month+1,0));
  const start=first.toISOString().slice(0,10),end=last.toISOString().slice(0,10);
  monthLabel.textContent=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(first);
  next.disabled=year===now.getUTCFullYear()&&month===now.getUTCMonth();info.textContent='Cargando días reclamados…';calendar.replaceChildren();
  const {data,error}=await sb.from('member_daily_rewards').select('claimed_on,xp,bonus_xp').eq('user_id',userId).gte('claimed_on',start).lte('claimed_on',end).order('claimed_on');
  if(current!==request||!section.isConnected)return;
  if(error){info.textContent='No se pudo cargar el calendario.';return}
  const claimed=new Map((data||[]).map(x=>[x.claimed_on,x]));const count=claimed.size;
  info.textContent='✓ '+count+' días reclamados · '+(data||[]).reduce((n,x)=>n+(x.xp||0)+(x.bonus_xp||0),0)+' XP obtenidos este mes. Fechas en UTC.';
  for(const day of ['L','M','X','J','V','S','D']){const head=document.createElement('strong');head.textContent=day;head.style.padding='6px 0';calendar.append(head)}
  const offset=(first.getUTCDay()+6)%7;for(let n=0;n<offset;n++)calendar.append(document.createElement('span'));
  for(let n=1;n<=last.getUTCDate();n++){
   const date=new Date(Date.UTC(year,month,n)),key=date.toISOString().slice(0,10),entry=claimed.get(key),future=date.getTime()>today;
   const cell=document.createElement('span');cell.textContent=n+(entry?' ✓':'');cell.title=entry?'Reclamado: '+(entry.xp+entry.bonus_xp)+' XP':future?'Día futuro':'Sin reclamar';
   cell.style.cssText='padding:9px 2px;border-radius:9px;border:1px solid #ffffff24;background:'+(entry?'#16865d55':future?'transparent':'#ffffff0b')+';opacity:'+(future?'.45':'1');
   if(date.getTime()===today)cell.style.outline='2px solid #a855f7';calendar.append(cell);
  }
 };
 previous.onclick=()=>{month--;if(month<0){month=11;year--}draw()};
 next.onclick=()=>{if(next.disabled)return;month++;if(month>11){month=0;year++}draw()};
 draw();return section;
}
async function renderMyLevels(){
 const host=document.getElementById('my-levels');if(!host)return;
 const {data:{user}}=await sb.auth.getUser();if(!host.isConnected)return;
 if(!user){host.innerHTML='<p>Inicia sesión para consultar tus logros.</p><a class="gradient-btn" href="#/auth">Entrar</a>';return}
 const {data:serverXP,error:xpError}=await sb.rpc('community_member_xp',{target_member:user.id});if(!host.isConnected)return;
 const result={xp:Number(serverXP)||0,errors:xpError?[xpError]:[]};
 const xp=result.xp,level=levelFromXP(xp),badges=[['🌱 Primer paso',xp>=5],['⭐ Participante',xp>=50],['🔥 Miembro activo',xp>=150],['🏆 Leyenda',xp>=500]];
 host.innerHTML='<h2>🏆 Nivel '+level+'</h2><p>'+xp+' puntos de experiencia (XP)</p><div style="height:12px;border-radius:8px;background:#ffffff22;overflow:hidden"><div style="height:100%;width:'+Math.min(100,Math.round((xp-100*(level-1)**2)/(100*(level**2-(level-1)**2))*100))+'%;background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div><p>Próximo nivel: '+(100*level**2)+' XP</p><h3>Insignias</h3><div id="level-badges" style="display:flex;flex-wrap:wrap;gap:10px"></div><h3>Cómo ganar puntos</h3><p>Publicación +20 · Comentario +10 · Me gusta +2 · Favorito +5 · Voto +15</p>';
 host.append(createRewardPanel(level));
 const {data:bestStreak,error:medalsError}=await sb.rpc('community_streak_medals',{target_member:user.id});if(!medalsError&&bestStreak!==null&&host.isConnected)host.append(createStreakMedalsPanel(Number(bestStreak)||0));
 const daily=document.createElement('section');daily.className='profile-panel';daily.style.cssText='margin-top:16px;padding:16px';daily.innerHTML='<h3>🎁 Recompensa diaria</h3><p>Consigue +10 XP una vez al día (UTC).</p>';
 const claim=document.createElement('button');claim.className='gradient-btn mini';claim.textContent='Reclamar +10 XP';const status=document.createElement('p');status.setAttribute('role','status');
 claim.onclick=async()=>{claim.disabled=true;status.textContent='Comprobando recompensa…';const {data,error}=await sb.rpc('claim_daily_reward');if(error){status.textContent='No se pudo reclamar: '+error.message;claim.disabled=false;return}const outcome=data?.[0];if(outcome?.claimed){status.textContent='🎉 ¡Has recibido 10 XP!'+(outcome.bonus_awarded?' + '+outcome.bonus_awarded+' XP de racha 🔥':'');await renderMyLevels()}else status.textContent='Ya has reclamado la recompensa de hoy. Vuelve mañana (UTC).'};
 daily.append(claim,status);host.append(daily);
 const streakBox=document.createElement('section');streakBox.className='profile-panel';streakBox.style.cssText='margin-top:16px;padding:16px';streakBox.innerHTML='<h3>🔥 Racha diaria</h3><p id="streak-counter">Calculando racha…</p><p>🎯 3 días: +20 XP · 7 días: +50 XP · 30 días: +200 XP</p><p>Reclama cada día antes de que termine el día UTC para mantener tu racha.</p>';host.append(streakBox);
 const {data:days,error:streakError}=await sb.from('member_daily_rewards').select('claimed_on').eq('user_id',user.id).order('claimed_on',{ascending:false}).limit(365);if(streakBox.isConnected){const dates=new Set((days||[]).map(x=>x.claimed_on));let day=new Date();day.setUTCHours(0,0,0,0);if(!dates.has(day.toISOString().slice(0,10)))day.setUTCDate(day.getUTCDate()-1);let streak=0;while(dates.has(day.toISOString().slice(0,10))){streak++;day.setUTCDate(day.getUTCDate()-1)}streakBox.querySelector('#streak-counter').textContent=streakError?'No se pudo consultar la racha.':'🔥 '+streak+' días consecutivos'}
 host.append(createDailyCalendar(user.id));
 const today=new Date().toISOString().slice(0,10);const {data:existing}=await sb.from('member_daily_rewards').select('claimed_on').eq('user_id',user.id).eq('claimed_on',today).limit(1);if(existing?.length){claim.disabled=true;status.textContent='✓ Recompensa de hoy reclamada';}
 const badgesHost=host.querySelector('#level-badges');for(const [name,unlocked] of badges){const span=document.createElement('span');span.textContent=name+(unlocked?' · conseguido':' · bloqueado');span.style.cssText='padding:9px;border:1px solid #ffffff33;border-radius:12px;opacity:'+(unlocked?'1':'.45');badgesHost.append(span)}
 if(result.errors.length){const p=document.createElement('p');p.textContent='Algunas actividades no pudieron contabilizarse. Inténtalo más tarde.';host.append(p)}
}
async function renderLevelRanking(){
 const host=document.getElementById('level-ranking');if(!host)return;
 const {data,error}=await sb.rpc('community_level_ranking');if(!host.isConnected)return;
 if(error){host.textContent='No se pudo cargar la clasificación.';return}
 if(!data?.length){host.textContent='Todavía no hay participantes con puntos.';return}
 host.replaceChildren();const list=document.createElement('ol');
 for(const member of data){const li=document.createElement('li');li.style.cssText='padding:12px;border-bottom:1px solid #ffffff22';const a=document.createElement('a');a.href='#/perfil?id='+encodeURIComponent(member.member_id);a.textContent=member.display_name;li.append(a);li.append(document.createTextNode(' · Nivel '+levelFromXP(Number(member.xp))+' · '+member.xp+' XP'));list.append(li)}host.append(list);
}

async function renderStreakRanking(){
 const host=document.getElementById('streak-ranking');if(!host)return;
 const {data,error}=await sb.rpc('community_streak_ranking');if(!host.isConnected)return;
 if(error){host.textContent='No se pudo cargar la clasificación de rachas.';return}
 if(!data?.length){host.textContent='Aún no hay rachas públicas registradas.';return}
 const list=document.createElement('ol');list.style.cssText='padding-left:25px';
 for(const member of data){
  const li=document.createElement('li');li.style.cssText='padding:12px 4px;border-bottom:1px solid #ffffff22';
  const link=document.createElement('a');link.href='#/perfil?id='+encodeURIComponent(member.member_id);link.textContent=member.display_name;li.append(link);
  const current=Number(member.current_streak)||0,best=Number(member.best_streak)||0;
  const medals=STREAK_MEDALS.filter(m=>best>=m.days).map(m=>m.icon+' '+m.title).join(' · ');
  const detail=document.createElement('div');detail.textContent='🔥 Racha actual: '+current+' días · Récord: '+best+' días'+(medals?' · '+medals:'');li.append(detail);list.append(li);
 }host.replaceChildren(list);
}
