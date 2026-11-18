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
async function renderMyLevels(){
 const host=document.getElementById('my-levels');if(!host)return;
 const {data:{user}}=await sb.auth.getUser();if(!host.isConnected)return;
 if(!user){host.innerHTML='<p>Inicia sesión para consultar tus logros.</p><a class="gradient-btn" href="#/auth">Entrar</a>';return}
 const result=await memberXP(user.id);if(!host.isConnected)return;
 const xp=result.xp,level=levelFromXP(xp),badges=[['🌱 Primer paso',xp>=5],['⭐ Participante',xp>=50],['🔥 Miembro activo',xp>=150],['🏆 Leyenda',xp>=500]];
 host.innerHTML='<h2>🏆 Nivel '+level+'</h2><p>'+xp+' puntos de experiencia (XP)</p><div style="height:12px;border-radius:8px;background:#ffffff22;overflow:hidden"><div style="height:100%;width:'+Math.min(100,Math.round((xp-100*(level-1)**2)/(100*(level**2-(level-1)**2))*100))+'%;background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div><p>Próximo nivel: '+(100*level**2)+' XP</p><h3>Insignias</h3><div id="level-badges" style="display:flex;flex-wrap:wrap;gap:10px"></div><h3>Cómo ganar puntos</h3><p>Publicación +20 · Comentario +10 · Me gusta +2 · Favorito +5 · Voto +15</p>';
 host.append(createRewardPanel(level));
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
