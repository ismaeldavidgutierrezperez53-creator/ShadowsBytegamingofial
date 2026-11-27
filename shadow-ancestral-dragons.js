/* Shadow Universe 4.0 — ancestral dragon sanctuary */
window.SBAncestralDragons=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const colors={legendary:'#fbbf24',mythic:'#c084fc',divine:'#fb7185'},rarities={legendary:'Legendaria',mythic:'Mítica',divine:'Divina'};
const errors={'Account restricted':'Tu cuenta no puede participar.','Requirements insufficient':'Todavía no cumples los requisitos.','Not enough crystals':'No tienes suficientes cristales dimensionales.','Incubation unfinished':'El huevo todavía está incubándose.','Dragon not hatched':'Primero debes hacer eclosionar el huevo.','Already trained':'Ya entrenaste este dragón hoy.','Maximum level':'Nivel máximo alcanzado.'};
const today=()=>new Date().toISOString().slice(0,10);
function effects(c,r){const x=r?.dragon_xp||0,s=x>=300?2:x>=100?1:0;return {name:[c.name,c.evolution_one,c.evolution_two][s],damage:c.damage+s*5,defense:c.defense+(s===2?1:0)}}
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🐉 Santuario de dragones ancestrales'),el('p','Invierte cristales dimensionales en huevos de especie conocida, incuba y haz eclosionar cada dragón. Entrena una vez al día por dragón (+25 XP, UTC), evoluciona a los 100 y 300 XP y equipa uno. Su poder y protección se fijan al comenzar nuevas mazmorras individuales o dimensiones.'));
const status=el('p','Cargando santuario…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr));gap:10px';host.append(status,info,list);
let catalog=[],owned=[],crystals=0,xp=0,ascension=0,busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{const [a,b,c,d,e]=await Promise.all([sb.from('sb_ancestral_dragon_catalog').select('*').order('min_xp'),sb.from('sb_member_ancestral_dragons').select('*').eq('user_id',user.id),sb.from('sb_dimension_wallet').select('crystals').eq('user_id',user.id).maybeSingle(),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_ascension_trials').select('tier').eq('user_id',user.id).eq('status','won')]);if(!host.isConnected)return;catalog=check(a)||[];owned=check(b)||[];crystals=Number(check(c)?.crystals||0);xp=Number(check(d)||0);ascension=Math.max(0,...(check(e)||[]).map(x=>x.tier));draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
async function act(c,action){if(busy||loading)return;if(action==='incubate'&&!confirm('¿Gastar '+c.crystal_cost+' cristales para incubar a '+c.name+'?'))return;busy=true;try{check(await sb.rpc('sb_dragon_manage',{target_dragon:c.id,action}));await load(({incubate:'¡Huevo incubándose!',hatch:'¡Tu dragón ha nacido!',train:'Entrenamiento completado.',equip:'Dragón equipado.',unequip:'Dragón desequipado.'})[action]);host.dispatchEvent(new CustomEvent('sb-dragon-changed',{bubbles:true}))}catch(e){report(e)}finally{busy=false}}
function draw(){
const active=owned.find(r=>r.equipped),ac=catalog.find(c=>c.id===active?.dragon_id),hatched=owned.filter(r=>r.hatched_at);
info.replaceChildren(el('h3','Mi santuario'),el('p','💠 '+crystals+' cristales · '+hatched.length+'/'+catalog.length+' dragones nacidos · '+(owned.length-hatched.length)+' huevos en incubación'));
if(ac){const f=effects(ac,active);info.append(el('p','🐉 Dragón activo: '+f.name+' · '+f.damage+' daño especial · '+f.defense+' defensa'),btn('Desequipar',()=>act(ac,'unequip')))}else info.append(el('p','Sin dragón equipado.'));
if(hatched.length)info.append(el('p','🎖️ Domador ancestral'));if(hatched.some(r=>r.dragon_xp>=300))info.append(el('p','🐉 Maestro de dragones'));if(catalog.length&&hatched.length===catalog.length)info.append(el('p','👑 Guardián del santuario'));
list.replaceChildren();
for(const c of catalog){const r=owned.find(x=>x.dragon_id===c.id),f=effects(c,r),locked=xp<c.min_xp||ascension<c.min_ascension,card=el('article');card.style.cssText='padding:14px;border:1px solid '+colors[c.rarity]+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';const icon=el('div',r?.hatched_at?c.symbol:r?'🥚':'🔒');icon.style.cssText='font-size:42px;text-align:center';card.append(icon,el('h3',f.name),el('p',rarities[c.rarity]+' · '+c.element),el('p','Requisitos: '+c.min_xp+' XP · Ascensión '+c.min_ascension),el('p',c.power_name+' · '+f.damage+' daño · '+f.defense+' defensa'+(c.heal?' · +'+c.heal+' PV al invocar':'')),el('small',c.name+' → '+c.evolution_one+' (100 XP) → '+c.evolution_two+' (300 XP)'));
if(!r){const b=btn(locked?'Requisitos pendientes':'Incubar · 💠 '+c.crystal_cost,()=>act(c,'incubate'));b.disabled=locked||crystals<c.crystal_cost;card.append(el('p','Incubación: '+c.incubation_hours+' horas'),b)}
else if(!r.hatched_at){const ready=Date.parse(r.incubates_until)<=Date.now(),b=btn(ready?'Hacer eclosionar':'Incubando…',()=>act(c,'hatch'));b.disabled=!ready;card.append(el('p','Nacimiento disponible: '+new Date(r.incubates_until).toLocaleString('es-ES')),b)}
else{card.append(el('p','Nivel '+(1+Math.floor(r.dragon_xp/40))+'/11 · '+r.dragon_xp+' XP'+(r.equipped?' · ✅ Equipado':'')));const p=el('progress');p.max=400;p.value=r.dragon_xp;p.style.width='100%';card.append(p);const train=btn(r.trained_day===today()?'✓ Entrenado hoy':'Entrenar (+25 XP)',()=>act(c,'train'));train.disabled=r.trained_day===today()||r.dragon_xp>=400;const equip=btn(r.equipped?'Desequipar':'Equipar',()=>act(c,r.equipped?'unequip':'equip'));equip.disabled=!r.equipped&&locked;card.append(train,equip)}list.append(card)}
}
host.append(btn('↻ Actualizar santuario',()=>load()),btn('🌌 Ir a dimensiones',()=>document.getElementById('sb-shadow-dimensions')?.scrollIntoView({behavior:'smooth'})));host.parentElement?.addEventListener('sb-dimension-won',()=>{if(host.isConnected)load()});await load();
}
return {mount};
})();