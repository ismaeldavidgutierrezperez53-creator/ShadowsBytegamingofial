/* Shadow Universe 2.0 — balanced guild wars. */
window.SBGuildWars=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Leader required':'Solo el líder puede desafiar.','Invalid opponent':'Gremio rival no disponible.','Guild busy or weekly limit':'Uno de los gremios tiene una guerra pendiente, activa o ya participó esta semana.','Challenge unavailable':'El desafío ya no está disponible.','Defender leader required':'Solo el líder rival puede responder.','No eligible balanced teams':'No hay suficientes integrantes exclusivos y habilitados para formar equipos iguales.','War not active':'Esta guerra no está activa.','Not on roster':'No estás en la alineación habilitada.','Attack limit reached':'Has usado tus tres ataques.','Wait 60 seconds':'Espera 60 segundos entre ataques.'};
const friendly=e=>errors[e.message]||e.message||'Error de conexión';
const panel=()=>{const n=el('section');n.style.cssText='padding:14px;margin:12px 0;border:1px solid #a855f777;border-radius:14px;overflow-wrap:anywhere';return n};
const dateFmt=v=>new Date(v).toLocaleString('es-ES');
const seasonKey=d=>d.toISOString().slice(0,7)+'-01';
const states={pending:'Pendiente',active:'En guerra',finished:'Finalizada',declined:'Rechazada',expired:'Caducada'};
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','⚔️ Guerras de gremios'),el('p','Desafíos entre líderes. Equipos del mismo tamaño (máximo 10), 48 horas de combate, tres ataques por participante y un enfrentamiento aceptado por gremio cada semana UTC.'));
 const status=el('p','Cargando guerras…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const control=el('div'),challenge=el('div'),rank=panel(),list=el('div');
 host.append(status,control,challenge,rank,list);
 let guilds=[],own=null,mine=new Set(),roster={},wars=[],busy=false,loading=false,rankVersion=0;
 const season=el('input');season.type='month';season.value=seasonKey(new Date()).slice(0,7);season.setAttribute('aria-label','Temporada del ranking');
 const rankRows=el('div');rank.append(el('h3','🏆 Clasificación mensual'),season,btn('Consultar temporada',loadRank),rankRows);season.onchange=loadRank;
 async function loadRank(){const seq=++rankVersion;if(!/^\d{4}-\d{2}$/.test(season.value)){rankRows.textContent='Selecciona un mes.';return}try{const rows=check(await sb.rpc('sb_war_ranking',{requested_season:season.value+'-01'}))||[];if(seq!==rankVersion||!host.isConnected)return;rankRows.replaceChildren();const ol=el('ol');for(const r of rows)ol.append(el('li',r.guild_name+' · '+r.points+' puntos · '+r.wins+' V / '+r.draws+' E / '+r.losses+' D'));rankRows.append(rows.length?ol:el('p','Todavía no hay resultados de esta temporada.'));rankRows.append(el('small','Victoria: 3 puntos · Empate con ataques: 1 punto · Derrota: 0.'))}catch(e){if(seq===rankVersion)rankRows.textContent=friendly(e)}}
 control.append(btn('↻ Actualizar guerras',()=>load()));
 async function load(message){
 if(loading||!host.isConnected)return;loading=true;
 try{const [g,m,w,p]=await Promise.all([sb.from('sb_shadow_guilds').select('id,name,owner_id,shield').order('name').limit(100),sb.from('sb_shadow_guild_members').select('guild_id').eq('user_id',user.id),sb.from('sb_guild_wars').select('*').order('created_at',{ascending:false}).limit(100),sb.from('sb_guild_war_roster').select('*').eq('user_id',user.id).limit(100)]);
 guilds=check(g)||[];own=guilds.find(x=>x.owner_id===user.id);mine=new Set((check(m)||[]).map(x=>x.guild_id));if(own)mine.add(own.id);wars=check(w)||[];roster=Object.fromEntries((check(p)||[]).map(x=>[x.war_id,x]));
 if(!host.isConnected)return;drawChallenge();draw();await loadRank();status.textContent=message||'Guerras actualizadas.';
 }catch(e){status.textContent='No se pudieron cargar: '+friendly(e)}finally{loading=false}
 }
 async function act(action,label){if(busy)return;busy=true;try{await action();await load(label)}catch(e){status.textContent=friendly(e)}finally{busy=false}}
 function drawChallenge(){
 const selected=challenge.querySelector('select')?.value;challenge.replaceChildren();
 if(!own){challenge.append(el('p','Solo el líder de un gremio puede enviar desafíos.'));return}
 const box=panel(),target=el('select');target.setAttribute('aria-label','Gremio rival');const placeholder=el('option','Selecciona un rival');placeholder.value='';target.append(placeholder);for(const g of guilds.filter(x=>x.id!==own.id)){const o=el('option',(g.shield||'🛡️')+' '+g.name);o.value=g.id;target.append(o)}if([...target.options].some(o=>o.value===selected))target.value=selected;
 const send=btn('⚔️ Desafiar gremio',()=>{if(!target.value){status.textContent='Elige un gremio rival.';return}if(!confirm('¿Enviar un desafío al gremio seleccionado?'))return;act(async()=>check(await sb.rpc('sb_war_challenge',{target_guild:target.value})),'Desafío enviado. El rival tiene 24 horas para responder.')});box.append(el('h3','Desafiar desde '+own.name),target,send,el('small','Los miembros inscritos en ambos gremios quedan excluidos. Tienen prioridad los líderes y los miembros más antiguos.'));challenge.append(box)
 }
 function draw(){
 list.replaceChildren();const myWars=wars.filter(w=>mine.has(w.challenger_id)||mine.has(w.defender_id)||roster[w.id]);
 const total=Object.values(roster).reduce((s,x)=>s+Number(x.xp),0);
 list.append(el('h3','Mis guerras'),el('p','XP de guerra en los últimos registros: '+total));if(total>=80&&Object.values(roster).some(r=>r.xp===80))list.append(el('p','🎖️ Vencedor de gremio'));
 if(!myWars.length)list.append(el('p','Tu gremio todavía no tiene guerras.'));
 for(const w of myWars)list.append(warCard(w,true));
 const other=wars.filter(w=>!myWars.some(x=>x.id===w.id));const details=el('details');details.append(el('summary','🌍 Otras guerras e historial reciente'));for(const w of other)details.append(warCard(w,false));if(!other.length)details.append(el('p','No hay otras guerras.'));list.append(details);
 }
 function warCard(w,personal){
 const box=panel();box.style.background='linear-gradient(145deg,#251631,#17111f)';const now=Date.now(),active=w.status==='active'&&Date.parse(w.ends_at)>now,pending=w.status==='pending'&&Date.parse(w.accept_by)>now,rec=roster[w.id];
 box.append(el('h3',w.challenger_name+' ⚔️ '+w.defender_name),el('p',(w.status==='active'&&!active?'Calculando resultado':w.status==='pending'&&!pending?'Desafío caducado':states[w.status])+' · '+(w.team_size?w.team_size+' vs '+w.team_size:'Desafío')));
 if(w.territory_id)box.append(el('p','🏰 Guerra territorial: '+w.territory_name+' · Si gana el atacante, conquista la fortaleza. Si gana el defensor o empatan, conserva el control.'));
 const score=el('h2',w.score_a+' — '+w.score_b);score.style.textAlign='center';box.append(score);
 if(w.team_size){const line=el('progress');line.max=w.team_size*600;line.value=w.score_a+w.score_b;line.style.width='100%';line.setAttribute('aria-label','Ataques totales de la guerra');box.append(line)}
 if(pending){box.append(el('p','Responder antes de '+dateFmt(w.accept_by)));if(own?.id===w.defender_id){box.append(btn('Aceptar desafío',()=>{if(w.territory_id&&!confirm('¿Aceptar la guerra por '+w.territory_name+'? Puedes perder su control.'))return;act(async()=>check(await sb.rpc('sb_war_respond',{target_war:w.id,accept:true})),'¡Guerra iniciada!')}),btn('Rechazar',()=>{if(confirm('¿Rechazar desafío?'))act(async()=>check(await sb.rpc('sb_war_respond',{target_war:w.id,accept:false})),'Desafío rechazado.')}))}}
 if(active){box.append(el('p','Finaliza '+dateFmt(w.ends_at)));if(rec){const left=rec.last_attack_at?Math.max(0,Math.ceil((Date.parse(rec.last_attack_at)+60000-now)/1000)):0;box.append(el('p','Tu puntuación: '+rec.score+' · Ataques '+rec.attacks+'/3'));const attack=btn('⚔️ Atacar (+100 puntos)',()=>act(async()=>check(await sb.rpc('sb_war_attack',{target_war:w.id,expected_attacks:rec.attacks})),'Ataque sincronizado.'));attack.disabled=rec.attacks>=3||left>0;const wait=el('small',left?' Espera '+left+' s':'');box.append(attack,wait);if(left&&rec.attacks<3){const timer=setInterval(()=>{if(!box.isConnected){clearInterval(timer);return}const remaining=Math.max(0,Math.ceil((Date.parse(rec.last_attack_at)+60000-Date.now())/1000));wait.textContent=remaining?' Espera '+remaining+' s':'';if(!remaining){attack.disabled=Date.parse(w.ends_at)<=Date.now();clearInterval(timer)}},1000)}}else if(personal)box.append(el('p','No perteneces a la alineación seleccionada para esta guerra.'))}
 if(w.status==='finished'){box.append(el('p',w.winner_id?'🏆 Ganador: '+(w.winner_id===w.challenger_id?w.challenger_name:w.defender_name):w.score_a>0?'🤝 Empate':'Sin ataques · sin recompensa'));if(rec)box.append(el('p','Tu recompensa: +'+rec.xp+' XP'))}
 return box;
 }
 await load();const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return}if(!busy&&!document.hidden)load()},30000);
}
return {mount};
})();