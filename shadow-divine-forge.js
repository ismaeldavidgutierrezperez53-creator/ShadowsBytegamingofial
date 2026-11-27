/* Shadow Universe 4.0 — celestial forge */
window.SBDivineForge=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Requirements insufficient':'Todavía no cumples los requisitos.','Not enough crystals':'No tienes suficientes cristales.','Not enough shards':'No tienes suficientes fragmentos.','Maximum level':'Nivel máximo alcanzado.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','⚔️ Forja Celestial · Armas divinas'),el('p','Fabrica reliquias de rareza divina con fragmentos y cristales dimensionales. Equipa una en una ranura independiente del equipo normal. Mejora hasta nivel 5 para alcanzar su forma definitiva. Cada nivel añade +1 ataque y +5 daño especial; el último añade +1 defensa. Las bonificaciones se fijan al iniciar nuevas mazmorras individuales y dimensiones.'));
const status=el('p','Cargando forja…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr));gap:10px';host.append(status,info,list);
let catalog=[],owned=[],xp=0,tier=0,shards=0,crystals=0,busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f]=await Promise.all([sb.from('sb_divine_catalog').select('*').order('min_xp'),sb.from('sb_member_divine_weapons').select('*').eq('user_id',user.id),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_ascension_trials').select('tier').eq('user_id',user.id).eq('status','won'),sb.from('sb_gear_wallet').select('shards').eq('user_id',user.id).maybeSingle(),sb.from('sb_dimension_wallet').select('crystals').eq('user_id',user.id).maybeSingle()]);
if(!host.isConnected)return;catalog=check(a)||[];owned=check(b)||[];xp=Number(check(c)||0);tier=Math.max(0,...(check(d)||[]).map(x=>x.tier));shards=Number(check(e)?.shards||0);crystals=Number(check(f)?.crystals||0);draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
async function act(c,r,action){if(busy||loading)return;const level=r?.level||1;if(['forge','upgrade'].includes(action)&&!confirm((action==='forge'?'Forjar '+c.name:'Mejorar '+c.name+' a nivel '+(level+1))+' por '+(action==='forge'?c.crystals:level)+' cristales y '+(action==='forge'?c.shards:3*level)+' fragmentos?'))return;busy=true;try{check(await sb.rpc('sb_divine_manage',{target_weapon:c.id,action,expected_level:r?.level??null}));await load('Forja actualizada.');host.dispatchEvent(new CustomEvent('sb-divine-changed',{bubbles:true}))}catch(e){report(e)}finally{busy=false}}
function draw(){
const active=owned.find(x=>x.equipped),c0=catalog.find(x=>x.id===active?.weapon_id);
info.replaceChildren(el('h3','Mi armería divina'),el('p','💠 '+crystals+' cristales · 💎 '+shards+' fragmentos · '+xp+' XP · Ascensión '+tier),el('p',owned.length+'/'+catalog.length+' reliquias forjadas'),el('p',c0?'Equipada: '+(active.level===5?c0.evolution_name:c0.name):'Sin arma divina equipada'));
if(owned.length)info.append(el('p','🎖️ Herrero celestial'));if(owned.some(r=>r.level===5))info.append(el('p','👑 Maestro de la forja divina'));if(catalog.length&&owned.length===catalog.length)info.append(el('p','🌌 Arsenal de los dioses'));
list.replaceChildren();for(const c of catalog){const r=owned.find(x=>x.weapon_id===c.id),level=r?.level||1,locked=xp<c.min_xp||tier<c.min_ascension,card=el('article');card.style.cssText='padding:14px;border:1px solid #fbbf24;border-radius:14px;background:radial-gradient(ellipse at top,#45304a,#211633);color:#fff;overflow-wrap:anywhere';
const icon=el('div',c.symbol);icon.style.cssText='font-size:42px;text-align:center';card.append(icon,el('h3',level===5?c.evolution_name:c.name),el('p','✦ Divina · Nivel '+level+'/5'+(r?.equipped?' · Equipada':'')),el('p','Requisito: '+c.min_xp+' XP · Ascensión '+c.min_ascension),el('p','+'+(c.attack+level-1)+' ataque · '+(c.defense+(level===5?1:0))+' defensa'),el('p',c.power_name+' · '+(c.power_damage+5*(level-1))+' daño'+(c.power_heal?' · +'+c.power_heal+' PV':'')),el('small','Una técnica por expedición. Forma definitiva: '+c.evolution_name));
if(!r){const b=btn('Forjar · '+c.crystals+' 💠 / '+c.shards+' 💎',()=>act(c,null,'forge'));b.disabled=locked||crystals<c.crystals||shards<c.shards;card.append(b)}
else{const b=btn(level===5?'Nivel máximo':'Mejorar · '+level+' 💠 / '+3*level+' 💎',()=>act(c,r,'upgrade'));b.disabled=level===5||locked||crystals<level||shards<3*level;const equip=btn(r.equipped?'Desequipar':'Equipar',()=>act(c,r,r.equipped?'unequip':'equip'));equip.disabled=!r.equipped&&locked;card.append(b,equip)}list.append(card)}
}
host.append(btn('↻ Actualizar forja',()=>load()));host.parentElement?.addEventListener('sb-dimension-won',()=>{if(host.isConnected)load()});host.parentElement?.addEventListener('sb-invasion-changed',()=>{if(host.isConnected)load()});await load();
}
return {mount};
})();