function showMysteryBoxCelebration(rewardName,tier,preview=false){const colors={bronze:'#cd7f32',silver:'#c0c0c0',gold:'#ffd700',diamond:'#67e8f9'};const color=colors[tier]||'#a78bfa';const backdrop=document.createElement('div');backdrop.style.cssText='position:fixed;inset:0;z-index:99999;background:#090b1beF;display:grid;place-items:center;padding:20px;overflow:hidden';backdrop.setAttribute('role','dialog');backdrop.setAttribute('aria-modal','true');backdrop.setAttribute('aria-label','Celebración de regalo');const panel=document.createElement('div');panel.style.cssText='position:relative;z-index:2;max-width:440px;width:100%;padding:30px 20px;text-align:center;background:#171a30;border:2px solid '+color+';border-radius:20px;box-shadow:0 0 50px '+color+'66';const icon=document.createElement('div');icon.textContent='🎊🏆🎁';icon.style.fontSize='48px';const heading=document.createElement('h2');heading.textContent='🎉 ¡Felicidades!';heading.style.color=color;const reward=document.createElement('p');reward.textContent=preview?'✨ Vista previa de Caja '+rewardName:rewardName;reward.style.cssText='font-size:23px;font-weight:bold;overflow-wrap:anywhere';const info=document.createElement('p');info.textContent=preview?'Demostración: no se ha entregado ninguna recompensa.':'¡Has descubierto tu recompensa!';const close=document.createElement('button');close.type='button';close.className='gradient-btn mini';close.textContent='Continuar';close.onclick=()=>backdrop.remove();panel.append(icon,heading,reward,info,close);backdrop.append(panel);for(let k=0;k<45;k++){const piece=document.createElement('span');piece.textContent=k%5===0?'★':'▰';piece.setAttribute('aria-hidden','true');const x=Math.random()*100;piece.style.cssText='position:absolute;left:'+x+'%;top:-10%;color:'+(k%3===0?color:k%3===1?'#fff':'#fbbf24')+';font-size:'+(12+k%4*5)+'px;pointer-events:none;transition:transform '+(2+k%4*.3)+'s linear,opacity 2.8s';backdrop.append(piece);requestAnimationFrame(()=>{piece.style.transform='translateY(110vh) rotate('+(360+k*30)+'deg)';piece.style.opacity='0'})}document.body.append(backdrop);close.focus();backdrop.addEventListener('keydown',e=>{if(e.key==='Escape')close.click()});return backdrop}
function playMysteryBoxSound(tier){try{if(localStorage.getItem('mystery_box_sound')==='off')return;const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return;const ctx=new AudioContextClass();const melodies={bronze:[330,392,440],silver:[523,659,784],gold:[392,587,784,1047],diamond:[523,784,1047,1568,2093]};const notes=melodies[tier]||[440,660,880];const start=ctx.currentTime;notes.forEach((hz,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=tier==='bronze'?'triangle':tier==='diamond'?'sine':'sine';osc.frequency.setValueAtTime(hz,start+i*.11);gain.gain.setValueAtTime(.0001,start+i*.11);gain.gain.exponentialRampToValueAtTime(.09,start+i*.11+.025);gain.gain.exponentialRampToValueAtTime(.0001,start+i*.11+.28);osc.connect(gain);gain.connect(ctx.destination);osc.start(start+i*.11);osc.stop(start+i*.11+.3)});setTimeout(()=>ctx.close().catch(()=>{}),1800)}catch(e){console.warn('Sonido no disponible',e)}}
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
 if(xpError||serverXP===null||!Number.isFinite(Number(serverXP))){
  console.error('No se pudo consultar el XP',xpError||'XP no disponible');
  host.replaceChildren();
  const message=document.createElement('p');message.textContent='No se pudo cargar tu nivel y XP. Revisa tu sesión o inténtalo de nuevo.';
  const retry=document.createElement('button');retry.type='button';retry.className='outline-btn mini';retry.textContent='↻ Reintentar';retry.onclick=()=>{host.textContent='Cargando nivel…';renderMyLevels()};
  host.append(message,retry);return;
 }
 const result={xp:Number(serverXP),errors:[]};
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
 const badgesHost=host.querySelector('#level-badges');if(!badgesHost)return;for(const [name,unlocked] of badges){const span=document.createElement('span');span.textContent=name+(unlocked?' · conseguido':' · bloqueado');span.style.cssText='padding:9px;border:1px solid #ffffff33;border-radius:12px;opacity:'+(unlocked?'1':'.45');badgesHost.append(span)}
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

const COMMUNITY_MISSIONS={daily_post:{name:'📝 Publica en la comunidad',period:'Diaria'},daily_comments:{name:'💬 Escribe 2 comentarios',period:'Diaria'},weekly_votes:{name:'📊 Vota en 3 encuestas',period:'Semanal'},weekly_favorites:{name:'❤️ Guarda 5 favoritos',period:'Semanal'}};
async function renderCommunityMissions(){
 const host=document.getElementById('community-missions');if(!host)return;
 const {data:{user},error:authError}=await sb.auth.getUser();if(!host.isConnected)return;
 if(authError||!user){host.textContent='Inicia sesión para ver tus misiones.';return}
 const {data,error}=await sb.rpc('community_mission_status');if(!host.isConnected)return;
 if(error){host.textContent='No se pudieron cargar las misiones: '+error.message;return}
 host.replaceChildren();const intro=document.createElement('p');intro.textContent='Completa las actividades y reclama XP adicionales. Las misiones diarias se reinician a las 00:00 UTC; las semanales, los lunes a las 00:00 UTC.';host.append(intro);
 for(const mission of data||[]){
  const definition=COMMUNITY_MISSIONS[mission.mission_key];if(!definition)continue;
  const panel=document.createElement('article');panel.className='profile-panel';panel.style.cssText='margin:12px 0;padding:14px;border:1px solid #ffffff2a;border-radius:12px';
  const heading=document.createElement('h3');heading.textContent=definition.name+' · +'+mission.xp_reward+' XP';panel.append(heading);
  const description=document.createElement('p');description.textContent=definition.period+' · '+Math.min(Number(mission.progress),mission.target)+' / '+mission.target+' completados';panel.append(description);
  const progress=document.createElement('progress');progress.max=mission.target;progress.value=Math.min(Number(mission.progress),mission.target);progress.style.width='100%';panel.append(progress);
  const claim=document.createElement('button');claim.className='gradient-btn mini';claim.style.marginTop='10px';claim.textContent=mission.claimed?'✓ Reclamada':Number(mission.progress)>=mission.target?'🎁 Reclamar '+mission.xp_reward+' XP':'🔒 Aún no completada';claim.disabled=mission.claimed||Number(mission.progress)<mission.target;
  const status=document.createElement('p');status.setAttribute('role','status');
  claim.onclick=async()=>{claim.disabled=true;const {data:ok,error:claimError}=await sb.rpc('claim_community_mission',{requested_key:mission.mission_key});if(claimError){status.textContent=claimError.message;claim.disabled=false;return}if(ok){await renderCommunityMissions();await renderMyLevels();await renderLevelRanking()}else{status.textContent='La misión ya fue reclamada o aún no está completada.';await renderCommunityMissions()}};
  panel.append(claim,status);host.append(panel);
 }
}

