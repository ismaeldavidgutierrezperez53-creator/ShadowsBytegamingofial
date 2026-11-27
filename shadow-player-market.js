/* Shadow Universe 5.0 — player materials marketplace */
window.SBPlayerMarket=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Public eligible profile required':'Para comprar o vender necesitas un perfil público y sin restricciones.','Invalid listing':'Comprueba el material, la cantidad y el precio.','Active listing limit':'Tienes cinco anuncios activos.','Not enough materials':'No tienes suficientes materiales libres.','Listing unavailable':'El anuncio ya no está disponible o no puedes comprarlo.','Not enough shards':'No tienes suficientes fragmentos.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🏛️ Mercado entre jugadores'),el('p','Compra y vende materiales por fragmentos de forja (moneda virtual del juego). Cada anuncio reserva su lote completo hasta venderlo o cancelarlo. No se usa dinero real ni se cobra comisión. Máximo cinco anuncios activos por miembro.'));
const status=el('p','Cargando mercado…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const summary=el('section'),sell=el('section'),filters=el('section'),list=el('div'),mine=el('section'),history=el('details');host.append(status,summary,sell,filters,list,mine,history);
let materials=[],inventory=[],wallet=0,own=[],rows=[],profilePublic=false,busy=false,loading=false,filter='',sort='newest',offset=0,pending=null;
const material=id=>materials.find(m=>m.id===id),label=id=>{const m=material(id);return m?m.symbol+' '+m.name:id},qty=id=>inventory.find(m=>m.material_id===id)?.quantity||0;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
const catalog=()=>sb.rpc('sb_market_list',{target_material:filter||null,sort_by:sort,page_offset:offset});
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f,g]=await Promise.all([sb.from('sb_craft_materials').select('*').order('name'),sb.from('sb_craft_inventory').select('material_id,quantity').eq('user_id',user.id),sb.from('sb_gear_wallet').select('shards').eq('user_id',user.id).maybeSingle(),sb.from('sb_market_listings').select('*').or('seller_id.eq.'+user.id+',buyer_id.eq.'+user.id).neq('status','active').order('closed_at',{ascending:false}).limit(100),catalog(),sb.from('profiles').select('is_public').eq('id',user.id).maybeSingle(),sb.from('sb_market_listings').select('*').eq('seller_id',user.id).eq('status','active').order('created_at',{ascending:false})]);
if(!host.isConnected)return;materials=(check(a)||[]).filter(x=>['herb','ore','essence','potion'].includes(x.id));inventory=check(b)||[];wallet=check(c)?.shards||0;own=[...(check(g)||[]),...(check(d)||[])];rows=check(e)||[];profilePublic=!!check(f)?.is_public;draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action,args,message){if(busy||loading)return;busy=true;try{const r=check(await sb.rpc('sb_market_manage',{action,...args}));if(action==='list')pending=null;await load(message);host.dispatchEvent(new CustomEvent('sb-craft-inventory-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
const select=(name,options)=>{const n=el('select');n.setAttribute('aria-label',name);for(const [v,l] of options){const o=el('option',l);o.value=v;n.append(o)}return n};
const priceText=r=>r.total_price+' 💎 ('+r.unit_price+' por unidad)';
function card(r){const box=el('article');box.style.cssText='padding:12px;border:1px solid #a855f777;border-radius:12px;background:#211633;color:#fff;overflow-wrap:anywhere';box.append(el('h3',label(r.material_id)+' × '+r.quantity),el('p',priceText(r)));return box}
function draw(){
const active=own.filter(r=>r.seller_id===user.id&&r.status==='active');
summary.replaceChildren(el('h3','Mi cartera'),el('p','💎 '+wallet+' fragmentos disponibles · '+active.length+'/5 anuncios activos'),el('p',materials.map(m=>label(m.id)+': '+qty(m.id)).join(' · ')));
if(!profilePublic)summary.append(el('p','Activa tu perfil público para publicar o comprar. Puedes cancelar tus anuncios aunque el perfil sea privado.'));
sell.replaceChildren(el('h3','📦 Publicar anuncio'));
const materialSelect=select('Material para vender',materials.map(m=>[m.id,label(m.id)+' · '+qty(m.id)+' disponibles'])),amount=el('input'),price=el('input'),total=el('p');amount.type='number';amount.min=1;amount.max=50;amount.step=1;amount.value=1;amount.setAttribute('aria-label','Cantidad');price.type='number';price.min=1;price.max=20;price.step=1;price.value=1;price.setAttribute('aria-label','Precio por unidad en fragmentos');
const publish=btn('Publicar venta',()=>{const a=Number(amount.value),p=Number(price.value),id=materialSelect.value;if(!confirm('¿Reservar '+a+' unidades de '+label(id)+' por '+a*p+' fragmentos en total?'))return;const key=[id,a,p].join(':');if(!pending||pending.key!==key)pending={key,id:crypto.randomUUID()};act('list',{target_material:id,amount:a,price:p,request_key:pending.id},'Anuncio publicado. Material reservado.')});
function valid(){const a=Number(amount.value),p=Number(price.value);total.textContent='Precio total: '+(Number.isInteger(a)&&Number.isInteger(p)&&a>0&&p>0?a*p:0)+' fragmentos';publish.disabled=!profilePublic||active.length>=5||!Number.isInteger(a)||a<1||a>50||a>qty(materialSelect.value)||!Number.isInteger(p)||p<1||p>20}
for(const n of [materialSelect,amount,price])n.addEventListener('input',valid);sell.append(materialSelect,el('p','Cantidad (1–50)'),amount,el('p','Precio unitario (1–20 fragmentos)'),price,total,publish);valid();
filters.replaceChildren(el('h3','🛍️ Anuncios disponibles'));const f=select('Filtrar material',[['','Todos los materiales'],...materials.map(m=>[m.id,label(m.id)])]),s=select('Ordenar',[['newest','Más recientes'],['cheap','Precio unitario menor'],['expensive','Precio unitario mayor']]);f.value=filter;s.value=sort;const change=()=>{filter=f.value;sort=s.value;offset=0;load()};f.onchange=change;s.onchange=change;filters.append(f,s,btn('↻ Actualizar mercado',()=>load()));
list.replaceChildren();list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px';
for(const r of rows){const c=card(r);c.append(el('p','Vendedor: '+r.seller_name));if(r.is_mine)c.append(el('p','Tu anuncio'));else{const b=btn('Comprar lote',()=>{if(confirm('¿Comprar '+r.quantity+' unidades de '+label(r.material_id)+' por '+r.total_price+' fragmentos?'))act('buy',{target_listing:r.id},'¡Compra completada!')});b.disabled=!profilePublic||wallet<r.total_price;c.append(b)}list.append(c)}
if(!rows.length)list.append(el('p','No hay anuncios disponibles con estos filtros.'));
const paging=el('div');paging.append(el('small','Página '+(1+Math.floor(offset/60))));const prev=btn('Anterior',()=>{offset=Math.max(0,offset-60);load()}),next=btn('Siguiente',()=>{offset+=60;load()});prev.disabled=offset===0;next.disabled=rows.length<60||offset>=6000;paging.append(prev,next);filters.append(paging);
mine.replaceChildren(el('h3','📋 Mis anuncios activos'));for(const r of active){const c=card(r);c.append(btn('Cancelar y recuperar materiales',()=>{if(confirm('¿Cancelar el anuncio y recuperar el lote?'))act('cancel',{target_listing:r.id},'Anuncio cancelado. Material devuelto.')}));mine.append(c)}if(!active.length)mine.append(el('p','No tienes anuncios activos.'));
const open=history.open;history.replaceChildren(el('summary','📜 Historial de transacciones (últimos 100 movimientos cerrados)'));history.open=open;const closed=own.filter(r=>r.status!=='active');for(const r of closed){const sale=r.seller_id===user.id;history.append(el('p',new Date(r.closed_at||r.created_at).toLocaleString('es-ES')+' · '+(r.status==='canceled'?'Cancelado':sale?'Vendido':'Comprado')+' · '+label(r.material_id)+' × '+r.quantity+' · '+(r.status==='canceled'?'Material devuelto':(sale?'+':'−')+r.total_price+' 💎')))}if(!closed.length)history.append(el('p','Todavía no hay transacciones.'));
}
host.append(btn('↻ Actualizar mi mercado',()=>load()));await load();
}
return {mount};
})();