/* Shadows Byte Gaming Official V2 - Tienda V10
 * Logros de compra, postales de regalo, premios de nivel e historial privado.
 * Los cambios económicos y desbloqueos se verifican en Supabase.
 */
(function(){
 'use strict';
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=renderRewardShop;
 let generation=0,mailGeneration=0;
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);return node;
 };
 const pts=value=>Number(value||0).toLocaleString('es-ES')+' puntos';
 const date=value=>new Date(value).toLocaleString('es-ES');
 const rootPanel=(title,description,cls)=>{
  const el=make('section','shop-v10-panel '+(cls||''));el.append(make('h3','',title));
  if(description)el.append(make('p','shop-v10-intro',description));return el;
 };
 const put=(host,panel)=>{
  const anchor=host.querySelector('#shop-catalog-filters');
  if(anchor)host.insertBefore(panel,anchor);else host.append(panel);
 };
 const banner=(host,title,message)=>{
  const p=rootPanel(title,message,'shop-v10-failed');put(host,p);
 };
 const checkCurrent=(ticket,host)=>ticket===generation&&host?.isConnected;
 const showStatus=(node,message)=>{node.textContent=message;node.setAttribute('role','status');};
 const purchases=[
  [1,'🥉','Primera Compra'],[3,'🥈','Coleccionista Novato'],
  [5,'🥇','Cazador de Recompensas'],[10,'💎','Maestro de la Tienda'],
  [20,'👑','Leyenda del Coleccionismo']
 ];
 function achievementsPanel(earned,total){
  const p=rootPanel('🏅 Logros exclusivos por compras','Colecciona insignias automáticamente. Solo cuentan las compras de pago; no se cobran puntos adicionales.','shop-v10-achievements');
  const current=new Set((earned||[]).map(b=>Number(b.milestone)));
  const count=Number(total||0);
  const achieved=current.size;
  const stats=make('p','shop-v10-stat',count+' compras de pago · '+achieved+'/'+purchases.length+' logros desbloqueados');
  p.append(stats);
  const grid=make('div','shop-v10-grid');
  for(const [limit,icon,name] of purchases){
   const unlocked=current.has(limit);
   const card=make('div','shop-v10-trophy '+(unlocked?'is-earned':'is-locked'));
   card.append(make('span','shop-v10-emoji',unlocked?icon:'🔒'),make('strong','',name),
    make('small','',unlocked?'✓ Conseguido':'Progreso: '+Math.min(count,limit)+' / '+limit+' compras'));
   const prog=make('progress');prog.max=limit;prog.value=Math.min(count,limit);
   prog.setAttribute('aria-label','Progreso de '+name);card.append(prog);grid.append(card);
  }
  p.append(grid);
  return p;
 }
 function levelPanel(rows,ticket,host){
  const items=rows||[];
  const current=items.length?Number(items[0].current_level||1):1;
  const p=rootPanel('⭐ Recompensas exclusivas por nivel','Desbloquea recompensas especiales gratuitas al subir de nivel. Cada premio solo puede reclamarse una vez.','shop-v10-levels');
  p.append(make('p','shop-v10-stat','Tu nivel actual: '+current));
  const grid=make('div','shop-v10-grid');
  for(const item of items){
   const unlocked=current>=Number(item.min_level);
   const card=make('article','shop-v10-level-card '+(unlocked?'is-available':'is-locked'));
   card.append(make('span','shop-v10-tag',item.claimed?'✅ En tu colección':unlocked?'✨ Puedes reclamarlo':'🔒 Nivel '+item.min_level),
    make('h4','',item.reward_name),make('p','',item.description||'Recompensa de nivel.'));
   const progress=make('progress');progress.max=item.min_level;progress.value=Math.min(current,item.min_level);
   progress.setAttribute('aria-label','Progreso de nivel para '+item.reward_name);
   card.append(progress,make('small','',current+' / '+item.min_level+' niveles'));
   const status=make('p','shop-v10-status','');status.setAttribute('role','status');
   const button=make('button','outline-btn mini',item.claimed?(item.equipped?'✓ Equipado':'Equipar recompensa'):'Reclamar gratis');
   button.type='button';button.disabled=!unlocked||!!item.equipped;
   button.onclick=async()=>{
    button.disabled=true;showStatus(status,item.claimed?'Equipando…':'Comprobando tu nivel…');
    const action=item.claimed?
     sb.rpc('equip_reward_shop_item',{requested_item:item.item_id}):
     sb.rpc('shop_claim_level_exclusive',{p_item_id:item.item_id});
    try{
     const {data,error}=await action;
     if(!checkCurrent(ticket,host))return;
     if(error){showStatus(status,'No se pudo completar: '+error.message);button.disabled=false;return;}
     if(data===false){showStatus(status,'El premio ya estaba reclamado. Actualizando…');}
     await renderRewardShop();
    }catch(err){
     if(checkCurrent(ticket,host)){showStatus(status,'Error de conexión: '+(err?.message||String(err)));button.disabled=false;}
    }
   };
   card.append(button,status);grid.append(card);
  }
  p.append(grid);
  if(!items.length)p.append(make('p','','No hay recompensas de nivel disponibles.'));
  return p;
 }
 const themeLabels={sakura:'🌸 Sakura',neon:'⚡ Neón',royal:'👑 Real'};
 function postcardsPanel(notes,gifts,user){
  const p=rootPanel('💌 Dedicatorias de regalos','Mensajes especiales que has recibido o enviado. Solo los participantes pueden verlos.','shop-v10-postcards');
  const list=notes||[];
  const giftMap=new Map((gifts||[]).map(g=>[String(g.id),g]));
  if(!list.length){p.append(make('p','','Todavía no tienes regalos con dedicatoria.'));return p;}
  const grid=make('div','shop-v10-postcard-list');
  for(const row of list.slice(0,12)){
   const gift=giftMap.get(String(row.gift_id));
   const received=row.recipient_id===user.id;
   const card=make('article','shop-v10-postcard theme-'+row.wrapping);
   card.append(make('strong','',received?'💌 Regalo recibido':'🎀 Regalo enviado'),
    make('span','',themeLabels[row.wrapping]||'🎁 Especial'),
    make('blockquote','',row.message),
    make('small','',date(row.created_at)+(gift?.item_id?' · Artículo: '+gift.item_id:'')));
   grid.append(card);
  }
  p.append(grid);return p;
 }
 function giftPanel(items,members,balance,notes,gifts,user,ticket,host){
  const p=rootPanel('🎁 Regalos especiales entre miembros','Envía una recompensa con un envoltorio anime y una dedicatoria. Se cobran los puntos del artículo una sola vez.','shop-v10-gifts');
  const now=Date.now();
  const available=(items||[]).filter(i=>i.active&&(!i.available_from||now>=Date.parse(i.available_from))&&(!i.available_until||now<Date.parse(i.available_until)));
  const currentPrice=i=>i.sale_price!=null&&i.sale_starts_at&&i.sale_ends_at&&now>=Date.parse(i.sale_starts_at)&&now<Date.parse(i.sale_ends_at)?Number(i.sale_price):Number(i.price);
  if(!(members||[]).length||!available.length){
   p.append(make('p','','No hay miembros públicos disponibles o no hay artículos activos para regalar.'));
  }else{
   const form=make('form','shop-v10-gift-form');
   const field=(title,control)=>{
    const label=make('label','shop-v10-field');label.append(make('span','',title),control);return label;
   };
   const recipient=make('select');recipient.required=true;
   const blank=make('option','','Selecciona un miembro…');blank.value='';recipient.append(blank);
   for(const m of members){
    const option=make('option','',m.display_name||m.username||'Miembro');
    option.value=m.id;recipient.append(option);
   }
   const itemSelect=make('select');itemSelect.required=true;
   for(const i of available){
    const option=make('option','',i.name+' · '+pts(currentPrice(i)));
    option.value=i.id;itemSelect.append(option);
   }
   const wrapping=make('select');
   for(const [key,label] of Object.entries(themeLabels)){
    const option=make('option','',label);option.value=key;wrapping.append(option);
   }
   const message=make('textarea');message.required=true;message.maxLength=180;message.rows=3;
   message.placeholder='Escribe un mensaje especial para esta persona…';
   const preview=make('div','shop-v10-gift-preview');
   const updatePreview=()=>{
    const product=available.find(i=>i.id===itemSelect.value);
    preview.replaceChildren(make('strong','','💝 Vista de tu postal'),
     make('span','',themeLabels[wrapping.value]||'🌸 Sakura'),
     make('p','',message.value.trim()||'Tu dedicatoria aparecerá aquí.'),
     make('small','',product?'Precio: '+pts(currentPrice(product)):''));
   };
   for(const input of [itemSelect,wrapping,message])input.addEventListener('input',updatePreview);
   updatePreview();
   const confirmButton=make('button','gradient-btn mini','🎀 Enviar regalo especial');confirmButton.type='submit';
   const status=make('p','shop-v10-status','');status.setAttribute('role','status');
   form.append(field('Destinatario',recipient),field('Recompensa',itemSelect),
    field('Envoltorio',wrapping),field('Dedicatoria (máximo 180 caracteres)',message),
    preview,make('p','shop-v10-stat','Saldo disponible: '+pts(balance)),confirmButton,status);
   form.onsubmit=async event=>{
    event.preventDefault();
    const item=available.find(i=>i.id===itemSelect.value);
    if(!recipient.value||!item||!message.value.trim()){showStatus(status,'Completa el destinatario, la recompensa y la dedicatoria.');return;}
    const amount=currentPrice(item);
    if(amount>balance){showStatus(status,'No tienes puntos suficientes para enviar esta recompensa.');return;}
    const recipientText=recipient.options[recipient.selectedIndex]?.textContent||'este miembro';
    if(!confirm('¿Enviar '+item.name+' a '+recipientText+' por '+pts(amount)+'? El regalo se cobra una sola vez.'))return;
    confirmButton.disabled=true;showStatus(status,'Enviando regalo especial…');
    try{
     const {data,error}=await sb.rpc('shop_send_special_gift',{p_item_id:item.id,p_recipient_id:recipient.value,
      p_message:message.value.trim(),p_wrapping:wrapping.value});
     if(!checkCurrent(ticket,host))return;
     if(error){showStatus(status,'No se pudo enviar: '+error.message);confirmButton.disabled=false;return;}
     if(!data){showStatus(status,'El destinatario ya tiene ese artículo. No se han descontado puntos.');confirmButton.disabled=false;return;}
     showStatus(status,'✅ Regalo enviado y dedicatoria guardada.');
     await renderRewardShop();
    }catch(err){
     if(checkCurrent(ticket,host)){showStatus(status,'Error: '+(err?.message||String(err)));confirmButton.disabled=false;}
    }
   };
   p.append(form);
  }
  p.append(postcardsPanel(notes,gifts,user));
  const go=make('a','shop-v10-mail-link','📨 Ver buzón de regalos');
  go.href='#/regalos';p.append(go);
  return p;
 }
 const eventLabels={
  purchase:'Compras',gift_sent:'Regalos enviados',gift_received:'Regalos recibidos',
  level_exclusive:'Premios de nivel',daily_bonus:'Bonos diarios',welcome_bonus:'Bonos',
  level_points:'Puntos por nivel',shop_mission:'Misiones',
  shop_challenge:'Desafíos',shop_season:'Temporadas'
 };
 function historyPanel(rows,balance){
  const p=rootPanel('📜 Historial avanzado de compras y puntos',
   'Movimientos recientes de la tienda, regalos y premios registrados. El saldo real incluye también XP de la comunidad, que puede variar independientemente.','shop-v10-history');
  const all=rows||[];
  p.append(make('p','shop-v10-stat','Saldo actual: '+pts(balance)+' · '+all.length+' movimientos cargados (máximo 150)'));
  const filter=make('select');filter.setAttribute('aria-label','Filtrar movimientos por tipo');
  const opts=[['all','Todos los movimientos'],...Object.entries(eventLabels)];
  for(const [value,name] of opts){
   const option=make('option','',name);option.value=value;filter.append(option);
  }
  const search=make('input');search.type='search';search.placeholder='Buscar movimiento…';search.maxLength=100;
  search.setAttribute('aria-label','Buscar movimientos');
  const inputs=make('div','shop-v10-history-filters');inputs.append(filter,search);
  const download=make('button','outline-btn mini','⬇ Exportar CSV de los movimientos visibles');
  download.type='button';
  const result=make('p','shop-v10-history-count','');result.setAttribute('role','status');
  const list=make('div','shop-v10-history-list');
  const visible=()=>all.filter(r=>
   (filter.value==='all'||r.event_type===filter.value)&&
   String(r.title||'').toLocaleLowerCase('es').includes(search.value.trim().toLocaleLowerCase('es'))
  );
  const paint=()=>{
   list.replaceChildren();
   const entries=visible();
   result.textContent=entries.length+' movimientos mostrados';
   if(!entries.length){list.append(make('p','','No hay movimientos con estos filtros.'));return;}
   for(const r of entries){
    const row=make('div','shop-v10-history-row');
    const details=make('div','shop-v10-history-info');
    details.append(make('strong','',r.title),make('small','',date(r.occurred_at)+' · '+(eventLabels[r.event_type]||r.event_type)));
    const n=Number(r.points_delta||0);
    row.append(details,make('span','shop-v10-delta '+(n<0?'negative':n>0?'positive':'neutral'),
     (n>0?'+':'')+n.toLocaleString('es-ES')+' pts'));
    list.append(row);
   }
  };
  filter.onchange=paint;search.oninput=paint;
  download.onclick=()=>{
   const data=visible();
   if(!data.length)return;
   const escape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
   const csv=['Fecha;Tipo;Movimiento;Puntos',
    ...data.map(x=>[date(x.occurred_at),eventLabels[x.event_type]||x.event_type,x.title,x.points_delta].map(escape).join(';'))].join('\r\n');
   const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob);const a=make('a');
   a.href=url;a.download='historial-tienda-shadows-byte.csv';document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  p.append(inputs,download,result,list);paint();return p;
 }
 async function loadPostcards(user){
  const {data:notes,error}=await sb.from('member_shop_special_gift_notes')
   .select('gift_id,sender_id,recipient_id,wrapping,message,created_at')
   .or('sender_id.eq.'+user.id+',recipient_id.eq.'+user.id)
   .order('created_at',{ascending:false}).limit(25);
  if(error)return {error};
  const ids=(notes||[]).map(n=>n.gift_id);
  if(!ids.length)return {notes:[],gifts:[]};
  const result=await sb.from('member_shop_gifts').select('id,item_id,sender_id,recipient_id').in('id',ids);
  if(result.error)return {notes:notes||[],gifts:[]};
  return {notes:notes||[],gifts:result.data||[]};
 }
 renderRewardShop=async function(){
  const ticket=++generation;
  await previous();
  const host=document.getElementById('reward-shop');
  if(!checkCurrent(ticket,host)||!host.querySelector('#shop-catalog-filters'))return;
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||!checkCurrent(ticket,host))return;
   const [ach,qty,levels,history,balance,items,members,postcards]=await Promise.all([
    sb.rpc('shop_sync_purchase_badges'),
    sb.from('member_shop_purchases').select('id',{count:'exact',head:true}).eq('user_id',user.id).gt('price_paid',0),
    sb.rpc('shop_level_exclusive_catalog'),
    sb.rpc('shop_my_history',{p_limit:150}),
    sb.rpc('reward_shop_balance'),
    sb.from('reward_shop_items').select('id,category,name,price,required_level,active,available_from,available_until,sale_price,sale_starts_at,sale_ends_at').eq('active',true),
    sb.from('profiles').select('id,display_name,username').eq('is_public',true).neq('id',user.id).order('display_name').limit(100),
    loadPostcards(user)
   ]);
   if(!checkCurrent(ticket,host))return;
   if(ach.error||qty.error)banner(host,'🏅 Logros de compras',ach.error?.message||qty.error?.message);
   else put(host,achievementsPanel(ach.data||[],qty.count||0));
   if(levels.error)banner(host,'⭐ Premios de nivel',levels.error.message);
   else put(host,levelPanel(levels.data||[],ticket,host));
   if(items.error||members.error||balance.error||postcards.error){
    banner(host,'🎁 Regalos especiales',items.error?.message||members.error?.message||balance.error?.message||postcards.error?.message);
   }else put(host,giftPanel(items.data||[],members.data||[],Number(balance.data||0),
     postcards.notes||[],postcards.gifts||[],user,ticket,host));
   if(history.error||balance.error)banner(host,'📜 Historial',history.error?.message||balance.error?.message);
   else put(host,historyPanel(history.data||[],balance.data));
  }catch(error){
   if(checkCurrent(ticket,host))banner(host,'✨ Tienda V10',error?.message||String(error));
  }
 };
 if(typeof renderGiftMailbox==='function'){
  const oldMailbox=renderGiftMailbox;
  renderGiftMailbox=async function(){
   const ticket=++mailGeneration;
   await oldMailbox();
   const host=document.getElementById('gift-mailbox');
   if(ticket!==mailGeneration||!host?.isConnected)return;
   const {data:{user}}=await sb.auth.getUser();
   if(!user||!host.isConnected||ticket!==mailGeneration)return;
   const r=await loadPostcards(user);
   if(ticket!==mailGeneration||!host.isConnected||host.querySelector('.shop-v10-mail-postcards'))return;
   const p=r.error?rootPanel('💌 Dedicatorias','No se pudieron cargar: '+r.error.message,'shop-v10-mail-postcards'):
     postcardsPanel((r.notes||[]).filter(n=>n.recipient_id===user.id),r.gifts||[],user);
   p.classList.add('shop-v10-mail-postcards');host.prepend(p);
  };
 }
})();