async function renderRewardChests(){
 const host=document.getElementById('reward-chests');if(!host)return;
 const {data:{user}}=await sb.auth.getUser();if(!host.isConnected)return;
 if(!user){host.textContent='Inicia sesión para abrir cofres.';return}
 const {data,error}=await sb.rpc('community_chest_status');if(!host.isConnected)return;
 if(error){host.textContent='No se pudieron cargar los cofres.';return}
 host.replaceChildren();const intro=document.createElement('p');intro.textContent='Reclama misiones completadas durante la semana para desbloquear cofres. Se reinician cada lunes a las 00:00 UTC.';host.append(intro);
 for(const chest of data||[]){
  const card=document.createElement('article');card.className='profile-panel';card.style.cssText='padding:16px;margin:12px 0;border:1px solid #ffffff33;border-radius:14px';
  const title=document.createElement('h3');title.textContent=(chest.chest_key==='gold'?'👑 Cofre dorado':'🎁 Cofre de bronce')+' · +'+chest.xp_reward+' XP';card.append(title);
  const p=document.createElement('p');p.textContent=Math.min(chest.missions_completed,chest.required_missions)+' / '+chest.required_missions+' misiones reclamadas esta semana';card.append(p);
  const progress=document.createElement('progress');progress.max=chest.required_missions;progress.value=Math.min(chest.missions_completed,chest.required_missions);progress.style.width='100%';card.append(progress);
  const button=document.createElement('button');button.className='gradient-btn mini';button.style.marginTop='10px';button.textContent=chest.claimed?'✓ Cofre abierto':chest.missions_completed>=chest.required_missions?'🎁 Abrir cofre':'🔒 Cofre bloqueado';button.disabled=chest.claimed||chest.missions_completed<chest.required_missions;
  const status=document.createElement('p');status.setAttribute('role','status');
  button.onclick=async()=>{button.disabled=true;const {data:opened,error:openError}=await sb.rpc('claim_community_chest',{requested_key:chest.chest_key});if(openError){status.textContent=openError.message;button.disabled=false;return}if(opened){await renderRewardChests();await renderMyLevels();await renderLevelRanking()}else{status.textContent='El cofre ya se abrió o todavía no cumple los requisitos.';await renderRewardChests()}};
  card.append(button,status);host.append(card);
 }
}

async function renderRewardInventory(){
 const host=document.getElementById('reward-inventory');if(!host)return;
 const {data:{user},error:authError}=await sb.auth.getUser();if(!host.isConnected)return;
 if(authError||!user){host.textContent='Inicia sesión para consultar tu inventario.';return}
 host.textContent='Cargando inventario…';
 const [chests,missions,daily,medals]=await Promise.all([
  sb.from('member_reward_chests').select('chest_key,week_start,xp,claimed_at').eq('user_id',user.id).order('claimed_at',{ascending:false}).limit(100),
  sb.from('member_mission_claims').select('mission_key,period_start,xp,claimed_at').eq('user_id',user.id).order('claimed_at',{ascending:false}).limit(100),
  sb.from('member_daily_rewards').select('claimed_on,xp,bonus_xp').eq('user_id',user.id).order('claimed_on',{ascending:false}).limit(100),
  sb.rpc('community_streak_medals',{target_member:user.id})
 ]);
 if(!host.isConnected)return;
 host.replaceChildren();
 const errors=[chests,missions,daily,medals].filter(r=>r.error);
 if(errors.length){const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent='No se pudieron cargar todos los premios. Actualiza la página para volver a intentarlo.';host.append(warning)}
 const makeSection=(title,items,empty)=>{const section=document.createElement('section');section.className='profile-panel';section.style.cssText='padding:16px;margin:12px 0;border:1px solid #ffffff33;border-radius:14px';const h=document.createElement('h3');h.textContent=title;section.append(h);if(!items.length){const p=document.createElement('p');p.textContent=empty;section.append(p)}else{const list=document.createElement('ul');list.style.cssText='padding-left:22px';for(const item of items){const li=document.createElement('li');li.style.cssText='padding:5px 0';li.textContent=item;list.append(li)}section.append(list)}host.append(section)};
 const earned=STREAK_MEDALS.filter(m=>Number(medals.data||0)>=m.days).map(m=>m.icon+' '+m.title+' · '+m.days+' días');
 makeSection('🏅 Medallas conseguidas',earned,'Todavía no has desbloqueado medallas.');
 const chestNames={bronze:'🎁 Cofre de bronce',gold:'👑 Cofre dorado'};
 makeSection('📦 Cofres abiertos'+((chests.data||[]).length===100?' · últimos 100':''),(chests.data||[]).map(c=>(chestNames[c.chest_key]||'Cofre')+' · +'+c.xp+' XP · Semana del '+c.week_start),'Todavía no has abierto cofres.');
 const missionNames={daily_post:'📝 Publicación diaria',daily_comments:'💬 Comentarios diarios',weekly_votes:'📊 Votos semanales',weekly_favorites:'❤️ Favoritos semanales'};
 makeSection('🎯 Misiones reclamadas'+((missions.data||[]).length===100?' · últimas 100':''),(missions.data||[]).map(m=>(missionNames[m.mission_key]||'Misión')+' · +'+m.xp+' XP · '+m.period_start),'Todavía no has reclamado misiones.');
 const dailyList=(daily.data||[]).map(d=>'🎁 '+d.claimed_on+' · +'+(Number(d.xp)+Number(d.bonus_xp||0))+' XP'+(d.bonus_xp?' (incluye bonus de racha)':''));
 makeSection('📅 Recompensas diarias'+(dailyList.length===100?' · últimas 100':''),dailyList,'Todavía no has reclamado recompensas diarias.');
}

