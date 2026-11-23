/* Shadows Byte Gaming Official V2 — historial persistente y paginado. */
(() => {
 'use strict';
 const ID='sb-notification-history';
 const PAGE_SIZE=30;
 const CATEGORIES=[
  ['all','Todas las categorías'],['followers','👥 Seguidores'],['community','❤️ Comunidad'],
  ['messages','💬 Mensajes'],['calls','📞 Llamadas y videollamadas'],
  ['shop','🎁 Tienda y regalos'],['achievements','🏅 Logros y metas'],
  ['polls','📊 Encuestas'],['tournaments','🏆 Torneos'],
  ['news','📰 Noticias'],['visits','👤 Visitas al perfil'],['reports','🛡️ Denuncias']
 ];
 const MODERATION_TITLES={moderation_warning:'⚠️ Advertencia del equipo',moderation_suspend:'⏳ Suspensión temporal',moderation_ban:'🚫 Expulsión',moderation_lift:'✅ Restricción retirada'};
 const ICONS={followers:'👥',community:'❤️',messages:'💬',calls:'📞',shop:'🎁',
  achievements:'🏅',polls:'📊',tournaments:'🏆',news:'📰',visits:'👤',reports:'🛡️'};
 const isValidRoute=value=>typeof value==='string'&&value.length<350&&/^#\/[a-z0-9/?=&%_-]+$/i.test(value);

 function buildPanel(){
  const panel=document.createElement('details');
  panel.id=ID;panel.className='sb-notification-history';
  const heading=document.createElement('summary');
  heading.textContent='📚 Historial completo de notificaciones';
  panel.append(heading);
  const content=document.createElement('div');content.className='sb-history-content';
  content.innerHTML=
   '<p class="sb-history-description">Consulta tus avisos anteriores, incluidos los leídos y archivados. Los registros que se hayan eliminado o caducado no pueden recuperarse.</p>'+
   '<div class="sb-history-toolbar">'+
    '<label>Categoría <select data-field="category" aria-label="Categoría del historial"></select></label>'+
    '<label>Estado <select data-field="state" aria-label="Estado del historial">'+
     '<option value="all">Todos</option><option value="active">No archivados</option>'+
     '<option value="unread">Sin leer</option><option value="archived">Archivados</option>'+
     '<option value="priority">⭐ Prioritarios</option><option value="pinned">📌 Fijados</option></select></label>'+
    '<label class="sb-history-search-label">Buscar <input data-field="search" type="search" maxlength="90" placeholder="Buscar en el historial"></label>'+
    '<label>Desde <input data-field="from" type="date"></label>'+
    '<label>Hasta <input data-field="to" type="date"></label>'+
    '<label>Orden <select data-field="sort" aria-label="Orden del historial">'+
     '<option value="newest">Más recientes</option><option value="oldest">Más antiguos</option>'+
     '<option value="priority">Prioritarios primero</option></select></label>'+
   '</div>'+
   '<div class="sb-history-dashboard" aria-live="polite"></div>'+
   '<div class="sb-history-tools">'+
    '<button type="button" data-action="search">🔎 Buscar</button>'+
    '<button type="button" data-action="reset">Limpiar filtros</button>'+
    '<button type="button" data-action="refresh">🔄 Actualizar historial</button>'+
    '<button type="button" data-action="export">⬇️ Exportar CSV (hasta 2000)</button>'+
   '</div>'+
   '<div class="sb-history-bulk" aria-label="Acciones para todas las notificaciones">'+
    '<button type="button" data-action="bulk-read">✅ Marcar todas como leídas</button>'+
    '<button type="button" data-action="bulk-archive">📦 Archivar todas</button>'+
    '<small>Estas acciones afectan a todo tu historial, aunque tengas filtros activos. Archivar no elimina nada.</small>'+
   '</div>'+
   '<p class="sb-history-status" role="status" aria-live="polite">Abre este apartado para consultar tus avisos anteriores.</p>'+
   '<div class="sb-history-list"></div>'+
   '<div class="sb-history-pagination">'+
    '<button type="button" data-action="previous" disabled>← Anterior</button>'+
    '<span class="sb-history-page" aria-live="polite"></span>'+
    '<button type="button" data-action="next" disabled>Siguiente →</button>'+
   '</div>';
  panel.append(content);
  const fields=Object.fromEntries(['category','state','search','from','to','sort'].map(name=>[name,content.querySelector('[data-field="'+name+'"]')]));
  for(const [value,label] of CATEGORIES){
   const option=document.createElement('option');option.value=value;option.textContent=label;
   fields.category.append(option);
  }
  const dashboard=content.querySelector('.sb-history-dashboard');
  const exportBtn=content.querySelector('[data-action="export"]');
  const status=content.querySelector('.sb-history-status');
  const list=content.querySelector('.sb-history-list');
  const pagination=content.querySelector('.sb-history-pagination');
  const previous=content.querySelector('[data-action="previous"]');
  const next=content.querySelector('[data-action="next"]');
  const pageLabel=content.querySelector('.sb-history-page');
  const bulkRead=content.querySelector('[data-action="bulk-read"]');
  const bulkArchive=content.querySelector('[data-action="bulk-archive"]');
  let page=0,total=0,request=0,loaded=false,bulkPending=false;

  function refreshOtherCounters(userId){
   try {
    if(typeof refreshNotificationBadge==='function')void refreshNotificationBadge(userId);
    if(typeof loadMemberNotifications==='function')void loadMemberNotifications();
   } catch(e){console.warn('No se pudieron refrescar los contadores:',e);}
  }
  async function updateSaved(row,changes,userId){
   const direct=['member_notifications','member_report_notifications'];
   if(direct.includes(row.source_table)){
    const {error}=await sb.from(row.source_table).update(changes)
      .eq('id',row.record_id).eq('recipient_id',userId);
    if(error)throw error;
   }else{
    // Los mensajes, premios y noticias conservan su contenido original.
    // Sólo se guarda el estado privado del aviso de este miembro.
    const archived=Object.prototype.hasOwnProperty.call(changes,'dismissed_at')
      ?changes.dismissed_at:(row.archived_at||null);
    const read=Object.prototype.hasOwnProperty.call(changes,'is_read')
      ?changes.is_read:Boolean(row.is_read);
    const {error}=await sb.from('member_notification_history_actions').upsert({
      user_id:userId,source_table:row.source_table,record_id:row.record_id,
      is_read:read,archived_at:archived,updated_at:new Date().toISOString()
    },{onConflict:'user_id,source_table,record_id'});
    if(error)throw error;
   }
   refreshOtherCounters(userId);
  }

  async function updateHighlight(row,patch,userId){
   // Save only private display preferences; original notification data is untouched.
   const next={
    user_id:userId,
    source_table:row.source_table,
    record_id:String(row.record_id),
    is_read:row.is_read!==false,
    archived_at:row.archived_at||null,
    is_pinned:Object.prototype.hasOwnProperty.call(patch,'is_pinned')
      ?patch.is_pinned:Boolean(row.is_pinned),
    priority_override:Object.prototype.hasOwnProperty.call(patch,'priority_override')
      ?patch.priority_override:(row.priority_override||null),
    updated_at:new Date().toISOString()
   };
   const {error}=await sb.from('member_notification_history_actions')
     .upsert(next,{onConflict:'user_id,source_table,record_id'});
   if(error)throw error;
  }

  function renderRow(row,userId){
   const article=document.createElement('article');article.className='sb-history-item';
   article.dataset.sbCategory=['shop','achievements'].includes(row.category)?'rewards':row.category;
   if(row.is_read===false)article.classList.add('sb-history-unread');
   if(row.is_pinned)article.classList.add('sb-history-pinned');
   if(row.is_priority)article.classList.add('sb-history-priority');
   const icon=document.createElement('span');icon.className='sb-history-icon';
   icon.textContent=MODERATION_TITLES[row.kind]?'🛡️':ICONS[row.category]||'🔔';icon.setAttribute('aria-hidden','true');
   const body=document.createElement('div');body.className='sb-history-body';
   const title=document.createElement('strong');title.textContent=MODERATION_TITLES[row.kind]||row.title||'Notificación';
   const meta=document.createElement('small');
   const when=row.occurred_at?new Date(row.occurred_at):null;
   const date=when&&!Number.isNaN(when.getTime())?when.toLocaleString('es-ES'):'Fecha desconocida';
   const category=MODERATION_TITLES[row.kind]?'🛡️ Moderación':CATEGORIES.find(c=>c[0]===row.category)?.[1]||'🔔 Otra actividad';
   meta.textContent=date+' · '+category+(row.archived_at?' · Archivada':row.is_read===false?' · Sin leer':'');
   const chips=document.createElement('div');chips.className='sb-history-chips';
   if(row.is_pinned){const tag=document.createElement('span');tag.textContent='📌 Fijada';chips.append(tag);}
   if(row.is_priority){const tag=document.createElement('span');tag.textContent='⭐ Prioritaria';chips.append(tag);}
   const buttons=document.createElement('div');buttons.className='sb-history-row-actions';
   if(isValidRoute(row.href)){
    const link=document.createElement('a');link.href=MODERATION_TITLES[row.kind]?(row.kind==='moderation_ban'?'#/apelaciones':'#/cuenta?focus=sanctions'):row.href;link.textContent='Ver';link.className='notification-jump';
    buttons.append(link);
   }
   {
    if(row.is_read===false){
     const mark=document.createElement('button');mark.type='button';mark.textContent='✓ Marcar leída';
     mark.onclick=async()=>{
      mark.disabled=true;
      try{await updateSaved(row,{is_read:true},userId);void loadPage(page);}
      catch(e){mark.disabled=false;status.textContent='No se pudo marcar como leída: '+(e.message||'error');}
     };buttons.append(mark);
    }

    const pin=document.createElement('button');pin.type='button';
    pin.textContent=row.is_pinned?'📌 Desfijar':'📌 Fijar';
    pin.setAttribute('aria-pressed',String(Boolean(row.is_pinned)));
    pin.onclick=async()=>{
     pin.disabled=true;
     try{
      await updateHighlight(row,{is_pinned:!row.is_pinned},userId);
      void loadPage(page);
     }catch(e){pin.disabled=false;status.textContent='No se pudo cambiar el fijado: '+(e?.message||'Error');}
    };
    buttons.append(pin);
    const star=document.createElement('button');star.type='button';
    star.textContent=row.is_priority?'⭐ Quitar prioridad':'⭐ Dar prioridad';
    star.setAttribute('aria-pressed',String(Boolean(row.is_priority)));
    star.onclick=async()=>{
     star.disabled=true;
     try{
      await updateHighlight(row,{priority_override:row.is_priority?'normal':'high'},userId);
      void loadPage(page);
     }catch(e){star.disabled=false;status.textContent='No se pudo cambiar la prioridad: '+(e?.message||'Error');}
    };
    buttons.append(star);
    if(row.priority_override){
     const resetPriority=document.createElement('button');resetPriority.type='button';
     resetPriority.textContent='↺ Prioridad automática';
     resetPriority.onclick=async()=>{
      resetPriority.disabled=true;
      try{
       await updateHighlight(row,{priority_override:null},userId);
       void loadPage(page);
      }catch(e){resetPriority.disabled=false;status.textContent='No se pudo restaurar la prioridad: '+(e?.message||'Error');}
     };
     buttons.append(resetPriority);
    }
    const archive=document.createElement('button');archive.type='button';
    archive.textContent=row.archived_at?'Restaurar':'Archivar';
    archive.onclick=async()=>{
     archive.disabled=true;
     try{await updateSaved(row,{dismissed_at:row.archived_at?null:new Date().toISOString()},userId);void loadPage(page);}
     catch(e){archive.disabled=false;status.textContent='No se pudo actualizar el archivo: '+(e.message||'error');}
    };buttons.append(archive);
   }
   body.append(title,meta,chips,buttons);article.append(icon,body);
   return article;
  }
  async function loadPage(target=0){
   const token=++request;
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(token!==request||!panel.isConnected)return;
   if(authError||!user){
    status.textContent='Inicia sesión para consultar el historial de tu cuenta.';
    list.replaceChildren();total=0;previous.disabled=true;next.disabled=true;pageLabel.textContent='';
    return;
   }
   if(fields.from.value&&fields.to.value&&fields.from.value>fields.to.value){
    status.textContent='La fecha «Desde» no puede ser posterior a «Hasta».';
    return;
   }
   page=Math.max(0,target|0);
   status.textContent='Cargando avisos anteriores…';
   previous.disabled=true;next.disabled=true;
   let query=sb.from('member_notification_history')
    .select('record_id,category,kind,title,href,occurred_at,is_read,archived_at,source_table,is_pinned,is_priority,priority_override',{count:'exact'})
    .order('is_pinned',{ascending:false});
   if(fields.sort.value==='priority')query=query.order('is_priority',{ascending:false});
   query=query.order('occurred_at',{ascending:fields.sort.value==='oldest'})
    .order('record_id',{ascending:false})
    .range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE-1);
   if(fields.category.value!=='all')query=query.eq('category',fields.category.value);
   if(fields.state.value==='active')query=query.is('archived_at',null);
   else if(fields.state.value==='unread')query=query.eq('is_read',false).is('archived_at',null);
   else if(fields.state.value==='archived')query=query.not('archived_at','is',null);
   else if(fields.state.value==='priority')query=query.eq('is_priority',true);
   else if(fields.state.value==='pinned')query=query.eq('is_pinned',true);
   const term=fields.search.value.trim().replace(/[%_]/g,'').slice(0,80);
   if(term)query=query.ilike('title','%'+term+'%');
   if(fields.from.value){
    const first=new Date(fields.from.value+'T00:00:00');
    query=query.gte('occurred_at',first.toISOString());
   }
   if(fields.to.value){
    const end=new Date(fields.to.value+'T00:00:00');end.setDate(end.getDate()+1);
    query=query.lt('occurred_at',end.toISOString());
   }
   try{
    const {data,error,count}=await query;
    if(token!==request||!panel.isConnected)return;
    if(error)throw error;
    total=count??(data||[]).length;loaded=true;
    const maxPage=Math.max(0,Math.ceil(total/PAGE_SIZE)-1);
    if(page>maxPage){void loadPage(maxPage);return;}
    list.replaceChildren();
    for(const row of data||[])list.append(renderRow(row,user.id));
    dashboard.replaceChildren();
    for(const [label,value] of [
      ['🔔 Resultados',total],
      ['📌 Fijados en página',(data||[]).filter(x=>x.is_pinned).length],
      ['⭐ Prioritarios en página',(data||[]).filter(x=>x.is_priority).length],
      ['🟣 Sin leer en página',(data||[]).filter(x=>x.is_read===false).length]
    ]){
      const metric=document.createElement('div');metric.className='sb-history-metric';
      const number=document.createElement('strong');number.textContent=String(value);
      const name=document.createElement('span');name.textContent=label;
      metric.append(number,name);dashboard.append(metric);
    }
    if(!data?.length)list.textContent='No se encontraron notificaciones con estos filtros.';
    status.textContent=total===1?'1 registro encontrado':total+' registros encontrados';
    previous.disabled=page===0;next.disabled=(page+1)*PAGE_SIZE>=total;
    pageLabel.textContent=total?'Página '+(page+1)+' de '+Math.ceil(total/PAGE_SIZE):'Sin resultados';
   }catch(e){
    if(token!==request||!panel.isConnected)return;
    console.warn('Historial de notificaciones:',e);
    status.textContent='No se pudo cargar el historial. Comprueba tu conexión e inténtalo de nuevo.';
    previous.disabled=true;next.disabled=true;
   }
  }
  async function runBulk(action){
   if(bulkPending)return;
   if(action==='archive'&&!window.confirm('¿Archivar TODOS los avisos del historial, incluso los que no se muestran por los filtros? Se podrán restaurar desde Archivados. No se borrarán mensajes, noticias ni premios.'))return;
   bulkPending=true;bulkRead.disabled=true;bulkArchive.disabled=true;
   const oldStatus=status.textContent;
   status.textContent=action==='read'?'Marcando todos los avisos como leídos…':'Archivando todo el historial…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!user)throw new Error('Inicia sesión para gestionar tus avisos.');
    const {data,error}=await sb.rpc('member_notification_history_bulk',{p_action:action});
    if(error)throw error;
    await loadPage(0);
    refreshOtherCounters(user.id);
    const changed=Number(data?.updated||0);
    status.textContent=changed>0
      ?changed+(changed===1?' aviso actualizado.':' avisos actualizados.')+(action==='archive'?' Puedes restaurarlos desde Archivados.':'')
      :(action==='read'?'Todos los avisos ya estaban leídos.':'Todos los avisos ya estaban archivados.');
   }catch(err){
    console.error('No se pudo actualizar el historial:',err);
    status.textContent='No se pudieron actualizar todos los avisos: '+(err?.message||'error desconocido');
   }finally{
    bulkPending=false;bulkRead.disabled=false;bulkArchive.disabled=false;
   }
  }

  function csvSafe(value){
   let s=String(value??'').replace(/[\r\n]+/g,' ');
   // Protect against spreadsheet formula injection.
   if(/^\s*[=+\-@]/.test(s))s="'"+s;
   return '"'+s.replace(/"/g,'""')+'"';
  }
  async function exportFilteredCSV(){
   if(exportBtn.disabled)return;
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user){status.textContent='Inicia sesión para exportar el historial.';return;}
   if(fields.from.value&&fields.to.value&&fields.from.value>fields.to.value){
    status.textContent='Comprueba el intervalo de fechas antes de exportar.';return;
   }
   exportBtn.disabled=true;
   status.textContent='Preparando archivo CSV de tu historial…';
   try{
    const limit=2000,batch=200,rows=[];
    for(let offset=0;offset<limit;offset+=batch){
     let query=sb.from('member_notification_history')
      .select('record_id,category,kind,title,href,occurred_at,is_read,archived_at,source_table,is_pinned,is_priority,priority_override')
      .order('is_pinned',{ascending:false});
     if(fields.sort.value==='priority')query=query.order('is_priority',{ascending:false});
     query=query.order('occurred_at',{ascending:fields.sort.value==='oldest'})
      .order('record_id',{ascending:false});
     if(fields.category.value!=='all')query=query.eq('category',fields.category.value);
     if(fields.state.value==='active')query=query.is('archived_at',null);
     else if(fields.state.value==='unread')query=query.eq('is_read',false).is('archived_at',null);
     else if(fields.state.value==='archived')query=query.not('archived_at','is',null);
     else if(fields.state.value==='priority')query=query.eq('is_priority',true);
     else if(fields.state.value==='pinned')query=query.eq('is_pinned',true);
     const term=fields.search.value.trim().replace(/[%_]/g,'').slice(0,80);
     if(term)query=query.ilike('title','%'+term+'%');
     if(fields.from.value)query=query.gte('occurred_at',new Date(fields.from.value+'T00:00:00').toISOString());
     if(fields.to.value){
      const until=new Date(fields.to.value+'T00:00:00');until.setDate(until.getDate()+1);
      query=query.lt('occurred_at',until.toISOString());
     }
     const {data,error}=await query.range(offset,offset+batch-1);
     if(error)throw error;
     rows.push(...(data||[]));
     if(!data||data.length<batch)break;
    }
    const table=[['Fecha','Categoría','Aviso','Prioritario','Fijado','Estado','Fuente','Enlace']];
    for(const row of rows){
     table.push([row.occurred_at,row.category,row.title,
      row.is_priority?'Sí':'No',row.is_pinned?'Sí':'No',
      row.archived_at?'Archivado':row.is_read?'Leído':'Sin leer',
      row.source_table,row.href]);
    }
    const body='\ufeff'+table.map(row=>row.map(csvSafe).join(',')).join('\r\n');
    const objectURL=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=objectURL;
    link.download='historial-shadows-byte-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(objectURL),1500);
    status.textContent='Archivo CSV preparado con '+rows.length+' registros filtrados.'
     +(rows.length===limit?' Se exportaron como máximo 2000 avisos.':'');
   }catch(e){
    status.textContent='No se pudo exportar el historial: '+(e?.message||'Error desconocido');
   }finally{
    exportBtn.disabled=false;
   }
  }

  bulkRead.onclick=()=>void runBulk('read');
  bulkArchive.onclick=()=>void runBulk('archive');
  const search=content.querySelector('[data-action="search"]');
  const reset=content.querySelector('[data-action="reset"]');
  const refresh=content.querySelector('[data-action="refresh"]');
  search.onclick=()=>loadPage(0);
  reset.onclick=()=>{
   fields.category.value='all';fields.state.value='all';fields.search.value='';
   fields.from.value='';fields.to.value='';fields.sort.value='newest';void loadPage(0);
  };
  refresh.onclick=()=>loadPage(page);
  exportBtn.onclick=()=>void exportFilteredCSV();
  previous.onclick=()=>loadPage(page-1);
  next.onclick=()=>loadPage(page+1);
  fields.category.onchange=()=>loadPage(0);
  fields.state.onchange=()=>loadPage(0);
  fields.from.onchange=()=>loadPage(0);
  fields.to.onchange=()=>loadPage(0);
  fields.sort.onchange=()=>loadPage(0);
  fields.search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void loadPage(0);}};
  panel.addEventListener('toggle',()=>{
   if(panel.open&&!loaded)void loadPage(0);
  });
  return panel;
 }
 function mount(){
  if(document.getElementById(ID))return;
  const target=document.getElementById('member-notifications');
  if(!target||typeof sb==='undefined'||!sb.auth)return;
  target.after(buildPanel());
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  const observer=new MutationObserver(mount);
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();