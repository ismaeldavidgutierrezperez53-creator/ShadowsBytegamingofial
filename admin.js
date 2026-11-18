// Panel de administración de Shadows Byte Gaming Official V2.
// La autorización definitiva de escritura se aplica con RLS en Supabase.
const adminModels = {
 news:{label:'Noticias',icon:'📰',fields:{title:'Título',slug:'Slug',excerpt:'Resumen',content:'Contenido',cover_url:'URL de portada',status:'Estado',published_at:'Fecha de publicación'},options:{status:['draft','published']}},
 billboard:{label:'Cartelera',icon:'🎬',fields:{title:'Título',description:'Descripción',category:'Categoría',image_url:'URL de imagen',destination_url:'URL de destino',starts_at:'Inicio',ends_at:'Fin',status:'Estado',sort_order:'Orden'},options:{category:['gaming','anime','event','stream','other'],status:['draft','published']}},
 events:{label:'Eventos',icon:'📅',fields:{title:'Título',description:'Descripción',image_url:'URL de imagen',location:'Ubicación',starts_at:'Inicio',ends_at:'Fin',status:'Estado'},options:{status:['draft','published','cancelled']}}
};
const adminDateFields=new Set(['starts_at','ends_at','published_at']);
const adminLargeFields=new Set(['content','description','excerpt']);
let adminTable='news', adminItems=[];
let adminRequestId=0;
function adminMessage(message,type='info'){
 const node=document.getElementById('admin-message');
 if(node){node.textContent=message;node.dataset.type=type;}
}
function adminDateInput(value){
 if(!value)return '';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '';
 const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
 return local.toISOString().slice(0,16);
}
function adminField(name,value,model){
 const id='admin-'+name,label=model.fields[name],options=model.options?.[name],val=value==null?'':String(value);
 const safe=escapeHTML;
 const control=options
  ?'<select id="'+id+'" name="'+name+'">'+options.map(x=>'<option value="'+safe(x)+'" '+(x===val?'selected':'')+'>'+safe(x==='draft'?'Borrador':x==='published'?'Publicado':x==='cancelled'?'Cancelado':x)+'</option>').join('')+'</select>'
  :adminLargeFields.has(name)
   ?'<textarea id="'+id+'" name="'+name+'" rows="'+(name==='content'?7:3)+'" placeholder="Escribe aquí...">'+safe(val)+'</textarea>'
   :'<input id="'+id+'" name="'+name+'" '+(name==='title'?'required maxlength="180" ':'')+(adminDateFields.has(name)?'type="datetime-local" ':'')+(name==='cover_url'||name==='image_url'||name==='destination_url'?'type="url" placeholder="https://..." ':'')+(name==='sort_order'?'type="number" step="1" ':'')+'value="'+safe(adminDateFields.has(name)?adminDateInput(val):val)+'" />';
 const full=['content','description','excerpt','cover_url','image_url','destination_url'].includes(name);
 return '<div class="admin-field'+(full?' admin-field-wide':'')+'"><label for="'+id+'">'+safe(label)+'</label>'+control+'</div>';
}
function adminForm(item={}){
 const root=document.getElementById('admin-form-root');if(!root)return;
 const model=adminModels[adminTable],isEdit=Boolean(item.id);
 root.innerHTML='<section class="admin-panel admin-editor-panel"><div class="admin-panel-heading"><div><span class="admin-kicker">EDITOR DE CONTENIDO</span><h2>'+(isEdit?'Editar':'Crear')+' '+model.label.toLowerCase()+'</h2><p>Completa los campos y guarda tus cambios en Supabase.</p></div><button type="button" class="admin-close" id="admin-close" aria-label="Cerrar editor">✕</button></div><form id="admin-editor"><div class="admin-fields">'+Object.keys(model.fields).map(k=>adminField(k,item[k]??(k==='status'?'draft':''),model)).join('')+'</div><div class="admin-form-actions"><button type="button" class="admin-secondary" id="admin-cancel">Cancelar</button><button type="submit" class="gradient-btn" id="admin-save">Guardar contenido</button></div></form></section>';
 const close=()=>root.replaceChildren();
 document.getElementById('admin-close').onclick=close;
 document.getElementById('admin-cancel').onclick=close;
 root.scrollIntoView({behavior:'smooth',block:'nearest'});
 document.getElementById('admin-editor').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=document.getElementById('admin-save');
  const data=Object.fromEntries(new FormData(form).entries());
  for(const field of adminDateFields)if(field in data){
   const val=data[field].trim();
   data[field]=val?new Date(val).toISOString():null;
  }
  if(adminTable==='billboard')data.sort_order=Number(data.sort_order)||0;
  if(adminTable==='news'){
   data.slug=data.slug.trim();
   if(!data.slug){adminMessage('El slug es obligatorio.','error');form.elements.slug.focus();return;}
   if(data.status==='published'&&!data.published_at)data.published_at=new Date().toISOString();
  }
  if(adminTable==='events'&&data.status==='published'&&!data.starts_at){
   adminMessage('Indica una fecha de inicio antes de publicar el evento.','error');form.elements.starts_at.focus();return;
  }
  button.disabled=true;button.textContent='Guardando…';
  try{
   const query=isEdit?sb.from(adminTable).update(data).eq('id',item.id).select():sb.from(adminTable).insert(data).select();
   const {data:rows,error}=await query;
   if(error){adminMessage('No se pudo guardar: '+error.message,'error');return;}
   if(!rows?.length){adminMessage('No se confirmó el guardado. Revisa los permisos.','error');return;}
   root.replaceChildren();adminMessage('Contenido guardado correctamente.','success');await adminLoad();
  }catch(error){adminMessage('No se pudo guardar: '+error.message,'error');}
  finally{if(button.isConnected){button.disabled=false;button.textContent='Guardar contenido';}}
 };
}
function adminSetActiveTab(){
 document.querySelectorAll('#admin-tabs button').forEach(button=>{
  const active=button.dataset.table===adminTable;
  button.classList.toggle('active',active);
  button.setAttribute('aria-selected',String(active));
 });
 const model=adminModels[adminTable];
 const title=document.getElementById('admin-list-title');if(title)title.textContent=model.label;
 const create=document.getElementById('admin-new');if(create)create.textContent='+ Crear '+model.label.toLowerCase();
}
function adminRenderStats(){
 const stats=document.getElementById('admin-stats');
 if(!stats)return;
 const published=adminItems.filter(x=>x.status==='published').length;
 const drafts=adminItems.filter(x=>x.status==='draft').length;
 stats.innerHTML='<div class="admin-stat"><span>📁 Registros cargados</span><strong>'+adminItems.length+'</strong></div><div class="admin-stat"><span>🟢 Publicados</span><strong>'+published+'</strong></div><div class="admin-stat"><span>✏️ Borradores</span><strong>'+drafts+'</strong></div>';
}
async function adminLoad(){
 const root=document.getElementById('admin-list');if(!root)return;
 const table=adminTable,requestId=++adminRequestId;
 root.innerHTML='<div class="admin-empty">Cargando contenido…</div>';
 try{
  const {data,error}=await sb.from(table).select('*').order('created_at',{ascending:false}).limit(100);
  if(requestId!==adminRequestId)return;
  if(error){root.innerHTML='<div class="admin-empty">Error al cargar: '+escapeHTML(error.message)+'</div>';return;}
  adminItems=data||[];adminRenderStats();
  const search=document.getElementById('admin-search');
  if(search)search.value='';
  adminRenderList();
 }catch(error){if(requestId===adminRequestId)root.innerHTML='<div class="admin-empty">No se pudo cargar: '+escapeHTML(error.message)+'</div>';}
}
function adminRenderList(){
 const root=document.getElementById('admin-list');if(!root)return;
 const term=(document.getElementById('admin-search')?.value||'').toLocaleLowerCase().trim();
 const items=adminItems.map((item,index)=>({item,index})).filter(({item})=>(item.title||'').toLocaleLowerCase().includes(term));
 root.innerHTML=items.length?items.map(({item,index})=>
  '<article class="admin-item"><div class="admin-item-main"><div class="admin-item-icon">'+adminModels[adminTable].icon+'</div><div class="admin-item-copy"><strong>'+escapeHTML(item.title||'Sin título')+'</strong><div class="admin-item-meta"><span class="admin-status admin-status-'+(item.status==='published'?'published':item.status==='cancelled'?'cancelled':'draft')+'">'+escapeHTML(item.status==='published'?'Publicado':item.status==='draft'?'Borrador':item.status==='cancelled'?'Cancelado':item.status||'Sin estado')+'</span>'+(item.created_at?'<span>'+escapeHTML(new Date(item.created_at).toLocaleDateString('es-ES'))+'</span>':'')+'</div></div></div><div class="admin-item-actions"><button type="button" class="admin-secondary" data-action="edit" data-index="'+index+'">Editar</button><button type="button" class="admin-danger" data-action="delete" data-index="'+index+'">Eliminar</button></div></article>'
 ).join(''):'<div class="admin-empty">'+(term?'No hay resultados para esta búsqueda.':'Todavía no hay contenido en esta sección. Usa «Crear» para añadir el primero.')+'</div>';
 root.querySelectorAll('button[data-action]').forEach(button=>button.onclick=async()=>{
  const item=adminItems[Number(button.dataset.index)];if(!item)return;
  if(button.dataset.action==='edit'){adminForm(item);return;}
  if(!confirm('¿Eliminar definitivamente «'+item.title+'»?'))return;
  button.disabled=true;
  try{
   const {data:deleted,error}=await sb.from(adminTable).delete().eq('id',item.id).select();
   if(error||!deleted?.length){adminMessage('No se pudo eliminar: '+(error?.message||'Operación no confirmada'),'error');return;}
   adminMessage('Elemento eliminado.','success');await adminLoad();
  }catch(error){adminMessage('No se pudo eliminar: '+error.message,'error');}
  finally{if(button.isConnected)button.disabled=false;}
 });
}

