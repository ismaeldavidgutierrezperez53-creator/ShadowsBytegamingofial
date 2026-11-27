/* Shadow Universe 2.0 — persistent solo dungeon expeditions. */
window.SBDungeons=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const fmt=n=>Number(n).toLocaleString('es-ES');
const errors={'Account restricted':'Tu cuenta no puede participar.','Rank insufficient':'Necesitas más experiencia para abrir esta puerta.','Run unavailable':'La expedición ha caducado. Abre la puerta de hoy.','No power charges':'No quedan cargas de poder.'};
const friendly=e=>errors[e.message]||e.message||'Error de conexión';
const panel=()=>{const n=el('section');n.style.cssText='padding:14px;margin:12px 0;border:1px solid #a855f777;border-radius:15px;overflow-wrap:anywhere';return n};
const styles={crypt:['🪦','#94a3b8'],forest:['🌲','#34d399'],citadel:['🏰','#fbbf24']};
function hpbar(label,hp,max,color){const box=el('div');box.append(el('p',label+' · '+hp+'/'+max+' PV'));const b=el('progress');b.value=hp;b.max=max;b.style.cssText='width:100%;height:18px;accent-color:'+color;b.setAttribute('aria-label',label);box.append(b);return box}
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🏰 Mazmorras RPG'),el('p','Abre puertas, supera tres salas y gana experiencia. Una expedición diaria por mazmorra (UTC); tus progresos se guardan. Combate individual por turnos.'));
 const status=el('p','Cargando puertas…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const stats=el('div'),list=el('div'),battle=panel(),history=el('details');battle.hidden=true;list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,185px),1fr));gap:10px';
 host.append(status,stats,list,battle,history);
 let catalogs=[],todayRuns={},xp=0,revision=0,opening=false;
 async function refresh(){
 try{
 const [cat,experience,runs]=await Promise.all([sb.from('sb_dungeon_catalog').select('*').order('min_xp'),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_dungeon_runs').select('*').eq('user_id',user.id).order('run_day',{ascending:false}).limit(100)]);
 if(!host.isConnected)return;catalogs=check(cat)||[];xp=Number(check(experience)||0);const rows=check(runs)||[],today=new Date().toISOString().slice(0,10);
 todayRuns=Object.fromEntries(rows.filter(r=>r.run_day===today).map(r=>[r.dungeon_id,r]));
 const wins=rows.filter(r=>r.status==='won'),total=wins.reduce((s,r)=>s+Number(r.xp),0);
 stats.replaceChildren(el('p','⚡ '+fmt(xp)+' XP de comunidad · 🏆 '+wins.length+' victorias · '+fmt(total)+' XP en tus últimas 100 expediciones'));
 if(wins.length)stats.append(el('p','🎖️ Explorador de las Sombras'));if(wins.some(r=>r.dungeon_id==='citadel'))stats.append(el('p','👑 Conquistador del Monarca'));
 history.replaceChildren(el('summary','📜 Historial reciente'));for(const r of rows.slice(0,15))history.append(el('p',r.run_day+' · '+(catalogs.find(d=>d.id===r.dungeon_id)?.name||r.dungeon_id)+' · '+(r.status==='won'?'Victoria +'+r.xp+' XP':r.status==='lost'?'Derrota':'Sin terminar')));if(!rows.length)history.append(el('p','Todavía no hay expediciones.'));
 draw();status.textContent='';}catch(e){status.textContent='No se pudieron cargar las mazmorras: '+friendly(e)}
 }
 function draw(){
 list.replaceChildren();
 for(const d of catalogs){const r=todayRuns[d.id],locked=xp<d.min_xp&&!r;const [symbol,color]=styles[d.id]||['⚔️','#c084fc'];const box=panel();box.style.cssText+=';background:linear-gradient(145deg,#21132f,#15111e);border-color:'+color;
 const icon=el('div',symbol);icon.style.cssText='font-size:40px;text-align:center';box.append(icon,el('h3',d.name),el('p','Rango '+d.rank_required+' · +'+d.reward_xp+' XP'),el('p',d.description),el('p',locked?'🔒 Requiere '+fmt(d.min_xp)+' XP':r?.status==='won'?'✅ Conquistada hoy':r?.status==='lost'?'❌ Expedición terminada':r?'⚔️ En curso':'🟢 Puerta disponible'));
 const action=btn(locked?'Bloqueada':r?.status==='active'?'Continuar':r?'Ver resultado':'Entrar en mazmorra',()=>start(d));action.disabled=locked;box.append(action);list.append(box);
 }
 }
 async function start(d){if(opening)return;opening=true;const rev=++revision;battle.hidden=false;battle.replaceChildren(el('p','Abriendo puerta…'));try{const run=check(await sb.rpc('sb_dungeon_start',{requested_dungeon:d.id}));if(rev!==revision||!host.isConnected)return;todayRuns[d.id]=run;draw();render(run,d,rev)}catch(e){if(rev===revision)battle.replaceChildren(el('p',friendly(e)),btn('Cerrar',()=>{revision++;battle.hidden=true}))}finally{opening=false}}
 function render(r,d,rev){
 if(rev!==revision||!host.isConnected)return;
 battle.replaceChildren(el('h3','⚔️ '+d.name),btn('Cerrar expedición',()=>{revision++;battle.hidden=true}),el('p',r.last_event));
 if(r.status!=='active'){battle.append(el('h2',r.status==='won'?'🏆 ¡Mazmorra conquistada!':'💀 Expedición terminada'),el('p',r.status==='won'?'+'+r.xp+' XP concedidos automáticamente.':'Sin recompensa. Puedes intentarlo mañana.'),btn('Volver a las puertas',()=>{revision++;battle.hidden=true;refresh()}));return}
 battle.append(el('p','Sala '+r.room+'/3 · Turno '+r.turn_no+'/25'),hpbar('Tu vida',r.player_hp,100,'#22c55e'),hpbar(d.enemy_names[r.room-1],r.enemy_hp,d.enemy_hp[r.room-1],'#ef4444'),el('p','Poderes restantes: '+r.power_left+'/2'));
 const actions=el('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';const feedback=el('p');feedback.setAttribute('role','status');let sending=false;
 for(const [move,title] of [['attack','⚔️ Atacar (30 daño)'],['guard','🛡️ Defender (+12 PV, daño reducido)'],['power','🔮 Poder (55 daño)']]){
 const b=btn(title,async()=>{if(sending||rev!==revision)return;sending=true;for(const n of actions.children)n.disabled=true;try{const result=check(await sb.rpc('sb_dungeon_turn',{run_key:r.id,expected_turn:r.turn_no,move}));if(rev!==revision||!host.isConnected)return;todayRuns[d.id]=result;draw();render(result,d,rev);if(result.status!=='active')refresh()}catch(e){if(rev!==revision)return;feedback.textContent=friendly(e);for(const n of actions.children)n.disabled=n.dataset.move==='power'&&r.power_left===0;sending=false}});b.dataset.move=move;b.disabled=move==='power'&&r.power_left===0;actions.append(b);
 }
 battle.append(actions,feedback);
 }
 host.append(btn('↻ Actualizar mazmorras',refresh));await refresh();
}
return {mount};
})();