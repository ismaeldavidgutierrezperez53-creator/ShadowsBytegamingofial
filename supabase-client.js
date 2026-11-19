
function applyShopProfileCosmetics(userId,avatarNode,nameNode,container){
 if(!userId||!avatarNode||!nameNode)return;
 sb.rpc('public_member_shop_equipped',{target_member:userId}).then(({data,error})=>{
  if(error||!avatarNode.isConnected||!nameNode.isConnected)return;
  const items=new Map((data||[]).map(x=>[x.category,x.item_value]));
  avatarNode.classList.remove('sb-shop-frame-neon','sb-shop-frame-gold');
  if(items.get('frame')==='neon'||items.get('frame')==='gold')avatarNode.classList.add('sb-shop-frame-'+items.get('frame'));
  nameNode.style.color='';
  if(['#22d3ee','#f472b6'].includes(items.get('color')))nameNode.style.color=items.get('color');
  if(!container||!container.isConnected)return;
  container.querySelectorAll('.sb-shop-decoration').forEach(el=>el.remove());
  const after=nameNode.nextSibling;
  const holder=document.createElement('div');holder.className='sb-shop-decoration';holder.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:5px 0 10px';
  if(['⭐','👑'].includes(items.get('badge'))){const badge=document.createElement('span');badge.textContent=items.get('badge')+' Insignia exclusiva';badge.className='profile-role';holder.append(badge)}
  if(['Otaku Élite','Leyenda Byte'].includes(items.get('title'))){const title=document.createElement('span');title.textContent='👑 '+items.get('title');title.className='profile-role';holder.append(title)}
  if(holder.childNodes.length)container.insertBefore(holder,after);
 }).catch(()=>{});
}
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
 return items.length ? '<div class="content-grid news-grid">'+items.map(n=>{
  const cover=typeof n.cover_url==='string' && /^https:\/\//i.test(n.cover_url.trim()) ? n.cover_url.trim() : '';
  const published=n.published_at ? new Date(n.published_at) : null;
  const date=published && !Number.isNaN(published.getTime()) ? published.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}) : '';
  const excerpt=n.excerpt||((n.content||'').slice(0,180)+((n.content||'').length>180?'…':''));
  return '<article class="auth-card news-card">'+(cover?'<img class="news-cover" src="'+escapeHTML(cover)+'" alt="Imagen de '+escapeHTML(n.title)+'" loading="lazy" decoding="async" onerror="this.hidden=true">':'')+(date?'<time class="news-date" datetime="'+escapeHTML(n.published_at)+'">📅 '+escapeHTML(date)+'</time>':'')+'<h3>'+escapeHTML(n.title)+'</h3><p>'+escapeHTML(excerpt)+'</p>'+(n.content?'<details class="news-details"><summary>Leer noticia completa <span aria-hidden="true">⌄</span></summary><div class="news-full-content">'+escapeHTML(n.content).replace(/\n/g,'<br>')+'</div></details>':'')+'</article>';
 }).join('')+'</div>' : '<div class="empty">Aún no hay noticias publicadas</div>';
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
 const displayName=signup?form.elements.signup_name?.value.trim().replace(/\s+/g,' ').slice(0,60):'';
 if(signup&&(!displayName||displayName.length<2)){document.getElementById('auth-message').textContent='Introduce un nombre de al menos 2 caracteres.';return;}
 const result=signup?await sb.auth.signUp({email,password,options:{emailRedirectTo:RECOVERY_REDIRECT,data:{display_name:displayName,username:displayName}}}):await sb.auth.signInWithPassword({email,password});
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
 syncPrivateMessageRealtime(user?.id||null);
 if(liveAlertUserId!==user?.id){loadLiveAlertPreferences(user?.id||null);syncReportLiveAlerts(user?.id||null);}
 const hero=document.getElementById('hero-account-actions');
 if(hero)hero.innerHTML=user?'<a class="gradient-btn" href="#/cuenta">Mi cuenta</a>'+(user.app_metadata?.role==='admin'?'<a class="outline-btn" href="#/admin">Panel de administración</a>':'<a class="outline-btn" href="#/comunidad">Explorar comunidad</a>'):'<a class="gradient-btn" href="#/auth?mode=signup">Únete gratis</a><a class="outline-btn" href="#/auth">Iniciar sesión</a>';
 const search='<label class="search"><span>⌕</span><input aria-label="Buscar en la web" placeholder="Buscar…" /></label>';
 if(!user){
  actions.innerHTML=search+'<a href="#/auth">Entrar</a><a class="gradient-btn mini" href="#/auth?mode=signup">Registrarse</a>';
  return;
 }
 const admin=user.app_metadata?.role==='admin';
 actions.innerHTML=search+'<a href="#/cuenta">Mi cuenta</a><a href="#/mensajes" class="messages-header-link">💬 Mensajes <span id="message-unread-count" class="message-unread-count" hidden></span></a><div class="notification-menu"><button type="button" id="notification-bell" class="notification-bell" aria-label="Abrir notificaciones" aria-expanded="false" aria-controls="notification-popover">🔔<span id="notification-count" class="notification-count" hidden></span></button><div id="notification-popover" class="notification-popover" hidden><strong>🔔 Notificaciones</strong><button type="button" id="notification-mark-all">Marcar todas como leídas</button><button type="button" id="notification-close">✕</button><div id="notification-preview">Cargando…</div><a href="#/notificaciones">Ver todas las notificaciones</a></div></div>'+(admin?'<a class="gradient-btn mini" href="#/admin">Administración</a>':'')+'<button type="button" id="account-logout" class="gradient-btn mini">Cerrar sesión</button>';
 document.getElementById('account-logout').addEventListener('click',logout);
 setupNotificationPopover(user.id);
 refreshNotificationBadge(user.id);
 refreshPrivateMessageBadge(user.id);
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
 const {data,error}=await sb.from('member_notifications').select('id,actor_id,kind,post_id,gift_id,is_read,created_at').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(8);
 if(!root.isConnected)return;root.replaceChildren();
 if(error){root.textContent='No se pudieron cargar las notificaciones.';return;}
 if(!data?.length){root.textContent='Todavía no tienes notificaciones de la comunidad.';}
 const ids=[...new Set((data||[]).map(n=>n.actor_id))],postIds=[...new Set((data||[]).map(n=>n.post_id).filter(Boolean))];
 const [{data:profiles},{data:posts}]=await Promise.all([sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true),postIds.length?sb.from('member_posts').select('id,image_path').in('id',postIds):Promise.resolve({data:[]})]);
 if(!root.isConnected)return;
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Un miembro']));
 const giftNames=await shopGiftNotificationNames(data||[]);
 const photos=new Set((posts||[]).filter(p=>p.image_path).map(p=>p.id));
 for(const n of (data||[])){
  const item=document.createElement('div');item.className='notification-preview-item'+(n.is_read?'':' unread');if(n.kind==='follow')item.dataset.followActor=n.actor_id;
  const message=document.createElement('p');const photo=photos.has(n.post_id);
  message.textContent=(names.get(n.actor_id)||'Un miembro')+(n.kind==='gift'?' te envió un regalo: '+(giftNames.get(n.gift_id)||'recompensa')+'.':n.kind==='follow'?' empezó a seguirte.':n.kind==='like'?(photo?' dio Me gusta a tu fotografía.':' dio Me gusta a tu publicación.'):(photo?' comentó tu fotografía.':' comentó tu publicación.'));
  const date=document.createElement('small');date.textContent=new Date(n.created_at).toLocaleString('es-ES');item.append(message,date);
  if(!n.is_read){const mark=document.createElement('button');mark.type='button';mark.textContent='Marcar como leída';mark.onclick=async()=>{mark.disabled=true;const {error:err}=await sb.from('member_notifications').update({is_read:true}).eq('id',n.id).eq('recipient_id',userId);if(err){mark.disabled=false;mark.textContent='Error al marcar';}else{item.classList.remove('unread');mark.remove();refreshNotificationBadge(userId);if(document.getElementById('member-notifications'))loadMemberNotifications();}};item.append(mark);}
  if(n.kind==='gift'){const go=document.createElement('a');go.href='#/regalos';go.textContent='🎁 Ver regalo y equipar';go.className='notification-jump';item.append(go)}
  root.append(item);
 }
 await appendFollowBackActions(root,data||[],userId);
 const {data:reports,error:reportsError}=await sb.from('member_report_notifications').select('id,status,created_at,is_read').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(5);
 if(!root.isConnected)return;
 if(!reportsError&&reports?.length){
  const heading=document.createElement('strong');heading.textContent='🛡 Avisos de denuncias';root.append(heading);
  for(const report of reports){
   const item=document.createElement('div');item.className='notification-preview-item'+(report.is_read?'':' unread');
   const message=document.createElement('p');message.textContent='Tu denuncia fue '+(report.status==='reviewed'?'revisada.':'descartada.');
   const date=document.createElement('small');date.textContent=new Date(report.created_at).toLocaleString('es-ES');item.append(message,date);
   if(!report.is_read){
    const mark=document.createElement('button');mark.type='button';mark.textContent='Marcar como leído';
    mark.onclick=async()=>{mark.disabled=true;const {error}=await sb.from('member_report_notifications').update({is_read:true}).eq('id',report.id).eq('recipient_id',userId);if(error){mark.disabled=false;return;}refreshNotificationBadge(userId);loadNotificationPreview(userId);if(document.getElementById('account-report-history'))loadAccountReportHistory(userId);refreshNotificationBadge(userId);};
    item.append(mark);
   }
   root.append(item);
  }
  const link=document.createElement('a');link.href='#/cuenta';link.textContent='Ver historial de denuncias';root.append(link);
 }
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
  .on('postgres_changes',{event:'*',schema:'public',table:'member_report_notifications',filter:'recipient_id=eq.'+userId},()=>{refreshNotificationBadge(userId);if(document.getElementById('notification-popover')?.hidden===false)loadNotificationPreview(userId);if(document.getElementById('account-report-history'))loadAccountReportHistory(userId);})
  .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('No se pudo conectar el canal de notificaciones en tiempo real.');});
}
sb.auth.onAuthStateChange(()=>{setTimeout(refreshAccountActions,0);});
refreshAccountActions();

