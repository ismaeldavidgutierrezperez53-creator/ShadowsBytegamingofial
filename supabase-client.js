// Shadows Byte Gaming Official V2 — public browser client
const SUPABASE_URL = 'https://nutoxlbdotcllwlshhhr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2Jdko8NdnlP8p_5YaArHaA_DzFN6iVE';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function getPublished(table, order='created_at') {
 const {data,error} = await sb.from(table).select('*').order(order,{ascending:false}).limit(30);
 if(error) { console.error(table,error); return []; }
 return data || [];
}
function newsCards(items) {
 return items.length ? '<div class="content-grid">'+items.map(n=>'<article class="auth-card"><h3>'+escapeHTML(n.title)+'</h3><p>'+escapeHTML(n.excerpt||'')+'</p><p>'+escapeHTML(n.content||'')+'</p></article>').join('')+'</div>' : '<div class="empty">Aún no hay noticias publicadas</div>';
}
function billboardCards(items) {
 return items.length ? '<div class="content-grid">'+items.map(b=>'<article class="auth-card"><h3>'+escapeHTML(b.title)+'</h3><p>'+escapeHTML(b.description||'')+'</p></article>').join('')+'</div>' : '<div class="empty">No hay elementos en la cartelera todavía</div>';
}

function eventCards(items){
 return items.length?'<div class="content-grid">'+items.map(e=>'<article class="auth-card"><h3>'+escapeHTML(e.title)+'</h3><p>'+escapeHTML(e.description||'')+'</p>'+(e.starts_at?'<p>📅 '+escapeHTML(new Date(e.starts_at).toLocaleString('es-ES'))+'</p>':'')+(e.location?'<p>📍 '+escapeHTML(e.location)+'</p>':'')+'</article>').join('')+'</div>':'<div class="empty">Aún no hay eventos publicados</div>';
}

async function loadDynamicContent(path) {
 if(path==='/' || path==='/noticias') {
  const news=await getPublished('news','published_at');
  const target=document.getElementById('live-news');
  if(target)target.innerHTML=newsCards(news);
 }
 if(path==='/' || path==='/cartelera') {
  const billboard=await getPublished('billboard','sort_order');
  const target=document.getElementById('live-billboard');
  if(target)target.innerHTML=billboardCards(billboard);
 }
 if(path==='/eventos') {
  const events=await getPublished('events','starts_at');
  const target=document.getElementById('live-events');
  if(target)target.innerHTML=eventCards(events);
 }
 if(path==='/admin') {
  await initAdmin();
 }
}
async function submitAuth(event) {
 event.preventDefault();
 const form=event.currentTarget;
 const email=form.elements.email.value.trim();
 const password=form.elements.password.value;
 const signup=location.hash.includes('mode=signup');
 const result=signup?await sb.auth.signUp({email,password,options:{emailRedirectTo:RECOVERY_REDIRECT}}):await sb.auth.signInWithPassword({email,password});
 const message=document.getElementById('auth-message');
 if(result.error){message.textContent=result.error.message;return;}
 message.textContent=signup?'Registro recibido. Revisa tu correo si se requiere confirmación.':'Sesión iniciada correctamente.';
 if(!signup) { await refreshAccountActions(); location.hash = result.data.user?.app_metadata?.role === 'admin' ? '#/admin' : '#/'; }
}
async function resendConfirmationEmail(){
 const email=document.getElementById('email')?.value.trim();
 const target=document.getElementById('resend-message');
 const button=document.getElementById('resend-confirmation');
 if(!target||!button)return;
 if(!email||!document.getElementById('email').checkValidity()){
  target.textContent='Introduce primero una dirección de correo válida.';
  document.getElementById('email')?.focus();return;
 }
 button.disabled=true;target.textContent='Solicitando nuevo correo…';
 try{
  const {error}=await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:RECOVERY_REDIRECT}});
  target.textContent=error?'No se pudo reenviar: '+error.message:'Si la cuenta está pendiente de confirmación, recibirás un nuevo correo. Revisa también spam.';
 }catch(error){target.textContent='No se pudo reenviar: '+error.message;}
 finally{button.disabled=false;}
}
async function logout(){await sb.auth.signOut();await refreshAccountActions();location.hash='#/auth';}

const RECOVERY_REDIRECT='https://ismaeldavidgutierrezperez53-creator.github.io/ShadowsBytegamingofial/';
async function requestPasswordReset(event){
 event.preventDefault();
 const email=event.currentTarget.elements.email.value.trim();
 const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_REDIRECT});
 const target=document.getElementById('recovery-message');
 if(target)target.textContent=error?'No se pudo enviar el enlace: '+error.message:'Si la cuenta existe, recibirás un correo con un enlace para cambiar la contraseña. Revisa también spam.';
}
async function saveNewPassword(event){
 event.preventDefault();
 const password=event.currentTarget.elements.password.value;
 const target=document.getElementById('reset-message');
 const {error}=await sb.auth.updateUser({password});
 if(target)target.textContent=error?'No se pudo actualizar: '+error.message:'Contraseña actualizada. Ya puedes entrar al panel de administración.';
 if(!error) setTimeout(()=>{location.hash='#/admin';},1000);
}
// Supabase recibe el enlace de recuperación antes de que el router muestre el formulario.
sb.auth.onAuthStateChange((event)=>{
 if(event==='PASSWORD_RECOVERY')setTimeout(()=>{location.hash='#/reset-password';},0);
});