async function adminLoadOverview(){
 const root=document.getElementById('admin-overview');if(!root)return;
 const targets=[['profiles','Miembros registrados en perfiles'],['member_posts','Publicaciones de comunidad'],['member_comments','Comentarios'],['news','Noticias'],['billboard','Cartelera'],['events','Eventos']];
 const results=await Promise.all(targets.map(async ([table,label])=>{const {count,error}=await sb.from(table).select('*',{count:'exact',head:true});return {label,count,error};}));
 if(!root.isConnected)return;
 root.replaceChildren();
 for(const result of results){
  const tile=document.createElement('div');tile.className='admin-stat';
  const label=document.createElement('span');label.textContent=result.label;
  const number=document.createElement('strong');number.textContent=result.error?'—':String(result.count??0);
  tile.append(label,number);root.append(tile);
 }
}
async function adminLoadMembers(){
 const root=document.getElementById('admin-members-list');if(!root)return;
 root.textContent='Cargando miembros…';
 const {data,error}=await sb.from('profiles').select('id,display_name,username,is_public,created_at').order('created_at',{ascending:false}).limit(100);
 if(!root.isConnected)return;
 if(error){root.textContent='No se pudieron cargar los miembros: '+error.message;return;}
 const input=document.getElementById('admin-members-search');
 const render=()=>{
  const term=(input?.value||'').trim().toLocaleLowerCase('es');
  const filtered=(data||[]).filter(p=>(p.display_name||'').toLocaleLowerCase('es').includes(term)||(p.username||'').toLocaleLowerCase('es').includes(term));
  root.replaceChildren();
  if(!filtered.length){root.textContent='No hay miembros que coincidan.';return;}
  for(const p of filtered){
   const row=document.createElement('div');row.className='admin-management-row';
   const info=document.createElement('div');const name=document.createElement('strong');name.textContent=p.display_name||p.username||'Miembro';
   const detail=document.createElement('small');detail.textContent=p.is_public?'Perfil público':'Perfil privado';info.append(name,detail);
   row.append(info);
   if(p.is_public){const link=document.createElement('a');link.href='#/perfil?id='+encodeURIComponent(p.id);link.className='admin-secondary';link.textContent='Ver perfil';row.append(link);}
   root.append(row);
  }
 };
 if(input)input.oninput=render;render();
}
async function adminLoadModeration(){
 const root=document.getElementById('admin-moderation-list');if(!root)return;
 root.textContent='Cargando actividad de comunidad…';
 const [{data:posts,error:postError},{data:comments,error:commentError}]=await Promise.all([
  sb.from('member_posts').select('id,author_id,content,created_at,image_path').order('created_at',{ascending:false}).limit(50),
  sb.from('member_comments').select('id,author_id,post_id,content,created_at').order('created_at',{ascending:false}).limit(50)
 ]);
 if(!root.isConnected)return;
 if(postError||commentError){root.textContent='No se pudo cargar la moderación: '+(postError||commentError).message;return;}
 const filter=document.getElementById('admin-moderation-type');
 const render=()=>{
  root.replaceChildren();
  const type=filter?.value||'all';
  const entries=[...(type==='all'||type==='posts'?(posts||[]).map(item=>({item,table:'member_posts',label:'Publicación'})):[]),...(type==='all'||type==='comments'?(comments||[]).map(item=>({item,table:'member_comments',label:'Comentario'})):[])].sort((a,b)=>new Date(b.item.created_at)-new Date(a.item.created_at));
  if(!entries.length){root.textContent='No hay contenido en esta sección.';return;}
  for(const {item,table,label} of entries){
   const row=document.createElement('article');row.className='admin-management-row';
   const info=document.createElement('div');const heading=document.createElement('strong');heading.textContent=label+' · '+new Date(item.created_at).toLocaleString('es-ES');
   const body=document.createElement('p');body.textContent=(item.content|| (item.image_path?'Publicación con imagen':'Sin texto')).slice(0,280);
   const author=document.createElement('small');author.textContent='Autor: '+item.author_id;info.append(heading,body,author);row.append(info);
   const remove=document.createElement('button');remove.type='button';remove.className='admin-danger';remove.textContent='Eliminar';
   remove.onclick=async()=>{
    if(!confirm('¿Eliminar definitivamente este '+label.toLowerCase()+' de la comunidad?'))return;
    remove.disabled=true;
    const {data:deleted,error}=await sb.from(table).delete().eq('id',item.id).select('id');
    if(error||!deleted?.length){adminMessage('No se pudo eliminar: '+(error?.message||'Sin permiso o registro inexistente'),'error');remove.disabled=false;return;}
    adminMessage(label+' eliminado correctamente.','success');
    if(table==='member_posts'){const i=posts.findIndex(x=>x.id===item.id);if(i>=0)posts.splice(i,1);}
    else{const i=comments.findIndex(x=>x.id===item.id);if(i>=0)comments.splice(i,1);}
    render();adminLoadOverview();
   };
   row.append(remove);root.append(row);
  }
 };
 if(filter)filter.onchange=render;render();
}
async function adminLoadReports(){
 const root=document.getElementById('admin-reports-list');if(!root)return;
 root.textContent='Cargando reportes…';
 const {data,error}=await sb.from('member_reports').select('id,reporter_id,post_id,comment_id,reported_member_id,reason,details,status,created_at').order('created_at',{ascending:false}).limit(100);
 if(!root.isConnected)return;
 if(error){root.textContent='No se pudieron cargar los reportes: '+error.message;return;}
 const filter=document.getElementById('admin-reports-filter');
 const render=()=>{
  root.replaceChildren();
  const rows=(data||[]).filter(r=>filter.value==='all'||r.status===filter.value);
  if(!rows.length){root.textContent='No hay reportes en este estado.';return;}
  for(const report of rows){
   const row=document.createElement('article');row.className='admin-management-row';
   const info=document.createElement('div');const title=document.createElement('strong');
   title.textContent=(report.reported_member_id?'Perfil':report.post_id?'Publicación':'Comentario')+' · '+report.reason+' · '+report.status;
   const desc=document.createElement('p');desc.textContent=report.details||'Sin descripción adicional';
   const meta=document.createElement('small');meta.textContent='Enviado: '+new Date(report.created_at).toLocaleString('es-ES')+' · ID: '+(report.reported_member_id||report.post_id||report.comment_id);
   info.append(title,desc,meta);row.append(info);
   if(report.status==='pending'){
    const actions=document.createElement('div');actions.className='admin-report-actions';
    for(const [status,label] of [['reviewed','Marcar revisado'],['dismissed','Descartar']]){
     const btn=document.createElement('button');btn.type='button';btn.className='admin-secondary';btn.textContent=label;
     btn.onclick=async()=>{
      btn.disabled=true;
      const {data:{user}}=await sb.auth.getUser();
      const {data:updated,error}=await sb.from('member_reports').update({status,reviewed_by:user?.id,reviewed_at:new Date().toISOString()}).eq('id',report.id).eq('status','pending').select('id');
      if(error||!updated?.length){adminMessage('No se pudo actualizar el reporte: '+(error?.message||'No disponible'),'error');btn.disabled=false;return;}
      report.status=status;adminMessage('Reporte actualizado.','success');render();adminUpdateReportAlerts();
     };actions.append(btn);
    }
    row.append(actions);
   }
   root.append(row);
  }
 };
 filter.onchange=render;render();
}