async function loadAccountFollows(userId,root){
 const blockPanel=document.getElementById('account-blocked-members');
 if(blockPanel)renderAccountBlockedMembers(userId);
 if(!root?.isConnected)return;
 root.innerHTML='<h3>👥 Seguidores y Siguiendo</h3><p>Consulta las personas que te siguen y las cuentas a las que sigues.</p>';
 const searchLabel=document.createElement('label');searchLabel.htmlFor='account-follow-search';searchLabel.textContent='Buscar seguidores o miembros que sigues';
 const search=document.createElement('input');search.type='search';search.id='account-follow-search';search.placeholder='Buscar por nombre o usuario…';search.autocomplete='off';root.append(searchLabel,search);
 const filter=document.createElement('div');filter.className='account-follow-filters';filter.setAttribute('role','group');filter.setAttribute('aria-label','Filtrar miembros');
 let activeFilter='all';const filterButtons=[];
 for(const [value,label] of [['all','Todos'],['followers','Seguidores'],['following','Siguiendo']]){
  const button=document.createElement('button');button.type='button';button.className='account-follow-filter';button.textContent=label;button.setAttribute('aria-pressed',String(value==='all'));
  button.addEventListener('click',()=>{activeFilter=value;updateFilter();});
  filter.append(button);filterButtons.push({value,button});
 }
 root.append(filter);
 const count=document.createElement('p');count.className='account-follow-results';count.setAttribute('aria-live','polite');root.append(count);
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
 const sections=[{key:'followers',title:'Seguidores',ids:(followers||[]).map(x=>x.follower_id)},{key:'following',title:'Siguiendo',ids:(following||[]).map(x=>x.following_id)}];
 const lists=[];
 for(const section of sections){
  const area=document.createElement('section');area.className='account-follows-list';
  const title=document.createElement('h4');title.textContent=section.title+' ('+section.ids.length+')';area.append(title);
  if(!section.ids.length){const empty=document.createElement('p');empty.textContent=section.title==='Seguidores'?'Todavía no tienes seguidores.':'Todavía no sigues a nadie.';area.append(empty);}
  for(const id of section.ids){
   const p=names.get(id);const row=document.createElement('div');row.className='account-follow-member';row.dataset.memberId=id;
   if(p?.avatar_url&&/^https:\/\//i.test(p.avatar_url)){const img=document.createElement('img');img.src=p.avatar_url;img.alt='';img.loading='lazy';row.append(img);}
   const name=document.createElement('span');name.textContent=p?.display_name||p?.username||'Miembro';row.append(name);
   if(p?.is_public){const link=document.createElement('a');link.href='#/perfil?id='+encodeURIComponent(id);link.className='outline-btn mini';link.textContent='Ver perfil';row.append(link);}
   else{const privateLabel=document.createElement('small');privateLabel.textContent='Perfil privado';row.append(privateLabel);}
   area.append(row);
  }
  content.append(area);lists.push({area,section});
 }
 const normalize=value=>(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es').trim();
 function updateFilter(){
  const term=normalize(search.value);let total=0;
  for(const {area,section} of lists){
   const showSection=activeFilter==='all'||activeFilter===section.key;
   area.hidden=!showSection;area.style.display=showSection?'':'none';
   let visible=0;
   for(const row of area.querySelectorAll('.account-follow-member')){
    const p=names.get(row.dataset.memberId);
    const label=[p?.display_name,p?.username,row.querySelector('span')?.textContent].filter(Boolean).join(' ');
    const match=!term||normalize(label).includes(term);
    row.hidden=!match;row.style.display=match?'':'none';if(match&&showSection)visible++;
   }
   total+=visible;
   let empty=area.querySelector('.account-follow-search-empty');
   if(!empty){empty=document.createElement('p');empty.className='account-follow-search-empty';area.append(empty);}
   empty.hidden=!term||visible>0||!section.ids.length;empty.style.display=empty.hidden?'none':'';
   empty.textContent='No hay coincidencias.';
  }
  for(const {value,button} of filterButtons){button.setAttribute('aria-pressed',String(value===activeFilter));}
  count.textContent=total+' '+(total===1?'miembro encontrado':'miembros encontrados')+(term?' para «'+search.value.trim()+'»':'');
 }
 search.addEventListener('input',updateFilter);
 search.addEventListener('search',updateFilter);
 updateFilter();
}

let accountReportChannel=null;
let accountReportStatuses=new Map();
async function loadAccountReportStatuses(userId,announce=false){
 const root=document.getElementById('account-report-statuses');if(!root)return;
 const {data,error}=await sb.from('member_reports').select('id,post_id,comment_id,reported_member_id,reason,details,status,created_at,reviewed_at').eq('reporter_id',userId).order('created_at',{ascending:false}).limit(100);
 if(!root.isConnected)return;
 if(error){root.textContent='No se pudo consultar el estado de tus denuncias: '+error.message;return;}
 const changes=(data||[]).filter(r=>accountReportStatuses.has(r.id)&&accountReportStatuses.get(r.id)==='pending'&&r.status!=='pending');
 if(announce&&changes.length){
  const alert=document.getElementById('account-report-update');
  if(alert)alert.textContent='🔔 Se ha actualizado el estado de '+changes.length+' denuncia(s).';
 }
 accountReportStatuses=new Map((data||[]).map(r=>[r.id,r.status]));
 root.replaceChildren();
 if(!data?.length){root.textContent='Todavía no has enviado ninguna denuncia.';return;}
 const labels={pending:'Pendiente',reviewed:'Revisada',dismissed:'Descartada'};
 const reasons={spam:'Spam',harassment:'Acoso',hate:'Discurso de odio',inappropriate:'Contenido inapropiado',other:'Otro'};
 const controls=document.createElement('div');controls.className='account-report-filters';
 const filterLabel=document.createElement('label');filterLabel.textContent='Filtrar por estado ';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filtrar denuncias por estado');
 for(const [value,label] of [['all','Todas'],['pending','Pendientes'],['reviewed','Revisadas'],['dismissed','Descartadas']]){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}
 filter.value=root.dataset.reportFilter||'all';filterLabel.append(filter);
 const summary=document.createElement('span');summary.setAttribute('role','status');controls.append(filterLabel,summary);root.append(controls);
 const rows=document.createElement('div');root.append(rows);
 const draw=()=>{
  root.dataset.reportFilter=filter.value;rows.replaceChildren();
  const selected=data.filter(r=>filter.value==='all'||r.status===filter.value);
  summary.textContent=selected.length+' de '+data.length+' denuncias';
  if(!selected.length){rows.textContent='No hay denuncias con este estado.';return;}
  for(const report of selected){
   const row=document.createElement('article');row.className='account-report-row';
   const title=document.createElement('strong');title.textContent=(report.reported_member_id?'Perfil':report.post_id?'Publicación':'Comentario')+' · '+(labels[report.status]||report.status);
   const detail=document.createElement('small');detail.textContent='Motivo: '+(reasons[report.reason]||report.reason)+' · Enviada: '+new Date(report.created_at).toLocaleString('es-ES')+(report.reviewed_at?' · Revisada: '+new Date(report.reviewed_at).toLocaleString('es-ES'):'');
   row.append(title,detail);
   if(report.details){const description=document.createElement('p');description.textContent=report.details;row.append(description);}
   rows.append(row);
  }
 };
 filter.onchange=draw;draw();
}

let accountReportHistoryChannel=null;
async function loadAccountReportHistory(userId){
 const root=document.getElementById('account-report-history');if(!root)return;
 const {data,error}=await sb.from('member_report_notifications').select('id,report_id,status,created_at,is_read').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(100);
 if(!root.isConnected)return;
 root.replaceChildren();
 if(error){root.textContent='No se pudo cargar el historial de avisos.';return;}
 if(!data?.length){root.textContent='Todavía no tienes avisos sobre tus denuncias.';return;}
 const pending=data.filter(x=>!x.is_read).length;
 const summary=document.createElement('p');summary.textContent=pending?pending+' aviso(s) sin leer':'Todos los avisos están leídos';root.append(summary);
 if(pending){
  const all=document.createElement('button');all.type='button';all.className='outline-btn mini';all.textContent='Marcar todos como leídos';
  all.onclick=async()=>{all.disabled=true;const {error}=await sb.from('member_report_notifications').update({is_read:true}).eq('recipient_id',userId).eq('is_read',false);if(error){all.disabled=false;alert('No se pudieron marcar los avisos.');return;}loadAccountReportHistory(userId);};
  root.append(all);
 }
 for(const n of data){
  const row=document.createElement('article');row.className='account-report-row'+(n.is_read?'':' unread');
  const title=document.createElement('strong');title.textContent='🔔 Tu denuncia fue '+(n.status==='reviewed'?'revisada':'descartada');
  const detail=document.createElement('small');detail.textContent=new Date(n.created_at).toLocaleString('es-ES');
  row.append(title,detail);
  if(!n.is_read){
   const button=document.createElement('button');button.type='button';button.className='outline-btn mini';button.textContent='Marcar como leído';
   button.onclick=async()=>{button.disabled=true;const {error}=await sb.from('member_report_notifications').update({is_read:true}).eq('id',n.id).eq('recipient_id',userId);if(error){button.disabled=false;return;}loadAccountReportHistory(userId);};
   row.append(button);
  }
  root.append(row);
 }
}


async function initAccountNotificationPreferences(userId,root){
 const section=document.createElement('section');section.className='profile-panel account-notification-preferences';
 section.innerHTML='<h3>⚙ Configuración de notificaciones</h3><p>Elige si quieres recibir correos electrónicos cuando se revisen tus denuncias. Los avisos dentro de la web seguirán activos.</p><label class="notification-preference-label"><input type="checkbox" id="report-email-enabled" disabled> Recibir correos sobre mis denuncias</label><p id="report-email-preference-message" role="status" aria-live="polite">Cargando preferencias…</p>';
 root.append(section);
 const checkbox=section.querySelector('#report-email-enabled'),message=section.querySelector('#report-email-preference-message');
 const {data,error}=await sb.from('member_notification_preferences').select('report_email_enabled').eq('user_id',userId).maybeSingle();
 if(!section.isConnected)return;
 if(error){message.textContent='No se pudieron cargar tus preferencias.';return;}
 checkbox.checked=data?.report_email_enabled??true;checkbox.disabled=false;message.textContent='Preferencia actual guardada.';
 checkbox.onchange=async()=>{
  const requested=checkbox.checked;
  checkbox.disabled=true;message.textContent='Guardando preferencia…';
  const {data:sessionData}=await sb.auth.getUser();
  if(sessionData?.user?.id!==userId){checkbox.checked=!requested;checkbox.disabled=false;message.textContent='La sesión ha cambiado. Vuelve a entrar en Mi cuenta.';return;}
  const {data:existing, error:readError}=await sb.from('member_notification_preferences').select('user_id').eq('user_id',userId).maybeSingle();
  let saveError=readError;
  if(!saveError){
   const query=existing
    ?sb.from('member_notification_preferences').update({report_email_enabled:requested,updated_at:new Date().toISOString()}).eq('user_id',userId)
    :sb.from('member_notification_preferences').insert({user_id:userId,report_email_enabled:requested});
   const result=await query.select('report_email_enabled').single();
   saveError=result.error;
   if(!saveError&&result.data?.report_email_enabled!==requested)saveError=new Error('El valor guardado no coincide.');
  }
  if(saveError){
   checkbox.checked=!requested;
   message.textContent='No se pudo guardar: '+(saveError.message||'Error desconocido')+'. Inténtalo de nuevo.';
   console.warn('Preferencia de correo no guardada:',saveError);
  }else{
   message.textContent=requested?'Preferencia guardada: correos activados.':'Preferencia guardada: correos desactivados.';
  }
  checkbox.disabled=false;
 };
}

function initAccountReportStatuses(userId,root){
 if(accountReportChannel){sb.removeChannel(accountReportChannel);accountReportChannel=null;}
 accountReportStatuses=new Map();
 if(accountReportHistoryChannel){sb.removeChannel(accountReportHistoryChannel);accountReportHistoryChannel=null;}
 const section=document.createElement('section');section.className='profile-panel account-report-panel';
 section.innerHTML='<h3>🛡 Mis denuncias</h3><p>Consulta el estado de tus reportes. Los cambios aparecen automáticamente mientras tengas abierta esta página.</p><p id="account-report-update" role="status" aria-live="polite"></p><div id="account-report-statuses">Cargando denuncias…</div>';
 root.append(section);
 initAccountNotificationPreferences(userId,root);
 const history=document.createElement('section');history.className='profile-panel account-report-panel';history.innerHTML='<h3>🔔 Historial de avisos de denuncias</h3><p>Los avisos se guardan aunque cierres la página. Puedes marcarlos como leídos.</p><div id="account-report-history">Cargando historial…</div>';root.append(history);
 loadAccountReportStatuses(userId);
 loadAccountReportHistory(userId);
 accountReportChannel=sb.channel('account-reports-'+userId)
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'member_reports',filter:'reporter_id=eq.'+userId},()=>loadAccountReportStatuses(userId,true))
  .subscribe();
 accountReportHistoryChannel=sb.channel('account-report-history-'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_report_notifications',filter:'recipient_id=eq.'+userId},()=>loadAccountReportHistory(userId))
  .subscribe();
}

async function initSecurityPrivacyCenter(userId,root){
 if(!root)return;
 const center=document.createElement('section');center.className='profile-panel security-center';center.id='security-privacy-center';
 const title=document.createElement('h3');title.textContent='🔐 Centro de seguridad y privacidad';
 const description=document.createElement('p');description.textContent='Gestiona tus bloqueos, denuncias, privacidad y preferencias de avisos desde un solo lugar.';
 const nav=document.createElement('div');nav.className='security-center-links';
 for(const [label,target] of [['🚫 Miembros bloqueados','#account-blocked-members'],['🛡 Mis denuncias','#account-report-statuses'],['🔔 Avisos de denuncias','#account-report-history'],['🔒 Privacidad de mi perfil','#profile-public']]){
  const button=document.createElement('button');button.type='button';button.className='outline-btn mini';button.textContent=label;
  button.onclick=()=>{const el=document.querySelector(target);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});if(target==='#profile-public')el.focus();};
  nav.append(button);
 }
 const preferences=document.createElement('form');preferences.className='security-preferences';
 const heading=document.createElement('h4');heading.textContent='⚙️ Preferencias de avisos';
 const note=document.createElement('p');note.textContent='Elige qué avisos emergentes deseas ver mientras tienes abierta la web. Los mensajes y el historial de denuncias seguirán disponibles.';
 const labels=[['notify_private_messages','Avisos de mensajes privados'],['notify_report_updates','Avisos de cambios en denuncias']];
 const inputs={};
 for(const [field,label] of labels){const wrapper=document.createElement('label');wrapper.className='profile-checkbox';const input=document.createElement('input');input.type='checkbox';input.checked=true;inputs[field]=input;wrapper.append(input,document.createTextNode(' '+label));preferences.append(wrapper);}
 const save=document.createElement('button');save.type='submit';save.className='gradient-btn mini';save.textContent='Guardar preferencias';
 const status=document.createElement('p');status.setAttribute('role','status');
 preferences.prepend(heading,note);preferences.append(save,status);
 center.append(title,description,nav,preferences);root.prepend(center);
 const {data,error}=await sb.from('member_privacy_settings').select('notify_private_messages,notify_report_updates').eq('user_id',userId).maybeSingle();
 if(!center.isConnected)return;
 if(error)status.textContent='No se pudieron cargar las preferencias.';
 else if(data)for(const [field] of labels)inputs[field].checked=data[field]!==false;
 preferences.onsubmit=async event=>{
  event.preventDefault();save.disabled=true;status.textContent='Guardando…';
  const payload={user_id:userId,notify_private_messages:inputs.notify_private_messages.checked,notify_report_updates:inputs.notify_report_updates.checked,updated_at:new Date().toISOString()};
  const {error}=await sb.from('member_privacy_settings').upsert(payload,{onConflict:'user_id'});
  if(!error){liveAlertPreferences={notify_private_messages:payload.notify_private_messages,notify_report_updates:payload.notify_report_updates};}
  status.textContent=error?'No se pudieron guardar: '+error.message:'Preferencias guardadas correctamente.';
  save.disabled=false;
 };
}
async function loadAccountProfile(){
 const root=document.getElementById('account-profile');if(!root)return;
 const {data:{user},error}=await sb.auth.getUser();
 if(!root.isConnected)return;
 if(error||!user){root.innerHTML='<p>Inicia sesión para ver tu perfil.</p><a class="gradient-btn mini" href="#/auth">Iniciar sesión</a>';return;}
 const meta=user.user_metadata||{};
 const avatar=typeof meta.avatar_url==='string'&&/^https:\/\//i.test(meta.avatar_url)?meta.avatar_url:'';
 const name=meta.display_name||meta.full_name||'Mi perfil';
 root.innerHTML='<div class="profile-cover"><span>SHADOWS BYTE / PERFIL</span><span class="profile-cover-mark">SB</span></div><div class="profile-body"><div class="profile-identity"><div id="profile-avatar" class="profile-avatar"></div><div class="profile-identity-copy"><div class="profile-kicker">CUENTA PERSONAL</div><h2 id="profile-heading"></h2><p id="profile-email"></p><span class="profile-role">'+(user.app_metadata?.role==='admin'?'★ Administrador':'● Miembro')+'</span></div></div><div class="profile-grid"><section class="profile-panel"><h3>✦ Editar perfil</h3><p>Personaliza cómo apareces en Shadows Byte Gaming.</p><form id="profile-form"><label for="profile-name">Nombre de usuario</label><input id="profile-name" name="display_name" maxlength="60" required autocomplete="nickname" placeholder="Tu nombre"><label for="profile-avatar-url">Imagen de perfil (URL HTTPS)</label><input id="profile-avatar-url" name="avatar_url" type="url" placeholder="https://ejemplo.com/avatar.jpg"><button class="gradient-btn" type="submit">Guardar cambios</button><p id="profile-message" role="status" aria-live="polite"></p></form></section><section class="profile-panel"><h3>⚙ Ajustes de cuenta</h3><a class="profile-setting-link" href="#/regalos">🎁 Mi buzón de regalos <span>→</span></a><p>Información y seguridad de tu cuenta.</p><label for="profile-email-readonly">Correo electrónico</label><input id="profile-email-readonly" type="email" disabled><a class="profile-setting-link" href="#/forgot-password">🔒 Cambiar contraseña <span>→</span></a>'+(user.app_metadata?.role==='admin'?'<a class="profile-setting-link" href="#/admin">🛡 Panel de administración <span>→</span></a>':'')+'<button type="button" class="profile-signout" id="profile-signout">Cerrar sesión</button></section></div></div>';
 const communityPanel=document.createElement('section');
 communityPanel.className='profile-panel account-community-panel';
 communityPanel.setAttribute('aria-label','Mi comunidad');
 communityPanel.innerHTML='<h3>✦ Mi comunidad</h3><p>Publica novedades, responde comentarios y participa con otros miembros.</p><p class="account-community-links"><a class="outline-btn mini" href="#/comunidad">Ver muro de la comunidad</a> <a class="outline-btn mini" href="#/notificaciones">🔔 Mis notificaciones</a></p><div id="account-community-social" class="account-community-social">Cargando publicaciones…</div>';
 root.querySelector('.profile-body')?.append(communityPanel);
 const myAchievements=document.createElement('section');myAchievements.className='profile-panel';myAchievements.innerHTML='<h3>🏆 Mis logros y nivel</h3><p>Consulta tus insignias, XP y clasificación.</p><a class="gradient-btn mini" href="#/logros">Ver mis logros</a>';
 root.querySelector('.profile-identity')?.after(myAchievements);
 initAccountReportStatuses(user.id,root.querySelector('.profile-body'));
 initSecurityPrivacyCenter(user.id,root.querySelector('.profile-body'));
 const followPanel=document.createElement('section');followPanel.className='profile-panel account-follows-panel';followPanel.id='account-follows';communityPanel.before(followPanel);const blockedPanel=document.createElement('section');blockedPanel.className='profile-panel account-blocked-members';blockedPanel.id='account-blocked-members';followPanel.after(blockedPanel);loadAccountFollows(user.id,followPanel);
 loadMemberSocial(user.id,communityPanel.querySelector('#account-community-social'));
 const ownGallery=document.createElement('section');ownGallery.className='profile-panel member-gallery-panel';ownGallery.id='account-gallery';
 communityPanel.before(ownGallery);
 loadMemberGallery(user.id,ownGallery);
 document.getElementById('profile-signout').addEventListener('click',logout);
 // Public member directory is opt-in; keep authentication email private.
 const {data:profile}=await sb.from('profiles').select('bio,is_public,cover_url,theme_color,featured_badge').eq('id',user.id).maybeSingle();
 const panel=root.querySelector('.profile-grid .profile-panel');
 if(panel){
  const extra=document.createElement('div');extra.className='profile-public-settings';
  extra.innerHTML='<label for="profile-bio">Presentación para la comunidad</label><textarea id="profile-bio" maxlength="280" rows="3" placeholder="Cuéntanos algo sobre ti..."></textarea><label class="profile-checkbox"><input type="checkbox" id="profile-public"> Mostrar mi perfil en Miembros</label><p class="profile-privacy">Solo se mostrarán tu nombre, avatar y presentación. Tu correo no será público.</p>';
  panel.querySelector('#profile-form').insertBefore(extra,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-bio').value=profile?.bio||'';
  document.getElementById('profile-public').checked=profile?.is_public===true;
  const customization=document.createElement('div');customization.className='profile-customization';
  customization.innerHTML='<label for="profile-cover-url">🖼️ Portada (URL HTTPS)</label><input id="profile-cover-url" type="url" placeholder="https://ejemplo.com/portada.jpg"><label for="profile-theme">🎨 Color del perfil</label><select id="profile-theme"><option value="violet">Morado</option><option value="blue">Azul</option><option value="emerald">Verde</option><option value="rose">Rosa</option><option value="amber">Dorado</option></select>';
  panel.querySelector('#profile-form').insertBefore(customization,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-cover-url').value=profile?.cover_url||'';
  document.getElementById('profile-theme').value=profile?.theme_color||'violet';
  const badgeSelect=document.createElement('div');badgeSelect.className='profile-customization';
  badgeSelect.innerHTML='<label for="profile-featured-badge">🏅 Insignia destacada</label><select id="profile-featured-badge"><option value="">Ninguna</option><option value="first">🌱 Primer paso · 5 XP</option><option value="participant">⭐ Participante · 50 XP</option><option value="active">🔥 Miembro activo · 150 XP</option><option value="legend">🏆 Leyenda · 500 XP</option></select><small>Solo puedes destacar insignias que hayas conseguido.</small>';
  panel.querySelector('#profile-form').insertBefore(badgeSelect,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-featured-badge').value=profile?.featured_badge||'';
 }

 const heading=document.getElementById('profile-heading'),email=document.getElementById('profile-email');
 heading.textContent=name;email.textContent=user.email||'';applyShopProfileCosmetics(user.id,document.getElementById('profile-avatar'),heading,heading.parentElement);
 const form=document.getElementById('profile-form');
 form.elements.display_name.value=meta.display_name||meta.full_name||'';
 form.elements.avatar_url.value=avatar;
 document.getElementById('profile-email-readonly').value=user.email||'';
 const avatarNode=document.getElementById('profile-avatar');
 function paintAvatar(url,label){avatarNode.replaceChildren();if(url){const img=document.createElement('img');img.src=url;img.alt='Avatar';img.referrerPolicy='no-referrer';img.style.cssText='width:100%;height:100%;object-fit:cover';img.onerror=()=>{avatarNode.textContent=(label||'?').charAt(0).toUpperCase()};avatarNode.append(img)}else avatarNode.textContent=(label||'?').charAt(0).toUpperCase();}
 paintAvatar(avatar,name);
 const editorPanel=form.closest('.profile-panel');
 const progress=document.createElement('div');progress.className='profile-completion';progress.setAttribute('aria-live','polite');
 const progressTitle=document.createElement('strong');const progressTrack=document.createElement('progress');progressTrack.max=100;progressTrack.setAttribute('aria-label','Perfil completado');
 const progressHint=document.createElement('p');progress.append(progressTitle,progressTrack,progressHint);
 const preview=document.createElement('div');preview.className='profile-live-preview';
 const previewHeading=document.createElement('h4');previewHeading.textContent='👁 Vista previa del perfil';
 const previewCard=document.createElement('div');previewCard.className='profile-preview-card';
 const previewAvatar=document.createElement('div');previewAvatar.className='profile-preview-avatar';
 const previewCopy=document.createElement('div');const previewName=document.createElement('strong');const previewBio=document.createElement('p');const previewVisibility=document.createElement('small');
 previewCopy.append(previewName,previewBio,previewVisibility);previewCard.append(previewAvatar,previewCopy);const previewCover=document.createElement('div');previewCover.className='profile-preview-cover';const previewCoverLabel=document.createElement('span');previewCoverLabel.textContent='SHADOWS BYTE / COMUNIDAD';const previewCoverImage=document.createElement('img');previewCoverImage.className='profile-preview-cover-image';previewCoverImage.alt='Vista previa de la portada';previewCoverImage.hidden=true;const previewCoverNotice=document.createElement('small');previewCoverNotice.className='profile-preview-cover-notice';previewCover.append(previewCoverImage,previewCoverLabel,previewCoverNotice);preview.append(previewHeading,previewCover,previewCard);
 const publicLink=document.createElement('a');publicLink.className='outline-btn mini';publicLink.href='#/perfil?id='+encodeURIComponent(user.id);publicLink.textContent='Ver mi perfil público';
 preview.append(publicLink);editorPanel.append(progress,preview);
 function updateProfilePreview(){
  const currentName=form.elements.display_name.value.trim(),currentAvatar=form.elements.avatar_url.value.trim(),bio=document.getElementById('profile-bio')?.value.trim()||'',visible=document.getElementById('profile-public')?.checked;
  const coverInput=document.getElementById('profile-cover-url');const coverNode=root.querySelector('.profile-cover');const coverUrl=coverInput?.value.trim()||'';const theme=document.getElementById('profile-theme')?.value||'violet';const validCover=/^https:\/\/[^\s]+$/i.test(coverUrl);
  previewCoverImage.hidden=!validCover;previewCoverNotice.textContent=coverUrl&&!validCover?'Introduce una URL HTTPS válida para la portada.':'';
  if(validCover&&previewCoverImage.getAttribute('src')!==coverUrl){previewCoverImage.src=coverUrl;previewCoverImage.onerror=()=>{previewCoverNotice.textContent='No se pudo cargar la imagen. Comprueba el enlace de la portada.';previewCoverImage.hidden=true;};previewCoverImage.onload=()=>{previewCoverNotice.textContent='';previewCoverImage.hidden=false;};}
  if(!validCover){previewCoverImage.removeAttribute('src');}previewCover.dataset.theme=theme;if(coverNode){coverNode.style.backgroundImage=/^https:\/\/[^\s]+$/i.test(coverUrl)?'linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,.12)),url("'+coverUrl.replace(/["'()\\]/g,'')+'")':'';coverNode.dataset.theme=theme;}
  const score=[!!currentName,!!currentAvatar,!!bio,!!visible].filter(Boolean).length*25;
  progressTitle.textContent='Perfil completado: '+score+'%';progressTrack.value=score;
  progressHint.textContent=score===100?'¡Tu perfil está completo!':'Completa tu nombre, imagen, presentación y visibilidad para llegar al 100%.';
  previewName.textContent=currentName||'Tu nombre';previewBio.textContent=bio||'Tu presentación aparecerá aquí.';
  previewVisibility.textContent=visible?'Visible en Miembros al guardar':'Perfil privado';
  previewAvatar.replaceChildren();
  if(/^https:\/\/[^\s]+$/i.test(currentAvatar)){const img=document.createElement('img');img.src=currentAvatar;img.alt='Vista previa del avatar';img.referrerPolicy='no-referrer';img.onerror=()=>{previewAvatar.textContent=(currentName||'?').charAt(0).toUpperCase()};previewAvatar.append(img);}
  else previewAvatar.textContent=(currentName||'?').charAt(0).toUpperCase();
  publicLink.hidden=!visible;
 }
 for(const element of [form.elements.display_name,form.elements.avatar_url,document.getElementById('profile-bio'),document.getElementById('profile-public'),document.getElementById('profile-cover-url'),document.getElementById('profile-theme')]){if(element){element.addEventListener('input',updateProfilePreview);element.addEventListener('change',updateProfilePreview);}}
 updateProfilePreview();
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
    const cover_url=document.getElementById('profile-cover-url').value.trim();
    if(cover_url&&!/^https:\/\/[^\s]+$/i.test(cover_url)){status.textContent='La portada debe ser una URL HTTPS válida.';return;}
    const theme_color=document.getElementById('profile-theme').value;
    const featured_badge=document.getElementById('profile-featured-badge').value;
    const thresholds={first:5,participant:50,active:150,legend:500};
    if(featured_badge){const {data:xp,error:xpError}=await sb.rpc('community_member_xp',{target_member:user.id});if(xpError||Number(xp)<thresholds[featured_badge]){status.textContent='Todavía no has desbloqueado esa insignia.';return;}}
    const payload={id:user.id,display_name,avatar_url:avatar_url||null,bio,is_public,cover_url:cover_url||null,theme_color,featured_badge:featured_badge||null};
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
   heading.textContent=display_name;paintAvatar(avatar_url,display_name);updateProfilePreview();
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
   const messageLink=document.createElement('a');messageLink.className='outline-btn mini';messageLink.href='#/mensajes?id='+encodeURIComponent(member.id);messageLink.textContent='💬 Mensaje privado';card.append(avatar,heading,bio,link,messageLink);root.append(card);applyShopProfileCosmetics(member.id,avatar,heading,card);
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
 const {data:member,error}=await sb.from('profiles').select('id,display_name,username,avatar_url,bio,created_at,cover_url,theme_color,featured_badge').eq('id',id).eq('is_public',true).maybeSingle();
 if(!root.isConnected||location.hash.split('?')[0]!=='#/perfil')return;
 root.replaceChildren();
 if(error||!member){root.innerHTML='<div class="admin-empty">Este perfil no está disponible o es privado.</div><a class="outline-btn" href="#/miembros">Volver a Miembros</a>';return;}
 const cover=document.createElement('div');cover.className='public-member-cover';
 const coverLabel=document.createElement('span');coverLabel.textContent='SHADOWS BYTE / COMUNIDAD';cover.append(coverLabel);
 cover.dataset.theme=['violet','blue','emerald','rose','amber'].includes(member.theme_color)?member.theme_color:'violet';
 if(typeof member.cover_url==='string'&&/^https:\/\/[^\s]+$/i.test(member.cover_url)){
  const coverImage=document.createElement('img');coverImage.className='public-member-cover-image';coverImage.src=member.cover_url;coverImage.alt='Portada de '+(member.display_name||member.username||'miembro');coverImage.referrerPolicy='no-referrer';coverImage.onerror=()=>coverImage.remove();cover.prepend(coverImage);
 }
 const content=document.createElement('div');content.className='public-member-body';
 const avatar=document.createElement('div');avatar.className='public-member-avatar';
 const name=member.display_name||member.username||'Miembro';
 if(typeof member.avatar_url==='string'&&/^https:\/\//i.test(member.avatar_url)){
  const img=document.createElement('img');img.src=member.avatar_url;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{avatar.replaceChildren(document.createTextNode(name.charAt(0).toUpperCase()))};avatar.append(img);
 }else avatar.textContent=name.charAt(0).toUpperCase();
 const title=document.createElement('h1');title.textContent=name;
 const badge=document.createElement('span');badge.className='profile-role';badge.textContent='● Miembro de la comunidad';
 const featuredLabels={first:'🌱 Primer paso',participant:'⭐ Participante',active:'🔥 Miembro activo',legend:'🏆 Leyenda'};
 const featured=document.createElement('span');featured.className='profile-featured-badge';featured.hidden=true;
 if(featuredLabels[member.featured_badge]){sb.rpc('community_member_xp',{target_member:member.id}).then(({data,error})=>{const thresholds={first:5,participant:50,active:150,legend:500};if(!error&&Number(data)>=thresholds[member.featured_badge]&&featured.isConnected){featured.textContent='Insignia destacada: '+featuredLabels[member.featured_badge];featured.hidden=false;}});}
 const bioTitle=document.createElement('h2');bioTitle.textContent='Sobre mí';
 const bio=document.createElement('p');bio.className='public-member-bio';bio.textContent=member.bio||'Este miembro todavía no ha escrito una presentación.';
 const back=document.createElement('a');back.href='#/miembros';back.className='outline-btn';back.textContent='← Volver a Miembros';
 content.append(avatar,title,badge,featured,bioTitle,bio);applyShopProfileCosmetics(member.id,avatar,title,content);
 const statsPanel=document.createElement('section');statsPanel.className='profile-panel member-profile-stats';statsPanel.innerHTML='<h2>📊 Estadísticas personales</h2><p>Cargando estadísticas…</p>';content.append(statsPanel);
 Promise.all([
  sb.from('member_posts').select('id',{count:'exact',head:true}).eq('author_id',member.id),
  sb.from('member_follows').select('follower_id',{count:'exact',head:true}).eq('following_id',member.id),
  sb.from('member_follows').select('following_id',{count:'exact',head:true}).eq('follower_id',member.id)
 ]).then(results=>{if(!statsPanel.isConnected)return;const labels=['📝 Publicaciones','👥 Seguidores','🤝 Siguiendo'];statsPanel.replaceChildren();const heading=document.createElement('h2');heading.textContent='📊 Estadísticas personales';statsPanel.append(heading);const grid=document.createElement('div');grid.className='member-stats-grid';results.forEach((result,i)=>{const item=document.createElement('div');const count=document.createElement('strong');count.textContent=result.error?'—':String(result.count??0);const label=document.createElement('span');label.textContent=labels[i];item.append(count,label);grid.append(item)});statsPanel.append(grid);}).catch(()=>{if(statsPanel.isConnected)statsPanel.textContent='No se pudieron cargar las estadísticas.';});
 const achievementPanel=document.createElement('section');achievementPanel.className='profile-panel member-achievements';achievementPanel.innerHTML='<h2>🏆 Logros y nivel</h2><p>Cargando experiencia…</p>';content.append(achievementPanel);
 sb.rpc('community_member_xp',{target_member:member.id}).then(({data:xp,error:xpError})=>{
  if(!achievementPanel.isConnected)return;
  if(xpError||xp===null){achievementPanel.textContent='No se pudo cargar el nivel.';return}
  const score=Number(xp)||0,level=Math.floor(Math.sqrt(score/100))+1;
  const badges=[['🌱 Primer paso',score>=5],['⭐ Participante',score>=50],['🔥 Miembro activo',score>=150],['🏆 Leyenda',score>=500]];
  achievementPanel.replaceChildren();const heading=document.createElement('h2');heading.textContent='🏆 Nivel '+level+' · '+score+' XP';achievementPanel.append(heading);
  const next=document.createElement('p');next.textContent='Próximo nivel: '+(100*level*level)+' XP';achievementPanel.append(next);
  const progress=document.createElement('progress');progress.max=100*level*level-100*(level-1)*(level-1);progress.value=score-100*(level-1)*(level-1);progress.style.cssText='width:100%;accent-color:#b15cff';progress.setAttribute('aria-label','Progreso hacia el próximo nivel');achievementPanel.append(progress);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';for(const [label,earned] of badges){const item=document.createElement('span');item.textContent=label+(earned?' ✓':' 🔒');item.style.cssText='padding:8px;border:1px solid #ffffff33;border-radius:10px;opacity:'+(earned?'1':'.45');row.append(item)}achievementPanel.append(row);
  if(typeof createRewardPanel==='function')achievementPanel.append(createRewardPanel(level));
  sb.rpc('community_streak_medals',{target_member:member.id}).then(({data:best,error})=>{if(!error&&best!==null&&achievementPanel.isConnected&&typeof createStreakMedalsPanel==='function')achievementPanel.append(createStreakMedalsPanel(Number(best)||0))});
 });
 const social=document.createElement('section');social.className='member-social';social.id='member-social';
 const gallery=document.createElement('section');gallery.className='member-gallery-panel';gallery.id='member-gallery';
 const messageLink=document.createElement('a');
 messageLink.className='gradient-btn mini member-private-message-link';
 messageLink.href='#/mensajes?id='+encodeURIComponent(member.id);
 messageLink.textContent='💬 Enviar mensaje privado';
 messageLink.setAttribute('aria-label','Enviar mensaje privado a '+name);
 const reportButton=document.createElement('button');reportButton.type='button';reportButton.className='outline-btn mini member-report-button';reportButton.textContent='🚩 Denunciar perfil';
 reportButton.onclick=async()=>{
  const {data:{user}}=await sb.auth.getUser();
  if(!user){location.hash='#/auth';return;}
  if(user.id===member.id){alert('No puedes denunciar tu propio perfil.');return;}
  if(content.querySelector('.member-report-form')){content.querySelector('.member-report-form').remove();return;}
  const form=document.createElement('form');form.className='member-report-form social-form';
  const label=document.createElement('label');label.textContent='Motivo de la denuncia';
  const reason=document.createElement('select');reason.required=true;
  for(const [value,text] of [['spam','Spam'],['harassment','Acoso'],['hate','Discurso de odio'],['inappropriate','Contenido inapropiado'],['other','Otro motivo']]){const option=document.createElement('option');option.value=value;option.textContent=text;reason.append(option);}
  label.append(reason);
  const detailLabel=document.createElement('label');detailLabel.textContent='Detalles (opcional)';
  const details=document.createElement('textarea');details.maxLength=1000;details.rows=3;details.placeholder='Describe el problema sin incluir datos sensibles';detailLabel.append(details);
  const submit=document.createElement('button');submit.type='submit';submit.className='gradient-btn mini';submit.textContent='Enviar denuncia';
  const status=document.createElement('p');status.setAttribute('role','status');
  form.append(label,detailLabel,submit,status);
  form.onsubmit=async event=>{
   event.preventDefault();submit.disabled=true;status.textContent='Enviando…';
   const {error}=await sb.from('member_reports').insert({reporter_id:user.id,reported_member_id:member.id,reason:reason.value,details:details.value.trim(),status:'pending'});
   if(error){status.textContent=error.code==='23505'?'Ya has denunciado este perfil.':'No se pudo enviar: '+error.message;submit.disabled=false;return;}
   form.replaceChildren(document.createTextNode('✅ Denuncia enviada al equipo de administración.'));
  };
  reportButton.after(form);
 };
 content.append(messageLink,reportButton,gallery,social,back);root.append(cover,content);
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
function appendReportButton(container,targetId,type,viewerId){
 if(!viewerId)return;
 const button=document.createElement('button');button.type='button';button.className='social-report';button.textContent='⚑ Reportar';
 button.onclick=async()=>{
  const reasons={spam:'Spam',harassment:'Acoso',hate:'Discurso de odio',inappropriate:'Contenido inapropiado',other:'Otro motivo'};
  const choice=prompt('Motivo del reporte: escribe spam, harassment, hate, inappropriate u other');
  if(choice===null)return;
  const reason=choice.trim().toLowerCase();
  if(!Object.hasOwn(reasons,reason)){alert('Motivo no válido. Usa una de las opciones indicadas.');return;}
  const details=prompt('Describe el problema (opcional, máximo 1000 caracteres):','');
  if(details===null)return;
  if(details.length>1000){alert('La descripción es demasiado larga.');return;}
  if(!confirm('¿Enviar este reporte al equipo de administración?'))return;
  button.disabled=true;
  const payload={reporter_id:viewerId,reason,details};
  payload[type==='comment'?'comment_id':'post_id']=targetId;
  const {error}=await sb.from('member_reports').insert(payload);
  if(error){alert(error.code==='23505'?'Ya has reportado este contenido.':'No se pudo enviar el reporte: '+error.message);button.disabled=false;return;}
  button.textContent='✓ Reportado';
 };
 container.append(button);
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
  article.append(likes,profile);appendReportButton(article,post.id,'post',user?.id);root.append(article);
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
function notificationDestination(n){return n.kind==='gift'?'#/regalos':n.post_id?'#/cuenta?post='+encodeURIComponent(n.post_id):(n.actor_id?'#/perfil?id='+encodeURIComponent(n.actor_id):'#/notificaciones');}
function focusNotificationPost(root,id){if(!id||!root?.isConnected)return;const el=[...root.querySelectorAll('[data-post-id]')].find(x=>x.dataset.postId===id);if(el){el.classList.add('notification-target-post');el.scrollIntoView({behavior:'smooth',block:'center'});}}
async function loadMemberNotifications(){
 const root=document.getElementById('member-notifications');if(!root)return;
 const {data:{user}}=await sb.auth.getUser();
 if(!root.isConnected)return;root.replaceChildren();
 if(!user){const link=document.createElement('a');link.href='#/auth';link.className='gradient-btn mini';link.textContent='Inicia sesión para ver tus notificaciones';root.append(link);return;}
 const [communityResult,reportsResult,messagesResult]=await Promise.all([
  sb.from('member_notifications').select('id,actor_id,kind,post_id,gift_id,created_at,is_read,dismissed_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(100),
  sb.from('member_report_notifications').select('id,status,created_at,is_read,dismissed_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(100),
  sb.from('member_direct_messages').select('id,sender_id,created_at,is_read').eq('recipient_id',user.id).eq('is_read',false).order('created_at',{ascending:false}).limit(100)
 ]);
 if(!root.isConnected)return;
 if(communityResult.error||reportsResult.error||messagesResult.error){root.textContent='No se pudieron cargar todas las notificaciones. Inténtalo de nuevo.';return;}
 const community=communityResult.data||[],reports=reportsResult.data||[],messages=messagesResult.data||[];
 const ids=[...new Set([...community.map(x=>x.actor_id),...messages.map(x=>x.sender_id)].filter(Boolean))];
 const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
 const items=[
  ...community.map(n=>({...n,category:'community',title:(names.get(n.actor_id)||'Un miembro')+(n.kind==='gift'?' te envió un regalo.':n.kind==='follow'?' empezó a seguirte.':n.kind==='like'?' dio Me gusta a tu publicación.':' comentó tu publicación.'),href:notificationDestination(n),table:'member_notifications'})),
  ...reports.map(n=>({...n,category:'reports',title:'Tu denuncia fue '+(n.status==='reviewed'?'revisada.':'descartada.'),href:'#/cuenta',table:'member_report_notifications'})),
  ...messages.map(n=>({...n,category:'messages',title:'Mensaje privado de '+(names.get(n.sender_id)||'un miembro'),href:'#/mensajes?id='+encodeURIComponent(n.sender_id),table:null}))
 ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const heading=document.createElement('h2');heading.textContent='🔔 Centro de notificaciones';root.append(heading);
 const controls=document.createElement('div');controls.className='notification-center-controls';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filtrar notificaciones');
 for(const [value,label] of [['all','Todas'],['community','Comunidad'],['messages','Mensajes privados'],['reports','Denuncias'],['unread','Sin leer'],['archived','Archivadas']]){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}
 const search=document.createElement('input');search.type='search';search.placeholder='Buscar notificaciones';search.setAttribute('aria-label','Buscar notificaciones');
 const dateFilter=document.createElement('select');dateFilter.setAttribute('aria-label','Filtrar por fecha');for(const [value,label] of [['all','Cualquier fecha'],['today','Hoy'],['week','Últimos 7 días'],['month','Últimos 30 días']]){const option=document.createElement('option');option.value=value;option.textContent=label;dateFilter.append(option);}
 const counters=document.createElement('p');counters.className='notification-center-counts';
 const summary=document.createElement('span');summary.setAttribute('role','status');
 const markAll=document.createElement('button');markAll.type='button';markAll.className='outline-btn mini';markAll.textContent='Marcar avisos como leídos';
 controls.append(filter,search,dateFilter,markAll,summary);root.append(counters,controls);
 const list=document.createElement('div');root.append(list);
 const draw=()=>{
  list.replaceChildren();
  const active=items.filter(n=>!n.dismissed_at);const unread=active.filter(n=>!n.is_read);counters.textContent='Sin leer: '+unread.length+' · Comunidad: '+unread.filter(n=>n.category==='community').length+' · Mensajes: '+unread.filter(n=>n.category==='messages').length+' · Denuncias: '+unread.filter(n=>n.category==='reports').length;
  const now=Date.now();const limit=dateFilter.value==='today'?new Date().setHours(0,0,0,0):dateFilter.value==='week'?now-7*86400000:dateFilter.value==='month'?now-30*86400000:0;
  const visible=items.filter(n=>(filter.value==='archived'?!!n.dismissed_at:!n.dismissed_at)&&(filter.value==='all'||filter.value==='archived'||(filter.value==='unread'?!n.is_read:n.category===filter.value))&&n.title.toLocaleLowerCase('es').includes(search.value.trim().toLocaleLowerCase('es'))&&new Date(n.created_at).getTime()>=limit);
  summary.textContent=visible.length+' notificaciones';
  markAll.disabled=!items.some(n=>!n.is_read&&n.table&&!n.dismissed_at);
  if(!visible.length){list.textContent='No hay notificaciones en esta categoría.';return;}
  for(const n of visible){
   const row=document.createElement('article');row.className='notification-item notification-center-item'+(n.is_read?'':' unread');
   const title=document.createElement('strong');title.textContent=n.title;
   const date=document.createElement('small');date.textContent=new Date(n.created_at).toLocaleString('es-ES');
   const link=document.createElement('a');link.href=n.href;link.className='notification-jump';link.textContent='Ver';
   row.append(title,date,link);
   if(n.table){
    if(!n.is_read&&!n.dismissed_at){const mark=document.createElement('button');mark.type='button';mark.className='outline-btn mini';mark.textContent='Marcar leída';mark.onclick=async()=>{mark.disabled=true;const {error}=await sb.from(n.table).update({is_read:true}).eq('id',n.id).eq('recipient_id',user.id);if(error){mark.disabled=false;return;}n.is_read=true;draw();refreshNotificationBadge(user.id);};row.append(mark);}
    const hide=document.createElement('button');hide.type='button';hide.className='outline-btn mini';hide.textContent=n.dismissed_at?'Restaurar aviso':'Archivar aviso';hide.onclick=async()=>{hide.disabled=true;const next=n.dismissed_at?null:new Date().toISOString();const {error}=await sb.from(n.table).update({dismissed_at:next}).eq('id',n.id).eq('recipient_id',user.id);if(error){hide.disabled=false;return;}n.dismissed_at=next;draw();refreshNotificationBadge(user.id);};row.append(hide);
   }
   list.append(row);
  }
 };
 markAll.onclick=async()=>{
  markAll.disabled=true;
  const results=await Promise.all(['member_notifications','member_report_notifications'].map(table=>sb.from(table).update({is_read:true}).eq('recipient_id',user.id).eq('is_read',false).is('dismissed_at',null)));
  if(results.some(x=>x.error)){summary.textContent='No se pudieron marcar todos los avisos.';markAll.disabled=false;return;}
  for(const n of items)if(n.table&&!n.dismissed_at)n.is_read=true;
  draw();refreshNotificationBadge(user.id);
 };
 filter.onchange=draw;search.oninput=draw;dateFilter.onchange=draw;draw();
 if(window.notificationCenterChannel){sb.removeChannel(window.notificationCenterChannel);window.notificationCenterChannel=null;}
 window.notificationCenterChannel=sb.channel('notification-center-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'member_notifications',filter:'recipient_id=eq.'+user.id},()=>{if(root.isConnected)loadMemberNotifications();}).on('postgres_changes',{event:'*',schema:'public',table:'member_report_notifications',filter:'recipient_id=eq.'+user.id},()=>{if(root.isConnected)loadMemberNotifications();}).on('postgres_changes',{event:'*',schema:'public',table:'member_direct_messages',filter:'recipient_id=eq.'+user.id},()=>{if(root.isConnected)loadMemberNotifications();}).subscribe();
}

async function refreshNotificationBadge(expectedUserId){
 const badge=document.getElementById('notification-count');
 const bell=document.getElementById('notification-bell');
 if(!badge||!bell)return;
 const {count,error}=await sb.from('member_notifications').select('id',{count:'exact',head:true}).eq('is_read',false).is('dismissed_at',null);
 if(!badge.isConnected||!bell.isConnected)return;
 if(error){console.warn('No se pudieron cargar las notificaciones:',error.message);return;}
 const {count:messageCount}=await sb.from('member_direct_messages').select('id',{count:'exact',head:true}).eq('recipient_id',expectedUserId).eq('is_read',false);
 const {count:reportCount,error:reportError}=await sb.from('member_report_notifications').select('id',{count:'exact',head:true}).eq('recipient_id',expectedUserId).eq('is_read',false).is('dismissed_at',null);
 if(!badge.isConnected||!bell.isConnected)return;
 const total=(count||0)+(messageCount||0)+(reportError?0:(reportCount||0));
 badge.hidden=total===0;
 badge.textContent=total>99?'99+':String(total);
 bell.setAttribute('aria-label',total?'Notificaciones: '+total+' sin leer':'Notificaciones: ninguna sin leer');
 bell.title=total?total+' notificaciones sin leer':'Notificaciones';
}

async function renderAccountBlockedMembers(userId){
 const panel=document.getElementById('account-blocked-members');if(!panel)return;
 panel.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='🚫 Miembros bloqueados';panel.append(heading);
 const {data:blocks,error}=await sb.from('member_blocks').select('blocked_id').eq('blocker_id',userId);
 if(error){const p=document.createElement('p');p.textContent='No se pudieron cargar los bloqueos: '+error.message;panel.append(p);return;}
 if(!blocks?.length){const p=document.createElement('p');p.textContent='No tienes miembros bloqueados.';panel.append(p);return;}
 const {data:profiles}=await sb.from('profiles').select('id,display_name,username').in('id',blocks.map(b=>b.blocked_id));
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
 for(const block of blocks){
  const row=document.createElement('div');row.className='member-block-row';
  const name=document.createElement('span');name.textContent=names.get(block.blocked_id)||'Miembro';
  const button=document.createElement('button');button.type='button';button.textContent='🔓 Desbloquear';button.className='private-chat-archive-action';
  button.onclick=async()=>{button.disabled=true;const {error:removeError}=await sb.from('member_blocks').delete().eq('blocker_id',userId).eq('blocked_id',block.blocked_id);if(removeError){alert(removeError.message);button.disabled=false;return;}await renderAccountBlockedMembers(userId);};
  row.append(name,button);panel.append(row);
 }
}

let multiVideoSession=null;
async function joinMultiVideoRoom(room,group,userId,thread,say){
 if(multiVideoSession||groupCallSession){say('Finaliza tu llamada actual primero.');return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){say('Este navegador no permite videollamadas.');return;}
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});}
 catch(e){say('No se pudo abrir cámara o micrófono: '+e.message);return;}
 const {error:joinError}=await sb.from('member_group_video_participants').upsert({room_id:room.id,user_id:userId});
 if(joinError){stream.getTracks().forEach(t=>t.stop());say('No se pudo entrar en la sala: '+joinError.message);return;}
 const panel=document.createElement('section');panel.className='group-call-panel group-multi-video';
 const title=document.createElement('h4');title.textContent='📹 Videollamada grupal';
 const videos=document.createElement('div');videos.className='group-multi-video-grid';
 const {data:memberProfiles}=await sb.from('profiles').select('id,display_name,username,avatar_url').in('id',(await sb.from('member_chat_group_members').select('user_id').eq('group_id',group.id)).data?.map(m=>m.user_id)||[userId]);

 const profileMap=new Map((memberProfiles||[]).map(p=>[p.id,p]));
 function videoTile(id,video){
  const tile=document.createElement('div');tile.className='group-video-tile';
  const profile=profileMap.get(id),name=document.createElement('span');name.textContent=(profile?.display_name||profile?.username||'Miembro')+(id===userId?' (tú)':'');
  if(profile?.avatar_url){const avatar=document.createElement('img');avatar.className='group-video-avatar';avatar.alt='Avatar de '+name.textContent;avatar.referrerPolicy='no-referrer';avatar.src=profile.avatar_url;tile.append(avatar);}
  tile.append(video,name);videos.append(tile);return tile;
 }
 const local=document.createElement('video');local.autoplay=true;local.muted=true;local.playsInline=true;local.srcObject=stream;videoTile(userId,local);
 const actions=document.createElement('div');actions.className='group-call-actions';
 const invites=document.createElement('div');invites.className='group-video-invites';
 const inviteSelect=document.createElement('select');inviteSelect.setAttribute('aria-label','Invitar miembro');
 const inviteButton=document.createElement('button');inviteButton.type='button';inviteButton.textContent='✉️ Invitar';
 inviteButton.onclick=async()=>{if(!inviteSelect.value)return;const {error}=await sb.from('member_group_video_invites').insert({room_id:room.id,inviter_id:userId,invitee_id:inviteSelect.value});say(error?'No se pudo invitar: '+error.message:'Invitación enviada.');};
 invites.append(inviteSelect,inviteButton);
 const moderator=document.createElement('div');moderator.className='group-video-moderator';
 const {data:myRole}=await sb.from('member_chat_group_members').select('role').eq('group_id',group.id).eq('user_id',userId).maybeSingle();
 const canModerate=group.owner_id===userId||myRole?.role==='admin';
 if(canModerate){
  const kickSelect=document.createElement('select');kickSelect.setAttribute('aria-label','Participante a expulsar');
  const kick=document.createElement('button');kick.type='button';kick.textContent='🛡️ Expulsar participante';
  kick.onclick=async()=>{if(!kickSelect.value)return;if(!confirm('¿Expulsar a este participante de la sala?'))return;const {error}=await sb.rpc('moderate_group_video_participant',{p_room_id:room.id,p_target_id:kickSelect.value});say(error?'No se pudo expulsar: '+error.message:'Participante expulsado.');};
  moderator.append(kickSelect,kick);
  moderator.refresh=(ids)=>{kickSelect.replaceChildren();for(const id of ids){if(id===userId)continue;const o=document.createElement('option');o.value=id;o.textContent=profileMap.get(id)?.display_name||profileMap.get(id)?.username||'Miembro';kickSelect.append(o);}};
 }

 const mic=document.createElement('button');mic.type='button';mic.textContent='🎙️ Silenciar';
 mic.onclick=()=>{const track=stream.getAudioTracks()[0];if(track){track.enabled=!track.enabled;mic.textContent=track.enabled?'🎙️ Silenciar':'🔇 Activar micrófono';}};
 const camera=document.createElement('button');camera.type='button';camera.textContent='📷 Apagar cámara';
 camera.onclick=()=>{const track=stream.getVideoTracks()[0];if(track){track.enabled=!track.enabled;camera.textContent=track.enabled?'📷 Apagar cámara':'📷 Encender cámara';}};
 const share=document.createElement('button');share.type='button';share.textContent='🖥️ Compartir pantalla';
 const leave=document.createElement('button');leave.type='button';leave.textContent='🔴 Salir de la sala';
 actions.append(mic,camera,share,leave);panel.append(title,videos,actions,invites,moderator);thread.prepend(panel);
 const peers=new Map();let lastSignal=0,busy=false,screenStream=null,originalVideo=null,closed=false;
 const sendSignal=async(to,signal)=>{const {error}=await sb.from('member_group_video_signals').insert({room_id:room.id,sender_id:userId,recipient_id:to,signal});if(error)console.warn('Señal de vídeo:',error.message);};
 const createPeer=(other)=>{
  if(peers.has(other))return peers.get(other);
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  const video=document.createElement('video');video.autoplay=true;video.playsInline=true;video.controls=true;const tile=videoTile(other,video);
  pc.ontrack=e=>{video.srcObject=e.streams[0];video.play().catch(()=>{});};
  pc.onicecandidate=e=>{if(e.candidate)sendSignal(other,{type:'ice',candidate:e.candidate.toJSON()});};
  const peer={pc,video,tile,pending:[]};peers.set(other,peer);
  return peer;
 };
 async function offerPeer(other){
  const peer=createPeer(other);const offer=await peer.pc.createOffer();await peer.pc.setLocalDescription(offer);
  await sendSignal(other,{type:'offer',sdp:peer.pc.localDescription.toJSON()});
 }
 async function handleSignal(row){
  const other=row.sender_id,msg=row.signal;if(!msg||!other)return;
  const peer=createPeer(other),pc=peer.pc;
  if(msg.type==='offer'){
   await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
   const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
   await sendSignal(other,{type:'answer',sdp:pc.localDescription.toJSON()});
  }else if(msg.type==='answer'&&pc.signalingState==='have-local-offer'){
   await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  }else if(msg.type==='ice'){
   if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
   else peer.pending.push(msg.candidate);
  }
  if(pc.remoteDescription&&peer.pending.length){
   for(const c of peer.pending.splice(0))await pc.addIceCandidate(new RTCIceCandidate(c));
  }
 }
 async function tick(){
  if(busy||closed)return;busy=true;
  try{
   const {data:roomState}=await sb.from('member_group_video_rooms').select('status').eq('id',room.id).maybeSingle();
   if(!roomState||roomState.status!=='open'){say('La sala de vídeo se ha cerrado.');await leaveRoom();return;}
   const {data:participants}=await sb.from('member_group_video_participants').select('user_id').eq('room_id',room.id);
   const active=new Set((participants||[]).map(p=>p.user_id));
   if(!active.has(userId)){say('Un moderador te ha retirado de la sala.');await leaveRoom();return;}
   inviteSelect.replaceChildren();for(const [id,p] of profileMap){if(id===userId||active.has(id))continue;const o=document.createElement('option');o.value=id;o.textContent=p.display_name||p.username||'Miembro';inviteSelect.append(o);}
   if(moderator.refresh)moderator.refresh(active);
   for(const [id,peer] of peers)if(!active.has(id)){peer.pc.close();peer.tile.remove();peers.delete(id);}
   // Only the newer participant creates offers, avoiding simultaneous negotiation.
   for(const p of participants||[])if(p.user_id!==userId&&!peers.has(p.user_id)&&userId>p.user_id)await offerPeer(p.user_id);
   const {data:signals}=await sb.from('member_group_video_signals').select('id,sender_id,signal').eq('room_id',room.id).eq('recipient_id',userId).gt('id',lastSignal).order('id').limit(100);
   for(const row of signals||[]){lastSignal=row.id;try{await handleSignal(row);}catch(e){console.warn('Señal WebRTC:',e.message);}}
  }catch(e){console.warn('Sala de vídeo:',e.message);}finally{busy=false;}
 }
 async function stopShare(){
  if(!screenStream)return;
  for(const {pc} of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(originalVideo);}
  screenStream.getTracks().forEach(t=>t.stop());screenStream=null;originalVideo=null;local.srcObject=stream;share.textContent='🖥️ Compartir pantalla';
 }
 share.onclick=async()=>{
  if(screenStream){await stopShare();return;}
  try{
   const display=await navigator.mediaDevices.getDisplayMedia({video:true});
   screenStream=display;originalVideo=stream.getVideoTracks()[0];
   for(const {pc} of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(display.getVideoTracks()[0]);}
   local.srcObject=display;share.textContent='🛑 Dejar de compartir';
   display.getVideoTracks()[0].onended=()=>stopShare().catch(console.warn);
  }catch(e){say('No se pudo compartir pantalla: '+e.message);}
 };
 async function leaveRoom(){
  if(closed)return;closed=true;clearInterval(session.timer);
  for(const {pc,tile} of peers.values()){pc.close();tile.remove();}
  screenStream?.getTracks().forEach(t=>t.stop());stream.getTracks().forEach(t=>t.stop());
  await sb.from('member_group_video_participants').delete().eq('room_id',room.id).eq('user_id',userId);
  if(room.created_by===userId)await sb.from('member_group_video_rooms').update({status:'closed'}).eq('id',room.id);
  panel.remove();if(multiVideoSession===session)multiVideoSession=null;
 }
 leave.onclick=leaveRoom;
 const session={timer:null,leave:leaveRoom};multiVideoSession=session;
 session.timer=setInterval(tick,1600);tick();
}

let groupCallSession=null;
function stopGroupCallSession(){
 const session=groupCallSession;if(!session)return;
 groupCallSession=null;clearInterval(session.timer);
 session.pc?.close();session.screenStream?.getTracks().forEach(t=>t.stop());session.stream?.getTracks().forEach(t=>t.stop());
 session.container?.remove();
}
async function startGroupPeerCall(group,userId,members,thread,say,kind,calleeId,incoming=null){
 if(groupCallSession){say('Finaliza la llamada actual antes de iniciar otra.');return;}
 if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia){say('Tu navegador no permite llamadas WebRTC.');return;}
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==='video'});}
 catch(e){say('No se pudo acceder al micrófono o cámara: '+e.message);return;}
 const panel=document.createElement('div');panel.className='group-call-panel';
 const label=document.createElement('p');label.textContent=(incoming?'📞 Llamada entrante':'📞 Llamando')+' · '+(kind==='video'?'Vídeo':'Voz');
 const local=document.createElement('video');local.autoplay=true;local.muted=true;local.playsInline=true;local.srcObject=stream;local.hidden=kind!=='video';
 const remote=document.createElement('video');remote.autoplay=true;remote.playsInline=true;remote.controls=true;
 const controls=document.createElement('div');controls.className='group-call-actions';
 const mic=document.createElement('button');mic.type='button';mic.textContent='🎙️ Silenciar';
 mic.onclick=()=>{const track=stream.getAudioTracks()[0];if(!track)return;track.enabled=!track.enabled;mic.textContent=track.enabled?'🎙️ Silenciar':'🔇 Activar micrófono';};
 controls.append(mic);
 const camera=document.createElement('button');camera.type='button';camera.textContent='📷 Apagar cámara';camera.hidden=kind!=='video';
 camera.onclick=()=>{const track=stream.getVideoTracks()[0];if(!track)return;track.enabled=!track.enabled;camera.textContent=track.enabled?'📷 Apagar cámara':'📷 Encender cámara';};
 controls.append(camera);
 const screen=document.createElement('button');screen.type='button';screen.textContent='🖥️ Compartir pantalla';screen.hidden=kind!=='video';
 controls.append(screen);
 const hang=document.createElement('button');hang.type='button';hang.textContent='🔴 Colgar';
 controls.append(hang);panel.append(label,local,remote,controls);thread.prepend(panel);thread.prepend(panel);
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
 stream.getTracks().forEach(track=>pc.addTrack(track,stream));
 pc.ontrack=e=>{remote.srcObject=e.streams[0];remote.play().catch(()=>{label.textContent='Pulsa reproducir para escuchar la llamada.';});};
 let call=incoming,seenIce=0,busy=false;
 const session={pc,stream,container:panel,timer:null,screenStream:null};groupCallSession=session;
 let originalVideoTrack=null;
 async function stopSharing(){
  const sender=pc.getSenders().find(s=>s.track?.kind==='video');
  if(originalVideoTrack&&sender){await sender.replaceTrack(originalVideoTrack);local.srcObject=stream;}
  session.screenStream?.getTracks().forEach(t=>t.stop());session.screenStream=null;
  originalVideoTrack=null;screen.textContent='🖥️ Compartir pantalla';
 }
 screen.onclick=async()=>{
  if(session.screenStream){await stopSharing();return;}
  if(!navigator.mediaDevices.getDisplayMedia){say('Compartir pantalla no está disponible en este navegador.');return;}
  try{
   const display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
   const track=display.getVideoTracks()[0],sender=pc.getSenders().find(s=>s.track?.kind==='video');
   if(!sender){display.getTracks().forEach(t=>t.stop());say('No hay canal de vídeo para compartir.');return;}
   originalVideoTrack=sender.track;session.screenStream=display;
   await sender.replaceTrack(track);local.srcObject=display;screen.textContent='🛑 Dejar de compartir';
   track.onended=()=>{if(groupCallSession===session)stopSharing().catch(console.warn);};
  }catch(e){say('No se pudo compartir pantalla: '+e.message);}
 };
 const pendingIce=[];
 pc.onicecandidate=e=>{if(!e.candidate)return;const candidate=e.candidate.toJSON();if(!call?.id){pendingIce.push(candidate);return;}sb.from('member_group_call_ice').insert({call_id:call.id,sender_id:userId,candidate}).then(({error})=>{if(error)console.warn('ICE:',error.message);});};
 async function endCall(){
  if(call)await sb.from('member_group_calls').update({status:'ended',updated_at:new Date().toISOString()}).eq('id',call.id);
  if(groupCallSession===session)stopGroupCallSession();
 }
 hang.onclick=endCall;
 try{
  if(!incoming){
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   const {data,error}=await sb.from('member_group_calls').insert({group_id:group.id,caller_id:userId,callee_id:calleeId,kind,offer:pc.localDescription.toJSON()}).select().single();
   if(error)throw error;call=data;
  }else{
   await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
   const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
   const {data,error}=await sb.from('member_group_calls').update({answer:pc.localDescription.toJSON(),status:'active',updated_at:new Date().toISOString()}).eq('id',incoming.id).select().single();
   if(error)throw error;call=data;
  }
  for(const candidate of pendingIce)await sb.from('member_group_call_ice').insert({call_id:call.id,sender_id:userId,candidate});
  async function poll(){
   if(busy||groupCallSession!==session)return;busy=true;
   try{
    const {data:latest}=await sb.from('member_group_calls').select('status,answer').eq('id',call.id).single();
    if(!latest||['ended','declined'].includes(latest.status)){label.textContent='Llamada finalizada';stopGroupCallSession();return;}
    if(latest.answer&&!pc.currentRemoteDescription&&userId===call.caller_id){
     await pc.setRemoteDescription(new RTCSessionDescription(latest.answer));label.textContent='🟢 Llamada conectando…';
    }
    const {data:ice}=await sb.from('member_group_call_ice').select('id,candidate,sender_id').eq('call_id',call.id).gt('id',seenIce).order('id').limit(100);
    for(const item of ice||[]){seenIce=Math.max(seenIce,item.id);if(item.sender_id!==userId){try{await pc.addIceCandidate(new RTCIceCandidate(item.candidate));}catch(e){console.warn('ICE pendiente',e.message);}}}
   }finally{busy=false;}
  }
  session.timer=setInterval(poll,1500);poll();
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')label.textContent='🟢 Llamada conectada';if(pc.connectionState==='failed')label.textContent='No se pudo conectar. Puede hacer falta un servidor TURN.';};
 }catch(e){say('No se pudo iniciar la llamada: '+e.message);stopGroupCallSession();}
}

let activeGroupChatChannel=null;
let groupChatAlertsChannel=null;
async function initGroupChats(userId,root){
 if(activeGroupChatChannel){sb.removeChannel(activeGroupChatChannel);activeGroupChatChannel=null;}
 if(groupChatAlertsChannel){sb.removeChannel(groupChatAlertsChannel);groupChatAlertsChannel=null;}
 const section=document.createElement('section');section.className='profile-panel group-chat-panel';
 section.innerHTML='<h3>👥 Conversaciones grupales</h3><p>Crea grupos privados y conversa con sus miembros.</p><form id="group-create-form"><input name="groupName" required minlength="3" maxlength="60" placeholder="Nombre del grupo" aria-label="Nombre del grupo"><button type="submit" class="gradient-btn mini">Crear grupo</button></form><p id="group-chat-status" role="status"></p><div id="group-chat-list">Cargando grupos…</div><div id="group-chat-thread"></div>';
 root.prepend(section);
 const alertBanner=document.createElement('p');alertBanner.className='group-chat-alert';alertBanner.setAttribute('role','status');alertBanner.setAttribute('aria-live','polite');section.insertBefore(alertBanner,section.querySelector('#group-chat-list'));
 const status=section.querySelector('#group-chat-status'),list=section.querySelector('#group-chat-list'),thread=section.querySelector('#group-chat-thread');
 const say=t=>{status.textContent=t;};
 let currentGroup=null;
 async function showGroup(group){
  currentGroup=group;
  const {error:readError}=await sb.from('member_chat_group_reads').upsert({group_id:group.id,user_id:userId,last_read_at:new Date().toISOString()},{onConflict:'group_id,user_id'});
  if(readError)console.warn('No se pudo marcar el grupo como leído:',readError.message);
  thread.replaceChildren();
  const heading=document.createElement('h4');heading.textContent=group.name;thread.append(heading);
  const {data:members,error:membersError}=await sb.from('member_chat_group_members').select('user_id,role').eq('group_id',group.id);
  if(membersError){say('No se pudieron cargar los participantes.');return;}
  const count=document.createElement('p');count.textContent=(members||[]).length+' participantes';thread.append(count);
  const callControls=document.createElement('div');callControls.className='group-call-controls';
  const calleeSelect=document.createElement('select');calleeSelect.setAttribute('aria-label','Miembro al que llamar');
  const choose=document.createElement('option');choose.value='';choose.textContent='Selecciona a quién llamar';calleeSelect.append(choose);
  const callIds=(members||[]).map(m=>m.user_id).filter(id=>id!==userId);
  const {data:callProfiles}=callIds.length?await sb.from('profiles').select('id,display_name,username').in('id',callIds):{data:[]};
  const callNames=new Map((callProfiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
  for(const id of callIds){const option=document.createElement('option');option.value=id;option.textContent=callNames.get(id)||'Miembro';calleeSelect.append(option);}
  callControls.append(calleeSelect);
  for(const [kind,text] of [['audio','📞 Llamar'],['video','📹 Videollamada']]){
   const button=document.createElement('button');button.type='button';button.textContent=text;
   button.onclick=()=>{if(!calleeSelect.value){say('Selecciona primero un miembro.');return;}startGroupPeerCall(group,userId,members,thread,say,kind,calleeSelect.value);};
   callControls.append(button);
  }
  const multiStart=document.createElement('button');multiStart.type='button';multiStart.textContent='📹 Iniciar videollamada grupal';
  const multiJoin=document.createElement('button');multiJoin.type='button';multiJoin.textContent='👥 Unirse a videollamada grupal';
  const inviteNotice=document.createElement('p');inviteNotice.setAttribute('role','status');callControls.append(inviteNotice);
  async function checkVideoInvites(){
   if(!thread.isConnected)return;
   const {data}=await sb.from('member_group_video_invites').select('room_id,created_at').eq('invitee_id',userId).order('created_at',{ascending:false}).limit(10);
   const {data:open}=await sb.from('member_group_video_rooms').select('id').eq('group_id',group.id).eq('status','open');
   const ids=new Set((open||[]).map(r=>r.id));inviteNotice.textContent=(data||[]).some(i=>ids.has(i.room_id))?'✉️ Tienes una invitación para esta videollamada. Pulsa Unirse.':'';
  }
  checkVideoInvites();const inviteTimer=setInterval(()=>{if(!thread.isConnected){clearInterval(inviteTimer);return;}checkVideoInvites();},5000);
  multiStart.onclick=async()=>{
   const {data:existing}=await sb.from('member_group_video_rooms').select('*').eq('group_id',group.id).eq('status','open').maybeSingle();
   if(existing){say('Ya hay una sala abierta. Pulsa Unirse.');return;}
   const {data:room,error}=await sb.from('member_group_video_rooms').insert({group_id:group.id,created_by:userId}).select().single();
   if(error){say('No se pudo crear la sala: '+error.message);return;}
   await joinMultiVideoRoom(room,group,userId,thread,say);
  };
  multiJoin.onclick=async()=>{
   const {data:room,error}=await sb.from('member_group_video_rooms').select('*').eq('group_id',group.id).eq('status','open').maybeSingle();
   if(error||!room){say('No hay ninguna videollamada grupal activa.');return;}
   await joinMultiVideoRoom(room,group,userId,thread,say);
  };
  callControls.append(multiStart,multiJoin);
  thread.append(callControls);
  const incomingCalls=document.createElement('div');incomingCalls.className='group-call-incoming';thread.append(incomingCalls);
  async function checkIncomingCalls(){
   if(!thread.isConnected||groupCallSession)return;
   const {data}=await sb.from('member_group_calls').select('id,group_id,caller_id,callee_id,kind,status,offer').eq('group_id',group.id).eq('callee_id',userId).eq('status','ringing').order('created_at',{ascending:false}).limit(1);
   incomingCalls.replaceChildren();const call=data?.[0];if(!call)return;
   const notice=document.createElement('span');notice.textContent='📲 '+(callNames.get(call.caller_id)||'Miembro')+' te llama ('+(call.kind==='video'?'vídeo':'voz')+')';
   const accept=document.createElement('button');accept.textContent='Aceptar';accept.onclick=()=>startGroupPeerCall(group,userId,members,thread,say,call.kind,call.caller_id,call);
   const reject=document.createElement('button');reject.textContent='Rechazar';reject.onclick=async()=>{await sb.from('member_group_calls').update({status:'declined'}).eq('id',call.id);incomingCalls.replaceChildren();};
   incomingCalls.append(notice,accept,reject);
  }
  checkIncomingCalls();
  const incomingTimer=setInterval(()=>{if(!thread.isConnected){clearInterval(incomingTimer);return;}checkIncomingCalls();},3000);
  if(group.owner_id===userId){
   const adminForm=document.createElement('form');
   const adminSelect=document.createElement('select');adminSelect.required=true;adminSelect.setAttribute('aria-label','Elegir administrador');
   const defaultAdmin=document.createElement('option');defaultAdmin.value='';defaultAdmin.textContent='Elegir miembro para administrar';adminSelect.append(defaultAdmin);
   const memberIds=(members||[]).filter(m=>m.user_id!==userId).map(m=>m.user_id);
   const {data:adminProfiles}=memberIds.length?await sb.from('profiles').select('id,display_name,username').in('id',memberIds):{data:[]};
   const memberNames=new Map((adminProfiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
   for(const m of members||[]){if(m.user_id===userId)continue;const option=document.createElement('option');option.value=m.user_id;option.textContent=(memberNames.get(m.user_id)||'Miembro')+(m.role==='admin'?' 👑':'');adminSelect.append(option);}
   const roleSelect=document.createElement('select');roleSelect.setAttribute('aria-label','Rol del miembro');
   for(const [value,label] of [['admin','👑 Administrador'],['member','Miembro']]){const option=document.createElement('option');option.value=value;option.textContent=label;roleSelect.append(option);}
   const roleButton=document.createElement('button');roleButton.type='submit';roleButton.textContent='Guardar rol';adminForm.append(adminSelect,roleSelect,roleButton);
   adminForm.onsubmit=async e=>{e.preventDefault();roleButton.disabled=true;const {error}=await sb.rpc('manage_member_chat_role',{p_group:group.id,p_user:adminSelect.value,p_role:roleSelect.value});roleButton.disabled=false;say(error?'No se pudo cambiar el rol: '+error.message:'Rol actualizado.');if(!error)showGroup(group);};
   thread.append(adminForm);
   const add=document.createElement('form');add.className='group-chat-add';
   const selector=document.createElement('select');selector.required=true;selector.setAttribute('aria-label','Añadir miembro');
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Selecciona un miembro';selector.append(placeholder);
   const {data:profiles}=await sb.from('profiles').select('id,display_name,username').eq('is_public',true).limit(200);
   const existing=new Set((members||[]).map(m=>m.user_id));
   for(const p of profiles||[]){if(existing.has(p.id))continue;const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.display_name||p.username||'Miembro';selector.append(opt);}
   const button=document.createElement('button');button.type='submit';button.textContent='Añadir';add.append(selector,button);
   add.onsubmit=async e=>{e.preventDefault();button.disabled=true;const {error}=await sb.from('member_chat_group_members').insert({group_id:group.id,user_id:selector.value});say(error?'No se pudo añadir: '+error.message:'Miembro añadido.');button.disabled=false;if(!error)showGroup(group);};
   thread.append(add);
  }
  const messages=document.createElement('div');messages.className='group-chat-messages';thread.append(messages);
  async function refresh(){
   const {data,error}=await sb.from('member_chat_group_messages').select('id,sender_id,body,created_at,edited_at,deleted_at,image_path,audio_path').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100);
   if(currentGroup?.id!==group.id||!messages.isConnected)return;
   messages.replaceChildren();
   if(error){messages.textContent='No se pudieron cargar los mensajes.';return;}
   const ids=[...new Set((data||[]).map(m=>m.sender_id))];
   const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
   const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
   for(const m of data||[]){
    const item=document.createElement('p');const name=document.createElement('strong');name.textContent=(m.sender_id===userId?'Tú':names.get(m.sender_id)||'Miembro')+': ';const body=document.createElement('span');body.textContent=m.body;const time=document.createElement('small');time.textContent=' · '+new Date(m.created_at).toLocaleString('es-ES');item.append(name,body,time);
    if(!m.deleted_at&&(m.image_path||m.audio_path)){
     const path=m.image_path||m.audio_path;
     const {data:signed}=await sb.storage.from('member-group-chat').createSignedUrl(path,1800);
     if(signed?.signedUrl){
      const media=m.image_path?document.createElement('img'):document.createElement('audio');
      media.src=signed.signedUrl;media.controls=!!m.audio_path;media.className='group-chat-media';if(m.image_path){media.alt='Imagen enviada al grupo';media.loading='lazy';}
      item.append(media);
     }
    }
    if(m.edited_at&&!m.deleted_at){const edited=document.createElement('small');edited.textContent=' · editado';item.append(edited);}
    if(!m.deleted_at&&(m.sender_id===userId||group.owner_id===userId||(members||[]).some(x=>x.user_id===userId&&x.role==='admin'))){
     if(m.sender_id===userId){const edit=document.createElement('button');edit.type='button';edit.className='outline-btn mini';edit.textContent='Editar';edit.onclick=async()=>{const next=prompt('Editar mensaje',m.body);if(next===null||!next.trim()||next.trim()===m.body)return;const {error}=await sb.rpc('manage_member_chat_message',{p_message:m.id,p_body:next.trim(),p_delete:false});say(error?'No se pudo editar: '+error.message:'Mensaje editado.');if(!error)refresh();};item.append(edit);}
     const remove=document.createElement('button');remove.type='button';remove.className='outline-btn mini';remove.textContent='Eliminar';remove.onclick=async()=>{if(!confirm('¿Eliminar este mensaje?'))return;const {error}=await sb.rpc('manage_member_chat_message',{p_message:m.id,p_body:null,p_delete:true});say(error?'No se pudo eliminar: '+error.message:'Mensaje eliminado.');if(!error)refresh();};item.append(remove);
    }
    messages.append(item);
   }
   messages.scrollTop=messages.scrollHeight;
   if(currentGroup?.id===group.id)sb.from('member_chat_group_reads').upsert({group_id:group.id,user_id:userId,last_read_at:new Date().toISOString()},{onConflict:'group_id,user_id'}).then(()=>{});
  }
  const form=document.createElement('form');form.className='group-chat-send';
  const input=document.createElement('input');input.required=false;input.maxLength=2000;input.placeholder='Escribe un mensaje al grupo…';input.setAttribute('aria-label','Mensaje al grupo');
  const upload=document.createElement('input');upload.type='file';upload.accept='image/*,audio/*,.m4a,.aac,.3gp,.wav,.mp3,.ogg,.webm';upload.setAttribute('aria-label','Adjuntar imagen o audio');
  const record=document.createElement('button');record.type='button';record.textContent='🎙️ Grabar voz';record.className='group-chat-record-btn';
  const recordingStatus=document.createElement('small');recordingStatus.setAttribute('role','status');
  let recorder=null,recordStream=null,recordedFile=null;
  record.onclick=async()=>{
   if(recorder?.state==='recording'){recorder.stop();record.textContent='🎙️ Grabar voz';recordingStatus.textContent='Preparando audio…';return;}
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){recordingStatus.textContent='Este navegador no permite grabar voz. Puedes adjuntar un archivo de audio.';return;}
   try{
    recordedFile=null;recordStream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);
    const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{
     recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
     const type=recorder.mimeType.split(';')[0]||'audio/webm';
     const ext=type==='audio/mp4'?'m4a':type==='audio/ogg'?'ogg':'webm';
     recordedFile=new File(chunks,'nota-de-voz.'+ext,{type});
     recordingStatus.textContent='Nota de voz lista ('+Math.round(recordedFile.size/1024)+' KB). Pulsa Enviar.';
    };
    recorder.start();record.textContent='⏹️ Detener grabación';recordingStatus.textContent='Grabando nota de voz…';
   }catch(e){recordStream?.getTracks().forEach(t=>t.stop());recordingStatus.textContent='No se pudo acceder al micrófono: '+(e.message||'Permiso denegado');}
  };
  const send=document.createElement('button');send.type='submit';send.textContent='Enviar';form.append(record,recordingStatus,input,upload,send);
  form.onsubmit=async e=>{e.preventDefault();const body=input.value.trim(),file=recordedFile||upload.files?.[0];if(recorder?.state==='recording'){say('Detén la grabación antes de enviarla.');return;}if(!body&&!file)return;send.disabled=true;
   let image_path=null,audio_path=null;
   if(file){
    const allowed=['image/jpeg','image/png','image/webp','image/gif','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/x-m4a','audio/3gpp','audio/3gpp2'];
    if(!allowed.includes(file.type)||file.size>10485760){say('Archivo no permitido o mayor de 10 MB.');send.disabled=false;return;}
    const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','audio/webm':'webm','audio/mp4':'m4a','audio/mpeg':'mp3','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav','audio/aac':'aac','audio/x-m4a':'m4a','audio/3gpp':'3gp','audio/3gpp2':'3g2'})[file.type];
    const path=group.id+'/'+userId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:uploadError}=await sb.storage.from('member-group-chat').upload(path,file,{contentType:file.type});
    if(uploadError){say('No se pudo subir el archivo: '+uploadError.message);send.disabled=false;return;}
    if(file.type.startsWith('image/'))image_path=path;else audio_path=path;
   }
   const {error}=await sb.from('member_chat_group_messages').insert({group_id:group.id,sender_id:userId,body:body||(image_path?'📷 Imagen':'🎤 Audio'),image_path,audio_path});
   send.disabled=false;if(error)say('No se pudo enviar: '+error.message);else{input.value='';upload.value='';recordedFile=null;recordingStatus.textContent='';refresh();}};
  thread.append(form);
  if(activeGroupChatChannel)sb.removeChannel(activeGroupChatChannel);
  activeGroupChatChannel=sb.channel('group-chat-'+group.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'member_chat_group_messages',filter:'group_id=eq.'+group.id},refresh).on('postgres_changes',{event:'UPDATE',schema:'public',table:'member_chat_group_messages',filter:'group_id=eq.'+group.id},refresh).subscribe();
  refresh();
 }
 async function loadGroups(){
  const {data:members,error}=await sb.from('member_chat_group_members').select('group_id').eq('user_id',userId);
  if(!section.isConnected)return;
  list.replaceChildren();
  if(error){say('No se pudieron cargar los grupos.');return;}
  if(!members?.length){list.textContent='Aún no participas en ningún grupo.';return;}
  const {data:groups,error:groupError}=await sb.from('member_chat_groups').select('id,name,owner_id').in('id',members.map(m=>m.group_id)).order('created_at',{ascending:false});
  if(groupError){say('No se pudieron cargar los grupos.');return;}
  const {data:reads}=await sb.from('member_chat_group_reads').select('group_id,last_read_at').eq('user_id',userId);
  const readMap=new Map((reads||[]).map(x=>[x.group_id,x.last_read_at]));
  for(const group of groups||[]){
   const button=document.createElement('button');button.type='button';button.className='outline-btn mini';button.textContent='💬 '+group.name;
   const query=sb.from('member_chat_group_messages').select('id',{count:'exact',head:true}).eq('group_id',group.id).neq('sender_id',userId);
   const {count}=await (readMap.has(group.id)?query.gt('created_at',readMap.get(group.id)):query);
   if(count)button.textContent+=' 🔔 '+count+' nuevo'+(count===1?'':'s');
   button.onclick=async()=>{await showGroup(group);loadGroups();};list.append(button);
  }
 }
 section.querySelector('#group-create-form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget;const name=form.elements.groupName.value.trim();
  const {data,error}=await sb.rpc('create_member_chat_group',{p_name:name});
  if(error){say('No se pudo crear el grupo: '+error.message);return;}
  form.reset();say('Grupo creado correctamente.');await loadGroups();
  const {data:group}=await sb.from('member_chat_groups').select('id,name,owner_id').eq('id',data).single();if(group)showGroup(group);
 };
 loadGroups();
 groupChatAlertsChannel=sb.channel('group-chat-alerts-'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_chat_group_messages'},async payload=>{
   if(!section.isConnected)return;
   const message=payload.new;
   if(!message||message.sender_id===userId)return;
   const {data:member}=await sb.from('member_chat_group_members').select('group_id').eq('group_id',message.group_id).eq('user_id',userId).maybeSingle();
   if(!member||!section.isConnected)return;
   const {data:group}=await sb.from('member_chat_groups').select('name').eq('id',message.group_id).maybeSingle();
   alertBanner.textContent='🔔 Nuevo mensaje en '+(group?.name||'un grupo');
   if(currentGroup?.id!==message.group_id)loadGroups();
  }).subscribe();
}
async function loadPrivateMessages(){
 const root=document.getElementById('private-messages');if(!root)return;
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(!root.isConnected)return;root.replaceChildren();
 if(authError||!user){const link=document.createElement('a');link.href='#/auth';link.className='gradient-btn mini';link.textContent='Inicia sesión para enviar mensajes';root.append(link);return;}
 const me=user.id;
 initGroupChats(me,root);
 const {data:blockRows,error:blockError}=await sb.from('member_blocks').select('blocker_id,blocked_id').or('blocker_id.eq.'+me+',blocked_id.eq.'+me);
 if(blockError)console.warn('No se pudieron consultar los bloqueos:',blockError.message);
 const blockedByMe=new Set((blockRows||[]).filter(b=>b.blocker_id===me).map(b=>b.blocked_id));
 const blockedMe=new Set((blockRows||[]).filter(b=>b.blocked_id===me).map(b=>b.blocker_id));
 const params=new URLSearchParams((location.hash.split('?')[1]||''));
 const requested=params.get('id');
 const validId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'');
 const {data:messages,error}=await sb.from('member_direct_messages') .select('id,sender_id,recipient_id,body,created_at,is_read,image_path,audio_path,deleted_at,reply_to_id,edited_at').order('created_at',{ascending:false}).limit(300);
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
 const {data:archiveRows,error:archiveError}=await sb.from('member_conversation_archives').select('partner_id').eq('user_id',me);
 if(archiveError)console.warn('No se pudo cargar el archivo de conversaciones:',archiveError.message);
 const archivedIds=new Set((archiveRows||[]).map(row=>row.partner_id));
 const wrapper=document.createElement('div');wrapper.className='messages-layout';
 const sidebar=document.createElement('aside');sidebar.className='messages-sidebar';
 const title=document.createElement('h2');title.textContent='Conversaciones';sidebar.append(title);
 const archiveToggle=document.createElement('button');archiveToggle.type='button';archiveToggle.className='private-chat-archive-toggle';
 const archiveList=document.createElement('div');archiveList.className='private-chat-archive-list';archiveList.hidden=true;
 const archivedPartners=partners.filter(id=>archivedIds.has(id));
 archiveToggle.textContent='📁 Archivadas ('+archivedPartners.length+')';
 archiveToggle.setAttribute('aria-expanded','false');
 archiveToggle.onclick=()=>{archiveList.hidden=!archiveList.hidden;archiveToggle.setAttribute('aria-expanded',String(!archiveList.hidden));};
 const active=validId(requested)&&requested!==me?requested:(partners.find(id=>!archivedIds.has(id))||null);
 const changeArchive=async(id,archived,control)=>{
  control.disabled=true;
  const result=archived?await sb.from('member_conversation_archives').delete().eq('user_id',me).eq('partner_id',id):await sb.from('member_conversation_archives').insert({user_id:me,partner_id:id});
  if(result.error){alert('No se pudo '+(archived?'desarchivar':'archivar')+' la conversación: '+result.error.message);control.disabled=false;return;}
  if(archived&&location.hash.includes('id='+encodeURIComponent(id))){await loadPrivateMessages();return;}
  if(!archived&&active===id){location.hash='#/mensajes';}
  await loadPrivateMessages();
 };
 const renderPartner=(id,archived,destination)=>{
  const item=document.createElement('div');item.className='private-chat-partner-row';
  const link=document.createElement('a');link.href='#/mensajes?id='+encodeURIComponent(id);
  link.className='messages-partner'+(id===active?' selected':'');
  const unread=items.filter(m=>m.sender_id===id&&m.recipient_id===me&&!m.is_read).length;
  link.textContent=(names.get(id)||'Miembro')+(unread?' · '+unread+' nuevo(s)':'');
  const action=document.createElement('button');action.type='button';action.className='private-chat-archive-action';
  action.textContent=archived?'↩ Recuperar':'📁 Archivar';
  action.setAttribute('aria-label',(archived?'Recuperar':'Archivar')+' conversación con '+(names.get(id)||'Miembro'));
  action.onclick=()=>changeArchive(id,archived,action);
  item.append(link,action);destination.append(item);
 };
 const normalPartners=partners.filter(id=>!archivedIds.has(id));
 if(!normalPartners.length){const p=document.createElement('p');p.textContent=archivedPartners.length?'No tienes conversaciones activas. Revisa las archivadas.':'Aún no tienes conversaciones. Visita Miembros para iniciar una.';sidebar.append(p);}
 for(const id of normalPartners)renderPartner(id,false,sidebar);
 for(const id of archivedPartners)renderPartner(id,true,archiveList);
 sidebar.append(archiveToggle,archiveList);
 const panel=document.createElement('section');panel.className='messages-panel';
 if(!active){panel.textContent='Selecciona un miembro desde su perfil para comenzar.';}
 else if(!names.has(active)&&!items.some(m=>m.sender_id===active||m.recipient_id===active)){panel.textContent='Este miembro no tiene un perfil público disponible.';}
 else {
  const heading=document.createElement('h2');heading.textContent=names.get(active)||'Miembro';
  const blockControls=document.createElement('div');blockControls.className='member-block-controls';
  const blockButton=document.createElement('button');blockButton.type='button';blockButton.className='private-chat-archive-action';
  const currentlyBlocked=blockedByMe.has(active);
  blockButton.textContent=currentlyBlocked?'🔓 Desbloquear miembro':'🚫 Bloquear miembro';
  blockButton.onclick=async()=>{
   if(!currentlyBlocked&&!confirm('¿Bloquear a este miembro? Ninguno de los dos podrá enviar nuevos mensajes privados hasta que lo desbloquees.'))return;
   blockButton.disabled=true;
   const result=currentlyBlocked?await sb.from('member_blocks').delete().eq('blocker_id',me).eq('blocked_id',active):await sb.from('member_blocks').insert({blocker_id:me,blocked_id:active});
   if(result.error){alert('No se pudo cambiar el bloqueo: '+result.error.message);blockButton.disabled=false;return;}
   await loadPrivateMessages();
  };
  blockControls.append(blockButton);
  if(currentlyBlocked||blockedMe.has(active)){const notice=document.createElement('p');notice.textContent='🚫 No se pueden enviar mensajes privados mientras exista un bloqueo.';blockControls.append(notice);}
  panel.append(blockControls);
  const searchWrap=document.createElement('div');searchWrap.className='private-chat-search';
  const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='🔎 Buscar mensajes en esta conversación…';searchInput.setAttribute('aria-label','Buscar mensajes en esta conversación');
  const searchClear=document.createElement('button');searchClear.type='button';searchClear.textContent='Limpiar';searchClear.hidden=true;
  const searchCount=document.createElement('small');searchCount.setAttribute('role','status');searchCount.setAttribute('aria-live','polite');
  searchWrap.append(searchInput,searchClear,searchCount);
  const history=document.createElement('div');history.className='messages-history';
  const conversation=items.filter(m=>(m.sender_id===me&&m.recipient_id===active)||(m.recipient_id===me&&m.sender_id===active)).reverse();
  if(!conversation.length){const hint=document.createElement('p');hint.textContent='Todavía no hay mensajes en esta conversación.';history.append(hint);}
  const reactionIds=conversation.filter(m=>!m.deleted_at).map(m=>m.id);
  const {data:reactions,error:reactionError}=reactionIds.length?await sb.from('member_message_reactions').select('message_id,user_id,emoji').in('message_id',reactionIds):{data:[],error:null};
  if(reactionError)console.warn('No se pudieron cargar las reacciones:',reactionError.message);
  const reactionsByMessage=new Map();
  for(const reaction of reactions||[]){if(!reactionsByMessage.has(reaction.message_id))reactionsByMessage.set(reaction.message_id,[]);reactionsByMessage.get(reaction.message_id).push(reaction);}
  const {data:pins,error:pinsError}=reactionIds.length?await sb.from('member_message_pins').select('message_id,pinned_at').eq('user_id',me).in('message_id',reactionIds):{data:[],error:null};
  if(pinsError)console.warn('No se pudieron cargar los mensajes fijados:',pinsError.message);
  const pinnedIds=new Set((pins||[]).map(pin=>pin.message_id));
  const conversationById=new Map(conversation.map(message=>[message.id,message]));
  let selectReply=null;
  for(const m of conversation){
   const bubble=document.createElement('div');bubble.className='message-bubble'+(m.sender_id===me?' mine':'');
   const text=document.createElement('p');text.textContent=m.deleted_at?'Mensaje eliminado':m.body;if(m.deleted_at)text.className='private-chat-deleted';
   const date=document.createElement('small');date.textContent=new Date(m.created_at).toLocaleString('es-ES');
   if(m.reply_to_id){const original=conversationById.get(m.reply_to_id);const quote=document.createElement('div');quote.className='private-chat-reply-quote';quote.textContent=!original?'↪ Mensaje anterior':original.deleted_at?'↪ Mensaje eliminado':'↪ '+(original.sender_id===me?'Tú: ':'Miembro: ')+(original.body?.trim()|| (original.image_path?'📷 Imagen':original.audio_path?'🎤 Audio':'Mensaje'));if(original){quote.title='Ir al mensaje original';quote.tabIndex=0;quote.setAttribute('role','button');const jump=()=>{const target=history.querySelector('[data-message-id="'+original.id+'"]');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('private-chat-highlight');setTimeout(()=>target.classList.remove('private-chat-highlight'),1800);}};quote.onclick=jump;quote.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jump();}};}bubble.append(quote);}
   bubble.append(text);
   if(!m.deleted_at&&m.image_path){const photo=document.createElement('img');photo.className='private-chat-photo';photo.alt='Imagen enviada en el chat';photo.loading='lazy';bubble.append(photo);sb.storage.from('private-chat-images').createSignedUrl(m.image_path,3600).then(({data})=>{if(data?.signedUrl&&photo.isConnected){photo.src=data.signedUrl;photo.tabIndex=0;photo.setAttribute('role','button');photo.setAttribute('aria-label','Ampliar imagen del chat');photo.onclick=()=>openPrivateChatLightbox(data.signedUrl);photo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPrivateChatLightbox(data.signedUrl);}};}});}
   if(!m.deleted_at&&m.audio_path){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.className='private-chat-audio';audio.setAttribute('aria-label','Mensaje de voz');bubble.append(audio);sb.storage.from('private-chat-audio').createSignedUrl(m.audio_path,3600).then(({data})=>{if(data?.signedUrl&&audio.isConnected)audio.src=data.signedUrl;});}
   bubble.append(date);
   if(m.edited_at&&!m.deleted_at){const edited=document.createElement('small');edited.className='private-chat-edited';edited.textContent=' · Editado';edited.title='Editado el '+new Date(m.edited_at).toLocaleString('es-ES');bubble.append(edited);}
   if(m.sender_id===me&&!m.deleted_at){
    const receipt=document.createElement('small');receipt.className='message-read-receipt'+(m.is_read?' is-read':'');receipt.textContent=m.is_read?'✓✓ Leído':'✓ Enviado';receipt.setAttribute('aria-label',m.is_read?'Mensaje leído':'Mensaje enviado');bubble.append(receipt);
    if(m.body?.trim()){
     const edit=document.createElement('button');edit.type='button';edit.className='private-chat-edit';edit.textContent='✏️ Editar';
     edit.onclick=()=>{
      if(bubble.querySelector('.private-chat-edit-form'))return;
      const editor=document.createElement('form');editor.className='private-chat-edit-form';
      const field=document.createElement('textarea');field.value=m.body;field.maxLength=2000;field.required=true;field.setAttribute('aria-label','Editar mensaje');
      const save=document.createElement('button');save.type='submit';save.textContent='Guardar cambios';
      const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.onclick=()=>{editor.remove();edit.hidden=false;};
      const feedback=document.createElement('small');feedback.setAttribute('role','status');
      editor.append(field,save,cancel,feedback);bubble.insertBefore(editor,text.nextSibling);edit.hidden=true;field.focus();
      editor.onsubmit=async event=>{
       event.preventDefault();const value=field.value.trim();if(!value){feedback.textContent='Escribe un mensaje.';return;}
       if(value===m.body){cancel.click();return;}
       save.disabled=true;const {data,error:editError}=await sb.from('member_direct_messages').update({body:value}).eq('id',m.id).eq('sender_id',me).is('deleted_at',null).select('id,edited_at');
       if(editError||!data?.length){feedback.textContent='No se pudo editar: '+(editError?.message||'Mensaje no disponible');save.disabled=false;return;}
       await loadPrivateMessages();
      };
     };bubble.append(edit);
    }
    const remove=document.createElement('button');remove.type='button';remove.className='private-chat-delete';remove.textContent='🗑️ Eliminar';remove.setAttribute('aria-label','Eliminar este mensaje');
    remove.onclick=async()=>{
     if(!confirm('¿Eliminar este mensaje para todos? Esta acción no se puede deshacer.'))return;
     remove.disabled=true;remove.textContent='Eliminando…';
     const {data:deleted,error:deleteError}=await sb.from('member_direct_messages').update({body:'',image_path:null,audio_path:null,deleted_at:new Date().toISOString()}).eq('id',m.id).eq('sender_id',me).is('deleted_at',null).select('id');
     if(deleteError||!deleted?.length){alert('No se pudo eliminar el mensaje: '+(deleteError?.message||'No tienes permiso.'));remove.disabled=false;remove.textContent='🗑️ Eliminar';return;}
     const cleanup=[];
     if(m.image_path)cleanup.push(sb.storage.from('private-chat-images').remove([m.image_path]));
     if(m.audio_path)cleanup.push(sb.storage.from('private-chat-audio').remove([m.audio_path]));
     const results=await Promise.all(cleanup);
     if(results.some(r=>r.error))console.warn('No se pudo borrar algún archivo adjunto del almacenamiento.');
     await loadPrivateMessages();
    };
    bubble.append(remove);
   }
   if(!m.deleted_at){
    const reactionBar=document.createElement('div');reactionBar.className='private-chat-reactions';reactionBar.setAttribute('aria-label','Reacciones al mensaje');
    const current=reactionsByMessage.get(m.id)||[];
    for(const emoji of ['❤️','😂','👍','🔥']){
     const count=current.filter(r=>r.emoji===emoji).length;
     const mine=current.some(r=>r.user_id===me&&r.emoji===emoji);
     const reactionButton=document.createElement('button');reactionButton.type='button';reactionButton.className='private-chat-reaction'+(mine?' selected':'');
     reactionButton.textContent=emoji+(count?' '+count:'');reactionButton.title=mine?'Quitar reacción':'Reaccionar con '+emoji;
     reactionButton.setAttribute('aria-pressed',String(mine));reactionButton.setAttribute('aria-label',emoji+(count?' '+count+' reacciones':'')+(mine?', tu reacción':''));
     reactionButton.onclick=async()=>{
      reactionBar.querySelectorAll('button').forEach(b=>b.disabled=true);
      let result;
      if(mine)result=await sb.from('member_message_reactions').delete().eq('message_id',m.id).eq('user_id',me);
      else result=await sb.from('member_message_reactions').upsert({message_id:m.id,user_id:me,emoji},{onConflict:'message_id,user_id'});
      if(result.error){alert('No se pudo guardar la reacción: '+result.error.message);reactionBar.querySelectorAll('button').forEach(b=>b.disabled=false);return;}
      await loadPrivateMessages();
     };
     reactionBar.append(reactionButton);
    }
    bubble.append(reactionBar);
   }
   if(!m.deleted_at){
    const pinned=pinnedIds.has(m.id);
    const pinButton=document.createElement('button');pinButton.type='button';pinButton.className='private-chat-pin-button'+(pinned?' is-pinned':'');pinButton.textContent=pinned?'📌 Desfijar':'📌 Fijar';pinButton.setAttribute('aria-pressed',String(pinned));
    pinButton.onclick=async()=>{
     pinButton.disabled=true;
     const result=pinned?await sb.from('member_message_pins').delete().eq('message_id',m.id).eq('user_id',me):await sb.from('member_message_pins').insert({message_id:m.id,user_id:me});
     if(result.error){alert('No se pudo cambiar el mensaje fijado: '+result.error.message);pinButton.disabled=false;return;}
     await loadPrivateMessages();
    };
    bubble.append(pinButton);
   }
   if(!m.deleted_at){const replyButton=document.createElement('button');replyButton.type='button';replyButton.className='private-chat-reply-button';replyButton.textContent='↩ Responder';replyButton.onclick=()=>{if(selectReply)selectReply(m);};bubble.append(replyButton);}
   bubble.dataset.messageId=m.id;history.append(bubble);
  }
  const typingIndicator=document.createElement('p');typingIndicator.className='member-typing-indicator';typingIndicator.id='member-typing-indicator';typingIndicator.setAttribute('role','status');typingIndicator.setAttribute('aria-live','polite');
  const filterMessages=()=>{
   const query=searchInput.value.trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es');
   let found=0;
   for(const bubble of history.querySelectorAll('[data-message-id]')){
    const message=conversationById.get(bubble.dataset.messageId);
    const content=message&&!message.deleted_at?(message.body||''):'';
    const normalized=content.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es');
    const match=!query||normalized.includes(query);
    bubble.hidden=!match;
    if(match)found++;
   }
   searchCount.textContent=query?(found+' resultado'+(found===1?'':'s')+' en los '+conversation.length+' mensajes cargados'):'';
   searchClear.hidden=!query;
  };
  searchInput.oninput=filterMessages;
  searchClear.onclick=()=>{searchInput.value='';filterMessages();searchInput.focus();};
  const pinnedPanel=document.createElement('section');pinnedPanel.className='private-chat-pinned-panel';
  const pinnedHeading=document.createElement('strong');pinnedHeading.textContent='📌 Mensajes fijados';
  pinnedPanel.append(pinnedHeading);
  const pinnedMessages=conversation.filter(m=>!m.deleted_at&&pinnedIds.has(m.id));
  if(!pinnedMessages.length){const empty=document.createElement('small');empty.textContent='Todavía no has fijado ningún mensaje.';pinnedPanel.append(empty);}
  for(const pinnedMessage of pinnedMessages){
   const jumpButton=document.createElement('button');jumpButton.type='button';jumpButton.className='private-chat-pinned-link';
   jumpButton.textContent=(pinnedMessage.sender_id===me?'Tú: ':'Miembro: ')+(pinnedMessage.body?.trim()|| (pinnedMessage.image_path?'📷 Imagen':pinnedMessage.audio_path?'🎤 Audio':'Mensaje'));
   jumpButton.onclick=()=>{searchInput.value='';filterMessages();const target=history.querySelector('[data-message-id="'+pinnedMessage.id+'"]');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('private-chat-highlight');setTimeout(()=>target.classList.remove('private-chat-highlight'),1800);}};
   pinnedPanel.append(jumpButton);
  }
  panel.append(heading,pinnedPanel,searchWrap,history,typingIndicator);
  subscribePrivateTyping(me,active,typingIndicator);
  if(publicIds.has(active)&&!blockedByMe.has(active)&&!blockedMe.has(active)){
   const form=document.createElement('form');form.className='social-form messages-compose';
   const input=document.createElement('textarea');input.required=false;input.maxLength=2000;input.placeholder='Escribe tu mensaje privado…';input.setAttribute('aria-label','Mensaje privado');
   const button=document.createElement('button');button.className='gradient-btn mini';button.type='submit';button.textContent='Enviar mensaje';
   const status=document.createElement('p');status.setAttribute('role','status');
   let replyToId=null;
   const replyPreview=document.createElement('div');replyPreview.className='private-chat-reply-preview';replyPreview.hidden=true;
   const replyText=document.createElement('span');const cancelReply=document.createElement('button');cancelReply.type='button';cancelReply.textContent='✕ Cancelar';cancelReply.onclick=()=>{replyToId=null;replyPreview.hidden=true;replyText.textContent='';};
   replyPreview.append(replyText,cancelReply);
   selectReply=message=>{replyToId=message.id;replyText.textContent='Respondiendo a '+(message.sender_id===me?'tu mensaje: ':'mensaje de miembro: ')+(message.body?.trim()|| (message.image_path?'📷 Imagen':message.audio_path?'🎤 Audio':'Mensaje'));replyPreview.hidden=false;input.focus();};
   const imageInput=document.createElement('input');imageInput.type='file';imageInput.accept='image/jpeg,image/png,image/webp,image/gif';imageInput.className='private-chat-image-input';imageInput.setAttribute('aria-label','Seleccionar imagen para enviar');
   const imageLabel=document.createElement('label');imageLabel.className='private-chat-image-label';imageLabel.textContent='📷 Añadir imagen';imageLabel.append(imageInput);
   const imagePreview=document.createElement('p');imagePreview.className='private-chat-image-preview';
   imageInput.onchange=()=>{const file=imageInput.files?.[0];imagePreview.textContent=file?file.name+' ('+(file.size/1048576).toFixed(1)+' MB)':'';};
   const voiceButton=document.createElement('button');voiceButton.type='button';voiceButton.className='private-chat-voice-button';voiceButton.textContent='🎤 Grabar voz';
   const voiceStatus=document.createElement('span');voiceStatus.className='private-chat-voice-status';voiceStatus.setAttribute('role','status');
   const voicePreview=document.createElement('audio');voicePreview.controls=true;voicePreview.hidden=true;voicePreview.className='private-chat-audio';
   const discardVoice=document.createElement('button');discardVoice.type='button';discardVoice.textContent='Eliminar audio';discardVoice.hidden=true;
   let voiceBlob=null,voiceMime='',voiceRecorder=null,voiceStream=null,voiceTimer=null,voiceUrl=null;
   const stopVoice=()=>{if(voiceRecorder?.state==='recording')voiceRecorder.stop();};
   const resetVoice=()=>{voiceBlob=null;voiceMime='';if(voiceUrl)URL.revokeObjectURL(voiceUrl);voiceUrl=null;voicePreview.removeAttribute('src');voicePreview.hidden=true;discardVoice.hidden=true;voiceStatus.textContent='';};
   discardVoice.onclick=resetVoice;
   voiceButton.onclick=async()=>{
    if(voiceRecorder?.state==='recording'){stopVoice();return;}
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){voiceStatus.textContent='Este navegador no permite grabar audio.';return;}
    try{
     resetVoice();
     voiceStream=await navigator.mediaDevices.getUserMedia({audio:true});
     const types=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
     const supported=types.find(t=>MediaRecorder.isTypeSupported(t));
     voiceRecorder=new MediaRecorder(voiceStream,supported?{mimeType:supported}:undefined);
     const chunks=[];const started=Date.now();
     voiceRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
     voiceRecorder.onstop=()=>{
      clearInterval(voiceTimer);voiceTimer=null;voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;
      voiceButton.textContent='🎤 Grabar voz';
      const type=voiceRecorder.mimeType.split(';')[0]||'audio/webm';
      const blob=new Blob(chunks,{type});
      if(blob.size>0&&blob.size<=10485760){voiceBlob=blob;voiceMime=type;voiceUrl=URL.createObjectURL(blob);voicePreview.src=voiceUrl;voicePreview.hidden=false;discardVoice.hidden=false;voiceStatus.textContent='Audio listo para enviar';}
      else voiceStatus.textContent='La grabación está vacía o supera los 10 MB.';
     };
     voiceRecorder.start(250);voiceButton.textContent='⏹ Detener grabación';
     voiceStatus.textContent='Grabando… 0 s';
     voiceTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);voiceStatus.textContent='Grabando… '+seconds+' s';if(seconds>=90)stopVoice();},500);
    }catch(err){voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;voiceStatus.textContent='No se pudo acceder al micrófono. Comprueba sus permisos.';}
   };
   form.append(replyPreview,input,imageLabel,imagePreview,voiceButton,voiceStatus,voicePreview,discardVoice,button,status);
   input.addEventListener('input',()=>sendPrivateTyping(me,active));
   form.onsubmit=async e=>{
    e.preventDefault();
    const body=input.value.trim();const file=imageInput.files?.[0];
    if(voiceRecorder?.state==='recording'){status.textContent='Detén la grabación antes de enviar.';return;}
    if(!body&&!file&&!voiceBlob){status.textContent='Escribe un mensaje o selecciona una imagen.';return;}
    const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    if(file&&(!allowed[file.type]||file.size>5242880)){status.textContent='Selecciona JPG, PNG, WebP o GIF de hasta 5 MB.';return;}
    button.disabled=true;status.textContent=file?'Subiendo imagen…':'Enviando…';
    let image_path=null;
    if(file){
     image_path=me+'/'+active+'/'+crypto.randomUUID()+'.'+allowed[file.type];
     const {error:uploadError}=await sb.storage.from('private-chat-images').upload(image_path,file,{contentType:file.type,upsert:false});
     if(uploadError){status.textContent='No se pudo subir la imagen: '+uploadError.message;button.disabled=false;return;}
    }
    let audio_path=null;
    if(voiceBlob){
     const ext=voiceMime==='audio/mp4'?'mp4':voiceMime==='audio/ogg'?'ogg':'webm';
     audio_path=me+'/'+active+'/'+crypto.randomUUID()+'.'+ext;
     status.textContent='Subiendo mensaje de voz…';
     const {error:audioError}=await sb.storage.from('private-chat-audio').upload(audio_path,voiceBlob,{contentType:voiceMime,upsert:false});
     if(audioError){status.textContent='No se pudo subir el audio: '+audioError.message;button.disabled=false;return;}
    }
    const {error:sendError}=await sb.from('member_direct_messages').insert({sender_id:me,recipient_id:active,body,image_path,audio_path,reply_to_id:replyToId});
    if(sendError){status.textContent='No se pudo enviar: '+sendError.message;button.disabled=false;}
    else await loadPrivateMessages();
   };
   panel.append(form);
  }else{const p=document.createElement('p');p.textContent='Este miembro ya no tiene un perfil público; no puedes enviarle nuevos mensajes.';panel.append(p);}
 }
 wrapper.append(sidebar,panel);root.append(wrapper);
 const visibleHistory=panel.querySelector('.messages-history');if(visibleHistory)visibleHistory.scrollTop=visibleHistory.scrollHeight;
}