// Keep the account controls synchronized with the persisted Supabase session.
async function refreshAccountActions() {
 const actions=document.getElementById('account-actions');
 if(!actions)return;
 const {data:{session},error}=await sb.auth.getSession();
 if(error)console.warn('No se pudo comprobar la sesión:',error.message);
 const user=session?.user;
 syncNotificationRealtime(user?.id||null);
 const hero=document.getElementById('hero-account-actions');
 if(hero)hero.innerHTML=user?'<a class="gradient-btn" href="#/cuenta">Mi cuenta</a>'+(user.app_metadata?.role==='admin'?'<a class="outline-btn" href="#/admin">Panel de administración</a>':'<a class="outline-btn" href="#/comunidad">Explorar comunidad</a>'):'<a class="gradient-btn" href="#/auth?mode=signup">Únete gratis</a><a class="outline-btn" href="#/auth">Iniciar sesión</a>';
 const search='<label class="search"><span>⌕</span><input aria-label="Buscar en la web" placeholder="Buscar…" /></label>';
 if(!user){
  actions.innerHTML=search+'<a href="#/auth">Entrar</a><a class="gradient-btn mini" href="#/auth?mode=signup">Registrarse</a>';
  return;
 }
 const admin=user.app_metadata?.role==='admin';
 actions.innerHTML=search+'<a href="#/cuenta">Mi cuenta</a><a href="#/mensajes" class="messages-header-link">💬 Mensajes</a><div class="notification-menu"><button type="button" id="notification-bell" class="notification-bell" aria-label="Abrir notificaciones" aria-expanded="false" aria-controls="notification-popover">🔔<span id="notification-count" class="notification-count" hidden></span></button><div id="notification-popover" class="notification-popover" hidden><strong>🔔 Notificaciones</strong><button type="button" id="notification-mark-all">Marcar todas como leídas</button><button type="button" id="notification-close">✕</button><div id="notification-preview">Cargando…</div><a href="#/notificaciones">Ver todas las notificaciones</a></div></div>'+(admin?'<a class="gradient-btn mini" href="#/admin">Administración</a>':'')+'<button type="button" id="account-logout" class="gradient-btn mini">Cerrar sesión</button>';
 document.getElementById('account-logout').addEventListener('click',logout);
 setupNotificationPopover(user.id);
 refreshNotificationBadge(user.id);
}
async function markAllMemberNotifications(userId,button){
 if(!userId||!button||button.disabled)return;
 button.disabled=true;const original=button.textContent;button.textContent='Marcando…';
 const {error}=await sb.from('member_notifications').update({is_read:true}).eq('recipient_id',userId).eq('is_read',false);
 if(error){button.textContent='Error. Reintentar';button.disabled=false;console.warn('No se pudieron marcar las notificaciones:',error.message);return;}
 button.textContent='Todas leídas';
 await refreshNotificationBadge(userId);
 if(document.getElementById('notification-popover')?.hidden===false)await loadNotificationPreview(userId);
 if(document.getElementById('member-notifications'))await loadMemberNotifications();
 if(button.isConnected){button.textContent=original;button.disabled=false;}
}
let notificationPopoverOutside=null;
function setupNotificationPopover(userId){
 const bell=document.getElementById('notification-bell'),panel=document.getElementById('notification-popover');
 if(!bell||!panel)return;
 if(notificationPopoverOutside)document.removeEventListener('click',notificationPopoverOutside);
 const close=()=>{panel.hidden=true;bell.setAttribute('aria-expanded','false');};
 bell.onclick=()=>{panel.hidden=!panel.hidden;bell.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)loadNotificationPreview(userId);};
 document.getElementById('notification-close').onclick=close;
 document.getElementById('notification-mark-all').onclick=()=>markAllMemberNotifications(userId,document.getElementById('notification-mark-all'));
 panel.querySelector('a').onclick=close;
 notificationPopoverOutside=e=>{if(!bell.parentElement.contains(e.target))close();};
 document.addEventListener('click',notificationPopoverOutside);
}
async function loadNotificationPreview(userId){
 const root=document.getElementById('notification-preview');if(!root||!userId)return;
 const {data,error}=await sb.from('member_notifications').select('id,actor_id,kind,post_id,is_read,created_at').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(8);
 if(!root.isConnected)return;root.replaceChildren();
 if(error){root.textContent='No se pudieron cargar las notificaciones.';return;}
 if(!data?.length){root.textContent='Todavía no tienes notificaciones.';return;}
 const ids=[...new Set(data.map(n=>n.actor_id))],postIds=[...new Set(data.map(n=>n.post_id).filter(Boolean))];
 const [{data:profiles},{data:posts}]=await Promise.all([sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true),postIds.length?sb.from('member_posts').select('id,image_path').in('id',postIds):Promise.resolve({data:[]})]);
 if(!root.isConnected)return;
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Un miembro']));
 const photos=new Set((posts||[]).filter(p=>p.image_path).map(p=>p.id));
 for(const n of data){
  const item=document.createElement('div');item.className='notification-preview-item'+(n.is_read?'':' unread');if(n.kind==='follow')item.dataset.followActor=n.actor_id;
  const message=document.createElement('p');const photo=photos.has(n.post_id);
  message.textContent=(names.get(n.actor_id)||'Un miembro')+(n.kind==='follow'?' empezó a seguirte.':n.kind==='like'?(photo?' dio Me gusta a tu fotografía.':' dio Me gusta a tu publicación.'):(photo?' comentó tu fotografía.':' comentó tu publicación.'));
  const date=document.createElement('small');date.textContent=new Date(n.created_at).toLocaleString('es-ES');item.append(message,date);
  if(!n.is_read){const mark=document.createElement('button');mark.type='button';mark.textContent='Marcar como leída';mark.onclick=async()=>{mark.disabled=true;const {error:err}=await sb.from('member_notifications').update({is_read:true}).eq('id',n.id).eq('recipient_id',userId);if(err){mark.disabled=false;mark.textContent='Error al marcar';}else{item.classList.remove('unread');mark.remove();refreshNotificationBadge(userId);if(document.getElementById('member-notifications'))loadMemberNotifications();}};item.append(mark);}
  root.append(item);
 }
 await appendFollowBackActions(root,data,userId);
}
let notificationRealtimeChannel=null;
let notificationRealtimeUserId=null;
function syncNotificationRealtime(userId){
 if(notificationRealtimeUserId===userId&&notificationRealtimeChannel)return;
 if(notificationRealtimeChannel){sb.removeChannel(notificationRealtimeChannel);notificationRealtimeChannel=null;}
 notificationRealtimeUserId=userId||null;
 if(!userId)return;
 notificationRealtimeChannel=sb.channel('member-notifications-'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_notifications',filter:'recipient_id=eq.'+userId},()=>{
   refreshNotificationBadge(userId);
   if(document.getElementById('notification-popover')?.hidden===false)loadNotificationPreview(userId);
   if(document.getElementById('member-notifications'))loadMemberNotifications();
  })
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'member_notifications',filter:'recipient_id=eq.'+userId},()=>{
   refreshNotificationBadge(userId);
   if(document.getElementById('notification-popover')?.hidden===false)loadNotificationPreview(userId);
   if(document.getElementById('member-notifications'))loadMemberNotifications();
  })
  .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('No se pudo conectar el canal de notificaciones en tiempo real.');});
}
sb.auth.onAuthStateChange(()=>{setTimeout(refreshAccountActions,0);});
refreshAccountActions();

