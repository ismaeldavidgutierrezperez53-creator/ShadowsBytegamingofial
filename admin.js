// Panel de administración de Shadows Byte Gaming Official V2.
// Los permisos reales se verifican mediante RLS en Supabase.
const adminModels = {
 news: {label:'Noticias', fields:{title:'Título',slug:'Slug',excerpt:'Resumen',content:'Contenido',cover_url:'URL de portada',status:'Estado',published_at:'Fecha de publicación'},options:{status:['draft','published']}},
 billboard: {label:'Cartelera',fields:{title:'Título',description:'Descripción',category:'Categoría',image_url:'URL de imagen',destination_url:'URL de destino',starts_at:'Inicio',ends_at:'Fin',status:'Estado',sort_order:'Orden'},options:{category:['gaming','anime','event','stream','other'],status:['draft','published']}},
 events: {label:'Eventos',fields:{title:'Título',description:'Descripción',image_url:'URL de imagen',location:'Ubicación',starts_at:'Inicio',ends_at:'Fin',status:'Estado'},options:{status:['draft','published','cancelled']}}
};
let adminTable='news', adminItems=[];
function adminMessage(message){const node=document.getElementById('admin-message');if(node)node.textContent=message;}
function adminField(name,value,model){
 const id='admin-'+name, label=model.fields[name], options=model.options?.[name];
 const val=value==null?'':String(value);
 const input=options?'<select id="'+id+'" name="'+name+'">'+options.map(x=>'<option value="'+x+'" '+(x===val?'selected':'')+'>'+x+'</option>').join('')+'</select>':
 (name==='content'||name==='description'||name==='excerpt'?'<textarea id="'+id+'" name="'+name+'" rows="4">'+escapeHTML(val)+'</textarea>':
 '<input id="'+id+'" name="'+name+'" '+(name==='title'?'required':'')+' value="'+escapeHTML(val)+'" />');
 return '<label for="'+id+'">'+label+'</label>'+input;
}
function adminForm(item={}){
 const root=document.getElementById('admin-form-root');if(!root)return;
 const model=adminModels[adminTable];
 root.innerHTML='<h3>'+(item.id?'Editar':'Crear')+' — '+model.label+'</h3><form id="admin-editor">'+Object.keys(model.fields).map(k=>adminField(k,item[k]??(k==='status'?'draft':''),model)).join('')+'<button type="submit" class="gradient-btn">Guardar</button> <button type="button" id="admin-cancel">Cancelar</button></form>';
 document.getElementById('admin-cancel').onclick=()=>root.replaceChildren();
 document.getElementById('admin-editor').onsubmit=async event=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget).entries());
  for(const field of ['starts_at','ends_at','published_at'])if(field in data)data[field]=data[field].trim()||null;
  if(adminTable==='billboard')data.sort_order=Number(data.sort_order)||0;
  if(adminTable==='news'){
   if(!data.slug.trim()){adminMessage('El slug es obligatorio.');return;}
   if(data.status==='published'&&!data.published_at)data.published_at=new Date().toISOString();
  }
  if(adminTable==='events'&&data.status==='published'&&!data.starts_at){adminMessage('Indica una fecha de inicio antes de publicar el evento.');return;}
  const query=item.id?sb.from(adminTable).update(data).eq('id',item.id).select():sb.from(adminTable).insert(data).select();
  const {data:rows,error}=await query;
  if(error){adminMessage('No se pudo guardar: '+error.message);return;}
  if(!rows?.length){adminMessage('No se confirmó el guardado. Revisa los permisos.');return;}
  root.replaceChildren();adminMessage('Contenido guardado correctamente.');await adminLoad();
 };
}
async function adminLoad(){
 const root=document.getElementById('admin-list');if(!root)return;
 root.textContent='Cargando…';
 const {data,error}=await sb.from(adminTable).select('*').order('created_at',{ascending:false}).limit(100);
 if(error){root.textContent='Error: '+error.message;return;}
 adminItems=data||[];
 root.innerHTML=adminItems.length?adminItems.map((x,i)=>'<div class="auth-card"><strong>'+escapeHTML(x.title)+'</strong> <span>('+escapeHTML(x.status)+')</span><div><button type="button" data-action="edit" data-index="'+i+'">Editar</button> <button type="button" data-action="delete" data-index="'+i+'">Eliminar</button></div></div>').join(''):'<p>No hay elementos todavía.</p>';
 root.querySelectorAll('button').forEach(button=>button.onclick=async()=>{
  const item=adminItems[Number(button.dataset.index)];
  if(button.dataset.action==='edit'){adminForm(item);return;}
  if(!confirm('¿Eliminar definitivamente «'+item.title+'»?'))return;
  const {data:deleted,error}=await sb.from(adminTable).delete().eq('id',item.id).select();
  if(error||!deleted?.length){adminMessage('No se pudo eliminar: '+(error?.message||'Operación no confirmada'));return;}
  adminMessage('Elemento eliminado.');await adminLoad();
 });
}
async function initAdmin(){
 const root=document.getElementById('admin-root');if(!root)return;
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user){root.innerHTML='<p>Debes iniciar sesión.</p><a href="#/auth">Entrar</a>';return;}
 if(user.app_metadata?.role!=='admin'){root.textContent='No tienes permisos de administrador. Cierra sesión y vuelve a entrar si acabas de recibir el rol.';return;}
 root.innerHTML='<p>Sesión de administración: '+escapeHTML(user.email)+'</p><div class="pills" id="admin-tabs"></div><button class="gradient-btn mini" id="admin-new" type="button">+ Crear contenido</button><p id="admin-message" role="status"></p><div id="admin-form-root"></div><div id="admin-list"></div>';
 const tabs=document.getElementById('admin-tabs');
 for(const [table,model] of Object.entries(adminModels)){
  const button=document.createElement('button');button.textContent=model.label;button.onclick=()=>{adminTable=table;document.getElementById('admin-form-root').replaceChildren();adminLoad();};tabs.append(button);
 }
 document.getElementById('admin-new').onclick=()=>adminForm();
 await adminLoad();
}
