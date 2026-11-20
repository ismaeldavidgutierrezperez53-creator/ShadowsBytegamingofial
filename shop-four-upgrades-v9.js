/* Shadows Byte Gaming Official V2 - Tienda V9.
 * Avisos privados, selección diaria, ranking voluntario y vista previa.
 * Las compras y saldos siguen verificándose exclusivamente en Supabase. */
(function(){
 'use strict';
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=renderRewardShop;
 let generation=0;
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const pts=n=>Number(n||0).toLocaleString('es-ES')+' puntos';
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const categories={anime_theme:'Tema anime',frame:'Marco de avatar',badge:'Insignia',color:'Color de nombre',title:'Título',museum_style:'Estilo de colección'};
 const onSale=(item,now)=>item.sale_price!=null&&item.sale_starts_at&&item.sale_ends_at&&
  Date.parse(item.sale_starts_at)<=now&&now<Date.parse(item.sale_ends_at)&&Number(item.sale_price)<Number(item.price);
 const price=(item,now)=>onSale(item,now)?Number(item.sale_price):Number(item.price);
 const available=(item,now)=>item.active&&(!item.available_from||Date.parse(item.available_from)<=now)&&
  (!item.available_until||now<Date.parse(item.available_until));
 const panel=(title,info,cls)=>{
  const root=make('section','shop-v9-panel '+(cls||''));
  root.append(make('h3','',title));
  if(info)root.append(make('p','shop-v9-intro',info));
  return root;
 };
 const insert=(host,node)=>{
  const before=host.querySelector('#shop-catalog-filters');
  if(before)host.insertBefore(node,before);else host.append(node);
 };
 const jumpTo=(host,id)=>{
  const reset=host.querySelector('.shop-explorer-reset');
  if(reset)reset.click();
  const card=Array.from(host.querySelectorAll('[data-shop-item-id]')).find(x=>x.dataset.shopItemId===id);
  if(card){card.setAttribute('tabindex','-1');card.focus({preventScroll:true});
   card.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});}
 };
 const niceDate=value=>new Date(value).toLocaleDateString('es-ES');
 const showError=(host,title,msg)=>{
  const box=panel(title,'No se ha podido cargar: '+msg,'shop-v9-error');insert(host,box);
 };
 function dailySection(host,items,daily,now){
  const root=panel('📅 Especial del día','Descubre una recomendación diaria y las ofertas que realmente estén activas en la tienda.','shop-v9-daily');
  const availableItems=items.filter(x=>available(x,now));
  const saleItems=availableItems.filter(x=>onSale(x,now));
  saleItems.sort((a,b)=>((Number(b.price)-price(b,now))/Number(b.price))-((Number(a.price)-price(a,now))/Number(a.price)));
  let selected=saleItems[0];
  if(!selected&&availableItems.length){
   const day=new Date(now).toISOString().slice(0,10);
   let seed=0;for(const character of day)seed=(seed*31+character.charCodeAt(0))>>>0;
   const sorted=[...availableItems].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   selected=sorted[seed%sorted.length];
  }
  if(selected){
   const card=make('div','shop-v9-feature');
   const info=make('div','shop-v9-feature-body');
   const label=make('strong','shop-v9-overline',saleItems.length?'🔥 Oferta activa hoy':'🌟 Selección de hoy');
   const name=make('h4','',selected.name);
   const detail=make('p','',categories[selected.category]||'Recompensa');
   const cost=make('p','shop-v9-price',pts(price(selected,now)));
   info.append(label,name,detail,cost);
   if(onSale(selected,now)){
    const normal=make('small','shop-v9-strike','Antes: '+pts(selected.price)+' · Ahorra '+pts(Number(selected.price)-price(selected,now)));
    const validity=make('small','','Promoción válida hasta el '+niceDate(selected.sale_ends_at));
    info.append(normal,validity);
   }else info.append(make('small','','Precio habitual: no se aplica un descuento adicional.'));
   const see=make('button','outline-btn mini','Ver recompensa');
   see.type='button';see.onclick=()=>jumpTo(host,selected.id);info.append(see);
   if(selected.image_url&&/^https:\/\//i.test(selected.image_url)){
    const image=make('img','shop-v9-feature-image');image.src=selected.image_url;image.alt='Imagen de '+selected.name;image.loading='lazy';card.append(image);
   }
   card.append(info);root.append(card);
  }else root.append(make('p','','No hay artículos disponibles hoy.'));
  const bonus=make('div','shop-v9-bonus');
  const utcDay=new Date(now).toISOString().slice(0,10);
  const claimed=(daily||[]).some(x=>x.claimed_on===utcDay);
  bonus.append(make('strong','','🪙 Bono diario · +15 puntos'),
   make('span','',claimed?'✓ Ya has reclamado tus puntos de hoy (UTC).':'Todavía puedes reclamar tus 15 puntos de hoy (UTC).'));
  const go=make('button','outline-btn mini',claimed?'Ver recompensa diaria':'Ir a reclamar +15 puntos');
  go.type='button';go.onclick=()=>host.querySelector('.shop-v3-daily')?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
  bonus.append(go);root.append(bonus);
  if(saleItems.length>1)root.append(make('p','shop-v9-more','Hay '+saleItems.length+' artículos con descuentos activos. Puedes encontrarlos usando el filtro «En oferta».'));
  return root;
 }
 function notificationSection(host,alerts,items,owned,balance,now,newCount,user){
  const root=panel('🔔 Avisos de puntos suficientes','Al entrar en la tienda comprobamos tu lista de deseos. Solo recibirás un aviso por recompensa; no enviamos notificaciones externas.','shop-v9-alerts');
  const map=new Map(items.map(x=>[x.id,x]));
  const current=alerts.filter(x=>{
   const item=map.get(x.item_id);
   return item&&available(item,now)&&!owned.has(item.id)&&price(item,now)<=balance;
  });
  const unread=current.filter(x=>!x.read_at);
  const summary=make('p','shop-v9-summary',unread.length?
   'Tienes '+unread.length+' aviso(s) sin leer.'+(newCount>0?' '+newCount+' nuevo(s) desde esta visita.':''):
   'Sin avisos pendientes. Guarda tus favoritos con ♡ para recibir avisos cuando tengas puntos suficientes.');
  summary.setAttribute('role','status');root.append(summary);
  if(!current.length)return root;
  const list=make('div','shop-v9-alert-list');
  for(const alert of current.slice(0,8)){
   const item=map.get(alert.item_id);
   const row=make('div','shop-v9-alert '+(alert.read_at?'is-read':'is-unread'));
   row.append(make('strong','','🎉 Ya puedes conseguir '+item.name),
    make('small','','Cuesta '+pts(price(item,now))+' · Tu saldo: '+pts(balance)));
   const buttons=make('div','shop-v9-actions');
   const see=make('button','outline-btn mini','Ver artículo');see.type='button';
   see.onclick=()=>jumpTo(host,item.id);buttons.append(see);
   if(!alert.read_at){
    const read=make('button','outline-btn mini','Marcar como leído');read.type='button';
    read.onclick=async()=>{
     read.disabled=true;
     const {error}=await sb.from('member_shop_affordability_alerts')
      .update({read_at:new Date().toISOString()}).eq('user_id',user.id).eq('item_id',item.id);
     if(error){read.disabled=false;read.textContent='Error. Reintentar';return;}
     row.classList.remove('is-unread');row.classList.add('is-read');read.remove();
     const remaining=list.querySelectorAll('.is-unread').length;
     summary.textContent=remaining?'Tienes '+remaining+' aviso(s) sin leer.':'Todos los avisos están leídos.';
    };
    buttons.append(read);
   }
   row.append(buttons);list.append(row);
  }
  root.append(list);return root;
 }
 function preview(item,host,owned,now,trigger){
  const layer=make('div','shop-v9-modal-layer');
  const dialog=make('section','shop-v9-dialog');
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label','Vista previa de '+item.name);
  dialog.setAttribute('tabindex','-1');
  const head=make('div','shop-v9-dialog-head');
  head.append(make('h2','','👁 Vista previa'));
  const closeButton=make('button','shop-v9-close','✕');closeButton.type='button';
  closeButton.setAttribute('aria-label','Cerrar vista previa');
  head.append(closeButton);dialog.append(head);
  const body=make('div','shop-v9-dialog-body');
  const mock=make('div','shop-v9-profile');
  mock.append(make('span','shop-v9-avatar','🎮'));
  const mockInfo=make('div','');
  mockInfo.append(make('strong','','Tu perfil gamer'),make('small','',categories[item.category]||'Personalización'));
  if(item.category==='badge')mockInfo.append(make('span','shop-v9-effect','🏅 '+item.name));
  if(item.category==='title')mockInfo.append(make('span','shop-v9-effect','👑 '+item.name));
  if(item.category==='frame')mock.classList.add('shop-v9-frame');
  if(item.category==='color')mock.classList.add('shop-v9-color');
  if(item.category==='anime_theme')mock.classList.add('shop-v9-anime');
  mock.append(mockInfo);body.append(mock);
  if(item.image_url&&/^https:\/\//i.test(item.image_url)){
   const image=make('img','shop-v9-preview-image');image.src=item.image_url;image.alt='Imagen de '+item.name;image.loading='lazy';body.append(image);
  }
  body.append(make('h3','',item.name),make('p','',item.description||'Recompensa de la tienda.'));
  body.append(make('p','shop-v9-price','Precio actual: '+pts(price(item,now))));
  if(onSale(item,now))body.append(make('p','','Precio habitual: '+pts(item.price)+' · Oferta activa hasta el '+niceDate(item.sale_ends_at)));
  if(item.category==='anime_theme')body.append(make('p','','Requiere nivel '+Number(item.required_level||1)+' para comprar.'));
  if(owned.has(item.id))body.append(make('p','','✅ Esta recompensa ya está en tu colección.'));
  body.append(make('small','shop-v9-disclaimer','Simulación orientativa. El efecto final puede variar según tu perfil y la recompensa.'));
  const buttons=make('div','shop-v9-actions');
  const back=make('button','outline-btn mini','Cerrar');back.type='button';
  const see=make('button','gradient-btn mini','Ver en catálogo');see.type='button';
  buttons.append(back,see);body.append(buttons);dialog.append(body);layer.append(dialog);
  const oldFocus=document.activeElement;
  const close=()=>{
   document.removeEventListener('keydown',onKey);
   window.removeEventListener('hashchange',close);
   layer.remove();
   if(trigger?.isConnected)trigger.focus();else if(oldFocus?.isConnected)oldFocus.focus();
  };
  const onKey=e=>{
   if(e.key==='Escape'){e.preventDefault();close();}
   if(e.key==='Tab'){
    const focusables=[...dialog.querySelectorAll('button:not([disabled])')];
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  };
  closeButton.onclick=close;back.onclick=close;see.onclick=()=>{close();jumpTo(host,item.id);};
  layer.addEventListener('click',e=>{if(e.target===layer)close()});
  document.addEventListener('keydown',onKey);window.addEventListener('hashchange',close);
  document.body.append(layer);closeButton.focus();
 }
 function attachPreviews(host,items,owned,now){
  const itemMap=new Map(items.map(x=>[x.id,x]));
  let count=0;
  for(const card of host.querySelectorAll('[data-shop-item-id]')){
   const item=itemMap.get(card.dataset.shopItemId);
   if(!item||card.querySelector('.shop-v9-preview-btn'))continue;
   const button=make('button','outline-btn mini shop-v9-preview-btn','👁 Vista previa');
   button.type='button';button.onclick=()=>preview(item,host,owned,Date.now(),button);
   const status=card.querySelector('[role="status"]');
   if(status)card.insertBefore(button,status);else card.append(button);
   count++;
  }
  return count;
 }
 function rankingSection(host,user,isPublic,consented){
  const root=panel('🏆 Ranking de recompensas','Clasificación por compras de la tienda. Participar es voluntario y exige tener el perfil público.','shop-v9-ranking');
  const consentLabel=make('label','shop-v9-opt-in');
  const toggle=make('input');toggle.type='checkbox';toggle.checked=consented;
  const caption=make('span','','Quiero aparecer en el ranking con mis compras y puntos utilizados.');
  consentLabel.append(toggle,caption);root.append(consentLabel);
  const note=make('small','shop-v9-footnote',isPublic?
   'Puedes abandonar el ranking cuando quieras.':
   'Tu perfil está privado: puedes dar tu consentimiento, pero no aparecerás hasta hacerlo público.');
  root.append(note);
  const status=make('p','shop-v9-summary','');status.setAttribute('role','status');root.append(status);
  const period=make('select','shop-v9-period');
  period.setAttribute('aria-label','Periodo del ranking');
  for(const [value,label] of [['month','Este mes (UTC)'],['all','Histórico']]){
   const option=make('option','',label);option.value=value;period.append(option);
  }
  root.append(period);
  const board=make('div','shop-v9-board');root.append(board);
  let request=0;
  const load=async()=>{
   const token=++request;
   board.textContent='Cargando clasificación…';
   const {data,error}=await sb.rpc('shop_member_leaderboard',{p_period:period.value});
   if(token!==request||!root.isConnected)return;
   board.replaceChildren();
   if(error){board.textContent='No se pudo cargar el ranking: '+error.message;return;}
   if(!(data||[]).length){board.append(make('p','','Todavía no hay participantes públicos con compras en este periodo.'));return;}
   for(const entry of data){
    const row=make('div','shop-v9-ranking-row'+(entry.member_id===user.id?' is-me':''));
    const medal=Number(entry.place_rank)===1?'🥇':Number(entry.place_rank)===2?'🥈':Number(entry.place_rank)===3?'🥉':'#'+entry.place_rank;
    const label=make('strong','',medal+' '+entry.member_name+(entry.member_id===user.id?' · Tú':''));
    row.append(label,make('span','',Number(entry.purchases).toLocaleString('es-ES')+' recompensas · '+pts(entry.points_spent)));
    board.append(row);
   }
  };
  toggle.onchange=async()=>{
   toggle.disabled=true;status.textContent='Guardando tu elección…';
   const action=toggle.checked?
    sb.from('member_shop_ranking_opt_in').insert({user_id:user.id}):
    sb.from('member_shop_ranking_opt_in').delete().eq('user_id',user.id);
   const {error}=await action;
   if(error){toggle.checked=!toggle.checked;status.textContent='No se pudo guardar: '+error.message;}
   else {status.textContent=toggle.checked?'Participación activada.':'Participación desactivada.';await load();}
   toggle.disabled=false;
  };
  period.onchange=load;
  // Load only once the node is inserted into the DOM.
  root.startRanking=load;
  return root;
 }
 renderRewardShop=async function(){
  const ticket=++generation;
  await previous();
  const host=document.getElementById('reward-shop');
  if(ticket!==generation||!host?.isConnected||!host.querySelector('#shop-catalog-filters'))return;
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||ticket!==generation||!host.isConnected)return;
   const [catalog,ownedRes,balanceRes,dailyRes,consentRes,profileRes,alertsRefresh]=await Promise.all([
    sb.from('reward_shop_items').select('id,name,description,category,price,image_url,required_level,active,available_from,available_until,sale_price,sale_starts_at,sale_ends_at').eq('active',true),
    sb.from('member_shop_purchases').select('item_id').eq('user_id',user.id),
    sb.rpc('reward_shop_balance'),
    sb.from('member_shop_daily_bonuses').select('claimed_on').eq('user_id',user.id).order('claimed_on',{ascending:false}).limit(1),
    sb.from('member_shop_ranking_opt_in').select('user_id').eq('user_id',user.id).limit(1),
    sb.from('profiles').select('is_public').eq('id',user.id).maybeSingle(),
    sb.rpc('shop_refresh_affordability_alerts')
   ]);
   if(ticket!==generation||!host.isConnected)return;
   const now=Date.now();
   const items=catalog.data||[];
   const owned=new Set((ownedRes.data||[]).map(x=>x.item_id));
   const balance=Math.max(0,Number(balanceRes.data||0));
   if(catalog.error||ownedRes.error||balanceRes.error){
    showError(host,'🛍️ Nuevas funciones de tienda',catalog.error?.message||ownedRes.error?.message||balanceRes.error?.message);
    return;
   }
   insert(host,dailySection(host,items,dailyRes.data||[],now));
   if(alertsRefresh.error)showError(host,'🔔 Avisos de puntos',alertsRefresh.error.message);
   else {
    const {data,error}=await sb.from('member_shop_affordability_alerts')
     .select('item_id,notified_at,read_at').eq('user_id',user.id).order('notified_at',{ascending:false}).limit(50);
    if(ticket!==generation||!host.isConnected)return;
    if(error)showError(host,'🔔 Avisos de puntos',error.message);
    else insert(host,notificationSection(host,data||[],items,owned,balance,now,Number(alertsRefresh.data||0),user));
   }
   const rank=rankingSection(host,user,!!profileRes.data?.is_public,(consentRes.data||[]).length>0);
   insert(host,rank);rank.startRanking();delete rank.startRanking;
   const previews=attachPreviews(host,items,owned,now);
   const banner=make('p','shop-v9-preview-info','👁 Ya puedes ver cómo quedaría una recompensa antes de comprarla. Utiliza «Vista previa» en el catálogo.');
   if(previews){const before=host.querySelector('#shop-catalog-filters');if(before)host.insertBefore(banner,before);}
  }catch(e){
   const root=document.getElementById('reward-shop');
   if(ticket===generation&&root===host&&host?.isConnected)showError(host,'✨ Tienda ampliada',e?.message||String(e));
  }
 };
})();