async function loadAccountFollows(userId,root){
 if(!root?.isConnected)return;
 root.innerHTML='<h3>👥 Seguidores y Siguiendo</h3><p>Consulta las personas que te siguen y las cuentas a las que sigues.</p>';
 const content=document.createElement('div');content.className='account-follows-content';content.textContent='Cargando miembros…';root.append(content);
 const [{data:followers,error:followersError},{data:following,error:followingError}]=await Promise.all([
  sb.from('member_follows').select('follower_id').eq('following_id',userId).order('created_at',{ascending:false}).limit(100),
  sb.from('member_follows').select('following_id').eq('follower_id',userId).order('created_at',{ascending:false}).limit(100)
 ]);
 if(!root.isConnected)return;
 content.replaceChildren();
 if(followersError||followingError){content.textContent='No se pudieron cargar los seguidores. Inténtalo de nuevo.';return;}
 const ids=[...new Set([...(followers||[]).map(x=>x.follower_id),...(following||[]).map(x=>x.following_id)])];
 const {data:profiles,error:profilesError}=ids.length?await sb.from('profiles').select('id,display_name,username,avatar_url,is_public').in('id',ids):{data:[],error:null};
 if(!root.isConnected)return;
 if(profilesError){content.textContent='No se pudieron cargar los perfiles.';return;}
 const names=new Map((profiles||[]).map(p=>[p.id,p]));
 const sections=[{title:'Seguidores',ids:(followers||[]).map(x=>x.follower_id)},{title:'Siguiendo',ids:(following||[]).map(x=>x.following_id)}];
 for(const section of sections){
  const area=document.createElement('section');area.className='account-follows-list';
  const title=document.createElement('h4');title.textContent=section.title+' ('+section.ids.length+')';area.append(title);
  if(!section.ids.length){const empty=document.createElement('p');empty.textContent=section.title==='Seguidores'?'Todavía no tienes seguidores.':'Todavía no sigues a nadie.';area.append(empty);}
  for(const id of section.ids){
   const p=names.get(id);const row=document.createElement('div');row.className='account-follow-member';
   if(p?.avatar_url&&/^https:\/\//i.test(p.avatar_url)){const img=document.createElement('img');img.src=p.avatar_url;img.alt='';img.loading='lazy';row.append(img);}
   const name=document.createElement('span');name.textContent=p?.display_name||p?.username||'Miembro';row.append(name);
   if(p?.is_public){const link=document.createElement('a');link.href='#/perfil?id='+encodeURIComponent(id);link.className='outline-btn mini';link.textContent='Ver perfil';row.append(link);}
   else{const privateLabel=document.createElement('small');privateLabel.textContent='Perfil privado';row.append(privateLabel);}
   area.append(row);
  }
  content.append(area);
 }
}
async function loadAccountProfile(){
 const root=document.getElementById('account-profile');if(!root)return;
 const {data:{user},error}=await sb.auth.getUser();
 if(!root.isConnected)return;
 if(error||!user){root.innerHTML='<p>Inicia sesión para ver tu perfil.</p><a class="gradient-btn mini" href="#/auth">Iniciar sesión</a>';return;}
 const meta=user.user_metadata||{};
 const avatar=typeof meta.avatar_url==='string'&&/^https:\/\//i.test(meta.avatar_url)?meta.avatar_url:'';
 const name=meta.display_name||meta.full_name||'Mi perfil';
 root.innerHTML='<div class="profile-cover"><span>SHADOWS BYTE / PERFIL</span><span class="profile-cover-mark">SB</span></div><div class="profile-body"><div class="profile-identity"><div id="profile-avatar" class="profile-avatar"></div><div class="profile-identity-copy"><div class="profile-kicker">CUENTA PERSONAL</div><h2 id="profile-heading"></h2><p id="profile-email"></p><span class="profile-role">'+(user.app_metadata?.role==='admin'?'★ Administrador':'● Miembro')+'</span></div></div><div class="profile-grid"><section class="profile-panel"><h3>✦ Editar perfil</h3><p>Personaliza cómo apareces en Shadows Byte Gaming.</p><form id="profile-form"><label for="profile-name">Nombre de usuario</label><input id="profile-name" name="display_name" maxlength="60" required autocomplete="nickname" placeholder="Tu nombre"><label for="profile-avatar-url">Imagen de perfil (URL HTTPS)</label><input id="profile-avatar-url" name="avatar_url" type="url" placeholder="https://ejemplo.com/avatar.jpg"><button class="gradient-btn" type="submit">Guardar cambios</button><p id="profile-message" role="status" aria-live="polite"></p></form></section><section class="profile-panel"><h3>⚙ Ajustes de cuenta</h3><p>Información y seguridad de tu cuenta.</p><label for="profile-email-readonly">Correo electrónico</label><input id="profile-email-readonly" type="email" disabled><a class="profile-setting-link" href="#/forgot-password">🔒 Cambiar contraseña <span>→</span></a>'+(user.app_metadata?.role==='admin'?'<a class="profile-setting-link" href="#/admin">🛡 Panel de administración <span>→</span></a>':'')+'<button type="button" class="profile-signout" id="profile-signout">Cerrar sesión</button></section></div></div>';
 const communityPanel=document.createElement('section');
 communityPanel.className='profile-panel account-community-panel';
 communityPanel.setAttribute('aria-label','Mi comunidad');
 communityPanel.innerHTML='<h3>✦ Mi comunidad</h3><p>Publica novedades, responde comentarios y participa con otros miembros.</p><p class="account-community-links"><a class="outline-btn mini" href="#/comunidad">Ver muro de la comunidad</a> <a class="outline-btn mini" href="#/notificaciones">🔔 Mis notificaciones</a></p><div id="account-community-social" class="account-community-social">Cargando publicaciones…</div>';
 root.querySelector('.profile-body')?.append(communityPanel);
 const followPanel=document.createElement('section');followPanel.className='profile-panel account-follows-panel';followPanel.id='account-follows';communityPanel.before(followPanel);loadAccountFollows(user.id,followPanel);
 loadMemberSocial(user.id,communityPanel.querySelector('#account-community-social'));
 const ownGallery=document.createElement('section');ownGallery.className='profile-panel member-gallery-panel';ownGallery.id='account-gallery';
 communityPanel.before(ownGallery);
 loadMemberGallery(user.id,ownGallery);
 document.getElementById('profile-signout').addEventListener('click',logout);
 // Public member directory is opt-in; keep authentication email private.
 const {data:profile}=await sb.from('profiles').select('bio,is_public').eq('id',user.id).maybeSingle();
 const panel=document.querySelector('.profile-panel');
 if(panel){
  const extra=document.createElement('div');extra.className='profile-public-settings';
  extra.innerHTML='<label for="profile-bio">Presentación para la comunidad</label><textarea id="profile-bio" maxlength="280" rows="3" placeholder="Cuéntanos algo sobre ti..."></textarea><label class="profile-checkbox"><input type="checkbox" id="profile-public"> Mostrar mi perfil en Miembros</label><p class="profile-privacy">Solo se mostrarán tu nombre, avatar y presentación. Tu correo no será público.</p>';
  panel.querySelector('#profile-form').insertBefore(extra,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-bio').value=profile?.bio||'';
  document.getElementById('profile-public').checked=profile?.is_public===true;
 }

 const heading=document.getElementById('profile-heading'),email=document.getElementById('profile-email');
 heading.textContent=name;email.textContent=user.email||'';
 const form=document.getElementById('profile-form');
 form.elements.display_name.value=meta.display_name||meta.full_name||'';
 form.elements.avatar_url.value=avatar;
 document.getElementById('profile-email-readonly').value=user.email||'';
 const avatarNode=document.getElementById('profile-avatar');
 function paintAvatar(url,label){avatarNode.replaceChildren();if(url){const img=document.createElement('img');img.src=url;img.alt='Avatar';img.referrerPolicy='no-referrer';img.style.cssText='width:100%;height:100%;object-fit:cover';img.onerror=()=>{avatarNode.textContent=(label||'?').charAt(0).toUpperCase()};avatarNode.append(img)}else avatarNode.textContent=(label||'?').charAt(0).toUpperCase();}
 paintAvatar(avatar,name);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const display_name=form.elements.display_name.value.trim(),avatar_url=form.elements.avatar_url.value.trim();
  const status=document.getElementById('profile-message');
  if(!display_name){status.textContent='Introduce un nombre de usuario.';return;}
  if(avatar_url&&!/^https:\/\/[^\s]+$/i.test(avatar_url)){status.textContent='El avatar debe usar una URL HTTPS válida.';return;}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Guardando…';
  try{
   const {error}=await sb.auth.updateUser({data:{display_name,avatar_url}});
   if(!error){
    const bio=document.getElementById('profile-bio').value.trim();
    const is_public=document.getElementById('profile-public').checked;
    const payload={id:user.id,display_name,avatar_url:avatar_url||null,bio,is_public};
    const {data:existing, error:readError}=await sb.from('profiles').select('id').eq('id',user.id).maybeSingle();
    if(readError){status.textContent='No se pudo comprobar tu perfil: '+readError.message;return;}
    const request=existing
      ?sb.from('profiles').update(payload).eq('id',user.id).select('id,is_public')
      :sb.from('profiles').insert(payload).select('id,is_public');
    const {data:saved,error:profileError}=await request.single();
    if(profileError||!saved){status.textContent='No se pudo guardar el perfil de Miembros: '+(profileError?.message||'No se confirmó el guardado');return;}
    status.textContent=saved.is_public?'Perfil público guardado. Ya puedes verlo en Miembros.':'Perfil guardado como privado. Activa la casilla para aparecer en Miembros.';
   }
   if(error){status.textContent='No se pudo guardar: '+error.message;return;}
   heading.textContent=display_name;paintAvatar(avatar_url,display_name);
  }catch(err){status.textContent='No se pudo guardar: '+err.message}
  finally{button.disabled=false;}
 });
}

