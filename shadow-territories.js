/* Shadow Universe 3.0 — territorial conquest through guild wars. */
window.SBTerritories=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(label,fn)=>{const b=el('button',label,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const messages={'Account restricted':'Tu cuenta no puede participar.','Leader required':'Solo el líder de un gremio puede conquistar.','Rank insufficient':'Tu rango no permite conquistar esta región.','Already controlled':'Tu gremio ya controla esta fortaleza.','Territory limit':'Tu gremio controla el máximo de dos fortalezas.','Territory contested':'Ya hay una guerra territorial pendiente o activa.','Territory occupied':'La fortaleza está ocupada.','Neutral territory':'La fortaleza es neutral.','Territory protected':'La fortaleza tiene protección temporal.','Weekly neutral limit':'Tu gremio ya reclamó una fortaleza neutral esta semana.','Guild busy or weekly limit':'Uno de los gremios tiene una guerra pendiente, activa o ya combatió esta semana.','Control not mature':'El gremio debe controlar la fortaleza durante al menos 24 horas.','Membership required':'Debes pertenecer al gremio durante al menos 24 horas.','Weekly reward claimed':'Ya reclamaste tu recompensa territorial semanal.'};
function week(){const d=new Date();d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)}
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🌍 Conquista de territorios'),el('p','Reclama fortalezas neutrales o desafía a sus defensores. Las guerras se disputan mediante Guerras de gremios: 24 h para aceptar, 48 h de combate, máximo una guerra aceptada por gremio a la semana. Hasta dos fortalezas por gremio y una reclamación neutral semanal. Las conquistas tienen 24 h de protección.'));
 const status=el('p','Cargando territorios…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const summary=el('section'),list=el('div'),ranking=el('details'),history=el('details');
 list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr));gap:10px';host.append(status,summary,list,ranking,history);
 let lands=[],regions=[],guilds=[],wars=[],events=[],membership=[],reward=null,xp=0,busy=false,loading=false;
 const report=e=>{status.textContent=messages[e.message]||e.message||'Error de conexión'};
 async function load(message){if(loading||!host.isConnected)return;loading=true;try{
 const [a,b,c,d,e,f,g,h]=await Promise.all([sb.from('sb_territories').select('*'),sb.from('sb_world_regions').select('*').order('min_xp'),sb.from('sb_shadow_guilds').select('id,name,shield,owner_id,created_at').limit(1000),sb.from('sb_guild_wars').select('id,territory_id,status,challenger_name,defender_name,accept_by,ends_at').not('territory_id','is',null).in('status',['pending','active']),sb.from('sb_territory_history').select('*').order('created_at',{ascending:false}).limit(30),sb.from('sb_shadow_guild_members').select('guild_id,joined_at').eq('user_id',user.id),sb.from('sb_territory_rewards').select('*').eq('week_start',week()).maybeSingle(),sb.rpc('community_member_xp',{target_member:user.id})]);
 if(!host.isConnected)return;lands=check(a)||[];regions=check(b)||[];guilds=check(c)||[];wars=check(d)||[];events=check(e)||[];membership=check(f)||[];reward=check(g);xp=Number(check(h)||0);draw();status.textContent=message||'';
 }catch(e){report(e)}finally{loading=false}}
 async function action(t,move){if(busy||loading)return;const text=move==='claim'?'¿Reclamar '+t.fortress_name+'?':move==='challenge'?'¿Enviar una guerra territorial por '+t.fortress_name+'? El líder defensor debe aceptar.':'¿Reclamar la recompensa semanal de esta fortaleza?';if(!confirm(text))return;busy=true;try{check(await sb.rpc('sb_territory_manage',{target_region:t.region_id,action:move}));await load(move==='claim'?'¡Fortaleza reclamada!':move==='challenge'?'Desafío enviado. Continúa en Guerras de gremios.':'¡+30 XP y +3 fragmentos!');host.dispatchEvent(new CustomEvent('sb-territory-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
 function draw(){
 const own=guilds.find(g=>g.owner_id===user.id),mine=new Set(membership.map(m=>m.guild_id));if(own)mine.add(own.id);
 const held=lands.filter(t=>t.controller_id===own?.id).length,now=Date.now();
 summary.replaceChildren(el('h3','🏰 Imperios de las Sombras'),el('p',lands.filter(t=>t.controller_id).length+'/'+lands.length+' fortalezas ocupadas · '+(own?own.name+' controla '+held+'/2':'No lideras un gremio')),el('p',reward?'✅ Recompensa semanal reclamada':'🎁 Recompensa semanal: +30 XP y +3 fragmentos si perteneces a un gremio que controla una fortaleza durante 24 h. También necesitas 24 h de afiliación.'));
 list.replaceChildren();
 for(const t of [...lands].sort((a,b)=>regions.findIndex(r=>r.id===a.region_id)-regions.findIndex(r=>r.id===b.region_id))){
 const r=regions.find(x=>x.id===t.region_id),g=guilds.find(x=>x.id===t.controller_id),contest=wars.find(w=>w.territory_id===t.region_id&&(w.status==='pending'?Date.parse(w.accept_by)>now:Date.parse(w.ends_at)>now)),protectedNow=!!t.controller_id&&Date.parse(t.protected_until)>now,belongs=mine.has(t.controller_id),locked=xp<(r?.min_xp||0);
 const box=el('article');box.style.cssText='padding:14px;border:1px solid '+(belongs?'#4ade80':t.controller_id?'#c084fc':'#94a3b8')+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';
 box.append(el('h3',(r?.symbol||'🏰')+' '+t.fortress_name),el('p',(r?.name||t.region_id)+' · Rango '+(r?.rank_required||'E')),el('p',t.controller_id?'🚩 '+(g?g.shield+' '+g.name:'Gremio'):'⚪ Neutral'));
 if(protectedNow)box.append(el('p','🛡️ Protegida hasta '+new Date(t.protected_until).toLocaleString('es-ES')));
 if(contest)box.append(el('p','⚔️ '+contest.challenger_name+' vs '+contest.defender_name+' · '+(contest.status==='pending'?'Pendiente':'En guerra')));
 if(own&&t.controller_id!==own.id){const move=t.controller_id?'challenge':'claim';const b=btn(move==='claim'?'Reclamar fortaleza':'Desafiar defensor',()=>action(t,move));b.disabled=locked||held>=2||!!contest||protectedNow;box.append(b);if(locked)box.append(el('small','Requiere '+r.min_xp+' XP del líder.'))}
 if(belongs){const b=btn(reward?'Recompensa reclamada':'🎁 Reclamar recompensa semanal',()=>action(t,'reward'));const joined=own?.id===t.controller_id?own.created_at:membership.find(m=>m.guild_id===t.controller_id)?.joined_at;b.disabled=!!reward||Date.parse(t.controlled_at)>now-86400000||!joined||Date.parse(joined)>now-86400000;box.append(b)}
 list.append(box)
 }
 const ranks=guilds.map(g=>({g,count:lands.filter(t=>t.controller_id===g.id).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count||a.g.name.localeCompare(b.g.name));ranking.replaceChildren(el('summary','🏆 Clasificación de imperios'));const ol=el('ol');for(const x of ranks)ol.append(el('li',x.g.shield+' '+x.g.name+' · '+x.count+' fortalezas'));ranking.append(ranks.length?ol:el('p','Todavía no hay imperios.'));
 history.replaceChildren(el('summary','📜 Últimos movimientos territoriales'));for(const e of events)history.append(el('p',new Date(e.created_at).toLocaleString('es-ES')+' · '+e.guild_name+' · '+({claim:'Reclamó',capture:'Conquistó',defend:'Defendió'}[e.event])+' '+(lands.find(t=>t.region_id===e.region_id)?.fortress_name||e.region_id)));if(!events.length)history.append(el('p','No hay movimientos registrados.'));
 }
 host.append(btn('↻ Actualizar territorios',()=>load()),btn('⚔️ Ir a guerras de gremios',()=>{document.getElementById('sb-shadow-wars')?.scrollIntoView({behavior:'smooth'})}));await load();
}
return {mount};
})();