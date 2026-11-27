/* Shadow Universe 6.0 — cosmic creatures */
window.SBCosmicCreatures=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const colors={legendary:'#fbbf24',mythic:'#c084fc',cosmic:'#67e8f9'},rarity={legendary:'Legendaria',mythic:'Mítica',cosmic:'Cósmica'},stats={attack:'ataque',defense:'defensa',magic:'magia',heal:'curación'};
const errors={'Account restricted':'Tu cuenta no puede participar.','Planet requirement':'Necesitas colonizar el planeta indicado y mejorar su infraestructura.','Not enough cosmic dust':'No tienes suficiente polvo cósmico.','Incubation incomplete':'El huevo todavía está incubándose.','Egg required':'Primero consigue el huevo.','Hatch first':'Primero haz eclosionar el huevo.'};
const today=()=>new Date().toISOString().slice(0,10);
const stage=x=>x>=300?3:x>=100?2:1;
const evolved=(c,r)=>stage(r?.creature_xp||0)===3?c.evolution_two:stage(r?.creature_xp||0)===2?c.evolution_one:c.name;
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🐉 Santuario de criaturas cósmicas'),el('p','Incuba seis especies con polvo cósmico, haz eclosionar los huevos y entrena gratis una vez al día UTC por criatura. Evoluciones a 100 y 300 XP de criatura. Equipa una criatura cósmica: sus bonificaciones se fijan al comenzar un nuevo ascenso de la Torre Infinita o viaje temporal. No sustituye a tu mascota, dragón ancestral ni reliquia.'));
const status=el('p','Cargando santuario…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),filters=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px';host.append(status,info,filters,list);
let catalog=[],owned=[],planetCatalog=[],planets=[],dust=0,filter='all',busy=false,loading=false;
const get=id=>owned.find(r=>r.creature_id===id),planet=id=>planets.find(p=>p.planet_id===id),planetName=id=>planet(id)?.name||planetCatalog.find(p=>p.id===id)?.name||id;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e]=await Promise.all([sb.from('sb_cosmic_creature_catalog').select('*').order('dust_cost'),sb.from('sb_member_cosmic_creatures').select('*').eq('user_id',user.id),sb.from('sb_cosmic_wallet').select('dust').eq('user_id',user.id).maybeSingle(),sb.from('sb_cosmic_planet_catalog').select('id,name'),sb.from('sb_universe_planets').select('planet_id,name,level').eq('user_id',user.id)]);
if(!host.isConnected)return;catalog=check(a)||[];owned=check(b)||[];dust=check(c)?.dust||0;planetCatalog=check(d)||[];planets=check(e)||[];draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(c,action){if(busy||loading)return;if(action==='incubate'&&!confirm('¿Incubar '+c.name+' por '+c.dust_cost+' polvo cósmico?'))return;busy=true;try{const r=check(await sb.rpc('sb_cosmic_creature_manage',{target_creature:c.id,action}));await load(action==='incubate'?'¡Huevo en incubación!':action==='hatch'?'¡Ha nacido '+c.name+'!':action==='train'?'Entrenamiento registrado · '+r.creature_xp+' XP.':'Santuario actualizado.');host.dispatchEvent(new CustomEvent('sb-cosmic-creature-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function draw(){
const born=owned.filter(r=>r.hatched_at),active=born.find(r=>r.equipped),ac=catalog.find(c=>c.id===active?.creature_id);
info.replaceChildren(el('h3','Mi colección cósmica'),el('p','✨ '+dust+' polvo cósmico · '+born.length+'/'+catalog.length+' criaturas nacidas · '+(owned.length-born.length)+' huevos'),el('p',ac?'Equipada: '+evolved(ac,active)+' · +'+(ac.bonus+stage(active.creature_xp)-1)+' '+stats[ac.stat]:'Sin criatura cósmica equipada'));
const meter=el('progress');meter.max=Math.max(1,catalog.length);meter.value=born.length;meter.style.width='100%';meter.setAttribute('aria-label','Colección de criaturas');info.append(meter);
if(born.length)info.append(el('p','🎖️ Criador estelar'));if(born.some(r=>r.creature_xp>=300))info.append(el('p','🏆 Maestro cósmico'));if(catalog.length===6&&born.length===6)info.append(el('p','👑 Señor de las criaturas cósmicas'));
filters.replaceChildren();for(const [id,label] of [['all','Todas'],['egg','Incubando'],['born','Criaturas'],['locked','Por conseguir']]){const b=btn(label,()=>{filter=id;draw()});b.disabled=filter===id;filters.append(b)}
list.replaceChildren();for(const c of catalog){const r=get(c.id);if(filter==='egg'&&(!r||r.hatched_at)||filter==='born'&&!r?.hatched_at||filter==='locked'&&r)continue;
const color=colors[c.rarity],card=el('article');card.style.cssText='padding:14px;border:1px solid '+color+';border-radius:14px;background:radial-gradient(ellipse at top,#45304a,#211633);color:white;overflow-wrap:anywhere';
const icon=el('div',r&&!r.hatched_at?'🥚':c.symbol);icon.style.cssText='font-size:45px;text-align:center';card.append(icon,el('h3',evolved(c,r)),el('p',rarity[c.rarity]+(r?.equipped?' · Equipada':'')),el('p',c.description),el('p','Planeta: '+planetName(c.planet_id)+' · Nivel '+c.min_planet_level),el('p','+'+(c.bonus+stage(r?.creature_xp||0)-1)+' '+stats[c.stat]+' en torre y viajes temporales'),el('small','Evoluciones: '+c.evolution_one+' → '+c.evolution_two));
if(!r){const ok=(planet(c.planet_id)?.level||0)>=c.min_planet_level;card.append(el('p','🥚 '+c.dust_cost+' polvo · '+c.incubation_hours+' horas de incubación'));const b=btn(ok?'Incubar huevo':'🔒 Planeta requerido',()=>act(c,'incubate'));b.disabled=!ok||dust<c.dust_cost;card.append(b)}
else if(!r.hatched_at){const remaining=Math.max(0,Date.parse(r.incubates_until)-Date.now());card.append(el('p',remaining?'Incubación hasta '+new Date(r.incubates_until).toLocaleString('es-ES'):'¡Huevo listo para eclosionar!'));const b=btn('Hacer eclosionar',()=>act(c,'hatch'));b.disabled=remaining>0;card.append(b)}
else{const xp=r.creature_xp,lv=stage(xp),p=el('progress');p.max=400;p.value=xp;p.style.cssText='width:100%;accent-color:'+color;p.setAttribute('aria-label','Experiencia de criatura');card.append(el('p','Evolución '+lv+'/3 · '+xp+'/400 XP'),p);const b=btn(xp>=400?'Entrenamiento máximo':r.trained_day===today()?'✓ Entrenada hoy':'Entrenar · +25 XP',()=>act(c,'train'));b.disabled=xp>=400||r.trained_day===today();card.append(b,btn(r.equipped?'Desequipar':'Equipar',()=>act(c,r.equipped?'unequip':'equip')))}list.append(card)}
if(!list.children.length)list.append(el('p','No hay criaturas en este filtro.'));
}
host.append(btn('↻ Actualizar santuario',()=>load()),btn('🌌 Ir a mi universo',()=>document.getElementById('sb-shadow-multiverse')?.scrollIntoView({behavior:'smooth'})));
host.parentElement?.addEventListener('sb-cosmic-changed',()=>{if(host.isConnected)load()});await load();
}
return {mount};
})();