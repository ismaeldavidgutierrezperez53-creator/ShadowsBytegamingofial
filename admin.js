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
 adminSetActiveTab();await adminLoad();
}
