/* Shadow Universe 3.0 — crafting workshop */
window.SBCrafting=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(text,fn)=>{const b=el('button',text);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Rank insufficient':'Necesitas más XP de cazador.','Craft level insufficient':'Necesitas más XP de artesanía.','Gear already owned':'Ya tienes esta pieza.','Not enough materials':'No tienes suficientes materiales.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🔨 Taller de fabricación'),el('p','Explora para obtener 2 hierbas y, si encuentras tesoro, 2 esencias. Las victorias en mazmorras individuales dan mineral oscuro y esencia. Fabrica objetos con esos materiales, sin gastar fragmentos ni XP de cazador.'));
const status=el('p','Cargando taller…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const info=el('section'),filters=el('section'),list=el('div'),history=el('details');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr));gap:10px';host.append(status,info,filters,list,history);
let materials=[],inventory=[],recipes=[],gear=[],progress=null,logs=[],xp=0,busy=false,loading=false,filter='all',pending=null;
const qty=id=>inventory.find(x=>x.material_id===id)?.quantity||0;
const mat=id=>materials.find(x=>x.id===id);
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f,g]=await Promise.all([sb.from('sb_craft_materials').select('*'),sb.from('sb_craft_inventory').select('*').eq('user_id',user.id),sb.from('sb_craft_recipes').select('*').order('min_xp').order('min_craft_xp'),sb.from('sb_member_gear').select('item_id').eq('user_id',user.id),sb.from('sb_craft_progress').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_craft_log').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20),sb.rpc('community_member_xp',{target_member:user.id})]);
if(!host.isConnected)return;materials=check(a)||[];inventory=check(b)||[];recipes=check(c)||[];gear=check(d)||[];progress=check(e);logs=check(f)||[];xp=Number(check(g)||0);draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function craft(r){
if(busy||loading)return;if(!confirm('¿Fabricar '+r.name+' consumiendo los materiales indicados?'))return;busy=true;
try{if(!pending||pending.recipe!==r.id)pending={recipe:r.id,key:crypto.randomUUID()};const result=await sb.rpc('sb_craft_make',{target_recipe:r.id,request_key:pending.key});if(result.error){if(result.error.code==='P0001')pending=null;throw result.error}pending=null;await load('¡'+r.name+' fabricado! +'+r.craft_xp+' XP de artesanía.');host.dispatchEvent(new CustomEvent('sb-craft-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function draw(){
const cx=Number(progress?.xp||0);
info.replaceChildren(el('h3','🎒 Materiales y artesanía'),el('p','Nivel '+(1+Math.floor(cx/50))+' · '+cx+' XP de artesanía · '+(progress?.crafted||0)+' objetos fabricados'));
for(const m of materials)info.append(el('p',m.symbol+' '+m.name+' ×'+qty(m.id)+' · '+m.description));
if(cx>0)info.append(el('p','🎖️ Aprendiz de artesano'));if(cx>=150)info.append(el('p','👑 Maestro artesano'));
filters.replaceChildren();for(const [v,label] of [['all','Todas'],['available','Fabricables'],['gear','Equipamiento'],['potion','Pociones']]){const b=btn(label,()=>{filter=v;draw()});b.setAttribute('aria-pressed',String(filter===v));filters.append(b)}
list.replaceChildren();
for(const r of recipes){const owned=!!r.gear_id&&gear.some(g=>g.item_id===r.gear_id),rankLocked=xp<r.min_xp,levelLocked=cx<r.min_craft_xp,missing=Object.entries(r.materials).some(([id,n])=>qty(id)<n),available=!owned&&!rankLocked&&!levelLocked&&!missing;
if(filter==='available'&&!available||filter==='gear'&&!r.gear_id||filter==='potion'&&r.output_material!=='potion')continue;
const card=el('article');card.style.cssText='padding:14px;border:1px solid '+(r.min_xp>=2500?'#fbbf24':r.min_xp>=900?'#c084fc':'#60a5fa')+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';
const icon=el('div',r.symbol);icon.style.cssText='font-size:36px;text-align:center';card.append(icon,el('h3',r.name),el('p','Requiere '+r.min_xp+' XP de cazador · '+r.min_craft_xp+' XP de artesanía'));
for(const [id,n] of Object.entries(r.materials))card.append(el('p',(mat(id)?.symbol||'')+' '+(mat(id)?.name||id)+': '+qty(id)+'/'+n));
card.append(el('p','+'+r.craft_xp+' XP de artesanía'));const b=btn(owned?'✓ Ya obtenida':rankLocked?'🔒 Rango insuficiente':levelLocked?'🔒 Artesanía insuficiente':missing?'Faltan materiales':'Fabricar',()=>craft(r));b.disabled=!available;card.append(b);list.append(card)}
if(!list.children.length)list.append(el('p','No hay recetas en este filtro.'));
history.replaceChildren(el('summary','📜 Historial de fabricación'));for(const l of logs)history.append(el('p',new Date(l.created_at).toLocaleString('es-ES')+' · '+(recipes.find(r=>r.id===l.recipe_id)?.name||l.recipe_id)+' · +'+l.craft_xp+' XP'));if(!logs.length)history.append(el('p','Todavía no has fabricado objetos.'));
}
host.append(btn('↻ Actualizar taller',()=>load()));host.parentElement?.addEventListener('sb-world-explored',()=>{if(host.isConnected)load()});await load();
}
return {mount};
})();