let liveAlertPreferences={notify_private_messages:true,notify_report_updates:true};
let liveAlertUserId=null;
async function loadLiveAlertPreferences(userId){
 if(!userId){liveAlertUserId=null;liveAlertPreferences={notify_private_messages:true,notify_report_updates:true};return;}
 liveAlertUserId=userId;
 const {data,error}=await sb.from('member_privacy_settings').select('notify_private_messages,notify_report_updates').eq('user_id',userId).maybeSingle();
 if(liveAlertUserId!==userId)return;
 if(!error)liveAlertPreferences={notify_private_messages:data?.notify_private_messages!==false,notify_report_updates:data?.notify_report_updates!==false};
}
function showMemberLiveAlert(message,href){
 if(document.visibilityState!=='visible')return;
 const toast=document.createElement('div');toast.className='member-live-alert';toast.setAttribute('role','status');
 const label=document.createElement('span');label.textContent=message;
 const link=document.createElement('a');link.href=href;link.textContent='Ver';link.className='outline-btn mini';
 const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Cerrar aviso');close.onclick=()=>toast.remove();
 toast.append(label,link,close);document.body.append(toast);
 setTimeout(()=>toast.remove(),7000);
}
let reportLiveAlertsChannel=null;
function syncReportLiveAlerts(userId){
 if(reportLiveAlertsChannel){sb.removeChannel(reportLiveAlertsChannel);reportLiveAlertsChannel=null;}
 if(!userId)return;
 reportLiveAlertsChannel=sb.channel('report-alert-preferences-'+userId)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_report_notifications',filter:'recipient_id=eq.'+userId},()=>{
  if(liveAlertPreferences.notify_report_updates)showMemberLiveAlert('🛡 Se ha actualizado una de tus denuncias.','#/cuenta');
  if(document.getElementById('account-report-history'))loadAccountReportHistory(userId);
 }).subscribe();
}
let privateMessageRealtimeChannel=null;
let privateMessageRealtimeUserId=null;
function syncPrivateMessageRealtime(userId){
 if(privateMessageRealtimeUserId===userId&&privateMessageRealtimeChannel)return;
 if(privateMessageRealtimeChannel){sb.removeChannel(privateMessageRealtimeChannel);privateMessageRealtimeChannel=null;}
 privateMessageRealtimeUserId=userId||null;
 if(!userId)return;
 privateMessageRealtimeChannel=sb.channel('direct-message-alerts-'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_direct_messages',filter:'recipient_id=eq.'+userId},()=>{
   refreshPrivateMessageBadge(userId);refreshNotificationBadge(userId);
   if(liveAlertPreferences.notify_private_messages)showMemberLiveAlert('💬 Has recibido un mensaje privado.','#/mensajes');
   refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_direct_messages',filter:'sender_id=eq.'+userId},()=>{
   refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'member_direct_messages',filter:'recipient_id=eq.'+userId},()=>{
   refreshPrivateMessageBadge(userId);refreshNotificationBadge(userId);refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'member_direct_messages',filter:'sender_id=eq.'+userId},()=>{
   refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'*',schema:'public',table:'member_message_reactions'},()=>{
   if(document.getElementById('private-messages'))refreshLivePrivateConversation();
  }).subscribe();
}
async function refreshPrivateMessageBadge(userId){
 const badge=document.getElementById('message-unread-count');
 if(!badge||!userId)return;
 const {count,error}=await sb.from('member_direct_messages').select('id',{count:'exact',head:true}).eq('recipient_id',userId).eq('is_read',false);
 if(!badge.isConnected)return;
 if(error){badge.hidden=true;return;}
 badge.hidden=!count;
 badge.textContent=count>99?'99+':String(count||0);
}

