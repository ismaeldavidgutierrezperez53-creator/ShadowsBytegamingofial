/* Shadow Universe 2.0 — persistent solo dungeon expeditions. */
window.SBDungeons=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const fmt=n=>Number(n).toLocaleString('es-ES');
const errors={'Account restricted':'Tu cuenta no puede participar.','Rank insufficient':'Necesitas más experiencia para abrir esta puerta.','Run unavailable':'La expedición ha caducado. Abre la puerta de hoy.','No power charges':'No quedan cargas de poder.','Fusion unavailable':'No tienes híbrido en esta expedición.','Fusion already used':'Ya invocaste el híbrido.','Divine unavailable':'No tienes arma divina en esta expedición.','Divine already used':'Ya utilizaste el poder divino.','Dragon unavailable':'No hay dragón en esta expedición.','Dragon already used':'Ya invocaste tu dragón.','Awakening locked':'Todavía no has despertado.','Awakening already used':'Ya usaste la técnica del Eclipse.','No potion':'No tienes pociones. Fabrica una en el taller.','Potion already used':'Ya usaste una poción en esta expedición.','No army equipped':'No tienes una formación en esta expedición.','Army already summoned':'Ya invocaste el ejército.','Skill not equipped':'Esta habilidad no está equipada en esta expedición.','Skill already used':'Ya utilizaste esta habilidad.'};
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
 for(const d of catalogs){const r=todayRuns[d.id],locked=xp<d.min_xp&&!r;const [symbol,color]=styles[d.id]||['⚔️','#c084fc'];const box=panel();box.id='sb-dungeon-door-'+d.id;box.style.cssText+=';background:linear-gradient(145deg,#21132f,#15111e);border-color:'+color;
 const icon=el('div',symbol);icon.style.cssText='font-size:40px;text-align:center';box.append(icon,el('h3',d.name),el('p','Rango '+d.rank_required+' · +'+d.reward_xp+' XP'),el('p',d.description),el('p',locked?'🔒 Requiere '+fmt(d.min_xp)+' XP':r?.status==='won'?'✅ Conquistada hoy':r?.status==='lost'?'❌ Expedición terminada':r?'⚔️ En curso':'🟢 Puerta disponible'));
 const action=btn(locked?'Bloqueada':r?.status==='active'?'Continuar':r?'Ver resultado':'Entrar en mazmorra',()=>start(d));action.disabled=locked;box.append(action);list.append(box);
 }
 }
 async function start(d){if(opening)return;opening=true;const rev=++revision;battle.hidden=false;battle.replaceChildren(el('p','Abriendo puerta…'));try{const run=check(await sb.rpc('sb_dungeon_start',{requested_dungeon:d.id}));if(rev!==revision||!host.isConnected)return;todayRuns[d.id]=run;draw();render(run,d,rev)}catch(e){if(rev===revision)battle.replaceChildren(el('p',friendly(e)),btn('Cerrar',()=>{revision++;battle.hidden=true}))}finally{opening=false}}
 function render(r,d,rev){
 if(rev!==revision||!host.isConnected)return;
 battle.replaceChildren(el('h3','⚔️ '+d.name),btn('Cerrar expedición',()=>{revision++;battle.hidden=true}),el('p',r.last_event));
 if(r.status!=='active'){battle.append(el('h2',r.status==='won'?'🏆 ¡Mazmorra conquistada!':'💀 Expedición terminada'),el('p',r.status==='won'?'+'+r.xp+' XP concedidos automáticamente. Consulta el botín, la sombra extraída y los materiales del taller (actualiza los apartados).':'Sin recompensa. Puedes intentarlo mañana.'),btn('Volver a las puertas',()=>{revision++;battle.hidden=true;refresh()}));return}
 battle.append(el('p','Sala '+r.room+'/3 · Turno '+r.turn_no+'/25'),hpbar('Tu vida',r.player_hp,100,'#22c55e'),hpbar(d.enemy_names[r.room-1],r.enemy_hp,d.enemy_hp[r.room-1],'#ef4444'),el('p','Poderes restantes: '+r.power_left+'/2'));
 if(r.pet_bonus>0)battle.append(el('p','🐾 Compañero: '+(r.companion_name||'Mascota')+' · +'+r.pet_bonus+' daño por ataque.'));
 if(r.gear_attack||r.gear_defense)battle.append(el('p','🗡️ Equipo: +'+(r.gear_attack||0)+' ataque · 🛡️ '+(r.gear_defense||0)+' reducción de daño.'));
 if(r.class_id)battle.append(el('p','👑 Clase: '+({warrior:'Guerrero',guardian:'Guardián',mage:'Hechicero',healer:'Sanador',assassin:'Asesino'}[r.class_id]||r.class_id)+' · +'+r.class_attack+' ataque · '+r.class_defense+' defensa · +'+r.class_magic+' magia · +'+r.class_heal+' curación'));
 if((r.army_names||[]).length)battle.append(el('p','🌑 Ejército: '+r.army_names.join(' · ')+' · '+r.army_defense+' reducción de daño.'));
 if(r.ascension_tier)battle.append(el('p','⚡ Ascensión '+r.ascension_tier+' · +'+(2*r.ascension_tier)+' ataque · '+r.ascension_tier+' defensa.'));
 if(r.dragon_id)battle.append(el('p','🐉 Dragón: '+r.dragon_name+' · '+r.dragon_defense+' defensa.'));
 if(r.divine_id)battle.append(el('p','✦ Arma divina: '+r.divine_name+' · +'+r.divine_attack+' ataque · '+r.divine_defense+' defensa.'));
 if(r.fusion_id)battle.append(el('p','🧬 Híbrido: '+r.fusion_name+' · '+r.fusion_defense+' defensa.'));
 if(r.talent_attack||r.talent_defense||r.talent_magic||r.talent_heal)battle.append(el('p','🌳 Talentos: +'+r.talent_attack+' ataque · '+r.talent_defense+' defensa · '+r.talent_magic+' magia · '+r.talent_heal+' curación.'));
 const actions=el('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';const feedback=el('p');feedback.setAttribute('role','status');let sending=false;
 const bonus=Number(r.pet_bonus||0)+Number(r.gear_attack||0)+Number(r.class_attack||0)+2*Number(r.ascension_tier||0)+Number(r.divine_attack||0)+Number(r.talent_attack||0),magic=Number(r.class_magic||0)+Number(r.talent_magic||0),heal=Number(r.class_heal||0)+Number(r.talent_heal||0),skillNames={bolt:'⚡ Rayo de sombras ('+(45+bonus+magic)+' daño)',heal:'💚 Luz restauradora (+'+(30+heal)+' PV)',shield:'🛡️ Escudo espectral ('+(20+bonus)+' daño y bloqueo)',storm:'🌩️ Tormenta abisal ('+(70+bonus+magic)+' daño)',renew:'✨ Renacer celestial (+'+(45+heal)+' PV)',fortress:'🏰 Fortaleza del monarca ('+(35+bonus)+' daño y bloqueo)'};
 const moves=[['attack','⚔️ Atacar ('+(30+bonus)+' daño)'],['guard','🛡️ Defender (+'+(12+heal)+' PV, daño reducido)'],['power','🔮 Poder ('+(55+bonus+magic)+' daño)']];
 if(r.ascension_tier)moves.push(['awaken','⚡ Técnica del Eclipse ('+(60+10*r.ascension_tier+bonus)+' daño)'+(r.awakening_used?' · Usada':'')]);
 if(r.fusion_id)moves.push(['fusion','🧬 '+r.fusion_power+' ('+r.fusion_damage+' daño'+(r.fusion_heal?' · +'+r.fusion_heal+' PV':'')+')'+(r.fusion_used?' · Usada':'')]);
 if(r.divine_id)moves.push(['divine','✦ '+r.divine_power+' ('+r.divine_damage+' daño'+(r.divine_heal?' · +'+r.divine_heal+' PV':'')+')'+(r.divine_used?' · Usada':'')]);
 if(r.dragon_id)moves.push(['dragon','🐉 '+r.dragon_power+' ('+r.dragon_damage+' daño'+(r.dragon_heal?' · +'+r.dragon_heal+' PV':'')+')'+(r.dragon_used?' · Usada':'')]);
 moves.push(['potion','🧪 Poción (+35 PV)'+(r.potion_used?' · Usada':'')]);
 if((r.army_names||[]).length)moves.push(['summon','🌑 Invocar ejército ('+(45+bonus+Number(r.army_attack||0))+' daño)'+(r.army_used?' · Usada':'')]);
 for(const id of r.equipped_skills||[])if(skillNames[id])moves.push(['skill:'+id,skillNames[id]+((r.used_skills||[]).includes(id)?' · Usada':'')]);
 if((r.equipped_skills||[]).length)battle.append(el('p','🔮 Habilidades: '+(r.equipped_skills.length-(r.used_skills||[]).length)+' disponibles.'));
 const unavailable=move=>move==='fusion'&&r.fusion_used||move==='divine'&&r.divine_used||move==='dragon'&&r.dragon_used||move==='awaken'&&r.awakening_used||move==='potion'&&r.potion_used||move==='summon'&&r.army_used||move==='power'&&r.power_left===0||move.startsWith('skill:')&&(r.used_skills||[]).includes(move.slice(6));
 for(const [move,title] of moves){
 const b=btn(title,async()=>{if(sending||rev!==revision)return;sending=true;for(const n of actions.children)n.disabled=true;try{const result=check(await sb.rpc('sb_dungeon_turn',{run_key:r.id,expected_turn:r.turn_no,move}));if(rev!==revision||!host.isConnected)return;todayRuns[d.id]=result;draw();render(result,d,rev);if(result.status!=='active')refresh();if(result.status==='won'||move==='potion')host.dispatchEvent(new CustomEvent('sb-craft-inventory-changed',{bubbles:true}))}catch(e){if(rev!==revision)return;feedback.textContent=friendly(e);for(const n of actions.children)n.disabled=unavailable(n.dataset.move);sending=false}});b.dataset.move=move;b.disabled=unavailable(move);actions.append(b);
 }
 battle.append(actions,feedback);
 }
 host.append(btn('↻ Actualizar mazmorras',refresh));await refresh();
}
return {mount};
})();