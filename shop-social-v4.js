/* Shadows Byte Gaming Official — Tienda social v4.
   All spending, review ownership and alerts are verified by authenticated Supabase RPCs. */
(function(){
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const previousRender=renderRewardShop;
 let generation=0;
 const el=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const points=value=>Number(value||0).toLocaleString('es-ES')+' puntos';
 const date=value=>new Date(value).toLocaleString('es-ES');
 const section=(title,description,extraClass='')=>{
  const panel=el('section','shop-social-panel '+extraClass);
  panel.append(el('h3','',title));
  if(description)panel.append(el('p','shop-social-intro',description));
  return panel;
 };
 const errorText=response=>response?.error?.message;
 const findCard=(root,id)=>[...root.querySelectorAll('[data-shop-item-id]')].find(node=>node.dataset.shopItemId===id);
 const jumpTo=(root,id)=>{
  const reset=root.querySelector('.shop-explorer-reset');if(reset)reset.click();
  const card=findCard(root,id);
  if(card)card.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 };
 const insertBeforeCatalogue=(root,panels)=>{
  const before=root.querySelector('#shop-catalog-filters');
  for(const panel of panels){if(before)root.insertBefore(panel,before);else root.append(panel)}
 };
 async function makeReviews(root,overview,isCurrent){
  const stats=new Map(overview.map(r=>[r.item_id,r]));
  for(const card of root.querySelectorAll('[data-shop-item-id]')){
   const itemId=card.dataset.shopItemId;
   const stat=stats.get(itemId);
   if(!stat)continue;
   const box=el('div','shop-social-rating');
   const count=Number(stat.review_count||0);
   const score=Number(stat.average_rating||0);
   const heading=el('div','shop-social-rating-heading',count?'⭐ '+score.toFixed(1)+' / 5 · '+count+' valoración(es)':'⭐ Sin valoraciones');
   const reviewActions=el('div','shop-social-actions');
   const read=el('button','outline-btn mini','💬 Ver reseñas');
   read.type='button';reviewActions.append(read);
   const listing=el('div','shop-social-review-list');listing.hidden=true;
   read.onclick=async()=>{
    if(!listing.hidden){listing.hidden=true;read.textContent='💬 Ver reseñas';return}
    read.disabled=true;listing.hidden=false;listing.textContent='Cargando reseñas…';
    const {data,error}=await sb.rpc('shop_public_reviews',{p_item_id:itemId});
    if(!isCurrent()||!box.isConnected)return;
    listing.replaceChildren();
    if(error)listing.textContent='No se pudieron cargar las reseñas: '+error.message;
    else if(!(data||[]).length)listing.textContent='Aún no hay reseñas escritas.';
    else for(const row of data){
     const entry=el('div','shop-social-review');
     const caption=el('strong','',('★'.repeat(Math.max(1,Math.min(5,Number(row.rating))))+' · ')+(row.is_mine?'Tu reseña':'Miembro')+' · '+new Date(row.created_at).toLocaleDateString('es-ES'));
     entry.append(caption,el('p','',row.review));listing.append(entry);
    }
    read.disabled=false;read.textContent='Ocultar reseñas';
   };
   const purchased=!!card.querySelector('.shop-explorer-owned');
   if(purchased){
    const form=document.createElement('form');form.className='shop-social-review-form';form.hidden=true;
    const stars=document.createElement('select');stars.setAttribute('aria-label','Estrellas de la recompensa');
    for(let n=5;n>=1;n--){const opt=document.createElement('option');opt.value=String(n);opt.textContent=n+' estrella'+(n===1?'':'s');stars.append(opt)}
    stars.value=String(stat.my_rating||5);
    const comment=document.createElement('textarea');comment.maxLength=500;comment.rows=2;
    comment.placeholder='¿Qué te ha parecido? (máximo 500 caracteres)';
    comment.setAttribute('aria-label','Escribir reseña');comment.value=stat.my_review||'';
    const submit=el('button','gradient-btn mini','💾 Guardar valoración');submit.type='submit';
    const status=el('span','shop-social-status');status.setAttribute('role','status');
    form.append(stars,comment,submit,status);
    const toggle=el('button','outline-btn mini',stat.my_rating?'✏️ Editar valoración':'⭐ Valorar');
    toggle.type='button';toggle.onclick=()=>{form.hidden=!form.hidden;toggle.setAttribute('aria-expanded',String(!form.hidden))};
    toggle.setAttribute('aria-expanded','false');
    reviewActions.append(toggle);
    form.onsubmit=async event=>{
     event.preventDefault();submit.disabled=true;status.textContent='Guardando…';
     try{
      const {error}=await sb.rpc('save_shop_item_review',{p_item_id:itemId,p_rating:Number(stars.value),p_review:comment.value.trim()});
      if(error){status.textContent='Error: '+error.message;return}
      status.textContent='✓ Valoración guardada';
      await renderRewardShop();
      const next=findCard(document.getElementById('reward-shop'),itemId);
      next?.scrollIntoView({block:'center'});
     }catch(error){status.textContent='Error: '+(error?.message||String(error))}
     finally{submit.disabled=false}
    };
    box.append(heading,reviewActions,form,listing);
   }else box.append(heading,reviewActions,listing);
   card.append(box);
  }
 }
 function makeRanking(root,overview){
  const panel=section('🏆 Recompensas más populares','Ranking según compras realizadas. Las valoraciones sirven como información adicional.');
  const ranked=[...overview].filter(item=>Number(item.purchases||0)>0)
   .sort((a,b)=>Number(b.purchases||0)-Number(a.purchases||0)||Number(b.average_rating||0)-Number(a.average_rating||0)).slice(0,5);
  if(!ranked.length){panel.append(el('p','shop-social-empty','Todavía no hay compras suficientes para mostrar el ranking.'));return panel}
  const rows=el('div','shop-social-ranking');
  for(const [n,item] of ranked.entries()){
   const card=findCard(root,item.item_id);if(!card)continue;
   const label=card.querySelector('h4')?.textContent?.split(' · ')[0]||item.item_id;
   const entry=el('div','shop-social-rank');
   const medal=el('strong','shop-social-medal',['🥇','🥈','🥉'][n]||String(n+1)+'.');
   const name=el('div','shop-social-rank-name');
   name.append(el('strong','',label),el('small','',Number(item.purchases)+' compras'+(Number(item.review_count)?' · ⭐ '+Number(item.average_rating).toFixed(1):'')));
   const button=el('button','outline-btn mini','Ver artículo');button.type='button';button.onclick=()=>jumpTo(root,item.item_id);
   entry.append(medal,name,button);rows.append(entry);
  }
  panel.append(rows);
  return panel;
 }
 function makeAlerts(root,alerts){
  const unread=alerts.filter(a=>!a.read_at);
  const panel=section('🔔 Avisos de ofertas en deseos',
   'Si guardas una recompensa en deseos, aquí te avisamos al visitar la tienda cuando tenga una oferta activa.');
  const count=el('p','shop-social-alert-count',unread.length+' aviso(s) sin leer');panel.append(count);
  if(!alerts.length){panel.append(el('p','shop-social-empty','No tienes avisos de ofertas todavía. Guarda artículos con ♡ para recibirlos aquí.'));return panel}
  const rows=el('div','shop-social-alerts');
  for(const item of alerts.slice(0,20)){
   const row=el('article','shop-social-alert'+(item.read_at?' shop-social-alert--read':''));
   const body=el('div','shop-social-alert-body');
   body.append(el('strong','',item.read_at?'✓ Oferta vista':'🔥 Nueva oferta: '+item.item_name));
   body.append(el('small','','Precio promocional: '+points(item.sale_price)+' · '+date(item.created_at)));
   const actions=el('div','shop-social-actions');
   const jump=el('button','outline-btn mini','Ver recompensa');jump.type='button';jump.onclick=()=>jumpTo(root,item.item_id);actions.append(jump);
   if(!item.read_at){
    const read=el('button','outline-btn mini','Marcar leído');read.type='button';
    read.onclick=async()=>{
     read.disabled=true;
     const {error}=await sb.rpc('mark_my_shop_sale_alert_read',{p_item_id:item.item_id,p_sale_starts_at:item.sale_starts_at});
     if(error){read.disabled=false;read.textContent='Error al marcar';return}
     item.read_at=new Date().toISOString();row.classList.add('shop-social-alert--read');read.remove();
     count.textContent=alerts.filter(a=>!a.read_at).length+' aviso(s) sin leer';
    };
    actions.append(read);
   }
   row.append(body,actions);rows.append(row);
  }
  panel.append(rows);return panel;
 }
 async function makePacks(root,packs,balance,xp){
  const panel=section('🎁 Packs anime especiales','Consigue varias recompensas a un precio conjunto reducido. Los descuentos y el pago se validan en Supabase.');
  if(!packs.length){panel.append(el('p','shop-social-empty','Todavía no hay packs disponibles.'));return panel}
  const lvl=Math.min(50,Math.floor(Math.sqrt(Math.max(0,Number(xp||0))/100))+1);
  const grid=el('div','shop-social-pack-grid');
  for(const pack of packs){
   const card=el('article','shop-social-pack');
   const heading=el('div','shop-social-pack-heading');
   heading.append(el('h4','',pack.name),el('strong','shop-social-pack-discount','−'+pack.discount_percent+' %'));
   card.append(heading,el('p','',pack.description));
   const list=el('ul','shop-social-pack-items');
   for(const item of pack.items||[]){const li=el('li','','🎮 '+item.name);list.append(li)}
   card.append(list);
   const price=el('div','shop-social-pack-price');
   price.append(el('s','',points(pack.regular_points)),el('strong','',points(pack.pack_points)));
   card.append(price);
   const info=el('small','shop-social-pack-info','Ahorra '+points(Number(pack.regular_points)-Number(pack.pack_points))+(Number(pack.required_level)>1?' · Nivel '+pack.required_level:''));
   card.append(info);
   const button=el('button','gradient-btn mini','🛍️ Comprar pack');button.type='button';
   const status=el('p','shop-social-status');status.setAttribute('role','status');
   if(!pack.available){button.disabled=true;button.textContent='🔒 No disponible'}
   else if(Number(pack.owned_count)>0){button.disabled=true;button.textContent='✓ Ya tienes artículos del pack'}
   else if(lvl<Number(pack.required_level)){button.disabled=true;button.textContent='🔒 Requiere nivel '+pack.required_level}
   else if(Number(balance)<Number(pack.pack_points)){button.disabled=true;button.textContent='🔒 Faltan '+points(Number(pack.pack_points)-Number(balance))}
   button.onclick=async()=>{
    if(button.disabled)return;
    if(!confirm('¿Comprar '+pack.name+' por '+points(pack.pack_points)+'? Incluye '+pack.items.length+' recompensas.'))return;
    button.disabled=true;status.textContent='Procesando pack…';
    try{
     const {data:ok,error}=await sb.rpc('buy_shop_reward_pack',{requested_pack:pack.id});
     if(error){status.textContent='No se pudo comprar: '+error.message;return}
     if(ok)await renderRewardShop();else status.textContent='No se pudo completar la compra.';
    }catch(error){status.textContent='Error: '+(error?.message||String(error))}
    finally{button.disabled=false}
   };
   card.append(button,status);grid.append(card);
  }
  panel.append(grid);return panel;
 }
 renderRewardShop=async function(){
  const token=++generation;
  await previousRender();
  const root=document.getElementById('reward-shop');
  if(!root||!root.isConnected||!root.querySelector('#shop-catalog-filters'))return;
  const {data:{user}}=await sb.auth.getUser();
  if(!user||token!==generation||!root.isConnected)return;
  const [overviewRes,alertsRes,packsRes,balanceRes,xpRes]=await Promise.all([
   sb.rpc('shop_social_overview'),sb.rpc('sync_my_shop_sale_alerts'),
   sb.rpc('shop_pack_catalog'),sb.rpc('reward_shop_balance'),
   sb.rpc('community_member_xp',{target_member:user.id})
  ]);
  if(!root.isConnected||token!==generation)return;
  const panels=[];
  if(errorText(overviewRes)){
   panels.push(section('⭐ Valoraciones','No se pudieron cargar las valoraciones. '+errorText(overviewRes)));
  }else{
   const overview=overviewRes.data||[];
   panels.push(makeRanking(root,overview));
   await makeReviews(root,overview,()=>token===generation&&root.isConnected);
  }
  if(errorText(alertsRes)){panels.push(section('🔔 Avisos de ofertas','No se pudieron consultar los avisos. '+errorText(alertsRes)))}
  else panels.push(makeAlerts(root,alertsRes.data||[]));
  if(errorText(packsRes)||errorText(balanceRes)){
   panels.push(section('🎁 Packs anime','No se pudieron cargar los packs. '+(errorText(packsRes)||errorText(balanceRes))));
  }else panels.push(await makePacks(root,packsRes.data||[],balanceRes.data,xpRes.data));
  if(token===generation&&root.isConnected)insertBeforeCatalogue(root,panels);
 };
})();