async function renderRewardShop(){
 const host=document.getElementById('reward-shop');if(!host)return;
 const {data:{user}}=await sb.auth.getUser();if(!host.isConnected)return;
 if(!user){host.textContent='Inicia sesión para comprar recompensas.';return}
 const [catalog,owned,equipped,balance,members,gifts,wishes,daily]=await Promise.all([
  sb.from('reward_shop_items').select('id,category,name,description,price,value,sort_order,image_url,required_level,featured,sale_price,sale_starts_at,sale_ends_at,available_from,available_until').eq('active',true).order('sort_order'),
  sb.from('member_shop_purchases').select('item_id,price_paid,purchased_at').eq('user_id',user.id).order('purchased_at',{ascending:false}),
  sb.from('member_shop_equipped').select('category,item_id').eq('user_id',user.id),
  sb.rpc('reward_shop_balance'),
  sb.from('profiles').select('id,display_name,username').eq('is_public',true).neq('id',user.id).order('display_name').limit(100),
  sb.from('member_shop_gifts').select('sender_id,recipient_id,item_id,price_paid,created_at').order('created_at',{ascending:false}).limit(50),
  sb.from('member_shop_wishlist').select('item_id').eq('user_id',user.id),
  sb.from('member_shop_daily_bonuses').select('claimed_on,points').eq('user_id',user.id).order('claimed_on',{ascending:false}).limit(1)
 ]);
 if(!host.isConnected)return;host.replaceChildren();
 if([catalog,owned,equipped,balance,members,gifts,wishes,daily].some(r=>r.error)){host.textContent='No se pudo cargar la tienda. Inténtalo de nuevo.';return}
 const points=document.createElement('h3');points.textContent='🪙 Saldo disponible: '+Number(balance.data||0)+' puntos';host.append(points);
 const note=document.createElement('p');note.textContent='Los puntos disponibles se obtienen de tu XP ganado menos las compras. Comprar no reduce tu nivel ni tu XP acumulado. Cada artículo se compra una sola vez.';host.append(note);
 const dailyPanel=document.createElement('section');dailyPanel.className='shop-v3-panel shop-v3-daily';
 const todayUTC=new Date().toISOString().slice(0,10);
 const claimed=(daily.data||[]).some(entry=>entry.claimed_on===todayUTC);
 const dailyTitle=document.createElement('h3');dailyTitle.textContent='🎁 Recompensa diaria de la tienda';
 const dailyInfo=document.createElement('p');dailyInfo.textContent=claimed?'Ya reclamaste los 15 puntos de hoy. Vuelve mañana (UTC).':'Recibe 15 puntos adicionales una vez al día (UTC) para gastar en artículos.';
 const dailyButton=document.createElement('button');dailyButton.type='button';dailyButton.className='gradient-btn mini';
 dailyButton.textContent=claimed?'✓ Recompensa reclamada':'🪙 Reclamar +15 puntos';dailyButton.disabled=claimed;
 const dailyStatus=document.createElement('p');dailyStatus.setAttribute('role','status');
 dailyButton.onclick=async()=>{
  dailyButton.disabled=true;dailyStatus.textContent='Reclamando recompensa…';
  const {data:ok,error}=await sb.rpc('claim_shop_daily_bonus');
  if(error){dailyStatus.textContent='No se pudo reclamar: '+error.message;dailyButton.disabled=false;return}
  if(ok){await renderRewardShop()}else{dailyInfo.textContent='Ya reclamaste la recompensa de hoy. Vuelve mañana (UTC).';dailyStatus.textContent='Sin puntos duplicados.';dailyButton.textContent='✓ Recompensa reclamada'}
 };
 dailyPanel.append(dailyTitle,dailyInfo,dailyButton,dailyStatus);host.append(dailyPanel);
 const couponPanel=document.createElement('section');couponPanel.className='shop-v3-panel';
 const couponTitle=document.createElement('h3');couponTitle.textContent='🎟️ Cupón de descuento';
 const couponHelp=document.createElement('p');couponHelp.textContent='Introduce tu cupón y pulsa Comprar en el artículo que quieras. Antes de confirmar verás el precio final. Cada cupón se puede usar una vez por miembro; no se aplica a regalos ni cajas.';
 const couponInput=document.createElement('input');couponInput.type='text';couponInput.maxLength=30;couponInput.placeholder='CÓDIGO DEL CUPÓN';couponInput.autocomplete='off';couponInput.setAttribute('aria-label','Código de cupón de la tienda');
 couponPanel.append(couponTitle,couponHelp,couponInput);host.append(couponPanel);
 const recipientLabel=document.createElement('label');recipientLabel.textContent='🎁 Enviar regalo a un miembro público: ';const recipient=document.createElement('select');const blank=document.createElement('option');blank.value='';blank.textContent='Selecciona un miembro';recipient.append(blank);for(const member of members.data||[]){const option=document.createElement('option');option.value=member.id;option.textContent=member.display_name||member.username||'Miembro';recipient.append(option)}recipientLabel.append(recipient);host.append(recipientLabel);const giftHelp=document.createElement('p');giftHelp.textContent='El regalo consume tus puntos y desbloquea el artículo para el destinatario. No se pueden regalar artículos que ya posee.';host.append(giftHelp);
 const mystery=document.createElement('section');mystery.className='profile-panel';mystery.style.cssText='padding:18px;margin:18px 0;border:1px solid #ffffff44;border-radius:14px';const mysteryTitle=document.createElement('h3');mysteryTitle.textContent='🎁 Caja misteriosa · 150 puntos';mystery.append(mysteryTitle);const mysteryInfo=document.createElement('p');mysteryInfo.textContent='Envía una recompensa aleatoria que el destinatario aún no tenga. La sorpresa aparecerá en su buzón de regalos y recibirá una notificación.';mystery.append(mysteryInfo);const mysteryButton=document.createElement('button');mysteryButton.type='button';mysteryButton.className='gradient-btn mini';mysteryButton.textContent='🎲 Enviar regalo sorpresa · 150 puntos';mysteryButton.disabled=Number(balance.data||0)<150||!(members.data||[]).length;const mysteryStatus=document.createElement('p');mysteryStatus.setAttribute('role','status');mysteryButton.onclick=async()=>{if(!recipient.value){mysteryStatus.textContent='Selecciona primero un miembro en el selector de arriba.';return}const who=recipient.options[recipient.selectedIndex].textContent;if(!confirm('¿Enviar una caja misteriosa a '+who+' por 150 puntos?'))return;mysteryButton.disabled=true;mysteryStatus.textContent='Enviando regalo sorpresa…';const {data,error}=await sb.rpc('send_surprise_reward_gift',{target_member:recipient.value});if(error){mysteryStatus.textContent=error.message;mysteryButton.disabled=false;return}mysteryStatus.textContent='🎉 ¡Regalo sorpresa enviado!';await renderRewardShop()};mystery.append(mysteryButton,mysteryStatus);host.append(mystery);
 const {data:boxTiers,error:boxError}=await sb.from('surprise_box_tiers').select('tier,name,price,active').eq('active',true);if(!boxError){const section=document.createElement('section');section.className='profile-panel';section.style.cssText='padding:16px;margin:18px 0';const h=document.createElement('h3');h.textContent='🎁 Cajas misteriosas por niveles';section.append(h);const intro=document.createElement('p');intro.textContent='Selecciona un miembro arriba y elige una caja. Recibirá una recompensa aleatoria de ese nivel que todavía no tenga.';section.append(intro);for(const tier of boxTiers||[]){const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:12px 0';const label=document.createElement('span');label.textContent=tier.name+' · '+tier.price+' puntos';const button=document.createElement('button');button.type='button';button.className='gradient-btn mini';button.textContent='🎲 Enviar '+tier.name;button.disabled=Number(balance.data||0)<tier.price||!(members.data||[]).length;const status=document.createElement('span');status.setAttribute('role','status');button.onclick=async()=>{if(!recipient.value){status.textContent='Selecciona un miembro primero.';return}if(!confirm('¿Enviar '+tier.name+' por '+tier.price+' puntos?'))return;button.disabled=true;status.textContent='Enviando…';const {data,error}=await sb.rpc('send_tier_surprise_gift',{p_tier:tier.tier,target_member:recipient.value});if(error){status.textContent=error.message;button.disabled=false;return}status.textContent='🎉 Regalo enviado';await renderRewardShop()};row.append(label,button,status);section.append(row)}host.append(section)}

 const nowMs=Date.now();
 const onSale=item=>item.sale_price!=null && item.sale_starts_at && item.sale_ends_at &&
  Date.parse(item.sale_starts_at)<=nowMs && nowMs<Date.parse(item.sale_ends_at) && Number(item.sale_price)<Number(item.price);
 const actualPrice=item=>onSale(item)?Number(item.sale_price):Number(item.price);
 const formatPts=value=>Number(value).toLocaleString('es-ES')+' puntos';
 const isAvailable=item=>(!item.available_from||Date.parse(item.available_from)<=nowMs)&&
  (!item.available_until||Date.parse(item.available_until)>nowMs);
 const inventory=(catalog.data||[]).filter(isAvailable);
 const wishlistIds=new Set((wishes.data||[]).map(entry=>entry.item_id));
 const limited=inventory.filter(item=>!!item.available_until);
 if(!limited.length){
  const empty= document.createElement('section');empty.className='shop-v3-panel';
  const title=document.createElement('h3');title.textContent='⏳ Artículos por tiempo limitado';
  const note=document.createElement('p');note.textContent='Ahora mismo no hay recompensas temporales activas. Los artículos especiales aparecerán aquí cuando la administración los programe.';
  empty.append(title,note);host.append(empty);
 }
 if(limited.length){
  const panel=document.createElement('section');panel.className='shop-v3-panel';
  const heading=document.createElement('h3');heading.textContent='⏳ Artículos por tiempo limitado';panel.append(heading);
  const cards=document.createElement('div');cards.className='shop-v2-showcase';
  for(const item of limited){
   const card=document.createElement('article');card.className='shop-v2-promo-card';
   const label=document.createElement('strong');label.textContent='⏰ Edición limitada';
   const title=document.createElement('span');title.textContent=item.name+' · '+formatPts(actualPrice(item));
   const until=document.createElement('small');until.textContent='Disponible hasta: '+new Date(item.available_until).toLocaleString('es-ES');
   card.append(label,title,until);cards.append(card);
  }
  panel.append(cards);host.append(panel);
 }
 const featured=inventory.filter(item=>item.featured);
 if(featured.length){
  const showcase=document.createElement('section');showcase.className='shop-v2-panel';
  const title=document.createElement('h3');title.textContent='🌟 Recompensas destacadas';showcase.append(title);
  const grid=document.createElement('div');grid.className='shop-v2-showcase';
  for(const item of featured){
   const card=document.createElement('article');card.className='shop-v2-promo-card';
   const tag=document.createElement('strong');tag.textContent='✨ Destacado';
   const name=document.createElement('div');name.textContent=item.name;
   const detail=document.createElement('small');detail.textContent=formatPts(actualPrice(item))+(onSale(item)?' · Oferta activa':'');
   card.append(tag,name,detail);grid.append(card);
  }
  showcase.append(grid);host.append(showcase);
 }
 const offers=inventory.filter(onSale);
 if(!offers.length){
  const offerEmpty=document.createElement('section');offerEmpty.className='shop-v2-panel';
  const title=document.createElement('h3');title.textContent='🔥 Ofertas especiales';
  const note=document.createElement('p');note.textContent='No hay descuentos activos en este momento. Pronto podrán aparecer promociones programadas por la administración.';
  offerEmpty.append(title,note);host.append(offerEmpty);
 }
 if(offers.length){
  const showcase=document.createElement('section');showcase.className='shop-v2-panel';
  const title=document.createElement('h3');title.textContent='🔥 Ofertas especiales';showcase.append(title);
  const grid=document.createElement('div');grid.className='shop-v2-showcase';
  for(const item of offers){
   const card=document.createElement('article');card.className='shop-v2-promo-card';
   card.append(document.createTextNode(item.name+' · '));
   const oldPrice=document.createElement('s');oldPrice.textContent=formatPts(item.price);
   const newPrice=document.createElement('strong');newPrice.textContent=' '+formatPts(actualPrice(item));
   const until=document.createElement('small');until.textContent='Hasta '+new Date(item.sale_ends_at).toLocaleString('es-ES');
   card.append(oldPrice,newPrice,until);grid.append(card);
  }
  showcase.append(grid);host.append(showcase);
 }

 const wishesPanel=document.createElement('section');wishesPanel.className='shop-v3-panel';
 const wishesTitle=document.createElement('h3');wishesTitle.textContent='💜 Mi lista de deseos';wishesPanel.append(wishesTitle);
 const wishlistEntries=inventory.filter(item=>wishlistIds.has(item.id));
 if(!wishlistEntries.length){const empty=document.createElement('p');empty.textContent='Guarda con ♡ los artículos que quieras comprar más adelante.';wishesPanel.append(empty)}
 else{
  const grid=document.createElement('div');grid.className='shop-v2-showcase';
  for(const item of wishlistEntries){
   const tile=document.createElement('article');tile.className='shop-v2-promo-card';
   tile.append(document.createTextNode('💜 '+item.name+' · '+formatPts(actualPrice(item))));
   grid.append(tile);
  }
  wishesPanel.append(grid);
 }
 host.append(wishesPanel);
 const ownedIds=new Set((owned.data||[]).map(p=>p.item_id));const active=new Map((equipped.data||[]).map(e=>[e.category,e.item_id]));
 const categories={anime_theme:'🌸 Recompensas anime exclusivas',frame:'🖼️ Marcos para avatares',badge:'🏷️ Insignias',color:'🌈 Colores de nombre',title:'👑 Títulos especiales'};
 for(const [category,label] of Object.entries(categories)){
  const group=document.createElement('section');group.style.margin='20px 0';const heading=document.createElement('h3');heading.textContent=label;group.append(heading);
  const grouped=inventory.filter(x=>x.category===category);if(!grouped.length)continue;
  for(const item of grouped){
   const card=document.createElement('article');card.className='profile-panel';card.style.cssText='padding:14px;margin:10px 0;border:1px solid #ffffff33;border-radius:12px';
   card.classList.add('shop-v2-reward');
   if(item.featured){const flag=document.createElement('span');flag.className='shop-v2-flag';flag.textContent='🌟 Destacado';card.append(flag)}
   if(item.available_until){const limitedTag=document.createElement('span');limitedTag.className='shop-v2-flag shop-v3-limited-tag';limitedTag.textContent='⏳ Hasta '+new Date(item.available_until).toLocaleDateString('es-ES');card.append(limitedTag)}
   const name=document.createElement('h4');name.textContent=item.name+' · '+formatPts(actualPrice(item));card.append(name);
   if(onSale(item)){
    const sale=document.createElement('p');sale.className='shop-v2-sale';
    sale.textContent='🔥 Oferta especial · Antes: '+formatPts(item.price)+' · Ahorra '+formatPts(Number(item.price)-actualPrice(item));
    card.append(sale);
   }
   if(category==='anime_theme'){
    const level=document.createElement('p');level.className='shop-v2-level';level.textContent='🎮 Tema anime para videollamadas · Nivel mínimo: '+Number(item.required_level||1);card.append(level)
   }
   const description=document.createElement('p');description.textContent=item.description;card.append(description);if(item.image_url&&/^https:\/\//.test(item.image_url)){const img=document.createElement('img');img.src=item.image_url;img.alt='Imagen de '+item.name;img.loading='lazy';img.style.cssText='width:100px;height:100px;object-fit:cover;border-radius:12px;display:block;margin:8px 0';card.append(img)}
   const bought=ownedIds.has(item.id),isEquipped=active.get(category)===item.id;
   const priceNow=actualPrice(item);
   const animeTheme=category==='anime_theme';
   const button=document.createElement('button');button.className='gradient-btn mini';
   button.textContent=bought?(animeTheme?'✓ Desbloqueado':isEquipped?'✓ Equipado':'Equipar'):'Comprar · '+formatPts(priceNow);
   button.disabled=(animeTheme&&bought)||isEquipped||(!bought&&Number(balance.data||0)<priceNow);
   const status=document.createElement('p');status.setAttribute('role','status');
   button.onclick=async()=>{
    if(button.disabled)return;
    const couponCode=couponInput.value.trim().toUpperCase();
    if(!bought&&couponCode){
     button.disabled=true;status.textContent='Validando cupón…';
     const {data:quote,error:previewError}=await sb.rpc('preview_shop_coupon',{requested_item:item.id,coupon_code:couponCode});
     if(previewError){status.textContent='Cupón: '+previewError.message;button.disabled=false;return}
     if(!confirm('¿Comprar '+item.name+' con '+couponCode+' por '+Number(quote.price).toLocaleString('es-ES')+' puntos? (Ahorro: '+Number(quote.discount).toLocaleString('es-ES')+' puntos)')){
      status.textContent='Compra cancelada';button.disabled=false;return
     }
     const {data:ok,error}=await sb.rpc('buy_reward_shop_item_with_coupon',{requested_item:item.id,coupon_code:couponCode});
     if(error){status.textContent='No se pudo canjear: '+error.message;button.disabled=false;return}
     if(ok){await renderRewardShop()}else{status.textContent='Ya posees este artículo.';button.disabled=false}
     return;
    }
    button.disabled=true;
    const {data:ok,error}=bought&&!animeTheme?await sb.rpc('equip_reward_shop_item',{requested_item:item.id}):await sb.rpc('buy_reward_shop_item',{requested_item:item.id});
    if(error){status.textContent=error.message;button.disabled=false;return}
    if(ok){await renderRewardShop()}else{status.textContent='La operación no se pudo completar.';button.disabled=false}
   };
   card.append(button,status);const gift=document.createElement('button');gift.type='button';gift.className='outline-btn mini';gift.textContent='🎁 Regalar · '+formatPts(priceNow);gift.disabled=Number(balance.data||0)<priceNow||!(members.data||[]).length;gift.style.marginLeft='8px';gift.onclick=async()=>{if(!recipient.value){status.textContent='Selecciona primero un miembro para recibir el regalo.';return}const who=recipient.options[recipient.selectedIndex].textContent;if(!confirm('¿Enviar '+item.name+' a '+who+' por '+formatPts(priceNow)+'?'))return;gift.disabled=true;const {data:ok,error}=await sb.rpc('send_reward_shop_gift',{requested_item:item.id,target_member:recipient.value});if(error){status.textContent=error.message;gift.disabled=false;return}if(ok){await renderRewardShop()}else{status.textContent='Ese miembro ya tiene el artículo.';gift.disabled=false}};card.append(gift);
   const wishButton=document.createElement('button');wishButton.type='button';wishButton.className='outline-btn mini shop-v3-wish';
   wishButton.textContent=wishlistIds.has(item.id)?'💜 En mi lista':'♡ Añadir a deseos';
   wishButton.setAttribute('aria-pressed',String(wishlistIds.has(item.id)));
   wishButton.onclick=async()=>{
    wishButton.disabled=true;
    const present=wishlistIds.has(item.id);
    const operation=present?sb.from('member_shop_wishlist').delete().eq('user_id',user.id).eq('item_id',item.id):
     sb.from('member_shop_wishlist').insert({user_id:user.id,item_id:item.id});
    const {error}=await operation;
    if(error){status.textContent='No se pudo actualizar la lista: '+error.message;wishButton.disabled=false;return}
    await renderRewardShop();
   };
   card.append(wishButton);group.append(card);
  }

  host.append(group);
 }
 const purchaseHistory=document.createElement('section');purchaseHistory.className='shop-v2-panel';
 const purchaseTitle=document.createElement('h3');purchaseTitle.textContent='🧾 Mi historial de compras';purchaseHistory.append(purchaseTitle);
 const purchaseRows=owned.data||[];
 const purchaseTotal=purchaseRows.reduce((sum,row)=>sum+Number(row.price_paid||0),0);
 const summary=document.createElement('p');summary.textContent=purchaseRows.length+' compras · '+formatPts(purchaseTotal)+' gastados';purchaseHistory.append(summary);
 const purchasedItems=new Map(inventory.map(item=>[item.id,item]));
 const historyList=document.createElement('div');historyList.className='shop-v2-purchases';
 if(!purchaseRows.length){
  const empty=document.createElement('p');empty.textContent='Todavía no has comprado artículos.';historyList.append(empty)
 }else{
  for(const entry of purchaseRows.slice(0,100)){
   const row=document.createElement('div');row.className='shop-v2-purchase-row';
   const item=purchasedItems.get(entry.item_id);
   const detail=document.createElement('strong');detail.textContent=item?.name||entry.item_id;
   const date=document.createElement('span');date.textContent=new Date(entry.purchased_at).toLocaleString('es-ES');
   const paid=document.createElement('span');paid.textContent=entry.price_paid===0?'🎁 Regalo recibido':formatPts(entry.price_paid);
   row.append(detail,date,paid);historyList.append(row);
  }
 }
 purchaseHistory.append(historyList);host.append(purchaseHistory);
 const history=document.createElement('section');history.className='profile-panel';history.style.cssText='padding:16px;margin:20px 0';const historyTitle=document.createElement('h3');historyTitle.textContent='📜 Historial de regalos';history.append(historyTitle);const names=new Map((members.data||[]).map(m=>[m.id,m.display_name||m.username||'Miembro']));const itemNames=new Map((catalog.data||[]).map(i=>[i.id,i.name]));if(!(gifts.data||[]).length){const p=document.createElement('p');p.textContent='Todavía no hay regalos enviados o recibidos.';history.append(p)}for(const entry of gifts.data||[]){const p=document.createElement('p');const sent=entry.sender_id===user.id;p.textContent=(sent?'📤 Enviado a '+(names.get(entry.recipient_id)||'Miembro'):'📥 Recibido')+' · '+(itemNames.get(entry.item_id)||entry.item_id)+' · '+new Date(entry.created_at).toLocaleDateString('es-ES')+(sent?' · '+entry.price_paid+' puntos':'');history.append(p)}host.append(history);
}

async function renderGiftMailbox(){
 const root=document.getElementById('gift-mailbox');if(!root)return;
 const {data:{user},error:authError}=await sb.auth.getUser();if(!root.isConnected)return;
 if(authError||!user){root.innerHTML='<p>Inicia sesión para ver tus regalos.</p><a class="gradient-btn mini" href="#/auth">Iniciar sesión</a>';return}
 const [gifts,owned,equipped]=await Promise.all([
  sb.from('member_shop_gifts').select('id,sender_id,item_id,created_at,opened_at,box_tier').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(100),
  sb.from('member_shop_purchases').select('item_id').eq('user_id',user.id),
  sb.from('member_shop_equipped').select('category,item_id').eq('user_id',user.id)
 ]);
 if(!root.isConnected)return;root.replaceChildren();
 if([gifts,owned,equipped].some(x=>x.error)){root.textContent='No se pudo cargar el buzón de regalos. Inténtalo de nuevo.';return}
 const rows=gifts.data||[];
 const legendPanel=document.createElement('div');legendPanel.style.cssText='padding:14px;margin:12px 0;border:1px solid #fbbf24;border-radius:12px';legendPanel.textContent='🌟 Campeón Legendario · Cargando progreso…';root.append(legendPanel);sb.rpc('my_legendary_box_champion').then(legendResponse=>{if(root.isConnected){if(legendResponse.error){legendPanel.textContent='No se pudo consultar el logro Campeón Legendario.'}else{const legend=legendResponse.data?.[0];const victories=Number(legend?.gold_wins||0);legendPanel.textContent=(legend?.unlocked?'🌟 Insignia desbloqueada: Campeón Legendario':'🔒 Campeón Legendario · '+Math.min(victories,3)+'/3 primeros puestos mensuales')+' · '+victories+' campeonato(s) de oro';}}});const monthlySection=document.createElement('section');monthlySection.className='profile-panel';monthlySection.style.cssText='padding:18px;margin:18px 0;border:2px solid #fbbf24;border-radius:14px;background:#fbbf240d';const monthlyHeading=document.createElement('h4');monthlyHeading.textContent='📅 Clasificación mensual de cajas misteriosas · '+new Date().toLocaleDateString('es-ES',{month:'long',year:'numeric',timeZone:'UTC'});const monthlyList=document.createElement('div');monthlyList.textContent='Cargando clasificación mensual…';monthlySection.append(monthlyHeading,monthlyList);root.append(monthlySection);const monthlyResult=await sb.rpc('mystery_box_monthly_leaderboard');if(root.isConnected){monthlyList.replaceChildren();if(monthlyResult.error){monthlyList.textContent='No se pudo cargar la clasificación mensual.'}else if(!(monthlyResult.data||[]).length){monthlyList.textContent='Aún no se han abierto cajas este mes.'}else{for(const [position,member] of monthlyResult.data.entries()){const entry=document.createElement('div');entry.style.cssText='display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px solid #ffffff22';const rank=document.createElement('strong');rank.textContent=['🥇','🥈','🥉'][position]||String(position+1)+'.';rank.style.minWidth='34px';const name=document.createElement('span');name.style.flex='1';name.textContent=member.member_name+(member.member_id===user.id?' (Tú)':'');const total=document.createElement('strong');total.textContent=member.boxes_opened+' 📦';entry.append(rank,name,total);monthlyList.append(entry)}}}const fame=document.createElement('section');fame.className='profile-panel';fame.style.cssText='padding:18px;margin:18px 0;border:2px solid #fbbf24;border-radius:14px;background:#fbbf240d';const fameTitle=document.createElement('h3');fameTitle.textContent='🏆 Salón de la Fama · Reyes de las Cajas';const fameDescription=document.createElement('p');fameDescription.textContent='Miembros con más primeros puestos mensuales. Cada medalla de oro representa un mes ganado.';const fameList=document.createElement('div');fameList.textContent='Cargando Salón de la Fama…';fame.append(fameTitle,fameDescription,fameList);root.append(fame);const fameResponse=await sb.rpc('mystery_box_hall_of_fame');if(root.isConnected){fameList.replaceChildren();if(fameResponse.error){fameList.textContent='No se pudo cargar el Salón de la Fama.'}else if(!(fameResponse.data||[]).length){fameList.textContent='Todavía no hay campeones mensuales. El Salón de la Fama se completará después de la primera entrega de premios.'}else{for(const [index,champion] of fameResponse.data.entries()){const entry=document.createElement('div');entry.style.cssText='display:flex;gap:12px;align-items:center;padding:12px;margin:8px 0;border:1px solid #ffffff33;border-radius:10px';const rank=document.createElement('strong');rank.textContent=['🥇','🥈','🥉'][index]||String(index+1)+'.';rank.style.minWidth='32px';const name=document.createElement('span');name.style.flex='1';name.textContent=champion.member_name+(champion.member_id===user.id?' (Tú)':'');const wins=document.createElement('strong');wins.textContent=champion.gold_wins+' 🏆'+(Number(champion.gold_wins)>=3?' · 🌟 Campeón Legendario':'');entry.append(rank,name,wins);fameList.append(entry)}}}const winnersHistory=document.createElement('section');winnersHistory.className='profile-panel';winnersHistory.style.cssText='padding:18px;margin:18px 0;border:1px solid #ffffff33;border-radius:14px';const winnersTitle=document.createElement('h3');winnersTitle.textContent='🏅 Historial de ganadores mensuales';const winnersContent=document.createElement('div');winnersContent.textContent='Cargando ganadores…';winnersHistory.append(winnersTitle,winnersContent);root.append(winnersHistory);const winnersResponse=await sb.rpc('mystery_box_winners_history');if(root.isConnected){winnersContent.replaceChildren();if(winnersResponse.error){winnersContent.textContent='No se pudo cargar el historial de ganadores.'}else if(!(winnersResponse.data||[]).length){winnersContent.textContent='Todavía no hay ganadores mensuales. Los primeros premios se entregarán al finalizar noviembre de 2026.'}else{const grouped=new Map();for(const winner of winnersResponse.data){const month=winner.month_start;if(!grouped.has(month))grouped.set(month,[]);grouped.get(month).push(winner)}for(const [month,winners] of grouped){const group=document.createElement('div');group.style.cssText='margin:14px 0;padding:12px;border:1px solid #ffffff22;border-radius:12px';const monthTitle=document.createElement('h4');monthTitle.textContent='📅 '+new Date(month+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC',month:'long',year:'numeric'});group.append(monthTitle);for(const winner of winners){const row=document.createElement('p');row.style.cssText='margin:8px 0;line-height:1.5';row.textContent=(['🥇','🥈','🥉'][winner.rank_position-1]||'🏆')+' '+winner.member_name+' · '+winner.badge+' · +'+winner.points+' puntos · '+winner.boxes_opened+' cajas';group.append(row)}winnersContent.append(group)}}}const leaderboard=document.createElement('section');leaderboard.className='profile-panel';leaderboard.style.cssText='padding:16px;margin:18px 0;border:1px solid #ffffff33;border-radius:14px';const rankingTitle=document.createElement('h3');rankingTitle.textContent='🏆 Ranking de cajas misteriosas';const rankingList=document.createElement('div');rankingList.textContent='Cargando clasificación…';leaderboard.append(rankingTitle,rankingList);root.append(leaderboard);const prizeInfo=document.createElement('p');prizeInfo.textContent='🎖️ Premios mensuales: 🥇 +100 puntos · Rey de las Cajas | 🥈 +50 puntos · Maestro de Sorpresas | 🥉 +25 puntos · Cazador de Tesoros. Se entregan al cerrar cada mes (UTC), una sola vez por puesto.';prizeInfo.style.cssText='font-size:14px;line-height:1.6';leaderboard.insertBefore(prizeInfo,rankingList);const countdown=document.createElement('p');countdown.setAttribute('role','timer');countdown.style.cssText='font-weight:700;font-variant-numeric:tabular-nums;padding:10px 12px;border:1px solid #ffffff33;border-radius:10px';leaderboard.insertBefore(countdown,rankingList);function updateRankingCountdown(){if(!countdown.isConnected)return;const now=new Date();const next=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1,0,5,0));let seconds=Math.max(0,Math.ceil((next.getTime()-now.getTime())/1000));const days=Math.floor(seconds/86400);seconds%=86400;const hours=Math.floor(seconds/3600);seconds%=3600;const minutes=Math.floor(seconds/60);const secs=seconds%60;countdown.textContent='⏳ Próxima entrega de premios: '+days+'d '+String(hours).padStart(2,'0')+'h '+String(minutes).padStart(2,'0')+'m '+String(secs).padStart(2,'0')+'s · '+next.toLocaleDateString('es-ES',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'})+' (00:05 UTC)'}updateRankingCountdown();const countdownInterval=setInterval(()=>{if(!countdown.isConnected){clearInterval(countdownInterval);return}updateRankingCountdown()},1000);const myAwards=document.createElement('div');myAwards.style.cssText='margin-top:14px';leaderboard.append(myAwards);const awardsResponse=await sb.rpc('my_mystery_box_monthly_awards');if(root.isConnected){if(awardsResponse.error){myAwards.textContent='No se pudieron consultar tus premios mensuales.'}else if((awardsResponse.data||[]).length){const heading=document.createElement('h4');heading.textContent='🎖️ Mis premios mensuales';myAwards.append(heading);for(const award of awardsResponse.data){const item=document.createElement('p');item.textContent=(['🥇','🥈','🥉'][award.rank_position-1]||'🏆')+' '+award.badge+' · +'+award.points+' puntos · '+award.month_start+' · '+award.boxes_opened+' cajas';myAwards.append(item)}}else{myAwards.textContent='Los premios mensuales aparecerán aquí después del primer cierre de mes.'}}const rankingResult=await sb.rpc('mystery_box_leaderboard');if(root.isConnected){rankingList.replaceChildren();if(rankingResult.error){rankingList.textContent='No se pudo cargar el ranking.'}else if(!(rankingResult.data||[]).length){rankingList.textContent='Todavía no hay cajas abiertas por miembros con perfil público.'}else{for(const [position,member] of rankingResult.data.entries()){const entry=document.createElement('div');entry.style.cssText='display:flex;align-items:center;gap:12px;padding:10px;margin:8px 0;border:1px solid #ffffff22;border-radius:10px';const medal=document.createElement('strong');medal.style.cssText='font-size:23px;min-width:35px';medal.textContent=['🥇','🥈','🥉'][position]||String(position+1)+'.';const name=document.createElement('span');name.style.flex='1';name.textContent=member.member_name+(member.member_id===user.id?' (Tú)':'');const total=document.createElement('strong');total.textContent=member.boxes_opened+' 📦';entry.append(medal,name,total);rankingList.append(entry)}}}
if(!rows.length){const empty=document.createElement('p');empty.textContent='Todavía no has recibido regalos. Cuando alguien te envíe uno, aparecerá aquí.';root.append(empty);return}
 const [items,senders]=await Promise.all([
  sb.from('reward_shop_items').select('id,name,category,description,image_url').in('id',[...new Set(rows.map(g=>g.item_id))]),
  sb.from('profiles').select('id,display_name,username').in('id',[...new Set(rows.map(g=>g.sender_id))]).eq('is_public',true)
 ]);
 const catalog=new Map((items.data||[]).map(x=>[x.id,x]));
 const names=new Map((senders.data||[]).map(x=>[x.id,x.display_name||x.username||'Miembro']));
 const ownedIds=new Set((owned.data||[]).map(x=>x.item_id));
 const equippedMap=new Map((equipped.data||[]).map(x=>[x.category,x.item_id]));
 const count=document.createElement('p');count.textContent='🎁 '+rows.length+' regalo(s) recibido(s)'+(rows.length===100?' · últimos 100':'');root.append(count);const openedBoxes=rows.filter(g=>g.opened_at&&g.box_tier);const history=document.createElement('section');history.className='profile-panel';history.style.cssText='padding:16px;margin:18px 0;border:1px solid #ffffff33;border-radius:14px';const historyHeading=document.createElement('h3');historyHeading.textContent='📜 Historial de cajas abiertas';const historySummary=document.createElement('p');historySummary.textContent=openedBoxes.length+' caja(s) abiertas'+(rows.length===100?' · se muestran los últimos 100 regalos':'');history.append(historyHeading,historySummary);const stats=document.createElement('div');stats.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:10px;margin:14px 0';const statEntries=[['🎁 Total',openedBoxes.length],['🥉 Bronce',openedBoxes.filter(g=>g.box_tier==='bronze').length],['🥈 Plata',openedBoxes.filter(g=>g.box_tier==='silver').length],['🥇 Oro',openedBoxes.filter(g=>g.box_tier==='gold').length],['💎 Diamante',openedBoxes.filter(g=>g.box_tier==='diamond').length]];for(const [label,value] of statEntries){const stat=document.createElement('div');stat.style.cssText='padding:12px;border:1px solid #ffffff33;border-radius:12px;text-align:center;background:#ffffff08';const number=document.createElement('strong');number.textContent=String(value);number.style.cssText='font-size:25px;display:block';const caption=document.createElement('span');caption.textContent=label;stat.append(number,caption);stats.append(stat)}history.append(stats);const milestones=[{count:1,icon:'🎁',name:'Primer misterio',points:10},{count:5,icon:'🥉',name:'Explorador de cajas',points:25},{count:10,icon:'🥇',name:'Coleccionista de sorpresas',points:50},{count:25,icon:'🏆',name:'Maestro de cajas',points:100}];const achievements=document.createElement('section');achievements.style.cssText='margin:18px 0';const achievementsTitle=document.createElement('h4');achievementsTitle.textContent='🏆 Logros por abrir cajas';achievements.append(achievementsTitle);const achievementGrid=document.createElement('div');achievementGrid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px';for(const milestone of milestones){const unlocked=openedBoxes.length>=milestone.count;const tile=document.createElement('div');tile.style.cssText='padding:12px;border:1px solid '+(unlocked?'#fbbf24':'#ffffff33')+';border-radius:12px;text-align:center;opacity:'+(unlocked?'1':'.65');const symbol=document.createElement('div');symbol.textContent=unlocked?milestone.icon:'🔒';symbol.style.fontSize='30px';const name=document.createElement('strong');name.textContent=milestone.name;name.style.display='block';const detail=document.createElement('small');detail.textContent=unlocked?'✓ Desbloqueado · +'+milestone.points+' puntos':'+'+milestone.points+' puntos · '+Math.min(openedBoxes.length,milestone.count)+'/'+milestone.count+' cajas';tile.append(symbol,name,detail);achievementGrid.append(tile)}achievements.append(achievementGrid);history.append(achievements);const historyFilters=document.createElement('div');historyFilters.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0';const historyList=document.createElement('div');const tierLabels={bronze:'🥉 Bronce',silver:'🥈 Plata',gold:'🥇 Oro',diamond:'💎 Diamante'};const filters=[['all','Todas'],['bronze','🥉 Bronce'],['silver','🥈 Plata'],['gold','🥇 Oro'],['diamond','💎 Diamante']];const filterButtons=[];function showBoxHistory(filter){historyList.replaceChildren();const selected=openedBoxes.filter(g=>filter==='all'||g.box_tier===filter);filterButtons.forEach(({key,button})=>button.setAttribute('aria-pressed',String(key===filter)));if(!selected.length){const empty=document.createElement('p');empty.textContent='No hay cajas abiertas en esta categoría.';historyList.append(empty);return}for(const gift of selected){const entry=document.createElement('article');entry.style.cssText='padding:12px;margin:8px 0;border:1px solid #ffffff22;border-radius:10px';const item=catalog.get(gift.item_id);const name=document.createElement('strong');name.textContent=(tierLabels[gift.box_tier]||'🎁 Caja')+' · '+(item?.name||'Recompensa');const detail=document.createElement('p');detail.textContent='Abierta: '+new Date(gift.opened_at).toLocaleString('es-ES')+' · De: '+(names.get(gift.sender_id)||'Un miembro');detail.style.margin='6px 0 0';entry.append(name,detail);historyList.append(entry)}}for(const [key,label] of filters){const button=document.createElement('button');button.type='button';button.className='outline-btn mini';button.textContent=label;button.onclick=()=>showBoxHistory(key);historyFilters.append(button);filterButtons.push({key,button})}history.append(historyFilters,historyList);showBoxHistory('all');root.append(history);

 for(const gift of rows){
  const item=catalog.get(gift.item_id);const card=document.createElement('article');card.className='profile-panel';card.style.cssText='padding:16px;margin:12px 0;border:1px solid #ffffff33;border-radius:14px';
  if(!gift.opened_at){const title=document.createElement('h3');title.textContent='🎁 ¡Tienes un regalo por descubrir!';card.append(title);const from=document.createElement('p');from.textContent='Enviado por '+(names.get(gift.sender_id)||'Un miembro')+' · '+new Date(gift.created_at).toLocaleString('es-ES');card.append(from);const box=document.createElement('div');const themes={bronze:{emoji:'🥉',color:'#cd7f32',particles:'✦'},silver:{emoji:'🥈',color:'#c0c0c0',particles:'✧'},gold:{emoji:'🥇',color:'#ffd700',particles:'★'},diamond:{emoji:'💎',color:'#67e8f9',particles:'💎'}};const theme=themes[gift.box_tier]||{emoji:'🎁',color:'#a78bfa',particles:'✨'};box.textContent=theme.emoji;box.setAttribute('aria-hidden','true');box.style.cssText='font-size:76px;text-align:center;transition:transform .5s ease,opacity .5s ease;transform-origin:center;';card.append(box);const open=document.createElement('button');open.type='button';open.className='gradient-btn mini';open.textContent='✨ Abrir regalo';const status=document.createElement('p');status.setAttribute('role','status');open.onclick=async()=>{open.disabled=true;status.textContent='Abriendo tu sorpresa…';const {error}=await sb.rpc('open_member_shop_gift',{p_gift_id:gift.id});if(error){status.textContent='No se pudo abrir: '+error.message;open.disabled=false;return}for(let remaining=3;remaining>=1;remaining--){status.textContent='🎁 Revelando en '+remaining+'…';box.style.transform='scale('+(1+(4-remaining)*.08)+')';await new Promise(resolve=>setTimeout(resolve,1000));if(!root.isConnected)return}status.textContent='✨ ¡Abriendo regalo!';playMysteryBoxSound(gift.box_tier);box.style.transform='scale(1.5) rotate(15deg)';box.style.opacity='0';const fireworks=document.createElement('div');fireworks.setAttribute('aria-hidden','true');fireworks.style.cssText='position:relative;height:85px;overflow:hidden;pointer-events:none';for(let k=0;k<16;k++){const p=document.createElement('span');p.textContent=theme.particles;p.style.cssText='position:absolute;left:50%;top:40%;color:'+theme.color+';font-size:'+(14+k%4*6)+'px;transition:transform .9s ease-out,opacity .9s ease';fireworks.append(p);requestAnimationFrame(()=>{const angle=k*Math.PI/8;p.style.transform='translate('+Math.round(Math.cos(angle)*110)+'px,'+Math.round(Math.sin(angle)*42)+'px) rotate('+(k*25)+'deg)';p.style.opacity='0'})}card.insertBefore(fireworks,status);card.style.boxShadow='0 0 28px '+theme.color+'66';status.textContent='🎉 ¡Sorpresa! '+(item?.name||'Has recibido una recompensa');open.textContent='🎉 Regalo abierto';setTimeout(()=>{if(root.isConnected){renderGiftMailbox();showMysteryBoxCelebration(item?.name||'Recompensa sorpresa',gift.box_tier)}},1100)};card.append(open,status);root.append(card);continue}
  const title=document.createElement('h3');title.textContent='🎉 '+(item?.name||'Recompensa recibida');card.append(title);
  const info=document.createElement('p');info.textContent='Enviado por '+(names.get(gift.sender_id)||'Un miembro')+' · '+new Date(gift.created_at).toLocaleString('es-ES');card.append(info);
  if(item?.description){const desc=document.createElement('p');desc.textContent=item.description;card.append(desc)}
  if(item?.image_url&&/^https:\/\//i.test(item.image_url)){const img=document.createElement('img');img.src=item.image_url;img.alt='Imagen de '+item.name;img.loading='lazy';img.style.cssText='width:110px;height:110px;object-fit:cover;border-radius:12px;display:block;margin:10px 0';card.append(img)}
  const status=document.createElement('p');status.setAttribute('role','status');
  if(item&&ownedIds.has(item.id)){
   const button=document.createElement('button');button.type='button';button.className='gradient-btn mini';
   const active=equippedMap.get(item.category)===item.id;button.textContent=active?'✓ Equipado':'✨ Equipar regalo';button.disabled=active;
   button.onclick=async()=>{button.disabled=true;status.textContent='Equipando…';const {data:ok,error}=await sb.rpc('equip_reward_shop_item',{requested_item:item.id});if(error||!ok){status.textContent=error?.message||'No se pudo equipar el regalo';button.disabled=false;return}await renderGiftMailbox()};
   card.append(button);
  }else{status.textContent='Este artículo no está disponible para equipar.'}
  card.append(status);root.append(card);
 }
}