async function loadMembers(){
 const root=document.getElementById('members-list');if(!root)return;
 const {data,error}=await sb.from('profiles').select('id,display_name,username,avatar_url,bio,created_at').eq('is_public',true).order('created_at',{ascending:false}).limit(100);
 if(!root.isConnected)return;
 if(error){root.innerHTML='<div class="admin-empty">No se pudo cargar la lista de miembros.</div>';return;}
 const members=data||[];
 function draw(){
  const term=(document.getElementById('members-search')?.value||'').toLocaleLowerCase().trim();
  const filtered=members.filter(x=>(x.display_name||x.username||'').toLocaleLowerCase().includes(term));
  root.replaceChildren();
  if(!filtered.length){const empty=document.createElement('div');empty.className='admin-empty';empty.textContent=term?'No se encontraron miembros.':'Todavía no hay perfiles públicos. Puedes activar el tuyo desde Mi cuenta.';root.append(empty);return;}
  filtered.forEach(member=>{
   const card=document.createElement('article');card.className='member-card';
   const avatar=document.createElement('div');avatar.className='member-avatar';
   const name=member.display_name||member.username||'Miembro';
   if(typeof member.avatar_url==='string'&&/^https:\/\//i.test(member.avatar_url)){const img=document.createElement('img');img.src=member.avatar_url;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{avatar.textContent=name.charAt(0).toUpperCase()};avatar.append(img)}else avatar.textContent=name.charAt(0).toUpperCase();
   const heading=document.createElement('h2');heading.textContent=name;
   const bio=document.createElement('p');bio.textContent=member.bio||'Miembro de Shadows Byte Gaming Official';
   const link=document.createElement('a');link.className='gradient-btn mini member-view-link';link.href='#/perfil?id='+encodeURIComponent(member.id);link.textContent='Ver perfil';
   const messageLink=document.createElement('a');messageLink.className='outline-btn mini';messageLink.href='#/mensajes?id='+encodeURIComponent(member.id);messageLink.textContent='💬 Mensaje privado';card.append(avatar,heading,bio,link,messageLink);root.append(card);
  });
 }
 document.getElementById('members-search')?.addEventListener('input',draw);draw();
}

async function loadPublicMemberProfile(){
 const root=document.getElementById('public-member-profile');if(!root)return;
 const params=new URLSearchParams((location.hash.split('?')[1]||''));
 const id=params.get('id');
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
  root.innerHTML='<div class="admin-empty">Enlace de perfil no válido.</div><a class="outline-btn" href="#/miembros">Volver a Miembros</a>';return;
 }
 const {data:member,error}=await sb.from('profiles').select('id,display_name,username,avatar_url,bio,created_at').eq('id',id).eq('is_public',true).maybeSingle();
 if(!root.isConnected||location.hash.split('?')[0]!=='#/perfil')return;
 root.replaceChildren();
 if(error||!member){root.innerHTML='<div class="admin-empty">Este perfil no está disponible o es privado.</div><a class="outline-btn" href="#/miembros">Volver a Miembros</a>';return;}
 const cover=document.createElement('div');cover.className='public-member-cover';cover.textContent='SHADOWS BYTE / COMUNIDAD';
 const content=document.createElement('div');content.className='public-member-body';
 const avatar=document.createElement('div');avatar.className='public-member-avatar';
 const name=member.display_name||member.username||'Miembro';
 if(typeof member.avatar_url==='string'&&/^https:\/\//i.test(member.avatar_url)){
  const img=document.createElement('img');img.src=member.avatar_url;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{avatar.replaceChildren(document.createTextNode(name.charAt(0).toUpperCase()))};avatar.append(img);
 }else avatar.textContent=name.charAt(0).toUpperCase();
 const title=document.createElement('h1');title.textContent=name;
 const badge=document.createElement('span');badge.className='profile-role';badge.textContent='● Miembro de la comunidad';
 const bioTitle=document.createElement('h2');bioTitle.textContent='Sobre mí';
 const bio=document.createElement('p');bio.className='public-member-bio';bio.textContent=member.bio||'Este miembro todavía no ha escrito una presentación.';
 const back=document.createElement('a');back.href='#/miembros';back.className='outline-btn';back.textContent='← Volver a Miembros';
 content.append(avatar,title,badge,bioTitle,bio);
 const social=document.createElement('section');social.className='member-social';social.id='member-social';
 const gallery=document.createElement('section');gallery.className='member-gallery-panel';gallery.id='member-gallery';
 const messageLink=document.createElement('a');
 messageLink.className='gradient-btn mini member-private-message-link';
 messageLink.href='#/mensajes?id='+encodeURIComponent(member.id);
 messageLink.textContent='💬 Enviar mensaje privado';
 messageLink.setAttribute('aria-label','Enviar mensaje privado a '+name);
 content.append(messageLink,gallery,social,back);root.append(cover,content);
 loadMemberGallery(member.id,gallery);
 await loadMemberSocial(member.id,social);
}

function openMemberGalleryLightbox(posts,startIndex){
 const images=posts.filter(post=>post.image_path);
 if(!images.length)return;
 document.querySelector('.member-lightbox')?.remove();
 const previousFocus=document.activeElement;
 const overlay=document.createElement('div');overlay.className='member-lightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Visor de imágenes');
 const panel=document.createElement('div');panel.className='member-lightbox-panel';
 const close=document.createElement('button');close.type='button';close.className='member-lightbox-close';close.textContent='✕';close.setAttribute('aria-label','Cerrar visor');
 const image=document.createElement('img');image.className='member-lightbox-image';image.alt='Imagen ampliada';
 const caption=document.createElement('p');caption.className='member-lightbox-caption';
 const counter=document.createElement('span');counter.className='member-lightbox-counter';
 const previous=document.createElement('button');previous.type='button';previous.className='member-lightbox-prev';previous.textContent='‹';previous.setAttribute('aria-label','Imagen anterior');
 const next=document.createElement('button');next.type='button';next.className='member-lightbox-next';next.textContent='›';next.setAttribute('aria-label','Imagen siguiente');
 let index=Math.max(0,Math.min(startIndex,images.length-1));
 const show=()=>{
  const post=images[index];
  image.src=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;
  image.alt=post.content?.trim().slice(0,110)||'Imagen ampliada de la comunidad';
  caption.textContent=post.content?.trim()||'Fotografía de la comunidad';
  counter.textContent=(index+1)+' / '+images.length;
  previous.disabled=next.disabled=images.length<2;
 };
 const onKey=event=>{
  if(event.key==='Escape'){event.preventDefault();dismiss();}
  else if(event.key==='ArrowLeft'){event.preventDefault();change(-1);}
  else if(event.key==='ArrowRight'){event.preventDefault();change(1);}
  else if(event.key==='Tab'){
   const controls=[close,previous,next].filter(button=>!button.disabled);
   const current=controls.indexOf(document.activeElement);
   if(event.shiftKey&&current<=0){event.preventDefault();controls[controls.length-1].focus();}
   else if(!event.shiftKey&&current===controls.length-1){event.preventDefault();controls[0].focus();}
  }
 };
 const dismiss=()=>{document.removeEventListener('keydown',onKey);overlay.remove();document.body.classList.remove('member-lightbox-open');if(previousFocus?.isConnected)previousFocus.focus();};
 const change=delta=>{index=(index+delta+images.length)%images.length;show();};
 close.onclick=dismiss;previous.onclick=()=>change(-1);next.onclick=()=>change(1);
 overlay.addEventListener('click',event=>{if(event.target===overlay)dismiss();});
 panel.append(close,image,previous,next,caption,counter);overlay.append(panel);document.body.append(overlay);
 document.body.classList.add('member-lightbox-open');document.addEventListener('keydown',onKey);show();close.focus();
}

