/* Shadow Universe 2.0 — equipment, dungeon loot and forge. */
window.SBGear=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const slots={weapon:'🗡️ Arma',armor:'🛡️ Armadura',accessory:'💍 Accesorio'};
const rarity={common:['Común','#94a3b8'],rare:['Rara','#60a5fa'],epic:['Épica','#c084fc'],legendary:['Legendaria','#fbbf24']};
const errors={'Account restricted':'Tu cuenta no puede realizar esta acción.','Item not owned':'No tienes esta pieza.','Level changed':'El nivel ha cambiado. Actualiza el inventario.','Maximum level':'La pieza ya está al nivel máximo.','Not enough shards':'No tienes suficientes fragmentos.'};
const attack=(c,g)=>c.attack+(c.attack>0?g.level-1:0),defense=(c,g)=>c.defense+(c.defense>0?g.level-1:0);
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🗡️ Armas y equipamiento'),el('p','Reclama tu equipo inicial gratuito. Conquista mazmorras para conseguir piezas y fragmentos. Equipa un arma, una armadura y un accesorio; mejora cada pieza hasta el nivel 5.'));
 const status=el('p','Cargando inventario…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const summary=el('section'),filters=el('div'),list=el('div'),history=el('details');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px';
 const category=el('select');category.setAttribute('aria-label','Tipo de equipamiento');for(const [v,t] of [['all','Todos los tipos'],...Object.entries(slots)]){const o=el('option',t);o.value=v;category.append(o)}
 const quality=el('select');quality.setAttribute('aria-label','Rareza');for(const [v,t] of [['all','Todas las rarezas'],...Object.entries(rarity).map(([k,v])=>[k,v[0]])]){const o=el('option',t);o.value=v;quality.append(o)}
 const ownedOnly=el('input');ownedOnly.type='checkbox';const ownedLabel=el('label',' Solo obtenidos');ownedLabel.prepend(ownedOnly);filters.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center';filters.append(category,quality,ownedLabel);
 host.append(status,summary,filters,list,history);let catalog=[],items=[],wallet=null,loot=[],busy=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){
 const [a,b,c,d]=await Promise.all([sb.from('sb_gear_catalog').select('*'),sb.from('sb_member_gear').select('*').eq('user_id',user.id),sb.from('sb_gear_wallet').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_gear_loot').select('*').eq('user_id',user.id).order('awarded_at',{ascending:false}).limit(20)]);
 if(!host.isConnected)return;catalog=check(a)||[];items=check(b)||[];wallet=check(c);loot=check(d)||[];draw();status.textContent=message||'';
 }
 async function act(action,id=null,level=null){if(busy)return;busy=true;try{check(await sb.rpc('sb_gear_manage',{requested_action:action,target_item:id,expected_level:level}));await load(action==='starter'?'¡Equipo inicial recibido!':action==='upgrade'?'¡Pieza mejorada!':action==='equip'?'Pieza equipada.':'Pieza desequipada.')}catch(e){report(e)}finally{busy=false}}
 function draw(){
 const equipped=items.filter(g=>g.equipped);let atk=0,def=0;
 summary.replaceChildren(el('h3','🎒 Mi equipo'),el('p','💎 '+(wallet?.shards||0)+' fragmentos de forja · '+items.length+'/'+catalog.length+' piezas obtenidas'));
 if(!wallet?.starter_claimed)summary.append(btn('🎁 Reclamar equipo inicial',()=>act('starter')));
 for(const [slot,label] of Object.entries(slots)){const g=equipped.find(x=>x.slot===slot),c=catalog.find(x=>x.id===g?.item_id);const row=el('div');row.style.cssText='padding:9px;margin:6px 0;border:1px solid #a855f766;border-radius:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center';row.append(el('strong',label+': '+(c?c.name+' · Nv. '+g.level:'Vacío')));if(c){atk+=attack(c,g);def+=defense(c,g);row.append(btn('Desequipar',()=>act('unequip',g.item_id)))}summary.append(row)}
 summary.append(el('p','⚔️ Ataque adicional: +'+Math.min(20,atk)+' · 🛡️ Defensa: '+Math.min(10,def)+' de reducción de daño'));summary.append(el('small','Los límites de combate son +20 ataque y 10 defensa. El equipo se fija al comenzar una nueva expedición.'));
 if(items.length)summary.append(el('p','🎖️ Primer equipo'));if(items.some(g=>g.level===5))summary.append(el('p','🔨 Maestro de la forja'));
 list.replaceChildren();const sorted=[...catalog].sort((a,b)=>Object.keys(slots).indexOf(a.slot)-Object.keys(slots).indexOf(b.slot)||Object.keys(rarity).indexOf(a.rarity)-Object.keys(rarity).indexOf(b.rarity));
 for(const c of sorted){const g=items.find(x=>x.item_id===c.id);if(category.value!=='all'&&c.slot!==category.value||quality.value!=='all'&&c.rarity!==quality.value||ownedOnly.checked&&!g)continue;
 const [label,color]=rarity[c.rarity];const card=el('article');card.style.cssText='padding:13px;border:1px solid '+color+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';const icon=el('div',g?c.symbol:'🔒');icon.style.cssText='text-align:center;font-size:38px';card.append(icon,el('small',label+' · '+slots[c.slot]),el('h3',c.name),el('p',g?'Nivel '+g.level+'/5'+(g.equipped?' · ✅ Equipada':''):'Por descubrir'),el('p','Ataque +'+(g?attack(c,g):c.attack)+' · Defensa +'+(g?defense(c,g):c.defense)));
 if(g){card.append(btn(g.equipped?'Desequipar':'Equipar',()=>act(g.equipped?'unequip':'equip',c.id)));const cost=g.level*2;const upgrade=btn(g.level===5?'Nivel máximo':'🔨 Mejorar · '+cost+' fragmentos',()=>{if(confirm('¿Mejorar '+c.name+' por '+cost+' fragmentos?'))act('upgrade',c.id,g.level)});upgrade.disabled=g.level===5||(wallet?.shards||0)<cost;card.append(upgrade)}list.append(card)
 }
 if(!list.children.length)list.append(el('p','No hay piezas que coincidan con los filtros.'));
 history.replaceChildren(el('summary','📜 Últimos botines de mazmorras'));for(const l of loot){const c=catalog.find(x=>x.id===l.item_id);history.append(el('p',new Date(l.awarded_at).toLocaleString('es-ES')+' · '+(c?.name||l.item_id)+(l.duplicate?' (repetida)':'')+' · +'+l.shards+' fragmentos'))}if(!loot.length)history.append(el('p','Aún no hay botines.'));
 }
 category.onchange=quality.onchange=ownedOnly.onchange=draw;
 host.append(btn('↻ Actualizar inventario',async()=>{if(!busy){busy=true;try{await load()}catch(e){report(e)}finally{busy=false}}}));
 try{await load()}catch(e){report(e)}
}
return {mount};
})();