let privateConversationRefreshPending=false;
async function refreshLivePrivateConversation(){
 const root=document.getElementById('private-messages');
 if(!root||privateConversationRefreshPending)return;
 privateConversationRefreshPending=true;
 try{
  const draft=root.querySelector('.messages-compose textarea');
  const draftText=draft?.value||'';
  const focused=draft===document.activeElement;
  const history=root.querySelector('.messages-history');
  const nearBottom=history?history.scrollHeight-history.scrollTop-history.clientHeight<90:true;
  const previousScroll=history?.scrollTop||0;
  const route=location.hash;
  await loadPrivateMessages();
  if(location.hash!==route)return;
  const current=document.getElementById('private-messages');
  const newDraft=current?.querySelector('.messages-compose textarea');
  if(newDraft&&draftText){newDraft.value=draftText;if(focused)newDraft.focus();}
  const newHistory=current?.querySelector('.messages-history');
  if(newHistory)newHistory.scrollTop=nearBottom?newHistory.scrollHeight:previousScroll;
 }finally{privateConversationRefreshPending=false;}
}

let privateTypingChannel=null;
let privateTypingPair='';
let privateTypingLastSent=0;
let privateTypingTimeout=null;
function subscribePrivateTyping(me,partner,element){
 const pair=me+':'+partner;
 if(privateTypingPair===pair&&privateTypingChannel){
  privateTypingChannel._typingElement=element;
  return;
 }
 if(privateTypingChannel)sb.removeChannel(privateTypingChannel);
 if(privateTypingTimeout)clearTimeout(privateTypingTimeout);
 privateTypingPair=pair;
 const channel=sb.channel('typing-view-'+me+'-'+partner);
 privateTypingChannel=channel;
 channel._typingElement=element;
 const display=updated=>{
  const current=channel._typingElement;
  if(!current?.isConnected)return;
  const recent=Date.now()-new Date(updated).getTime()<5500;
  current.textContent=recent?'✍️ Escribiendo…':'';
  if(privateTypingTimeout)clearTimeout(privateTypingTimeout);
  if(recent)privateTypingTimeout=setTimeout(()=>{if(channel._typingElement?.isConnected)channel._typingElement.textContent='';},5500);
 };
 channel.on('postgres_changes',{event:'*',schema:'public',table:'member_typing_status',filter:'recipient_id=eq.'+me},payload=>{
  if(payload.new?.sender_id===partner)display(payload.new.updated_at);
 }).subscribe(async status=>{
  if(status!=='SUBSCRIBED'||privateTypingChannel!==channel)return;
  const {data}=await sb.from('member_typing_status').select('updated_at').eq('sender_id',partner).eq('recipient_id',me).maybeSingle();
  if(data)display(data.updated_at);
 });
}
async function sendPrivateTyping(me,partner){
 if(!me||!partner||Date.now()-privateTypingLastSent<2300)return;
 privateTypingLastSent=Date.now();
 const updated_at=new Date().toISOString();
 const {error}=await sb.from('member_typing_status').upsert({sender_id:me,recipient_id:partner,updated_at},{onConflict:'sender_id,recipient_id'});
 if(error)console.warn('Estado de escritura no disponible:',error.message);
}

