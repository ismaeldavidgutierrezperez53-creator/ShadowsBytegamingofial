/* Shadows Byte Gaming Official V2 — Mercado anime V11
   Secure auctions, direct reward swaps, collection quests and winter pass.
   Prices, ownership, escrow, rewards and claims are validated in Supabase RPCs. */
(function(){
 'use strict';
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=renderRewardShop;
 let generation=0;
 const node=(tag,cls,value)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(value!==undefined)x.textContent=String(value);
  return x;
 };
 const points=value=>Number(value||0).toLocaleString('es-ES')+' puntos';
 const when=value=>new Date(value).toLocaleString('es-ES');
 const panel=(id,title,description)=>{
  const element=node('section','shop-v11-panel');
  element.id=id;element.append(node('h3','',title),node('p','shop-v11-subtitle',description));
  return element;
 };
 const label=(title,input)=>{
  const el=node('label','shop-v11-field');el.append(node('span','',title),input);return el;
 };
 const option=(value,text)=>{const x=node('option','',text);x.value=value;return x;};
 const feedback=()=>{const x=node('p','shop-v11-feedback','');x.setAttribute('role','status');return x;};
 const selectItems=(items,name)=>{const sel=node('select');sel.setAttribute('aria-label',name);for(const item of items)sel.append(option(item.id,item.name));return sel;};
 const itemLink=(itemId,host)=>{
  const reset=host.querySelector('.shop-explorer-reset');if(reset)reset.click();
  const card=Array.from(host.querySelectorAll('[data-shop-item-id]')).find(n=>n.dataset.shopItemId===itemId);
  if(card){card.setAttribute('tabindex','-1');card.focus({preventScroll:true});card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}
 };
 const add=(host,element)=>{const before=host.querySelector('#shop-catalog-filters');if(before)host.insertBefore(element,before);else host.append(element);};
 const errorPanel=(host,title,err)=>{const p=panel('shop-v11-error-'+Math.random().toString(36).slice(2),title,'No se pudo cargar: '+err);p.classList.add('shop-v11-error');add(host,p);};
 const needRefresh=(button,status,execute,alive)=>{
  button.disabled=true;status.textContent='Comprobando operación…';
  Promise.resolve().then(execute).then(({data,error})=>{
   if(!alive())return;
   if(error){status.textContent='No se pudo completar: '+error.message;button.disabled=false;return;}
   if(data===false||data===null){status.textContent='No hay cambios. Puede que el artículo ya esté en tu colección.';button.disabled=false;return;}
   status.textContent='✅ Operación completada.';
   renderRewardShop();
  }).catch(err=>{
   if(alive()){status.textContent='Error: '+(err?.message||String(err));button.disabled=false;}
  });
 };
 function auctionPanel(host,user,items,owned,auctions,balance,alive){
  const p=panel('shop-v11-auctions','🔨 Subastas de recompensas',
   'Vende una recompensa que ya tienes o puja por otra. Los puntos de la puja ganadora quedan reservados y se devuelven si te superan. Solo participan perfiles públicos.');
  const byId=new Map(items.map(i=>[i.id,i]));
  const active=(auctions||[]).filter(a=>a.status==='open');
  const busy=new Set(active.filter(a=>a.is_mine).map(a=>a.item_id));
  const choices=items.filter(i=>owned.has(i.id)&&i.category!=='anime_theme'&&!busy.has(i.id));
  const create= node('form','shop-v11-form');
  const formTitle=node('h4','','Abrir una subasta');create.append(formTitle);
  const pick=selectItems(choices,'Artículo para subastar');
  const starting=node('input');starting.type='number';starting.min='10';starting.max='100000';starting.step='1';starting.value='100';starting.required=true;
  const hours=node('select');for(const h of [1,6,12,24,48,72])hours.append(option(String(h),h+' hora'+(h>1?'s':'')));
  hours.value='24';
  const submit=node('button','gradient-btn mini','Crear subasta');submit.type='submit';submit.disabled=!choices.length;
  const status=feedback();
  create.append(label('Tu recompensa',pick),label('Puja inicial (puntos)',starting),label('Duración',hours),submit,status);
  create.onsubmit=e=>{
   e.preventDefault();
   if(!pick.value)return;
   if(!confirm('¿Publicar '+(byId.get(pick.value)?.name||'esta recompensa')+' en una subasta? Seguirás siendo su propietario hasta que finalice.'))return;
   needRefresh(submit,status,()=>sb.rpc('shop_market_open_auction',{p_item_id:pick.value,p_start_bid:Number(starting.value),p_hours:Number(hours.value)}),alive);
  };
  p.append(create);
  p.append(node('h4','shop-v11-list-title','Subastas en curso'));
  if(!active.length){p.append(node('p','','No hay subastas abiertas por ahora.'));return p;}
  const grid=node('div','shop-v11-grid');
  for(const a of active){
   const item=byId.get(a.item_id);
   if(!item)continue;
   const expired=Date.parse(a.ends_at)<=Date.now();
   const isMine=a.is_mine;
   const min=Number(Number(a.highest_bid)>0 ? Number(a.highest_bid)+Math.max(10,Math.ceil(Number(a.highest_bid)*0.05)):a.starting_bid);
   const card=node('article','shop-v11-card');
   card.append(node('strong','',item.name),node('span','shop-v11-kicker',isMine?'🧾 Tu subasta':'🔨 Subasta de un miembro'),
    node('p','','Puja más alta: '+(Number(a.highest_bid)>0?points(a.highest_bid):'sin pujas')+' · Mínima: '+points(min)),
    node('small','',expired?'⏰ Plazo finalizado · pendiente de liquidación':'⏳ Termina el '+when(a.ends_at)));
   if(a.is_highest_bidder)card.append(node('p','shop-v11-notice','🪙 Eres la mejor oferta. Tus puntos siguen reservados.'));
   const status=feedback();
   if(expired){
    const settle=node('button','outline-btn mini','✅ Liquidar resultado');settle.type='button';
    settle.onclick=()=>needRefresh(settle,status,()=>sb.rpc('shop_market_settle_auction',{p_auction_id:a.id}),alive);
    card.append(settle);
   }else if(isMine&&Number(a.highest_bid)===0){
    const cancel=node('button','outline-btn mini','Cancelar subasta');cancel.type='button';
    cancel.onclick=()=>{
     if(!confirm('¿Cancelar esta subasta sin pujas?'))return;
     needRefresh(cancel,status,()=>sb.rpc('shop_market_cancel_auction',{p_auction_id:a.id}),alive);
    };
    card.append(cancel);
   }else if(!isMine&&!owned.has(a.item_id)){
    const form=node('form','shop-v11-bid-form');
    const amount=node('input');amount.type='number';amount.required=true;amount.min=String(min);amount.max='100000';amount.step='1';amount.value=String(min);
    const btn=node('button','outline-btn mini','Pujar');btn.type='submit';
    form.append(label('Tu puja (puntos)',amount),btn);
    form.onsubmit=e=>{
     e.preventDefault();
     if(!confirm('¿Reservar '+points(amount.value)+' para esta subasta?'))return;
     needRefresh(btn,status,()=>sb.rpc('shop_market_bid',{p_auction_id:a.id,p_amount:Number(amount.value)}),alive);
    };
    card.append(form);
   }
   card.append(status);grid.append(card);
  }
  p.append(grid);p.append(node('small','shop-v11-footnote','Las subastas vencidas se liquidan automáticamente aproximadamente cada 2 minutos; también puedes usar «Liquidar resultado». Las pujas superadas se devuelven al instante.'));return p;
 }
 function tradePanel(host,user,items,owned,trades,auctions,alive){
  const p=panel('shop-v11-trades','🔄 Intercambios de recompensas',
   'Publica un artículo de tu colección y elige qué recompensa deseas recibir. Otro miembro que posea la solicitada podrá aceptar el intercambio sin gastar puntos adicionales.');
  const map=new Map(items.map(i=>[i.id,i]));
  const open=(trades||[]).filter(t=>t.status==='open');
  const reserved=new Set([
   ...open.filter(t=>t.is_mine).map(t=>t.offered_item),
   ...(auctions||[]).filter(a=>a.status==='open'&&a.is_mine).map(a=>a.item_id)
  ]);
  const marketable=items.filter(i=>i.category!=='anime_theme');
  const mine=marketable.filter(i=>owned.has(i.id)&&!reserved.has(i.id));
  const wanted=marketable.filter(i=>!owned.has(i.id));
  const form=node('form','shop-v11-form');
  const give=selectItems(mine,'Recompensa que ofreces');
  const receive=selectItems(wanted,'Recompensa que quieres recibir');
  const post=node('button','gradient-btn mini','Publicar intercambio');post.type='submit';post.disabled=!mine.length||!wanted.length;
  const status=feedback();
  form.append(node('h4','','Crear una propuesta'),label('Ofrezco',give),label('Quiero a cambio',receive),post,status);
  form.onsubmit=e=>{
   e.preventDefault();
   if(!give.value||!receive.value)return;
   if(!confirm('¿Ofrecer '+map.get(give.value)?.name+' a cambio de '+map.get(receive.value)?.name+'?'))return;
   needRefresh(post,status,()=>sb.rpc('shop_market_offer_trade',{p_offered_item:give.value,p_requested_item:receive.value}),alive);
  };
  p.append(form,node('h4','shop-v11-list-title','Intercambios disponibles'));
  const grid=node('div','shop-v11-grid');
  for(const t of open){
   const offered=map.get(t.offered_item),requested=map.get(t.requested_item);
   if(!offered||!requested)continue;
   const mine=t.is_mine;
   const card=node('article','shop-v11-card');
   card.append(node('strong','','🔁 '+offered.name),node('p','','A cambio de: '+requested.name),
    node('small','',mine?'Tu propuesta':'Propuesta abierta a miembros de la comunidad'));
   const status=feedback();
   if(mine){
    const cancel=node('button','outline-btn mini','Retirar propuesta');cancel.type='button';
    cancel.onclick=()=>{if(confirm('¿Retirar esta propuesta de intercambio?'))needRefresh(cancel,status,()=>sb.rpc('shop_market_cancel_trade',{p_trade_id:t.id}),alive);};
    card.append(cancel);
   }else if(owned.has(t.requested_item)&&!owned.has(t.offered_item)){
    const accept=node('button','gradient-btn mini','Aceptar intercambio');accept.type='button';
    accept.onclick=()=>{
     if(!confirm('¿Intercambiar tu recompensa «'+requested.name+'» por «'+offered.name+'»? Esta operación es definitiva.'))return;
     needRefresh(accept,status,()=>sb.rpc('shop_market_accept_trade',{p_trade_id:t.id}),alive);
    };
    card.append(accept);
   }else card.append(node('p','shop-v11-muted','Necesitas tener la recompensa solicitada para aceptar.'));
   card.append(status);grid.append(card);
  }
  if(!grid.children.length)p.append(node('p','','No hay propuestas de intercambio abiertas.'));
  else p.append(grid);
  p.append(node('small','shop-v11-footnote','Los intercambios no permiten vender ni regalar recompensas exclusivas de nivel o colección. Los puntos gastados originalmente no se devuelven.'));
  return p;
 }
 function collectionPanel(host,collections,alive){
  const p=panel('shop-v11-collections','💎 Colecciones especiales anime',
   'Reúne todos los artículos de cada conjunto. Al completarlo, podrás reclamar una recompensa cosmética exclusiva gratis y una sola vez.');
  const grid=node('div','shop-v11-grid');
  for(const c of collections||[]){
   const card=node('article','shop-v11-card');
   card.append(node('h4','',c.collection_title),node('p','',c.description),
    node('p','shop-v11-progress-text',c.owned_count+' de '+c.required_count+' artículos conseguidos'));
   const bar=node('progress');bar.max=Number(c.required_count||1);bar.value=Number(c.owned_count||0);
   bar.setAttribute('aria-label','Progreso de '+c.collection_title);card.append(bar);
   const requirements=node('ul','shop-v11-requirements');
   for(const it of c.requirements||[]){
    const li=node('li','',((it.owned)?'✅ ':'🔒 ')+it.name);
    if(!it.owned){const see=node('button','shop-v11-text-link','Ver');see.type='button';see.onclick=()=>itemLink(it.id,host);li.append(see);}
    requirements.append(li);
   }
   card.append(requirements,node('p','shop-v11-prize','🎖️ Premio: '+c.reward_name));
   const button=node('button','outline-btn mini',c.claimed?'✓ Premio conseguido':'Reclamar premio');
   button.type='button';button.disabled=!!c.claimed||Number(c.owned_count)<Number(c.required_count);
   const status=feedback();
   button.onclick=()=>needRefresh(button,status,()=>sb.rpc('shop_anime_collection_claim',{p_collection_id:c.collection_id}),alive);
   card.append(button,status);grid.append(card);
  }
  if(!grid.children.length)p.append(node('p','','Todavía no hay colecciones disponibles.'));else p.append(grid);
  return p;
 }
 function seasonPanel(host,missions,alive){
  const p=panel('shop-v11-season-pass','🎟️ Pase de temporada anime',
   'Completa misiones durante el evento y reclama puntos adicionales sin pagos ni suscripciones.');
  const grouped=new Map();
  for(const row of missions||[]){
   if(!grouped.has(row.season_id))grouped.set(row.season_id,[]);
   grouped.get(row.season_id).push(row);
  }
  if(!grouped.size){p.append(node('p','','No hay temporadas activas ni próximas programadas.'));return p;}
  for(const [,entries] of grouped){
   const first=entries[0];
   const group=node('section','shop-v11-season');
   const phrase=first.state==='upcoming'?'⏳ Próximamente':first.state==='active'?'✨ Temporada activa':'🏁 Temporada finalizada';
   group.append(node('h4','',first.season_title),node('p','',first.season_description),
    node('p','shop-v11-season-dates',phrase+' · '+when(first.starts_at)+' — '+when(first.ends_at)));
   for(const m of entries){
    const row=node('article','shop-v11-mission');
    const label=node('div','shop-v11-mission-info');
    label.append(node('strong','',m.mission_title),node('small','',m.mission_description),
     node('span','','Progreso: '+Math.min(Number(m.progress),Number(m.goal))+' / '+m.goal+' · Premio: +'+points(m.reward_points)));
    const bar=node('progress');bar.max=Number(m.goal);bar.value=Math.min(Number(m.progress),Number(m.goal));
    bar.setAttribute('aria-label','Progreso de '+m.mission_title);
    label.append(bar);row.append(label);
    const button=node('button','outline-btn mini',m.claimed?'✓ Reclamado':'Reclamar +'+Number(m.reward_points).toLocaleString('es-ES'));
    button.type='button';button.disabled=!!m.claimed||m.state!=='active'||Number(m.progress)<Number(m.goal);
    const status=feedback();
    button.onclick=()=>needRefresh(button,status,()=>sb.rpc('shop_pass_claim',{p_season_id:m.season_id,p_mission_key:m.mission_key}),alive);
    row.append(button,status);group.append(row);
   }
   p.append(group);
  }
  p.append(node('small','shop-v11-footnote','Cada misión se cobra una sola vez. La actividad cuenta únicamente dentro de las fechas del pase (horario UTC).'));
  return p;
 }
 function ledgerPanel(events,balance){
  const p=panel('shop-v11-market-ledger','🪙 Historial de subastas, cambios y pase',
   'Registro privado de reservas, devoluciones, ventas y premios. Se integra en el saldo real de la tienda.');
  p.append(node('p','shop-v11-balance','Saldo actual: '+points(balance)));
  const list=node('div','shop-v11-ledger');
  const names={bid_hold:'Puja reservada',bid_refund:'Devolución de puja',auction_income:'Venta de subasta',ownership_cost:'Ajuste de coste al transferir',pass_reward:'Premio del pase'};
  for(const e of events||[]){
   const row=node('div','shop-v11-ledger-row');
   const detail=node('div','');
   detail.append(node('strong','',names[e.event_type]||e.title||'Movimiento'),node('small','',when(e.occurred_at)));
   const delta=Number(e.points_delta||0);
   row.append(detail,node('span',delta>0?'shop-v11-positive':delta<0?'shop-v11-negative':'',''+(delta>0?'+':'')+delta.toLocaleString('es-ES')+' pts'));list.append(row);
  }
  if(!list.children.length)list.append(node('p','','No hay movimientos del mercado todavía.'));
  p.append(list);return p;
 }
 renderRewardShop=async function(){
  const ticket=++generation;
  await previous();
  const host=document.getElementById('reward-shop');
  const alive=()=>ticket===generation&&host?.isConnected;
  if(!alive()||!host.querySelector('#shop-catalog-filters'))return;
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(!user||authError||!alive())return;
   const [itemsRes,ownedRes,balanceRes,auctionsRes,tradesRes,collectionsRes,passRes,ledgerRes]=await Promise.all([
    sb.from('reward_shop_items').select('id,name,category,price,active').eq('active',true).order('sort_order'),
    sb.from('member_shop_purchases').select('item_id,price_paid').eq('user_id',user.id),
    sb.rpc('reward_shop_balance'),
    sb.rpc('shop_market_auction_list'),
    sb.rpc('shop_market_trade_list'),
    sb.rpc('shop_anime_collection_catalog'),
    sb.rpc('shop_pass_status'),
    sb.rpc('shop_market_history',{p_limit:60})
   ]);
   if(!alive())return;
   const items=itemsRes.data||[],owned=new Set((ownedRes.data||[]).map(x=>x.item_id));
   const auctions=auctionsRes.data||[],trades=tradesRes.data||[];
   const navigation=node('nav','shop-v11-shortcuts');
   for(const [id,caption] of [['shop-v11-auctions','🔨 Subastas'],['shop-v11-trades','🔄 Intercambios'],['shop-v11-collections','💎 Colecciones'],['shop-v11-season-pass','🎟️ Pase anime']]){
    const link=node('button','outline-btn mini',caption);link.type='button';
    link.onclick=()=>host.querySelector('#'+id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    navigation.append(link);
   }
   add(host,navigation);
   if(itemsRes.error||ownedRes.error||balanceRes.error){
    errorPanel(host,'🛒 Mercado de miembros',itemsRes.error?.message||ownedRes.error?.message||balanceRes.error?.message);
   }else{
    if(auctionsRes.error)errorPanel(host,'🔨 Subastas',auctionsRes.error.message);
    else add(host,auctionPanel(host,user,items,owned,auctions,balanceRes.data,alive));
    if(tradesRes.error)errorPanel(host,'🔄 Intercambios',tradesRes.error.message);
    else add(host,tradePanel(host,user,items,owned,trades,auctions,alive));
   }
   if(collectionsRes.error)errorPanel(host,'💎 Colecciones anime',collectionsRes.error.message);
   else add(host,collectionPanel(host,collectionsRes.data||[],alive));
   if(passRes.error)errorPanel(host,'🎟️ Pase anime',passRes.error.message);
   else add(host,seasonPanel(host,passRes.data||[],alive));
   if(ledgerRes.error)errorPanel(host,'🪙 Historial del mercado',ledgerRes.error.message);
   else add(host,ledgerPanel(ledgerRes.data||[],balanceRes.data||0));
  }catch(err){
   if(alive())errorPanel(host,'Mercado anime V11',err?.message||String(err));
  }
 };
})();