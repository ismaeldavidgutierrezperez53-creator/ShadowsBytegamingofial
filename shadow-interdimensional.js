/* Shadow Universe 6.0 — Interdimensional tournaments */
window.SBInterdimensional=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const month=()=>new Date().toISOString().slice(0,7)+'-01';
const fmt=d=>new Date(d+'T12:00:00Z').toLocaleDateString('es-ES',{month:'long',year:'numeric',timeZone:'UTC'});
const names={attack:'⚔️ Ataque',guard:'🛡️ Defensa',magic:'🔮 Magia'};
const errors={'Public eligible profile required':'Necesitas un perfil público y sin restricciones.','Rank insufficient':'Necesitas 400 XP de cazador.','Opponent unavailable':'El rival no está disponible.','Join tournament first':'Ambos jugadores deben inscribirse.','Pending challenge':'Ya existe un desafío pendiente.','Daily challenge limit':'Máximo tres desafíos enviados al día.','Opponent queue full':'El rival tiene demasiados desafíos pendientes.','Match unavailable':'El desafío ya no está disponible.','Pair daily limit':'Solo un duelo completado contra el mismo rival al día.','Daily match limit':'Uno de los jugadores alcanzó cinco duelos completados hoy.','No season prize':'No tienes premio en esta temporada.','Season not finished':'La temporada todavía no ha terminado.','Choose three strategies':'Selecciona las tres estrategias.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','⚔️ Arena interdimensional · Shadow Universe 6.0'),el('p','Torneo mensual UTC con inscripción gratuita desde 400 XP. Duelos asíncronos entre miembros inscritos: cada jugador elige tres estrategias secretas. Ataque vence a magia, magia a defensa y defensa a ataque. Sin ventaja de equipo ni criaturas. Victoria 3 puntos, empate 1, derrota 0. Máximo tres desafíos enviados y cinco duelos completados al día; un duelo por pareja al día. Los desafíos vencen tras 24 horas o al cerrar la temporada.'));
const status=el('p','Cargando torneo…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),compose=el('section'),inbox=el('section'),ranking=el('section'),history=el('details');host.append(status,info,compose,inbox,ranking,history);
let entries=[],score=null,rows=[],currentRows=[],matches=[],prizes=[],selectedSeason=month(),xp=0,busy=false,loading=false;
const current=()=>entries.some(e=>e.season===month()),player=id=>currentRows.find(x=>x.user_id===id),display=id=>id===user.id?'Tú':player(id)?.display_name||'Rival';
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f,g]=await Promise.all([sb.from('sb_interdimensional_entries').select('season').eq('user_id',user.id).order('season',{ascending:false}),sb.from('sb_interdimensional_scores').select('*').eq('user_id',user.id).eq('season',month()).maybeSingle(),sb.rpc('sb_interdimensional_board',{target_season:selectedSeason}),sb.rpc('sb_interdimensional_board',{target_season:month()}),sb.from('sb_interdimensional_matches').select('*').or('challenger.eq.'+user.id+',opponent.eq.'+user.id).order('created_at',{ascending:false}).limit(150),sb.from('sb_interdimensional_prizes').select('*').eq('user_id',user.id).order('season',{ascending:false}),sb.rpc('community_member_xp',{target_member:user.id})]);
if(!host.isConnected)return;entries=check(a)||[];score=check(b);rows=check(c)||[];currentRows=check(d)||[];matches=check(e)||[];prizes=check(f)||[];xp=Number(check(g)||0);draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action,args={},message){if(busy||loading)return;busy=true;try{const r=check(await sb.rpc('sb_interdimensional_action',{action,...args}));await load(action==='claim'?'Premio de temporada: '+r.xp+' XP, '+r.dust+' polvo y '+r.shards+' fragmentos.':message||'Torneo actualizado.');}catch(e){report(e)}finally{busy=false}}
function choices(){const w=el('div'),fields=[];for(let i=0;i<3;i++){const s=el('select');s.setAttribute('aria-label','Estrategia ronda '+(i+1));for(const [v,label] of Object.entries(names)){const o=el('option',label);o.value=v;s.append(o)}s.selectedIndex=i;w.append(el('p','Ronda '+(i+1)),s);fields.push(s)}return{w,values:()=>fields.map(s=>s.value)}}
function draw(){
const me=currentRows.find(x=>x.is_me),pts=score?.points||0,division=me?.division||(pts>=30?'Diamante':pts>=18?'Oro':pts>=9?'Plata':'Bronce'),joined=current();
info.replaceChildren(el('h3','Temporada · '+fmt(month())),el('p','Mi división: '+division+' · '+pts+' puntos'),el('p','Victorias '+(score?.wins||0)+' · Empates '+(score?.draws||0)+' · Derrotas '+(score?.losses||0)),el('p','Para optar a premios: mínimo tres duelos completados contra al menos dos rivales distintos y puntuación positiva.'));
if(!joined){const b=btn('Inscribirme gratis',()=>act('join',{},'Inscripción completada.'));b.disabled=xp<400;info.append(el('p',xp+' / 400 XP requeridos'),b)}else info.append(el('p',me?.qualified?'✓ Requisitos competitivos alcanzados':'Inscrito · todavía no cumples los requisitos de clasificación para premios'));
if(prizes.some(p=>p.place===1&&p.claimed_at))info.append(el('p','👑 Campeón del multiverso'));
compose.replaceChildren(el('h3','Enviar desafío'));
const rivals=currentRows.filter(x=>x.can_challenge&&x.user_id);
if(joined&&rivals.length){const s=el('select');s.setAttribute('aria-label','Rival inscrito');for(const p of rivals){const o=el('option',p.display_name+' · '+p.division);o.value=p.user_id;s.append(o)}const c=choices();compose.append(s,c.w,btn('Enviar desafío secreto',()=>{if(confirm('¿Enviar estas tres estrategias al servidor? El rival no podrá verlas hasta responder.'))act('challenge',{target_user:s.value,moves:c.values()},'Desafío registrado. Consulta tu bandeja.')}))}else compose.append(el('p',joined?'Todavía no hay rivales disponibles.':'Inscríbete primero.'));
inbox.replaceChildren(el('h3','📨 Desafíos pendientes'));
const pending=matches.filter(m=>m.status==='pending'&&m.season===month()&&Date.parse(m.expires_at)>Date.now());
for(const m of pending){const incoming=m.opponent===user.id,box=el('article');box.style.cssText='padding:12px;border:1px solid #a855f7;border-radius:12px;margin:8px 0';box.append(el('h4',(incoming?'Recibido de ':'Enviado a ')+display(incoming?m.challenger:m.opponent)),el('small','Caduca: '+new Date(m.expires_at).toLocaleString('es-ES')));
if(incoming){const c=choices();box.append(c.w,btn('Aceptar y resolver duelo',()=>act('accept',{target_match:m.id,moves:c.values()},'Duelo resuelto. Consulta el historial.')),btn('Rechazar',()=>act('decline',{target_match:m.id})))}else box.append(btn('Cancelar desafío',()=>act('cancel',{target_match:m.id})));inbox.append(box)}
if(!pending.length)inbox.append(el('p','Sin desafíos pendientes.'));
ranking.replaceChildren(el('h3','🏆 Clasificación y premios'));
const seasons=[...new Set([month(),...entries.map(e=>e.season)])].sort().reverse(),sel=el('select');sel.setAttribute('aria-label','Temporada');for(const m of seasons){const o=el('option',fmt(m));o.value=m;sel.append(o)}sel.value=selectedSeason;sel.onchange=()=>{selectedSeason=sel.value;load()};ranking.append(sel);
const ol=el('ol');for(const p of rows.slice(0,30)){const name=p.display_name+(p.is_me?' (tú)':'');ol.append(el('li',name+' · '+p.division+' · '+p.points+' pts · '+p.wins+' V / '+p.draws+' E / '+p.losses+' D'+(p.qualified?' · Elegible':'')+(p.prize_place?' · Premio '+p.prize_place+'º':'')))}ranking.append(rows.length?ol:el('p','Todavía no hay participantes.'));
if(selectedSeason<month()){const p=prizes.find(x=>x.season===selectedSeason),me=rows.find(x=>x.is_me);ranking.append(el('p',p?.claimed_at?'✓ Premio reclamado':me?.prize_place?'Premio disponible: puesto '+me.prize_place:'La clasificación premiada exige los requisitos competitivos.'));const b=btn('Reclamar premio de temporada',()=>act('claim',{target_season:selectedSeason}));b.disabled=!!p?.claimed_at;ranking.append(b)}
ranking.append(el('p','Premios al cierre: 1º 100 XP / 15 polvo / 10 fragmentos; 2º 60 XP / 10 polvo / 6 fragmentos; 3º 40 XP / 5 polvo / 4 fragmentos. Empates a puntos y victorias comparten puesto. La clasificación premiada se fija al reclamar el primer premio.'));
const open=history.open;history.replaceChildren(el('summary','📜 Historial de duelos (últimos 150)'));history.open=open;
for(const m of matches.filter(m=>m.status!=='pending'||m.season!==month()||Date.parse(m.expires_at)<=Date.now())){const a=m.challenger===user.id,other=display(a?m.opponent:m.challenger);let t=m.status==='completed'?(a?m.challenger_score:m.opponent_score)+'–'+(a?m.opponent_score:m.challenger_score):m.status==='pending'?'Caducado':m.status==='declined'?'Rechazado':'Cancelado';const p=el('p',new Date(m.created_at).toLocaleDateString('es-ES')+' · '+other+' · '+t);if(m.status==='completed')p.append(el('small',' · '+(a?m.challenger_moves:m.opponent_moves).map(v=>names[v]).join(' / ')+' vs '+(a?m.opponent_moves:m.challenger_moves).map(v=>names[v]).join(' / ')));history.append(p)}
}
host.append(btn('↻ Actualizar torneo',()=>load()));await load();
}
return {mount};
})();