async function renderGalleryComments(postId,root,viewerId,profileId){
 if(!root.isConnected)return;
 root.replaceChildren();
 const status=document.createElement('p');status.className='member-gallery-comment-status';status.setAttribute('role','status');root.append(status);
 const {data:comments,error}=await sb.from('member_comments').select('id,author_id,content,created_at').eq('post_id',postId).order('created_at',{ascending:true}).limit(100);
 if(!root.isConnected)return;
 if(error){status.textContent='No se pudieron cargar los comentarios.';return;}
 if(!(comments||[]).length)status.textContent='Todavía no hay comentarios.';
 else status.remove();
 for(const comment of comments){
  const item=document.createElement('div');item.className='member-gallery-comment';
  const author=document.createElement('a');author.href='#/perfil?id='+encodeURIComponent(comment.author_id);author.textContent=comment.author_id===profileId?'Autor del perfil':'Miembro';
  const body=document.createElement('p');body.textContent=comment.content;
  item.append(author,body);
  if(viewerId===comment.author_id){
   const remove=document.createElement('button');remove.type='button';remove.className='member-gallery-comment-delete';remove.textContent='Eliminar';
   remove.onclick=async()=>{if(!confirm('¿Eliminar tu comentario?'))return;remove.disabled=true;const {error:deleteError}=await sb.from('member_comments').delete().eq('id',comment.id).eq('author_id',viewerId);if(deleteError){status.textContent='No se pudo eliminar: '+deleteError.message;root.prepend(status);remove.disabled=false;}else await renderGalleryComments(postId,root,viewerId,profileId);};
   item.append(remove);
  }
  root.append(item);
 }
 if(viewerId){
  const form=document.createElement('form');form.className='member-gallery-comment-form';
  const input=document.createElement('textarea');input.maxLength=500;input.required=true;input.rows=2;input.placeholder='Escribe un comentario…';input.setAttribute('aria-label','Escribe un comentario');
  const submit=document.createElement('button');submit.type='submit';submit.className='outline-btn';submit.textContent='Comentar';
  form.append(input,submit);
  form.onsubmit=async event=>{event.preventDefault();const content=input.value.trim();if(!content)return;submit.disabled=true;const {error:insertError}=await sb.from('member_comments').insert({post_id:postId,author_id:viewerId,content});if(insertError){status.textContent='No se pudo comentar: '+insertError.message;root.prepend(status);submit.disabled=false;}else await renderGalleryComments(postId,root,viewerId,profileId);};
  root.append(form);
 }else{
  const hint=document.createElement('p');hint.className='member-gallery-comment-status';hint.textContent='Inicia sesión para comentar.';root.append(hint);
 }
}

async function loadMemberGallery(memberId,root){
 if(!root||!root.isConnected)return;
 root.replaceChildren();
 const heading=document.createElement('h2');heading.className='member-gallery-title';heading.textContent='🖼️ Galería de imágenes';
 const description=document.createElement('p');description.className='member-gallery-description';description.textContent='Fotos compartidas en las publicaciones de este miembro.';
 root.append(heading,description);
 const {data:posts,error}=await sb.from('member_posts').select('id,image_path,content,created_at,gallery_category').eq('author_id',memberId).not('image_path','is',null).order('created_at',{ascending:false}).limit(60);
 if(!root.isConnected)return;
 if(error){const msg=document.createElement('p');msg.className='member-gallery-empty';msg.textContent='No se pudo cargar la galería.';root.append(msg);return;}
 if(!posts?.length){const empty=document.createElement('p');empty.className='member-gallery-empty';empty.textContent='Todavía no hay imágenes publicadas.';root.append(empty);return;}
 const {data:{user:galleryUser}}=await sb.auth.getUser();
 const isOwner=galleryUser?.id===memberId;
 const albumOptions=['Todos','Gaming','Anime','Capturas','Otros'];
 const {data:coverRows, error:coverError}=await sb.from('member_album_covers').select('category,post_id').eq('owner_id',memberId);
 const covers=new Map((coverRows||[]).map(row=>[row.category,row.post_id]));
 const coverPanel=document.createElement('div');coverPanel.className='member-gallery-cover-grid';
 const renderCovers=()=>{
  coverPanel.replaceChildren();
  for(const album of albumOptions.slice(1)){
   const candidates=posts.filter(p=>p.image_path&&(p.gallery_category||'Otros')===album);
   const featured=candidates.find(p=>p.id===covers.get(album))||candidates[0];
   const card=document.createElement('button');card.type='button';card.className='member-gallery-cover-card';card.setAttribute('aria-label','Ver álbum '+album);
   if(featured){const photo=document.createElement('img');photo.loading='lazy';photo.alt='Portada del álbum '+album;photo.src=sb.storage.from('community-images').getPublicUrl(featured.image_path).data.publicUrl;card.append(photo);}
   else{const placeholder=document.createElement('span');placeholder.className='member-gallery-cover-placeholder';placeholder.textContent='🖼️';card.append(placeholder);}
   const name=document.createElement('strong');name.textContent=album;const count=document.createElement('span');count.textContent=candidates.length+' fotos';card.append(name,count);
   card.onclick=()=>{activeAlbum=album;refresh();tabs.scrollIntoView({behavior:'smooth',block:'nearest'});};
   coverPanel.append(card);
  }
 };
 if(coverError){const note=document.createElement('p');note.className='member-gallery-empty';note.textContent='Las portadas personalizadas no están disponibles por el momento.';root.append(note);}
 root.append(coverPanel);

 const tabs=document.createElement('div');tabs.className='member-gallery-albums';tabs.setAttribute('aria-label','Filtrar álbum');
 let activeAlbum='Todos';
 const grid=document.createElement('div');grid.className='member-gallery-grid';
 const refresh=()=>{
  const filtered=posts.filter(p=>p.image_path&&(activeAlbum==='Todos'||(p.gallery_category||'Otros')===activeAlbum));
  grid.replaceChildren();
  for(const post of filtered)buildTile(post,filtered);
  if(!filtered.length){const empty=document.createElement('p');empty.className='member-gallery-empty';empty.textContent='Este álbum todavía no tiene fotografías.';grid.append(empty);}
  renderCovers();
  for(const button of tabs.children){const selected=button.dataset.album===activeAlbum;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));}
 };
 for(const album of albumOptions){const button=document.createElement('button');button.type='button';button.className='member-gallery-album';button.dataset.album=album;button.textContent=album+' ('+(album==='Todos'?posts.length:posts.filter(p=>(p.gallery_category||'Otros')===album).length)+')';button.onclick=()=>{activeAlbum=album;refresh();};tabs.append(button);}
 root.append(tabs);
 const buildTile=(post,visiblePosts)=>{

  const url=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;
  const link=document.createElement('a');link.className='member-gallery-item';link.href=url;link.title='Ampliar imagen en la galería';link.addEventListener('click',event=>{event.preventDefault();openMemberGalleryLightbox(visiblePosts,visiblePosts.findIndex(p=>p.id===post.id));});
  const image=document.createElement('img');image.src=url;image.alt=post.content?.trim().slice(0,110)||'Imagen de la comunidad';image.loading='lazy';
  const label=document.createElement('span');label.className='member-gallery-item-label';label.textContent=new Date(post.created_at).toLocaleDateString('es-ES');
  link.append(image,label);
  const tile=document.createElement('div');tile.className='member-gallery-tile';tile.append(link);
  const likeBox=document.createElement('div');likeBox.className='member-gallery-like';tile.append(likeBox);
  renderPostLikes(post.id,likeBox,galleryUser?.id||null);
  const commentDetails=document.createElement('details');commentDetails.className='member-gallery-comments';
  const commentSummary=document.createElement('summary');commentSummary.textContent='💬 Ver comentarios';
  const commentList=document.createElement('div');commentList.className='member-gallery-comment-list';
  commentDetails.append(commentSummary,commentList);
  commentDetails.addEventListener('toggle',()=>{if(commentDetails.open)renderGalleryComments(post.id,commentList,galleryUser?.id||null,memberId);});
  tile.append(commentDetails);
  if(isOwner){
   const albumSelect=document.createElement('select');albumSelect.className='member-gallery-select';albumSelect.setAttribute('aria-label','Cambiar álbum de fotografía');
   for(const album of albumOptions.slice(1)){const option=document.createElement('option');option.value=album;option.textContent=album;albumSelect.append(option);}
   albumSelect.value=post.gallery_category||'Otros';
   albumSelect.onchange=async()=>{albumSelect.disabled=true;const {error}=await sb.from('member_posts').update({gallery_category:albumSelect.value}).eq('id',post.id).eq('author_id',memberId);if(error){alert('No se pudo cambiar el álbum: '+error.message);albumSelect.disabled=false;}else await loadMemberGallery(memberId,root);};
   tile.append(albumSelect);
   const setCover=document.createElement('button');setCover.type='button';setCover.className='member-gallery-set-cover';
   const album=post.gallery_category||'Otros';
   setCover.textContent=covers.get(album)===post.id?'★ Portada actual':'☆ Usar como portada';
   setCover.disabled=covers.get(album)===post.id;
   setCover.onclick=async()=>{
    setCover.disabled=true;
    const {error}=await sb.from('member_album_covers').upsert({owner_id:memberId,category:album,post_id:post.id},{onConflict:'owner_id,category'});
    if(error){alert('No se pudo establecer la portada: '+error.message);setCover.disabled=false;return;}
    covers.set(album,post.id);refresh();
   };
   tile.append(setCover);
   const remove=document.createElement('button');remove.type='button';remove.className='member-gallery-delete';remove.textContent='🗑️ Eliminar';remove.setAttribute('aria-label','Eliminar fotografía y publicación');
   remove.addEventListener('click',async()=>{
    if(!confirm('¿Eliminar esta fotografía? También se eliminará su publicación y los comentarios. Esta acción no se puede deshacer.'))return;
    remove.disabled=true;remove.textContent='Eliminando…';
    const {error:deleteError}=await sb.from('member_posts').delete().eq('id',post.id).eq('author_id',memberId);
    if(deleteError){alert('No se pudo eliminar la publicación: '+deleteError.message);remove.disabled=false;remove.textContent='🗑️ Eliminar';return;}
    const {error:storageError}=await sb.storage.from('community-images').remove([post.image_path]);
    if(storageError)alert('Se eliminó la publicación, pero no se pudo borrar el archivo de imagen: '+storageError.message);
    await loadMemberGallery(memberId,root);
    const social=document.getElementById('account-community-social')||document.getElementById('member-social');
    if(social?.isConnected)loadMemberSocial(memberId,social);
   });
   tile.append(remove);
  }
  grid.append(tile);
 };
 root.append(grid);refresh();
}