let adminReportsChannel=null;
let adminReportsSeen=new Set();
let adminReportsInitialized=false;
function adminStopReportAlerts(){
 if(adminReportsChannel){sb.removeChannel(adminReportsChannel);adminReportsChannel=null;}
}
async function adminUpdateReportAlerts(announce=false){
 const badge=document.getElementById('admin-report-alert-count');
 if(!badge)return;
 const {data,error}=await sb.from('member_reports').select('id').eq('status','pending').order('created_at',{ascending:false}).limit(100);
 if(error){badge.textContent='No se pudieron comprobar las denuncias';return;}
 const ids=new Set((data||[]).map(x=>x.id));
 const newlyReceived=[...ids].filter(id=>!adminReportsSeen.has(id));
 badge.textContent=ids.size+' denuncia'+(ids.size===1?' pendiente':'s pendientes');
 badge.classList.toggle('admin-alert-active',ids.size>0);
 if(announce&&adminReportsInitialized&&newlyReceived.length){
  const message=document.getElementById('admin-report-alert-message');
  if(message)message.textContent='🔔 Nueva denuncia recibida. Revisa la sección Denuncias recibidas.';
  if(document.visibilityState==='visible'&&'Notification' in window&&Notification.permission==='granted'){
   new Notification('Shadows Byte Gaming · Nueva denuncia',{body:'Tienes '+newlyReceived.length+' denuncia(s) nueva(s) por revisar.'});
  }
  adminLoadReports();
 }
 adminReportsSeen=ids;adminReportsInitialized=true;
}
function adminInitReportAlerts(){
 adminStopReportAlerts();adminReportsSeen=new Set();adminReportsInitialized=false;
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard)return;
 const box=document.createElement('section');box.className='admin-panel admin-report-alert-panel';
 box.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">ALERTAS DE MODERACIÓN</span><h2>🔔 Notificaciones de denuncias</h2><p>Recibirás avisos en este panel cuando lleguen nuevas denuncias mientras esté abierto.</p></div><strong id="admin-report-alert-count" role="status" aria-live="polite">Comprobando…</strong></div><p id="admin-report-alert-message" role="status" aria-live="polite"></p><button type="button" class="admin-secondary" id="admin-browser-alerts">Activar avisos del navegador</button>';
 const reports=document.getElementById('admin-reports-list')?.closest('.admin-panel');
 if(reports)reports.before(box);else dashboard.append(box);
 const button=document.getElementById('admin-browser-alerts');
 if(!('Notification' in window)||!window.isSecureContext){button.hidden=true;}
 else{
  button.textContent=Notification.permission==='granted'?'Avisos del navegador activados':'Activar avisos del navegador';
  button.disabled=Notification.permission==='granted'||Notification.permission==='denied';
  button.onclick=async()=>{
   const permission=await Notification.requestPermission();
   button.textContent=permission==='granted'?'Avisos del navegador activados':'Permiso no concedido';
   button.disabled=true;
  };
 }
 adminUpdateReportAlerts(false);
 adminReportsChannel=sb.channel('admin-new-member-reports')
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_reports'},()=>{
   if(!document.getElementById('admin-report-alert-count')){adminStopReportAlerts();return;}
   adminUpdateReportAlerts(true);
  }).subscribe();
}
window.addEventListener('hashchange',()=>{if(location.hash.split('?')[0]!=='#/admin')adminStopReportAlerts();});

