// Shadows Byte Gaming Official V2 — secure coupon and time-limited item controls.
(function(){
 if(typeof adminInitRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=adminInitRewardShop;
 const element=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const field=(label,input)=>{
  const wrapper=element('label','sb-shop-admin__field');
  wrapper.append(element('span','',label),input);
  return wrapper;
 };
 const selectOptions=(select,rows)=>{
  select.replaceChildren();
  for(const [value,label] of rows){
   const option=document.createElement('option');option.value=String(value);option.textContent=label;
   select.append(option);
  }
 };
 const toLocal=value=>{
  if(!value)return '';
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
 };
 const fromLocal=value=>value?new Date(value).toISOString():null;
 const show=(status,message,error=false)=>{
  status.textContent=message;status.dataset.type=error?'error':'success';
 };
 const panel=(heading,detail)=>{
  const section=element('section','sb-shop-admin__section sb-shop-v3-panel');
  const intro=element('div','sb-shop-admin__section-heading');
  const title=element('div','');
  title.append(element('h3','',heading),element('p','',detail));
  intro.append(title);section.append(intro);return section;
 };
 const addNewFeatures=async()=>{
  const host=document.querySelector('#admin-shop-root .sb-shop-admin');
  if(!host)return;
  const [itemsRes,couponsRes]=await Promise.all([sb.rpc('admin_shop_items'),sb.rpc('admin_list_shop_coupons')]);
  if(!host.isConnected)return;
  if(itemsRes.error||couponsRes.error){
   const error=element('p','sb-shop-admin__status','No se pudieron cargar las opciones avanzadas: '+(itemsRes.error?.message||couponsRes.error?.message));
   error.dataset.type='error';host.append(error);return;
  }
  const items=itemsRes.data||[];
  const coupons=couponsRes.data||[];
  // Availability schedule, enforced for all purchase and gift operations in Supabase.
  const availability=panel('⏳ Artículos por tiempo limitado','Define desde cuándo se puede comprar y hasta cuándo. Sin fechas, el artículo no caduca.');
  const availabilityForm=element('form','sb-shop-v3-fields');
  const itemSelect=document.createElement('select');itemSelect.setAttribute('aria-label','Artículo para limitar');
  selectOptions(itemSelect,items.map(i=>[i.id,i.name]));
  const start=document.createElement('input');start.type='datetime-local';
  const end=document.createElement('input');end.type='datetime-local';
  availabilityForm.append(field('Artículo',itemSelect),field('Disponible desde (opcional)',start),field('Disponible hasta (opcional)',end));
  const scheduleButton=element('button','gradient-btn','💾 Guardar disponibilidad');scheduleButton.type='button';
  const clearSchedule=element('button','outline-btn','Quitar límite');clearSchedule.type='button';
  const buttons=element('div','sb-shop-v3-actions');buttons.append(scheduleButton,clearSchedule);
  const scheduleStatus=element('p','sb-shop-admin__status');scheduleStatus.setAttribute('role','status');
  availability.append(availabilityForm,buttons,scheduleStatus);
  const loadSchedule=()=>{
   const item=items.find(i=>i.id===itemSelect.value);if(!item)return;
   start.value=toLocal(item.available_from);end.value=toLocal(item.available_until);
   scheduleStatus.textContent='';scheduleStatus.removeAttribute('data-type');
  };
  itemSelect.onchange=loadSchedule;loadSchedule();
  clearSchedule.onclick=()=>{start.value='';end.value='';scheduleStatus.textContent='Fechas quitadas del formulario. Guarda para aplicar.'};
  availabilityForm.onsubmit=e=>{
   e.preventDefault();
   scheduleButton.click();
  };
  scheduleButton.onclick=async()=>{
   if(!itemSelect.value)return;
   if((start.value&&!Number.isFinite(Date.parse(start.value)))||(end.value&&!Number.isFinite(Date.parse(end.value)))){
    show(scheduleStatus,'Introduce fechas válidas.',true);return;
   }
   if(start.value&&end.value&&new Date(start.value)>=new Date(end.value)){
    show(scheduleStatus,'La fecha de fin debe ser posterior al inicio.',true);return;
   }
   scheduleButton.disabled=true;show(scheduleStatus,'Guardando disponibilidad…');
   try{
    const {error}=await sb.rpc('admin_set_shop_availability',{
     p_item_id:itemSelect.value,
     p_available_from:fromLocal(start.value),
     p_available_until:fromLocal(end.value)
    });
    if(error){show(scheduleStatus,'Error: '+error.message,true);return}
    const item=items.find(i=>i.id===itemSelect.value);
    if(item){item.available_from=fromLocal(start.value);item.available_until=fromLocal(end.value)}
    show(scheduleStatus,'✓ Disponibilidad guardada. La tienda respetará estas fechas.');
   }catch(error){show(scheduleStatus,'No se pudo guardar: '+error.message,true)}
   finally{scheduleButton.disabled=false}
  };
  if(!items.length){scheduleButton.disabled=true;clearSchedule.disabled=true}
  host.append(availability);

  // Coupon codes are stored and redeemed in Supabase; never trust browser-side prices.
  const couponsPanel=panel('🎟️ Cupones de descuento','Crea códigos del 5 % al 50 %, con fechas y usos máximos. Cada persona solo puede usar cada código una vez.');
  const couponForm=element('form','sb-shop-v3-fields');
  const existing=document.createElement('select');
  selectOptions(existing,[['','＋ Nuevo cupón'],...coupons.map(c=>[c.code,c.code+' · '+c.percent_off+' % · '+c.redeemed_count+' usos'])]);
  const code=document.createElement('input');code.type='text';code.maxLength=30;code.required=true;code.placeholder='EJEMPLO10';code.pattern='[A-Z0-9_-]{4,30}';
  code.addEventListener('input',()=>{code.value=code.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')});
  const percent=document.createElement('input');percent.type='number';percent.min='5';percent.max='50';percent.step='1';percent.required=true;percent.value='10';
  const couponStart=document.createElement('input');couponStart.type='datetime-local';couponStart.required=true;
  const couponEnd=document.createElement('input');couponEnd.type='datetime-local';couponEnd.required=true;
  const max=document.createElement('input');max.type='number';max.min='1';max.step='1';max.placeholder='Sin límite';
  const enabledLabel=element('label','sb-shop-admin__toggle');const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=true;
  enabledLabel.append(enabled,element('span','','Cupón activo'));
  couponForm.append(field('Seleccionar cupón',existing),field('Código',code),field('Descuento (%)',percent),
   field('Inicio',couponStart),field('Fin',couponEnd),field('Límite total de usos (opcional)',max),enabledLabel);
  const couponSave=element('button','gradient-btn','💾 Guardar cupón');couponSave.type='submit';
  const couponNew=element('button','outline-btn','＋ Nuevo código');couponNew.type='button';
  const couponActions=element('div','sb-shop-v3-actions');couponActions.append(couponSave,couponNew);
  const couponStatus=element('p','sb-shop-admin__status');couponStatus.setAttribute('role','status');
  const summary=element('div','sb-shop-v3-coupon-summary');
  couponsPanel.append(couponForm,couponActions,couponStatus,summary);host.append(couponsPanel);

  const setupNew=()=>{
   existing.value='';code.readOnly=false;code.value='';percent.value='10';
   const d=new Date(),until=new Date(d.getTime()+7*24*60*60*1000);
   couponStart.value=toLocal(d.toISOString());couponEnd.value=toLocal(until.toISOString());
   max.value='';enabled.checked=true;couponStatus.textContent='';couponStatus.removeAttribute('data-type');
  };
  const editCoupon=()=>{
   const current=coupons.find(c=>c.code===existing.value);
   if(!current){setupNew();return}
   code.value=current.code;code.readOnly=true;percent.value=String(current.percent_off);
   couponStart.value=toLocal(current.starts_at);couponEnd.value=toLocal(current.ends_at);
   max.value=current.max_redemptions??'';enabled.checked=!!current.active;
   couponStatus.textContent='Usos registrados: '+current.redeemed_count+'.';
  };
  const redrawSummary=()=>{
   summary.replaceChildren();
   for(const coupon of coupons){
    const card=element('article','sb-shop-v3-coupon');
    const title=element('strong','',coupon.code+' · '+coupon.percent_off+' %');
    const detail=element('span','',(coupon.active?'Activo':'Desactivado')+' · '+coupon.redeemed_count+
     (coupon.max_redemptions==null?' usos':' / '+coupon.max_redemptions+' usos'));
    const expiry=element('small','','Válido hasta '+new Date(coupon.ends_at).toLocaleString('es-ES'));
    card.append(title,detail,expiry);summary.append(card);
   }
   if(!coupons.length)summary.append(element('p','','Todavía no hay cupones. Crea el primero desde este formulario.'));
  };
  existing.onchange=editCoupon;
  couponNew.onclick=()=>{setupNew();code.focus()};
  couponForm.onsubmit=async e=>{
   e.preventDefault();
   const p=Number(percent.value),maxUses=max.value?Number(max.value):null;
   if(!/^[A-Z0-9_-]{4,30}$/.test(code.value)||!Number.isInteger(p)||p<5||p>50||
       (maxUses!==null&&(!Number.isInteger(maxUses)||maxUses<1))||
       !couponStart.value||!couponEnd.value||new Date(couponStart.value)>=new Date(couponEnd.value)){
    show(couponStatus,'Comprueba el código, el porcentaje y las fechas.',true);return;
   }
   couponSave.disabled=true;show(couponStatus,'Guardando cupón…');
   try{
    const {error}=await sb.rpc('admin_save_shop_coupon',{
     p_code:code.value,p_percent_off:p,p_starts_at:fromLocal(couponStart.value),
     p_ends_at:fromLocal(couponEnd.value),p_max_redemptions:maxUses,p_active:enabled.checked
    });
    if(error){show(couponStatus,'Error: '+error.message,true);return}
    const updated=await sb.rpc('admin_list_shop_coupons');
    if(updated.error){show(couponStatus,'Guardado, pero no se pudo refrescar la lista.',true);return}
    coupons.splice(0,coupons.length,...(updated.data||[]));
    selectOptions(existing,[['','＋ Nuevo cupón'],...coupons.map(c=>[c.code,c.code+' · '+c.percent_off+' % · '+c.redeemed_count+' usos'])]);
    existing.value=code.value;editCoupon();redrawSummary();
    show(couponStatus,'✓ Cupón guardado correctamente.');
   }catch(error){show(couponStatus,'No se pudo guardar: '+error.message,true)}
   finally{couponSave.disabled=false}
  };
  setupNew();redrawSummary();
 };
 adminInitRewardShop=async function(){
  await previous();
  await addNewFeatures();
 };
})();