function openPrivateChatLightbox(src){
 const previous=document.activeElement;
 const overlay=document.createElement('div');overlay.className='private-chat-lightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Imagen ampliada del chat');
 const image=document.createElement('img');image.src=src;image.alt='Imagen del chat ampliada';
 const close=document.createElement('button');close.type='button';close.className='private-chat-lightbox-close';close.textContent='✕ Cerrar';close.setAttribute('aria-label','Cerrar imagen ampliada');
 const dismiss=()=>{document.removeEventListener('keydown',onKey);overlay.remove();if(previous?.isConnected)previous.focus();};
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}else if(e.key==='Tab'){e.preventDefault();close.focus();}};
 close.onclick=dismiss;overlay.onclick=e=>{if(e.target===overlay)dismiss();};
 overlay.append(image,close);document.body.append(overlay);document.addEventListener('keydown',onKey);close.focus();
}

async function shopGiftNotificationNames(notifications){
 const ids=[...new Set(notifications.filter(n=>n.kind==='gift'&&n.gift_id).map(n=>n.gift_id))];
 if(!ids.length)return new Map();
 const {data:gifts,error}=await sb.from('member_shop_gifts').select('id,item_id').in('id',ids);
 if(error||!gifts?.length)return new Map();
 const {data:items}=await sb.from('reward_shop_items').select('id,name').in('id',[...new Set(gifts.map(g=>g.item_id))]);
 const names=new Map((items||[]).map(i=>[i.id,i.name]));
 return new Map(gifts.map(g=>[g.id,names.get(g.item_id)||'recompensa exclusiva']));
}