function adminInitExtended(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');if(!dashboard)return;
 const overview=document.createElement('section');overview.className='admin-panel';
 overview.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">RESUMEN GENERAL</span><h2>Estadísticas de la web</h2><p>Totales actuales de las principales secciones.</p></div><button type="button" class="admin-secondary" id="admin-refresh">Actualizar</button></div><div id="admin-overview" class="admin-stats">Cargando estadísticas…</div>';
 const welcome=dashboard.querySelector('.admin-welcome');welcome?.after(overview);
 const members=document.createElement('section');members.className='admin-panel';members.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">GESTIÓN DE MIEMBROS</span><h2>Miembros</h2><p>Consulta los perfiles y busca usuarios. Los permisos de acceso no se modifican aquí.</p></div><input id="admin-members-search" type="search" placeholder="Buscar miembro…" aria-label="Buscar miembro"></div><div id="admin-members-list"></div>';
 const moderation=document.createElement('section');moderation.className='admin-panel';moderation.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">MODERACIÓN</span><h2>Publicaciones y comentarios</h2><p>Revisa la actividad reciente y elimina contenido inapropiado.</p></div><select id="admin-moderation-type" aria-label="Tipo de contenido"><option value="all">Todo</option><option value="posts">Publicaciones</option><option value="comments">Comentarios</option></select></div><div id="admin-moderation-list"></div>';
 const reports=document.createElement('section');reports.className='admin-panel';reports.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">REPORTES DE LA COMUNIDAD</span><h2>Denuncias recibidas</h2><p>Revisa los reportes de publicaciones y comentarios. Marcar un reporte como revisado no elimina el contenido.</p></div><select id="admin-reports-filter" aria-label="Filtrar reportes"><option value="pending">Pendientes</option><option value="all">Todos</option><option value="reviewed">Revisados</option><option value="dismissed">Descartados</option></select></div><div id="admin-reports-list"></div>';
 dashboard.append(members,moderation,reports);
 document.getElementById('admin-refresh').onclick=()=>{adminLoadOverview();adminLoadMembers();adminLoadModeration();adminLoadReports();adminUpdateReportAlerts();};
 adminLoadOverview();adminLoadMembers();adminLoadModeration();adminLoadReports();adminInitReportAlerts();
}