async function loadMemberSocial(memberId,root){
 if(!root.isConnected)return;
 const {data:{user}}=await sb.auth.getUser();
 const me=user?.id||null;
 const [{data:follows,error:followError},{data:posts,error:postError}]=await Promise.all([
  sb.from('member_follows').select('follower_id').eq('following_id',memberId),
  sb.from('member_posts').select('id,author_id,content,image_path,created_at').eq('author_id',memberId).order('created_at',{ascending:false}).limit(50)
 ]);
 if(!root.isConnected)return;
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='Comunidad';
 const counter=document.createElement('p');counter.className='social-count';counter.textContent=followError?'Seguidores no disponibles':(follows||[]).length+' seguidores';
 root.append(heading,counter);
 const feedback=document.createElement('p');feedback.className='social-feedback';feedback.setAttribute('role','status');
 if(me&&me!==memberId){
  const following=(follows||[]).some(x=>x.follower_id===me);
  const followButton=document.createElement('button');followButton.className='gradient-btn mini';followButton.textContent=following?'Dejar de seguir':'Seguir';
  followButton.onclick=async()=>{
   followButton.disabled=true;
   const result=following?await sb.from('member_follows').delete().eq('following_id',memberId).eq('follower_id',me):await sb.from('member_follows').insert({follower_id:me,following_id:memberId});
   if(result.error){feedback.textContent='No se pudo actualizar: '+result.error.message;followButton.disabled=false;}
   else {await loadMemberSocial(memberId,root);const gallery=document.getElementById('account-gallery');if(gallery&&me===memberId)loadMemberGallery(memberId,gallery);}
  };root.append(followButton);
 }else if(!me){const hint=document.createElement('p');hint.textContent='Inicia sesión para seguir, publicar y comentar.';root.append(hint);}
 root.append(feedback);
 if(me===memberId){
  const form=document.createElement('form');form.className='social-form';
  const label=document.createElement('label');label.textContent='Nueva publicación';label.htmlFor='new-member-post';
  const textarea=document.createElement('textarea');textarea.id='new-member-post';textarea.maxLength=1000;textarea.placeholder='¿Qué quieres compartir con la comunidad?';
  const imageLabel=document.createElement('label');imageLabel.htmlFor='new-member-image';imageLabel.textContent='🖼️ Añadir imagen (opcional, máximo 5 MB)';
  const imageInput=document.createElement('input');imageInput.id='new-member-image';imageInput.type='file';imageInput.accept='image/jpeg,image/png,image/webp,image/gif';imageInput.className='social-image-input';
  const preview=document.createElement('img');preview.className='social-image-preview';preview.alt='Vista previa de la imagen';preview.hidden=true;
  let previewUrl=null;imageInput.onchange=()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;const file=imageInput.files?.[0];preview.hidden=!file;if(file){previewUrl=URL.createObjectURL(file);preview.src=previewUrl;}};
  const albumLabel=document.createElement('label');albumLabel.textContent='Álbum para la imagen';
  const albumSelect=document.createElement('select');albumSelect.className='social-album-select';for(const album of ['Gaming','Anime','Capturas','Otros']){const option=document.createElement('option');option.value=album;option.textContent=album;albumSelect.append(option);}albumSelect.value='Otros';albumLabel.append(albumSelect);
  const submit=document.createElement('button');submit.className='gradient-btn mini';submit.textContent='Publicar';
  form.append(label,textarea,imageLabel,imageInput,preview,albumLabel,submit);
  form.onsubmit=async e=>{
   e.preventDefault();const content=textarea.value.trim();const file=imageInput.files?.[0];if(!content&&!file){feedback.textContent='Escribe un mensaje o selecciona una imagen.';return;}
   const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
   if(file&&(!allowed[file.type]||file.size>5*1024*1024)){feedback.textContent='Usa una imagen JPG, PNG, WebP o GIF de hasta 5 MB.';return;}
   submit.disabled=true;feedback.textContent=file?'Subiendo imagen…':'Publicando…';let image_path=null;
   if(file){
    image_path=me+'/'+crypto.randomUUID()+'.'+allowed[file.type];
    const {error:uploadError}=await sb.storage.from('community-images').upload(image_path,file,{contentType:file.type,upsert:false});
    if(uploadError){feedback.textContent='No se pudo subir la imagen: '+uploadError.message;submit.disabled=false;return;}
   }
   const {error}=await sb.from('member_posts').insert({author_id:me,content,image_path,gallery_category:albumSelect.value});
   if(error){if(image_path)await sb.storage.from('community-images').remove([image_path]);feedback.textContent='No se pudo publicar: '+error.message;submit.disabled=false;}
   else {await loadMemberSocial(memberId,root);const gallery=document.getElementById('account-gallery');if(gallery&&me===memberId)loadMemberGallery(memberId,gallery);}
  };
  root.append(form);
 }
 const targetPostId=new URLSearchParams((location.hash.split('?')[1]||'')).get('post');
 if(targetPostId&&location.hash.split('?')[0]==='#/cuenta'&&me===memberId&&!((posts||[]).some(p=>p.id===targetPostId))){
  const {data:targetPost}=await sb.from('member_posts').select('id,author_id,content,image_path,created_at').eq('id',targetPostId).eq('author_id',memberId).maybeSingle();
  if(targetPost)posts.unshift(targetPost);
 }
 const title=document.createElement('h2');title.textContent='Publicaciones';root.append(title);
 if(postError){const err=document.createElement('p');err.textContent='No se pudieron cargar las publicaciones.';root.append(err);return;}
 if(!(posts||[]).length){const empty=document.createElement('p');empty.textContent='Todavía no hay publicaciones.';root.append(empty);}
 for(const post of posts||[]){
  const article=document.createElement('article');article.className='social-post';article.dataset.postId=post.id;
  const body=document.createElement('p');body.className='social-post-body';body.textContent=post.content;
  const date=document.createElement('small');date.textContent=new Date(post.created_at).toLocaleString('es-ES');
  article.append(body,date);
  if(post.image_path){const image=document.createElement('img');image.className='social-post-image';image.loading='lazy';image.alt='Imagen de la publicación';image.src=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;article.append(image);}
  const likeBox=document.createElement('div');likeBox.className='post-like-box';article.append(likeBox);
  renderPostLikes(post.id,likeBox,me);
  if(me===post.author_id){const remove=document.createElement('button');remove.className='social-delete';remove.textContent='Eliminar publicación';remove.onclick=async()=>{if(!confirm('¿Eliminar esta publicación y sus comentarios?'))return;const {error}=await sb.from('member_posts').delete().eq('id',post.id);if(error)feedback.textContent=error.message;else{if(post.image_path)await sb.storage.from('community-images').remove([post.image_path]);await loadMemberSocial(memberId,root);const gallery=document.getElementById(me===memberId&&location.hash.split('?')[0]==='#/cuenta'?'account-gallery':'member-gallery');if(gallery)loadMemberGallery(memberId,gallery);}};article.append(remove);}
  const commentTitle=document.createElement('h3');commentTitle.textContent='Comentarios';article.append(commentTitle);
  const list=document.createElement('div');list.className='social-comments';article.append(list);
  const {data:comments,error:commentError}=await sb.from('member_comments').select('id,author_id,content,created_at').eq('post_id',post.id).order('created_at',{ascending:true}).limit(100);
  if(commentError){list.textContent='No se pudieron cargar los comentarios.';}
  else for(const comment of comments||[]){
   const item=document.createElement('div');item.className='social-comment';
   const author=document.createElement('a');author.href='#/perfil?id='+encodeURIComponent(comment.author_id);
   author.textContent=comment.author_id===memberId?'Autor del perfil':'Miembro';
   const text=document.createElement('p');text.textContent=comment.content;
   item.append(author,text);
   if(me===comment.author_id){const del=document.createElement('button');del.className='social-delete';del.textContent='Eliminar';del.onclick=async()=>{const {error}=await sb.from('member_comments').delete().eq('id',comment.id);if(error)feedback.textContent=error.message;else await loadMemberSocial(memberId,root);};item.append(del);}
   list.append(item);
  }
  if(me){const form=document.createElement('form');form.className='social-form social-comment-form';const input=document.createElement('textarea');input.maxLength=500;input.required=true;input.placeholder='Escribe un comentario…';input.setAttribute('aria-label','Escribe un comentario');const submit=document.createElement('button');submit.className='outline-btn';submit.textContent='Comentar';form.append(input,submit);form.onsubmit=async e=>{e.preventDefault();const content=input.value.trim();if(!content)return;submit.disabled=true;const {error}=await sb.from('member_comments').insert({post_id:post.id,author_id:me,content});if(error){feedback.textContent='No se pudo comentar: '+error.message;submit.disabled=false;}else await loadMemberSocial(memberId,root);};article.append(form);}
  root.append(article);
 }
 if(targetPostId&&location.hash.split('?')[0]==='#/cuenta')focusNotificationPost(root,targetPostId);
}

