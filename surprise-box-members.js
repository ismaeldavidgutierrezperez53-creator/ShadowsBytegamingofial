/* Estadísticas individuales de cajas misteriosas. Acceso controlado en Supabase. */
(function(){
 'use strict';
 const make=(tag,css,text)=>{
  const element=document.createElement(tag);
  if(css)element.className=css;
  if(text!==undefined)element.textContent=String(text);
  return element;
 };
 const fmt=value=>Number(value||0).toLocaleString('es-ES');
 const pad=items=>Array.isArray(items)?items:[];
 const pageSize=25;
 function mount({sb,tierSelect,periodSelect,formatDate}){
  const panel=make('section','sb-box-members');
  panel.setAttribute('aria-labelledby','sb-box-members-heading');
  const intro=make('div','sb-box-members__heading');
  const title=make('h3',null,'👥 Estadísticas por miembro');
  title.id='sb-box-members-heading';
  const description=make('p',null,'Consulta las cajas que ha recibido y abierto cada miembro, las pendientes y los premios revelados.');
  intro.append(title,description);
  const help=make('p','sb-box-members__note','Se aplican los filtros de caja y periodo del panel superior (según la fecha de envío). Se incluyen los miembros con cero aperturas. El filtro «Estado» solo afecta al historial general.');
  const searchForm=document.createElement('form');
  searchForm.className='sb-box-members__search';
  searchForm.setAttribute('role','search');
  const searchLabel=make('label',null,'Buscar miembro o usuario');
  const searchInput=make('input','sb-box-members__input');
  searchInput.type='search';
  searchInput.maxLength=80;
  searchInput.placeholder='Nombre o @usuario';
  searchInput.autocomplete='off';
  searchLabel.append(searchInput);
  const searchBtn=make('button','sb-box-members__action','🔎 Buscar');
  searchBtn.type='submit';
  const clearBtn=make('button','sb-box-members__action sb-box-members__action--quiet','Limpiar');
  clearBtn.type='button';
  searchForm.append(searchLabel,searchBtn,clearBtn);
  const status=make('p','sb-box-members__status','Cargando miembros…');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const tableTitle=make('h4',null,'Miembros registrados');
  const tableWrap=make('div','sb-box-members__table-scroll');
  const table=make('table','sb-box-members__table');
  const thead=document.createElement('thead');
  const hrow=document.createElement('tr');
  for(const heading of ['Miembro','Recibidas','Abiertas','Pendientes','Valor (puntos)','Detalle']){
   const th=make('th',null,heading);
   th.scope='col';
   hrow.append(th);
  }
  thead.append(hrow);
  const tbody=document.createElement('tbody');
  table.append(thead,tbody);
  tableWrap.append(table);
  const pager=make('div','sb-box-members__pager');
  const prev=make('button','sb-box-members__action sb-box-members__action--quiet','← Anterior');
  prev.type='button';
  const pageLabel=make('span',null,'Página 1');
  const next=make('button','sb-box-members__action sb-box-members__action--quiet','Siguiente →');
  next.type='button';
  pager.append(prev,pageLabel,next);

  const detail=make('section','sb-box-members__detail');
  detail.hidden=true;
  detail.setAttribute('aria-labelledby','sb-box-member-detail-heading');
  const detailHead=make('div','sb-box-members__detail-head');
  const detailHeading=make('h4',null,'Detalle del miembro');
  detailHeading.id='sb-box-member-detail-heading';
  const close=make('button','sb-box-members__action sb-box-members__action--quiet','✕ Cerrar detalle');
  close.type='button';
  detailHead.append(detailHeading,close);
  const detailMessage=make('p','sb-box-members__status','');
  detailMessage.setAttribute('role','status');
  detailMessage.setAttribute('aria-live','polite');
  const cards=make('div','sb-box-members__cards');
  const statsGrid=make('div','sb-box-members__sections');
  const prizesCol=make('section','sb-box-members__section');
  const prizeHeading=make('h5',null,'🏆 Premios conseguidos');
  const prizeItems=make('div','sb-box-members__items');
  prizesCol.append(prizeHeading,prizeItems);
  const boxesCol=make('section','sb-box-members__section');
  const boxesHeading=make('h5',null,'🎁 Cajas recibidas por tipo');
  const boxItems=make('div','sb-box-members__items');
  boxesCol.append(boxesHeading,boxItems);
  statsGrid.append(prizesCol,boxesCol);
  const historyHeading=make('h5','sb-box-members__history-heading','📜 Historial de cajas del miembro');
  const historyNote=make('p','sb-box-members__note','El premio permanece oculto hasta que el miembro abre la caja.');
  const detailWrap=make('div','sb-box-members__table-scroll');
  const detailTable=make('table','sb-box-members__table sb-box-members__detail-table');
  const detailThead=document.createElement('thead');
  const detailHRow=document.createElement('tr');
  for(const label of ['Enviada','Caja','Premio','Remitente','Apertura','Valor']){
   const th=make('th',null,label);th.scope='col';detailHRow.append(th);
  }
  detailThead.append(detailHRow);
  const detailTbody=document.createElement('tbody');
  detailTable.append(detailThead,detailTbody);
  detailWrap.append(detailTable);
  const detailPager=make('div','sb-box-members__pager');
  const detailPrev=make('button','sb-box-members__action sb-box-members__action--quiet','← Anterior');
  detailPrev.type='button';
  const detailPageLabel=make('span',null,'Página 1');
  const detailNext=make('button','sb-box-members__action sb-box-members__action--quiet','Siguiente →');
  detailNext.type='button';
  detailPager.append(detailPrev,detailPageLabel,detailNext);
  detail.append(detailHead,detailMessage,cards,statsGrid,historyHeading,historyNote,detailWrap,detailPager);
  panel.append(intro,help,searchForm,status,tableTitle,tableWrap,pager,detail);

  let listPage=0,detailPage=0,query='',selectedId=null;
  let listRequest=0,detailRequest=0;
  let loadingList=false,loadingDetail=false;
  const state={
   tier:()=>tierSelect.value||null,
   days:()=>periodSelect.value?Number(periodSelect.value):null
  };
  const td=(value,cls)=>{
   const cell=make('td',cls,String(value));
   return cell;
  };
  const noteEmpty=(body,colSpan,message)=>{
   body.replaceChildren();
   const row=document.createElement('tr');
   const cell=td(message,'sb-box-members__empty');cell.colSpan=colSpan;
   row.append(cell);body.append(row);
  };
  const newStat=(caption,value)=>{
   const block=make('article','sb-box-members__stat');
   block.append(make('span',null,caption),make('strong',null,fmt(value)));
   return block;
  };
  const renderList=result=>{
   const people=pad(result?.members);
   const total=Math.max(0,Number(result?.members_total||0));
   tbody.replaceChildren();
   if(people.length===0)noteEmpty(tbody,6,
    query?'No hay miembros que coincidan con esta búsqueda.':'No se han encontrado miembros.');
   for(const member of people){
    const tr=document.createElement('tr');
    const person=make('span','sb-box-members__person');
    person.append(make('strong',null,member.name||'Miembro'));
    if(member.username)person.append(make('small',null,'@'+member.username.replace(/^@/,'').slice(0,120)));
    const who=document.createElement('td');who.append(person);
    const actionCell=document.createElement('td');
    const button=make('button','sb-box-members__open','👁️ Ver premios');
    button.type='button';
    button.setAttribute('aria-label','Ver estadísticas de '+(member.name||'Miembro'));
    button.addEventListener('click',()=>{
     selectedId=member.member_id;
     detailPage=0;
     loadDetail();
    });
    actionCell.append(button);
    tr.append(who,td(fmt(member.received)),td(fmt(member.opened)),
      td(fmt(member.pending)),td(fmt(member.points)),actionCell);
    if(member.member_id===selectedId)tr.classList.add('is-selected');
    tbody.append(tr);
   }
   const pages=Math.max(1,Math.ceil(total/pageSize));
   pageLabel.textContent='Página '+(listPage+1)+' de '+pages+' · '+fmt(total)+' miembros';
   prev.disabled=listPage===0;
   next.disabled=(listPage+1)*pageSize>=total;
   pager.hidden=total<=pageSize;
  };
  async function loadList(){
   const request=++listRequest;
   loadingList=true;
   prev.disabled=true;next.disabled=true;searchBtn.disabled=true;clearBtn.disabled=true;
   status.textContent='Cargando estadísticas de miembros…';
   delete status.dataset.type;
   try{
    const {data,error}=await sb.rpc('admin_surprise_box_member_stats',{
     p_tier:state.tier(),p_days:state.days(),p_search:query,
     p_limit:pageSize,p_offset:listPage*pageSize
    });
    if(request!==listRequest||!panel.isConnected)return;
    if(error)throw error;
    if(!data||!Array.isArray(data.members))throw new Error('Respuesta de miembros incorrecta.');
    renderList(data);
    status.textContent='Miembros actualizados. Selecciona «Ver premios» para consultar sus estadísticas.';
    status.dataset.type='success';
   }catch(error){
    if(request!==listRequest||!panel.isConnected)return;
    noteEmpty(tbody,6,'No se pudieron cargar los miembros.');
    status.dataset.type='error';
    status.textContent='Error al cargar los miembros: '+(error.message||'Inténtalo de nuevo.');
   }finally{
    if(request===listRequest&&panel.isConnected){
     loadingList=false;searchBtn.disabled=false;clearBtn.disabled=false;
    }
   }
  }
  const showLines=(container,records,key,format)=>{
   container.replaceChildren();
   if(!records.length){
    container.append(make('p','sb-box-members__no-items',
      key==='quantity'?'Todavía no ha revelado ningún premio.':'Todavía no ha recibido cajas con estos filtros.'));
    return;
   }
   for(const item of records){
    const line=make('div','sb-box-members__item');
    line.append(make('span',null,item.name||item.box_name||'Caja'),
      make('strong',null,format(item)));
    container.append(line);
   }
  };
  const renderDetail=data=>{
   const person=data?.member;
   if(!person)throw new Error('No se encontró el perfil seleccionado.');
   detailHeading.textContent='👤 '+(person.name||'Miembro');
   if(person.username){
    const username=make('small','sb-box-members__handle','@'+person.username.replace(/^@/,'').slice(0,120));
    detailHeading.append(' ',username);
   }
   const summary=data.summary||{};
   cards.replaceChildren(
    newStat('📦 Cajas recibidas',summary.received),
    newStat('🎉 Cajas abiertas',summary.opened),
    newStat('⏳ Pendientes',summary.pending),
    newStat('🪙 Valor recibido en puntos',summary.points)
   );
   showLines(prizeItems,pad(data.prizes),'quantity',x=>fmt(x.quantity)+' ×');
   showLines(boxItems,pad(data.by_box),'received',x=>fmt(x.opened)+' / '+fmt(x.received)+' abiertas');
   detailTbody.replaceChildren();
   const history=pad(data.history);
   if(history.length===0)noteEmpty(detailTbody,6,'Este miembro aún no tiene cajas en el periodo seleccionado.');
   for(const gift of history){
    const row=document.createElement('tr');
    const opened=Boolean(gift.opened_at);
    row.append(
     td(formatDate(gift.created_at)),
     td(gift.box_name||'Caja'),
     td(opened?(gift.prize_name||'Premio'):'🔒 Sin revelar'),
     td(gift.sender_name||'Miembro'),
     td(opened?'✓ '+formatDate(gift.opened_at):'⏳ Pendiente',opened?'sb-box-members__opened':'sb-box-members__pending'),
     td(fmt(gift.price_paid))
    );
    detailTbody.append(row);
   }
   const total=Math.max(0,Number(data.history_total||0));
   detailPageLabel.textContent='Página '+(detailPage+1)+' de '+Math.max(1,Math.ceil(total/pageSize))
    +' · '+fmt(total)+' cajas';
   detailPrev.disabled=detailPage===0;
   detailNext.disabled=(detailPage+1)*pageSize>=total;
   detailPager.hidden=total<=pageSize;
  };
  async function loadDetail(){
   if(!selectedId)return;
   const memberId=selectedId;
   const request=++detailRequest;
   loadingDetail=true;
   detail.hidden=false;
   detailPrev.disabled=true;detailNext.disabled=true;
   detailMessage.textContent='Cargando premios del miembro…';
   delete detailMessage.dataset.type;
   try{
    const {data,error}=await sb.rpc('admin_surprise_box_member_detail',{
     p_member_id:memberId,p_tier:state.tier(),p_days:state.days(),
     p_limit:pageSize,p_offset:detailPage*pageSize
    });
    if(request!==detailRequest||!detail.isConnected||memberId!==selectedId)return;
    if(error)throw error;
    if(data?.not_found)throw new Error('El perfil ya no está disponible.');
    renderDetail(data);
    detailMessage.dataset.type='success';
    detailMessage.textContent='Detalle actualizado. Los premios sin abrir permanecen ocultos.';
   }catch(error){
    if(request!==detailRequest||!detail.isConnected||memberId!==selectedId)return;
    detailMessage.dataset.type='error';
    detailMessage.textContent='No se pudieron consultar los premios: '+(error.message||'Error desconocido');
    cards.replaceChildren();
    prizeItems.replaceChildren();
    boxItems.replaceChildren();
    noteEmpty(detailTbody,6,'No se pudo consultar el historial.');
   }finally{
    if(request===detailRequest&&detail.isConnected)loadingDetail=false;
   }
  }
  function clearSelection(){
   selectedId=null;
   detailRequest++;
   detail.hidden=true;
  }
  async function reloadFilters(){
   listPage=0;detailPage=0;
   const requests=[loadList()];
   if(selectedId)requests.push(loadDetail());
   return Promise.all(requests);
  }
  searchForm.addEventListener('submit',event=>{
   event.preventDefault();
   if(loadingList)return;
   const nextQuery=searchInput.value.trim().slice(0,80);
   if(query!==nextQuery)clearSelection();
   query=nextQuery;listPage=0;
   loadList();
  });
  clearBtn.addEventListener('click',()=>{
   if(loadingList)return;
   searchInput.value='';query='';listPage=0;clearSelection();loadList();
  });
  close.addEventListener('click',()=>{clearSelection();loadList()});
  prev.addEventListener('click',()=>{if(listPage>0&&!loadingList){listPage--;loadList()}});
  next.addEventListener('click',()=>{if(!next.disabled&&!loadingList){listPage++;loadList()}});
  detailPrev.addEventListener('click',()=>{if(detailPage>0&&!loadingDetail){detailPage--;loadDetail()}});
  detailNext.addEventListener('click',()=>{if(!detailNext.disabled&&!loadingDetail){detailPage++;loadDetail()}});
  return {element:panel,load:loadList,reloadFilters};
 }
 window.SBSurpriseBoxMembers={mount};
})();