async function initAdmin(){
 const root=document.getElementById('admin-root');if(!root)return;
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user){root.innerHTML='<p>Debes iniciar sesión.</p><a href="#/auth">Entrar</a>';return;}
 if(user.app_metadata?.role!=='admin'){root.textContent='No tienes permisos de administrador. Cierra sesión y vuelve a entrar si acabas de recibir el rol.';return;}
 root.innerHTML='<div class="admin-dashboard"><div class="admin-quicklinks"><a href="#/cuenta">👤 Mi perfil</a><a href="#/miembros">👥 Comunidad</a><a href="#/noticias">📰 Ver noticias</a><a href="#/cartelera">🎬 Ver cartelera</a><a href="#/eventos">📅 Ver eventos</a></div><div class="admin-welcome"><div><span class="admin-kicker">SHADOWS BYTE · CONTROL CENTER</span><h2>Tu centro de mando</h2><p>Gestiona noticias, cartelera y eventos desde un único lugar.</p></div><span class="admin-admin-badge">● Administrador</span></div><p class="admin-session">Sesión iniciada: '+escapeHTML(user.email)+'</p><div class="admin-stats" id="admin-stats"></div><section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-kicker">GESTIÓN DE CONTENIDOS</span><h2>Publicaciones</h2></div><button class="gradient-btn mini" id="admin-new" type="button">+ Crear noticias</button></div><div class="admin-tabs" role="tablist" aria-label="Secciones de administración" id="admin-tabs"></div><div id="admin-message" role="status" aria-live="polite"></div></section><div id="admin-form-root"></div><section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-kicker">BIBLIOTECA</span><h2 id="admin-list-title">Noticias</h2></div><input type="search" id="admin-search" placeholder="Buscar por título…" aria-label="Buscar contenido por título"></div><div id="admin-list"></div></section></div>';
 const tabs=document.getElementById('admin-tabs');
 for(const [table,model] of Object.entries(adminModels)){
  const button=document.createElement('button');button.type='button';button.dataset.table=table;button.setAttribute('role','tab');button.textContent=model.icon+' '+model.label;
  button.onclick=()=>{adminTable=table;document.getElementById('admin-form-root').replaceChildren();adminSetActiveTab();adminLoad();};
  tabs.append(button);
 }
 document.getElementById('admin-new').onclick=()=>adminForm();
 document.getElementById('admin-search').oninput=adminRenderList;
 adminSetActiveTab();await adminLoad();adminInitExtended();
}
