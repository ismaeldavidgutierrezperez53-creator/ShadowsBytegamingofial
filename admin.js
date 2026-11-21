// Panel de administración de Shadows Byte Gaming Official V2.
// La autorización definitiva de escritura se aplica con RLS en Supabase.
const adminModels = {
 'anime':{label:'Anime',icon:'🎌',catalogCategory:'anime',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 'manga':{label:'Manga',icon:'📖',catalogCategory:'manga',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 'manhwa':{label:'Manhwa',icon:'📚',catalogCategory:'manhwa',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 'gaming':{label:'Gaming',icon:'🎮',catalogCategory:'gaming',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 'waifu-husbando':{label:'Waifu / Husbando',icon:'💜',catalogCategory:'waifu-husbando',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 'pokedex':{label:'Pokédex en Español',icon:'⚡',catalogCategory:'pokedex',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 'one-piece':{label:'Especial One Piece',icon:'🏴‍☠️',catalogCategory:'one-piece',fields:{title:'Título o nombre',description:'Descripción',image_url:'URL de imagen',extra_info:'Información adicional',status:'Estado'},options:{status:['draft','published']}},
 news:{label:'Noticias',icon:'📰',fields:{title:'Título',slug:'Slug',excerpt:'Resumen',content:'Contenido',cover_url:'URL de portada',status:'Estado',is_featured:'⭐ Noticia destacada',published_at:'Fecha de publicación'},options:{status:['draft','published']}},
 billboard:{label:'Cartelera',icon:'🎬',fields:{title:'Título',description:'Descripción',category:'Categoría',image_url:'URL de imagen',destination_url:'URL de destino',starts_at:'Inicio',ends_at:'Fin',status:'Estado',sort_order:'Orden'},options:{category:['gaming','anime','event','stream','other'],status:['draft','published']}},
 events:{label:'Eventos',icon:'📅',fields:{title:'Título',description:'Descripción',image_url:'URL de imagen',location:'Ubicación',starts_at:'Inicio',ends_at:'Fin',status:'Estado'},options:{status:['draft','published','cancelled']}}
};
const adminDateFields=new Set(['starts_at','ends_at','published_at']);
const adminLargeFields=new Set(['content','description','excerpt','extra_info']);
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
 const control=name==='is_featured'
  ? '<input id="'+id+'" name="'+name+'" type="checkbox" value="true" '+(val==='true'?'checked':'')+' />'
  :options
  ?'<select id="'+id+'" name="'+name+'">'+options.map(x=>'<option value="'+safe(x)+'" '+(x===val?'selected':'')+'>'+safe(x==='draft'?'Borrador':x==='published'?'Publicado':x==='cancelled'?'Cancelado':x)+'</option>').join('')+'</select>'
  :adminLargeFields.has(name)
   ?'<textarea id="'+id+'" name="'+name+'" rows="'+(name==='content'?7:3)+'" placeholder="Escribe aquí...">'+safe(val)+'</textarea>'
   :'<input id="'+id+'" name="'+name+'" '+(name==='title'?'required maxlength="180" ':'')+(adminDateFields.has(name)?'type="datetime-local" ':'')+(name==='cover_url'||name==='image_url'||name==='destination_url'?'type="url" placeholder="https://..." ':'')+(name==='sort_order'?'type="number" step="1" ':'')+'value="'+safe(adminDateFields.has(name)?adminDateInput(val):val)+'" />';
 const full=['content','description','excerpt','cover_url','image_url','destination_url'].includes(name);
 return '<div class="admin-field'+(full?' admin-field-wide':'')+'"><label for="'+id+'">'+safe(label)+'</label>'+control+'</div>';
}
function adminSetupImageUpload(){
 const input=document.getElementById('admin-image-file'),url=document.getElementById('admin-image_url')||document.getElementById('admin-cover_url');
 const preview=document.getElementById('admin-image-preview'),status=document.getElementById('admin-upload-status');
 if(!input||!url)return;
 const show=()=>{if(preview){const value=url.value.trim();if(/^https:\/\//i.test(value)){preview.src=value;preview.hidden=false;}else{preview.hidden=true;preview.removeAttribute('src')}}};
 url.addEventListener('input',show);show();
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  const valid=['image/jpeg','image/png','image/webp','image/gif'];
  if(!valid.includes(file.type)||file.size>5*1024*1024){status.textContent='Selecciona una imagen JPG, PNG, WebP o GIF de hasta 5 MB.';input.value='';return}
  const button=document.getElementById('admin-save');
  input.disabled=true;if(button)button.disabled=true;status.textContent='Subiendo imagen…';
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.app_metadata?.role!=='admin')throw Error('Debes iniciar sesión como administrador.');
   const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[file.type];
   const category=adminModels[adminTable].catalogCategory||adminTable;
   const path=category+'/'+crypto.randomUUID()+'.'+extension;
   const {error}=await sb.storage.from('editorial-images').upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw error;
   const {data}=sb.storage.from('editorial-images').getPublicUrl(path);
   url.value=data.publicUrl;url.dispatchEvent(new Event('input',{bubbles:true}));
   status.textContent='Imagen subida correctamente. Guarda el contenido para publicarla.';
  }catch(error){status.textContent='No se pudo subir la imagen: '+error.message}
  finally{input.disabled=false;if(button)button.disabled=false;input.value=''}
 });
}

function adminForm(item={}){
 const root=document.getElementById('admin-form-root');if(!root)return;
 const model=adminModels[adminTable],isEdit=Boolean(item.id);
 root.innerHTML='<section class="admin-panel admin-editor-panel"><div class="admin-panel-heading"><div><span class="admin-kicker">EDITOR DE CONTENIDO</span><h2>'+(isEdit?'Editar':'Crear')+' '+model.label.toLowerCase()+'</h2><p>Completa los campos y guarda tus cambios en Supabase.</p></div><button type="button" class="admin-close" id="admin-close" aria-label="Cerrar editor">✕</button></div><form id="admin-editor"><div class="admin-fields">'+Object.keys(model.fields).map(k=>adminField(k,item[k]??(k==='status'?'draft':''),model)).join('')+'</div>'+((model.fields.image_url||model.fields.cover_url)?'<div class="admin-field admin-field-wide"><label for="admin-image-file">Subir imagen desde tu dispositivo (máximo 5 MB)</label><input id="admin-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><p id="admin-upload-status" role="status" aria-live="polite"></p><img id="admin-image-preview" alt="Vista previa de la imagen" hidden style="max-width:240px;max-height:180px;object-fit:contain;border-radius:12px;margin-top:10px"></div>':'')+'<div class="admin-form-actions"><button type="button" class="admin-secondary" id="admin-cancel">Cancelar</button><button type="submit" class="gradient-btn" id="admin-save">Guardar contenido</button></div></form></section>';
 adminSetupImageUpload();
 if(adminTable==='news'&&window.SBNewsMentions){
   for(const field of ['title','excerpt','content']){
     window.SBNewsMentions.attachPicker(document.getElementById('admin-'+field));
   }
 }
 const close=()=>root.replaceChildren();
 document.getElementById('admin-close').onclick=close;
 document.getElementById('admin-cancel').onclick=close;
 root.scrollIntoView({behavior:'smooth',block:'nearest'});
 document.getElementById('admin-editor').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=document.getElementById('admin-save');
  const data=Object.fromEntries(new FormData(form).entries());
  if(adminTable==='news')data.is_featured=form.elements.is_featured?.checked===true;
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
   if(model.catalogCategory)data.category=model.catalogCategory;
   const targetTable=model.catalogCategory?'site_catalog':adminTable;
   const query=isEdit?sb.from(targetTable).update(data).eq('id',item.id).select():sb.from(targetTable).insert(data).select();
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
  const model=adminModels[table];
  let query=sb.from(model.catalogCategory?'site_catalog':table).select('*');
  if(model.catalogCategory)query=query.eq('category',model.catalogCategory);
  const {data,error}=await query.order('created_at',{ascending:false}).limit(100);
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
   const {data:deleted,error}=await sb.from(adminModels[adminTable].catalogCategory?'site_catalog':adminTable).delete().eq('id',item.id).select();
   if(error||!deleted?.length){adminMessage('No se pudo eliminar: '+(error?.message||'Operación no confirmada'),'error');return;}
   adminMessage('Elemento eliminado.','success');await adminLoad();
  }catch(error){adminMessage('No se pudo eliminar: '+error.message,'error');}
  finally{if(button.isConnected)button.disabled=false;}
 });
}

async function adminLoadOverview(){
 const root=document.getElementById('admin-overview');if(!root)return;
 const targets=[['profiles','Miembros registrados en perfiles'],['member_posts','Publicaciones de comunidad'],['member_comments','Comentarios'],['community_competitions','Retos y torneos'],['community_competition_entries','Inscripciones a actividades'],['member_reports','Denuncias recibidas'],['news','Noticias'],['billboard','Cartelera'],['events','Eventos'],['site_catalog','Catálogo editorial']];
 const results=await Promise.all(targets.map(async ([table,label])=>{const {count,error}=await sb.from(table).select('*',{count:'exact',head:true});return {label,count,error};}));
 const extra=[
  ['Denuncias pendientes',sb.from('member_reports').select('*',{count:'exact',head:true}).eq('status','pending')],
  ['Pendientes más de 48 horas',sb.from('member_reports').select('*',{count:'exact',head:true}).eq('status','pending').lt('created_at',new Date(Date.now()-48*3600000).toISOString())],
  ['Torneos publicados',sb.from('community_competitions').select('*',{count:'exact',head:true}).eq('status','published').eq('kind','tournament')]
 ];
 const summaryResults=await Promise.all(extra.map(async([label,query])=>{const {count,error}=await query;return {label,count,error};}));
 if(!root.isConnected)return;
 root.replaceChildren();
 for(const result of [...results,...summaryResults]){
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
  const pending=(data||[]).filter(r=>r.status==='pending'),threshold=Date.now()-48*3600000;
  const urgent=pending.filter(r=>new Date(r.created_at).getTime()<threshold);
  const banner=document.createElement('p');banner.className='admin-report-priority-banner';
  banner.textContent='🛡️ '+pending.length+' denuncias pendientes de las últimas 100 consultadas · ⚠️ '+urgent.length+' con más de 48 horas. Revisar una denuncia no elimina el contenido.';
  root.append(banner);
  const rows=(data||[]).filter(r=>filter.value==='all'||(filter.value==='overdue'?r.status==='pending'&&new Date(r.created_at).getTime()<threshold:r.status===filter.value))
   .sort((a,b)=>a.status==='pending'&&b.status==='pending'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
  if(!rows.length){const empty=document.createElement('p');empty.textContent='No hay reportes en este estado.';root.append(empty);return;}
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
      report.status=status;adminMessage('Reporte actualizado. Enviando aviso por correo…','success');render();adminUpdateReportAlerts();adminLoadReportAudit();
      try{const {data:mail,error:mailError}=await sb.functions.invoke('send-report-review-email',{body:{report_id:report.id}});if(mailError||mail?.error)adminMessage('Denuncia actualizada. El correo no se pudo enviar; el aviso en Mi cuenta sigue disponible.','error');else if(mail?.skipped)adminMessage('Denuncia actualizada. Correo omitido: '+mail.skipped,'success');else adminMessage('Denuncia actualizada y aviso por correo enviado.','success');}catch(e){adminMessage('Denuncia actualizada, pero no se pudo confirmar el envío del correo.','error');}
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
 const reports=document.createElement('section');reports.className='admin-panel';reports.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">REPORTES DE LA COMUNIDAD</span><h2>Denuncias recibidas</h2><p>Revisa los reportes de publicaciones y comentarios. Marcar un reporte como revisado no elimina el contenido.</p></div><select id="admin-reports-filter" aria-label="Filtrar reportes"><option value="pending">Pendientes</option><option value="overdue">⚠️ Pendientes más de 48 h</option><option value="all">Todos</option><option value="reviewed">Revisados</option><option value="dismissed">Descartados</option></select></div><div id="admin-reports-list"></div>';
 dashboard.append(members,moderation,reports);
 document.getElementById('admin-refresh').onclick=()=>{adminLoadOverview();adminLoadMembers();adminLoadModeration();adminLoadReports();adminUpdateReportAlerts();};
 adminLoadOverview();adminLoadMembers();adminLoadModeration();adminLoadReports();adminInitReportAlerts();
}

async function adminLoadReportAudit(){
 const root=document.getElementById('admin-report-audit');if(!root)return;
 root.textContent='Cargando historial de reportes…';
 const {data,error}=await sb.from('member_admin_report_audit').select('id,report_id,actor_id,old_status,new_status,changed_at').order('changed_at',{ascending:false}).limit(80);
 if(!root.isConnected)return;
 root.replaceChildren();
 if(error){root.textContent='No se pudo cargar el historial: '+error.message;return;}
 if(!data?.length){root.textContent='Todavía no hay cambios de estado de reportes registrados.';return;}
 const names={pending:'Pendiente',reviewed:'Revisado',dismissed:'Descartado'};
 for(const item of data){
  const row=document.createElement('div');row.className='admin-management-row admin-report-audit-row';
  const heading=document.createElement('strong');heading.textContent='🛡️ '+(names[item.old_status]||item.old_status)+' → '+(names[item.new_status]||item.new_status);
  const detail=document.createElement('small');detail.textContent=new Date(item.changed_at).toLocaleString('es-ES')+' · Reporte: '+item.report_id+' · Responsable: '+(item.actor_id||'Sistema');
  row.append(heading,detail);root.append(row);
 }
}

async function adminInitCompetitions(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');if(!dashboard)return;
 const panel=document.createElement('section');panel.className='admin-panel admin-competitions-panel';panel.id='admin-competitions-management';
 panel.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">RETOS Y TORNEOS</span><h2>🏆 Gestión de competiciones</h2><p>Publica desafíos, gestiona inscripciones y registra puntuaciones. Estas puntuaciones no otorgan XP.</p></div><button type="button" class="admin-secondary" id="admin-competition-refresh">🔄 Actualizar</button></div><form class="admin-competition-create" id="admin-competition-create"><label>Tipo<select name="kind" required><option value="challenge">🎯 Reto</option><option value="tournament">🏆 Torneo</option></select></label><label>Título<input name="title" required minlength="3" maxlength="120" placeholder="Ej.: Torneo Pokémon del mes"></label><label>Descripción<textarea name="description" maxlength="2000" rows="3" placeholder="Reglas y condiciones de participación"></textarea></label><label>Inicio<input type="datetime-local" name="starts_at" required></label><label>Fin<input type="datetime-local" name="ends_at" required></label><label>Estado<select name="status"><option value="draft">Borrador</option><option value="published">Publicado</option></select></label><button type="submit" class="gradient-btn">➕ Crear reto o torneo</button></form><p role="status" id="admin-competition-status"></p><div id="admin-competition-list" class="admin-competition-list">Cargando competiciones…</div>';
 const summary=dashboard.querySelector('#admin-stats');
 if(summary)summary.after(panel);else dashboard.prepend(panel);
 const form=panel.querySelector('#admin-competition-create');
 const list=panel.querySelector('#admin-competition-list');
 const note=panel.querySelector('#admin-competition-status');
 const reload=async()=>{
  list.textContent='Cargando competiciones…';
  const {data:events,error}=await sb.from('community_competitions').select('id,kind,title,description,starts_at,ends_at,status,created_at').order('created_at',{ascending:false}).limit(70);
  if(error){list.textContent='No se pudieron cargar las competiciones: '+error.message;return;}
  const ids=(events||[]).map(e=>e.id);
  const {data:entries,error:entryError}=ids.length?await sb.from('community_competition_entries').select('competition_id,user_id,score,completed,joined_at').in('competition_id',ids).limit(700):{data:[],error:null};
  if(entryError){list.textContent='No se pudieron cargar las inscripciones: '+entryError.message;return;}
  const {data:awards,error:awardsError}=ids.length
   ?await sb.from('community_competition_awards').select('competition_id,user_id,place,points,badge,score,awarded_at').in('competition_id',ids).limit(210)
   :{data:[],error:null};
  if(awardsError){list.textContent='No se pudieron cargar los premios: '+awardsError.message;return;}
  const members=[...new Set([...(entries||[]).map(e=>e.user_id),...(awards||[]).map(a=>a.user_id)])];
  const {data:profiles}=members.length?await sb.from('profiles').select('id,display_name,username').in('id',members):{data:[]};
  const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
  list.replaceChildren();
  if(!events?.length){list.textContent='Todavía no hay retos ni torneos. Puedes crear el primero con el formulario.';return;}
  for(const event of events){
   const box=document.createElement('article');box.className='admin-competition-item';
   const title=document.createElement('h3');title.textContent=(event.kind==='challenge'?'🎯 ':'🏆 ')+event.title+' · '+event.status;
   const dates=document.createElement('p');dates.textContent=new Date(event.starts_at).toLocaleString('es-ES')+' – '+new Date(event.ends_at).toLocaleString('es-ES');
   const description=document.createElement('p');description.textContent=event.description||'Sin descripción.';
   const actions=document.createElement('div');actions.className='group-call-actions';
   const statusButton=document.createElement('button');statusButton.type='button';statusButton.className='admin-secondary';
   statusButton.textContent=event.status==='draft'?'📢 Publicar':event.status==='published'?'🚫 Cancelar':'↩️ Volver a borrador';
   statusButton.onclick=async()=>{
    const target=event.status==='draft'?'published':event.status==='published'?'cancelled':'draft';
    if(!confirm('¿Cambiar «'+event.title+'» a '+target+'?'))return;
    statusButton.disabled=true;
    const {error}=await sb.from('community_competitions').update({status:target}).eq('id',event.id);
    if(error){note.textContent='No se pudo cambiar el estado: '+error.message;statusButton.disabled=false;return;}
    note.textContent='Competición actualizada.';await reload();
   };
   const eventAwards=(awards||[]).filter(a=>a.competition_id===event.id).sort((a,b)=>a.place-b.place);
   if(eventAwards.length){statusButton.disabled=true;statusButton.title='Premios entregados: el estado no debe cambiar.';}
   actions.append(statusButton);box.append(title,dates,description,actions);
   const people=(entries||[]).filter(e=>e.competition_id===event.id).sort((a,b)=>b.score-a.score||new Date(a.joined_at)-new Date(b.joined_at)||a.user_id.localeCompare(b.user_id));
   const prizePanel=document.createElement('div');prizePanel.className='admin-competition-award-panel';
   if(eventAwards.length){
    const summary=document.createElement('strong');summary.textContent='🏅 Premios entregados y registrados ('+eventAwards.length+')';prizePanel.append(summary);
    for(const prize of eventAwards){
     const row=document.createElement('p');row.textContent=prize.badge+' · '+(names.get(prize.user_id)||'Participante')+' · +'+prize.points+' puntos de tienda';prizePanel.append(row);
    }
   }else{
    const heading=document.createElement('strong');heading.textContent='🏅 Premios del podio';prizePanel.append(heading);
    const legend=document.createElement('p');legend.textContent='🥇 100 puntos · 🥈 50 puntos · 🥉 25 puntos. Los premios no añaden XP y solo se entregan una vez.';prizePanel.append(legend);
    const eligible=people.filter(e=>e.completed||e.score>0);
    if(event.status==='published'&&Date.now()>=new Date(event.ends_at).getTime()&&eligible.length){
     const button=document.createElement('button');button.type='button';button.className='gradient-btn';button.textContent='🏆 Entregar premios a los ganadores';
     button.onclick=async()=>{
      if(!confirm('¿Confirmas la clasificación final de «'+event.title+'»? Se entregarán los premios una sola vez.'))return;
      button.disabled=true;
      const {data,error}=await sb.rpc('award_community_competition_podium',{p_competition_id:event.id});
      if(error){note.textContent='No se pudieron entregar los premios: '+error.message;button.disabled=false;return;}
      await reload();note.textContent='🏆 Premios entregados a '+data+' ganador(es). Saldo de tienda e insignias actualizados.';
     };
     prizePanel.append(button);
    }else{
     const hint=document.createElement('small');hint.textContent='Para entregar premios, la competición debe estar publicada, finalizada y tener participantes con puntuación o resultado completado.';prizePanel.append(hint);
    }
   }
   box.append(prizePanel);
   const count=document.createElement('strong');count.textContent='👥 '+people.length+' participantes registrados (hasta 700 inscripciones consultadas)';
   box.append(count);
   if(!people.length){
    const noPeople=document.createElement('p');noPeople.textContent='Todavía no hay inscripciones.';box.append(noPeople);
   }
   for(const person of people){
    const row=document.createElement('div');row.className='admin-competition-score-row';
    const label=document.createElement('span');label.textContent=names.get(person.user_id)||'Miembro sin perfil público';
    const score=document.createElement('input');score.type='number';score.min='0';score.max='100000';score.step='1';score.value=String(person.score);score.disabled=eventAwards.length>0;score.setAttribute('aria-label','Puntuación de '+label.textContent);
    const completedLabel=document.createElement('label');const completed=document.createElement('input');completed.type='checkbox';completed.checked=person.completed;completed.disabled=eventAwards.length>0;completedLabel.append(completed,document.createTextNode(' Completado'));
    const save=document.createElement('button');save.type='button';save.className='admin-secondary';save.textContent=eventAwards.length?'Premios cerrados':'Guardar puntuación';save.disabled=eventAwards.length>0;
    save.onclick=async()=>{
     const value=Number(score.value);
     if(!Number.isInteger(value)||value<0||value>100000){note.textContent='Introduce una puntuación válida de 0 a 100000.';return;}
     save.disabled=true;
     const {error}=await sb.from('community_competition_entries').update({score:value,completed:completed.checked})
      .eq('competition_id',event.id).eq('user_id',person.user_id);
     if(error){note.textContent='No se pudo guardar: '+error.message;save.disabled=false;return;}
     note.textContent='Resultado guardado para '+label.textContent+'. No se ha modificado el XP.';
     save.disabled=false;
    };
    row.append(label,score,completedLabel,save);box.append(row);
   }
   list.append(box);
  }
 };
 form.onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(form);
  const title=String(fd.get('title')||'').trim(),description=String(fd.get('description')||'').trim();
  const start=new Date(String(fd.get('starts_at')||'')),end=new Date(String(fd.get('ends_at')||''));
  if(title.length<3||title.length>120||description.length>2000||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||end.getTime()<=Date.now()){
   note.textContent='Comprueba el título, la descripción y que el final sea posterior al inicio y al momento actual.';return;
  }
  const {data:{user}}=await sb.auth.getUser();
  if(!user){note.textContent='Inicia sesión como administrador.';return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  const payload={kind:String(fd.get('kind')),title,description,starts_at:start.toISOString(),ends_at:end.toISOString(),status:String(fd.get('status')),created_by:user.id};
  const {error}=await sb.from('community_competitions').insert(payload);
  button.disabled=false;
  if(error){note.textContent='No se pudo crear la competición: '+error.message;return;}
  form.reset();note.textContent=payload.status==='published'?'✅ Competición publicada: ya aparece en la comunidad.':'📝 Competición guardada como borrador. Pulsa «Publicar» en su tarjeta para mostrarla a los miembros.';await reload();adminLoadOverview();
 };
 panel.querySelector('#admin-competition-refresh').onclick=reload;
 await reload();
 if(location.hash.startsWith('#/admin')&&new URLSearchParams(location.hash.split('?')[1]||'').get('focus')==='competitions'){
  panel.scrollIntoView({block:'start',behavior:'smooth'});
 }
}

async function initAdmin(){
 const root=document.getElementById('admin-root');if(!root)return;
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user){root.innerHTML='<p>Debes iniciar sesión.</p><a href="#/auth">Entrar</a>';return;}
 if(user.app_metadata?.role!=='admin'){root.textContent='No tienes permisos de administrador. Cierra sesión y vuelve a entrar si acabas de recibir el rol.';return;}
 root.innerHTML='<div class="admin-dashboard"><div class="admin-quicklinks"><a href="#/admin?focus=competitions">🏆 Crear reto o torneo</a><a href="#/cuenta">👤 Mi perfil</a><a href="#/miembros">👥 Comunidad</a><a href="#/noticias">📰 Ver noticias</a><a href="#/cartelera">🎬 Ver cartelera</a><a href="#/eventos">📅 Ver eventos</a></div><div class="admin-welcome"><div><span class="admin-kicker">SHADOWS BYTE · CONTROL CENTER</span><h2>Tu centro de mando</h2><p>Gestiona noticias, cartelera, eventos y todas las secciones temáticas desde un único lugar.</p></div><span class="admin-admin-badge">● Administrador</span></div><p class="admin-session">Sesión iniciada: '+escapeHTML(user.email)+'</p><div class="admin-stats" id="admin-stats"></div><section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-kicker">GESTIÓN DE CONTENIDOS</span><h2>Publicaciones</h2></div><button class="gradient-btn mini" id="admin-new" type="button">+ Crear noticias</button></div><div class="admin-tabs" role="tablist" aria-label="Secciones de administración" id="admin-tabs"></div><div id="admin-message" role="status" aria-live="polite"></div></section><div id="admin-form-root"></div><section class="admin-panel" id="admin-shop-root" style="padding:18px;margin:20px 0">Cargando administración de tienda…</section><section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-kicker">BIBLIOTECA</span><h2 id="admin-list-title">Noticias</h2></div><input type="search" id="admin-search" placeholder="Buscar por título…" aria-label="Buscar contenido por título"></div><div id="admin-list"></div></section></div>';
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(dashboard){
  const auditSection=document.createElement('section');auditSection.className='admin-panel admin-report-audit-panel';
  const title=document.createElement('h2');title.textContent='🛡️ Historial de revisión de denuncias';
  const help=document.createElement('p');help.textContent='Cambios de estado guardados automáticamente en Supabase. Esta información solo está disponible para administradores.';
  const refresh=document.createElement('button');refresh.type='button';refresh.className='admin-secondary';refresh.textContent='🔄 Actualizar historial';
  const list=document.createElement('div');list.id='admin-report-audit';list.setAttribute('aria-live','polite');
  refresh.onclick=adminLoadReportAudit;
  auditSection.append(title,help,refresh,list);dashboard.append(auditSection);
  adminLoadReportAudit();
 }

 const tabs=document.getElementById('admin-tabs');
 for(const [table,model] of Object.entries(adminModels)){
  const button=document.createElement('button');button.type='button';button.dataset.table=table;button.setAttribute('role','tab');button.textContent=model.icon+' '+model.label;
  button.onclick=()=>{adminTable=table;document.getElementById('admin-form-root').replaceChildren();adminSetActiveTab();adminLoad();};
  tabs.append(button);
 }
 document.getElementById('admin-new').onclick=()=>adminForm();
 document.getElementById('admin-search').oninput=adminRenderList;
 adminSetActiveTab();await adminLoad();adminInitExtended();adminInitCompetitions();adminInitSurpriseBoxes();adminInitRewardShop();
}

async function adminInitRewardShop(){
 const root=document.getElementById('admin-shop-root');if(!root)return;
 const {data:{user}}=await sb.auth.getUser();
 if(user?.app_metadata?.role!=='admin'){root.textContent='Acceso exclusivo para administradores.';return}
 const [items,sales]=await Promise.all([sb.rpc('admin_shop_items'),sb.rpc('admin_shop_sales')]);
 root.replaceChildren();
 if(items.error||sales.error){root.textContent='Error al cargar la tienda: '+(items.error?.message||sales.error?.message);return}
 const inventory=items.data||[];
 const shop=document.createElement('div');shop.className='sb-shop-admin';root.append(shop);
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 const header=make('header','sb-shop-admin__header');
 const intro=make('div','');
 intro.append(make('div','sb-shop-admin__eyebrow','PANEL DE ADMINISTRACIÓN'),make('h2','','🏪 Administración de la tienda'),make('p','','Añade y edita artículos, imágenes, precios y visibilidad. Para conservar las compras, los identificadores y efectos existentes no se modifican.'));
 const pills=make('div','sb-shop-admin__pills');
 pills.append(make('span','sb-shop-admin__pill',inventory.length+' artículos'),make('span','sb-shop-admin__pill sb-shop-admin__pill--active',inventory.filter(item=>item.active).length+' visibles'));
 header.append(intro,pills);shop.append(header);

 const layout=make('div','sb-shop-admin__layout');
 const form=document.createElement('form');form.className='admin-panel sb-shop-admin__form';
 const formHeading=make('div','sb-shop-admin__section-heading');
 const formHeadingText=make('div','');
 formHeadingText.append(make('h3','','✨ Datos del artículo'),make('p','','Completa los campos para publicar una recompensa.'));
 formHeading.append(formHeadingText);form.append(formHeading);
 const fieldsRoot=make('div','sb-shop-admin__fields');
 const controls={};
 const fields=[
  ['id','ID único','text','Ej.: marco_neon',false],
  ['name','Nombre del artículo','text','Ej.: Marco neón especial',false],
  ['description','Descripción','textarea','Explica qué recibirá el usuario',true],
  ['price','Precio en puntos','number','Ej.: 500',false],
  ['sort_order','Orden de aparición','number','0',false],
  ['image_url','URL HTTPS de imagen (opcional)','url','https://ejemplo.com/imagen.png',true]
 ];
 for(const [key,label,type,placeholder,wide] of fields){
  const wrap=make('label','sb-shop-admin__field'+(wide?' sb-shop-admin__field--wide':''));
  const control=type==='textarea'?document.createElement('textarea'):document.createElement('input');
  if(type==='textarea')control.rows=3;else control.type=type;
  control.name=key;control.placeholder=placeholder;
  if(['id','name','price'].includes(key))control.required=true;
  if(key==='price'){control.min='1';control.max='100000';control.step='1'}
  if(key==='sort_order'){control.min='0';control.step='1'}
  if(key==='id')control.pattern='[a-z0-9_-]{3,60}';
  wrap.append(make('span','',label),control);
  if(key==='id')wrap.append(make('small','sb-shop-admin__hint','De 3 a 60 caracteres: letras minúsculas, números, _ o -.'));
  fieldsRoot.append(wrap);controls[key]=control;
 }
 const categories={frame:'Marco',badge:'Insignia',color:'Color',title:'Título'};
 const displayCategories={...categories,anime_theme:'Tema anime exclusivo'};
 const categoryLabel=make('label','sb-shop-admin__field');categoryLabel.append(make('span','','Categoría'));
 const category=document.createElement('select');
 for(const [key,label] of Object.entries(categories)){const option=document.createElement('option');option.value=key;option.textContent=label;category.append(option)}
 categoryLabel.append(category);fieldsRoot.append(categoryLabel);
 const effects={frame:[['neon','Marco neón'],['gold','Marco dorado']],badge:[['⭐','Estrella'],['👑','Corona']],color:[['#22d3ee','Cian'],['#f472b6','Rosa']],title:[['Otaku Élite','Otaku Élite'],['Leyenda Byte','Leyenda Byte']]};
 const effectLabel=make('label','sb-shop-admin__field');effectLabel.append(make('span','','Efecto visual'));
 const effect=document.createElement('select');effectLabel.append(effect);fieldsRoot.append(effectLabel);
 const refreshEffects=(value)=>{effect.replaceChildren();for(const [key,label] of effects[category.value]||[]){const option=document.createElement('option');option.value=key;option.textContent=label;effect.append(option)}if(value)effect.value=value};
 refreshEffects();
 const activeLabel=make('label','sb-shop-admin__toggle');
 const active=document.createElement('input');active.type='checkbox';active.checked=true;
 activeLabel.append(active,make('span','','✅ Artículo visible en tienda'));fieldsRoot.append(activeLabel);
 form.append(fieldsRoot);
 const actions=make('div','sb-shop-admin__actions');
 const submit=make('button','gradient-btn','💾 Guardar artículo');submit.type='submit';
 const reset=make('button','outline-btn','＋ Nuevo artículo');reset.type='button';
 actions.append(submit,reset);
 const status=make('p','sb-shop-admin__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 form.append(actions,status);

 const preview=make('aside','sb-shop-admin__preview');
 const previewHeading=make('div','sb-shop-admin__section-heading');
 const previewHeadingText=make('div','');
 previewHeadingText.append(make('h3','','👁 Vista previa'),make('p','','Así se verá la recompensa.'));
 previewHeading.append(previewHeadingText);preview.append(previewHeading);
 const previewArt=make('div','sb-shop-admin__preview-art');
 const previewImage=document.createElement('img');previewImage.alt='Imagen del artículo';previewImage.hidden=true;
 const previewPlaceholder=make('span','sb-shop-admin__preview-placeholder','🎁');
 previewArt.append(previewImage,previewPlaceholder);
 const previewName=make('div','sb-shop-admin__preview-name');
 const previewMeta=make('div','sb-shop-admin__preview-meta');
 const previewPrice=make('span','','0 puntos');const previewCategory=make('span','','Marco');const previewEffect=make('span','','Marco neón');
 previewMeta.append(previewPrice,previewCategory,previewEffect);
 const previewDescription=make('p','sb-shop-admin__preview-description');
 const previewVisibility=make('p','sb-shop-admin__preview-visibility','● Visible en tienda');
 preview.append(previewArt,previewName,previewMeta,previewDescription,previewVisibility);
 layout.append(form,preview);shop.append(layout);
 const updatePreview=()=>{
  const url=controls.image_url.value.trim();
  if(url.startsWith('https://')){previewImage.hidden=false;previewPlaceholder.hidden=true;if(previewImage.getAttribute('src')!==url)previewImage.src=url}
  else {previewImage.hidden=true;previewPlaceholder.hidden=false;previewImage.removeAttribute('src')}
  previewName.textContent=controls.name.value.trim()||'Nombre del artículo';
  previewPrice.textContent=(controls.price.value||'0')+' puntos';
  previewCategory.textContent=categories[category.value]||'Categoría';
  previewEffect.textContent=effect.selectedOptions[0]?.textContent||'Sin efecto';
  previewDescription.textContent=controls.description.value.trim()||'La descripción de la recompensa aparecerá aquí.';
  previewVisibility.textContent=active.checked?'● Visible en tienda':'● Oculto en tienda';
  previewVisibility.classList.toggle('sb-shop-admin__preview-visibility--hidden',!active.checked);
 };
 previewImage.onerror=()=>{previewImage.hidden=true;previewPlaceholder.hidden=false};
 category.onchange=()=>{refreshEffects();updatePreview()};
 fieldsRoot.addEventListener('input',updatePreview);
 fieldsRoot.addEventListener('change',updatePreview);
 const resetForm=()=>{
  form.reset();controls.id.readOnly=false;category.disabled=false;effect.disabled=false;
  refreshEffects();active.checked=true;submit.textContent='💾 Guardar artículo';status.textContent='';status.removeAttribute('data-type');updatePreview();
 };
 reset.onclick=resetForm;
 const fill=item=>{
  for(const [key,input] of Object.entries(controls))input.value=item[key]??'';
  category.value=item.category;refreshEffects(item.value);active.checked=!!item.active;
  controls.id.readOnly=true;category.disabled=true;effect.disabled=true;
  submit.textContent='💾 Guardar cambios';status.textContent='Editando: '+item.name;status.removeAttribute('data-type');
  updatePreview();form.scrollIntoView({behavior:'smooth',block:'start'});
 };
 const duplicate=item=>{
  resetForm();
  controls.name.value=(item.name||'Artículo')+' (copia)';
  controls.description.value=item.description||'';
  controls.price.value=item.price??'';
  controls.image_url.value=item.image_url||'';
  controls.sort_order.value=item.sort_order??'0';
  category.value=item.category;refreshEffects(item.value);active.checked=false;
  const safeId=String(item.id||'articulo').toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40)||'articulo';
  let next=safeId+'_copia',counter=2;
  while(inventory.some(existing=>existing.id===next)){next=safeId+'_copia_'+counter++}
  controls.id.value=next;
  status.textContent='Copia preparada. Revisa los datos y pulsa Guardar artículo.';
  updatePreview();form.scrollIntoView({behavior:'smooth',block:'start'});
 };
 form.onsubmit=async event=>{
  event.preventDefault();
  const imageUrl=controls.image_url.value.trim();
  if(imageUrl){
   let valid=false;
   try{const parsed=new URL(imageUrl);valid=parsed.protocol==='https:'&&!!parsed.hostname&&!(parsed.username||parsed.password)}catch(error){}
   if(!valid){status.textContent='La imagen debe utilizar una URL HTTPS válida.';status.dataset.type='error';controls.image_url.focus();return}
  }
  const price=Number(controls.price.value);
  if(!Number.isInteger(price)||price<1||price>100000){
   status.textContent='Introduce un precio entero entre 1 y 100.000 puntos.';status.dataset.type='error';controls.price.focus();return;
  }
  submit.disabled=true;status.textContent='Guardando artículo…';status.removeAttribute('data-type');
  const payload={p_id:controls.id.value.trim(),p_category:category.value,p_name:controls.name.value.trim(),p_description:controls.description.value.trim(),p_price:Number(controls.price.value),p_value:effect.value,p_active:active.checked,p_image_url:controls.image_url.value.trim()||null,p_sort_order:Number(controls.sort_order.value||0)};
  try{
   const {error}=await sb.rpc('admin_save_shop_item',payload);
   if(error){status.textContent='Error: '+error.message;status.dataset.type='error';return}
   await adminInitRewardShop();
   const newStatus=root.querySelector('.sb-shop-admin__status');if(newStatus){newStatus.textContent='✓ Artículo guardado correctamente.';newStatus.dataset.type='success'}
  }catch(error){status.textContent='No se pudo guardar: '+(error?.message||String(error));status.dataset.type='error'}
  finally{submit.disabled=false}
 };
 updatePreview();

 const list=make('section','sb-shop-admin__section');
 const listHeading=make('div','sb-shop-admin__section-heading');
 const listTitle=make('div','');listTitle.append(make('h3','','🛍️ Artículos existentes'),make('p','','Selecciona Editar para actualizar un artículo sin perder compras.'));
 const search=document.createElement('input');search.className='sb-shop-admin__search';search.type='search';search.placeholder='Buscar artículos…';search.setAttribute('aria-label','Buscar artículos de la tienda');
 listHeading.append(listTitle,search);list.append(listHeading);
 const toolbar=make('div','sb-shop-admin__toolbar');
 const categoryFilter=document.createElement('select');categoryFilter.setAttribute('aria-label','Filtrar por categoría');
 const visibilityFilter=document.createElement('select');visibilityFilter.setAttribute('aria-label','Filtrar por visibilidad');
 const sorting=document.createElement('select');sorting.setAttribute('aria-label','Ordenar artículos');
 const addOptions=(select,values)=>{for(const [value,label] of values){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}};
 addOptions(categoryFilter,[['all','Todas las categorías'],...Object.entries(displayCategories)]);
 addOptions(visibilityFilter,[['all','Todos los estados'],['visible','Visibles'],['hidden','Ocultos']]);
 addOptions(sorting,[['order','Orden de tienda'],['name','Nombre (A-Z)'],['price_asc','Puntos: menor a mayor'],['price_desc','Puntos: mayor a menor']]);
 const resultCount=make('span','sb-shop-admin__result-count','');
 const csvButton=make('button','sb-shop-admin__export','⬇ Exportar CSV');csvButton.type='button';
 toolbar.append(categoryFilter,visibilityFilter,sorting,csvButton,resultCount);list.append(toolbar);
 const itemsRoot=make('div','sb-shop-admin__items');const rows=[];
 for(const item of inventory){
  const row=make('div','sb-shop-admin__item');
  if(item.image_url){const img=document.createElement('img');img.className='sb-shop-admin__item-image';img.src=item.image_url;img.alt='';img.loading='lazy';row.append(img)}
  else row.append(make('div','sb-shop-admin__item-image sb-shop-admin__item-fallback','🎁'));
  const info=make('div','sb-shop-admin__item-info');
  info.append(make('strong','',item.name),make('small','',item.price+' puntos · '+(displayCategories[item.category]||item.category)),make('span','sb-shop-admin__item-status'+(item.active?'':' sb-shop-admin__item-status--hidden'),item.active?'● Visible':'● Oculto'));
  const button=make('button','','Editar');button.type='button';button.onclick=()=>fill(item);
  if(item.category==='anime_theme'){button.disabled=true;button.title='Los temas anime existentes conservan su efecto. Usa Promoción para destacarlos u ofrecer descuentos.'}
  const duplicateButton=make('button','sb-shop-admin__duplicate','Duplicar');duplicateButton.type='button';duplicateButton.onclick=()=>duplicate(item);
  const promotionButton=make('button','sb-shop-admin__promote','Promoción');promotionButton.type='button';promotionButton.onclick=()=>openMerchandising(item);
  if(item.category==='anime_theme'){duplicateButton.disabled=true;duplicateButton.title='Los temas anime usan efectos exclusivos ya existentes.'}
  const itemActions=make('div','sb-shop-admin__item-actions');itemActions.append(button,duplicateButton,promotionButton);
  row.append(info,itemActions);itemsRoot.append(row);
  rows.push({row,item});
 }
 const empty=make('p','sb-shop-admin__empty','No hay artículos que coincidan con la búsqueda.');empty.hidden=true;
 list.append(itemsRoot,empty);shop.append(list);
 const filter=()=>{
  const term=search.value.trim().toLocaleLowerCase('es');
  const matching=rows.filter(({item})=>{
   const content=[item.name,item.id,item.description,displayCategories[item.category]||item.category].join(' ').toLocaleLowerCase('es');
   const isCorrectVisibility=visibilityFilter.value==='all'||(visibilityFilter.value==='visible'?!!item.active:!item.active);
   return content.includes(term)&&(categoryFilter.value==='all'||item.category===categoryFilter.value)&&isCorrectVisibility;
  });
  matching.sort((a,b)=>{
   if(sorting.value==='name')return String(a.item.name).localeCompare(String(b.item.name),'es');
   if(sorting.value==='price_asc')return Number(a.item.price)-Number(b.item.price);
   if(sorting.value==='price_desc')return Number(b.item.price)-Number(a.item.price);
   return Number(a.item.sort_order||0)-Number(b.item.sort_order||0);
  });
  for(const {row} of rows)row.hidden=true;
  for(const {row} of matching){row.hidden=false;itemsRoot.append(row)}
  empty.hidden=matching.length>0;
  empty.textContent=inventory.length?'No hay artículos que coincidan con los filtros.':'Aún no hay artículos en la tienda.';
  resultCount.textContent=matching.length+' de '+inventory.length+' artículos';
  return matching.map(({item})=>item);
 };
 const csvCell=value=>{
  let valueText=String(value??'');
  if(valueText.length && ('=+@-'.includes(valueText.trimStart().charAt(0)) || valueText.startsWith('\t') || valueText.startsWith('\r')))valueText="'"+valueText;
  return '"'+valueText.replace(/"/g,'""')+'"';
 };
 csvButton.onclick=()=>{
  const filtered=filter();
  const columns=['id','name','description','category','price','image_url','sort_order','active'];
  const lines=[columns.join(','),...filtered.map(item=>columns.map(key=>csvCell(item[key])).join(','))];
  const csv=lines.join(String.fromCharCode(13,10));
  const url=URL.createObjectURL(new Blob([String.fromCharCode(65279)+csv],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='shadows-byte-tienda.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 };
 search.addEventListener('input',filter);
 for(const control of [categoryFilter,visibilityFilter,sorting])control.addEventListener('change',filter);
 filter();


 const merch=make('section','sb-shop-admin__section sb-shop-admin__merch');
 const merchHeader=make('div','sb-shop-admin__section-heading');
 merchHeader.append(make('h3','','🌟 Destacados y ofertas especiales'),make('p','','Configura promociones. Los cambios de puntos solo se aplican durante el periodo elegido.'));
 merch.append(merchHeader);
 const merchForm=document.createElement('form');merchForm.className='sb-shop-admin__merch-form';
 const itemWrap=make('label','sb-shop-admin__field sb-shop-admin__field--wide');itemWrap.append(make('span','','Artículo'));
 const itemSelect=document.createElement('select');
 for(const item of inventory){
  const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+(displayCategories[item.category]||item.category);itemSelect.append(option)
 }
 itemWrap.append(itemSelect);merchForm.append(itemWrap);
 const featuredWrap=make('label','sb-shop-admin__toggle');
 const featuredCheck=document.createElement('input');featuredCheck.type='checkbox';
 featuredWrap.append(featuredCheck,make('span','','⭐ Mostrar en recompensas destacadas'));merchForm.append(featuredWrap);
 const salePriceWrap=make('label','sb-shop-admin__field');
 salePriceWrap.append(make('span','','Precio de oferta (puntos)'));
 const salePrice=document.createElement('input');salePrice.type='number';salePrice.min='1';salePrice.step='1';salePrice.placeholder='Dejar vacío: sin oferta';salePriceWrap.append(salePrice);
 const saleStartWrap=make('label','sb-shop-admin__field');
 saleStartWrap.append(make('span','','Inicio de la oferta'));
 const saleStart=document.createElement('input');saleStart.type='datetime-local';saleStartWrap.append(saleStart);
 const saleEndWrap=make('label','sb-shop-admin__field');
 saleEndWrap.append(make('span','','Fin de la oferta'));
 const saleEnd=document.createElement('input');saleEnd.type='datetime-local';saleEndWrap.append(saleEnd);
 const merchHint=make('p','sb-shop-admin__hint sb-shop-admin__field--wide','El precio de oferta debe ser menor que el precio normal. Para quitar una oferta, deja los tres campos vacíos y guarda.');
 merchForm.append(salePriceWrap,saleStartWrap,saleEndWrap,merchHint);
 const merchActions=make('div','sb-shop-admin__merch-actions');
 const merchSave=make('button','gradient-btn','💾 Guardar promoción');merchSave.type='button';
 const merchClear=make('button','outline-btn','Quitar oferta');merchClear.type='button';
 merchActions.append(merchSave,merchClear);
 const merchStatus=make('p','sb-shop-admin__status');merchStatus.setAttribute('role','status');merchStatus.setAttribute('aria-live','polite');
 merch.append(merchForm,merchActions,merchStatus);shop.append(merch);
 const localDate=value=>{
  if(!value)return '';
  const date=new Date(value);if(Number.isNaN(date.getTime()))return '';
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
 };
 const openMerchandising=(item,scroll=true)=>{
  if(!item)return;
  itemSelect.value=item.id;featuredCheck.checked=!!item.featured;
  salePrice.value=item.sale_price??'';
  saleStart.value=localDate(item.sale_starts_at);saleEnd.value=localDate(item.sale_ends_at);
  salePrice.max=String(Math.max(1,Number(item.price)-1));
  merchStatus.textContent='Precio normal: '+Number(item.price).toLocaleString('es-ES')+' puntos.';
  merchStatus.removeAttribute('data-type');
  if(scroll)merch.scrollIntoView({behavior:'smooth',block:'start'});
 };
 itemSelect.onchange=()=>openMerchandising(inventory.find(item=>item.id===itemSelect.value));
 merchClear.onclick=()=>{salePrice.value='';saleStart.value='';saleEnd.value='';merchStatus.textContent='Oferta borrada del formulario; pulsa Guardar promoción para aplicar.'};
 merchForm.onsubmit=event=>{event.preventDefault();merchSave.click()};
 merchSave.onclick=async()=>{
  const item=inventory.find(row=>row.id===itemSelect.value);
  if(!item){merchStatus.textContent='Selecciona un artículo.';return}
  const values=[salePrice.value.trim(),saleStart.value.trim(),saleEnd.value.trim()];
  const any=values.some(Boolean),all=values.every(Boolean);
  if(any&&!all){merchStatus.textContent='Para programar una oferta, completa el precio, el inicio y el fin.';merchStatus.dataset.type='error';return}
  let price=null,start=null,end=null;
  if(all){
   price=Number(salePrice.value);start=new Date(saleStart.value);end=new Date(saleEnd.value);
   if(!Number.isInteger(price)||price<=0||price>=Number(item.price)||Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>=end){
    merchStatus.textContent='Comprueba el precio y las fechas: la oferta debe ser menor que el precio normal y terminar después de empezar.';
    merchStatus.dataset.type='error';return;
   }
  }
  merchSave.disabled=true;merchStatus.textContent='Guardando promoción…';merchStatus.removeAttribute('data-type');
  try{
   const {error}=await sb.rpc('admin_update_shop_merchandising',{
    p_id:item.id,p_featured:featuredCheck.checked,p_sale_price:price,
    p_sale_starts_at:start?start.toISOString():null,p_sale_ends_at:end?end.toISOString():null
   });
   if(error){merchStatus.textContent='Error: '+error.message;merchStatus.dataset.type='error';return}
   await adminInitRewardShop();
   const result=root.querySelector('.sb-shop-admin__merch .sb-shop-admin__status');
   if(result){result.textContent='✓ Promoción guardada. Las ofertas solo aparecerán durante sus fechas.';result.dataset.type='success'}
  }catch(error){merchStatus.textContent='No se pudo guardar: '+(error?.message||String(error));merchStatus.dataset.type='error'}
  finally{merchSave.disabled=false}
 };
 if(inventory.length)openMerchandising(inventory[0],false);else{
  for(const control of [itemSelect,featuredCheck,salePrice,saleStart,saleEnd,merchSave,merchClear])control.disabled=true;
  merchStatus.textContent='Crea primero un artículo para configurar promociones.';
 }

 const stats=make('section','sb-shop-admin__section');
 const statsHeading=make('div','sb-shop-admin__section-heading');statsHeading.append(make('h3','','📊 Compras por artículo'));stats.append(statsHeading);
 const salesData=sales.data||[];
 const totalPurchases=salesData.reduce((sum,entry)=>sum+Number(entry.purchases||0),0);
 const totalSpent=salesData.reduce((sum,entry)=>sum+Number(entry.points_spent||0),0);
 const overview=make('div','sb-shop-admin__overview');
 for(const [label,value] of [
  ['Compras registradas',totalPurchases.toLocaleString('es-ES')],
  ['Puntos gastados',totalSpent.toLocaleString('es-ES')],
  ['Artículos ocultos',String(inventory.filter(item=>!item.active).length)]
 ]){
  const metric=make('div','sb-shop-admin__metric');
  metric.append(make('span','',label),make('strong','',value));overview.append(metric);
 }
 stats.append(overview);
 const salesRoot=make('div','sb-shop-admin__sales');
 for(const entry of [...salesData].sort((a,b)=>Number(b.purchases||0)-Number(a.purchases||0))){
  const tile=make('div','sb-shop-admin__sale');
  tile.append(make('strong','',entry.item_name),make('span','',entry.purchases+' compras'),make('span','',entry.points_spent+' puntos gastados'));
  salesRoot.append(tile);
 }
 if(!(sales.data||[]).length)stats.append(make('p','sb-shop-admin__empty','Todavía no hay compras registradas.'));
 else stats.append(salesRoot);
 shop.append(stats);
}

async function adminInitSurpriseBoxes(){
 const anchor=document.getElementById('admin-shop-root');if(!anchor)return;
 let root=document.getElementById('admin-surprise-boxes');if(root)root.remove();root=document.createElement('section');root.id='admin-surprise-boxes';root.className='admin-panel';root.style.cssText='padding:18px;margin:16px 0';anchor.before(root);
 const h=document.createElement('h2');h.textContent='🎁 Administración de cajas misteriosas';root.append(h); const previews=document.createElement('section');previews.style.cssText='padding:16px;margin:12px 0;border:1px solid #ffffff33;border-radius:14px';const previewsHeading=document.createElement('h3');previewsHeading.textContent='✨ Vistas previas gratuitas de cajas misteriosas';previews.append(previewsHeading);const previewNote=document.createElement('p');previewNote.textContent='Estas animaciones no descuentan puntos ni envían regalos.';previews.append(previewNote);const soundLabel=document.createElement('label');soundLabel.style.cssText='display:flex;align-items:center;gap:8px;margin:12px 0';const soundToggle=document.createElement('input');soundToggle.type='checkbox';soundToggle.checked=localStorage.getItem('mystery_box_sound')!=='off';soundToggle.onchange=()=>{localStorage.setItem('mystery_box_sound',soundToggle.checked?'on':'off')};soundLabel.append(soundToggle,document.createTextNode('🔊 Activar sonidos al abrir cajas'));previews.append(soundLabel);const previewTypes=[{name:'Bronce',emoji:'🥉',color:'#cd7f32',particle:'✦'},{name:'Plata',emoji:'🥈',color:'#c0c0c0',particle:'✧'},{name:'Oro',emoji:'🥇',color:'#ffd700',particle:'★'},{name:'Diamante',emoji:'💎',color:'#67e8f9',particle:'💎'}];for(const tier of previewTypes){const preview=document.createElement('div');preview.style.cssText='padding:12px;margin:12px 0;border:1px solid '+tier.color+'66;border-radius:12px;text-align:center';const title=document.createElement('h4');title.textContent=tier.emoji+' Vista previa de Caja '+tier.name;const button=document.createElement('button');button.type='button';button.className='gradient-btn mini';button.textContent=tier.emoji+' Probar animación '+tier.name;const stage=document.createElement('div');stage.style.cssText='position:relative;height:130px;overflow:hidden;display:grid;place-items:center';const status=document.createElement('p');status.setAttribute('role','status');button.onclick=async()=>{button.disabled=true;stage.replaceChildren();const countdown=document.createElement('strong');countdown.style.cssText='font-size:58px;color:'+tier.color;stage.append(countdown);for(let n=3;n>=1;n--){countdown.textContent=String(n);status.textContent='🎁 Abriendo Caja '+tier.name+' en '+n+'…';await new Promise(resolve=>setTimeout(resolve,1000));if(!stage.isConnected)return}playMysteryBoxSound(({Bronce:'bronze',Plata:'silver',Oro:'gold',Diamante:'diamond'})[tier.name]);stage.replaceChildren();const center=document.createElement('span');center.textContent=tier.emoji;center.style.cssText='font-size:70px;display:block;transition:transform .9s ease,opacity .9s ease';stage.append(center);status.textContent='Abriendo Caja '+tier.name+'…';for(let k=0;k<20;k++){const p=document.createElement('span');p.textContent=tier.particle;p.style.cssText='position:absolute;left:50%;top:50%;color:'+tier.color+';font-size:'+(15+k%4*5)+'px;transition:transform 1s ease-out,opacity 1s ease-out';stage.append(p);requestAnimationFrame(()=>{const angle=k*Math.PI/10;p.style.transform='translate('+Math.round(Math.cos(angle)*125)+'px,'+Math.round(Math.sin(angle)*53)+'px) rotate('+(k*30)+'deg)';p.style.opacity='0'})}requestAnimationFrame(()=>{center.style.transform='scale(1.5) rotate(12deg)';center.style.opacity='.3'});setTimeout(()=>{status.textContent='🎉 ¡Caja '+tier.name+' abierta!';button.disabled=false;showMysteryBoxCelebration(tier.name,({Bronce:'bronze',Plata:'silver',Oro:'gold',Diamante:'diamond'})[tier.name],true)},1100)};preview.append(title,button,stage,status);previews.append(preview)}root.append(previews);
 const [tiers,rewards,items]=await Promise.all([sb.from('surprise_box_tiers').select('*'),sb.from('surprise_box_rewards').select('tier,item_id'),sb.rpc('admin_shop_items')]);
 if([tiers,rewards,items].some(x=>x.error)){root.append(document.createTextNode('No se pudo cargar la configuración de las cajas.'));return}
 for(const tier of tiers.data||[]){
  const form=document.createElement('form');form.style.cssText='padding:14px;margin:12px 0;border:1px solid #ffffff33;border-radius:12px';const title=document.createElement('h3');title.textContent=tier.name;form.append(title);
  const priceLabel=document.createElement('label');priceLabel.textContent='Precio en puntos ';const price=document.createElement('input');price.type='number';price.min='1';price.max='100000';price.required=true;price.value=tier.price;priceLabel.append(price);form.append(priceLabel);
  const activeLabel=document.createElement('label');const active=document.createElement('input');active.type='checkbox';active.checked=tier.active;activeLabel.append(active,document.createTextNode(' Caja activa'));form.append(activeLabel);
  const prizeTitle=document.createElement('p');prizeTitle.textContent='Selecciona los premios posibles:';form.append(prizeTitle);
  const checks=[];for(const item of items.data||[]){const label=document.createElement('label');label.style.cssText='display:block;margin:6px 0';const check=document.createElement('input');check.type='checkbox';check.checked=(rewards.data||[]).some(x=>x.tier===tier.tier&&x.item_id===item.id);label.append(check,document.createTextNode(' '+item.name));form.append(label);checks.push([item.id,check])}
  const save=document.createElement('button');save.type='submit';save.className='gradient-btn mini';save.textContent='Guardar '+tier.name;const status=document.createElement('p');status.setAttribute('role','status');form.append(save,status);
  form.onsubmit=async e=>{e.preventDefault();const selected=checks.filter(x=>x[1].checked).map(x=>x[0]);if(!selected.length){status.textContent='Selecciona al menos un premio.';return}save.disabled=true;const {error}=await sb.rpc('admin_save_surprise_box',{p_tier:tier.tier,p_price:Number(price.value),p_active:active.checked,p_items:selected});status.textContent=error?'Error: '+error.message:'✓ Caja guardada';save.disabled=false};root.append(form)
 }
}
const previousAdminInitRewardShop=adminInitRewardShop;
adminInitRewardShop=async function(){await previousAdminInitRewardShop();await adminInitSurpriseBoxes()};
