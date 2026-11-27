/* Shadow Universe 5.0 — legendary quest board */
window.SBLegendaryMissions=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const chains=[['exploration','🗺️ Caminos del infinito','#67e8f9'],['combat','⚔️ Senda del conquistador','#fb7185'],['creatures','🐉 Legado de las bestias','#4ade80'],['mastery','🔱 Legado del eclipse','#fbbf24']];
const errors={'Account restricted':'Tu cuenta no puede participar.','Previous mission required':'Reclama primero las misiones anteriores de esta cadena.','Objective incomplete':'Todavía no completaste el objetivo.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','📜 Tablón de misiones legendarias'),el('p','Completa cuatro cadenas de tres misiones. Los objetivos acumulados se calculan con tu progreso real, incluido el anterior a esta actualización. Reclama las recompensas en orden dentro de cada cadena. Cada misión se cobra una sola vez.'));
const status=el('p','Cargando misiones…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),filters=el('section'),list=el('div'),history=el('details');host.append(status,info,filters,list,history);
let catalog=[],claims=[],progress={},filter='all',busy=false,loading=false;
const done=id=>claims.some(c=>c.mission_id===id),ready=c=>Number(progress[c.objective]||0)>=c.target,previous=c=>catalog.filter(m=>m.chain_id===c.chain_id&&m.step<c.step).every(m=>done(m.id));
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c]=await Promise.all([sb.from('sb_legendary_missions').select('*').order('step'),sb.from('sb_legendary_claims').select('*').eq('user_id',user.id).order('claimed_at',{ascending:false}),sb.rpc('sb_legendary_progress')]);if(!host.isConnected)return;
catalog=check(a)||[];claims=check(b)||[];progress=check(c)||{};draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function claim(c){if(busy||loading)return;busy=true;try{const r=check(await sb.rpc('sb_legendary_claim',{target_mission:c.id}));await load('¡Misión completada! +'+r.xp+' XP · '+r.shards+' fragmentos · '+r.crystals+' cristales.');host.dispatchEvent(new CustomEvent('sb-legendary-claimed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function draw(){
const titles=catalog.filter(c=>c.title&&done(c.id)),totals=claims.reduce((a,c)=>({xp:a.xp+c.xp,shards:a.shards+c.shards,crystals:a.crystals+c.crystals}),{xp:0,shards:0,crystals:0});
info.replaceChildren(el('h3','Mi progreso legendario'),el('p',claims.length+'/'+catalog.length+' misiones reclamadas · '+titles.length+'/4 títulos'),el('p','Recompensas obtenidas: '+totals.xp+' XP · 💎 '+totals.shards+' · 💠 '+totals.crystals));
const meter=el('progress');meter.max=Math.max(1,catalog.length);meter.value=claims.length;meter.style.width='100%';meter.setAttribute('aria-label','Progreso de las misiones');info.append(meter);
if(titles.length){info.append(el('h4','Mis títulos legendarios'));for(const t of titles)info.append(el('p','🏆 '+t.title))}if(catalog.length===12&&claims.length===12)info.append(el('p','👑 Leyenda del universo'));
filters.replaceChildren();for(const [id,label] of [['all','Todas'],['ready','Reclamables'],['pending','Pendientes'],['done','Completadas']]){const b=btn(label,()=>{filter=id;draw()});b.disabled=filter===id;filters.append(b)}
list.replaceChildren();
for(const [id,label,color] of chains){const entries=catalog.filter(c=>c.chain_id===id).sort((a,b)=>a.step-b.step),visible=entries.filter(c=>filter==='all'||filter==='ready'&&!done(c.id)&&ready(c)&&previous(c)||filter==='pending'&&!done(c.id)||filter==='done'&&done(c.id));if(!visible.length)continue;
const group=el('section');group.style.cssText='border:1px solid '+color+';border-radius:14px;padding:12px;margin:12px 0;background:#211633;color:white';group.append(el('h3',label+' · '+entries.filter(c=>done(c.id)).length+'/3'));
for(const c of visible){const claimed=done(c.id),unlocked=previous(c),value=Math.min(c.target,Number(progress[c.objective]||0)),card=el('article');card.style.cssText='padding:12px;margin:8px 0;background:#30213d;border:1px solid '+(claimed?'#4ade80':color)+';border-radius:10px;overflow-wrap:anywhere';
card.append(el('h4',c.symbol+' '+c.step+'. '+c.name),el('p',c.description),el('p',value+'/'+c.target+' · '+(claimed?'Reclamada':!unlocked?'Cadena bloqueada':ready(c)?'Recompensa disponible':'En progreso')));
const p=el('progress');p.max=c.target;p.value=claimed?c.target:value;p.style.cssText='width:100%;accent-color:'+color;p.setAttribute('aria-label','Progreso del objetivo');card.append(p,el('p','🎁 '+c.xp+' XP · '+c.shards+' fragmentos · '+c.crystals+' cristales'));
if(c.title)card.append(el('p','👑 Título: '+c.title));
const b=btn(claimed?'✓ Reclamada':!unlocked?'🔒 Reclama etapa anterior':!ready(c)?'Objetivo pendiente':'Reclamar recompensa',()=>claim(c));b.disabled=claimed||!unlocked||!ready(c);card.append(b);group.append(card)}list.append(group)}
if(!list.children.length)list.append(el('p','No hay misiones en este filtro.'));
const open=history.open;history.replaceChildren(el('summary','📜 Historial de recompensas'));history.open=open;
for(const r of claims){const c=catalog.find(m=>m.id===r.mission_id);history.append(el('p',new Date(r.claimed_at).toLocaleString('es-ES')+' · '+(c?.name||r.mission_id)+' · +'+r.xp+' XP / '+r.shards+' fragmentos / '+r.crystals+' cristales'))}
if(!claims.length)history.append(el('p','Aún no has reclamado misiones.'));
}
host.append(btn('↻ Actualizar misiones',()=>load()));await load();
}
return {mount};
})();