async function renderPostLikes(postId,root,me){
 const {data,error}=await sb.from('member_likes').select('user_id').eq('post_id',postId);
 if(!root.isConnected)return;
 root.replaceChildren();
 if(error){root.textContent='Me gusta no disponible';return;}
 const liked=(data||[]).some(x=>x.user_id===me);
 const button=document.createElement('button');button.className='post-like-button';button.type='button';
 button.textContent=(liked?'❤️ Quitar Me gusta':'♡ Me gusta')+' · '+(data||[]).length;
 button.disabled=!me;button.title=me?'':'Inicia sesión para dar Me gusta';
 button.onclick=async()=>{button.disabled=true;const result=liked?await sb.from('member_likes').delete().eq('post_id',postId).eq('user_id',me):await sb.from('member_likes').insert({post_id:postId,user_id:me});if(result.error){button.textContent='Error: '+result.error.message;button.disabled=false;}else await renderPostLikes(postId,root,me);};
 root.append(button);
}
async function loadCommunityFeed(){
 const root=document.getElementById('community-feed');if(!root)return;
 const [{data:posts,error},{data:{user}}]=await Promise.all([sb.from('member_posts').select('id,author_id,content,image_path,created_at').order('created_at',{ascending:false}).limit(50),sb.auth.getUser()]);
 if(!root.isConnected)return;root.replaceChildren();
 if(error){root.textContent='No se pudo cargar el muro.';return;}
 if(!(posts||[]).length){root.textContent='Todavía no hay publicaciones públicas.';return;}
 const ids=[...new Set(posts.map(p=>p.author_id))];
 const {data:profiles}=await sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true);
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
 for(const post of posts){
  if(!names.has(post.author_id))continue;
  const article=document.createElement('article');article.className='social-post';
  const author=document.createElement('a');author.href='#/perfil?id='+encodeURIComponent(post.author_id);author.className='feed-author';author.textContent=names.get(post.author_id);
  const date=document.createElement('small');date.textContent=new Date(post.created_at).toLocaleString('es-ES');
  const content=document.createElement('p');content.className='social-post-body';content.textContent=post.content;
  const likes=document.createElement('div');likes.className='post-like-box';
  const profile=document.createElement('a');profile.href=author.href;profile.className='outline-btn mini';profile.textContent='Ver publicación y comentarios';
  article.append(author,date,content);
  if(post.image_path){const image=document.createElement('img');image.className='social-post-image';image.loading='lazy';image.alt='Imagen de la publicación';image.src=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;article.append(image);}
  article.append(likes,profile);root.append(article);
  renderPostLikes(post.id,likes,user?.id||null);
 }
 if(!root.children.length)root.textContent='Todavía no hay publicaciones públicas.';
}
async function appendFollowBackActions(root,notifications,userId){
 const actors=[...new Set(notifications.filter(n=>n.kind==='follow'&&n.actor_id&&n.actor_id!==userId).map(n=>n.actor_id))];
 if(!actors.length)return;
 const {data:following,error}=await sb.from('member_follows').select('following_id').eq('follower_id',userId).in('following_id',actors);
 if(error||!root.isConnected)return;
 const followed=new Set((following||[]).map(f=>f.following_id));
 for(const node of root.querySelectorAll('[data-follow-actor]')){
  const actor=node.dataset.followActor;if(!actors.includes(actor))continue;
  const btn=document.createElement('button');btn.type='button';btn.className='notification-follow-back';
  const setLabel=()=>{btn.textContent=followed.has(actor)?'✓ Siguiendo':'➕ Seguir de vuelta';};
  setLabel();
  btn.onclick=async()=>{
   btn.disabled=true;
   const already=followed.has(actor);
   const {error:followError}=already?await sb.from('member_follows').delete().eq('follower_id',userId).eq('following_id',actor):await sb.from('member_follows').insert({follower_id:userId,following_id:actor});
   if(followError){btn.textContent='No se pudo actualizar';btn.disabled=false;return;}
   if(already)followed.delete(actor);else followed.add(actor);
   setLabel();btn.disabled=false;
  };
  node.append(btn);
 }
}
function notificationDestination(n){return n.post_id?'#/cuenta?post='+encodeURIComponent(n.post_id):(n.actor_id?'#/perfil?id='+encodeURIComponent(n.actor_id):'#/notificaciones');}
function focusNotificationPost(root,id){if(!id||!root?.isConnected)return;const el=[...root.querySelectorAll('[data-post-id]')].find(x=>x.dataset.postId===id);if(el){el.classList.add('notification-target-post');el.scrollIntoView({behavior:'smooth',block:'center'});}}
async function loadMemberNotifications(){
 const root=document.getElementById('member-notifications');if(!root)return;
 const {data:{user}}=await sb.auth.getUser();
 if(!root.isConnected)return;
 root.replaceChildren();
 if(!user){const link=document.createElement('a');link.href='#/auth';link.className='gradient-btn mini';link.textContent='Inicia sesión para ver tus notificaciones';root.append(link);return;}
 const {data,error}=await sb.from('member_notifications').select('id,actor_id,kind,post_id,created_at,is_read').order('created_at',{ascending:false}).limit(50);
 if(!root.isConnected)return;
 if(error){root.textContent='No se pudieron cargar las notificaciones.';return;}
 if(!(data||[]).length){root.textContent='Todavía no tienes notificaciones.';return;}
 const markAll=document.createElement('button');markAll.type='button';markAll.className='gradient-btn mini';markAll.textContent='Marcar todas como leídas';markAll.disabled=!data.some(n=>!n.is_read);markAll.onclick=()=>markAllMemberNotifications(user.id,markAll);root.append(markAll);
 const postIds=[...new Set(data.map(n=>n.post_id).filter(Boolean))];
 const {data:relatedPosts}=postIds.length?await sb.from('member_posts').select('id,image_path').in('id',postIds):{data:[]};
 const photoPostIds=new Set((relatedPosts||[]).filter(p=>p.image_path).map(p=>p.id));
 const ids=[...new Set(data.map(n=>n.actor_id))];
 const {data:profiles}=await sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true);
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Un miembro']));
 for(const n of data){
  const row=document.createElement('article');row.className='notification-item'+(n.is_read?'':' unread');if(n.kind==='follow')row.dataset.followActor=n.actor_id;
  const actor=document.createElement('span');actor.textContent=names.get(n.actor_id)||'Un miembro';
  const action=document.createElement('span');const photo=photoPostIds.has(n.post_id);action.textContent=n.kind==='follow'?' empezó a seguirte.':n.kind==='like'?(photo?' dio Me gusta a tu fotografía.':' dio Me gusta a tu publicación.'):(photo?' comentó tu fotografía.':' comentó tu publicación.');
  const date=document.createElement('small');date.textContent=new Date(n.created_at).toLocaleString('es-ES');
  row.append(actor,action,date);
  const jump=document.createElement('a');jump.href=notificationDestination(n);jump.textContent=n.post_id?'Ver publicación':'Ver perfil';jump.className='notification-jump';row.append(jump);
  if(!n.is_read){const button=document.createElement('button');button.className='social-delete';button.textContent='Marcar como leída';button.onclick=async()=>{button.disabled=true;const {error}=await sb.from('member_notifications').update({is_read:true}).eq('id',n.id);if(error){button.textContent='Error al marcar';button.disabled=false;}else{row.classList.remove('unread');button.remove();refreshNotificationBadge(user.id);}};row.append(button);}
  root.append(row);
 }
 await appendFollowBackActions(root,data,user.id);
 refreshNotificationBadge(user.id);
}

