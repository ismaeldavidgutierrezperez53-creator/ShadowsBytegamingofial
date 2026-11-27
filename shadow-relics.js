/* Shadow Universe 5.0 — ancestral relics */
window.SBRelics=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const names={legendary:'Legendaria',mythic:'Mítica',divine:'Divina'},colors={legendary:'#fbbf24',mythic:'#c084fc',divine:'#67e8f9'},stats={attack:'ataque',defense:'defensa',magic:'magia',heal:'curación'};
const errors={'Account restricted':'Tu cuenta no puede participar.','Achievement required':'Todavía no cumples el logro requerido.','Maximum level':'Nivel máximo alcanzado.','Not enough shards':'No tienes suficientes fragmentos.','Not enough crystals':'No tienes suficientes cristales.','Relic not owned':'Primero desbloquea la reliquia.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🔱 Museo de reliquias ancestrales'),el('p','Colecciona ocho artefactos de la historia del universo. Desbloquéalos gratis mediante logros ya obtenidos o nuevos. Mejora tus reliquias hasta nivel 3 y equipa una en una ranura independiente. Su bonificación se aplica al iniciar un nuevo ascenso de la Torre Infinita; no modifica los combates en curso.'));
const status=el('p','Cargando museo…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),filters=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px';host.append(status,info,filters,list);
let catalog=[],owned=[],progress={},shards=0,crystals=0,filter='all',busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e]=await Promise.all([sb.from('sb_relic_catalog').select('*').order('rarity'),sb.from('sb_member_relics').select('*').eq('user_id',user.id),sb.rpc('sb_relic_progress'),sb.from('sb_gear_wallet').select('shards').eq('user_id',user.id).maybeSingle(),sb.from('sb_dimension_wallet').select('crystals').eq('user_id',user.id).maybeSingle()]);
if(!host.isConnected)return;catalog=check(a)||[];owned=check(b)||[];progress=check(c)||{};shards=check(d)?.shards||0;crystals=check(e)?.crystals||0;draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action,c,r){if(busy||loading)return;if(action==='upgrade'&&!confirm('¿Mejorar '+c.name+' por '+2*r.level+' fragmentos y '+r.level+' cristales?'))return;busy=true;try{check(await sb.rpc('sb_relic_manage',{action,target_relic:c.id,expected_level:r?.level??null}));await load(action==='unlock'?'¡Reliquia desbloqueada!':'Museo actualizado.');host.dispatchEvent(new CustomEvent('sb-relic-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function draw(){
const active=owned.find(r=>r.equipped),ac=catalog.find(c=>c.id===active?.relic_id);
info.replaceChildren(el('h3','Mi museo'),el('p',owned.length+'/'+catalog.length+' reliquias · 💎 '+shards+' fragmentos · 💠 '+crystals+' cristales'),el('p',ac?'Equipada: '+(active.level===3?ac.evolution_name:ac.name)+' · +'+(ac.bonus+active.level-1)+' '+stats[ac.stat]:'Sin reliquia equipada'));
const p=el('progress');p.max=Math.max(1,catalog.length);p.value=owned.length;p.style.width='100%';p.setAttribute('aria-label','Colección del museo');info.append(p);
if(owned.length)info.append(el('p','🎖️ Buscador de reliquias'));if(owned.some(x=>x.level===3))info.append(el('p','🏆 Maestro de artefactos'));if(catalog.length&&owned.length===catalog.length)info.append(el('p','👑 Guardián del museo ancestral'));
filters.replaceChildren();for(const [id,label] of [['all','Todas'],['owned','Conseguidas'],['locked','Pendientes'],['divine','Divinas']]){const b=btn(label,()=>{filter=id;draw()});b.disabled=filter===id;filters.append(b)}
list.replaceChildren();for(const c of catalog){const r=owned.find(x=>x.relic_id===c.id);if(filter==='owned'&&!r||filter==='locked'&&r||filter==='divine'&&c.rarity!=='divine')continue;
const lv=r?.level||1,value=Number(progress[c.id]||0),ready=value>=c.threshold,color=colors[c.rarity],card=el('article');card.style.cssText='padding:14px;border:1px solid '+color+';border-radius:14px;background:radial-gradient(ellipse at top,#45304a,#211633);color:white;overflow-wrap:anywhere';
const icon=el('div',c.symbol);icon.style.cssText='font-size:45px;text-align:center';card.append(icon,el('h3',lv===3?c.evolution_name:c.name),el('p',names[c.rarity]+' · '+(r?'Nivel '+lv+'/3':'Sin desbloquear')+(r?.equipped?' · Equipada':'')),el('p',c.description),el('p','+'+(c.bonus+lv-1)+' '+stats[c.stat]+' en la torre'),el('p',c.requirement+' · '+Math.min(value,c.threshold)+'/'+c.threshold));
const p=el('progress');p.max=c.threshold;p.value=Math.min(value,c.threshold);p.style.cssText='width:100%;accent-color:'+color;p.setAttribute('aria-label','Progreso del logro');card.append(p,el('small','Evolución final: '+c.evolution_name));
if(!r){const b=btn(ready?'Desbloquear gratis':'🔒 Logro pendiente',()=>act('unlock',c,null));b.disabled=!ready;card.append(b)}
else{const b=btn(lv===3?'Nivel máximo':'Mejorar · '+2*lv+' 💎 / '+lv+' 💠',()=>act('upgrade',c,r));b.disabled=lv===3||shards<2*lv||crystals<lv;card.append(b,btn(r.equipped?'Desequipar':'Equipar',()=>act(r.equipped?'unequip':'equip',c,r)))}list.append(card)}
if(!list.children.length)list.append(el('p','No hay reliquias en este filtro.'));
}
host.append(btn('↻ Actualizar museo',()=>load()),btn('🗼 Ir a la Torre Infinita',()=>document.getElementById('sb-shadow-tower')?.scrollIntoView({behavior:'smooth'})));host.parentElement?.addEventListener('sb-tower-cleared',()=>{if(host.isConnected)load()});await load();
}
return {mount};
})();