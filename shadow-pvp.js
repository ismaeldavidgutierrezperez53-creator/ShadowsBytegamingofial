/* Shadow Universe 2.0 — opt-in asynchronous PvP league. */
window.SBPvP=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const styles={attack:'⚔️ Ofensiva',guard:'🛡️ Defensiva',magic:'🔮 Mágica'};
const errors={'Public eligible profile required':'Necesitas un perfil público y una cuenta habilitada.','Opponent unavailable':'El rival no está disponible.','Daily limit':'Uno de los jugadores ya ha completado tres duelos hoy.','Pair limit':'Ya existe un desafío pendiente o un duelo contra este rival hoy.','Pending limit':'Ya hay demasiados desafíos pendientes.','Challenge limit':'Has alcanzado el límite de seis desafíos enviados hoy.','Duel unavailable':'Duelo no disponible.','Defender required':'Solo el jugador desafiado puede responder.'};
const friendly=e=>errors[e.message]||e.message||'Error de conexión';
const panel=()=>{const n=el('section');n.style.cssText='padding:14px;margin:12px 0;border:1px solid #a855f777;border-radius:14px;overflow-wrap:anywhere';return n};
const nowDay=()=>new Date().toISOString().slice(0,10);
const statusNames={pending:'Pendiente',finished:'Finalizado',declined:'Rechazado',canceled:'Cancelado',expired:'Caducado'};
function stance(){const s=el('select');s.setAttribute('aria-label','Estilo de combate');for(const [v,t] of Object.entries(styles)){const o=el('option',t);o.value=v;s.append(o)}return s}
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🏆 Arena PvP · Liga mensual'),el('p','Desafía a otros miembros que hayan activado la arena. El rival tiene 24 horas para responder. Al aceptar, Supabase simula hasta cinco rondas con las configuraciones de ambos jugadores. No es combate en tiempo real.'));
 const status=el('p','Cargando arena…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const settings=panel(),challenge=panel(),stats=el('section'),rank=panel(),history=el('div');host.append(status,settings,challenge,stats,rank,history);
 const month=el('input');month.type='month';month.value=nowDay().slice(0,7);month.setAttribute('aria-label','Temporada');const rows=el('div');rank.append(el('h3','🏅 Clasificación de temporada'),month,btn('Consultar',loadRank),rows);month.onchange=loadRank;
 let busy=false,loading=false,version=0,pref=false,opponents=[],duels=[],results=[];
 function report(e){status.textContent=friendly(e)}
 async function loadRank(){const seq=++version;try{if(!/^\d{4}-\d{2}$/.test(month.value))return;const data=check(await sb.rpc('sb_pvp_ranking',{requested_season:month.value+'-01'}))||[];if(seq!==version||!host.isConnected)return;rows.replaceChildren();const ol=el('ol');for(const x of data)ol.append(el('li',x.display_name+' · '+x.points+' puntos · '+x.wins+' V / '+x.draws+' E / '+x.losses+' D'));rows.append(data.length?ol:el('p','Todavía no hay resultados de esta temporada.'));rows.append(el('small','Victoria: 3 puntos · Empate: 1 punto · Derrota: 0. Los resultados de perfiles públicos se conservan aunque desactiven la arena.'))}catch(e){if(seq===version)rows.textContent=friendly(e)}}
 async function load(message){
 if(loading||!host.isConnected)return;loading=true;
 try{const [a,b,c,d]=await Promise.all([sb.from('sb_pvp_preferences').select('enabled').eq('user_id',user.id).maybeSingle(),sb.rpc('sb_pvp_directory'),sb.from('sb_pvp_duels').select('*').or('challenger_id.eq.'+user.id+',defender_id.eq.'+user.id).order('created_at',{ascending:false}).limit(100),sb.from('sb_pvp_results').select('*').eq('user_id',user.id).order('play_day',{ascending:false}).limit(100)]);
 pref=!!check(a)?.enabled;opponents=check(b)||[];duels=check(c)||[];results=check(d)||[];if(!host.isConnected)return;draw();await loadRank();status.textContent=message||'Arena actualizada.';
 }catch(e){report(e)}finally{loading=false}
 }
 async function act(fn,msg){if(busy)return;busy=true;try{await fn();await load(msg)}catch(e){report(e)}finally{busy=false}}
 function draw(){
 settings.replaceChildren(el('h3',pref?'🟢 Participación activada':'⚪ Participación desactivada'),el('p','La arena requiere un perfil público. Puedes desactivarla y cancelar automáticamente tus desafíos pendientes.'));
 settings.append(btn(pref?'Desactivar arena':'Activar arena',()=>{if(pref&&!confirm('¿Desactivar la arena y cancelar los desafíos pendientes?'))return;act(async()=>check(await sb.rpc('sb_pvp_opt',{enabled_value:!pref})),pref?'Arena desactivada.':'Arena activada.')}));
 challenge.replaceChildren(el('h3','⚔️ Enviar desafío'));
 if(!pref)challenge.append(el('p','Activa la arena para participar.'));
 else if(!opponents.length)challenge.append(el('p','Aún no hay rivales disponibles. Otro miembro debe activar la arena.'));
 else{const target=el('select');target.setAttribute('aria-label','Rival');const first=el('option','Selecciona rival');first.value='';target.append(first);for(const o of opponents){const n=el('option',o.display_name);n.value=o.member_id;target.append(n)}const style=stance();challenge.append(target,style,el('small','Ofensiva: +4 daño por ronda. Defensiva: reduce 4 de daño por ronda. Mágica: +8 daño en ronda 3. Se aplican además armas, armaduras, mascotas y habilidades equipadas al aceptar.'),btn('Enviar desafío',()=>{if(!target.value){status.textContent='Selecciona un rival.';return}if(!confirm('¿Enviar este desafío PvP?'))return;act(async()=>check(await sb.rpc('sb_pvp_challenge',{target_member:target.value,stance_choice:style.value})),'Desafío enviado. El rival tiene 24 horas.')}))}
 const wins=results.filter(x=>x.outcome==='win').length,draws=results.filter(x=>x.outcome==='draw').length,losses=results.filter(x=>x.outcome==='loss').length,today=results.filter(x=>x.play_day===nowDay()).length;
 stats.replaceChildren(el('h3','📊 Mis resultados'),el('p','Hoy: '+today+'/3 duelos · Últimos 100 resultados: '+wins+' V / '+draws+' E / '+losses+' D · '+results.reduce((s,x)=>s+x.xp,0)+' XP'));
 if(wins)stats.append(el('p','🎖️ Gladiador de las Sombras'));if(wins>=10)stats.append(el('p','👑 Veterano de la arena'));
 history.replaceChildren(el('h3','📜 Mis desafíos y duelos'));
 if(!duels.length)history.append(el('p','Aún no hay desafíos.'));
 for(const d of duels){const box=panel(),pending=d.status==='pending'&&Date.parse(d.expires_at)>Date.now(),other=d.challenger_id===user.id?d.defender_name:d.challenger_name;box.style.background='#211633';box.style.color='#fff';
 box.append(el('h3',d.challenger_name+' ⚔️ '+d.defender_name),el('p',(d.status==='pending'&&!pending?'Caducado':statusNames[d.status])+' · '+new Date(d.created_at).toLocaleString('es-ES')));
 if(pending){box.append(el('p','Respuesta antes de '+new Date(d.expires_at).toLocaleString('es-ES')));if(d.defender_id===user.id){const s=stance();box.append(s,btn('Aceptar y combatir',()=>{if(!confirm('¿Aceptar el duelo contra '+other+'?'))return;act(async()=>check(await sb.rpc('sb_pvp_respond',{target_duel:d.id,decision:'accept',stance_choice:s.value})),'Duelo resuelto. Consulta el resultado.')}),btn('Rechazar',()=>act(async()=>check(await sb.rpc('sb_pvp_respond',{target_duel:d.id,decision:'decline'})),'Desafío rechazado.')))}else box.append(btn('Cancelar desafío',()=>act(async()=>check(await sb.rpc('sb_pvp_respond',{target_duel:d.id,decision:'cancel'})),'Desafío cancelado.')))}
 if(d.status==='finished'){const own=results.find(x=>x.duel_id===d.id),win=d.winner_id===user.id;box.append(el('h2',d.winner_id?win?'🏆 Victoria':'💀 Derrota':'🤝 Empate'),el('p',d.challenger_name+' '+d.challenger_hp+' PV — '+d.defender_hp+' PV '+d.defender_name));if(own)box.append(el('p','+'+own.xp+' XP · +'+own.points+' puntos de liga'));const log=el('details');log.append(el('summary','Ver rondas de combate'));if(d.battle_log){log.append(el('p',(styles[d.battle_log.challenger_stance]||'')+' frente a '+(styles[d.battle_log.defender_stance]||'')));for(const x of d.battle_log.rounds||[])log.append(el('p','Ronda '+x.round+': '+x.a_damage+' / '+x.b_damage+' daño · '+x.a_hp+' / '+x.b_hp+' PV'))}box.append(log)}
 history.append(box)}
 }
 host.append(btn('↻ Actualizar arena',()=>load()));await load();
}
return {mount};
})();