/* Etiquetas compartidas de grupos en los perfiles; siempre respeta las políticas de lectura de Supabase. */
(() => {
 'use strict';
 const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const visited = new WeakSet();
 let queued = false;
 const stillViewing = (anchor,id,own) => {
  if (!anchor.isConnected) return false;
  if (own) return location.hash.split('?')[0] === '#/cuenta';
  return location.hash.split('?')[0] === '#/perfil'
    && new URLSearchParams(location.hash.split('?')[1] || '').get('id') === id;
 };
 async function render(anchor,id,own) {
  if (!stillViewing(anchor,id,own) || !UUID.test(id)) return;
  const panel = document.createElement('div');
  panel.className = 'sb-profile-group-labels';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label',own?'Mis etiquetas de miembro':'Etiquetas de miembro compartidas');
  panel.hidden = !own;
  const heading = document.createElement('h3');
  heading.textContent = own ? '🏷️ Mis etiquetas de miembro' : '🏷️ Etiquetas de sus grupos';
  const note = document.createElement('p');
  note.textContent = 'Solo se ven las etiquetas de los grupos que compartes con esta persona.';
  const list = document.createElement('ul');
  panel.append(heading,note,list);
  if (own) anchor.append(panel);
  else {
   const name=anchor.querySelector(':scope > h1');
   if (name) name.after(panel);
   else anchor.prepend(panel);
  }
  const {data,error} = await sb.from('member_chat_group_labels')
   .select('group_id,label,color,emoji,style').eq('user_id',id).neq('label','')
   .order('updated_at',{ascending:false}).limit(30);
  if (!stillViewing(anchor,id,own)) return;
  if (error) {
   if (own) {note.textContent = 'No se pudieron cargar tus etiquetas. Prueba a actualizar la página.';panel.hidden=false;}
   else panel.remove();
   return;
  }
  const groupIds = [...new Set((data||[]).map(row=>row.group_id))];
  const groups = groupIds.length
   ? await sb.from('member_chat_groups').select('id,name').in('id',groupIds)
   : {data:[],error:null};
  if (!stillViewing(anchor,id,own)) return;
  const groupNames = new Map((groups.data||[]).map(row=>[row.id,row.name]));
  const rows = (data||[]).filter(row=>row.label && groupNames.has(row.group_id));
  if (!rows.length) {
   if (own) note.textContent = 'Todavía no tienes etiquetas. Entra en Mensajes, abre un grupo y pulsa «Añadir etiqueta de miembro».';
   else panel.remove();
   return;
  }
  const createBadge = window.sbGroupMemberTagBadge;
  for (const row of rows) {
   const line = document.createElement('li');
   const group = document.createElement('strong');
   group.textContent = groupNames.get(row.group_id);
   const badge = typeof createBadge==='function' ? createBadge(row) : null;
   line.append(group);
   if (badge) line.append(badge);
   list.append(line);
  }
  panel.hidden = false;
 }
 function scan() {
  const route = location.hash.split('?')[0];
  if (route === '#/perfil') {
   const anchor=document.querySelector('#public-member-profile .public-member-body');
   const id=new URLSearchParams(location.hash.split('?')[1] || '').get('id');
   if (anchor && UUID.test(id||'') && !visited.has(anchor)) {
    visited.add(anchor);
    void render(anchor,id,false).catch(error=>console.warn('Etiquetas de perfil:',error));
   }
  }
  if (route === '#/cuenta') {
   const anchor=document.querySelector('#account-profile .profile-identity-copy');
   if (anchor && !visited.has(anchor)) {
    visited.add(anchor);
    void sb.auth.getSession().then(({data}) => {
     const id=data?.session?.user?.id;
     if (id) return render(anchor,id,true);
    }).catch(error=>console.warn('Etiquetas de cuenta:',error));
   }
  }
 }
 function schedule() {
  if (queued) return;
  queued=true;
  queueMicrotask(()=>{queued=false;scan();});
 }
 const app=document.getElementById('app');
 if (app) {
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
})();