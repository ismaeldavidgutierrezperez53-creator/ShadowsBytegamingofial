/* Shadow Universe — consent-based, atomic anime card trades. */
window.SBCardTrades=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(label,fn)=>{const b=el('button',label,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const rarity={common:'Común',rare:'Rara',epic:'Épica',legendary:'Legendaria',mythic:'Mítica'};
const states={pending:'Pendiente',accepted:'Completado',declined:'Rechazado',canceled:'Cancelado',expired:'Caducado'};
const errors={'Public eligible profile required':'Necesitas un perfil público y una cuenta habilitada.','Partner unavailable':'El miembro no está disponible para intercambios.','Pending limit':'Se alcanzó el límite de ofertas pendientes.','Daily offer limit':'Has alcanzado el máximo de 10 ofertas enviadas hoy.','Duplicate required':'Necesitas una copia repetida de la carta que ofreces.','Both need duplicates':'Ambos debéis conservar al menos una copia de vuestra carta. La oferta ya no puede completarse con el inventario actual.','Offer already pending':'Esta oferta ya está pendiente.','Trade unavailable':'Oferta no disponible.'};
async function mount(host,user,onInventoryChange){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','💎 Intercambio de cartas'),el('p','Intercambia una carta repetida por otra. Ambas partes conservan su última copia. Las ofertas duran 48 horas y no reservan cartas: el servidor vuelve a comprobar el inventario al aceptar. Sin dinero ni puntos.'));
 const status=el('p','Cargando intercambios…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const settings=el('section'),compose=el('section'),history=el('section');host.append(status,settings,compose,history);
 let catalog=[],inventory=[],offers=[],members=[],enabled=false,busy=false,loading=false;
 const friendly=e=>errors[e.message]||e.message||'Error de conexión';
 const name=id=>{const c=catalog.find(x=>x.id===id);return c?c.symbol+' '+c.name+' · '+rarity[c.rarity]:id};
 const quantity=id=>inventory.find(x=>x.card_id===id)?.quantity||0;
 async function load(message){
 if(loading||!host.isConnected)return;loading=true;
 try{const [a,b,c,d,e]=await Promise.all([sb.from('sb_shadow_cards').select('*').order('name'),sb.from('sb_card_inventory').select('card_id,quantity').eq('user_id',user.id),sb.from('sb_card_trade_preferences').select('enabled').eq('user_id',user.id).maybeSingle(),sb.rpc('sb_card_trade_directory'),sb.from('sb_card_trades').select('*').or('sender_id.eq.'+user.id+',recipient_id.eq.'+user.id).order('created_at',{ascending:false}).limit(100)]);
 catalog=check(a)||[];inventory=check(b)||[];enabled=!!check(c)?.enabled;members=check(d)||[];offers=check(e)||[];if(!host.isConnected)return;draw();if(onInventoryChange)onInventoryChange(inventory);status.textContent=message||'Intercambios actualizados.';
 }catch(e){status.textContent=friendly(e)}finally{loading=false}
 }
 async function act(fn){if(busy)return;busy=true;try{const message=await fn();await load(message)}catch(e){status.textContent=friendly(e)}finally{busy=false}}
 function select(label,entries){const s=el('select');s.setAttribute('aria-label',label);const p=el('option',label);p.value='';s.append(p);for(const [value,title] of entries){const o=el('option',title);o.value=value;s.append(o)}return s}
 function draw(){
 settings.replaceChildren(el('h3',enabled?'🟢 Intercambios activados':'⚪ Intercambios desactivados'),el('p','Solo los miembros que activen los intercambios y tengan perfil público aparecerán como posibles compañeros.'));
 settings.append(btn(enabled?'Desactivar':'Activar intercambios',()=>{if(enabled&&!confirm('¿Desactivar y cancelar las ofertas pendientes?'))return;act(async()=>{check(await sb.rpc('sb_card_trade_opt',{enabled_value:!enabled}));return enabled?'Intercambios desactivados.':'Intercambios activados.'})}));
 const duplicateCards=catalog.filter(c=>quantity(c.id)>=2);
 compose.replaceChildren(el('h3','🔄 Nueva oferta'),el('p',duplicateCards.length+' tipos de carta repetida disponibles.'));
 if(!enabled)compose.append(el('p','Activa los intercambios para enviar ofertas.'));
 else if(!members.length)compose.append(el('p','Todavía no hay otros miembros disponibles.'));
 else if(!duplicateCards.length)compose.append(el('p','Abre sobres diarios hasta conseguir cartas repetidas.'));
 else{
 const partner=select('Selecciona miembro',members.map(m=>[m.member_id,m.display_name])),offered=select('Carta que ofreces',duplicateCards.map(c=>[c.id,name(c.id)+' ×'+quantity(c.id)])),filter=select('Rareza solicitada',Object.entries(rarity)),requested=select('Carta que solicitas',[]);
 filter.options[0].textContent='Todas las rarezas';
 function fill(){const old=requested.value;requested.replaceChildren();const placeholder=el('option','Carta que solicitas');placeholder.value='';requested.append(placeholder);for(const c of catalog.filter(c=>c.id!==offered.value&&(!filter.value||c.rarity===filter.value))){const o=el('option',name(c.id));o.value=c.id;requested.append(o)}requested.value=[...requested.options].some(o=>o.value===old)?old:''}
 offered.onchange=filter.onchange=fill;fill();
 const form=el('div');form.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';form.append(partner,offered,filter,requested,btn('Enviar oferta',()=>{if(!partner.value||!offered.value||!requested.value){status.textContent='Selecciona miembro y las dos cartas.';return}if(!confirm('¿Ofrecer '+name(offered.value)+' a cambio de '+name(requested.value)+'?'))return;act(async()=>{check(await sb.rpc('sb_card_trade_offer',{target_member:partner.value,offered:offered.value,requested:requested.value}));return 'Oferta enviada.'})}));compose.append(form,el('small','La colección del otro miembro es privada. Podrá aceptar si dispone de una copia repetida de la carta solicitada.'));
 }
 const accepted=offers.filter(o=>o.status==='accepted').length;history.replaceChildren(el('h3','📜 Ofertas e historial'),el('p',accepted+' intercambios completados entre las últimas 100 ofertas.'));
 if(accepted)history.append(el('p','🎖️ Primer intercambio'));if(accepted>=10)history.append(el('p','💎 Maestro del intercambio'));
 if(!offers.length)history.append(el('p','Aún no hay ofertas.'));
 for(const o of offers){const incoming=o.recipient_id===user.id,pending=o.status==='pending'&&Date.parse(o.expires_at)>Date.now(),box=el('article');box.style.cssText='border:1px solid #a855f766;border-radius:12px;padding:12px;margin:10px 0;background:#211633;color:#fff;overflow-wrap:anywhere';
 box.append(el('h3',(incoming?'📥 De '+o.sender_name:'📤 Para '+o.recipient_name)),el('p',o.status==='pending'&&!pending?'Caducado':states[o.status]),el('p','Entregas: '+name(incoming?o.requested_card:o.offered_card)),el('p','Recibes: '+name(incoming?o.offered_card:o.requested_card)),el('small',new Date(o.created_at).toLocaleString('es-ES')));
 if(pending){box.append(el('p','Vence: '+new Date(o.expires_at).toLocaleString('es-ES')));if(incoming){const accept=btn('Aceptar intercambio',()=>{if(!confirm('¿Confirmar el intercambio de estas dos cartas?'))return;respond(o,'accept')});accept.disabled=quantity(o.requested_card)<2;box.append(accept,btn('Rechazar',()=>respond(o,'decline')));if(accept.disabled)box.append(el('small','Necesitas dos copias de la carta solicitada.'))}else box.append(btn('Cancelar oferta',()=>respond(o,'cancel')))}
 history.append(box)}
 }
 function respond(o,decision){act(async()=>{const r=check(await sb.rpc('sb_card_trade_respond',{target_trade:o.id,decision}));return r.status==='accepted'?'¡Intercambio completado! Inventario actualizado.':'Oferta: '+(states[r.status]||r.status)})}
 host.append(btn('↻ Actualizar intercambios',()=>load()));host.addEventListener('sb-card-pack-opened',()=>load());await load();
}
return {mount};
})();