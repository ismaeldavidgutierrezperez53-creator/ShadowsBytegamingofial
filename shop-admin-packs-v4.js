/* Panel de packs de la tienda — administración V4 */
(function(){
 if(typeof adminInitRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=adminInitRewardShop;
 const el=(tag,cls,label)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(label!==undefined)e.textContent=String(label);
  return e;
 };
 const field=(title,control)=>{
  const label=el('label','sb-shop-admin__field');label.append(el('span','',title),control);return label;
 };
 const addOptions=(select,values)=>{
  select.replaceChildren();
  for(const [value,label] of values){
   const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)
  }
 };
 const initPacks=async()=>{
  const host=document.querySelector('#admin-shop-root .sb-shop-admin');
  if(!host)return;
  const [packsRes,itemsRes]=await Promise.all([sb.rpc('admin_list_shop_packs'),sb.rpc('admin_shop_items')]);
  if(!host.isConnected)return;
  const panel=el('section','sb-shop-admin__section shop-admin-v4');
  const heading=el('div','sb-shop-admin__section-heading');
  const title=el('div');
  title.append(el('h3','','🎁 Packs anime especiales'),el('p','','Crea packs de 2 a 5 recompensas con un descuento conjunto del 5 al 40 %. Las compras son atómicas y no duplican artículos.'));
  heading.append(title);panel.append(heading);
  if(packsRes.error||itemsRes.error){
   panel.append(el('p','sb-shop-admin__status','No se pudieron cargar los packs: '+(packsRes.error?.message||itemsRes.error?.message)));
   host.append(panel);return;
  }
  const packs=packsRes.data||[],items=itemsRes.data||[];
  const form=el('form','shop-admin-v4-form');
  const select=document.createElement('select');select.setAttribute('aria-label','Pack para editar');
  const id=document.createElement('input');id.type='text';id.pattern='[a-z0-9_-]{4,60}';id.required=true;id.placeholder='pack_nuevo_anime';
  const name=document.createElement('input');name.type='text';name.minLength=3;name.maxLength=100;name.required=true;name.placeholder='Pack Anime Estelar';
  const description=document.createElement('textarea');description.rows=2;description.maxLength=700;description.placeholder='Qué incluye el pack…';
  const discount=document.createElement('input');discount.type='number';discount.min='5';discount.max='40';discount.step='1';discount.required=true;discount.value='15';
  const activeLabel=el('label','sb-shop-admin__toggle');const active=document.createElement('input');active.type='checkbox';active.checked=true;
  activeLabel.append(active,el('span','','Pack visible para los miembros'));
  form.append(field('Seleccionar pack',select),field('ID único',id),field('Nombre',name),field('Descuento (%)',discount),field('Descripción',description),activeLabel);
  const itemsTitle=el('h4','shop-admin-v4-items-title','Recompensas incluidas (elige de 2 a 5)');
  const choices=el('div','shop-admin-v4-choices');
  const checkboxes=[];
  for(const item of items){
   const label=el('label','shop-admin-v4-choice');
   const check=document.createElement('input');check.type='checkbox';check.value=item.id;
   const info=el('span','',item.name+' · '+item.price+' puntos · '+item.category);
   check.onchange=()=>{
    const selected=checkboxes.filter(x=>x.checked).length;
    if(selected>5){check.checked=false;status.textContent='Máximo 5 artículos por pack.';status.dataset.type='error'}
    else updateSelection();
   };
   label.append(check,info);choices.append(label);checkboxes.push(check);
  }
  const selectedCount=el('p','shop-admin-v4-selected','');
  const actions=el('div','shop-admin-v4-actions');
  const save=el('button','gradient-btn','💾 Guardar pack');save.type='submit';
  const reset=el('button','outline-btn','＋ Nuevo pack');reset.type='button';
  actions.append(save,reset);
  const status=el('p','sb-shop-admin__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  form.append(itemsTitle,choices,selectedCount,actions,status);panel.append(form);
  const summary=el('div','shop-admin-v4-summary');panel.append(summary);
  host.append(panel);
  const updateSelection=()=>{
   selectedCount.textContent=checkboxes.filter(check=>check.checked).length+' / 5 artículos seleccionados';
  };
  const populateOptions=()=>addOptions(select,[['','＋ Crear pack nuevo'],...packs.map(p=>[p.id,p.name+' · '+p.discount_percent+' %'])]);
  const newPack=()=>{
   select.value='';id.readOnly=false;id.value='';name.value='';description.value='';
   discount.value='15';active.checked=true;
   checkboxes.forEach(check=>{check.checked=false});
   status.textContent='';status.removeAttribute('data-type');updateSelection();
  };
  const editPack=()=>{
   const pack=packs.find(p=>p.id===select.value);
   if(!pack){newPack();return}
   id.value=pack.id;id.readOnly=true;
   name.value=pack.name;description.value=pack.description||'';
   discount.value=String(pack.discount_percent);active.checked=!!pack.active;
   const keys=new Set(pack.item_ids||[]);
   checkboxes.forEach(check=>{check.checked=keys.has(check.value)});
   status.textContent='Editando: '+pack.name;status.removeAttribute('data-type');updateSelection();
  };
  const redraw=()=>{
   summary.replaceChildren();
   if(!packs.length){summary.append(el('p','','No hay packs creados todavía.'));return}
   for(const pack of packs){
    const card=el('article','shop-admin-v4-pack');
    card.append(el('strong','',pack.name),el('span','',(pack.active?'● Visible':'● Oculto')+' · −'+pack.discount_percent+' %'));
    const info=el('small','',(pack.item_ids||[]).length+' recompensas');
    const button=el('button','outline-btn mini','Editar');button.type='button';
    button.onclick=()=>{select.value=pack.id;editPack();panel.scrollIntoView({behavior:'smooth',block:'start'})};
    card.append(info,button);summary.append(card);
   }
  };
  populateOptions();newPack();redraw();
  select.onchange=editPack;reset.onclick=()=>{newPack();id.focus()};
  form.onsubmit=async event=>{
   event.preventDefault();const chosen=checkboxes.filter(check=>check.checked).map(check=>check.value);
   if(chosen.length<2||chosen.length>5){status.textContent='Selecciona entre 2 y 5 recompensas.';status.dataset.type='error';return}
   const payload={
    p_id:id.value.trim(),p_name:name.value.trim(),p_description:description.value.trim(),
    p_discount_percent:Number(discount.value),p_active:active.checked,p_item_ids:chosen
   };
   save.disabled=true;status.textContent='Guardando pack…';status.removeAttribute('data-type');
   try{
    const {error}=await sb.rpc('admin_save_shop_pack',payload);
    if(error){status.textContent='No se pudo guardar: '+error.message;status.dataset.type='error';return}
    const {data,error:reloadError}=await sb.rpc('admin_list_shop_packs');
    if(reloadError){status.textContent='Guardado. Actualiza el panel para ver la lista.';status.dataset.type='success';return}
    packs.splice(0,packs.length,...(data||[]));
    populateOptions();select.value=payload.p_id;editPack();redraw();
    status.textContent='✓ Pack guardado. La tienda comprobará el saldo y el nivel antes de comprar.';
    status.dataset.type='success';
   }catch(error){status.textContent='Error: '+(error?.message||String(error));status.dataset.type='error'}
   finally{save.disabled=false}
  };
 };
 adminInitRewardShop=async function(){
  await previous();
  await initPacks();
 };
})();