async function refreshNotificationBadge(expectedUserId){
 const badge=document.getElementById('notification-count');
 const bell=document.getElementById('notification-bell');
 if(!badge||!bell)return;
 const {count,error}=await sb.from('member_notifications').select('id',{count:'exact',head:true}).eq('is_read',false);
 if(!badge.isConnected||!bell.isConnected)return;
 if(error){badge.hidden=true;bell.title='Notificaciones';return;}
 const total=count||0;
 badge.hidden=total===0;
 badge.textContent=total>99?'99+':String(total);
 bell.setAttribute('aria-label',total?'Notificaciones: '+total+' sin leer':'Notificaciones: ninguna sin leer');
 bell.title=total?total+' notificaciones sin leer':'Notificaciones';
}

async function loadPrivateMessages(){
 const root=document.getElementById('private-messages');if(!root)return;
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(!root.isConnected)return;root.replaceChildren();
 if(authError||!user){const link=document.createElement('a');link.href='#/auth';link.className='gradient-btn mini';link.textContent='Inicia sesión para enviar mensajes';root.append(link);return;}
 const me=user.id;
 const params=new URLSearchParams((location.hash.split('?')[1]||''));
 const requested=params.get('id');
 const validId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'');
 const {data:messages,error}=await sb.from('member_direct_messages').select('id,sender_id,recipient_id,body,created_at').order('created_at',{ascending:false}).limit(300);
 if(!root.isConnected)return;
 if(error){root.textContent='No se pudieron cargar los mensajes: '+error.message;return;}
 const items=messages||[];
 const ids=[...new Set(items.flatMap(m=>[m.sender_id,m.recipient_id]).filter(id=>id!==me))];
 if(validId(requested)&&requested!==me&&!ids.includes(requested))ids.push(requested);
 const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username,is_public').in('id',ids):{data:[]};
 if(!root.isConnected)return;
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
 const publicIds=new Set((profiles||[]).filter(p=>p.is_public).map(p=>p.id));
 const partners=[...new Set(items.map(m=>m.sender_id===me?m.recipient_id:m.sender_id))];
 if(validId(requested)&&requested!==me&&!partners.includes(requested))partners.unshift(requested);
 const wrapper=document.createElement('div');wrapper.className='messages-layout';
 const sidebar=document.createElement('aside');sidebar.className='messages-sidebar';
 const title=document.createElement('h2');title.textContent='Conversaciones';sidebar.append(title);
 if(!partners.length){const p=document.createElement('p');p.textContent='Aún no tienes conversaciones. Visita Miembros para iniciar una.';sidebar.append(p);}
 const active=validId(requested)&&requested!==me?requested:(partners[0]||null);
 for(const id of partners){
  const link=document.createElement('a');link.href='#/mensajes?id='+encodeURIComponent(id);
  link.className='messages-partner'+(id===active?' selected':'');
  link.textContent=names.get(id)||'Miembro';sidebar.append(link);
 }
 const panel=document.createElement('section');panel.className='messages-panel';
 if(!active){panel.textContent='Selecciona un miembro desde su perfil para comenzar.';}
 else if(!names.has(active)&&!items.some(m=>m.sender_id===active||m.recipient_id===active)){panel.textContent='Este miembro no tiene un perfil público disponible.';}
 else {
  const heading=document.createElement('h2');heading.textContent=names.get(active)||'Miembro';
  const history=document.createElement('div');history.className='messages-history';
  const conversation=items.filter(m=>(m.sender_id===me&&m.recipient_id===active)||(m.recipient_id===me&&m.sender_id===active)).reverse();
  if(!conversation.length){const hint=document.createElement('p');hint.textContent='Todavía no hay mensajes en esta conversación.';history.append(hint);}
  for(const m of conversation){
   const bubble=document.createElement('div');bubble.className='message-bubble'+(m.sender_id===me?' mine':'');
   const text=document.createElement('p');text.textContent=m.body;
   const date=document.createElement('small');date.textContent=new Date(m.created_at).toLocaleString('es-ES');
   bubble.append(text,date);history.append(bubble);
  }
  panel.append(heading,history);
  if(publicIds.has(active)){
   const form=document.createElement('form');form.className='social-form messages-compose';
   const input=document.createElement('textarea');input.required=true;input.maxLength=2000;input.placeholder='Escribe tu mensaje privado…';input.setAttribute('aria-label','Mensaje privado');
   const button=document.createElement('button');button.className='gradient-btn mini';button.type='submit';button.textContent='Enviar mensaje';
   const status=document.createElement('p');status.setAttribute('role','status');
   form.append(input,button,status);
   form.onsubmit=async e=>{e.preventDefault();const body=input.value.trim();if(!body)return;button.disabled=true;const {error:sendError}=await sb.from('member_direct_messages').insert({sender_id:me,recipient_id:active,body});if(sendError){status.textContent='No se pudo enviar: '+sendError.message;button.disabled=false;}else await loadPrivateMessages();};
   panel.append(form);
  }else{const p=document.createElement('p');p.textContent='Este miembro ya no tiene un perfil público; no puedes enviarle nuevos mensajes.';panel.append(p);}
 }
 wrapper.append(sidebar,panel);root.append(wrapper);
}
