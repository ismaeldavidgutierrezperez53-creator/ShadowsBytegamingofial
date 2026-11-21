
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

/* Spoilers de chat, compatibles con los mensajes existentes en Supabase. */
function chatSpoilerPreview(value){
 const raw=String(value??'');
 return /\|\|[\s\S]+?\|\|/.test(raw)?'🙈 Spoiler oculto':raw;
}
function renderChatSpoilerText(node,value){
 const raw=String(value??'');
 const regex=/\|\|([\s\S]+?)\|\|/g;
 node.replaceChildren();
 let match,last=0,found=false;
 while((match=regex.exec(raw))!==null){
  found=true;
  if(match.index>last)node.append(document.createTextNode(raw.slice(last,match.index)));
  const reveal=document.createElement('button');
  reveal.type='button';reveal.className='sb-chat-spoiler';reveal.textContent='🙈 Mostrar spoiler';
  reveal.setAttribute('aria-expanded','false');reveal.setAttribute('aria-label','Mostrar spoiler');
  const hiddenText=match[1];
  reveal.onclick=()=>{
   const isVisible=reveal.getAttribute('aria-expanded')==='true';
   reveal.setAttribute('aria-expanded',String(!isVisible));
   reveal.setAttribute('aria-label',isVisible?'Mostrar spoiler':'Ocultar spoiler');
   reveal.classList.toggle('is-revealed',!isVisible);
   reveal.textContent=isVisible?'🙈 Mostrar spoiler':hiddenText;
  };
  node.append(reveal);
  last=match.index+match[0].length;
 }
 if(!found){node.textContent=raw;return;}
 if(last<raw.length)node.append(document.createTextNode(raw.slice(last)));
}
function createChatSpoilerToggle(){
 const toggle=document.createElement('button');
 toggle.type='button';toggle.className='sb-chat-spoiler-toggle';toggle.textContent='🙈 Spoiler';
 toggle.setAttribute('aria-pressed','false');
 toggle.title='Ocultar el texto de tu próximo mensaje hasta que alguien pulse Mostrar spoiler';
 toggle.onclick=()=>{
  const active=toggle.getAttribute('aria-pressed')!=='true';
  toggle.setAttribute('aria-pressed',String(active));
  toggle.textContent=active?'🙈 Spoiler activado':'🙈 Spoiler';
 };
 return toggle;
}
function chatOutgoingText(value,toggle){
 return value&&toggle?.getAttribute('aria-pressed')==='true'?'||'+value+'||':value;
}


function communityIsFullSpoiler(value){return /^\|\|[\s\S]+\|\|$/.test(String(value??'').trim());}
function communityOutgoingPost(value,toggle,hasImage=false){
 const content=String(value??'').trim();
 if(toggle?.getAttribute('aria-pressed')!=='true')return content;
 const selected=content||(hasImage?'📷 Imagen con spoiler':'');
 return communityIsFullSpoiler(selected)?selected:'||'+selected+'||';
}
function createCommunitySpoilerToggle(){
 const button=createChatSpoilerToggle();button.title='Ocultar texto e imagen hasta que los miembros revelen el spoiler';return button;
}
function appendCommunityPostContent(article,post){
 const value=String(post.content??'').trim(),full=communityIsFullSpoiler(value);
 const surface=document.createElement('div');surface.className='sb-community-post-content';
 const text=document.createElement('p');text.className='social-post-body';
 const addImage=target=>{
  if(!post.image_path)return;
  const img=document.createElement('img');img.className='social-post-image';img.loading='lazy';img.alt='Imagen de la publicación';
  img.src=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;target.append(img);
 };
 if(full){
  const toggle=document.createElement('button');toggle.type='button';toggle.className='sb-community-spoiler-reveal';
  toggle.textContent='🙈 Publicación con spoiler · Mostrar contenido';toggle.setAttribute('aria-expanded','false');
  const hidden=document.createElement('div');hidden.className='sb-community-spoiler-content';hidden.hidden=true;
  text.textContent=value.slice(2,-2);hidden.append(text);addImage(hidden);
  toggle.onclick=()=>{
   hidden.hidden=!hidden.hidden;if(!hidden.hidden)linkCommunityMentions(text);toggle.setAttribute('aria-expanded',String(!hidden.hidden));
   toggle.textContent=hidden.hidden?'🙈 Publicación con spoiler · Mostrar contenido':'👁️ Ocultar spoiler';
  };
  surface.append(toggle,hidden);
 }else{renderChatSpoilerText(text,post.content);linkCommunityMentions(text);surface.append(text);addImage(surface);}
 article.append(surface);
}


/* Comunidad V2: menciones, edición de contenido y fijado administrativo. */
function attachCommunityMentionPicker(input){
 const results=document.createElement('div');results.className='sb-community-mention-results';results.hidden=true;
 input.after(results);
 let token=0;
 const refresh=async()=>{
  const current=++token;
  const at=input.value.slice(0,input.selectionStart??input.value.length);
  const match=at.match(/(^|[\s([{])@([A-Za-z0-9_]{2,32})$/);
  results.replaceChildren();results.hidden=true;
  if(!match)return;
  const {data,error}=await sb.from('profiles').select('id,username,display_name')
   .eq('is_public',true).ilike('username',match[2]+'%').order('username',{ascending:true}).limit(7);
  if(error||current!==token||!results.isConnected)return;
  for(const member of data||[]){
   if(!member.username)continue;
   const choice=document.createElement('button');choice.type='button';choice.className='sb-community-mention-choice';
   choice.textContent='@'+member.username+(member.display_name?' · '+member.display_name:'');
   choice.onclick=()=>{
    const caret=input.selectionStart??input.value.length;
    const before=input.value.slice(0,caret);
    const active=before.match(/(^|[\s([{])@([A-Za-z0-9_]{2,32})$/);
    if(!active)return;
    const start=caret-active[2].length-1;
    input.setRangeText('@'+member.username+' ',start,caret,'end');
    results.hidden=true;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
   };
   results.append(choice);
  }
  results.hidden=!results.children.length;
 };
 input.addEventListener('input',refresh);
 input.addEventListener('click',refresh);
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){results.hidden=true;token++;}});
 return results;
}
function linkCommunityMentions(container){
 const nodes=[...container.childNodes].filter(node=>node.nodeType===3);
 const expression=/(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{2,32})/g;
 const names=[...new Set(nodes.flatMap(node=>[...node.textContent.matchAll(expression)].map(m=>m[2])))].slice(0,15);
 if(!names.length)return;
 sb.from('profiles').select('id,username').eq('is_public',true).in('username',names).limit(15).then(({data,error})=>{
  if(error||!container.isConnected)return;
  const byName=new Map((data||[]).map(member=>[member.username,member.id]));
  for(const node of nodes){
   if(!node.parentNode)continue;
   const raw=node.textContent,fragment=document.createDocumentFragment();
   const re=/(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{2,32})/g;
   let position=0,match;
   while((match=re.exec(raw))){
    const id=byName.get(match[2]);if(!id)continue;
    const at=match.index+match[1].length;
    if(at>position)fragment.append(document.createTextNode(raw.slice(position,at)));
    const link=document.createElement('a');link.href='#/perfil?id='+encodeURIComponent(id);
    link.className='sb-community-mention-link';link.textContent='@'+match[2];fragment.append(link);
    position=at+match[2].length+1;
   }
   if(position===0)continue;
   if(position<raw.length)fragment.append(document.createTextNode(raw.slice(position)));
   node.replaceWith(fragment);
  }
 });
}
function appendCommunityEditAction(article,post,userId){
 if(!userId||post.author_id!==userId)return;
 const control=document.createElement('div');control.className='sb-community-edit-control';
 const edit=document.createElement('button');edit.type='button';edit.className='outline-btn mini';edit.textContent='✏️ Editar';
 const editor=document.createElement('form');editor.className='sb-community-edit-form';editor.hidden=true;
 const field=document.createElement('textarea');field.maxLength=1000;field.rows=4;field.setAttribute('aria-label','Editar publicación');
 const spoiler=createCommunitySpoilerToggle();
 const save=document.createElement('button');save.type='submit';save.className='gradient-btn mini';save.textContent='Guardar cambios';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='outline-btn mini';cancel.textContent='Cancelar';
 const status=document.createElement('small');status.setAttribute('role','status');
 editor.append(field,spoiler,save,cancel,status);
 const fill=()=>{
  const full=communityIsFullSpoiler(post.content);
  field.value=full?post.content.trim().slice(2,-2):post.content||'';
  spoiler.setAttribute('aria-pressed',String(full));
  spoiler.textContent=full?'🙈 Spoiler activado':'🙈 Spoiler';
 };
 edit.onclick=()=>{fill();editor.hidden=false;edit.hidden=true;field.focus();};
 cancel.onclick=()=>{editor.hidden=true;edit.hidden=false;status.textContent='';};
 editor.onsubmit=async event=>{
  event.preventDefault();const content=communityOutgoingPost(field.value,spoiler,!!post.image_path);
  if(!content&&!post.image_path){status.textContent='Escribe un mensaje.';return;}
  if(content.length>1000){status.textContent='Máximo 1000 caracteres.';return;}
  if(content===post.content){cancel.click();return;}
  save.disabled=true;status.textContent='Guardando…';
  const {data,error}=await sb.from('member_posts').update({content}).eq('id',post.id)
   .eq('author_id',userId).select('id,edited_at').maybeSingle();
  save.disabled=false;
  if(error||!data){status.textContent='No se pudo editar: '+(error?.message||'Sin permiso');return;}
  post.content=content;post.edited_at=data.edited_at;
  const holder=document.createElement('div');appendCommunityPostContent(holder,post);
  const current=article.querySelector('.sb-community-post-content');
  if(current)current.replaceWith(holder.firstElementChild);
  else article.prepend(holder.firstElementChild);
  let label=article.querySelector('.sb-community-edited-label');
  if(!label){label=document.createElement('small');label.className='sb-community-edited-label';control.before(label);}
  label.textContent='✏️ Editada';
  cancel.click();
 };
 control.append(edit,editor);article.append(control);
}
function appendCommunityPinAction(article,post,admin,pins,refresh){
 const pinned=pins.has(post.id);
 if(pinned){
  const badge=document.createElement('span');badge.className='sb-community-pinned-badge';
  badge.textContent='📌 Publicación fijada';article.prepend(badge);
 }
 if(!admin)return;
 const button=document.createElement('button');button.type='button';button.className='outline-btn mini sb-community-pin-button';
 button.textContent=pinned?'📌 Desfijar':'📌 Fijar en Comunidad';
 button.onclick=async()=>{
  button.disabled=true;
  const action=pinned
   ?sb.from('community_post_pins').delete().eq('post_id',post.id)
   :sb.from('community_post_pins').insert({post_id:post.id,pinned_by:admin.id});
  const {error}=await action;
  if(error){button.textContent='Error: '+error.message;button.disabled=false;return;}
  refresh();
 };
 article.append(button);
}

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

// Create a public profile for any signed-in member who does not have one yet.
const publicProfileBootstrap = new Set();
async function ensurePublicMemberProfile(user){
 if(!user?.id||publicProfileBootstrap.has(user.id))return;
 publicProfileBootstrap.add(user.id);
 const meta=user.user_metadata||{};
 const displayName=String(meta.display_name||meta.full_name||meta.name||'').replace(/\s+/g,' ').trim().slice(0,60);
 const avatarUrl=typeof meta.avatar_url==='string'&&/^https:\/\/[^\s]+$/i.test(meta.avatar_url)?meta.avatar_url:null;
 try{
  const {data,error}=await sb.from('profiles').select('id').eq('id',user.id).maybeSingle();
  if(error)throw error;
  if(!data){
   const {error:insertError}=await sb.from('profiles').insert({id:user.id,display_name:displayName||null,avatar_url:avatarUrl,bio:'',is_public:true,game_library_public:false});
   if(insertError&&insertError.code!=='23505')throw insertError;
  }
 }catch(error){
  publicProfileBootstrap.delete(user.id);
  console.warn('No se pudo crear automáticamente el perfil público:',error.message);
 }
}

// Keep the account controls synchronized with the persisted Supabase session.
async function refreshAccountActions() {
 const actions=document.getElementById('account-actions');
 if(!actions)return;
 const {data:{session},error}=await sb.auth.getSession();
 if(error)console.warn('No se pudo comprobar la sesión:',error.message);
 const user=session?.user;
 if(user)void ensurePublicMemberProfile(user);
 const adminMenuLink=document.getElementById('menu-admin-link');
 if(adminMenuLink)adminMenuLink.hidden=user?.app_metadata?.role!=='admin';
 // Account buttons must remain available even when realtime subscriptions fail.
 try {
  syncNotificationRealtime(user?.id||null);
  syncPrivateMessageRealtime(user?.id||null);
  if(liveAlertUserId!==user?.id){loadLiveAlertPreferences(user?.id||null);syncReportLiveAlerts(user?.id||null);}
 } catch (syncError) {
  console.warn('No se pudo sincronizar las alertas en tiempo real:',syncError);
 }
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
 const {data,error}=await sb.from('member_notifications').select('id,actor_id,kind,post_id,gift_id,game_id,poll_id,season_month,trophy_month,museum_month,news_id,news_comment_id,tournament_id,tournament_match_id,tournament_title,match_stage,match_no,is_read,created_at').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(8);
 if(!root.isConnected)return;root.replaceChildren();
 if(error){root.textContent='No se pudieron cargar las notificaciones.';return;}
 if(!data?.length){root.textContent='Todavía no tienes notificaciones de la comunidad.';}
 const ids=[...new Set((data||[]).map(n=>n.actor_id).filter(Boolean))],postIds=[...new Set((data||[]).map(n=>n.post_id).filter(Boolean))],pollIds=[...new Set((data||[]).map(n=>n.poll_id).filter(Boolean))];
 const [{data:profiles},{data:posts},{data:polls}]=await Promise.all([ids.length?sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true):Promise.resolve({data:[]}),postIds.length?sb.from('member_posts').select('id,image_path').in('id',postIds):Promise.resolve({data:[]}),pollIds.length?sb.from('community_polls').select('id,question').in('id',pollIds):Promise.resolve({data:[]})]);
 if(!root.isConnected)return;
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Un miembro']));
 const pollNames=new Map((polls||[]).map(p=>[p.id,p.question]));
 const seasons=[...new Set((data||[]).filter(n=>n.kind==='poll_season_prize').map(n=>n.season_month).filter(Boolean))];
 const {data:mySeasonPrizes}=seasons.length?await sb.from('community_poll_season_results')
   .select('month_start,position,points,badge').eq('user_id',userId).in('month_start',seasons):{data:[]};
 const prizesByMonth=new Map((mySeasonPrizes||[]).map(row=>[row.month_start,row]));
 const museumMonths=[...new Set((data||[]).filter(n=>n.kind==='poll_museum_prize').map(n=>n.museum_month).filter(Boolean))];
 const {data:myMuseumPrizes}=museumMonths.length?await sb.from('member_poll_museum_monthly_awards')
  .select('month_start,position,points,badge').eq('user_id',userId).in('month_start',museumMonths):{data:[]};
 const museumPrizesByMonth=new Map((myMuseumPrizes||[]).map(row=>[row.month_start,row]));
 const formatSeason=month=>month?new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(month+'T12:00:00Z')):'la temporada';
 const giftNames=await shopGiftNotificationNames(data||[]);
 const photos=new Set((posts||[]).filter(p=>p.image_path).map(p=>p.id));
 for(const n of (data||[])){
  const item=document.createElement('div');item.className='notification-preview-item'+(n.is_read?'':' unread');if(n.kind==='follow')item.dataset.followActor=n.actor_id;
  const message=document.createElement('p');const photo=photos.has(n.post_id);
  message.textContent=n.kind==='tournament_full'?'🎟️ ¡Las cuatro plazas de «'+(n.tournament_title||'tu torneo')+'» están completas!':n.kind==='tournament_match'?'⚔️ Tienes un nuevo enfrentamiento ('+(n.match_stage==='semi'?'semifinal '+n.match_no:n.match_stage==='bronze'?'partido por el tercer puesto':'gran final')+') en «'+(n.tournament_title||'tu torneo')+'».':n.kind==='tournament_finished'?'🏆 «'+(n.tournament_title||'Tu torneo')+'» ha finalizado. ¡Consulta los ganadores y tus premios!':n.kind==='news_reply'?'💬 '+(names.get(n.actor_id)||'Un miembro')+' respondió a tu comentario en una noticia.':n.kind==='poll_trophy_like'?
   '❤️ '+(names.get(n.actor_id)||'Un miembro')+' dio Me gusta a tu trofeo de '+formatSeason(n.trophy_month)+'.':
   n.kind==='poll_museum_prize'?(()=>{
    const prize=museumPrizesByMonth.get(n.museum_month);
    return prize?'🏛️ ¡Ganaste '+prize.badge+'! +'+prize.points+' puntos · '+formatSeason(n.museum_month)+'.':
      '🏛️ ¡Ganaste un premio mensual del Museo!';
   })():n.kind==='poll_season_prize'?(()=>{
    const prize=prizesByMonth.get(n.season_month);
    return prize?'🏆 ¡Ganaste '+prize.badge+' en '+formatSeason(n.season_month)+'! +'+prize.points+' puntos.':'🏆 ¡Has recibido un premio de temporada!';
   })():n.kind==='poll_reminder'?'⏰ Recuerda votar: '+(pollNames.get(n.poll_id)||'Encuesta abierta')+' · Gana 15 puntos.':n.kind==='poll'?'📊 Nueva encuesta: '+(pollNames.get(n.poll_id)||'Participa ahora'):(names.get(n.actor_id)||'Un miembro')+(n.kind==='profile_view'?' visitó tu perfil.':n.kind==='game_like'?' dio Me gusta a un juego de tu biblioteca.':n.kind==='game_comment'?' comentó un juego de tu biblioteca.':n.kind==='game_reply'?' respondió a tu comentario de un videojuego.':n.kind==='gift'?' te envió un regalo: '+(giftNames.get(n.gift_id)||'recompensa')+'.':n.kind==='follow'?' empezó a seguirte.':n.kind==='like'?(photo?' dio Me gusta a tu fotografía.':' dio Me gusta a tu publicación.'):(photo?' comentó tu fotografía.':' comentó tu publicación.'));
  const date=document.createElement('small');date.textContent=new Date(n.created_at).toLocaleString('es-ES');item.append(message,date);
  if(!n.is_read){const mark=document.createElement('button');mark.type='button';mark.textContent='Marcar como leída';mark.onclick=async()=>{mark.disabled=true;const {error:err}=await sb.from('member_notifications').update({is_read:true}).eq('id',n.id).eq('recipient_id',userId);if(err){mark.disabled=false;mark.textContent='Error al marcar';}else{item.classList.remove('unread');mark.remove();refreshNotificationBadge(userId);if(document.getElementById('member-notifications'))loadMemberNotifications();}};item.append(mark);}
  if(['tournament_full','tournament_match','tournament_finished'].includes(n.kind)&&n.tournament_id){const go=document.createElement('a');go.href=notificationDestination(n);go.textContent='🏆 Ver torneo';go.className='notification-jump';item.append(go);}
  if(n.kind==='news_reply'&&n.news_id){const go=document.createElement('a');go.href=notificationDestination(n);go.textContent='📰 Ver respuesta';go.className='notification-jump';item.append(go);}
  if(n.game_id){const go=document.createElement('a');go.href='#/perfil?id='+encodeURIComponent(userId)+'&game='+encodeURIComponent(n.game_id);go.textContent='🎮 Ver biblioteca';go.className='notification-jump';item.append(go);}
  if((n.kind==='poll'||n.kind==='poll_reminder')&&n.poll_id){const go=document.createElement('a');go.href=notificationDestination(n);go.textContent='🗳️ Votar ahora';go.className='notification-jump';item.append(go)}
  if(n.kind==='poll_season_prize'){const go=document.createElement('a');go.href=notificationDestination(n);go.textContent='🏆 Ver campeones';go.className='notification-jump';item.append(go);}
  if(n.kind==='poll_trophy_like'||n.kind==='poll_museum_prize'){
   const go=document.createElement('a');go.href=notificationDestination(n);
   go.textContent=n.kind==='poll_trophy_like'?'🏛️ Ver mi trofeo':'💖 Ver ranking de museos';
   go.className='notification-jump';item.append(go);
  }
  if(n.kind==='gift'){const go=document.createElement('a');go.href='#/regalos';go.textContent='🎁 Ver regalo y equipar';go.className='notification-jump';item.append(go)}
  if(n.kind==='profile_view'&&/^[0-9a-f-]{36}$/i.test(n.actor_id||'')){const go=document.createElement('a');go.href='#/perfil?id='+encodeURIComponent(n.actor_id);go.textContent='👤 Ver visitante';go.className='notification-jump';item.append(go)}
  if(n.kind==='follow'&&/^[0-9a-f-]{36}$/i.test(n.actor_id||'')){const go=document.createElement('a');go.href='#/perfil?id='+encodeURIComponent(n.actor_id);go.textContent='👤 Ver nuevo seguidor';go.className='notification-jump';item.append(go)}
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
const DEFAULT_NOTIFICATION_SOUNDS={message_sound:'message',comment_sound:'comment',gift_sound:'gift',follow_sound:'follow'};
const VALID_NOTIFICATION_SOUNDS=new Set(['default','message','comment','gift','follow','off','anime_sakura','anime_powerup','anime_arcade','anime_starlight']);
function normalizeNotificationSound(value,fallback){return VALID_NOTIFICATION_SOUNDS.has(value)?value:fallback;}
const DEFAULT_QUIET_PREFERENCES={dnd_enabled:false,dnd_schedule_enabled:false,dnd_start:'22:00',dnd_end:'08:00',dnd_timezone:'Europe/Madrid',dnd_until:null};
function deviceNotificationTimezone(){
 try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Madrid';}catch(_){return 'Europe/Madrid';}
}
function normalizeQuietClock(value,fallback){
 const time=String(value||'').slice(0,5);
 return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)?time:fallback;
}
function normalizeQuietPreferences(data){
 return {
  dnd_enabled:data?.dnd_enabled===true,
  dnd_schedule_enabled:data?.dnd_schedule_enabled===true,
  dnd_start:normalizeQuietClock(data?.dnd_start,'22:00'),
  dnd_end:normalizeQuietClock(data?.dnd_end,'08:00'),
  dnd_timezone:typeof data?.dnd_timezone==='string'&&data.dnd_timezone.length<=80?data.dnd_timezone:deviceNotificationTimezone(),
  dnd_until:data?.dnd_until&&Number.isFinite(Date.parse(data.dnd_until))?new Date(data.dnd_until).toISOString():null
 };
}
function formatQuietRemaining(milliseconds){
 const total=Math.max(0,Math.ceil(Number(milliseconds)/1000)||0);
 const hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;
 return [hours,minutes,seconds].map(value=>String(value).padStart(2,'0')).join(':');
}
function isNotificationQuietNow(preferences=activeToastPreferences,date=new Date()){
 if(preferences.dnd_enabled===true)return true;
 if(preferences.dnd_until&&Number.isFinite(Date.parse(preferences.dnd_until))&&date.getTime()<Date.parse(preferences.dnd_until))return true;
 if(preferences.dnd_schedule_enabled!==true)return false;
 const from=normalizeQuietClock(preferences.dnd_start,'22:00'),to=normalizeQuietClock(preferences.dnd_end,'08:00');
 if(from===to)return false;
 let minute;
 try{
  const parts=Intl.DateTimeFormat('en-GB',{timeZone:preferences.dnd_timezone||deviceNotificationTimezone(),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const hours=Number(parts.find(part=>part.type==='hour')?.value),mins=Number(parts.find(part=>part.type==='minute')?.value);
  minute=hours*60+mins;
  if(!Number.isFinite(minute))return false;
 }catch(_){return false;}
 const a=Number(from.slice(0,2))*60+Number(from.slice(3,5));
 const b=Number(to.slice(0,2))*60+Number(to.slice(3,5));
 return a<b?(minute>=a&&minute<b):(minute>=a||minute<b);
}
let activeToastPreferences={popup_enabled:true,sound_enabled:false,...DEFAULT_NOTIFICATION_SOUNDS,...DEFAULT_QUIET_PREFERENCES};
let toastAudioContext=null;
// Los sonidos solo pueden iniciarse tras una interacción del usuario.
function unlockNotificationAudio(){
 if(!activeToastPreferences.sound_enabled)return;
 try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!toastAudioContext)toastAudioContext=new C();
  if(toastAudioContext.state==='suspended')void toastAudioContext.resume().catch(()=>{});
 }catch(error){console.debug('Audio de notificaciones no disponible:',error);}
}
document.addEventListener('pointerdown',unlockNotificationAudio,{passive:true});
document.addEventListener('keydown',unlockNotificationAudio);
let quietEndTimer=null;
let quietEndScheduledFor=null;
let quietEndScheduledUser=null;
let quietEndNoticeLastShown=null;
function showQuietEndNotice(preview=false){
 if(!preview&&(document.visibilityState!=='visible'||!activeToastPreferences.popup_enabled||isNotificationQuietNow()))return;
 if(document.getElementById('sb-quiet-end-notice'))return;
 const toast=document.createElement('div');toast.id='sb-quiet-end-notice';toast.className='member-live-alert sb-quiet-end-notice sb-quiet-anime-finale';toast.setAttribute('role','status');
 // Decorative animation is strictly visual and does not interfere with the alert or its controls.
 const reduceMotion=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduceMotion){
  const effects=document.createElement('div');effects.className='sb-quiet-finale-particles';effects.setAttribute('aria-hidden','true');
  for(let i=0;i<12;i++){
   const sparkle=document.createElement('i');sparkle.className='sb-quiet-finale-sparkle';
   sparkle.style.setProperty('--particle-x',((i*37+11)%92+3)+'%');
   sparkle.style.setProperty('--particle-y',((i*29+13)%75+12)+'%');
   sparkle.style.setProperty('--particle-delay',(i%6*.11)+'s');
   sparkle.style.setProperty('--particle-duration',(1.7+(i%4)*.35)+'s');
   effects.append(sparkle);
  }
  // Un solo estallido de confeti luminoso al aparecer el aviso.
  const celebration=document.createElement('div');
  celebration.className='sb-quiet-finale-celebration';
  celebration.setAttribute('aria-hidden','true');
  for(let i=0;i<12;i++){
   const piece=document.createElement('i');
   piece.className='sb-quiet-finale-confetti';
   const angle=(Math.PI*2*i)/12;
   const radius=56+(i%3)*16;
   piece.style.setProperty('--burst-x',Math.round(Math.cos(angle)*radius)+'px');
   piece.style.setProperty('--burst-y',Math.round(Math.sin(angle)*radius)+'px');
   piece.style.setProperty('--burst-rotate',(i*41)+'deg');
   piece.style.setProperty('--burst-delay',(i%4*0.045)+'s');
   celebration.append(piece);
  }
  effects.append(celebration);
  toast.append(effects);
 }
 const label=document.createElement('span');label.textContent=preview?'🔔 Vista previa: ¡Modo No molestar finalizado! Ya puedes recibir avisos nuevamente.':'🔔 ¡Modo No molestar finalizado! Ya puedes recibir avisos nuevamente.';
 const link=document.createElement('a');link.href='#/no-molestar';link.className='outline-btn mini';link.textContent='Ver ajustes';
 const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Cerrar aviso de No molestar');
 let timeout;
 const dismiss=()=>{clearTimeout(timeout);toast.remove();};
 close.onclick=dismiss;link.onclick=dismiss;
 toast.append(label,link,close);document.body.append(toast);
 timeout=setTimeout(dismiss,10000);
}
function scheduleQuietEndNotice(userId){
 if(quietEndTimer!==null){clearTimeout(quietEndTimer);quietEndTimer=null;}
 quietEndScheduledFor=null;quietEndScheduledUser=null;
 const until=activeToastPreferences.dnd_until;
 const expires=until?Date.parse(until):NaN;
 if(!userId||userId!==notificationRealtimeUserId||activeToastPreferences.dnd_enabled||!Number.isFinite(expires)||expires<=Date.now())return;
 const key=userId+':'+new Date(expires).toISOString();
 quietEndScheduledFor=key;quietEndScheduledUser=userId;
 const ms=Math.min(Math.max(expires-Date.now()+80,25),2147483647);
 quietEndTimer=setTimeout(()=>{
  quietEndTimer=null;
  if(quietEndScheduledFor!==key||quietEndScheduledUser!==notificationRealtimeUserId)return;
  if(Date.now()<expires){scheduleQuietEndNotice(userId);return;}
  quietEndScheduledFor=null;quietEndScheduledUser=null;
  if(quietEndNoticeLastShown===key)return;
  quietEndNoticeLastShown=key;
  showQuietEndNotice();
 },ms);
}
async function loadToastPreferences(userId){
 activeToastPreferences={popup_enabled:true,sound_enabled:false,...DEFAULT_NOTIFICATION_SOUNDS,...DEFAULT_QUIET_PREFERENCES};
 if(!userId)return;
 const {data,error}=await sb.from('member_notification_preferences').select('popup_enabled,sound_enabled,message_sound,comment_sound,gift_sound,follow_sound,dnd_enabled,dnd_schedule_enabled,dnd_start,dnd_end,dnd_timezone,dnd_until').eq('user_id',userId).maybeSingle();
 if(!error&&notificationRealtimeUserId===userId)activeToastPreferences={
  popup_enabled:data?.popup_enabled!==false,
  sound_enabled:data?.sound_enabled===true,
  ...Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_SOUNDS).map(([field,defaultSound])=>[field,normalizeNotificationSound(data?.[field],defaultSound)])),
  ...normalizeQuietPreferences(data)
 };
 if(notificationRealtimeUserId===userId)scheduleQuietEndNotice(userId);
}
function playNotificationSound(kind='default',preview=false){
 if(kind==='off'||(!preview&&isNotificationQuietNow()))return;
 try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!toastAudioContext)toastAudioContext=new C();
  if(toastAudioContext.state!=='running')return;
  const patterns={
   message:[[784,0,.09],[988,.12,.13]],
   comment:[[523,0,.11],[659,.14,.13]],
   gift:[[523,0,.10],[659,.12,.10],[784,.24,.12],[1047,.38,.22]],
   follow:[[659,0,.13],[880,.16,.18]],
   // Melodías originales estilo anime, sin temas comerciales.
   anime_sakura:[[659,0,.13],[784,.16,.13],[988,.33,.16],[1175,.53,.24]],
   anime_powerup:[[392,0,.08],[523,.10,.09],[659,.21,.09],[784,.32,.11],[1047,.47,.21]],
   anime_arcade:[[784,0,.08],[988,.12,.08],[1175,.24,.09],[988,.37,.11]],
   anime_starlight:[[523,0,.17],[784,.19,.17],[1047,.39,.15],[1568,.58,.24]],
   default:[[660,0,.12],[880,.13,.12]]
  };
  const pattern=patterns[kind]||patterns.default,base=toastAudioContext.currentTime;
  for(const [frequency,delay,duration] of pattern){
   const oscillator=toastAudioContext.createOscillator(),gain=toastAudioContext.createGain(),at=base+delay;
   oscillator.type=['gift','anime_powerup','anime_arcade'].includes(kind)?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.045,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   oscillator.connect(gain);gain.connect(toastAudioContext.destination);oscillator.start(at);oscillator.stop(at+duration+.01);
  }
 }catch(error){console.warn('Sonido no disponible:',error);}
}
function notificationSoundKind(kind){
 if(kind==='gift')return activeToastPreferences.gift_sound;
 if(kind==='follow')return activeToastPreferences.follow_sound;
 if(kind==='message'||kind==='group_message')return activeToastPreferences.message_sound;
 if(['comment','game_comment','game_reply','news_reply'].includes(kind))return activeToastPreferences.comment_sound;
 return 'default';
}
const toastNotificationIds=new Set();
function showRealtimeNotificationToast(n){
 if(!n||!n.id||toastNotificationIds.has(n.id)||n.is_read)return;
 toastNotificationIds.add(n.id);if(isNotificationQuietNow())return;if(activeToastPreferences.sound_enabled)playNotificationSound(notificationSoundKind(n.kind));if(!activeToastPreferences.popup_enabled)return;
 if(toastNotificationIds.size>100){const first=toastNotificationIds.values().next().value;toastNotificationIds.delete(first);}
 let stack=document.getElementById('sb-notification-toast-stack');
 if(!stack){stack=document.createElement('div');stack.id='sb-notification-toast-stack';stack.className='sb-notification-toast-stack';stack.setAttribute('aria-live','polite');stack.setAttribute('aria-relevant','additions');document.body.append(stack);}
 const labels={news_reply:'💬 Alguien respondió a tu comentario en Noticias',game_like:'❤️ A alguien le gustó tu videojuego',game_comment:'💬 Nuevo comentario en tu biblioteca',game_reply:'↩️ Respondieron a tu comentario',like:'❤️ Nuevo Me gusta',comment:'💬 Nuevo comentario',follow:'👥 Tienes un nuevo seguidor',gift:'🎁 Has recibido un regalo',profile_view:'👁️ Alguien ha visitado tu perfil',poll:'📊 ¡Nueva encuesta para votar!',poll_reminder:'⏰ ¡Aún puedes votar y ganar 15 puntos!',poll_season_prize:'🏆 ¡Felicidades! Ganaste un premio de temporada',poll_trophy_like:'❤️ Alguien dio Me gusta a tu trofeo',poll_museum_prize:'🏛️ ¡Ganaste un premio mensual de museo!',tournament_full:'🎟️ ¡Torneo completo! Las cuatro plazas están ocupadas',tournament_match:'⚔️ ¡Tienes un nuevo enfrentamiento asignado!',tournament_finished:'🏆 ¡Torneo finalizado! Consulta tus premios'};
 const toast=document.createElement('div');toast.className='sb-notification-toast';toast.setAttribute('role','status');
 const message=document.createElement('strong');message.textContent=labels[n.kind]||'🔔 Nueva notificación';
 // Mostrar el nombre del nuevo seguidor sin retrasar la aparición del aviso.
 if(n.kind==='follow' && /^[0-9a-f-]{36}$/i.test(n.actor_id||'')){
  void sb.from('profiles').select('display_name,username')
   .eq('id',n.actor_id).eq('is_public',true).maybeSingle()
   .then(({data,error})=>{
    if(error||!data||!message.isConnected)return;
    const actor=String(data.display_name||data.username||'Un miembro').trim().slice(0,60);
    message.textContent='👥 '+actor+' empezó a seguirte.';
   }).catch(()=>{});
 }
 const actions=document.createElement('div');actions.className='sb-notification-toast-actions';
 const open=document.createElement('a');open.className='gradient-btn mini';
 open.href=n.kind==='follow' && /^[0-9a-f-]{36}$/i.test(n.actor_id||'')
  ? '#/perfil?id='+encodeURIComponent(n.actor_id)
  : (n.kind==='tournament_full'||n.kind==='tournament_match'||n.kind==='tournament_finished'||n.kind==='news_reply'||n.kind==='poll_season_prize'||n.kind==='poll_museum_prize'||n.kind==='poll_trophy_like'||((n.kind==='poll'||n.kind==='poll_reminder')&&n.poll_id))?notificationDestination(n):'#/notificaciones';
 open.textContent=n.kind==='follow'?'👤 Ver perfil':n.kind==='tournament_full'||n.kind==='tournament_match'||n.kind==='tournament_finished'?'🏆 Ver torneo':n.kind==='poll_season_prize'?'🏆 Ver premio':n.kind==='poll_museum_prize'?'🏛️ Ver ranking':n.kind==='poll_trophy_like'?'❤️ Ver trofeo':(n.kind==='poll'||n.kind==='poll_reminder')?'🗳️ Votar ahora':'Ver aviso';
 const close=document.createElement('button');close.type='button';close.className='outline-btn mini';close.textContent='Cerrar';
 let timer;const dismiss=()=>{clearTimeout(timer);toast.remove();};close.onclick=dismiss;open.onclick=dismiss;
 actions.append(open,close);toast.append(message,actions);stack.append(toast);
 while(stack.children.length>3)stack.firstElementChild.remove();
 timer=setTimeout(dismiss,7000);
}
function syncNotificationRealtime(userId){
 if(notificationRealtimeUserId===userId&&notificationRealtimeChannel)return;
 if(notificationRealtimeChannel){sb.removeChannel(notificationRealtimeChannel);notificationRealtimeChannel=null;}
 notificationRealtimeUserId=userId||null;
 activeToastPreferences={popup_enabled:true,sound_enabled:false,...DEFAULT_NOTIFICATION_SOUNDS,...DEFAULT_QUIET_PREFERENCES};
 scheduleQuietEndNotice(null);
 if(!userId)return;
 loadToastPreferences(userId);
 notificationRealtimeChannel=sb.channel('member-notifications-'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_notifications',filter:'recipient_id=eq.'+userId},payload=>{if(payload.new?.recipient_id===userId)showRealtimeNotificationToast(payload.new);
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
// Recheck the persisted session when the Android/Windows PWA resumes from the background.
window.addEventListener('pageshow',()=>{void refreshAccountActions();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshAccountActions();});
refreshAccountActions();

async function loadAccountFollows(userId, root) {
  const blockPanel = document.getElementById('account-blocked-members');
  if (blockPanel) renderAccountBlockedMembers(userId);
  if (!root?.isConnected) return;
  root.innerHTML = '<h3>👥 Seguidores y Siguiendo</h3><p>Consulta y gestiona tus conexiones con otros miembros.</p>';

  const overview = document.createElement('div');
  overview.className = 'account-follow-overview';
  const makeMetric = label => {
    const box = document.createElement('div');
    box.className = 'account-follow-metric';
    const value = document.createElement('strong');
    value.textContent = '…';
    const caption = document.createElement('span');
    caption.textContent = label;
    box.append(value, caption);
    overview.append(box);
    return value;
  };
  const followersMetric = makeMetric('Seguidores');
  const followingMetric = makeMetric('Siguiendo');
  const mutualMetric = makeMetric('Mutuos mostrados');
  root.append(overview);

  const searchLabel = document.createElement('label');
  searchLabel.htmlFor = 'account-follow-search';
  searchLabel.textContent = 'Buscar seguidores o miembros que sigues';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'account-follow-search';
  search.placeholder = 'Buscar por nombre o usuario…';
  search.autocomplete = 'off';
  root.append(searchLabel, search);

  const filters = document.createElement('div');
  filters.className = 'account-follow-filters';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filtrar conexiones');
  let activeFilter = 'all';
  const filterButtons = [];
  for (const [value, label] of [['all', 'Todos'], ['followers', 'Seguidores'], ['following', 'Siguiendo'], ['mutual', 'Mutuos']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account-follow-filter';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(value === activeFilter));
    button.addEventListener('click', () => { activeFilter = value; updateFilter(); });
    filters.append(button);
    filterButtons.push({value, button, label});
  }
  root.append(filters);

  const count = document.createElement('p');
  count.className = 'account-follow-results';
  count.setAttribute('aria-live', 'polite');
  const feedback = document.createElement('p');
  feedback.className = 'account-follow-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  const content = document.createElement('div');
  content.className = 'account-follows-content';
  content.textContent = 'Cargando miembros…';
  root.append(count, feedback, content);

  const [followersResponse, followingResponse] = await Promise.all([
    sb.from('member_follows').select('follower_id', {count: 'exact'})
      .eq('following_id', userId).order('created_at', {ascending: false}).limit(100),
    sb.from('member_follows').select('following_id', {count: 'exact'})
      .eq('follower_id', userId).order('created_at', {ascending: false}).limit(100)
  ]);
  if (!root.isConnected) return;
  if (followersResponse.error || followingResponse.error) {
    content.textContent = 'No se pudieron cargar los seguidores. Inténtalo de nuevo.';
    return;
  }

  const followerOrder = [...new Set((followersResponse.data || []).map(item => item.follower_id))];
  let followingOrder = [...new Set((followingResponse.data || []).map(item => item.following_id))];
  const followerIds = new Set(followerOrder);
  const followingIds = new Set(followingOrder);
  let followerCount = followersResponse.count ?? followerOrder.length;
  let followingCount = followingResponse.count ?? followingOrder.length;
  const ids = [...new Set([...followerOrder, ...followingOrder])];
  const profilesResult = ids.length
    ? await sb.from('profiles').select('id,display_name,username,avatar_url,is_public').in('id', ids)
    : {data: [], error: null};
  if (!root.isConnected) return;
  if (profilesResult.error) {
    content.textContent = 'No se pudieron cargar los perfiles.';
    return;
  }
  const names = new Map((profilesResult.data || []).map(person => [person.id, person]));
  const pending = new Set();
  let lists = [];

  const normalize = value => String(value || '').normalize('NFD')
    .replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim();
  const summaryCount = (number, sampleLength, exact) => !exact && sampleLength >= 100
    ? '100+' : Number(number).toLocaleString('es-ES');

  function updateFilter() {
    if (!root.isConnected) return;
    const term = normalize(search.value);
    let visibleTotal = 0;
    for (const {area, key, rows, empty} of lists) {
      const showSection = activeFilter === 'all' || activeFilter === key
        || (activeFilter === 'mutual' && key === 'followers');
      area.hidden = !showSection;
      let visible = 0;
      for (const {row, id} of rows) {
        const person = names.get(id);
        const label = [person?.display_name, person?.username, row.dataset.displayName].join(' ');
        const matchesSearch = !term || normalize(label).includes(term);
        const matchesMutual = activeFilter !== 'mutual'
          || (followerIds.has(id) && followingIds.has(id));
        row.hidden = !matchesSearch || !matchesMutual;
        if (!row.hidden) visible++;
      }
      empty.hidden = visible !== 0 || !showSection;
      empty.textContent = activeFilter === 'mutual'
        ? 'Todavía no tienes seguimientos mutuos que coincidan.'
        : term ? 'No hay coincidencias.' : key === 'followers'
          ? 'Todavía no tienes seguidores.' : 'Todavía no sigues a nadie.';
      if (showSection) visibleTotal += visible;
    }
    for (const {value, button, label} of filterButtons) {
      button.setAttribute('aria-pressed', String(value === activeFilter));
      const number = value === 'followers' ? followerCount
        : value === 'following' ? followingCount
        : value === 'mutual' ? followerOrder.filter(id => followingIds.has(id)).length : null;
      button.textContent = number === null ? label : label + ' · ' + number.toLocaleString('es-ES');
    }
    count.textContent = visibleTotal + (visibleTotal === 1 ? ' resultado' : ' resultados')
      + (term ? ' para «' + search.value.trim() + '»' : '');
  }

  function renderLists() {
    if (!root.isConnected) return;
    followersMetric.textContent = summaryCount(followerCount, followerOrder.length, followersResponse.count != null);
    followingMetric.textContent = summaryCount(followingCount, followingOrder.length, followingResponse.count != null);
    mutualMetric.textContent = String(followerOrder.filter(id => followingIds.has(id)).length);
    content.replaceChildren();
    lists = [];
    for (const [key, title, order] of [
      ['followers', 'Seguidores', followerOrder],
      ['following', 'Siguiendo', followingOrder]
    ]) {
      const area = document.createElement('section');
      area.className = 'account-follows-list';
      area.dataset.kind = key;
      const heading = document.createElement('h4');
      heading.textContent = title;
      area.append(heading);
      const rows = [];
      for (const id of order) {
        const person = names.get(id);
        const displayName = person?.display_name || person?.username || 'Miembro';
        const row = document.createElement('div');
        row.className = 'account-follow-member';
        row.dataset.memberId = id;
        row.dataset.displayName = displayName;
        const avatar = document.createElement('span');
        avatar.className = 'account-follow-avatar';
        avatar.textContent = displayName.charAt(0).toUpperCase();
        if (typeof person?.avatar_url === 'string' && /^https:\/\/[^\s]+$/i.test(person.avatar_url)) {
          const img = document.createElement('img');
          img.src = person.avatar_url;
          img.alt = '';
          img.loading = 'lazy';
          img.addEventListener('error', () => { if (img.isConnected) img.remove(); }, {once: true});
          avatar.append(img);
        }
        const info = document.createElement('span');
        info.className = 'account-follow-member-info';
        const name = document.createElement('strong');
        name.textContent = displayName;
        info.append(name);
        if (person?.username && person.username !== displayName) {
          const username = document.createElement('small');
          username.textContent = '@' + person.username;
          info.append(username);
        }
        const relationship = document.createElement('small');
        relationship.className = 'account-follow-relationship';
        relationship.textContent = followerIds.has(id) && followingIds.has(id)
          ? '💜 Seguimiento mutuo' : followerIds.has(id) ? 'Te sigue'
            : 'Siguiendo';
        info.append(relationship);
        row.append(avatar, info);
        const actions = document.createElement('div');
        actions.className = 'account-follow-member-actions';
        if (person?.is_public) {
          const link = document.createElement('a');
          link.href = '#/perfil?id=' + encodeURIComponent(id);
          link.className = 'outline-btn mini';
          link.textContent = 'Ver perfil';
          actions.append(link);
        } else {
          const privateLabel = document.createElement('small');
          privateLabel.textContent = 'Perfil privado';
          actions.append(privateLabel);
        }
        if (person?.is_public || followingIds.has(id)) {
          const action = document.createElement('button');
          action.type = 'button';
          action.className = 'account-follow-action';
          const isFollowing = followingIds.has(id);
          action.dataset.following = String(isFollowing);
          action.textContent = isFollowing ? '✓ Siguiendo' : '➕ Seguir';
          action.title = isFollowing ? 'Dejar de seguir' : 'Seguir miembro';
          action.setAttribute('aria-label',
            (isFollowing ? 'Dejar de seguir a ' : 'Seguir a ') + displayName);
          action.disabled = pending.has(id);
          action.addEventListener('click', () => void toggleFollow(id, displayName));
          actions.append(action);
        }
        row.append(actions);
        area.append(row);
        rows.push({row, id});
      }
      const empty = document.createElement('p');
      empty.className = 'account-follow-search-empty';
      area.append(empty);
      content.append(area);
      lists.push({area, key, rows, empty});
    }
    updateFilter();
  }

  async function toggleFollow(id, displayName) {
    if (pending.has(id) || !root.isConnected || userId === id) return;
    pending.add(id);
    for (const row of content.querySelectorAll('.account-follow-member')) {
      if (row.dataset.memberId === id) {
        for (const button of row.querySelectorAll('.account-follow-action')) button.disabled = true;
      }
    }
    try {
      const {data: authData, error: authError} = await sb.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user || authData.user.id !== userId) {
        feedback.textContent = 'Inicia sesión con tu cuenta para gestionar tus seguimientos.';
        return;
      }
      const current = await sb.from('member_follows').select('following_id')
        .eq('follower_id', userId).eq('following_id', id).maybeSingle();
      if (current.error) throw current.error;
      const wasFollowing = Boolean(current.data);
      if (wasFollowing !== followingIds.has(id)) {
        if (wasFollowing) {
          followingIds.add(id);
          followingOrder = [id, ...followingOrder.filter(value => value !== id)];
          followingCount++;
        } else {
          followingIds.delete(id);
          followingOrder = followingOrder.filter(value => value !== id);
          followingCount = Math.max(0, followingCount - 1);
        }
        feedback.textContent = 'El estado de ' + displayName + ' cambió. Se ha actualizado la lista; vuelve a pulsar para confirmar.';
        return;
      }
      const result = wasFollowing
        ? await sb.from('member_follows').delete().eq('follower_id', userId).eq('following_id', id)
        : await sb.from('member_follows').insert({follower_id: userId, following_id: id});
      if (result.error) throw result.error;
      if (wasFollowing) {
        followingIds.delete(id);
        followingOrder = followingOrder.filter(value => value !== id);
        followingCount = Math.max(0, followingCount - 1);
      } else {
        followingIds.add(id);
        followingOrder = [id, ...followingOrder.filter(value => value !== id)];
        followingCount++;
      }
      feedback.textContent = wasFollowing
        ? 'Has dejado de seguir a ' + displayName + '.'
        : 'Ahora sigues a ' + displayName + '.';
    } catch (_) {
      if (root.isConnected) feedback.textContent = 'No se pudo actualizar el seguimiento. Inténtalo de nuevo.';
    } finally {
      pending.delete(id);
      if (root.isConnected) {
        renderLists();
        const row = [...content.querySelectorAll('.account-follow-member')]
          .find(item => item.dataset.memberId === id && !item.hidden && !item.closest('[hidden]'));
        row?.querySelector('.account-follow-action')?.focus({preventScroll: true});
      }
    }
  }

  search.addEventListener('input', updateFilter);
  search.addEventListener('search', updateFilter);
  renderLists();
  const limitNote = document.createElement('small');
  limitNote.className = 'account-follow-limit-note';
  limitNote.textContent = 'Se muestran hasta 100 miembros recientes de cada lista. Seguidores y Siguiendo muestran el total; Mutuos mostrados corresponde a las listas visibles.';
  root.append(limitNote);
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


async function loadQuickDndPage(){
 const root=document.getElementById('quick-dnd-panel');if(!root)return;
 const {data,error}=await sb.auth.getUser();
 if(!root.isConnected)return;
 const user=data?.user;
 if(error||!user){
  root.innerHTML='<div class="profile-panel"><p>Inicia sesión para configurar el modo No molestar de tu cuenta.</p><a href="#/auth" class="gradient-btn mini">Iniciar sesión</a></div>';
  return;
 }
 root.replaceChildren();
 initAccountNotificationPreferences(user.id,root);
}

async function initAccountNotificationPreferences(userId,root){
 const section=document.createElement('section');section.className='profile-panel account-notification-preferences';section.id='account-notification-settings';
 const animeSoundPage=location.hash.split('?')[0]==='#/sonidos';
 section.innerHTML='<h3>⚙ Configuración de notificaciones</h3><p>Elige si quieres recibir correos electrónicos cuando se revisen tus denuncias. Los avisos dentro de la web seguirán activos.</p><label class="notification-preference-label"><input type="checkbox" id="report-email-enabled" disabled> Recibir correos sobre mis denuncias</label><p id="report-email-preference-message" role="status" aria-live="polite">Cargando preferencias…</p>';
 if(animeSoundPage){
  section.querySelector('h3').textContent='🎵 Configurar sonidos anime';
  section.querySelector('h3').nextElementSibling.textContent='Selecciona un sonido diferente para mensajes, seguidores, comentarios y regalos. Puedes probar cada melodía y guardarla para tu cuenta.';
  section.querySelector('#report-email-enabled').closest('label').hidden=true;
  section.querySelector('#report-email-preference-message').hidden=true;
 }
 const profileGrid=root.querySelector('.profile-grid');
 if(profileGrid)profileGrid.after(section);else root.prepend(section);
 const toastSettings=document.createElement('div');toastSettings.className='notification-toast-preferences';
 toastSettings.innerHTML='<p>Personaliza los avisos que aparecen mientras utilizas la web.</p><label class="notification-preference-label"><input type="checkbox" id="popup-notification-enabled" disabled> Mostrar notificaciones emergentes</label><label class="notification-preference-label"><input type="checkbox" id="sound-notification-enabled" disabled> Reproducir sonido al recibir notificaciones</label><p>Elige melodías anime originales (Sakura, Power Up, Arcade o Estrellas) o Silencio. Pulsa Probar para escucharlas. Con la web cerrada, el aviso utiliza el sonido de Windows o del móvil.</p><div id="notification-category-sound-settings" class="notification-category-sound-settings"></div><p id="notification-toast-preference-status" role="status" aria-live="polite">Cargando preferencias…</p>';
 section.append(toastSettings);
 const quietSettings=document.createElement('div');quietSettings.className='notification-quiet-settings';
 quietSettings.innerHTML='<h4>🌙 Modo No molestar</h4><p><strong>Silencio rápido: 30 minutos, 1 hora o 2 horas.</strong> También puedes silenciar hasta desactivarlo o establecer un horario. Los avisos seguirán guardados en la campana.</p><label class="notification-preference-label"><input type="checkbox" id="notification-dnd-manual" disabled> Activar No molestar hasta desactivarlo</label><div class="notification-quick-mute" role="group" aria-label="Duración de No molestar"><button type="button" class="outline-btn mini" data-dnd-minutes="30" disabled>30 minutos</button><button type="button" class="outline-btn mini" data-dnd-minutes="60" disabled>1 hora</button><button type="button" class="outline-btn mini" data-dnd-minutes="120" disabled>2 horas</button><button type="button" class="outline-btn mini" id="notification-dnd-indefinite" disabled>Hasta desactivar</button><button type="button" class="outline-btn mini" id="notification-dnd-cancel" disabled>Desactivar silencio temporal o manual</button></div><div id=\"notification-dnd-countdown\" class=\"notification-dnd-countdown\" role=\"timer\" aria-label=\"Tiempo restante de No molestar\" aria-live=\"off\" hidden><span>⏳ Tiempo restante</span><strong id=\"notification-dnd-remaining\">00:00:00</strong><small id=\"notification-dnd-ends-at\"></small></div><button type=\"button\" class=\"outline-btn mini\" id=\"notification-dnd-test-notice\">🔔 Probar aviso de finalización</button><label class="notification-preference-label"><input type="checkbox" id="notification-dnd-scheduled" disabled> Activar automáticamente cada día</label><div class="notification-quiet-hours"><label for="notification-dnd-start">Desde <input id="notification-dnd-start" type="time" value="22:00" disabled></label><label for="notification-dnd-end">Hasta <input id="notification-dnd-end" type="time" value="08:00" disabled></label></div><small id="notification-dnd-timezone"></small><button type="button" id="notification-dnd-save-schedule" class="outline-btn mini" disabled>💾 Guardar horario</button><p id="notification-dnd-status" role="status" aria-live="polite">Cargando modo No molestar…</p>';
 if(animeSoundPage){quietSettings.style.display='none';}else{section.insertBefore(quietSettings,toastSettings);}
 const dndManual=quietSettings.querySelector('#notification-dnd-manual');
 const dndScheduled=quietSettings.querySelector('#notification-dnd-scheduled');
 const dndStart=quietSettings.querySelector('#notification-dnd-start');
 const dndEnd=quietSettings.querySelector('#notification-dnd-end');
 const dndSave=quietSettings.querySelector('#notification-dnd-save-schedule');
 const dndZone=quietSettings.querySelector('#notification-dnd-timezone');
 const dndStatus=quietSettings.querySelector('#notification-dnd-status');
 quietSettings.querySelector('#notification-dnd-test-notice').onclick=()=>showQuietEndNotice(true);
 const dndCountdown=quietSettings.querySelector('#notification-dnd-countdown');
 const dndRemaining=quietSettings.querySelector('#notification-dnd-remaining');
 const dndEndsAt=quietSettings.querySelector('#notification-dnd-ends-at');
 let countdownWasActive=false;
 const refreshQuietCountdown=()=>{
  const timestamp=activeToastPreferences.dnd_until?Date.parse(activeToastPreferences.dnd_until):NaN;
  const now=Date.now();
  const active=!activeToastPreferences.dnd_enabled&&Number.isFinite(timestamp)&&timestamp>now;
  dndCountdown.hidden=!active;
  if(active){
   dndRemaining.textContent=formatQuietRemaining(timestamp-now);
   dndEndsAt.textContent='Finaliza a las '+new Date(timestamp).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})+'.';
  }
  if(countdownWasActive&&!active)refreshQuietStatus();
  countdownWasActive=active;
 };
 const quickMuteButtons=[...quietSettings.querySelectorAll('.notification-quick-mute button')];
 const quietControls=[dndManual,dndScheduled,dndStart,dndEnd,dndSave,...quickMuteButtons];
 const refreshQuietStatus=()=>{
  const prefs=activeToastPreferences,scheduled=prefs.dnd_schedule_enabled,quiet=isNotificationQuietNow();
  const until=prefs.dnd_until?Date.parse(prefs.dnd_until):NaN;
  if(prefs.dnd_enabled)dndStatus.textContent='🌙 No molestar activo hasta que decidas desactivarlo.';
  else if(Number.isFinite(until)&&Date.now()<until)dndStatus.textContent='🌙 No molestar temporal hasta '+new Date(until).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})+'.';
  else if(quiet)dndStatus.textContent='🌙 No molestar activo por el horario programado.';
  else if(scheduled)dndStatus.textContent='🔔 Fuera del horario de descanso: los avisos están activos.';
  else dndStatus.textContent='🔔 No molestar desactivado.';
 };
 const refreshQuietControls=()=>{
  dndManual.checked=activeToastPreferences.dnd_enabled;
  dndScheduled.checked=activeToastPreferences.dnd_schedule_enabled;
  dndStart.value=activeToastPreferences.dnd_start;
  dndEnd.value=activeToastPreferences.dnd_end;
  dndZone.textContent='Zona horaria del horario: '+activeToastPreferences.dnd_timezone+'. Al guardarlo se usará la zona horaria de este dispositivo.';
  refreshQuietStatus();
  refreshQuietCountdown();
 };
 const popupToggle=toastSettings.querySelector('#popup-notification-enabled'),soundToggle=toastSettings.querySelector('#sound-notification-enabled'),toastStatus=toastSettings.querySelector('#notification-toast-preference-status');
 const soundRows=[['message_sound','💬 Mensajes privados'],['comment_sound','📝 Comentarios y respuestas'],['gift_sound','🎁 Regalos'],['follow_sound','👥 Nuevos seguidores']];
 const soundPresets=[['anime_sakura','🌸 Sakura · campanillas'],['anime_powerup','⚡ Power Up · subida épica'],['anime_arcade','🎮 Arcade anime · digital'],['anime_starlight','✨ Estrellas · mágico'],['message','Mensaje · dos tonos agudos'],['comment','Comentario · tonos suaves'],['gift','Regalo · melodía'],['follow','Seguidor · tonos ascendentes'],['default','Clásico · dos tonos'],['off','🔕 Silencio']];
 const soundSelectors=new Map(),soundSettings=toastSettings.querySelector('#notification-category-sound-settings');
 for(const [field,labelText] of soundRows){
  const row=document.createElement('div');row.className='notification-category-sound';
  const label=document.createElement('label');label.htmlFor='notification-'+field;label.textContent=labelText;
  const controls=document.createElement('div');controls.className='notification-category-sound-actions';
  const select=document.createElement('select');select.id='notification-'+field;select.disabled=true;
  for(const [value,text] of soundPresets){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  const test=document.createElement('button');test.type='button';test.className='outline-btn mini';test.textContent='▶ Probar';
  test.onclick=async()=>{
   if(select.value==='off'){toastStatus.textContent=labelText+': sonido desactivado.';return;}
   try{const C=window.AudioContext||window.webkitAudioContext;if(!C){toastStatus.textContent='Este navegador no admite audio.';return;}
    if(!toastAudioContext)toastAudioContext=new C();await toastAudioContext.resume();playNotificationSound(select.value,true);toastStatus.textContent='Prueba de sonido: '+labelText+'.';
   }catch(e){toastStatus.textContent='El navegador ha bloqueado el sonido.';}
  };
  controls.append(select,test);row.append(label,controls);soundSettings.append(row);soundSelectors.set(field,select);
 }
 const {data:toastData,error:toastError}=await sb.from('member_notification_preferences').select('popup_enabled,sound_enabled,message_sound,comment_sound,gift_sound,follow_sound,dnd_enabled,dnd_schedule_enabled,dnd_start,dnd_end,dnd_timezone,dnd_until').eq('user_id',userId).maybeSingle();
 if(section.isConnected){if(toastError){toastStatus.textContent='No se pudieron cargar las preferencias.';dndStatus.textContent='No se pudo cargar No molestar.';}else{
 popupToggle.checked=toastData?.popup_enabled!==false;soundToggle.checked=toastData?.sound_enabled===true;popupToggle.disabled=false;soundToggle.disabled=false;toastStatus.textContent='Preferencias listas.';
 activeToastPreferences={popup_enabled:popupToggle.checked,sound_enabled:soundToggle.checked,...Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_SOUNDS).map(([field,defaultSound])=>[field,normalizeNotificationSound(toastData?.[field],defaultSound)])),...normalizeQuietPreferences(toastData)};
 scheduleQuietEndNotice(userId);
 refreshQuietControls();
 for(const control of quietControls)control.disabled=false;
 const saveQuietPatch=async(patch)=>{
  for(const control of quietControls)control.disabled=true;
  dndStatus.textContent='Guardando modo No molestar…';
  let failure=null,stored=null;
  try{
   const {data:session,error:authError}=await sb.auth.getUser();
   if(authError||session?.user?.id!==userId)throw new Error('La sesión ha cambiado. Vuelve a iniciar sesión.');
   const {data:existing,error:readError}=await sb.from('member_notification_preferences').select('user_id').eq('user_id',userId).maybeSingle();
   if(readError)throw readError;
   const payload={...patch,updated_at:new Date().toISOString()};
   const query=existing
    ?sb.from('member_notification_preferences').update(payload).eq('user_id',userId)
    :sb.from('member_notification_preferences').insert({user_id:userId,...payload});
   const {data,error}=await query.select('dnd_enabled,dnd_schedule_enabled,dnd_start,dnd_end,dnd_timezone,dnd_until').single();
   if(error)throw error;
   if(!data)throw new Error('No se pudo verificar la configuración guardada.');
   stored=normalizeQuietPreferences(data);
   if(Object.entries(patch).some(([key,value])=>key==='dnd_until'?(value===null?stored.dnd_until!==null:Date.parse(stored.dnd_until)!==Date.parse(value)):stored[key]!==value))throw new Error('La configuración guardada no coincide.');
  }catch(e){failure=e;}
  if(failure){refreshQuietControls();dndStatus.textContent='No se pudo guardar: '+(failure.message||'Error desconocido');}
  else{
   Object.assign(activeToastPreferences,stored);
   scheduleQuietEndNotice(userId);
   refreshQuietControls();
   if(isNotificationQuietNow()){document.querySelectorAll('.sb-notification-toast,.member-live-alert').forEach(n=>n.remove());}
   dndStatus.textContent+=' Preferencia guardada.';
  }
  for(const control of quietControls)control.disabled=false;
 };
 dndManual.onchange=()=>saveQuietPatch({dnd_enabled:dndManual.checked,dnd_until:null});
 for(const button of quietSettings.querySelectorAll('[data-dnd-minutes]')){
  button.onclick=()=>{
   const minutes=Number(button.dataset.dndMinutes);
   if(![30,60,120].includes(minutes))return;
   saveQuietPatch({dnd_enabled:false,dnd_until:new Date(Date.now()+minutes*60000).toISOString()});
  };
 }
 quietSettings.querySelector('#notification-dnd-indefinite').onclick=()=>saveQuietPatch({dnd_enabled:true,dnd_until:null});
 quietSettings.querySelector('#notification-dnd-cancel').onclick=()=>saveQuietPatch({dnd_enabled:false,dnd_until:null});
 const markSchedulePending=()=>{dndStatus.textContent='Cambios pendientes: pulsa Guardar horario para aplicarlos.';};
 dndScheduled.onchange=markSchedulePending;dndStart.onchange=markSchedulePending;dndEnd.onchange=markSchedulePending;
 dndSave.onclick=()=>{
  const from=normalizeQuietClock(dndStart.value,''),to=normalizeQuietClock(dndEnd.value,'');
  if(!from||!to||from===to){dndStatus.textContent='Indica dos horas válidas y diferentes.';return;}
  saveQuietPatch({dnd_schedule_enabled:dndScheduled.checked,dnd_start:from,dnd_end:to,dnd_timezone:deviceNotificationTimezone()});
 };
 let lastStatusMinute=Math.floor(Date.now()/60000);
 const quietStatusTimer=setInterval(()=>{
  if(!quietSettings.isConnected){clearInterval(quietStatusTimer);return;}
  refreshQuietCountdown();
  const minute=Math.floor(Date.now()/60000);
  if(minute!==lastStatusMinute&&!quietControls.some(control=>control.disabled)){
   lastStatusMinute=minute;
   refreshQuietStatus();
  }
 },1000);
 for(const [field,select] of soundSelectors){select.value=activeToastPreferences[field];select.dataset.savedValue=select.value;select.disabled=false;}
 const saveToastPreference=async(field,toggle)=>{const requested=toggle.checked;toggle.disabled=true;toastStatus.textContent='Guardando…';
 const {data:session}=await sb.auth.getUser();if(session?.user?.id!==userId){toggle.checked=!requested;toggle.disabled=false;toastStatus.textContent='La sesión ha cambiado.';return;}
 const {data:existing,error:readError}=await sb.from('member_notification_preferences').select('user_id').eq('user_id',userId).maybeSingle();
 let error=readError;
 if(!error){const payload={[field]:requested,updated_at:new Date().toISOString()};
 const result=existing?await sb.from('member_notification_preferences').update(payload).eq('user_id',userId):await sb.from('member_notification_preferences').insert({user_id:userId,...payload});
 error=result.error;}
 if(error){toggle.checked=!requested;toastStatus.textContent='Error al guardar: '+error.message;}else{activeToastPreferences[field]=requested;toastStatus.textContent='Preferencia guardada.';}
 toggle.disabled=false;};
 popupToggle.onchange=()=>saveToastPreference('popup_enabled',popupToggle);
 soundToggle.onchange=()=>{if(soundToggle.checked){try{const C=window.AudioContext||window.webkitAudioContext;if(C){if(!toastAudioContext)toastAudioContext=new C();void toastAudioContext.resume().catch(()=>{});}}catch(_){}}saveToastPreference('sound_enabled',soundToggle);};
 for(const [field,select] of soundSelectors){
  select.onchange=async()=>{
   const selected=normalizeNotificationSound(select.value,DEFAULT_NOTIFICATION_SOUNDS[field]);
   const previous=select.dataset.savedValue||DEFAULT_NOTIFICATION_SOUNDS[field];
   select.disabled=true;toastStatus.textContent='Guardando sonido…';
   const {data:sessionData,error:authError}=await sb.auth.getUser();
   if(authError||sessionData?.user?.id!==userId){select.value=previous;select.disabled=false;toastStatus.textContent='La sesión ha cambiado. Vuelve a iniciar sesión.';return;}
   const {data:existing,error:readError}=await sb.from('member_notification_preferences').select('user_id').eq('user_id',userId).maybeSingle();
   let saveError=readError;
   if(!saveError){
    const payload={[field]:selected,updated_at:new Date().toISOString()};
    const query=existing
     ?sb.from('member_notification_preferences').update(payload).eq('user_id',userId)
     :sb.from('member_notification_preferences').insert({user_id:userId,...payload});
    const result=await query.select(field).single();
    saveError=result.error;
    if(!saveError&&result.data?.[field]!==selected)saveError=new Error('No se pudo verificar el sonido guardado.');
   }
   if(saveError){select.value=previous;toastStatus.textContent='No se pudo guardar: '+saveError.message;console.warn('Error al guardar preferencia de sonido:',saveError);}
   else{select.dataset.savedValue=selected;activeToastPreferences[field]=selected;toastStatus.textContent='Sonido guardado para '+soundRows.find(x=>x[0]===field)[1]+'.';}
   select.disabled=false;
  };
 }
 }}
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
 const toggle=document.createElement('button');toggle.type='button';toggle.className='gradient-btn mini security-center-toggle';toggle.textContent='👁️ Mostrar contenido';toggle.setAttribute('aria-expanded','false');
 const content=document.createElement('div');content.className='security-center-content';content.id='security-center-content';content.hidden=true;
 toggle.setAttribute('aria-controls',content.id);
 toggle.addEventListener('click',()=>{
  const expanded=toggle.getAttribute('aria-expanded')!=='true';
  content.hidden=!expanded;
  toggle.setAttribute('aria-expanded',String(expanded));
  toggle.textContent=expanded?'🙈 Ocultar contenido':'👁️ Mostrar contenido';
 });
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
 content.append(nav,preferences);
 center.append(title,description,toggle,content);root.append(center);
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
// Seleccionar el elemento correcto ANTES de solicitar el recurso: un MP4 no debe cargarse como <img>.
function sbProfileVideoURL(source){
 try{
  const url = new URL(source,location.href);
  return url.protocol==='https:' && /\.(mp4|webm)$/i.test(url.pathname);
 }catch(_){return false}
}
function sbProfileMedia(source,alt,cssClass){
 const video=sbProfileVideoURL(source);
 const media=document.createElement(video?'video':'img');
 if(cssClass)media.className=cssClass;
 media.src=source;
 if(video){
  media.muted=true;media.defaultMuted=true;media.autoplay=true;media.loop=true;
  media.playsInline=true;media.preload='metadata';
  media.setAttribute('aria-label',alt||'Vídeo de perfil');
  media.addEventListener('loadedmetadata',()=>{
   if(!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)media.play().catch(()=>{});
  },{once:true});
 }else{
  media.alt=alt||'';
  media.referrerPolicy='no-referrer';
 }
 return media;
}

// Prevent an Android PWA from displaying "Cargando perfil" indefinitely when Auth is slow.
async function checkAccountSessionWithTimeout(task, milliseconds=9000){
 return Promise.race([
  task(),
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('La comprobación de sesión tardó demasiado.')),milliseconds))
 ]);
}
async function loadAccountProfile(){
 const root=document.getElementById('account-profile');if(!root)return;
 let user;
 try {
  // If this installed PWA has no saved session, don't wait for a network getUser call.
  const {data,error}=await checkAccountSessionWithTimeout(()=>sb.auth.getSession());
  if(error)throw error;
  user=data?.session?.user||null;
 } catch(error) {
  if(!root.isConnected)return;
  console.warn('No se pudo recuperar la sesión del móvil:',error.message);
  root.innerHTML='<section class="profile-panel" role="status"><h3>No se ha podido comprobar tu sesión</h3><p>Comprueba tu conexión y vuelve a intentarlo. Tu cuenta y tus datos siguen guardados.</p><button class="gradient-btn mini" id="account-session-retry" type="button">Reintentar</button> <a class="outline-btn mini" href="#/auth">Iniciar sesión</a></section>';
  root.querySelector('#account-session-retry')?.addEventListener('click',()=>{root.textContent='Comprobando tu sesión…';void loadAccountProfile();});
  return;
 }
 if(!root.isConnected)return;
 if(!user){
  root.innerHTML='<section class="profile-panel" role="status"><h3>Inicia sesión en este móvil</h3><p>Tu cuenta ya existe. Para ver tu perfil desde Android, entra con el mismo correo y contraseña que utilizas en Shadows Byte Gaming.</p><a class="gradient-btn mini" href="#/auth">Iniciar sesión con mi cuenta</a></section>';
  return;
 }
 // Revalidate against Auth when available; a transient connectivity issue must not trap the UI in a spinner.
 try{
  const {data,error}=await checkAccountSessionWithTimeout(()=>sb.auth.getUser(),6500);
  if(error)throw error;
  if(!data?.user){
   root.innerHTML='<section class="profile-panel" role="status"><h3>La sesión ha caducado</h3><p>Inicia sesión otra vez en este móvil con tu cuenta actual.</p><a class="gradient-btn mini" href="#/auth">Iniciar sesión</a></section>';
   return;
  }
  user=data.user;
 }catch(error){
  console.warn('No se pudo verificar la sesión online; se usa solo para mostrar el perfil guardado:',error.message);
 }
 if(!root.isConnected)return;
 const meta=user.user_metadata||{};
 const avatar=typeof meta.avatar_url==='string'&&/^https:\/\//i.test(meta.avatar_url)?meta.avatar_url:'';
 const name=meta.display_name||meta.full_name||'Mi perfil';
 root.innerHTML='<div class="profile-cover"><span>SHADOWS BYTE / PERFIL</span><span class="profile-cover-mark">SB</span></div><div class="profile-body"><div class="profile-identity"><div id="profile-avatar" class="profile-avatar"></div><div class="profile-identity-copy"><div class="profile-kicker">CUENTA PERSONAL</div><h2 id="profile-heading"></h2><p id="profile-email"></p><span class="profile-role">'+(user.app_metadata?.role==='admin'?'★ Administrador':'● Miembro')+'</span></div></div><div class="profile-grid"><section class="profile-panel"><h3>✦ Editar perfil</h3><p>Personaliza cómo apareces en Shadows Byte Gaming.</p><form id="profile-form"><label for="profile-name">Nombre de usuario</label><input id="profile-name" name="display_name" maxlength="60" required autocomplete="nickname" placeholder="Tu nombre"><label for="profile-avatar-url">Imagen de perfil (URL HTTPS)</label><input id="profile-avatar-url" name="avatar_url" type="url" placeholder="https://ejemplo.com/avatar.jpg"><button class="gradient-btn" type="submit">Guardar cambios</button><p id="profile-message" role="status" aria-live="polite"></p></form></section><section class="profile-panel"><h3>⚙ Ajustes de cuenta</h3><a class="profile-setting-link" href="#/regalos">🎁 Mi buzón de regalos <span>→</span></a><p>Información y seguridad de tu cuenta.</p><label for="profile-email-readonly">Correo electrónico</label><input id="profile-email-readonly" type="email" disabled><a class="profile-setting-link" href="#/forgot-password">🔒 Cambiar contraseña <span>→</span></a>'+(user.app_metadata?.role==='admin'?'<a class="profile-setting-link" href="#/admin">🛡 Panel de administración <span>→</span></a>':'')+'<button type="button" class="profile-signout" id="profile-signout">Cerrar sesión</button></section></div></div>';
 window.SBPollSeasonExtras?.mountProfileTrophies(root.querySelector('.profile-body'),user.id,{own:true});
 window.SBPollTrophyMuseum?.mount(root.querySelector('.profile-body'),user.id,{own:true});
 window.SBProfileNow?.mount(root.querySelector('.profile-body'),user.id,{own:true});
 window.SBPollAwardCeremony?.maybeCelebrate(user.id);
 const librarySection=document.createElement('section');librarySection.className='profile-panel game-library-section';librarySection.id='game-library';librarySection.innerHTML='<h3>🎮 Mi biblioteca de videojuegos</h3><p>Organiza tus juegos: jugando, terminados y pendientes. Esta biblioteca es privada.</p><form id="game-library-form" class="game-library-form"><label for="game-library-title">Nombre del videojuego</label><input id="game-library-title" maxlength="120" required placeholder="Ej. Pokémon Escarlata"><label for="game-library-status">Estado</label><select id="game-library-status"><option value="playing">🎮 Jugando</option><option value="completed">🏆 Terminado</option><option value="wishlist">⭐ Quiero jugar</option></select><label for="game-library-platform">Plataforma (opcional)</label><input id="game-library-platform" maxlength="80" placeholder="PC, PlayStation, Nintendo Switch..."><label for="game-library-notes">Notas (opcional)</label><textarea id="game-library-notes" maxlength="500" rows="2" placeholder="Mis impresiones"></textarea><button class="gradient-btn" type="submit">➕ Añadir videojuego</button></form><p id="game-library-message" role="status" aria-live="polite"></p><div class="game-library-filters" role="group" aria-label="Filtrar videojuegos"><button type="button" data-game-filter="all" aria-pressed="true">Todos</button><button type="button" data-game-filter="playing">Jugando</button><button type="button" data-game-filter="completed">Terminados</button><button type="button" data-game-filter="wishlist">Quiero jugar</button></div><div id="game-library-list" aria-live="polite">Cargando biblioteca…</div>';
 const extras=document.createElement('div');extras.className='game-library-extras';
 extras.innerHTML='<label for="game-library-cover">🖼️ Portada (URL HTTPS, opcional)</label><input id="game-library-cover" type="url" placeholder="https://.../portada.jpg"><label for="game-library-rating">⭐ Valoración</label><select id="game-library-rating"><option value="">Sin valorar</option><option value="1">★ 1 estrella</option><option value="2">★★ 2 estrellas</option><option value="3">★★★ 3 estrellas</option><option value="4">★★★★ 4 estrellas</option><option value="5">★★★★★ 5 estrellas</option></select><label for="game-library-review">✍️ Reseña personal (opcional)</label><textarea id="game-library-review" maxlength="1500" rows="3" placeholder="¿Qué te ha parecido este juego?"></textarea>';
 librarySection.querySelector('#game-library-form').insertBefore(extras,librarySection.querySelector('#game-library-form button[type="submit"]'));
 root.querySelector('.profile-body').append(librarySection);
 const accountSettingsCard=root.querySelector('.profile-grid .profile-panel:nth-child(2)');
 if(accountSettingsCard){
  const dndShortcut=document.createElement('button');
  dndShortcut.type='button';dndShortcut.className='profile-setting-link account-dnd-shortcut';
  dndShortcut.textContent='🌙 No molestar · 30 min / 1 h / 2 h';
  dndShortcut.setAttribute('aria-label','Ir a los controles de No molestar');
  dndShortcut.onclick=()=>{
   const target=document.getElementById('account-notification-settings');
   if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.classList.add('account-settings-highlight');setTimeout(()=>target.classList.remove('account-settings-highlight'),1800);}
  };
  accountSettingsCard.insertBefore(dndShortcut,accountSettingsCard.querySelector('#profile-signout'));
 }
 initMemberGameLibrary(user.id,librarySection);
 const libraryPrivacy=document.createElement('label');libraryPrivacy.className='game-library-sharing';
 const libraryCheckbox=document.createElement('input');libraryCheckbox.type='checkbox';libraryCheckbox.id='game-library-public';
 const libraryPrivacyText=document.createElement('span');libraryPrivacyText.textContent='Compartir mi biblioteca con otros miembros (solo si mi perfil es público)';
 const libraryPrivacyStatus=document.createElement('p');libraryPrivacyStatus.setAttribute('role','status');
 libraryPrivacy.append(libraryCheckbox,libraryPrivacyText);librarySection.insertBefore(libraryPrivacy,librarySection.querySelector('#game-library-form'));librarySection.insertBefore(libraryPrivacyStatus,librarySection.querySelector('#game-library-form'));
 sb.from('profiles').select('game_library_public').eq('id',user.id).maybeSingle().then(({data,error})=>{if(error){libraryPrivacyStatus.textContent='No se pudo cargar la privacidad: '+error.message;libraryCheckbox.disabled=true;return;}libraryCheckbox.checked=!!data?.game_library_public;});
 libraryCheckbox.onchange=async()=>{libraryCheckbox.disabled=true;const enabled=libraryCheckbox.checked;const {error}=await sb.from('profiles').update({game_library_public:enabled}).eq('id',user.id);libraryCheckbox.disabled=false;if(error){libraryCheckbox.checked=!enabled;libraryPrivacyStatus.textContent='No se pudo cambiar la privacidad: '+error.message;}else libraryPrivacyStatus.textContent=enabled?'Biblioteca compartida con miembros cuando tu perfil sea público.':'Tu biblioteca vuelve a ser privada.';};
 const communityPanel=document.createElement('section');
 communityPanel.className='profile-panel account-community-panel';
 communityPanel.setAttribute('aria-label','Mi comunidad');
 communityPanel.innerHTML='<h3>✦ Mi comunidad</h3><p>Consulta las novedades, participa en los retos y revisa tus avisos. Tus publicaciones están en «Muro social · Perfil ID».</p><p class="account-community-links"><a class="outline-btn mini" href="#/comunidad">Ver muro de la comunidad</a> <a class="outline-btn mini" href="#/notificaciones">🔔 Mis notificaciones</a></p>';
 root.querySelector('.profile-body')?.append(communityPanel);
 // Reutilizamos las publicaciones de Mi comunidad: un muro accesible sin duplicar mensajes.
 const wallPanel=document.createElement('details');
 wallPanel.className='profile-panel sb-profile-wall-panel';
 wallPanel.id='sb-profile-wall-panel';
 const wallSummary=document.createElement('summary');
 wallSummary.textContent='📝 Muro social · Perfil ID';
 const wallHint=document.createElement('p');wallHint.className='sb-profile-wall-hint';
 wallHint.textContent='Publica en tu perfil, recibe comentarios y descubre reacciones anime. Las publicaciones también aparecen en Comunidad.';
 const wallContent=document.createElement('div');
 wallContent.id='account-community-social';wallContent.className='account-community-social';
 wallContent.textContent='Cargando publicaciones…';
 wallPanel.append(wallSummary,wallHint,wallContent);
 const wallAnchor=root.querySelector('.profile-grid');
 if(wallAnchor)wallAnchor.after(wallPanel);else root.querySelector('.profile-body')?.append(wallPanel);
 const myAchievements=document.createElement('section');myAchievements.className='profile-panel';myAchievements.innerHTML='<h3>🏆 Mis logros y nivel</h3><p>Consulta tus insignias, XP y clasificación.</p><a class="gradient-btn mini" href="#/logros">Ver mis logros</a>';
 root.querySelector('.profile-identity')?.after(myAchievements);
 initAccountReportStatuses(user.id,root.querySelector('.profile-body'));
 const followPanel=document.createElement('section');followPanel.className='profile-panel account-follows-panel';followPanel.id='account-follows';communityPanel.before(followPanel);const blockedPanel=document.createElement('section');blockedPanel.className='profile-panel account-blocked-members';blockedPanel.id='account-blocked-members';followPanel.after(blockedPanel);loadAccountFollows(user.id,followPanel);
 loadMemberSocial(user.id,wallContent);
 const ownGallery=document.createElement('section');ownGallery.className='profile-panel member-gallery-panel';ownGallery.id='account-gallery';
 communityPanel.before(ownGallery);
 loadMemberGallery(user.id,ownGallery);
 document.getElementById('profile-signout').addEventListener('click',logout);
 // Every member profile is public automatically; authentication email remains private.
 const {data:profile}=await sb.from('profiles').select('bio,is_public,cover_url,theme_color,featured_badge,favorite_games,gaming_social_url,gaming_status,status_message,anime_card_style,favorite_anime,favorite_anime_character,profile_effect,profile_frame,cover_position,cover_tint,profile_background,profile_particles,profile_avatar_glow,profile_level_aura,profile_title,profile_showcase_badges,profile_card_layout,profile_card_motto').eq('id',user.id).maybeSingle();
 const panel=root.querySelector('.profile-grid .profile-panel');
 if(panel){
  const extra=document.createElement('div');extra.className='profile-public-settings';
  extra.innerHTML='<label for="profile-bio">Presentación para la comunidad</label><textarea id="profile-bio" maxlength="280" rows="3" placeholder="Cuéntanos algo sobre ti..."></textarea><label class="profile-checkbox"><input type="checkbox" id="profile-public" checked disabled> Perfil público automático para todos los miembros</label><p class="profile-privacy">Tu perfil será visible para todos los miembros. Tu correo y datos de acceso no serán públicos.</p>';
  panel.querySelector('#profile-form').insertBefore(extra,panel.querySelector('#profile-form button[type="submit"]'));
  const statusControls=document.createElement('div');statusControls.className='profile-gaming-status-editor';
  const gameStatusLabel=document.createElement('label');gameStatusLabel.textContent='🎮 Estado gaming';gameStatusLabel.htmlFor='profile-gaming-status';
  const gameStatus=document.createElement('select');gameStatus.id='profile-gaming-status';
  for(const [value,label] of [['disponible','🟢 Disponible'],['jugando','🎮 Jugando'],['buscando_grupo','👥 Buscando grupo'],['ausente','🌙 Ausente']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;gameStatus.append(option);
  }
  gameStatus.value=profile?.gaming_status||'disponible';
  const gameStatusMessageLabel=document.createElement('label');gameStatusMessageLabel.htmlFor='profile-gaming-message';gameStatusMessageLabel.textContent='💬 Mensaje de estado (máximo 120 caracteres)';
  const gameStatusMessage=document.createElement('input');gameStatusMessage.id='profile-gaming-message';gameStatusMessage.maxLength=120;gameStatusMessage.placeholder='Ej.: Hoy juego a Pokémon';gameStatusMessage.value=profile?.status_message||'';
  const gameStatusHint=document.createElement('small');gameStatusHint.textContent='Se mostrará a otros miembros únicamente si activas tu perfil público.';
  statusControls.append(gameStatusLabel,gameStatus,gameStatusMessageLabel,gameStatusMessage,gameStatusHint);
  panel.querySelector('#profile-form').insertBefore(statusControls,panel.querySelector('#profile-form button[type="submit"]'));

  document.getElementById('profile-bio').value=profile?.bio||'';
  document.getElementById('profile-public').checked=true;
  const customization=document.createElement('div');customization.className='profile-customization';
  customization.innerHTML='<label for="profile-cover-url">🖼️ Portada (URL HTTPS)</label><input id="profile-cover-url" type="url" placeholder="https://ejemplo.com/portada.jpg"><label for="profile-theme">🎨 Color del perfil</label><select id="profile-theme"><option value="violet">Morado</option><option value="blue">Azul</option><option value="emerald">Verde</option><option value="rose">Rosa</option><option value="amber">Dorado</option></select>';
  panel.querySelector('#profile-form').insertBefore(customization,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-cover-url').value=profile?.cover_url||'';
  document.getElementById('profile-theme').value=profile?.theme_color||'violet';

  // Opciones visuales públicas; colapsadas para mantener Mi cuenta despejada.
  const visualEditor=document.createElement('details');
  visualEditor.className='profile-customization sb-anime-visual-editor';
  const visualSummary=document.createElement('summary');
  visualSummary.textContent='✨ Personalización anime y efectos por nivel';
  const visualFields=document.createElement('div');
  visualFields.className='sb-anime-visual-fields';
  for(const [id,label,options,current] of [
   ['profile-effect','🌸 Efecto anime en perfil y vídeos',[['none','Sin efecto'],['sakura','Pétalos Sakura'],['neon','Luces neón'],['stars','Brillos estelares']],profile?.profile_effect],
   ['profile-frame','💠 Marco animado',[['none','Sin marco'],['sakura','Rosa Sakura'],['neon','Azul neón'],['gold','Dorado gamer']],profile?.profile_frame],
   ['profile-cover-position','🖼️ Encuadre de portada',[['center','Centrado'],['top','Mostrar parte superior'],['bottom','Mostrar parte inferior']],profile?.cover_position],
   ['profile-cover-tint','🎨 Intensidad de la portada',[['soft','Suave · texto legible'],['cinematic','Cinematográfica'],['clear','Sin sombreado extra']],profile?.cover_tint],
   ['profile-background','🌌 Fondo animado del perfil',[['none','Original'],['cosmic','Galaxia anime'],['aurora','Aurora mágica'],['sunset','Atardecer sakura']],profile?.profile_background],
   ['profile-particles','✨ Partículas flotantes',[['none','Sin partículas'],['fireflies','Luciérnagas'],['petals','Pétalos suaves'],['sparks','Destellos mágicos']],profile?.profile_particles],
   ['profile-avatar-glow','💫 Halo luminoso del avatar',[['none','Sin halo'],['violet','Morado místico'],['cyan','Cian gamer'],['pink','Rosa anime'],['gold','Dorado legendario']],profile?.profile_avatar_glow],
   ['profile-level-aura','🔱 Aura exclusiva por nivel',[['none','Sin efecto exclusivo'],['storm','⚡ Tormenta shōnen · Nivel 2'],['astral','🌌 Aura astral · Nivel 3'],['phoenix','🔥 Fénix legendario · Nivel 5']],profile?.profile_level_aura]
  ]){
   const group=document.createElement('div');
   const caption=document.createElement('label');caption.htmlFor=id;caption.textContent=label;
   const select=document.createElement('select');select.id=id;
   for(const [value,title] of options){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option)}
   select.value=options.some(([value])=>value===current)?current:options[0][0];
   group.append(caption,select);visualFields.append(group);
  }
  const visualHint=document.createElement('small');
  visualHint.textContent='Los efectos se aplican a fotos, GIF y vídeos. Guarda los cambios para mostrarlos a otros miembros.';
  visualEditor.append(visualSummary,visualFields,visualHint);
  panel.querySelector('#profile-form').insertBefore(visualEditor,panel.querySelector('#profile-form button[type="submit"]'));
  const levelSelect=document.getElementById('profile-level-aura');
  const levelProgress=document.createElement('div');
  levelProgress.className='sb-level-reward-overview';
  levelProgress.setAttribute('aria-live','polite');
  levelProgress.textContent='🏅 Comprobando tus XP y los efectos de nivel…';
  visualEditor.append(levelProgress);
  for(const option of levelSelect.options)if(option.value!=='none')option.disabled=true;
  sb.rpc('community_member_xp',{target_member:user.id}).then(({data,error:xpError})=>{
   if(!levelProgress.isConnected)return;
   if(xpError||data===null){
    levelProgress.textContent='No se pudieron comprobar tus XP. Puedes seguir editando los demás estilos.';
    return;
   }
   const xp=Math.max(0,Number(data)||0),level=Math.floor(Math.sqrt(xp/100))+1;
   levelProgress.replaceChildren();
   const caption=document.createElement('strong');
   caption.textContent='🏆 Tu nivel: '+level+' · '+xp+' XP';
   levelProgress.append(caption);
   for(const [aura,min,label] of [
    ['storm',100,'⚡ Tormenta shōnen · Nivel 2'],
    ['astral',400,'🌌 Aura astral · Nivel 3'],
    ['phoenix',1600,'🔥 Fénix legendario · Nivel 5']
   ]){
    const option=Array.from(levelSelect.options).find(item=>item.value===aura);
    if(option)option.disabled=xp<min;
    const badge=document.createElement('span');
    badge.className='sb-level-reward-badge'+(xp>=min?' is-earned':' is-locked');
    badge.textContent=(xp>=min?'✅ ':'🔒 ')+label+(xp<min?' · '+min+' XP':'');
    levelProgress.append(badge);
   }
  }).catch(()=>{if(levelProgress.isConnected)levelProgress.textContent='No se pudo comprobar el nivel.'});

  const animeCardEditor=document.createElement('div');animeCardEditor.className='profile-customization';
  const animeCardTitle=document.createElement('label');animeCardTitle.htmlFor='profile-anime-card';animeCardTitle.textContent='🎴 Tarjeta de perfil anime';
  const animeCardSelect=document.createElement('select');animeCardSelect.id='profile-anime-card';
  for(const [value,label] of [['sakura','🌸 Sakura de primavera'],['neon','💜 Ciudad neón'],['stellar','🌌 Guardián estelar'],['lunar','🌙 Luna anime'],['cyber','⚡ Cyberpunk gamer'],['kitsune','🦊 Kitsune místico'],['shonen','🔥 Héroe shōnen']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;animeCardSelect.append(option);
  }
  animeCardSelect.value=profile?.anime_card_style||'sakura';
  const animeCardHint=document.createElement('small');animeCardHint.textContent='El estilo aparecerá en tu tarjeta de Miembros y en tu perfil público.';
  animeCardEditor.append(animeCardTitle,animeCardSelect,animeCardHint);
  panel.querySelector('#profile-form').insertBefore(animeCardEditor,panel.querySelector('#profile-form button[type="submit"]'));
  const animeIdentityEditor=document.createElement('div');animeIdentityEditor.className='profile-anime-identity-editor profile-customization';
  animeIdentityEditor.innerHTML='<h4>🌸 Mi identidad anime</h4><label for="profile-favorite-anime">Anime favorito</label><input id="profile-favorite-anime" type="text" maxlength="120" placeholder="Ej.: One Piece"><label for="profile-favorite-character">Personaje favorito</label><input id="profile-favorite-character" type="text" maxlength="100" placeholder="Ej.: Monkey D. Luffy"><small>Se verán en Miembros y tu tarjeta anime únicamente si haces público tu perfil.</small>';
  panel.querySelector('#profile-form').insertBefore(animeIdentityEditor,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-favorite-anime').value=profile?.favorite_anime||'';
  document.getElementById('profile-favorite-character').value=profile?.favorite_anime_character||'';
  const badgeSelect=document.createElement('div');badgeSelect.className='profile-customization';
  badgeSelect.innerHTML='<label for="profile-featured-badge">🏅 Insignia destacada</label><select id="profile-featured-badge"><option value="">Ninguna</option><option value="first">🌱 Primer paso · 5 XP</option><option value="participant">⭐ Participante · 50 XP</option><option value="active">🔥 Miembro activo · 150 XP</option><option value="legend">🏆 Leyenda · 500 XP</option></select><small>Solo puedes destacar insignias que hayas conseguido.</small>';
  panel.querySelector('#profile-form').insertBefore(badgeSelect,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-featured-badge').value=profile?.featured_badge||'';

  // Escaparate compacto: tres insignias verificadas por XP, un título de nivel.
  const showcase=document.createElement('details');
  showcase.className='profile-customization sb-showcase-editor';
  const showcaseSummary=document.createElement('summary');
  showcaseSummary.textContent='🏅 Mi escaparate y título gamer';
  const showcaseBody=document.createElement('div');showcaseBody.className='sb-showcase-editor-body';
  const titleLabel=document.createElement('label');titleLabel.htmlFor='profile-title';titleLabel.textContent='👑 Título que aparece en mi perfil público';
  const titleSelect=document.createElement('select');titleSelect.id='profile-title';
  for(const [value,label,min] of [
    ['none','Sin título',0],['recruit','🎮 Recluta Byte · Desde el inicio',0],
    ['explorer','🌟 Explorador Otaku · Nivel 2',100],
    ['guardian','⚔️ Guardián Gamer · Nivel 3',400],
    ['legend','👑 Leyenda Byte · Nivel 5',1600]
  ]){const option=document.createElement('option');option.value=value;option.textContent=label;option.dataset.minXp=String(min);if(min>0)option.disabled=true;titleSelect.append(option)}
  titleSelect.value=profile?.profile_title||'none';
  const badgeLabel=document.createElement('p');badgeLabel.textContent='🎖️ Elige hasta 3 insignias conseguidas';
  const badgeChoices=document.createElement('div');badgeChoices.className='sb-badge-picker';
  const badgeCatalog=[
    ['first','🌱 Primer paso',5],['participant','⭐ Participante',50],
    ['shonen','⚡ Explorador shōnen',100],['active','🔥 Miembro activo',150],
    ['astral','🌌 Guardián astral',400],['legend','🏆 Leyenda',500],
    ['phoenix','👑 Fénix legendario',1600]
  ];
  const previousBadges=Array.isArray(profile?.profile_showcase_badges)?profile.profile_showcase_badges:[];
  for(const [key,label,min] of badgeCatalog){
    const wrapper=document.createElement('label');wrapper.className='sb-badge-choice';
    const check=document.createElement('input');check.type='checkbox';check.value=key;check.dataset.minXp=String(min);
    check.checked=previousBadges.includes(key);check.disabled=true;
    const caption=document.createElement('span');caption.textContent=label+' · '+min+' XP';
    wrapper.append(check,caption);badgeChoices.append(wrapper);
  }
  const showcaseMessage=document.createElement('small');showcaseMessage.setAttribute('aria-live','polite');
  showcaseMessage.textContent='Comprobando XP y desbloqueos…';
  const badgeChecks=[...badgeChoices.querySelectorAll('input')];
  function chosenShowcase(){return badgeChecks.filter(check=>check.checked).map(check=>check.value)}
  for(const check of badgeChecks)check.addEventListener('change',()=>{
    const chosen=chosenShowcase();
    if(chosen.length>3){check.checked=false;showcaseMessage.textContent='Puedes destacar un máximo de 3 insignias.'}
    else showcaseMessage.textContent=chosen.length+'/3 insignias elegidas. Pulsa Guardar cambios para publicarlas.';
  });
  showcaseBody.append(titleLabel,titleSelect,badgeLabel,badgeChoices,showcaseMessage);
  showcase.append(showcaseSummary,showcaseBody);
  badgeSelect.after(showcase);
  sb.rpc('community_member_xp',{target_member:user.id}).then(({data,error})=>{
    if(!showcase.isConnected)return;
    if(error||data===null){showcaseMessage.textContent='No se pudieron verificar tus XP. No cambies las insignias hasta recargar.';return}
    const xp=Math.max(0,Number(data)||0);
    for(const option of titleSelect.options)option.disabled=xp<Number(option.dataset.minXp||0);
    for(const check of badgeChecks){check.disabled=xp<Number(check.dataset.minXp||0);check.parentElement?.classList.toggle('is-locked',check.disabled)}
    showcaseMessage.textContent='Tienes '+xp+' XP. Selecciona hasta 3 insignias desbloqueadas.';
  }).catch(()=>{if(showcase.isConnected)showcaseMessage.textContent='No se pudieron comprobar los XP.'});

  const gamerSettings=document.createElement('div');gamerSettings.className='profile-customization';
  gamerSettings.innerHTML='<h4>🎮 Perfil de jugador</h4><label for="profile-favorite-games">Juegos favoritos (separados por comas)</label><textarea id="profile-favorite-games" maxlength="300" rows="2" placeholder="Minecraft, Pokémon, Fortnite..."></textarea><label for="profile-gaming-social">Enlace a tu red social o canal (HTTPS)</label><input id="profile-gaming-social" type="url" placeholder="https://..."><label for="profile-card-motto">💬 Lema de mi tarjeta gamer (máximo 80 caracteres)</label><input id="profile-card-motto" type="text" maxlength="80" placeholder="¡Mi aventura anime comienza aquí!"><label for="profile-card-layout">🎴 Diseño de mi tarjeta gamer</label><select id="profile-card-layout"><option value="classic">Clásico · equilibrado</option><option value="hero">Heroico · avatar protagonista</option><option value="minimal">Minimalista · compacto</option></select><small>La tarjeta mostrará tu lema, título, juegos e identidad gamer sin ocupar demasiada página.</small>';
  panel.querySelector('#profile-form').insertBefore(gamerSettings,panel.querySelector('#profile-form button[type="submit"]'));
  document.getElementById('profile-favorite-games').value=profile?.favorite_games||'';
  document.getElementById('profile-gaming-social').value=profile?.gaming_social_url||'';
  document.getElementById('profile-card-motto').value=profile?.profile_card_motto||'';
  document.getElementById('profile-card-layout').value=profile?.profile_card_layout||'classic';
 }

 const heading=document.getElementById('profile-heading'),email=document.getElementById('profile-email');
 heading.textContent=name;email.textContent=user.email||'';applyShopProfileCosmetics(user.id,document.getElementById('profile-avatar'),heading,heading.parentElement);
 const form=document.getElementById('profile-form');
 form.elements.display_name.value=meta.display_name||meta.full_name||'';
 form.elements.avatar_url.value=avatar;
 document.getElementById('profile-email-readonly').value=user.email||'';
 const avatarNode=document.getElementById('profile-avatar');
 function paintAvatar(url,label){
  avatarNode.replaceChildren();
  if(url){
   const media=sbProfileMedia(url,'Avatar');
   media.style.cssText='width:100%;height:100%;object-fit:cover';
   media.onerror=()=>{avatarNode.textContent=(label||'?').charAt(0).toUpperCase()};
   avatarNode.append(media);
  }else avatarNode.textContent=(label||'?').charAt(0).toUpperCase();
 }

 paintAvatar(avatar,name);
 const editorPanel=form.closest('.profile-panel');
 const progress=document.createElement('div');progress.className='profile-completion';progress.setAttribute('aria-live','polite');
 const progressTitle=document.createElement('strong');const progressTrack=document.createElement('progress');progressTrack.max=100;progressTrack.setAttribute('aria-label','Perfil completado');
 const progressHint=document.createElement('p');progress.append(progressTitle,progressTrack,progressHint);
 const preview=document.createElement('div');preview.className='profile-live-preview';
 const previewHeading=document.createElement('h4');previewHeading.textContent='👁 Vista previa del perfil';
 const previewCard=document.createElement('div');previewCard.className='profile-preview-card';
 const previewAvatar=document.createElement('div');previewAvatar.className='profile-preview-avatar';
 const previewCopy=document.createElement('div');const previewName=document.createElement('strong');const previewBio=document.createElement('p');const previewAnime=document.createElement('div');previewAnime.className='profile-anime-tags';const previewVisibility=document.createElement('small');
 previewCopy.append(previewName,previewBio,previewAnime,previewVisibility);previewCard.append(previewAvatar,previewCopy);const previewCover=document.createElement('div');previewCover.className='profile-preview-cover';const previewCoverLabel=document.createElement('span');previewCoverLabel.textContent='SHADOWS BYTE / COMUNIDAD';const previewCoverImage=document.createElement('img');previewCoverImage.className='profile-preview-cover-image';previewCoverImage.alt='Vista previa de la portada';previewCoverImage.hidden=true;const previewCoverNotice=document.createElement('small');previewCoverNotice.className='profile-preview-cover-notice';previewCover.append(previewCoverImage,previewCoverLabel,previewCoverNotice);preview.append(previewHeading,previewCover,previewCard);
 const publicLink=document.createElement('a');publicLink.className='outline-btn mini';publicLink.href='#/perfil?id='+encodeURIComponent(user.id);publicLink.textContent='Ver mi perfil público';
 preview.append(publicLink);editorPanel.append(progress,preview);
 function updateProfilePreview(){
  const currentName=form.elements.display_name.value.trim(),currentAvatar=form.elements.avatar_url.value.trim(),bio=document.getElementById('profile-bio')?.value.trim()||'',visible=document.getElementById('profile-public')?.checked;
  const coverInput=document.getElementById('profile-cover-url');const coverNode=root.querySelector('.profile-cover');const coverUrl=coverInput?.value.trim()||'';const theme=document.getElementById('profile-theme')?.value||'violet';const validCover=/^https:\/\/[^\s]+$/i.test(coverUrl);
  const videoCover=validCover&&sbProfileVideoURL(coverUrl);
  previewCoverImage.hidden=!validCover||videoCover;
  previewCoverNotice.textContent=coverUrl&&!validCover?'Introduce una URL HTTPS válida para la portada.':'';
  if(videoCover)previewCoverImage.removeAttribute('src');
  if(validCover&&!videoCover&&previewCoverImage.getAttribute('src')!==coverUrl){
   previewCoverImage.src=coverUrl;
   previewCoverImage.onerror=()=>{previewCoverNotice.textContent='No se pudo cargar la imagen. Comprueba el enlace de la portada.';previewCoverImage.hidden=true;};
   previewCoverImage.onload=()=>{previewCoverNotice.textContent='';previewCoverImage.hidden=false;};
  }
  if(!validCover)previewCoverImage.removeAttribute('src');
  previewCover.dataset.theme=theme;
  root.dataset.sbEffect=document.getElementById('profile-effect')?.value||'none';
  root.dataset.sbFrame=document.getElementById('profile-frame')?.value||'none';
  root.dataset.sbCoverPosition=document.getElementById('profile-cover-position')?.value||'center';
  root.dataset.sbCoverTint=document.getElementById('profile-cover-tint')?.value||'soft';
  root.dataset.sbBackground=document.getElementById('profile-background')?.value||'none';
  root.dataset.sbParticles=document.getElementById('profile-particles')?.value||'none';
  root.dataset.sbAvatarGlow=document.getElementById('profile-avatar-glow')?.value||'none';
  root.dataset.sbLevelAura=document.getElementById('profile-level-aura')?.value||'none';
  root.dataset.sbCardLayout=document.getElementById('profile-card-layout')?.value||'classic';
  previewCard.dataset.animeCard=document.getElementById('profile-anime-card')?.value||'sakura';
  if(coverNode){
   coverNode.style.backgroundImage=(validCover&&!videoCover)?'url("'+coverUrl.replace(/["'()\\]/g,'')+'")':'';
   coverNode.dataset.theme=theme;
  }
  const score=[!!currentName,!!currentAvatar,!!bio,!!visible].filter(Boolean).length*25;
  progressTitle.textContent='Perfil completado: '+score+'%';progressTrack.value=score;
  progressHint.textContent=score===100?'¡Tu perfil está completo!':'Completa tu nombre, imagen, presentación y visibilidad para llegar al 100%.';
  previewName.textContent=currentName||'Tu nombre';previewBio.textContent=bio||'Tu presentación aparecerá aquí.';
  previewAnime.replaceChildren();
  for(const [emoji,value] of [['🎬',document.getElementById('profile-favorite-anime')?.value.trim()],['⭐',document.getElementById('profile-favorite-character')?.value.trim()]]){
   if(value){const chip=document.createElement('span');chip.textContent=emoji+' '+value;previewAnime.append(chip);}
  }
  previewAnime.hidden=!previewAnime.childElementCount;
  previewVisibility.textContent=visible?'Visible en Miembros al guardar':'Perfil privado';
  previewAvatar.replaceChildren();
  if(/^https:\/\/[^\s]+$/i.test(currentAvatar)){const media=sbProfileMedia(currentAvatar,'Vista previa del avatar');media.onerror=()=>{previewAvatar.textContent=(currentName||'?').charAt(0).toUpperCase()};previewAvatar.append(media);}
  else previewAvatar.textContent=(currentName||'?').charAt(0).toUpperCase();
  publicLink.hidden=!visible;
 }
 for(const element of [form.elements.display_name,form.elements.avatar_url,document.getElementById('profile-bio'),document.getElementById('profile-public'),document.getElementById('profile-cover-url'),document.getElementById('profile-theme'),document.getElementById('profile-anime-card'),document.getElementById('profile-effect'),document.getElementById('profile-frame'),document.getElementById('profile-cover-position'),document.getElementById('profile-cover-tint'),document.getElementById('profile-background'),document.getElementById('profile-particles'),document.getElementById('profile-avatar-glow'),document.getElementById('profile-level-aura'),document.getElementById('profile-card-layout'),document.getElementById('profile-favorite-anime'),document.getElementById('profile-favorite-character')]){if(element){element.addEventListener('input',updateProfilePreview);element.addEventListener('change',updateProfilePreview);}}
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
    const is_public=true;
    const cover_url=document.getElementById('profile-cover-url').value.trim();
    if(cover_url&&!/^https:\/\/[^\s]+$/i.test(cover_url)){status.textContent='La portada debe ser una URL HTTPS válida.';return;}
    const theme_color=document.getElementById('profile-theme').value;
    const featured_badge=document.getElementById('profile-featured-badge').value;
    const selectedTitle=document.getElementById('profile-title').value;
    const selectedShowcase=[...root.querySelectorAll('.sb-badge-picker input:checked')].map(input=>input.value);
    if(selectedShowcase.length>3){status.textContent='Selecciona un máximo de 3 insignias.';return;}
    const thresholds={first:5,participant:50,active:150,legend:500};
    const levelAura=document.getElementById('profile-level-aura').value;
    const auraThreshold={none:0,storm:100,astral:400,phoenix:1600};
    if(featured_badge||levelAura!=='none'||selectedShowcase.length||!['none','recruit'].includes(selectedTitle)){
     const {data:xp,error:xpError}=await sb.rpc('community_member_xp',{target_member:user.id});
     if(xpError||xp===null){status.textContent='No se pudieron comprobar tus XP. Prueba de nuevo.';return;}
     if(featured_badge&&Number(xp)<thresholds[featured_badge]){status.textContent='Todavía no has desbloqueado esa insignia.';return;}
     if(Number(xp)<(auraThreshold[levelAura]??Infinity)){status.textContent='Este efecto exclusivo necesita más XP. Continúa subiendo de nivel.';return;}
     const titleThreshold={none:0,recruit:0,explorer:100,guardian:400,legend:1600};
     const badgeThreshold={first:5,participant:50,shonen:100,active:150,astral:400,legend:500,phoenix:1600};
     if(Number(xp)<(titleThreshold[selectedTitle]??Infinity)){status.textContent='Todavía no has desbloqueado ese título.';return;}
     if(selectedShowcase.some(key=>Number(xp)<(badgeThreshold[key]??Infinity))){status.textContent='Una insignia del escaparate sigue bloqueada.';return;}
    }
    const favorite_games=document.getElementById('profile-favorite-games').value.trim();
    const gaming_social_url=document.getElementById('profile-gaming-social').value.trim();
    if(gaming_social_url&&!/^https:\/\/[^\s]+$/i.test(gaming_social_url)){status.textContent='El enlace social debe comenzar por https://';return;}
    const payload={id:user.id,display_name,avatar_url:avatar_url||null,bio,is_public,cover_url:cover_url||null,theme_color,profile_effect:document.getElementById('profile-effect').value,profile_frame:document.getElementById('profile-frame').value,cover_position:document.getElementById('profile-cover-position').value,profile_background:document.getElementById('profile-background').value,profile_particles:document.getElementById('profile-particles').value,profile_avatar_glow:document.getElementById('profile-avatar-glow').value,profile_level_aura:levelAura,profile_title:selectedTitle,profile_showcase_badges:selectedShowcase,profile_card_layout:document.getElementById('profile-card-layout').value,profile_card_motto:document.getElementById('profile-card-motto').value.trim(),cover_tint:document.getElementById('profile-cover-tint').value,featured_badge:featured_badge||null,favorite_games,gaming_social_url:gaming_social_url||null,favorite_anime:document.getElementById('profile-favorite-anime').value.trim(),favorite_anime_character:document.getElementById('profile-favorite-character').value.trim(),anime_card_style:document.getElementById('profile-anime-card').value,gaming_status:document.getElementById('profile-gaming-status').value,status_message:document.getElementById('profile-gaming-message').value.trim()};
    const {data:existing, error:readError}=await sb.from('profiles').select('id').eq('id',user.id).maybeSingle();
    if(readError){status.textContent='No se pudo comprobar tu perfil: '+readError.message;return;}
    const request=existing
      ?sb.from('profiles').update(payload).eq('id',user.id).select('id,is_public')
      :sb.from('profiles').insert(payload).select('id,is_public');
    const {data:saved,error:profileError}=await request.single();
    if(profileError||!saved){status.textContent='No se pudo guardar el perfil de Miembros: '+(profileError?.message||'No se confirmó el guardado');return;}
    status.textContent='Perfil público guardado. Ya puedes verlo en Miembros.';
   }
   if(error){status.textContent='No se pudo guardar: '+error.message;return;}
   heading.textContent=display_name;paintAvatar(avatar_url,display_name);updateProfilePreview();
  }catch(err){status.textContent='No se pudo guardar: '+err.message}
  finally{button.disabled=false;}
 });
 initSecurityPrivacyCenter(user.id,root.querySelector('.profile-body'));
}

async function loadMembers(){
 const root=document.getElementById('members-list');if(!root)return;
 const {data,error}=await sb.from('profiles').select('id,display_name,username,avatar_url,cover_url,bio,created_at,gaming_status,status_message,anime_card_style,favorite_anime,favorite_anime_character,profile_effect,profile_frame,cover_position,cover_tint,profile_background,profile_particles,profile_avatar_glow,profile_level_aura,profile_title,profile_showcase_badges,profile_card_layout,profile_card_motto').eq('is_public',true).order('created_at',{ascending:false}).limit(100);
 if(!root.isConnected)return;
 if(error){root.innerHTML='<div class="admin-empty">No se pudo cargar la lista de miembros.</div>';return;}
 const members=data||[];
 function draw(){
  const term=(document.getElementById('members-search')?.value||'').toLocaleLowerCase().trim();
  const filtered=members.filter(x=>[x.display_name,x.username,x.favorite_anime,x.favorite_anime_character].some(value=>String(value||'').toLocaleLowerCase().includes(term)));
  root.replaceChildren();
  if(!filtered.length){const empty=document.createElement('div');empty.className='admin-empty';empty.textContent=term?'No se encontraron miembros.':'Todavía no hay miembros registrados.';root.append(empty);return;}
  filtered.forEach(member=>{
   const card=document.createElement('article');card.className='member-card';card.dataset.animeCard=['sakura','neon','stellar','lunar','cyber','kitsune','shonen'].includes(member.anime_card_style)?member.anime_card_style:'sakura';
   card.dataset.sbEffect=member.profile_effect||'none';
   card.dataset.sbFrame=member.profile_frame||'none';
   card.dataset.sbCoverPosition=member.cover_position||'center';
   card.dataset.sbCoverTint=member.cover_tint||'soft';
   card.dataset.sbBackground=member.profile_background||'none';
   card.dataset.sbParticles=member.profile_particles||'none';
   card.dataset.sbAvatarGlow=member.profile_avatar_glow||'none';
   card.dataset.sbLevelAura=member.profile_level_aura||'none';
   const avatar=document.createElement('div');avatar.className='member-avatar';
   const name=member.display_name||member.username||'Miembro';
   // Usar la imagen original: los GIF conservan sus fotogramas y su animación.
   let cover=null;
   if(typeof member.cover_url==='string'&&/^https:\/\/[^\s]+$/i.test(member.cover_url)){
    cover=document.createElement('div');cover.className='sb-member-card-cover';
    const coverImage=sbProfileMedia(member.cover_url,'Portada de '+name,'sb-member-card-cover-image');
    if(coverImage.tagName==='IMG'){coverImage.loading='lazy';coverImage.decoding='async';}
    coverImage.onerror=()=>{cover.remove();card.classList.remove('sb-member-card-has-cover');};
    cover.append(coverImage);card.classList.add('sb-member-card-has-cover');
   }
   if(typeof member.avatar_url==='string'&&/^https:\/\//i.test(member.avatar_url)){const media=sbProfileMedia(member.avatar_url,'Perfil de '+name);if(media.tagName==='IMG'){media.loading='lazy';media.decoding='async'}media.onerror=()=>{media.remove();avatar.textContent=name.charAt(0).toUpperCase()};avatar.append(media)}else avatar.textContent=name.charAt(0).toUpperCase();
   const heading=document.createElement('h2');heading.textContent=name;
   const bio=document.createElement('p');bio.textContent=member.bio||'Miembro de Shadows Byte Gaming Official';
   const animeTags=document.createElement('div');animeTags.className='profile-anime-tags';
   for(const [icon,value] of [['🎬',member.favorite_anime],['⭐',member.favorite_anime_character]]){if(value){const chip=document.createElement('span');chip.textContent=icon+' '+value;animeTags.append(chip);}}
   const link=document.createElement('a');link.className='gradient-btn mini member-view-link';link.href='#/perfil?id='+encodeURIComponent(member.id);link.textContent='Ver perfil';
   const gameStatusText=document.createElement('p');gameStatusText.className='member-gaming-status';const states={disponible:'🟢 Disponible',jugando:'🎮 Jugando',buscando_grupo:'👥 Buscando grupo',ausente:'🌙 Ausente'};gameStatusText.textContent=states[member.gaming_status]||states.disponible;if(member.status_message)gameStatusText.textContent+=' · '+member.status_message;
   const messageLink=document.createElement('a');messageLink.className='outline-btn mini';messageLink.href='#/mensajes?id='+encodeURIComponent(member.id);messageLink.textContent='💬 Mensaje privado';if(cover)card.append(cover);card.append(avatar,heading,gameStatusText,bio);if(animeTags.childElementCount)card.append(animeTags);const actions=document.createElement('div');actions.className='member-card-actions';actions.append(link,messageLink);card.append(actions);root.append(card);applyShopProfileCosmetics(member.id,avatar,heading,card);
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
 const {data:member,error}=await sb.from('profiles').select('id,display_name,username,avatar_url,bio,created_at,cover_url,theme_color,featured_badge,favorite_games,gaming_social_url,game_library_public,gaming_status,status_message,anime_card_style,favorite_anime,favorite_anime_character,profile_effect,profile_frame,cover_position,cover_tint,profile_background,profile_particles,profile_avatar_glow,profile_level_aura,profile_title,profile_showcase_badges,profile_card_layout,profile_card_motto').eq('id',id).eq('is_public',true).maybeSingle();
 if(!root.isConnected||location.hash.split('?')[0]!=='#/perfil')return;
 root.replaceChildren();
 if(error||!member){root.innerHTML='<div class="admin-empty">Este perfil no está disponible o es privado.</div><a class="outline-btn" href="#/miembros">Volver a Miembros</a>';return;}
 root.dataset.sbEffect=member.profile_effect||'none';
 root.dataset.sbFrame=member.profile_frame||'none';
 root.dataset.sbCoverPosition=member.cover_position||'center';
 root.dataset.sbCoverTint=member.cover_tint||'soft';
 root.dataset.sbBackground=member.profile_background||'none';
 root.dataset.sbParticles=member.profile_particles||'none';
 root.dataset.sbAvatarGlow=member.profile_avatar_glow||'none';
 root.dataset.sbLevelAura=member.profile_level_aura||'none';
 root.dataset.sbCardLayout=member.profile_card_layout||'classic';
 root.dataset.sbCardMotto=member.profile_card_motto||'';
 const cover=document.createElement('div');cover.className='public-member-cover';
 const coverLabel=document.createElement('span');coverLabel.textContent='SHADOWS BYTE / COMUNIDAD';cover.append(coverLabel);
 cover.dataset.theme=['violet','blue','emerald','rose','amber'].includes(member.theme_color)?member.theme_color:'violet';
 if(typeof member.cover_url==='string'&&/^https:\/\/[^\s]+$/i.test(member.cover_url)){
  const coverImage=sbProfileMedia(member.cover_url,'Portada de '+(member.display_name||member.username||'miembro'),'public-member-cover-image');coverImage.onerror=()=>coverImage.remove();cover.prepend(coverImage);
 }
 const content=document.createElement('div');content.className='public-member-body';content.dataset.animeCard=['sakura','neon','stellar','lunar','cyber','kitsune','shonen'].includes(member.anime_card_style)?member.anime_card_style:'sakura';
 const avatar=document.createElement('div');avatar.className='public-member-avatar';
 const name=member.display_name||member.username||'Miembro';
 if(typeof member.avatar_url==='string'&&/^https:\/\//i.test(member.avatar_url)){
  const media=sbProfileMedia(member.avatar_url,'Vídeo o imagen de '+name);media.onerror=()=>{avatar.replaceChildren(document.createTextNode(name.charAt(0).toUpperCase()))};avatar.append(media);
 }else avatar.textContent=name.charAt(0).toUpperCase();
 const title=document.createElement('h1');title.textContent=name;
 const badge=document.createElement('span');badge.className='profile-role';badge.textContent='● Miembro de la comunidad';
 const featuredLabels={first:'🌱 Primer paso',participant:'⭐ Participante',active:'🔥 Miembro activo',legend:'🏆 Leyenda'};
 const featured=document.createElement('span');featured.className='profile-featured-badge';featured.hidden=true;
 if(featuredLabels[member.featured_badge]){sb.rpc('community_member_xp',{target_member:member.id}).then(({data,error})=>{const thresholds={first:5,participant:50,active:150,legend:500};if(!error&&Number(data)>=thresholds[member.featured_badge]&&featured.isConnected){featured.textContent='Insignia destacada: '+featuredLabels[member.featured_badge];featured.hidden=false;}});}
 const bioTitle=document.createElement('h2');bioTitle.textContent='Sobre mí';
 const bio=document.createElement('p');bio.className='public-member-bio';bio.textContent=member.bio||'Este miembro todavía no ha escrito una presentación.';
 const back=document.createElement('a');back.href='#/miembros';back.className='outline-btn';back.textContent='← Volver a Miembros';
 const publicStatus=document.createElement('p');publicStatus.className='member-gaming-status';const gamingLabels={disponible:'🟢 Disponible',jugando:'🎮 Jugando',buscando_grupo:'👥 Buscando grupo',ausente:'🌙 Ausente'};publicStatus.textContent=(gamingLabels[member.gaming_status]||gamingLabels.disponible)+(member.status_message?' · '+member.status_message:'');
 content.append(avatar,title,badge,publicStatus,featured,bioTitle,bio);
 if(member.favorite_anime||member.favorite_anime_character){
  const animePanel=document.createElement('section');animePanel.className='profile-panel public-anime-identity';
  const animeHeading=document.createElement('h2');animeHeading.textContent='🌸 Mi universo anime';
  const animeTags=document.createElement('div');animeTags.className='profile-anime-tags';
  for(const [icon,label,value] of [['🎬','Anime favorito',member.favorite_anime],['⭐','Personaje favorito',member.favorite_anime_character]]){
   if(value){const chip=document.createElement('span');chip.textContent=icon+' '+label+': '+value;animeTags.append(chip);}
  }
  animePanel.append(animeHeading,animeTags);content.append(animePanel);
 }
 const earnedPanel=document.createElement('section');earnedPanel.className='member-anime-badges';
 const earnedTitle=document.createElement('h3');earnedTitle.textContent='🏅 Mi escaparate de insignias';
 const showcaseList=document.createElement('div');showcaseList.className='sb-profile-badge-showcase';
 showcaseList.textContent='Comprobando insignias…';
 const allBadges=document.createElement('details');allBadges.className='sb-more-badges';
 const allBadgesTitle=document.createElement('summary');allBadgesTitle.textContent='Ver todas las insignias y sus requisitos';
 const earnedList=document.createElement('div');earnedList.className='member-anime-badge-list';
 allBadges.append(allBadgesTitle,earnedList);
 earnedPanel.append(earnedTitle,showcaseList,allBadges);
 const levels=[
  {key:'first',threshold:5,label:'🌱 Primer paso'},
  {key:'participant',threshold:50,label:'⭐ Participante'},
  {key:'shonen',threshold:100,label:'⚡ Explorador shōnen'},
  {key:'active',threshold:150,label:'🔥 Miembro activo'},
  {key:'astral',threshold:400,label:'🌌 Guardián astral'},
  {key:'legend',threshold:500,label:'🏆 Leyenda'},
  {key:'phoenix',threshold:1600,label:'👑 Fénix legendario'}
 ];
 const rank=document.createElement('p');rank.className='sb-public-rank-title';rank.hidden=true;
 publicStatus.after(rank);
 sb.rpc('community_member_xp',{target_member:member.id}).then(({data,error})=>{
  if(!earnedList.isConnected||!showcaseList.isConnected)return;
  earnedList.replaceChildren();showcaseList.replaceChildren();
  if(error||data===null){
   showcaseList.textContent='No se pudieron comprobar las insignias.';
   allBadges.hidden=true;return;
  }
  const xp=Math.max(0,Number(data)||0);
  const titleLabels={recruit:'🎮 Recluta Byte',explorer:'🌟 Explorador Otaku',guardian:'⚔️ Guardián Gamer',legend:'👑 Leyenda Byte'};
  const titleMin={recruit:0,explorer:100,guardian:400,legend:1600};
  if(titleLabels[member.profile_title]&&xp>=titleMin[member.profile_title]){
   rank.textContent=titleLabels[member.profile_title];
   rank.hidden=false;
   root.dataset.sbRankTitle=rank.textContent;
   root.dispatchEvent(new Event('sb:profile-rank-update'));
  }
  const selected=Array.isArray(member.profile_showcase_badges)?member.profile_showcase_badges:[];
  const earned=levels.filter(item=>xp>=item.threshold);
  const saved=selected.map(key=>earned.find(item=>item.key===key)).filter(Boolean).slice(0,3);
  const shown=saved.length?saved:earned.slice(-3).reverse();
  if(!shown.length)showcaseList.textContent='Todavía no tienes insignias. ¡Participa para conseguirlas!';
  for(const item of shown){
   const badgeChip=document.createElement('span');
   badgeChip.className='sb-showcase-badge is-earned';
   badgeChip.textContent=item.label;
   showcaseList.append(badgeChip);
  }
  for(const item of levels){
   const chip=document.createElement('span');const unlocked=xp>=item.threshold;
   chip.className='member-anime-badge'+(unlocked?' is-earned':' is-locked');
   chip.textContent=(unlocked?'✅ ':'🔒 ')+item.label+(unlocked?'':' · '+item.threshold+' XP');
   earnedList.append(chip);
  }
 }).catch(()=>{if(showcaseList.isConnected)showcaseList.textContent='No se pudieron cargar las insignias.'});
 content.append(earnedPanel);
 window.SBPollSeasonExtras?.mountProfileTrophies(content,member.id,{own:false});
 window.SBPollTrophyMuseum?.mount(content,member.id,{own:false});
 window.SBProfileNow?.mount(content,member.id,{own:false});
 const gamerPanel=document.createElement('section');gamerPanel.className='profile-panel gamer-profile-panel';
 const gamerHeading=document.createElement('h2');gamerHeading.textContent='🎮 Perfil de jugador';gamerPanel.append(gamerHeading);
 if(member.favorite_games){const gamesTitle=document.createElement('h3');gamesTitle.textContent='Juegos favoritos';gamerPanel.append(gamesTitle);const games=document.createElement('div');games.className='gamer-favorite-games';member.favorite_games.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12).forEach(game=>{const tag=document.createElement('span');tag.textContent='🎮 '+game;games.append(tag)});gamerPanel.append(games);}
 if(member.gaming_social_url&&/^https:\/\/[^\s]+$/i.test(member.gaming_social_url)){const socialLink=document.createElement('a');socialLink.href=member.gaming_social_url;socialLink.target='_blank';socialLink.rel='noopener noreferrer';socialLink.className='outline-btn mini';socialLink.textContent='🔗 Red social / canal';gamerPanel.append(socialLink);}
 if(gamerPanel.children.length>1)content.append(gamerPanel);
 applyShopProfileCosmetics(member.id,avatar,title,content);
 if(member.game_library_public){
  const publicLibrary=document.createElement('section');publicLibrary.className='profile-panel public-game-library';
  publicLibrary.innerHTML='<h2>🎮 Biblioteca de videojuegos</h2><p>Cargando juegos compartidos…</p>';content.append(publicLibrary);
  sb.from('member_game_library').select('id,title,status,platform,cover_url,rating,review').eq('user_id',member.id).order('created_at',{ascending:false}).limit(300).then(({data,error})=>{
   if(!publicLibrary.isConnected)return;publicLibrary.replaceChildren();const heading=document.createElement('h2');heading.textContent='🎮 Biblioteca de videojuegos';publicLibrary.append(heading);
   if(error){const msg=document.createElement('p');msg.textContent='No se pudo cargar la biblioteca.';publicLibrary.append(msg);return;}
   const games=data||[];const labels={playing:'🎮 Jugando',completed:'🏆 Terminados',wishlist:'⭐ Quiero jugar'};
   const summary=document.createElement('p');summary.textContent='Total: '+games.length+' videojuegos compartidos';publicLibrary.append(summary);
   if(!games.length){const empty=document.createElement('p');empty.textContent='Este miembro todavía no ha añadido videojuegos.';publicLibrary.append(empty);}
   const grouped=document.createElement('div');grouped.className='public-game-library-grid';
   for(const [status,label] of Object.entries(labels)){const items=games.filter(g=>g.status===status);const group=document.createElement('div');group.className='public-game-library-group';const h=document.createElement('h3');h.textContent=label+' ('+items.length+')';group.append(h);for(const game of items){const card=document.createElement('div');card.className='public-game-library-item';const strong=document.createElement('strong');strong.textContent=game.title;card.append(strong);if(game.cover_url){const image=document.createElement('img');image.className='game-library-cover';image.src=game.cover_url;image.alt='Portada de '+game.title;image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();card.prepend(image);}if(game.rating){const stars=document.createElement('span');stars.className='game-library-rating';stars.textContent='★'.repeat(game.rating)+'☆'.repeat(5-game.rating);card.append(stars);}if(game.review){const review=document.createElement('p');review.textContent=game.review;card.append(review);}if(game.platform){const platform=document.createElement('small');platform.textContent=game.platform;card.append(platform);}const reactions=document.createElement('div');reactions.className='game-social-reactions';
 const like=document.createElement('button');like.type='button';like.className='outline-btn mini';like.textContent='♡ Me gusta';const count=document.createElement('small');count.textContent='Cargando…';
 const comments=document.createElement('div');comments.className='game-social-comments';
 const commentForm=document.createElement('form');commentForm.className='game-social-comment-form';const commentInput=document.createElement('textarea');commentInput.maxLength=800;commentInput.rows=2;commentInput.required=true;commentInput.placeholder='Escribe un comentario…';commentInput.setAttribute('aria-label','Comentar '+game.title);const send=document.createElement('button');send.type='submit';send.className='gradient-btn mini';send.textContent='Comentar';const feedback=document.createElement('small');feedback.setAttribute('role','status');commentForm.append(commentInput,send,feedback);reactions.append(like,count,comments,commentForm);card.append(reactions);
 const refresh=async()=>{const [likesResult,commentsResult,authResult]=await Promise.all([sb.from('member_game_likes').select('user_id').eq('game_id',game.id),sb.from('member_game_comments').select('id,user_id,body,created_at,reply_to_id').eq('game_id',game.id).order('created_at',{ascending:false}).limit(30),sb.auth.getUser()]);if(!reactions.isConnected)return;const userId=authResult.data?.user?.id;const likes=likesResult.data||[];const liked=!!userId&&likes.some(x=>x.user_id===userId);count.textContent=likesResult.error?'No se pudieron cargar los Me gusta':likes.length+' Me gusta';like.textContent=liked?'♥ Te gusta':'♡ Me gusta';like.onclick=async()=>{if(!userId){location.hash='#/auth';return;}like.disabled=true;const result=liked?await sb.from('member_game_likes').delete().eq('game_id',game.id).eq('user_id',userId):await sb.from('member_game_likes').insert({game_id:game.id,user_id:userId});like.disabled=false;if(result.error){feedback.textContent=result.error.message;return;}refresh();};comments.replaceChildren();if(commentsResult.error){comments.textContent='No se pudieron cargar los comentarios.';}else{for(const comment of commentsResult.data||[]){const item=document.createElement('div');item.className='game-social-comment';const body=document.createElement('p');body.textContent=comment.body;const date=document.createElement('small');date.textContent=new Date(comment.created_at).toLocaleDateString('es-ES');if(comment.reply_to_id){const replyLabel=document.createElement('small');replyLabel.textContent='↳ Respuesta a otro comentario';item.append(replyLabel);}item.append(body,date);const replyButton=document.createElement('button');replyButton.type='button';replyButton.className='outline-btn mini';replyButton.textContent='Responder';replyButton.onclick=()=>{commentInput.value='@respuesta: ';commentInput.focus();commentForm.dataset.replyTo=comment.id;feedback.textContent='Respondiendo al comentario seleccionado.';};item.append(replyButton);if(userId===comment.user_id){const del=document.createElement('button');del.type='button';del.className='outline-btn mini';del.textContent='Eliminar';del.onclick=async()=>{const {error}=await sb.from('member_game_comments').delete().eq('id',comment.id).eq('user_id',userId);if(error)feedback.textContent=error.message;else refresh();};item.append(del);}comments.append(item);}}commentForm.onsubmit=async e=>{e.preventDefault();if(!userId){location.hash='#/auth';return;}const body=commentInput.value.trim();if(!body)return;send.disabled=true;const {error}=await sb.from('member_game_comments').insert({game_id:game.id,user_id:userId,body,reply_to_id:commentForm.dataset.replyTo||null});send.disabled=false;if(error){feedback.textContent=error.message;return;}commentInput.value='';delete commentForm.dataset.replyTo;feedback.textContent='Comentario publicado.';refresh();};};refresh();
 group.append(card);}grouped.append(group);}publicLibrary.append(grouped);
  });
 }
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
  const badges=[['🌱 Primer paso',score>=5],['⭐ Participante',score>=50],['⚡ Explorador shōnen',score>=100],['🔥 Miembro activo',score>=150],['🌌 Guardián astral',score>=400],['🏆 Leyenda',score>=500],['👑 Fénix legendario',score>=1600]];
  const auraMin={storm:100,astral:400,phoenix:1600};
  if(score<(auraMin[member.profile_level_aura]||0))root.dataset.sbLevelAura='none';
  achievementPanel.replaceChildren();const heading=document.createElement('h2');heading.textContent='🏆 Nivel '+level+' · '+score+' XP';achievementPanel.append(heading);
  const next=document.createElement('p');next.textContent='Próximo nivel: '+(100*level*level)+' XP';achievementPanel.append(next);
  const progress=document.createElement('progress');progress.max=100*level*level-100*(level-1)*(level-1);progress.value=score-100*(level-1)*(level-1);progress.style.cssText='width:100%;accent-color:#b15cff';progress.setAttribute('aria-label','Progreso hacia el próximo nivel');achievementPanel.append(progress);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';for(const [label,earned] of badges){const item=document.createElement('span');item.textContent=label+(earned?' ✓':' 🔒');item.className='sb-animated-level-badge'+(earned?' is-earned':' is-locked');item.style.cssText='padding:8px;border:1px solid #ffffff33;border-radius:10px;opacity:'+(earned?'1':'.45');row.append(item)}achievementPanel.append(row);
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
 const spoilerReveal=document.createElement('button');spoilerReveal.type='button';spoilerReveal.className='sb-community-lightbox-reveal';spoilerReveal.textContent='🙈 Mostrar imagen con spoiler';
 const caption=document.createElement('p');caption.className='member-lightbox-caption';
 const counter=document.createElement('span');counter.className='member-lightbox-counter';
 const previous=document.createElement('button');previous.type='button';previous.className='member-lightbox-prev';previous.textContent='‹';previous.setAttribute('aria-label','Imagen anterior');
 const next=document.createElement('button');next.type='button';next.className='member-lightbox-next';next.textContent='›';next.setAttribute('aria-label','Imagen siguiente');
 let index=Math.max(0,Math.min(startIndex,images.length-1));
 const show=()=>{
  const post=images[index],spoiler=communityIsFullSpoiler(post.content);
  image.removeAttribute('src');image.hidden=spoiler;spoilerReveal.hidden=!spoiler;
  image.alt=spoiler?'Imagen con spoiler':post.content?.trim().slice(0,110)||'Imagen ampliada de la comunidad';
  caption.textContent=spoiler?'🙈 Contenido oculto para evitar spoilers':post.content?.trim()||'Fotografía de la comunidad';
  if(!spoiler)image.src=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;
  counter.textContent=(index+1)+' / '+images.length;
  previous.disabled=next.disabled=images.length<2;
 };
 spoilerReveal.onclick=()=>{
  const post=images[index];image.src=sb.storage.from('community-images').getPublicUrl(post.image_path).data.publicUrl;
  image.hidden=false;spoilerReveal.hidden=true;caption.textContent=String(post.content||'').trim().slice(2,-2);
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
 panel.append(close,spoilerReveal,image,previous,next,caption,counter);overlay.append(panel);document.body.append(overlay);
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
  const body=document.createElement('p');renderChatSpoilerText(body,comment.content);
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
  const spoilerToggle=createCommunitySpoilerToggle();form.append(input,spoilerToggle,submit);
  form.onsubmit=async event=>{event.preventDefault();const content=communityOutgoingPost(input.value,spoilerToggle);if(!content)return;if(content.length>500){alert('Máximo 500 caracteres, incluyendo el formato spoiler.');return;}submit.disabled=true;const {error:insertError}=await sb.from('member_comments').insert({post_id:postId,author_id:viewerId,content});if(insertError){status.textContent='No se pudo comentar: '+insertError.message;root.prepend(status);submit.disabled=false;}else await renderGalleryComments(postId,root,viewerId,profileId);};
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
   const featured=[candidates.find(p=>p.id===covers.get(album)),...candidates].find(p=>p&&!communityIsFullSpoiler(p.content));
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
  const image=document.createElement('img');image.src=url;image.alt=communityIsFullSpoiler(post.content)?'Imagen con spoiler':post.content?.trim().slice(0,110)||'Imagen de la comunidad';image.loading='lazy';
  if(communityIsFullSpoiler(post.content)){link.classList.add('sb-community-gallery-tile-spoiler');link.setAttribute('aria-label','Abrir imagen con spoiler');const cover=document.createElement('span');cover.className='sb-community-gallery-cover';cover.textContent='🙈 Imagen con spoiler';link.append(cover);}
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

async function loadMemberSocial(memberId,root,maxPosts=12){
 const postLimit=Math.max(12,Math.min(60,Number(maxPosts)||12));
 if(!root.isConnected)return;
 const {data:{user}}=await sb.auth.getUser();
 const me=user?.id||null;
 const [{data:follows,error:followError},{data:posts,error:postError}]=await Promise.all([
  sb.from('member_follows').select('follower_id').eq('following_id',memberId),
  sb.from('member_posts').select('id,author_id,content,image_path,created_at,edited_at').eq('author_id',memberId).order('created_at',{ascending:false}).limit(postLimit+1)
 ]);
 if(!root.isConnected)return;
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='📝 Publicaciones del perfil';
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
  const animeDraft=new URLSearchParams(location.hash.split('?')[1]||'').get('retoAnime')==='1'
    &&location.hash.split('?')[0]==='#/cuenta';
  if(animeDraft){
   label.textContent='🌸 Mi recomendación para el Reto de Anime';
   textarea.value='🌸 #RetoAnimeSB2026\n🎬 Anime: \n🎭 Género: \n💜 Por qué lo recomiendo: \n👥 Se lo recomiendo a: ';
   albumSelect.value='Anime';
   const instructions=document.createElement('p');instructions.className='community-anime-draft-instructions';
   instructions.textContent='Completa la plantilla con tu opinión original y publícala durante el plazo del reto. Recuerda inscribirte antes en Comunidad y evita los spoilers.';
   form.append(instructions);
  }
  const submit=document.createElement('button');submit.className='gradient-btn mini';submit.textContent='Publicar';
  const spoilerToggle=createCommunitySpoilerToggle();
  form.append(label,textarea,spoilerToggle,imageLabel,imageInput,preview,albumLabel,submit);
  attachCommunityMentionPicker(textarea);
  if(animeDraft)requestAnimationFrame(()=>{
   if(textarea.isConnected){form.scrollIntoView({behavior:'smooth',block:'center'});textarea.focus({preventScroll:true});}
  });
  form.onsubmit=async e=>{
   e.preventDefault();const file=imageInput.files?.[0];const content=communityOutgoingPost(textarea.value,spoilerToggle,!!file);if(!content&&!file){feedback.textContent='Escribe un mensaje o selecciona una imagen.';return;}if(content.length>1000){feedback.textContent='Máximo 1000 caracteres, incluyendo el formato spoiler.';return;}
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
  const {data:targetPost}=await sb.from('member_posts').select('id,author_id,content,image_path,created_at,edited_at').eq('id',targetPostId).eq('author_id',memberId).maybeSingle();
  if(targetPost)posts.unshift(targetPost);
 }
 if(postError){const err=document.createElement('p');err.textContent='No se pudieron cargar las publicaciones.';root.append(err);return;}
 if(!(posts||[]).length){const empty=document.createElement('p');empty.textContent='Todavía no hay publicaciones.';root.append(empty);}
 const hasMore=(posts||[]).length>postLimit;
 const visiblePosts=(posts||[]).slice(0,postLimit);
 const visiblePostIds=visiblePosts.map(post=>post.id);
 const {data:animeRows,error:animeError}=visiblePostIds.length
  ?await sb.from('member_post_anime_reactions').select('post_id,user_id,reaction').in('post_id',visiblePostIds)
  :{data:[],error:null};
 if(!root.isConnected)return;
 for(const post of visiblePosts){
  const article=document.createElement('article');article.className='social-post';article.dataset.postId=post.id;root.append(article);
  const date=document.createElement('small');date.textContent=new Date(post.created_at).toLocaleString('es-ES');
  appendCommunityPostContent(article,post);article.append(date);
  if(post.edited_at){const edited=document.createElement('small');edited.className='sb-community-edited-label';edited.textContent='✏️ Editada';article.append(edited);}
  appendCommunityEditAction(article,post,me);
  const animeBox=document.createElement('div');animeBox.className='sb-anime-reaction-bar';article.append(animeBox);
  renderPostAnimeReactions(post.id,animeBox,me,animeRows,animeError);
  const likeBox=document.createElement('div');likeBox.className='post-like-box';article.append(likeBox);
  renderPostLikes(post.id,likeBox,me);
  if(me&&me!==post.author_id)appendReportButton(article,post.id,'post',me);
  if(me===post.author_id){const remove=document.createElement('button');remove.className='social-delete';remove.textContent='Eliminar publicación';remove.onclick=async()=>{if(!confirm('¿Eliminar esta publicación y sus comentarios?'))return;const {error}=await sb.from('member_posts').delete().eq('id',post.id);if(error)feedback.textContent=error.message;else{if(post.image_path)await sb.storage.from('community-images').remove([post.image_path]);await loadMemberSocial(memberId,root);const gallery=document.getElementById(me===memberId&&location.hash.split('?')[0]==='#/cuenta'?'account-gallery':'member-gallery');if(gallery)loadMemberGallery(memberId,gallery);}};article.append(remove);}
  const commentDetails=document.createElement('details');commentDetails.className='sb-wall-comment-details';
  const commentSummary=document.createElement('summary');commentSummary.textContent='💬 Ver comentarios';
  const list=document.createElement('div');list.className='social-comments';
  commentDetails.append(commentSummary,list);article.append(commentDetails);
  let commentRequest=0;
  const refreshWallComments=async()=>{
   const request=++commentRequest;
   list.textContent='Cargando comentarios…';
   const {data:comments,error:commentError}=await sb.from('member_comments')
    .select('id,author_id,content,created_at')
    .eq('post_id',post.id).order('created_at',{ascending:true}).limit(100);
   if(!list.isConnected||request!==commentRequest)return;
   list.replaceChildren();
   if(commentError){list.textContent='No se pudieron cargar los comentarios.';return;}
   commentSummary.textContent='💬 Comentarios ('+(comments||[]).length+')';
   const commentAuthors=[...new Set((comments||[]).map(x=>x.author_id))];
   const {data:authors}=commentAuthors.length
    ?await sb.from('profiles').select('id,display_name,username').in('id',commentAuthors)
    :{data:[]};
   if(!list.isConnected||request!==commentRequest)return;
   const names=new Map((authors||[]).map(x=>[x.id,x.display_name||x.username||'Miembro']));
   if(!(comments||[]).length){
    const empty=document.createElement('p');empty.className='sb-wall-comment-empty';
    empty.textContent='Todavía no hay comentarios. ¡Sé el primero!';
    list.append(empty);
   }
   for(const comment of comments||[]){
    const item=document.createElement('div');item.className='social-comment';
    const author=document.createElement('a');author.href='#/perfil?id='+encodeURIComponent(comment.author_id);
    author.textContent=comment.author_id===memberId?'Autor del perfil':(names.get(comment.author_id)||'Miembro');
    const text=document.createElement('p');renderChatSpoilerText(text,comment.content);
    item.append(author,text);
    if(me===comment.author_id){
     const remove=document.createElement('button');remove.type='button';
     remove.className='social-delete';remove.textContent='Eliminar';
     remove.onclick=async()=>{
      if(!confirm('¿Eliminar tu comentario?'))return;
      remove.disabled=true;
      const {error}=await sb.from('member_comments').delete().eq('id',comment.id).eq('author_id',me);
      if(error){feedback.textContent='No se pudo eliminar: '+error.message;remove.disabled=false;}
      else await refreshWallComments();
     };
     item.append(remove);
    }else if(me)appendReportButton(item,comment.id,'comment',me);
    list.append(item);
   }
  };
  commentDetails.addEventListener('toggle',()=>{
   if(commentDetails.open)refreshWallComments();
  });
  if(me){
   const commentForm=document.createElement('form');
   commentForm.className='social-form social-comment-form';
   const input=document.createElement('textarea');input.maxLength=500;input.required=true;
   input.placeholder='Escribe un comentario…';input.setAttribute('aria-label','Escribe un comentario');
   const submit=document.createElement('button');submit.className='outline-btn';submit.type='submit';
   submit.textContent='Comentar';
   const commentStatus=document.createElement('p');commentStatus.className='sb-wall-comment-status';
   commentStatus.setAttribute('role','status');
   const spoilerToggle=createCommunitySpoilerToggle();commentForm.append(input,spoilerToggle,submit,commentStatus);
   commentForm.onsubmit=async event=>{
    event.preventDefault();
    const content=communityOutgoingPost(input.value,spoilerToggle);if(!content)return;if(content.length>500){commentStatus.textContent='Máximo 500 caracteres, incluyendo el formato spoiler.';return;}
    submit.disabled=true;commentStatus.textContent='Publicando comentario…';
    const {error}=await sb.from('member_comments').insert({post_id:post.id,author_id:me,content});
    submit.disabled=false;
    if(error){commentStatus.textContent='No se pudo comentar: '+error.message;return;}
    input.value='';commentStatus.textContent='✅ Comentario publicado';
    await refreshWallComments();
   };
   commentDetails.append(commentForm);
  }else{
   const hint=document.createElement('p');hint.className='sb-wall-comment-guest';
   hint.textContent='Inicia sesión para comentar.';
   commentDetails.append(hint);
  }
 }
 if(hasMore){
  const more=document.createElement('button');
  more.type='button';more.className='outline-btn mini sb-wall-load-more';
  more.textContent='Mostrar más publicaciones';
  more.onclick=()=>{more.disabled=true;loadMemberSocial(memberId,root,postLimit+12);};
  root.append(more);
 }
 if(targetPostId&&location.hash.split('?')[0]==='#/cuenta')focusNotificationPost(root,targetPostId);
}

// Cinco reacciones exclusivas del perfil, una por miembro y publicación.
async function renderPostAnimeReactions(postId,root,me,prefetched=null,prefetchError=null){
 if(!root?.isConnected)return;
 const result=prefetchError?{data:null,error:prefetchError}
  :Array.isArray(prefetched)?{data:prefetched,error:null}
  :await sb.from('member_post_anime_reactions').select('post_id,user_id,reaction').eq('post_id',postId);
 if(!root.isConnected)return;
 root.replaceChildren();
 const heading=document.createElement('span');heading.className='sb-anime-reactions-label';heading.textContent='✨ Reacciones anime';
 root.append(heading);
 if(result.error){
  const failure=document.createElement('small');failure.textContent='No se pudieron cargar las reacciones.';
  root.append(failure);return;
 }
 const rows=(result.data||[]).filter(row=>row.post_id===postId);
 const selected=rows.find(row=>row.user_id===me)?.reaction||null;
 const choices=[
  ['sakura','🌸','Sakura'],
  ['fire','🔥','Fuego'],
  ['star','⭐','Estrella'],
  ['heart','💜','Corazón'],
  ['wow','😮','Sorpresa']
 ];
 const buttons=document.createElement('div');buttons.className='sb-anime-reactions-buttons';
 const errorNote=document.createElement('small');errorNote.className='sb-anime-reactions-error';errorNote.setAttribute('role','status');
 for(const [key,emoji,label] of choices){
  const count=rows.filter(row=>row.reaction===key).length;
  const button=document.createElement('button');button.type='button';
  button.className='sb-anime-reaction'+(selected===key?' is-selected':'');
  button.textContent=emoji+' '+count;
  button.setAttribute('aria-label',label+': '+count+' reacciones');
  button.setAttribute('aria-pressed',String(selected===key));
  button.title=me?'Reaccionar: '+label:'Inicia sesión para reaccionar';
  button.disabled=!me;
  button.onclick=async()=>{
   if(!me||!root.isConnected)return;
   [...buttons.querySelectorAll('button')].forEach(b=>b.disabled=true);
   errorNote.textContent='';
   try{
    const response=selected===key
     ?await sb.from('member_post_anime_reactions').delete().eq('post_id',postId).eq('user_id',me)
     :await sb.from('member_post_anime_reactions').upsert({post_id:postId,user_id:me,reaction:key},{onConflict:'post_id,user_id'});
    if(response.error)throw response.error;
    await renderPostAnimeReactions(postId,root,me);
   }catch(error){
    if(!root.isConnected)return;
    errorNote.textContent='No se pudo guardar la reacción: '+(error.message||'inténtalo de nuevo');
    [...buttons.querySelectorAll('button')].forEach(b=>b.disabled=false);
   }
  };
  buttons.append(button);
 }
 root.append(buttons,errorNote);
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
async function loadCommunityCompetitions(root){
 if(!root)return;
 root.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='🏆 Retos y torneos de la comunidad';
 const intro=document.createElement('p');intro.textContent='Inscríbete en desafíos y competiciones. Las puntuaciones las registra administración y no añaden XP automáticamente.';
 const toolbar=document.createElement('div');toolbar.className='community-contest-toolbar';
 const select=document.createElement('select');select.setAttribute('aria-label','Filtrar retos y torneos');
 for(const [value,label] of [['all','Todos'],['challenge','🎯 Retos'],['tournament','🏆 Torneos']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;select.append(opt);}
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='🔄 Actualizar retos y torneos';
 const note=document.createElement('p');note.setAttribute('role','status');
 const list=document.createElement('div');list.className='community-contest-list';
 const myAwards=document.createElement('div');myAwards.className='community-contest-my-awards';
 toolbar.append(select,refresh);root.append(heading,intro,toolbar,note,myAwards,list);
 let all=[],entries=[],awards=[],names=new Map(),user=null;
 const paint=()=>{
  if(!list.isConnected)return;
  list.replaceChildren();myAwards.replaceChildren();
  const personal=awards.filter(a=>a.user_id===user?.id).sort((a,b)=>new Date(b.awarded_at)-new Date(a.awarded_at));
  if(personal.length){
   const personalTitle=document.createElement('strong');personalTitle.textContent='🎖️ Mis insignias de retos y torneos';
   myAwards.append(personalTitle);
   for(const prize of personal){
    const earned=document.createElement('span');earned.className='community-contest-earned-badge';
    earned.textContent=prize.badge+' · +'+prize.points+' puntos · '+(all.find(c=>c.id===prize.competition_id)?.title||'Competición');
    myAwards.append(earned);
   }
  }
  const visible=all.filter(c=>select.value==='all'||c.kind===select.value);
  if(!visible.length){
   const empty=document.createElement('div');empty.className='community-contest-empty';
   const icon=document.createElement('span');icon.className='community-contest-empty-icon';icon.setAttribute('aria-hidden','true');icon.textContent=all.length?'🔎':'🏆';
   const title=document.createElement('h3');title.textContent=all.length?'Sin resultados para este filtro':'Próximamente: retos y torneos';
   const info=document.createElement('p');info.textContent=all.length
    ?'No hay actividades de este tipo. Selecciona «Todos» para ver las publicadas.'
    :'Aún no hay competiciones publicadas. Cuando administración publique la primera, aparecerá aquí y podrás inscribirte.';
   empty.append(icon,title,info);
   if(user?.app_metadata?.role==='admin'&&!all.length){
    const link=document.createElement('a');link.className='community-contest-create-link';
    link.href='#/admin?focus=competitions';link.textContent='➕ Crear el primer reto o torneo';
    empty.append(link);
   }
   list.append(empty);return;
  }
  for(const c of visible){
   const own=entries.some(e=>e.competition_id===c.id&&e.user_id===user?.id);
   const members=entries.filter(e=>e.competition_id===c.id);
   const medals=awards.filter(a=>a.competition_id===c.id).sort((a,b)=>a.place-b.place);
   const now=Date.now(),end=new Date(c.ends_at).getTime(),start=new Date(c.starts_at).getTime();
   const card=document.createElement('article');card.className='community-contest-card';
   const title=document.createElement('h3');title.textContent=(c.kind==='challenge'?'🎯 Reto: ':'🏆 Torneo: ')+c.title;
   const description=document.createElement('p');description.textContent=c.description||'Sin descripción adicional.';
   const dates=document.createElement('p');dates.textContent='📅 Inicio: '+new Date(c.starts_at).toLocaleString('es-ES')+' · Final: '+new Date(c.ends_at).toLocaleString('es-ES');
   const state=document.createElement('span');state.className='community-contest-state';
   state.textContent=now>=end?'Finalizado':now>=start?'En curso':'Próximamente';
   const count=document.createElement('small');count.textContent='👥 '+members.length+' inscripciones visibles';
   const signup=document.createElement('button');signup.type='button';signup.textContent=own?'↩️ Cancelar mi inscripción':'✅ Inscribirme';
   if(!user){signup.disabled=true;signup.title='Inicia sesión para inscribirte';}
   else if(now>=end){signup.disabled=true;signup.textContent=own?'Inscrito · Finalizado':'Inscripciones cerradas';}
   signup.onclick=async()=>{
    if(!user)return;signup.disabled=true;
    const result=own
     ?await sb.from('community_competition_entries').delete().eq('competition_id',c.id).eq('user_id',user.id)
     :await sb.from('community_competition_entries').insert({competition_id:c.id,user_id:user.id});
    if(result.error){
     note.textContent='No se pudo completar la inscripción: '+result.error.message+
     (!own?' Comprueba que tu perfil sea público y que la competición siga abierta.':'');
     signup.disabled=false;return;
    }
    const message=own?'Has cancelado tu inscripción.':'¡Inscripción registrada!';
    await reload();note.textContent=message;
   };
   card.append(title,state,description,dates,count,signup);
   // El primer reto anime enlaza con el editor del perfil: desde allí
   // las publicaciones pasan al muro comunitario y pueden ser evaluadas.
   if(c.kind==='challenge'&&c.description.includes('#RetoAnimeSB2026')){
    const action=document.createElement('div');action.className='community-anime-challenge-action';
    if(own&&now>=start&&now<end){
     const write=document.createElement('a');write.className='community-anime-challenge-write';
     write.href='#/cuenta?retoAnime=1';write.textContent='📝 Escribir mi recomendación';
     action.append(write);
    }else{
     const hint=document.createElement('small');hint.textContent=!own
      ?'Inscríbete para preparar tu participación.'
      :now<start?'Podrás publicar tu recomendación cuando comience el reto.':'El plazo para publicar ha terminado.';
     action.append(hint);
    }
    card.append(action);
   }
   const prizeInfo=document.createElement('div');prizeInfo.className='community-contest-prizes';
   const prizeTitle=document.createElement('strong');prizeTitle.textContent=medals.length?'🏆 Podio oficial · premios entregados':'🎁 Premios al finalizar';
   prizeInfo.append(prizeTitle);
   if(medals.length){
    for(const prize of medals){
     const place=document.createElement('p');place.textContent=prize.badge+' · '+(names.get(prize.user_id)||'Participante')+' · +'+prize.points+' puntos';prizeInfo.append(place);
    }
   }else{
    const preview=document.createElement('p');preview.textContent='🥇 +100 · 🥈 +50 · 🥉 +25 puntos de tienda, con insignia por posición.';
    const warning=document.createElement('small');warning.textContent=now>=end?'Pendiente de que administración confirme el podio.':'Se entregan tras finalizar el torneo y verificar el resultado.';
    prizeInfo.append(preview,warning);
   }
   card.append(prizeInfo);
   const ranked=members.filter(e=>e.completed||e.score>0).sort((a,b)=>b.score-a.score||new Date(a.joined_at)-new Date(b.joined_at)).slice(0,10);
   const ranking=document.createElement('div');ranking.className='community-contest-ranking';
   const rankingTitle=document.createElement('h4');rankingTitle.textContent='🥇 Clasificación verificada por administración';ranking.append(rankingTitle);
   if(!ranked.length){const noScore=document.createElement('p');noScore.textContent='Aún no hay puntuaciones registradas.';ranking.append(noScore);}
   else{
    const ol=document.createElement('ol');
    for(const e of ranked){
     const item=document.createElement('li');item.textContent=(names.get(e.user_id)||'Participante')+' · '+e.score+' punto(s)'+(e.completed?' · completado':'');ol.append(item);
    }
    ranking.append(ol);
   }
   card.append(ranking);list.append(card);
  }
 };
 const reload=async()=>{
  note.textContent='Cargando actividades…';
  const {data:{user:who}}=await sb.auth.getUser();user=who||null;
  if(!user){list.textContent='Inicia sesión para consultar e inscribirte en las actividades.';note.textContent='';return;}
  const {data,error}=await sb.from('community_competitions').select('id,kind,title,description,starts_at,ends_at,status').eq('status','published').order('starts_at',{ascending:false}).limit(50);
  if(error){list.textContent='No se pudieron cargar los torneos: '+error.message;note.textContent='';return;}
  all=data||[];const ids=all.map(x=>x.id);
  if(!ids.length){entries=[];awards=[];names=new Map();note.textContent='';paint();return;}
  const {data:rows,error:entryError}=await sb.from('community_competition_entries')
   .select('competition_id,user_id,score,completed,joined_at').in('competition_id',ids).limit(500);
  if(entryError){note.textContent='No se pudieron cargar las inscripciones: '+entryError.message;return;}
  entries=rows||[];
  const {data:prizes,error:prizeError}=await sb.from('community_competition_awards')
   .select('competition_id,user_id,place,points,badge,awarded_at').in('competition_id',ids).limit(150);
  if(prizeError){note.textContent='No se pudieron cargar los premios: '+prizeError.message;return;}
  awards=prizes||[];
  const users=[...new Set([...entries.map(e=>e.user_id),...awards.map(a=>a.user_id)])];
  const {data:profiles}=users.length?await sb.from('profiles').select('id,display_name,username').in('id',users).eq('is_public',true):{data:[]};
  names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
  note.textContent='';paint();
 };
 select.onchange=paint;refresh.onclick=reload;
 await reload();
}

async function loadCommunityFeed(){
 const root=document.getElementById('community-feed');if(!root)return;
 let competitionPanel=document.getElementById('community-competitions');
 if(!competitionPanel){competitionPanel=document.createElement('section');competitionPanel.id='community-competitions';competitionPanel.className='community-competitions-section';root.before(competitionPanel);}
 loadCommunityCompetitions(competitionPanel).catch(e=>console.warn('Retos y torneos:',e));
 const [{data:{user},error:authError},{data:posts,error:postsError}]=await Promise.all([
  sb.auth.getUser(),
  sb.from('member_posts').select('id,author_id,content,image_path,created_at,edited_at').order('created_at',{ascending:false}).limit(50)
 ]);
 if(!root.isConnected)return;
 root.replaceChildren();
 if(postsError){root.textContent='No se pudo cargar el muro: '+postsError.message;return;}

 const {data:pinRows,error:pinError}=await sb.from('community_post_pins')
  .select('post_id,pinned_at').order('pinned_at',{ascending:false}).limit(30);
 if(pinError)console.warn('No se pudieron cargar publicaciones fijadas:',pinError.message);
 const pinned=new Map((pinRows||[]).map(row=>[row.post_id,row.pinned_at]));
 const feedPosts=[...(posts||[])];
 const requestedPostId=new URLSearchParams((location.hash.split('?')[1]||'')).get('post');
 const targetPostId=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestedPostId||'')?requestedPostId:null;
 const missingIds=[...new Set([...pinned.keys(),...(targetPostId?[targetPostId]:[])])]
  .filter(id=>!feedPosts.some(post=>post.id===id));
 if(missingIds.length){
  const {data:older,error:olderError}=await sb.from('member_posts')
   .select('id,author_id,content,image_path,created_at,edited_at')
   .in('id',missingIds).limit(40);
  if(olderError)console.warn('No se pudieron cargar publicaciones destacadas:',olderError.message);
  else feedPosts.push(...(older||[]));
 }

 
 if(user&&!authError){
  const composer=document.createElement('form');composer.className='social-form sb-community-post-form';
  const heading=document.createElement('div');heading.className='sb-composer-heading';
  const label=document.createElement('label');label.htmlFor='sb-community-post-text';label.textContent='📝 Nueva publicación en Comunidad';
  const introduction=document.createElement('small');introduction.textContent='Comparte tus novedades de anime y gaming con la comunidad.';
  heading.append(label,introduction);
  const writingArea=document.createElement('div');writingArea.className='sb-composer-writing';
  const input=document.createElement('textarea');input.id='sb-community-post-text';input.rows=3;input.maxLength=1000;input.placeholder='¿Qué quieres compartir con la comunidad?';input.setAttribute('aria-label','Nueva publicación en la comunidad');
  const counter=document.createElement('small');counter.className='sb-composer-counter';counter.textContent='0 / 1000 caracteres';
  input.addEventListener('input',()=>{counter.textContent=input.value.length+' / 1000 caracteres';});
  writingArea.append(input,counter);
  const tools=document.createElement('div');tools.className='sb-composer-tools';
  const spoilerToggle=createCommunitySpoilerToggle();
  const uploadLabel=document.createElement('label');uploadLabel.className='sb-composer-upload-button';
  const uploadTitle=document.createElement('span');uploadTitle.textContent='🖼️ Añadir imagen';
  const upload=document.createElement('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp,image/gif';upload.setAttribute('aria-label','Adjuntar imagen a la publicación');
  uploadLabel.append(uploadTitle,upload);tools.append(spoilerToggle,uploadLabel);
  const mediaName=document.createElement('small');mediaName.className='sb-composer-file-name';mediaName.textContent='JPG, PNG, WebP o GIF · máximo 5 MB';
  const preview=document.createElement('div');preview.className='sb-composer-media-preview';preview.hidden=true;
  const previewImg=document.createElement('img');previewImg.alt='Vista previa de la imagen adjunta';
  const previewFilename=document.createElement('span');previewFilename.className='sb-composer-preview-filename';
  const removeImage=document.createElement('button');removeImage.type='button';removeImage.className='sb-composer-remove-image';removeImage.textContent='✕ Quitar imagen';
  preview.append(previewImg,previewFilename,removeImage);
  let previewUrl=null;
  const clearPreview=()=>{
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   previewUrl=null;preview.hidden=true;previewImg.removeAttribute('src');previewFilename.textContent='';
   mediaName.textContent='JPG, PNG, WebP o GIF · máximo 5 MB';
  };
  upload.addEventListener('change',()=>{
   clearPreview();
   const file=upload.files?.[0];if(!file)return;
   mediaName.textContent=file.name;
   if(file.type.startsWith('image/')){
    previewUrl=URL.createObjectURL(file);previewImg.src=previewUrl;
    previewFilename.textContent=file.name;preview.hidden=false;
   }
  });
  removeImage.onclick=()=>{upload.value='';clearPreview();};
  const albumLabel=document.createElement('label');albumLabel.className='sb-composer-album-label';albumLabel.textContent='📚 Álbum de la imagen';
  const album=document.createElement('select');album.setAttribute('aria-label','Seleccionar álbum de la imagen');
  for(const name of ['Otros','Anime','Gaming','Capturas']){const option=document.createElement('option');option.value=name;option.textContent=name;album.append(option);}
  albumLabel.append(album);
  const footer=document.createElement('div');footer.className='sb-composer-footer';
  const footnote=document.createElement('small');footnote.textContent='Tu publicación aparecerá en el muro de la comunidad.';
  const submit=document.createElement('button');submit.className='gradient-btn mini';submit.type='submit';submit.textContent='✨ Publicar';
  footer.append(footnote,submit);
  const status=document.createElement('small');status.className='sb-composer-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  composer.append(heading,writingArea,tools,mediaName,preview,albumLabel,footer,status);
   attachCommunityMentionPicker(input);
  composer.onsubmit=async event=>{
   event.preventDefault();if(submit.disabled)return;
   const file=upload.files?.[0],content=communityOutgoingPost(input.value,spoilerToggle,!!file);
   if(!content&&!file){status.textContent='Escribe un texto o adjunta una imagen.';return;}
   if(content.length>1000){status.textContent='Máximo 1000 caracteres, incluyendo el formato spoiler.';return;}
   const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
   if(file&&(!allowed[file.type]||file.size>5242880)){status.textContent='Solo JPG, PNG, WebP o GIF hasta 5 MB.';return;}
   submit.disabled=true;status.textContent=file?'Subiendo imagen…':'Publicando…';let image_path=null;
   if(file){
    image_path=user.id+'/'+crypto.randomUUID()+'.'+allowed[file.type];
    const {error:uploadError}=await sb.storage.from('community-images').upload(image_path,file,{contentType:file.type,upsert:false});
    if(uploadError){status.textContent='No se pudo subir la imagen: '+uploadError.message;submit.disabled=false;return;}
   }
   const {error}=await sb.from('member_posts').insert({author_id:user.id,content,image_path,gallery_category:album.value});
   if(error){if(image_path)await sb.storage.from('community-images').remove([image_path]);status.textContent='No se pudo publicar: '+error.message;submit.disabled=false;return;}
   clearPreview();
   await loadCommunityFeed();
  };
  root.append(composer);
 }

 const toolbar=document.createElement('div');toolbar.className='community-bookmark-toolbar';
 const allButton=document.createElement('button');allButton.type='button';allButton.textContent='🌐 Últimas publicaciones';
 const savedButton=document.createElement('button');savedButton.type='button';savedButton.textContent='🔖 Mis guardados';
 savedButton.disabled=!user;
 if(!user)savedButton.title='Inicia sesión para guardar publicaciones';
 toolbar.append(allButton,savedButton);
 const content=document.createElement('div');content.className='community-bookmark-feed';
 root.append(toolbar,content);
 let bookmarked=new Set(),mode='recent',requestId=0;
 if(user&&!authError){
  const {data:saved,error:savedError}=await sb.from('member_post_bookmarks').select('post_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(150);
  if(savedError)console.warn('Marcadores:',savedError.message);else bookmarked=new Set((saved||[]).map(x=>x.post_id));
 }
 const render=async()=>{
  const request=++requestId;
  allButton.setAttribute('aria-pressed',String(mode==='recent'));savedButton.setAttribute('aria-pressed',String(mode==='saved'));
  content.textContent='Cargando publicaciones…';
  let visible=[...feedPosts].sort((a,b)=>{
    const left=pinned.get(a.id),right=pinned.get(b.id);
    if(left&&right)return new Date(right)-new Date(left);
    if(left)return -1;if(right)return 1;
    return new Date(b.created_at)-new Date(a.created_at);
   });
  if(mode==='saved'){
   const ids=[...bookmarked].slice(0,150);
   if(!ids.length){content.textContent='Todavía no tienes publicaciones guardadas.';return;}
   const {data,error}=await sb.from('member_posts').select('id,author_id,content,image_path,created_at,edited_at').in('id',ids).order('created_at',{ascending:false}).limit(150);
   if(request!==requestId)return;
   if(error){content.textContent='No se pudieron cargar los guardados: '+error.message;return;}
   visible=data||[];
  }
  const ids=[...new Set(visible.map(p=>p.author_id))];
  const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true):{data:[]};
  if(request!==requestId||!content.isConnected)return;
  const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
  content.replaceChildren();
  for(const post of visible){
   if(!names.has(post.author_id))continue;
   const article=document.createElement('article');article.className='social-post';article.dataset.postId=post.id;
   const author=document.createElement('a');author.href='#/perfil?id='+encodeURIComponent(post.author_id);author.className='feed-author';author.textContent=names.get(post.author_id);
   const date=document.createElement('small');date.textContent=new Date(post.created_at).toLocaleString('es-ES');
   
   const likes=document.createElement('div');likes.className='post-like-box';
   const profile=document.createElement('a');profile.href=author.href;profile.className='outline-btn mini';profile.textContent='Ver publicación y comentarios';
   const save=document.createElement('button');save.type='button';save.className='community-save-post';
   const updateButton=()=>{const active=bookmarked.has(post.id);save.textContent=active?'🔖 Guardado · Quitar':'🔖 Guardar publicación';save.setAttribute('aria-pressed',String(active));};
   updateButton();save.disabled=!user;
   if(!user)save.title='Inicia sesión para guardar publicaciones';
   save.onclick=async()=>{
    if(!user)return;
    save.disabled=true;const active=bookmarked.has(post.id);
    const result=active
     ?await sb.from('member_post_bookmarks').delete().eq('user_id',user.id).eq('post_id',post.id)
     :await sb.from('member_post_bookmarks').insert({user_id:user.id,post_id:post.id});
    if(result.error){save.textContent='Error al guardar: '+result.error.message;save.disabled=false;return;}
    if(active)bookmarked.delete(post.id);else bookmarked.add(post.id);
    if(mode==='saved'&&active){article.remove();if(!content.children.length)content.textContent='Todavía no tienes publicaciones guardadas.';}
    else{updateButton();save.disabled=false;}
   };
   article.append(author,date);appendCommunityPostContent(article,post);
   if(post.edited_at){const edited=document.createElement('small');edited.className='sb-community-edited-label';edited.textContent='✏️ Editada';article.append(edited);}
   appendCommunityEditAction(article,post,user?.id);
   appendCommunityPinAction(article,post,user?.app_metadata?.role==='admin'?user:null,pinned,()=>loadCommunityFeed());
   article.append(likes,profile,save);appendReportButton(article,post.id,'post',user?.id);content.append(article);
   renderPostLikes(post.id,likes,user?.id||null);
  }
  if(!content.children.length)content.textContent=mode==='saved'?'No hay guardados visibles en este momento.':'Todavía no hay publicaciones públicas.';
 };
 allButton.onclick=()=>{mode='recent';render();};
 savedButton.onclick=()=>{mode='saved';render();};
 await render();
 if(targetPostId)focusNotificationPost(root,targetPostId);
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
function notificationDestination(n){
 if(['tournament_full','tournament_match','tournament_finished'].includes(n.kind)&&n.tournament_id)return '#/tienda?tournament='+encodeURIComponent(n.tournament_id);
 if(n.kind==='news_reply'&&n.news_id)return '#/noticia?id='+encodeURIComponent(n.news_id)+(n.news_comment_id?'&comment='+encodeURIComponent(n.news_comment_id):'');
 if(n.kind==='poll_trophy_like'&&n.trophy_month)return '#/cuenta?trofeo='+encodeURIComponent(n.trophy_month);
 if(n.kind==='poll_museum_prize')return '#/encuestas?museo='+encodeURIComponent(n.museum_month||'');
 if(n.kind==='poll_season_prize')return '#/encuestas?temporada='+encodeURIComponent(n.season_month||'');
 if((n.kind==='poll'||n.kind==='poll_reminder')&&n.poll_id)return '#/encuestas?poll='+encodeURIComponent(n.poll_id);
 if(n.game_id)return '#/perfil?id='+encodeURIComponent(n.recipient_id||'')+'&game='+encodeURIComponent(n.game_id);
 if(n.kind==='gift')return '#/regalos';
 if(n.post_id)return '#/cuenta?post='+encodeURIComponent(n.post_id);
 return n.actor_id?'#/perfil?id='+encodeURIComponent(n.actor_id):'#/notificaciones';
}
function focusNotificationPost(root,id){if(!id||!root?.isConnected)return;const el=[...root.querySelectorAll('[data-post-id]')].find(x=>x.dataset.postId===id);if(el){el.classList.add('notification-target-post');el.scrollIntoView({behavior:'smooth',block:'center'});}}
async function loadMemberNotifications(){
 const root=document.getElementById('member-notifications');if(!root)return;
 const {data:{user}}=await sb.auth.getUser();
 if(!root.isConnected)return;root.replaceChildren();
 if(!user){const link=document.createElement('a');link.href='#/auth';link.className='gradient-btn mini';link.textContent='Inicia sesión para ver tus notificaciones';root.append(link);return;}
 const [communityResult,reportsResult,messagesResult]=await Promise.all([
  sb.from('member_notifications').select('id,actor_id,kind,post_id,gift_id,game_id,poll_id,season_month,trophy_month,museum_month,news_id,news_comment_id,tournament_id,tournament_match_id,tournament_title,match_stage,match_no,created_at,is_read,dismissed_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(100),
  sb.from('member_report_notifications').select('id,status,created_at,is_read,dismissed_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(100),
  sb.from('member_direct_messages').select('id,sender_id,created_at,is_read').eq('recipient_id',user.id).eq('is_read',false).order('created_at',{ascending:false}).limit(100)
 ]);
 if(!root.isConnected)return;
 if(communityResult.error||reportsResult.error||messagesResult.error){root.textContent='No se pudieron cargar todas las notificaciones. Inténtalo de nuevo.';return;}
 const community=communityResult.data||[],reports=reportsResult.data||[],messages=messagesResult.data||[];
 const ids=[...new Set([...community.map(x=>x.actor_id),...messages.map(x=>x.sender_id)].filter(Boolean))];
 const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
 const pollIds=[...new Set(community.filter(n=>n.kind==='poll'||n.kind==='poll_reminder').map(n=>n.poll_id).filter(Boolean))];
 const {data:polls}=pollIds.length?await sb.from('community_polls').select('id,question').in('id',pollIds):{data:[]};
 const pollNames=new Map((polls||[]).map(p=>[p.id,p.question]));
 const prizeMonths=[...new Set(community.filter(n=>n.kind==='poll_season_prize').map(n=>n.season_month).filter(Boolean))];
 const {data:myPrizeRows}=prizeMonths.length?await sb.from('community_poll_season_results')
   .select('month_start,position,points,badge').eq('user_id',user.id).in('month_start',prizeMonths):{data:[]};
 const prizesByMonth=new Map((myPrizeRows||[]).map(row=>[row.month_start,row]));
 const museumMonths=[...new Set(community.filter(n=>n.kind==='poll_museum_prize').map(n=>n.museum_month).filter(Boolean))];
 const {data:myMuseumPrizes}=museumMonths.length?await sb.from('member_poll_museum_monthly_awards')
  .select('month_start,position,points,badge').eq('user_id',user.id).in('month_start',museumMonths):{data:[]};
 const museumPrizesByMonth=new Map((myMuseumPrizes||[]).map(row=>[row.month_start,row]));
 const formatSeason=month=>month?new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(month+'T12:00:00Z')):'la temporada';
 const items=[
  ...community.map(n=>({...n,recipient_id:user.id,category:['tournament_full','tournament_match','tournament_finished'].includes(n.kind)?'tournaments':(n.kind==='poll'||n.kind==='poll_reminder'||n.kind==='poll_season_prize'||n.kind==='poll_museum_prize')?'polls':n.kind==='profile_view'?'visits':'community',title:n.kind==='tournament_full'?'🎟️ Las cuatro plazas de «'+(n.tournament_title||'tu torneo')+'» están completas.':n.kind==='tournament_match'?'⚔️ Tienes un nuevo enfrentamiento ('+(n.match_stage==='semi'?'semifinal '+n.match_no:n.match_stage==='bronze'?'partido por el tercer puesto':'gran final')+') en «'+(n.tournament_title||'tu torneo')+'».':n.kind==='tournament_finished'?'🏆 «'+(n.tournament_title||'Tu torneo')+'» ha terminado. Consulta la clasificación y tus premios.':n.kind==='news_reply'?'💬 '+(names.get(n.actor_id)||'Un miembro')+' respondió a tu comentario en una noticia.':n.kind==='poll_trophy_like'?
  '❤️ '+(names.get(n.actor_id)||'Un miembro')+' dio Me gusta a tu trofeo de '+formatSeason(n.trophy_month)+'.':
  n.kind==='poll_museum_prize'?(()=>{
   const prize=museumPrizesByMonth.get(n.museum_month);
   return prize?'🏛️ ¡Ganaste '+prize.badge+'! · +'+prize.points+' puntos · '+formatSeason(n.museum_month):
    '🏛️ ¡Ganaste un premio mensual del Museo!';
  })():n.kind==='poll_season_prize'?(()=>{
 const prize=prizesByMonth.get(n.season_month);
 return prize?'🏆 ¡Felicidades! '+prize.badge+' · +'+prize.points+' puntos · '+formatSeason(n.season_month):'🏆 Premio de temporada de encuestas';
 })():n.kind==='poll_reminder'?'⏰ Aún puedes votar: '+(pollNames.get(n.poll_id)||'Encuesta abierta')+' · +15 puntos.':n.kind==='poll'?'📊 Nueva encuesta: '+(pollNames.get(n.poll_id)||'Participa con tu voto'):(names.get(n.actor_id)||'Un miembro')+(n.kind==='profile_view'?' visitó tu perfil.':n.kind==='game_like'?' dio Me gusta a un juego de tu biblioteca.':n.kind==='game_comment'?' comentó un juego de tu biblioteca.':n.kind==='game_reply'?' respondió a tu comentario de un videojuego.':n.kind==='gift'?' te envió un regalo.':n.kind==='follow'?' empezó a seguirte.':n.kind==='like'?' dio Me gusta a tu publicación.':' comentó tu publicación.'),href:notificationDestination(n),table:'member_notifications'})),
  ...reports.map(n=>({...n,category:'reports',title:'Tu denuncia fue '+(n.status==='reviewed'?'revisada.':'descartada.'),href:'#/cuenta',table:'member_report_notifications'})),
  ...messages.map(n=>({...n,category:'messages',title:'Mensaje privado de '+(names.get(n.sender_id)||'un miembro'),href:'#/mensajes?id='+encodeURIComponent(n.sender_id),table:null}))
 ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 const heading=document.createElement('h2');heading.textContent='🔔 Centro de notificaciones';root.append(heading);
 const controls=document.createElement('div');controls.className='notification-center-controls';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filtrar notificaciones');
 for(const [value,label] of [['all','Todas'],['community','Comunidad'],['followers','👥 Seguidores'],['tournaments','🏆 Torneos'],['polls','📊 Encuestas'],['visits','👁️ Visitas al perfil'],['messages','Mensajes privados'],['reports','Denuncias'],['unread','Sin leer'],['archived','Archivadas']]){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}
 const search=document.createElement('input');search.type='search';search.placeholder='Buscar notificaciones';search.setAttribute('aria-label','Buscar notificaciones');
 const dateFilter=document.createElement('select');dateFilter.setAttribute('aria-label','Filtrar por fecha');for(const [value,label] of [['all','Cualquier fecha'],['today','Hoy'],['week','Últimos 7 días'],['month','Últimos 30 días']]){const option=document.createElement('option');option.value=value;option.textContent=label;dateFilter.append(option);}
 const counters=document.createElement('p');counters.className='notification-center-counts';
 const summary=document.createElement('span');summary.setAttribute('role','status');
 const markAll=document.createElement('button');markAll.type='button';markAll.className='outline-btn mini';markAll.textContent='Marcar avisos como leídos';
 controls.append(filter,search,dateFilter,markAll,summary);root.append(counters,controls);
 const list=document.createElement('div');root.append(list);
 const draw=()=>{
  list.replaceChildren();
  const active=items.filter(n=>!n.dismissed_at);const unread=active.filter(n=>!n.is_read);counters.textContent='Sin leer: '+unread.length+' · Seguidores: '+unread.filter(n=>n.kind==='follow').length+' · Comunidad: '+unread.filter(n=>n.category==='community').length+' · Torneos: '+unread.filter(n=>n.category==='tournaments').length+' · Encuestas: '+unread.filter(n=>n.category==='polls').length+' · Visitas: '+unread.filter(n=>n.category==='visits').length+' · Mensajes: '+unread.filter(n=>n.category==='messages').length+' · Denuncias: '+unread.filter(n=>n.category==='reports').length;
  const now=Date.now();const limit=dateFilter.value==='today'?new Date().setHours(0,0,0,0):dateFilter.value==='week'?now-7*86400000:dateFilter.value==='month'?now-30*86400000:0;
  const visible=items.filter(n=>(filter.value==='archived'?!!n.dismissed_at:!n.dismissed_at)&&(filter.value==='all'||filter.value==='archived'||(filter.value==='unread'?!n.is_read:filter.value==='followers'?n.kind==='follow':n.category===filter.value))&&n.title.toLocaleLowerCase('es').includes(search.value.trim().toLocaleLowerCase('es'))&&new Date(n.created_at).getTime()>=limit);
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

async function showPrivateGroupVideoLibrary(group,userId,thread,say){
 const panel=document.createElement('section');panel.className='group-video-activity group-video-library';
 const title=document.createElement('h5');title.textContent='📁 Mi biblioteca privada de grabaciones';
 const explanation=document.createElement('p');explanation.textContent='Solo tú puedes abrir y borrar las grabaciones que guardes. Se almacenan en un bucket privado de Supabase; la descarga local sigue siendo opcional.';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='🔄 Actualizar biblioteca';
 const list=document.createElement('div');list.className='group-video-library-list';
 const refreshLibrary=async()=>{
  const {data,error}=await sb.from('member_group_video_recordings').select('id,label,size_bytes,object_path,created_at').eq('owner_id',userId).eq('group_id',group.id).order('created_at',{ascending:false}).limit(40);
  list.replaceChildren();
  if(error){list.textContent='No se pudieron leer las grabaciones: '+error.message;return;}
  if(!data?.length){list.textContent='Todavía no has guardado grabaciones de este grupo.';return;}
  for(const item of data){
   const line=document.createElement('div');line.className='group-video-library-item';
   const name=document.createElement('span');name.textContent='🎥 '+item.label+' · '+new Date(item.created_at).toLocaleString('es-ES')+' · '+(item.size_bytes/1048576).toFixed(1)+' MB';
   const download=document.createElement('button');download.type='button';download.textContent='🔒 Descargar';
   download.onclick=async()=>{
    download.disabled=true;
    const {data:urlData,error:urlError}=await sb.storage.from('group-video-recordings').createSignedUrl(item.object_path,90,{download:true});
    if(urlError){say('No se pudo abrir el archivo: '+urlError.message);}else{
     const link=document.createElement('a');link.href=urlData.signedUrl;link.rel='noopener';link.target='_blank';link.click();
    }
    download.disabled=false;
   };
   const remove=document.createElement('button');remove.type='button';remove.textContent='🗑️ Borrar';
   remove.onclick=async()=>{
    if(!confirm('¿Borrar definitivamente esta grabación de tu biblioteca privada?'))return;
    remove.disabled=true;
    const {error:storageError}=await sb.storage.from('group-video-recordings').remove([item.object_path]);
    if(storageError){say('No se pudo borrar el archivo: '+storageError.message);remove.disabled=false;return;}
    const {error:dbError}=await sb.from('member_group_video_recordings').delete().eq('id',item.id).eq('owner_id',userId);
    if(dbError){say('El archivo se borró, pero el registro debe limpiarse: '+dbError.message);remove.disabled=false;return;}
    say('Grabación borrada.');refreshLibrary();
   };
   line.append(name,download,remove);list.append(line);
  }
 };
 refresh.onclick=refreshLibrary;
 panel.append(title,explanation,refresh,list);thread.append(panel);
 thread.addEventListener('group-video-recording-saved',refreshLibrary);
 await refreshLibrary();
}

let multiVideoSession=null;
async function joinMultiVideoRoom(room,group,userId,thread,say){
 if(multiVideoSession||groupCallSession||privateDirectCallSession){say('Finaliza tu llamada actual primero.');return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){say('Este navegador no permite videollamadas.');return;}
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});}
 catch(e){say('No se pudo abrir cámara o micrófono: '+e.message);return;}
 let {data:joinState,error:joinError}=await sb.rpc('request_join_group_video_room',{p_room_id:room.id});
 if(joinError){stream.getTracks().forEach(t=>t.stop());say('No se pudo entrar en la sala: '+joinError.message);return;}
 if(joinState==='waiting'){
  stream.getTracks().forEach(t=>t.stop());
  const waiting=document.createElement('section');waiting.className='group-call-panel';
  const notice=document.createElement('p');notice.textContent='⏳ Esperando aprobación del anfitrión o coanfitrión…';
  const cancel=document.createElement('button');cancel.textContent='Cancelar solicitud';
  waiting.append(notice,cancel);thread.prepend(waiting);
  let activeWaiting=true;
  cancel.onclick=()=>{activeWaiting=false;clearInterval(waitTimer);waiting.remove();};
  const check=async()=>{
   if(!activeWaiting||!waiting.isConnected){clearInterval(waitTimer);return;}
   const {data,error}=await sb.rpc('request_join_group_video_room',{p_room_id:room.id});
   if(error){notice.textContent='No se pudo entrar: '+error.message;activeWaiting=false;clearInterval(waitTimer);return;}
   if(data==='joined'){activeWaiting=false;clearInterval(waitTimer);waiting.remove();joinMultiVideoRoom(room,group,userId,thread,say);}
  };
  const waitTimer=setInterval(check,2500);return;
 }
 const panel=document.createElement('section');panel.className='group-call-panel group-multi-video';
 const title=document.createElement('h4');title.textContent='📹 Videollamada grupal';
 const videos=document.createElement('div');videos.className='group-multi-video-grid';
 const {data:memberProfiles}=await sb.from('profiles').select('id,display_name,username,avatar_url,featured_badge').in('id',(await sb.from('member_chat_group_members').select('user_id').eq('group_id',group.id)).data?.map(m=>m.user_id)||[userId]);

 const profileMap=new Map((memberProfiles||[]).map(p=>[p.id,p]));
 const peers=new Map();
 const participantThemes=new Map();
 const themeNames={sakura:'🌸 Sakura',neon:'💜 Neón',fire:'🔥 Fuego',galaxy:'🌌 Galaxia',night:'🌙 Noche',aurora:'🌈 Aurora mística',ember:'🐉 Dragón de brasas',celestial:'👑 Nebulosa celestial',welcome_spark:'🌟 Estrella del inicio',moon_blade:'🌙 Espada lunar',storm_spirit:'⚡ Espíritu tormenta',dragon_sky:'🐲 Dragón del cielo',phoenix:'🔥 Fénix dorado VIP',royal_cosmos:'💎 Trono cósmico VIP'};
 const premiumVideoThemes=[
  {id:'theme_aurora',value:'aurora',label:'🌈 Aurora mística'},
  {id:'theme_ember',value:'ember',label:'🐉 Dragón de brasas'},
  {id:'theme_celestial',value:'celestial',label:'👑 Nebulosa celestial'},
  {id:'theme_phoenix',value:'phoenix',label:'🔥 Fénix dorado VIP',vip:true},
  {id:'theme_royal_cosmos',value:'royal_cosmos',label:'💎 Trono cósmico VIP',vip:true}
 ];
 const freeVideoThemes=[
  {value:'welcome_spark',label:'🌟 Estrella del inicio',level:1,source:'welcome'},
  {value:'moon_blade',label:'🌙 Espada lunar',level:2,source:'level'},
  {value:'storm_spirit',label:'⚡ Espíritu tormenta',level:4,source:'level'},
  {value:'dragon_sky',label:'🐲 Dragón del cielo',level:7,source:'level'}
 ];
 const premiumVideoOwned=new Set();
 const freeVideoOwned=new Set();
 const participantBadgeMap=new Map();
 let lastVideoBadgeRefresh=0;
 let activeParticipantIds=new Set([userId]);
 const updateVideoThemeTags=()=>{
  for(const tile of videos.children){
   const id=tile.dataset.memberId,theme=participantThemes.get(id);
   let tag=tile.querySelector('.group-video-theme-tag');
   if(!theme||!themeNames[theme]){tag?.remove();continue;}
   if(!tag){tag=document.createElement('small');tag.className='group-video-theme-tag';tile.append(tag);}
   tag.textContent=themeNames[theme];tag.setAttribute('aria-label','Efecto anime: '+themeNames[theme]);
  }
 };
 function videoTile(id,video){
  const tile=document.createElement('div');tile.className='group-video-tile';tile.dataset.memberId=id;
  const profile=profileMap.get(id),name=document.createElement('span');name.textContent=(profile?.display_name||profile?.username||'Miembro')+(id===userId?' (tú)':'');
  if(profile?.avatar_url){const avatar=document.createElement('img');avatar.className='group-video-avatar';avatar.alt='Avatar de '+name.textContent;avatar.referrerPolicy='no-referrer';avatar.src=profile.avatar_url;tile.append(avatar);}
  if(profile?.featured_badge){const badge=document.createElement('small');badge.className='group-video-member-badge';badge.textContent='🏅 '+profile.featured_badge;tile.append(badge);}
  tile.append(video,name);videos.append(tile);return tile;
 }
 const local=document.createElement('video');local.autoplay=true;local.muted=true;local.playsInline=true;local.srcObject=stream;videoTile(userId,local);
 const videoAudioMonitors=new Map();let voiceContext=null;
 const voiceIndicatorControls=document.createElement('div');voiceIndicatorControls.className='group-video-voice-controls';
 const voiceIndicatorButton=document.createElement('button');voiceIndicatorButton.type='button';voiceIndicatorButton.textContent='🎤 Activar indicador de voz';
 const voiceIndicatorStatus=document.createElement('small');voiceIndicatorStatus.setAttribute('role','status');
 voiceIndicatorStatus.textContent='Pulsa Activar para iluminar tu marco cuando hables.';
 voiceIndicatorControls.append(voiceIndicatorButton,voiceIndicatorStatus);
 const resumeVoiceIndicator=async()=>{
  try{
   if(!voiceContext){voiceIndicatorStatus.textContent='⚠️ El navegador no admite el indicador de voz.';return;}
   if(voiceContext.state==='suspended')await voiceContext.resume();
   voiceIndicatorStatus.textContent=voiceContext.state==='running'?'✅ Indicador de voz activo. Habla con el micrófono encendido.':'⚠️ No se pudo iniciar el indicador. Comprueba los permisos del navegador.';
   voiceIndicatorButton.textContent=voiceContext.state==='running'?'🎤 Indicador de voz activo':'🎤 Activar indicador de voz';
  }catch(e){voiceIndicatorStatus.textContent='⚠️ No se pudo activar: '+e.message;}
 };
 voiceIndicatorButton.onclick=resumeVoiceIndicator;
 const monitorVoice=(id,media)=>{
  if(videoAudioMonitors.has(id)||!media?.getAudioTracks?.().length)return;
  try{
   const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextCtor)return;
   voiceContext ||= new AudioContextCtor();
   const source=voiceContext.createMediaStreamSource(new MediaStream(media.getAudioTracks()));
   const analyser=voiceContext.createAnalyser();analyser.fftSize=512;source.connect(analyser);
   videoAudioMonitors.set(id,{source,analyser,samples:new Float32Array(analyser.fftSize),speakingFrames:0});
  }catch(e){console.warn('Indicador de voz no disponible:',e.message);}
 };
 monitorVoice(userId,stream);
 const voiceIndicatorTimer=setInterval(()=>{
  if(!panel.isConnected||voiceContext?.state!=='running')return;
  for(const [id,monitor] of videoAudioMonitors){
   const tile=[...videos.children].find(el=>el.dataset.memberId===id);
   if(!tile)continue;
   const track=id===userId?stream.getAudioTracks()[0]:null;
   if(track&&!track.enabled){tile.classList.remove('group-video-speaking');monitor.speakingFrames=0;continue;}
   monitor.analyser.getFloatTimeDomainData(monitor.samples);
   let sum=0;for(const sample of monitor.samples)sum+=sample*sample;
   const rms=Math.sqrt(sum/monitor.samples.length);
   monitor.speakingFrames=rms>0.018?Math.min(monitor.speakingFrames+2,5):Math.max(monitor.speakingFrames-1,0);
   tile.classList.toggle('group-video-speaking',monitor.speakingFrames>0);
  }
 },120);
 const participantPanel=document.createElement('section');participantPanel.className='group-video-activity group-video-participant-roster';
 participantPanel.setAttribute('aria-label','Participantes de la videollamada');
 const participantHeading=document.createElement('h5');participantHeading.textContent='👥 Participantes (1)';
 const participantList=document.createElement('div');participantList.className='group-video-participant-list';
 participantList.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
 participantPanel.append(participantHeading,participantList);
 const renderVideoParticipants=(active)=>{
  activeParticipantIds=new Set(active);
  participantHeading.textContent='👥 Participantes ('+active.size+')';
  participantList.replaceChildren();
  for(const id of active){
   const profile=profileMap.get(id),item=document.createElement('div');
   item.style.cssText='display:flex;align-items:center;gap:9px;padding:7px 11px;border:1px solid rgba(185,132,255,.35);border-radius:12px;background:rgba(23,17,46,.65);min-width:155px;max-width:100%';
   const avatar=document.createElement('span');avatar.style.cssText='display:grid;place-items:center;width:32px;height:32px;flex-shrink:0;overflow:hidden;border-radius:50%;background:#47306e;color:white;font-weight:700';
   const displayName=profile?.display_name||profile?.username||'Miembro';
   if(profile?.avatar_url){const img=document.createElement('img');img.src=profile.avatar_url;img.alt='';img.referrerPolicy='no-referrer';img.style.cssText='width:100%;height:100%;object-fit:cover';img.onerror=()=>{img.remove();avatar.textContent=displayName.slice(0,1).toUpperCase();};avatar.append(img);}
   else avatar.textContent=displayName.slice(0,1).toUpperCase();
   const details=document.createElement('div');details.style.cssText='min-width:0';
   const name=document.createElement('div');name.textContent=displayName+(id===userId?' (tú)':'');name.style.cssText='font-weight:700;overflow-wrap:anywhere';
   const status=document.createElement('small');
   const connection=id===userId?'connected':peers.get(id)?.pc?.connectionState;
   status.textContent=id===userId?'🟢 En la sala':connection==='connected'?'🟢 Conectado':connection==='failed'||connection==='disconnected'?'🟠 Conexión interrumpida':'🟡 Conectando vídeo';
   details.append(name,status);
   const theme=participantThemes.get(id);
   if(theme&&themeNames[theme]){const themeChip=document.createElement('small');themeChip.className='group-video-theme-chip';themeChip.textContent='✨ '+themeNames[theme];details.append(themeChip);}
   if(profile?.featured_badge){const badge=document.createElement('small');badge.className='group-video-member-badge';badge.textContent='🏅 '+profile.featured_badge;details.append(badge);}
   const earnedBadges=participantBadgeMap.get(id)||[];
   for(const badgeLabel of earnedBadges.slice(0,2)){
    const badge=document.createElement('small');badge.className='group-video-earned-badge';badge.textContent=badgeLabel;details.append(badge);
   }
   if(earnedBadges.length>2){const extra=document.createElement('small');extra.textContent='+'+(earnedBadges.length-2)+' insignias';details.append(extra);}
   item.append(avatar,details);participantList.append(item);
  }
  updateVideoThemeTags();
 };
 renderVideoParticipants(new Set([userId]));
 const mediaSettings=document.createElement('section');mediaSettings.className='group-video-activity group-video-media-settings';
 const mediaTitle=document.createElement('h5');mediaTitle.textContent='🎛️ Calidad y fondos de vídeo';
 const quality=document.createElement('select');quality.setAttribute('aria-label','Calidad de vídeo');
 for(const [value,label] of [['auto','Calidad automática'],['low','Ahorro de datos (360p)'],['high','Alta calidad (720p)']]){const option=document.createElement('option');option.value=value;option.textContent=label;quality.append(option);}
 const background=document.createElement('select');background.setAttribute('aria-label','Efecto anime de mi vídeo');
 for(const [value,label] of [['none','Sin efecto'],['sakura','🌸 Sakura'],['neon','💜 Neón'],['fire','🔥 Fuego'],['galaxy','🌌 Galaxia'],['night','🌙 Noche (estilo anterior)'],['aurora','🌈 Aurora mística (exclusivo)'],['ember','🐉 Dragón de brasas (exclusivo)'],['celestial','👑 Nebulosa celestial (exclusivo)'],['welcome_spark','🌟 Estrella del inicio (bienvenida)'],['moon_blade','🌙 Espada lunar (nivel 2)'],['storm_spirit','⚡ Espíritu tormenta (nivel 4)'],['dragon_sky','🐲 Dragón del cielo (nivel 7)'],['phoenix','🔥 Fénix dorado VIP'],['royal_cosmos','💎 Trono cósmico VIP']]){const option=document.createElement('option');option.value=value;option.textContent=label;background.append(option);}
 const qualityInfo=document.createElement('p');qualityInfo.textContent='La calidad se adapta a tu conexión. El efecto elegido decora solo el marco de tu vídeo, sin modificar la imagen de la cámara.';
 const localTile=local.parentElement;
 background.onchange=()=>{
  if((premiumVideoThemes.some(item=>item.value===background.value)&&!premiumVideoOwned.has(background.value))||
     (freeVideoThemes.some(item=>item.value===background.value)&&!freeVideoOwned.has(background.value))){
   qualityInfo.textContent='🔒 Aún no tienes este efecto. Consulta las recompensas de bienvenida, nivel o tienda VIP.';
   background.value='none';
  }
  localTile.classList.remove('video-bg-sakura','video-bg-night','video-bg-neon','video-bg-fire','video-bg-galaxy','video-bg-aurora','video-bg-ember','video-bg-celestial','video-bg-welcome_spark','video-bg-moon_blade','video-bg-storm_spirit','video-bg-dragon_sky','video-bg-phoenix','video-bg-royal_cosmos');
  if(background.value!=='none')localTile.classList.add('video-bg-'+background.value);
 };
 quality.onchange=async()=>{const track=stream.getVideoTracks()[0];if(!track)return;const height=quality.value==='low'?360:quality.value==='high'?720:480;try{await track.applyConstraints({height:{ideal:height},frameRate:{ideal:quality.value==='low'?15:24,max:30}});qualityInfo.textContent='Calidad solicitada: '+quality.options[quality.selectedIndex].textContent+'. El navegador ajustará según disponibilidad.';}catch(e){qualityInfo.textContent='Tu cámara no admite ese ajuste: '+e.message;}};
 // Do not await rewards or shop: the call must connect even if reward services are slow.
 const hasRestrictedVideoTheme=(value)=>premiumVideoThemes.some(t=>t.value===value)||freeVideoThemes.some(t=>t.value===value);
 for(const option of background.options)if(hasRestrictedVideoTheme(option.value))option.disabled=true;
 let savedMedia=null;
 const loadVideoSettingsInBackground=async()=>{
  try{
   const [{data:settings,error:settingsError},{data:ownedPremium,error:premiumError}]=await Promise.all([
    sb.from('member_group_video_preferences').select('quality,theme').eq('user_id',userId).maybeSingle(),
    sb.from('member_shop_purchases').select('item_id').eq('user_id',userId).in('item_id',premiumVideoThemes.map(t=>t.id))
   ]);
   if(settingsError)console.warn('Preferencias de vídeo:',settingsError.message);
   if(premiumError)console.warn('Compras de vídeo:',premiumError.message);
   for(const row of ownedPremium||[]){const item=premiumVideoThemes.find(t=>t.id===row.item_id);if(item)premiumVideoOwned.add(item.value);}
   savedMedia=settings||null;
   const {error:syncError}=await sb.rpc('sync_video_theme_rewards');
   if(syncError)console.warn('Recompensas de vídeo:',syncError.message);
   const {data:unlocks,error:unlockError}=await sb.from('member_video_theme_unlocks').select('theme').eq('user_id',userId);
   if(unlockError)console.warn('Efectos de nivel:',unlockError.message);
   for(const reward of unlocks||[])freeVideoOwned.add(reward.theme);
   for(const option of background.options)if(hasRestrictedVideoTheme(option.value))option.disabled=!(premiumVideoOwned.has(option.value)||freeVideoOwned.has(option.value));
   if(savedMedia){
    quality.value=savedMedia.quality||'auto';
    const selected=savedMedia.theme||'none';
    if(!hasRestrictedVideoTheme(selected)||premiumVideoOwned.has(selected)||freeVideoOwned.has(selected)){
     if(background.value==='none'){background.value=selected;background.onchange();updateThemeButtons();publishVideoTheme().catch(console.warn);}
    }
    if(quality.value!=='auto')quality.onchange();
   }
   refreshFreeRewards().catch(console.warn);
   refreshPremiumVideoThemes().catch(console.warn);
  }catch(e){console.warn('No se pudieron cargar las recompensas, pero la llamada sigue operativa:',e);}
 };
 const publishVideoTheme=async()=>{
  participantThemes.set(userId,background.value);
  renderVideoParticipants(activeParticipantIds);
  const {error}=await sb.from('member_group_video_participants').update({anime_theme:background.value}).eq('room_id',room.id).eq('user_id',userId);
  if(error)console.warn('No se pudo compartir el efecto anime en la sala:',error.message);
 };
 const saveMediaPreference=async()=>{const {error}=await sb.from('member_group_video_preferences').upsert({user_id:userId,quality:quality.value,theme:background.value,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.warn('Preferencias de vídeo:',error.message);};
 quality.addEventListener('change',saveMediaPreference);background.addEventListener('change',saveMediaPreference);
 background.addEventListener('change',()=>{publishVideoTheme().catch(console.warn);});
 publishVideoTheme().catch(console.warn);
 const effectsBar=document.createElement('div');effectsBar.className='group-video-theme-options';
 const themeButtons=new Map();
 const themeOptions=[['sakura','🌸 Sakura'],['neon','💜 Neón'],['fire','🔥 Fuego'],['galaxy','🌌 Galaxia'],['none','✖ Sin efecto']];
 const updateThemeButtons=()=>{for(const [theme,button] of themeButtons){const chosen=background.value===theme;button.setAttribute('aria-pressed',String(chosen));button.classList.toggle('is-selected',chosen);}};
 for(const [theme,label] of themeOptions){
  const button=document.createElement('button');button.type='button';button.textContent=label;
  button.setAttribute('aria-label','Elegir efecto '+label);
  button.onclick=()=>{background.value=theme;background.dispatchEvent(new Event('change',{bubbles:true}));updateThemeButtons();};
  effectsBar.append(button);themeButtons.set(theme,button);
 }
 background.addEventListener('change',updateThemeButtons);
 updateThemeButtons();
 const effectsTitle=document.createElement('h5');effectsTitle.textContent='✨ Elige el efecto anime de tu cámara';
 mediaSettings.classList.add('group-video-theme-picker');
 const freeRewardSection=document.createElement('section');freeRewardSection.className='group-video-free-rewards';
 const freeRewardTitle=document.createElement('h5');freeRewardTitle.textContent='🎁 Bienvenida y efectos por nivel';
 const freeRewardInfo=document.createElement('p');freeRewardInfo.textContent='Sin coste: se desbloquean al entrar o alcanzar el nivel requerido.';
 const freeRewardGrid=document.createElement('div');freeRewardGrid.className='group-video-free-grid';
 const freeRewardRefresh=document.createElement('button');freeRewardRefresh.type='button';freeRewardRefresh.textContent='🔄 Comprobar recompensas de nivel';
 freeRewardSection.append(freeRewardTitle,freeRewardInfo,freeRewardGrid,freeRewardRefresh);
 const badgeSection=document.createElement('section');badgeSection.className='group-video-reward-badges';
 const badgeTitle=document.createElement('h5');badgeTitle.textContent='🎖️ Mis insignias de efectos';
 const badgeList=document.createElement('div');badgeList.className='group-video-badge-list';
 badgeList.textContent='Cargando insignias…';
 badgeSection.append(badgeTitle,badgeList);
 const refreshVideoBadges=async(ids=activeParticipantIds)=>{
  const members=[...ids];if(!members.length)return;
  const {data,error}=await sb.from('member_video_theme_badges').select('user_id,badge_label,theme').in('user_id',members).order('unlocked_at',{ascending:true}).limit(200);
  if(error){console.warn('No se pudieron consultar las insignias de vídeo:',error.message);if(members.includes(userId))badgeList.textContent='No se pudieron cargar las insignias.';return;}
  for(const id of members)participantBadgeMap.set(id,[]);
  for(const badge of data||[]){
   const labels=participantBadgeMap.get(badge.user_id)||[];
   labels.push(badge.badge_label);participantBadgeMap.set(badge.user_id,labels);
  }
  renderVideoParticipants(activeParticipantIds);
  badgeList.replaceChildren();
  const mine=participantBadgeMap.get(userId)||[];
  if(!mine.length)badgeList.textContent='Todavía no tienes insignias de efectos.';
  for(const label of mine){const span=document.createElement('span');span.className='group-video-earned-badge';span.textContent=label;badgeList.append(span);}
 };
 const refreshFreeRewards=async()=>{
  freeRewardRefresh.disabled=true;
  try{
   const sync=await sb.rpc('sync_video_theme_rewards');
   if(sync.error){freeRewardInfo.textContent='⚠️ No se pudieron comprobar los niveles: '+sync.error.message;return;}
   const [ownedResult,xpResult]=await Promise.all([
    sb.from('member_video_theme_unlocks').select('theme').eq('user_id',userId),
    sb.rpc('community_member_xp',{target_member:userId})
   ]);
   if(ownedResult.error||xpResult.error){freeRewardInfo.textContent='⚠️ No se pudo cargar tu progreso.';return;}
   const level=Math.min(50,Math.floor(Math.sqrt(Math.max(0,Number(xpResult.data)||0)/100))+1);
   freeVideoOwned.clear();
   for(const item of ownedResult.data||[])freeVideoOwned.add(item.theme);
   for(const option of background.options)if(freeVideoThemes.some(item=>item.value===option.value))option.disabled=!freeVideoOwned.has(option.value);
   freeRewardInfo.textContent='⭐ Nivel '+level+' · La bienvenida se entrega una vez y los premios de nivel son permanentes.';
   freeRewardGrid.replaceChildren();
   for(const item of freeVideoThemes){
    const card=document.createElement('article');card.className='group-video-free-card';
    const name=document.createElement('strong');name.textContent=item.label;
    const description=document.createElement('small');description.textContent=item.source==='welcome'?'🎁 Regalo gratuito de bienvenida':'🏆 Se obtiene al alcanzar nivel '+item.level;
    const button=document.createElement('button');button.type='button';
    const owned=freeVideoOwned.has(item.value);
    button.textContent=owned?'✨ Usar efecto':'🔒 Necesitas nivel '+item.level;
    button.disabled=!owned;
    button.onclick=()=>{
     if(!freeVideoOwned.has(item.value))return;
     background.value=item.value;
     background.dispatchEvent(new Event('change',{bubbles:true}));
     updateThemeButtons();
     freeRewardInfo.textContent='✅ Efecto seleccionado: '+item.label;
    };
    card.append(name,description,button);freeRewardGrid.append(card);
   }
   await refreshVideoBadges();
  }catch(e){freeRewardInfo.textContent='⚠️ Error en recompensas: '+e.message;}
  finally{freeRewardRefresh.disabled=false;}
 };
 freeRewardRefresh.onclick=()=>{refreshFreeRewards().catch(console.warn);};
  const premiumVideoSection=document.createElement('section');premiumVideoSection.className='group-video-premium-themes';
 const premiumTitle=document.createElement('h5');premiumTitle.textContent='💎 Tienda anime VIP · Efectos exclusivos';
 const premiumStatus=document.createElement('p');premiumStatus.textContent='Consultando tu nivel, saldo y efectos comprados…';premiumStatus.setAttribute('role','status');
 const premiumCards=document.createElement('div');premiumCards.className='group-video-premium-grid';
 const refreshPremium=document.createElement('button');refreshPremium.type='button';refreshPremium.textContent='🔄 Actualizar puntos y efectos';
 premiumVideoSection.append(premiumTitle,premiumStatus,premiumCards,refreshPremium);
 const choosePremiumTheme=(value)=>{
  if(!premiumVideoOwned.has(value))return;
  background.value=value;
  background.dispatchEvent(new Event('change',{bubbles:true}));
  updateThemeButtons();
 };
 const refreshPremiumVideoThemes=async()=>{
  refreshPremium.disabled=true;
  try{
   const [itemsRes,purchasesRes,balanceRes,xpRes]=await Promise.all([
    sb.from('reward_shop_items').select('id,name,price,required_level,value,sale_price,sale_starts_at,sale_ends_at,available_from,available_until').in('id',premiumVideoThemes.map(item=>item.id)).eq('active',true),
    sb.from('member_shop_purchases').select('item_id').eq('user_id',userId).in('item_id',premiumVideoThemes.map(item=>item.id)),
    sb.rpc('reward_shop_balance'),
    sb.rpc('community_member_xp',{target_member:userId})
   ]);
   const error=itemsRes.error||purchasesRes.error||balanceRes.error||xpRes.error;
   if(error){premiumStatus.textContent='⚠️ No se pudieron cargar los efectos exclusivos: '+error.message;return;}
   const balance=Math.max(0,Number(balanceRes.data)||0),xp=Math.max(0,Number(xpRes.data)||0);
   const level=Math.min(50,Math.floor(Math.sqrt(xp/100))+1);
   premiumVideoOwned.clear();
   for(const row of purchasesRes.data||[]){const item=premiumVideoThemes.find(t=>t.id===row.item_id);if(item)premiumVideoOwned.add(item.value);}
   for(const option of background.options)if(premiumVideoThemes.some(t=>t.value===option.value))option.disabled=!premiumVideoOwned.has(option.value);
   premiumStatus.textContent='⭐ Nivel '+level+' · 💰 '+balance.toLocaleString('es-ES')+' puntos disponibles. Las compras son permanentes.';
   premiumCards.replaceChildren();
   for(const theme of premiumVideoThemes){
    const product=(itemsRes.data||[]).find(item=>
     item.id===theme.id &&
     (premiumVideoOwned.has(theme.value) ||
      ((!item.available_from || Date.now()>=Date.parse(item.available_from)) &&
       (!item.available_until || Date.now()<Date.parse(item.available_until))))
    );
    const card=document.createElement('article');card.className='group-video-premium-card';card.dataset.theme=theme.value;if(theme.vip)card.classList.add('is-vip');
    const heading=document.createElement('strong');heading.textContent=theme.label;card.append(heading);
    if(!product){const unavailable=document.createElement('small');unavailable.textContent='No disponible por ahora';card.append(unavailable);premiumCards.append(card);continue;}
    const owned=premiumVideoOwned.has(theme.value);
    const inOffer=product.sale_price!=null && product.sale_starts_at && product.sale_ends_at &&
     Date.now()>=new Date(product.sale_starts_at).getTime() && Date.now()<new Date(product.sale_ends_at).getTime();
    const priceNow=inOffer?Number(product.sale_price):Number(product.price);
    const info=document.createElement('small');info.textContent='Nivel '+product.required_level+' · '+priceNow+' puntos'+(inOffer?' · 🔥 Oferta (antes '+product.price+')':'')+(owned?' · ✅ Desbloqueado':'');
    const button=document.createElement('button');button.type='button';
    if(owned){
     button.textContent=background.value===theme.value?'✅ Efecto seleccionado':'✨ Usar efecto';
     button.onclick=()=>{choosePremiumTheme(theme.value);premiumStatus.textContent='✅ Has elegido '+product.name+'.';refreshPremiumVideoThemes().catch(console.warn);};
    }else if(level<product.required_level){
     button.textContent='🔒 Necesitas nivel '+product.required_level;button.disabled=true;
    }else if(balance<priceNow){
     button.textContent='🔒 Faltan '+(priceNow-balance)+' puntos';button.disabled=true;
    }else{
     button.textContent='🔓 Desbloquear por '+priceNow+' puntos';
     button.onclick=async()=>{
      if(!confirm('¿Desbloquear '+product.name+' por '+priceNow+' puntos?'))return;
      button.disabled=true;
      const {data,error:buyError}=await sb.rpc('buy_reward_shop_item',{requested_item:theme.id});
      if(buyError){premiumStatus.textContent='⚠️ No se pudo desbloquear: '+buyError.message;button.disabled=false;return;}
      await refreshPremiumVideoThemes();
      if(premiumVideoOwned.has(theme.value))choosePremiumTheme(theme.value);
      await refreshVideoBadges();
      premiumStatus.textContent=data===false?'✅ Este efecto ya estaba comprado.':'🎉 ¡Efecto desbloqueado, insignia conseguida y seleccionado!';
     };
    }
    card.append(info,button);premiumCards.append(card);
   }
  }catch(e){premiumStatus.textContent='⚠️ No se pudieron cargar los efectos: '+e.message;}
  finally{refreshPremium.disabled=false;}
 };
 refreshPremium.onclick=()=>{refreshPremiumVideoThemes().catch(console.warn);};
 mediaSettings.append(effectsTitle,effectsBar,freeRewardSection,premiumVideoSection,badgeSection,mediaTitle,quality,background,qualityInfo);
 const actions=document.createElement('div');actions.className='group-call-actions';
 const invites=document.createElement('div');invites.className='group-video-invites';
 const inviteSelect=document.createElement('select');inviteSelect.setAttribute('aria-label','Invitar miembro');
 const inviteButton=document.createElement('button');inviteButton.type='button';inviteButton.textContent='✉️ Invitar';
 const inviteReplies=document.createElement('div');inviteReplies.className='group-video-invite-replies';inviteReplies.setAttribute('aria-live','polite');
 const attendanceSummary=document.createElement('div');attendanceSummary.className='group-video-attendance-summary';
 const refreshInviteReplies=async()=>{
  const {data,error}=await sb.from('member_group_video_invites').select('invitee_id,response').eq('room_id',room.id).eq('inviter_id',userId);
  if(error){inviteReplies.textContent='No se pudieron cargar las respuestas: '+error.message;return;}
  const labels={pending:'⏳ Pendiente',accepted:'✅ Aceptada',declined:'❌ Rechazada'};
  inviteReplies.replaceChildren();
  if(!data?.length){inviteReplies.textContent='Todavía no has enviado invitaciones.';return;}
  for(const item of data){
   const span=document.createElement('span');span.className='group-video-invite-chip';
   const name=profileMap.get(item.invitee_id)?.display_name||profileMap.get(item.invitee_id)?.username||'Miembro';
   span.textContent=name+' · '+(labels[item.response]||labels.pending);inviteReplies.append(span);
  }
 };
 const refreshAttendanceStats=async()=>{
  const {data,error}=await sb.from('member_group_video_attendance').select('user_id,joined_at,left_at').eq('room_id',room.id).limit(500);
  if(error){attendanceSummary.textContent='No se pudieron cargar las estadísticas: '+error.message;return;}
  const visits=data||[],unique=new Set(visits.map(v=>v.user_id));
  const totalSeconds=visits.reduce((acc,v)=>acc+Math.max(0,(new Date(v.left_at||Date.now()).getTime()-new Date(v.joined_at).getTime())/1000),0);
  attendanceSummary.textContent='📊 Asistencia registrada: '+unique.size+' participante(s), '+visits.length+' entrada(s) · '+Math.round(totalSeconds/60)+' min acumulados aproximados (suma de asistencias).';
 };
 let refreshAnalyticsAt=0;
 const refreshInvites=document.createElement('button');refreshInvites.type='button';refreshInvites.textContent='🔄 Ver respuestas y estadísticas';
 refreshInvites.onclick=()=>{refreshInviteReplies();refreshAttendanceStats();};
 inviteButton.onclick=async()=>{
  if(!inviteSelect.value){say('Selecciona un miembro para invitar.');return;}
  inviteButton.disabled=true;
  const {error}=await sb.from('member_group_video_invites').insert({room_id:room.id,inviter_id:userId,invitee_id:inviteSelect.value});
  inviteButton.disabled=false;
  say(error?(error.code==='23505'?'Ya existe una invitación para esa persona en esta sala.':'No se pudo invitar: '+error.message):'Invitación enviada. El destinatario puede aceptarla o rechazarla desde su grupo.');
  refreshInviteReplies();
 };
 invites.append(inviteSelect,inviteButton,refreshInvites,inviteReplies,attendanceSummary);
 refreshInviteReplies();refreshAttendanceStats();
 const moderator=document.createElement('div');moderator.className='group-video-moderator';
 const {data:myRole}=await sb.from('member_chat_group_members').select('role').eq('group_id',group.id).eq('user_id',userId).maybeSingle();
 const {data:cohostMembership}=await sb.from('member_group_video_cohosts').select('user_id').eq('room_id',room.id).eq('user_id',userId).maybeSingle();
 const canModerate=room.created_by===userId||group.owner_id===userId||myRole?.role==='admin'||!!cohostMembership;
 if(canModerate){
  const kickSelect=document.createElement('select');kickSelect.setAttribute('aria-label','Participante a expulsar');
  const kick=document.createElement('button');kick.type='button';kick.textContent='🛡️ Expulsar participante';
  kick.onclick=async()=>{if(!kickSelect.value)return;if(!confirm('¿Expulsar a este participante de la sala?'))return;const {error}=await sb.rpc('moderate_group_video_participant',{p_room_id:room.id,p_target_id:kickSelect.value});say(error?'No se pudo expulsar: '+error.message:'Participante expulsado.');};
  const restoreSelect=document.createElement('select');restoreSelect.setAttribute('aria-label','Participante a readmitir');
  const restore=document.createElement('button');restore.type='button';restore.textContent='✅ Permitir volver a entrar';
  restore.onclick=async()=>{if(!restoreSelect.value)return;const {error}=await sb.rpc('restore_group_video_participant',{p_room_id:room.id,p_target_id:restoreSelect.value});say(error?'No se pudo autorizar el regreso: '+error.message:'Acceso restablecido. La persona puede pulsar Unirse.');};
  moderator.append(kickSelect,kick,restoreSelect,restore);
  moderator.refreshBlocked=async()=>{
   const {data:removed}=await sb.from('member_group_video_removals').select('user_id').eq('room_id',room.id);
   restoreSelect.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=(removed||[]).length?'Selecciona un participante expulsado':'No hay participantes expulsados';restoreSelect.append(placeholder);for(const item of removed||[]){const o=document.createElement('option');o.value=item.user_id;o.textContent=profileMap.get(item.user_id)?.display_name||profileMap.get(item.user_id)?.username||'Miembro';restoreSelect.append(o);}
  };
  moderator.refresh=(ids)=>{kickSelect.replaceChildren();for(const id of ids){if(id===userId)continue;const o=document.createElement('option');o.value=id;o.textContent=profileMap.get(id)?.display_name||profileMap.get(id)?.username||'Miembro';kickSelect.append(o);}};
 }

 const accessPanel=document.createElement('section');accessPanel.className='group-video-activity';
 if(canModerate){
  const accessTitle=document.createElement('h5');accessTitle.textContent='🔐 Acceso a la sala';
  const privateLabel=document.createElement('label');const privateBox=document.createElement('input');privateBox.type='checkbox';privateLabel.append(privateBox,document.createTextNode(' Sala privada: aprobar entradas'));
  const lockLabel=document.createElement('label');const lockBox=document.createElement('input');lockBox.type='checkbox';lockLabel.append(lockBox,document.createTextNode(' Bloquear nuevas entradas'));
  const saveAccess=document.createElement('button');saveAccess.type='button';saveAccess.textContent='Guardar permisos de sala';
  const pendingList=document.createElement('div');
  const {data:initialSettings}=await sb.from('member_group_video_settings').select('private_mode,locked').eq('room_id',room.id).maybeSingle();
  privateBox.checked=!!initialSettings?.private_mode;lockBox.checked=!!initialSettings?.locked;
  const accessHint=document.createElement('p');accessHint.setAttribute('role','status');
  const updateAccessHint=()=>{accessHint.textContent=lockBox.checked?'🔒 Sala bloqueada: los miembros no pueden enviar solicitudes de entrada. Desmarca esta opción para usar la sala de espera.':privateBox.checked?'⏳ Sala de espera activa: los miembros podrán solicitar entrar y recibirás botones para aprobar o rechazar.':'🔓 Sala abierta: los miembros del grupo pueden entrar directamente.';};
  privateBox.addEventListener('change',()=>{if(privateBox.checked)lockBox.checked=false;updateAccessHint();});
  lockBox.addEventListener('change',()=>{if(lockBox.checked)privateBox.checked=false;updateAccessHint();});
  updateAccessHint();
  saveAccess.onclick=async()=>{saveAccess.disabled=true;const {error}=await sb.rpc('set_group_video_settings',{p_room_id:room.id,p_private:privateBox.checked,p_locked:lockBox.checked});saveAccess.disabled=false;say(error?'No se pudieron guardar los permisos: '+error.message:'Permisos de sala actualizados.');if(!error){saveAccess.textContent='✅ Permisos guardados';setTimeout(()=>{if(saveAccess.isConnected)saveAccess.textContent='💾 Guardar permisos de sala';},2500);}};
  accessPanel.refresh=async()=>{
   const {data:pending,error}=await sb.from('member_group_video_waiting').select('user_id,status').eq('room_id',room.id).eq('status','pending');
   if(error)return;
   pendingList.replaceChildren();
   for(const req of pending||[]){
    const line=document.createElement('div');line.className='group-call-actions';
    const name=document.createElement('span');name.textContent=profileMap.get(req.user_id)?.display_name||profileMap.get(req.user_id)?.username||'Miembro';
    for(const [label,approved] of [['✅ Aprobar',true],['❌ Rechazar',false]]){
     const btn=document.createElement('button');btn.type='button';btn.textContent=label;
     btn.onclick=async()=>{const {error}=await sb.rpc('review_group_video_waiting',{p_room_id:room.id,p_target_id:req.user_id,p_approve:approved});say(error?'No se pudo responder: '+error.message:approved?'Entrada aprobada.':'Solicitud rechazada.');await accessPanel.refresh();};
     line.append(btn);
    }
    line.prepend(name);pendingList.append(line);
   }
   if(!pendingList.childElementCount)pendingList.textContent='No hay solicitudes pendientes.';
  };
  saveAccess.className='group-video-save-access';saveAccess.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center;justify-content:center;min-height:44px;padding:12px 18px;background:#16a34a;color:#fff;border:2px solid #86efac;border-radius:10px;font-weight:700;cursor:pointer;position:relative;z-index:2;';
  accessPanel.classList.add('group-video-access-panel');
  accessPanel.append(accessTitle,privateLabel,lockLabel,accessHint,saveAccess,pendingList);
 }
 const activity=document.createElement('section');activity.className='group-video-activity';
 const activityTitle=document.createElement('h5');activityTitle.textContent='✋ Participación y chat de la sala';
 const activityLog=document.createElement('div');activityLog.className='group-video-activity-log';activityLog.setAttribute('role','log');activityLog.setAttribute('aria-live','polite');
 const hand=document.createElement('button');hand.type='button';hand.textContent='✋ Levantar la mano';
 let handRaised=false,activityCursor=0;
 const postActivity=async(kind,body=null,target_id=null)=>{const {error}=await sb.from('member_group_video_activity').insert({room_id:room.id,user_id:userId,kind,body,target_id});if(error)say('No se pudo enviar: '+error.message);return !error;};
 hand.onclick=async()=>{const next=!handRaised;if(await postActivity('hand',next?'up':'down')){handRaised=next;hand.textContent=next?'✋ Bajar la mano':'✋ Levantar la mano';}};
 const chatInput=document.createElement('input');chatInput.type='text';chatInput.maxLength=1000;chatInput.placeholder='Escribe un mensaje para la sala';chatInput.setAttribute('aria-label','Mensaje de videollamada');
 const chatSend=document.createElement('button');chatSend.type='button';chatSend.textContent='💬 Enviar';
 const sendChat=async()=>{const msg=chatInput.value.trim();if(!msg)return;if(await postActivity('message',msg))chatInput.value='';};
 chatSend.onclick=sendChat;chatInput.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
 activity.append(activityTitle,hand,activityLog,chatInput,chatSend);
 if(canModerate){
  const muteSelect=document.createElement('select');muteSelect.setAttribute('aria-label','Solicitar silencio a participante');
  const muteRequest=document.createElement('button');muteRequest.type='button';muteRequest.textContent='🎙️ Solicitar silenciar';
  muteRequest.onclick=async()=>{if(muteSelect.value&&await postActivity('mute_request',null,muteSelect.value))say('Solicitud enviada. El participante decide si silencia su micrófono.');};
  moderator.append(muteSelect,muteRequest);
  moderator.refreshMute=ids=>{const selected=muteSelect.value;muteSelect.replaceChildren();for(const id of ids){if(id===userId)continue;const o=document.createElement('option');o.value=id;o.textContent=profileMap.get(id)?.display_name||profileMap.get(id)?.username||'Miembro';muteSelect.append(o);}if([...muteSelect.options].some(o=>o.value===selected))muteSelect.value=selected;};
 }
 const extras=document.createElement('section');extras.className='group-video-activity';
 const extrasTitle=document.createElement('h5');extrasTitle.textContent='❤️ Reacciones, grabación y roles';
 const reactionBar=document.createElement('div');reactionBar.className='group-call-actions';
 for(const emoji of ['❤️','👏','😂','🎉','👍']){const btn=document.createElement('button');btn.type='button';btn.textContent=emoji;btn.setAttribute('aria-label','Reaccionar '+emoji);btn.onclick=()=>postActivity('reaction',emoji);reactionBar.append(btn);}
 const filterBar=document.createElement('div');filterBar.className='group-call-actions';
 const filterLabel=document.createElement('label');filterLabel.textContent='✨ Filtro anime en directo';
 const filterSelect=document.createElement('select');filterSelect.setAttribute('aria-label','Filtro de cámara');
 for(const [value,label] of [['none','Original'],['vivid','Anime vibrante'],['dream','Anime soñador'],['mono','Manga blanco y negro']]){const o=document.createElement('option');o.value=value;o.textContent=label;filterSelect.append(o);}
 filterSelect.onchange=()=>{local.classList.remove('anime-filter-vivid','anime-filter-dream','anime-filter-mono');if(filterSelect.value!=='none')local.classList.add('anime-filter-'+filterSelect.value);};
 filterBar.append(filterLabel,filterSelect);
 const virtualLabel=document.createElement('label');virtualLabel.textContent='🌸 Fondo virtual anime (experimental)';
 const virtualSelect=document.createElement('select');virtualSelect.setAttribute('aria-label','Fondo virtual anime');
 for(const [value,label] of [['none','Sin fondo virtual'],['sakura','🌸 Sakura'],['night','🌌 Noche estrellada'],['neon','💜 Ciudad neón']]){const o=document.createElement('option');o.value=value;o.textContent=label;virtualSelect.append(o);}
 const virtualHelp=document.createElement('small');virtualHelp.textContent='Sustituye el fondo de tu cámara mediante segmentación local. Puede tardar unos segundos en activarse; requiere conexión para cargar el modelo.';
 let animeBackgroundController=null,animeBackgroundRequest=0;
 const activeVideoTrack=()=>animeBackgroundController?.track?.readyState==='live'?animeBackgroundController.track:stream.getVideoTracks()[0];
 const applyVideoTrack=async()=>{
  const track=activeVideoTrack();
  if(!track)return;
  if(screenStream){originalVideo=track;return;}
  for(const {pc} of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(track);}
  local.srcObject=animeBackgroundController?new MediaStream([track,...stream.getAudioTracks()]):stream;
  local.play().catch(()=>{});
 };
 virtualSelect.onchange=async()=>{
  const request=++animeBackgroundRequest,theme=virtualSelect.value;
  if(theme==='none'){
   animeBackgroundController?.stop();animeBackgroundController=null;
   virtualHelp.textContent='Fondo virtual desactivado. Se utiliza la cámara original.';
   await applyVideoTrack();return;
  }
  if(!window.ShadowsAnimeBackground){virtualHelp.textContent='El procesador de fondos no está disponible. Actualiza la página.';return;}
  virtualSelect.disabled=true;virtualHelp.textContent='⏳ Cargando el recorte de persona y el fondo anime…';
  try{
   const controller=await window.ShadowsAnimeBackground.create(stream,theme,error=>{
    if(animeBackgroundController===controller){
     animeBackgroundController=null;virtualSelect.value='none';virtualHelp.textContent='El fondo se desactivó por falta de rendimiento: '+error.message;
     applyVideoTrack().catch(console.warn);
    }
   });
   if(request!==animeBackgroundRequest||closed){controller.stop();return;}
   const previous=animeBackgroundController;animeBackgroundController=controller;
   await applyVideoTrack();previous?.stop();
   virtualHelp.textContent='✅ Fondo anime real activo en tu vídeo. Tu entorno se recorta localmente.';
  }catch(e){
   if(request===animeBackgroundRequest){virtualSelect.value=animeBackgroundController?'sakura':'none';virtualHelp.textContent='No se pudo activar el fondo: '+e.message;console.warn('Fondo anime:',e);}
  }finally{if(request===animeBackgroundRequest)virtualSelect.disabled=false;}
 };
 filterBar.append(virtualLabel,virtualSelect,virtualHelp);
 const stickerBar=document.createElement('div');stickerBar.className='group-call-actions';
 const stickerTitle=document.createElement('span');stickerTitle.textContent='✨ Stickers especiales';
 stickerBar.append(stickerTitle);
 for(const emoji of ['🌸','⭐','🔥','💜']){const button=document.createElement('button');button.type='button';button.textContent=emoji;button.onclick=()=>postActivity('reaction',emoji);stickerBar.append(button);}

 const floatingReactions=document.createElement('div');floatingReactions.className='group-video-floating-reactions';floatingReactions.setAttribute('aria-live','off');videos.parentElement?.append(floatingReactions);
 const animateReaction=(emoji)=>{if(!['❤️','👏','😂','🎉','👍','🌸','⭐','🔥','💜'].includes(emoji))return;const bubble=document.createElement('span');bubble.className='group-video-reaction-bubble';bubble.textContent=emoji;bubble.style.left=(10+Math.random()*75)+'%';floatingReactions.append(bubble);setTimeout(()=>bubble.remove(),2100);};
 const roleStatus=document.createElement('p');roleStatus.textContent=room.created_by===userId?'👑 Eres el anfitrión':cohostMembership?'👑 Eres coanfitrión — puedes moderar la sala':'Participante de la sala';
 const consentLabel=document.createElement('label');const consent=document.createElement('input');consent.type='checkbox';consentLabel.append(consent,document.createTextNode(' Autorizo la grabación de esta sala'));
 consent.onchange=async()=>{consent.disabled=true;const {error}=await sb.from('member_group_video_recording_consents').upsert({room_id:room.id,user_id:userId,consented:consent.checked,updated_at:new Date().toISOString()},{onConflict:'room_id,user_id'});consent.disabled=false;if(error){say('No se pudo guardar el consentimiento: '+error.message);recordingStatus.textContent='Error guardando consentimiento: '+error.message;consent.checked=!consent.checked;}else{recordingStatus.textContent=consent.checked?'Tu consentimiento está guardado. Esperando la autorización de los demás.':'Has retirado tu consentimiento.';}};
 const recordingStatus=document.createElement('p');recordingStatus.setAttribute('role','status');recordingStatus.textContent='Grabación detenida. Se necesita el consentimiento de todos los participantes.';
 const {data:myConsent}=await sb.from('member_group_video_recording_consents').select('consented').eq('room_id',room.id).eq('user_id',userId).maybeSingle();consent.checked=!!myConsent?.consented;
 const recordBtn=document.createElement('button');recordBtn.type='button';recordBtn.textContent='⏺️ Grabar mi cámara (archivo local)';
 const groupRecordBtn=document.createElement('button');groupRecordBtn.type='button';groupRecordBtn.textContent='🎥 Grabar videollamada completa (vista de esta sala)';
 const saveGroupRecordBtn=document.createElement('button');saveGroupRecordBtn.type='button';saveGroupRecordBtn.textContent='🔒 Guardar grabación en mi biblioteca privada';saveGroupRecordBtn.disabled=true;
 let pendingGroupRecording=null;
 saveGroupRecordBtn.onclick=async()=>{
  const blob=pendingGroupRecording;if(!blob)return;
  if(blob.size>52428800){say('El archivo supera el límite de 50 MB. Conserva la descarga local.');return;}
  if(!confirm('¿Guardar esta grabación en tu biblioteca privada de Supabase? Solo tú podrás acceder a ella.'))return;
  saveGroupRecordBtn.disabled=true;saveGroupRecordBtn.textContent='⏳ Subiendo grabación…';
  const type=blob.type.includes('mp4')?'video/mp4':'video/webm';
  const path=userId+'/'+group.id+'/'+crypto.randomUUID()+(type==='video/mp4'?'.mp4':'.webm');
  try{
   const {error:uploadError}=await sb.storage.from('group-video-recordings').upload(path,blob,{contentType:type,upsert:false});
   if(uploadError)throw uploadError;
   const {error:metaError}=await sb.from('member_group_video_recordings').insert({
    owner_id:userId,group_id:group.id,object_path:path,
    label:'Videollamada · '+new Date().toLocaleDateString('es-ES'),
    content_type:type,size_bytes:blob.size
   });
   if(metaError){await sb.storage.from('group-video-recordings').remove([path]);throw metaError;}
   pendingGroupRecording=null;saveGroupRecordBtn.textContent='✅ Guardado en biblioteca';
   thread.dispatchEvent(new Event('group-video-recording-saved'));
   say('Grabación guardada en tu biblioteca privada.');
  }catch(e){saveGroupRecordBtn.disabled=false;saveGroupRecordBtn.textContent='🔒 Reintentar guardado privado';say('No se pudo guardar la grabación privada: '+e.message);}
 };

 let groupRecorder=null,groupRecordTracks=[],groupRecordCanvas=null,groupRecordTimer=null,groupRecordChunks=[];
 groupRecordBtn.onclick=async()=>{
  if(groupRecorder?.state==='recording'){groupRecorder.stop();return;}
  if(typeof MediaRecorder==='undefined'){say('Este navegador no admite grabaciones.');return;}
  const {data:members,error:membersError}=await sb.from('member_group_video_participants').select('user_id').eq('room_id',room.id);
  const {data:approvals,error:approvalsError}=await sb.from('member_group_video_recording_consents').select('user_id,consented').eq('room_id',room.id);
  if(membersError||approvalsError||!(members||[]).length||(members||[]).some(m=>!(approvals||[]).some(a=>a.user_id===m.user_id&&a.consented))){say('Todos los participantes deben autorizar la grabación antes de comenzar.');return;}
  try{
   groupRecordCanvas=document.createElement('canvas');groupRecordCanvas.width=1280;groupRecordCanvas.height=720;const ctx=groupRecordCanvas.getContext('2d');
   const paint=()=>{const feeds=[local,...[...peers.values()].map(p=>p.video)];ctx.fillStyle='#101022';ctx.fillRect(0,0,1280,720);const cols=Math.ceil(Math.sqrt(feeds.length)),rows=Math.ceil(feeds.length/cols),w=1280/cols,h=720/rows;feeds.forEach((v,i)=>{if(v.readyState>=2){try{ctx.drawImage(v,(i%cols)*w,Math.floor(i/cols)*h,w,h);}catch(_){}}});};
   paint();groupRecordTimer=setInterval(paint,100);
   const captured=groupRecordCanvas.captureStream(10);groupRecordTracks=[...captured.getTracks()];
   const audioCtx=new AudioContext(),destination=audioCtx.createMediaStreamDestination();
   const audioStreams=[stream,...[...peers.values()].map(p=>p.video.srcObject).filter(Boolean)];
   for(const audioStream of audioStreams){if(audioStream.getAudioTracks?.().length){const src=audioCtx.createMediaStreamSource(audioStream);src.connect(destination);}}
   groupRecordTracks.push(...destination.stream.getAudioTracks());
   const combined=new MediaStream(groupRecordTracks);
   const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported?.(t));
   groupRecorder=new MediaRecorder(combined,mime?{mimeType:mime}:undefined);groupRecordChunks=[];
   groupRecorder.ondataavailable=e=>{if(e.data.size)groupRecordChunks.push(e.data);};
   groupRecorder.onstop=()=>{
    clearInterval(groupRecordTimer);groupRecordTracks.forEach(t=>t.stop());audioCtx.close().catch(()=>{});
    groupRecordBtn.textContent='🎥 Grabar videollamada completa (vista de esta sala)';
    if(groupRecordChunks.length){
     const blob=new Blob(groupRecordChunks,{type:groupRecorder.mimeType||'video/webm'});
     pendingGroupRecording=blob;saveGroupRecordBtn.disabled=false;saveGroupRecordBtn.textContent='🔒 Guardar grabación en mi biblioteca privada';
     const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
     link.download='shadowsbyte-grupo-'+Date.now()+(groupRecorder.mimeType?.includes('mp4')?'.mp4':'.webm');
     link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
     say('Grabación descargada. También puedes guardarla en tu biblioteca privada antes de salir.');
    }
   };
   groupRecorder.start(1000);groupRecordBtn.textContent='⏹️ Detener grabación grupal';say('Grabación grupal local iniciada con consentimiento. Se descargará al detenerla.');
  }catch(e){clearInterval(groupRecordTimer);groupRecordTracks.forEach(t=>t.stop());say('No se pudo grabar la sala: '+e.message);}
 };

 let recorder=null,recordChunks=[],recordStream=null,recordingMembers='',recordStart=0;
 const stopRecording=()=>{if(recorder?.state==='recording')recorder.stop();};
 recordBtn.onclick=async()=>{
  if(recorder?.state==='recording'){stopRecording();return;}
  if(typeof MediaRecorder==='undefined'){say('Este navegador no admite grabaciones.');return;}
  const {data:members,error:membersError}=await sb.from('member_group_video_participants').select('user_id').eq('room_id',room.id);
  const {data:consents,error:consentsError}=await sb.from('member_group_video_recording_consents').select('user_id,consented').eq('room_id',room.id);
  if(membersError||consentsError){say('No se pudieron comprobar los consentimientos.');return;}
  const ids=(members||[]).map(m=>m.user_id);
  const pending=ids.filter(id=>!(consents||[]).some(c=>c.user_id===id&&c.consented));
  if(!ids.length||pending.length){const names=pending.map(id=>id===userId?'tú':profileMap.get(id)?.display_name||profileMap.get(id)?.username||'otro participante').join(', ');const msg='No se puede grabar. Falta consentimiento de: '+(names||'participantes de la sala')+'. Cada persona debe marcar su casilla.';recordingStatus.textContent=msg;say(msg);return;}
  try{
   recordStream=new MediaStream(stream.getTracks());recordChunks=[];
   const mime=['video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported?.(t));
   recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:undefined);
   recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data);};
   recorder.onstop=()=>{if(recordChunks.length){const blob=new Blob(recordChunks,{type:recorder.mimeType||'video/webm'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='shadowsbyte-video-'+Date.now()+(recorder.mimeType?.includes('mp4')?'.mp4':'.webm');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}recordBtn.textContent='⏺️ Grabar mi cámara (archivo local)';recordingStatus.textContent='Grabación finalizada. Archivo local generado.';recordStream=null;};
   recorder.start(1000);recordStart=Date.now();recordingMembers=ids.slice().sort().join(',');recordBtn.textContent='⏹️ Detener grabación';recordingStatus.textContent='🔴 Grabando únicamente tu cámara y micrófono en este navegador.';
  }catch(e){recordingStatus.textContent='No se pudo grabar: '+e.message;say('No se pudo grabar: '+e.message);}
 };
 extras.append(extrasTitle,filterBar,stickerBar,reactionBar,roleStatus,consentLabel,recordBtn,groupRecordBtn,saveGroupRecordBtn,recordingStatus);
 if(room.created_by===userId){
  const cohostSelect=document.createElement('select');cohostSelect.setAttribute('aria-label','Seleccionar coanfitrión');
  const grant=document.createElement('button');grant.type='button';grant.textContent='👑 Nombrar coanfitrión';
  const revoke=document.createElement('button');revoke.type='button';revoke.textContent='Quitar coanfitrión';
  const setCohost=async enabled=>{if(!cohostSelect.value)return;const {error}=await sb.rpc('set_group_video_cohost',{p_room_id:room.id,p_target_id:cohostSelect.value,p_enabled:enabled});say(error?'No se pudo cambiar el rol: '+error.message:enabled?'Coanfitrión asignado.':'Coanfitrión retirado.');};
  grant.onclick=()=>setCohost(true);revoke.onclick=()=>setCohost(false);
  extras.append(cohostSelect,grant,revoke);
  extras.refreshCohost=ids=>{const selected=cohostSelect.value;cohostSelect.replaceChildren();for(const id of ids){if(id===userId)continue;const option=document.createElement('option');option.value=id;option.textContent=profileMap.get(id)?.display_name||profileMap.get(id)?.username||'Miembro';cohostSelect.append(option);}if([...cohostSelect.options].some(o=>o.value===selected))cohostSelect.value=selected;};
 }
 const mic=document.createElement('button');mic.type='button';mic.textContent='🎙️ Silenciar';
 mic.onclick=()=>{const track=stream.getAudioTracks()[0];if(track){track.enabled=!track.enabled;mic.textContent=track.enabled?'🎙️ Silenciar':'🔇 Activar micrófono';}};
 const camera=document.createElement('button');camera.type='button';camera.textContent='📷 Apagar cámara';
 camera.onclick=()=>{const track=stream.getVideoTracks()[0];if(track){track.enabled=!track.enabled;camera.textContent=track.enabled?'📷 Apagar cámara':'📷 Encender cámara';}};
 const share=document.createElement('button');share.type='button';share.textContent='🖥️ Compartir pantalla';
 const leave=document.createElement('button');leave.type='button';leave.textContent='🔴 Salir de la sala';
 actions.append(mic,camera,share,leave);
 actions.append(voiceIndicatorControls);panel.append(title,mediaSettings,videos,participantPanel,actions,invites,moderator,accessPanel,activity,extras);thread.prepend(panel);
 // Start rewards in the background after the room UI is visible.
 loadVideoSettingsInBackground().catch(e=>console.warn('Recompensas de vídeo:',e));
 const viewBar=document.createElement('div');viewBar.className='group-call-actions';
 const gridView=document.createElement('button');gridView.textContent='▦ Cuadrícula';
 const focusView=document.createElement('button');focusView.textContent='▣ Destacar vídeo';
 const fullView=document.createElement('button');fullView.textContent='⛶ Pantalla completa';
 const shareStatus=document.createElement('p');shareStatus.textContent='Nadie comparte pantalla';
 gridView.onclick=()=>{videos.classList.remove('group-video-focus');};
 focusView.onclick=()=>{videos.classList.add('group-video-focus');};
 fullView.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else panel.requestFullscreen?.().catch(e=>say('Pantalla completa: '+e.message));};
 viewBar.append(gridView,focusView,fullView);panel.insertBefore(viewBar,videos);panel.insertBefore(shareStatus,actions);
 let lastSignal=0,busy=false,screenStream=null,originalVideo=null,closed=false;
 const connectionPanel=document.createElement('div');connectionPanel.className='group-video-connection-health';
 const qualityTitle=document.createElement('strong');qualityTitle.textContent='📶 Diagnóstico de conexión';
 const qualityStatus=document.createElement('span');qualityStatus.textContent='Esperando participantes…';
 const checkQualityButton=document.createElement('button');checkQualityButton.type='button';checkQualityButton.textContent='🔄 Comprobar conexión';
 connectionPanel.append(qualityTitle,qualityStatus,checkQualityButton);
 panel.insertBefore(connectionPanel,actions);
 let lastHealthScan=0;
 async function checkVideoConnection(){
  const connected=[...peers.values()].filter(p=>p.pc.connectionState==='connected');
  const failed=[...peers.values()].filter(p=>['failed','disconnected','closed'].includes(p.pc.connectionState));
  if(!peers.size){qualityStatus.textContent='Esperando a otros participantes. La cámara local está activa.';return;}
  let rttSum=0,rttCount=0;
  await Promise.all(connected.map(async peer=>{
   try{
    const stats=await peer.pc.getStats();
    stats.forEach(report=>{
     if(report.type==='candidate-pair'&&report.state==='succeeded'&&(report.nominated||report.selected)&&Number.isFinite(report.currentRoundTripTime)){
      rttSum+=report.currentRoundTripTime*1000;rttCount++;
     }
    });
   }catch(e){console.warn('Estadísticas de videollamada:',e.message);}
  }));
  const latency=rttCount?' · latencia media '+Math.round(rttSum/rttCount)+' ms':'';
  const waitingForMedia=connected.filter(p=>p.video.readyState<2).length;
  qualityStatus.textContent=connected.length+' de '+peers.size+' conexiones activas'+latency+(waitingForMedia?' · '+waitingForMedia+' esperando imagen':'')+(failed.length?' · ⚠️ '+failed.length+' desconectada(s). Pulsa Reintentar conexión junto al vídeo.':'');
 }
 checkQualityButton.onclick=()=>{checkQualityButton.disabled=true;checkVideoConnection().finally(()=>{checkQualityButton.disabled=false;});};
 const healthTimer=setInterval(()=>{if(closed)return;checkVideoConnection().catch(console.warn);},12000);

 const sendSignal=async(to,signal)=>{
  const {error}=await sb.from('member_group_video_signals')
   .insert({room_id:room.id,sender_id:userId,recipient_id:to,signal});
  if(error){
   console.warn('Señal de vídeo:',error.message);
   if(['offer','answer','reconnect_request'].includes(signal.type)){
    qualityStatus.textContent='⚠️ No se ha podido intercambiar la señal WebRTC: '+error.message;
    say('La conexión de vídeo no pudo negociar la señal: '+error.message);
   }
   return false;
  }
  return true;
 };
 const createPeer=(other)=>{
  if(peers.has(other))return peers.get(other);
  const pc=new RTCPeerConnection({iceServers:[
   {urls:'stun:stun.l.google.com:19302'},
   {urls:'stun:stun1.l.google.com:19302'}
  ]});
  const outbound=new MediaStream([activeVideoTrack(),...stream.getAudioTracks()].filter(Boolean));
  outbound.getTracks().forEach(track=>pc.addTrack(track,outbound));
  const video=document.createElement('video');
  video.autoplay=true;video.playsInline=true;video.controls=true;
  // Muted autoplay prevents browsers from silently blocking remote playback.
  // The user can enable remote audio with an explicit gesture.
  video.muted=true;video.defaultMuted=true;video.setAttribute('muted','');
  const tile=videoTile(other,video);
  video.addEventListener('loadedmetadata',()=>monitorVoice(other,video.srcObject));
  video.addEventListener('playing',()=>monitorVoice(other,video.srcObject));
  const videoState=document.createElement('p');
  videoState.className='group-video-peer-state';
  videoState.textContent='⏳ Conectando cámara y micrófono…';
  videoState.setAttribute('role','status');
  const peerButtons=document.createElement('div');peerButtons.className='group-video-peer-buttons';
  const audioButton=document.createElement('button');audioButton.type='button';
  audioButton.textContent='🔊 Activar sonido';
  audioButton.onclick=async()=>{
   const enable=video.muted;
   video.muted=!enable;video.defaultMuted=!enable;
   if(enable){
    video.removeAttribute('muted');
    try{
     if(video.srcObject)await video.play();
     audioButton.textContent='🔈 Silenciar sonido';
     videoState.textContent=video.readyState>=2?'✅ Vídeo y sonido activados':'🔊 Sonido activado; esperando imagen remota…';
    }catch(e){
     video.muted=true;video.defaultMuted=true;video.setAttribute('muted','');
     audioButton.textContent='🔊 Intentar activar sonido';
     videoState.textContent='No se pudo activar el sonido: '+e.message+'. Comprueba el permiso del navegador.';
    }
   }else{
    video.setAttribute('muted','');
    audioButton.textContent='🔊 Activar sonido';
    videoState.textContent='🔇 Sonido silenciado. El vídeo puede seguir reproduciéndose.';
   }
  };
  const retryButton=document.createElement('button');retryButton.type='button';
  retryButton.textContent='🔄 Reintentar conexión';
  retryButton.onclick=async()=>{
   retryButton.disabled=true;
   videoState.textContent='🔄 Reiniciando la conexión con el participante…';
   try{await retryVideoPeer(other);}
   catch(e){videoState.textContent='⚠️ No se pudo reintentar: '+e.message;}
   finally{retryButton.disabled=false;}
  };
  peerButtons.append(audioButton,retryButton);
  tile.append(videoState,peerButtons);
  const peer={pc,video,tile,pending:[],videoState,autoRetried:false,retryTimeout:null};
  peers.set(other,peer);
  const playRemote=()=>{
   if(!video.srcObject)return;
   video.play().catch(e=>{
    if(e.name==='NotAllowedError')videoState.textContent='▶️ El navegador bloqueó la reproducción: pulsa reproducir en el vídeo o Activar sonido.';
    else videoState.textContent='⚠️ Error al reproducir vídeo: '+e.message;
   });
  };
  pc.ontrack=e=>{
   if(e.streams?.[0])video.srcObject=e.streams[0];
   else{
    let media=video.srcObject;
    if(!(media instanceof MediaStream)){media=new MediaStream();video.srcObject=media;}
    if(!media.getTracks().some(t=>t.id===e.track.id))media.addTrack(e.track);
   }
   e.track.addEventListener('unmute',playRemote);
   playRemote();
  };
  video.addEventListener('loadedmetadata',playRemote);
  video.addEventListener('playing',()=>{
   videoState.textContent=video.muted?'✅ Vídeo conectado · pulsa Activar sonido para escuchar':'✅ Vídeo y sonido conectados';
  });
  pc.onicecandidate=e=>{
   if(e.candidate)sendSignal(other,{type:'ice',candidate:e.candidate.toJSON()}).catch(err=>console.warn('ICE:',err));
  };
  const showConnectionState=()=>{
   if(closed||!tile.isConnected)return;
   const state=pc.connectionState,ice=pc.iceConnectionState;
   if(state==='connected'){
    videoState.textContent=video.readyState>=2?
     (video.muted?'✅ Conexión establecida · activa el sonido para escuchar':'✅ Conexión de audio y vídeo establecida'):
     '🟢 Conexión establecida; esperando imagen del otro participante. Comprueba su cámara.';
   }else if(state==='failed'||ice==='failed'){
    videoState.textContent='⚠️ No se pudo establecer la conexión directa. Pulsa Reintentar conexión. Si persiste, puede necesitarse un servidor TURN.';
    if(userId>other&&!peer.autoRetried){
     peer.autoRetried=true;
     peer.retryTimeout=setTimeout(()=>{
      if(!closed&&peers.get(other)===peer)retryVideoPeer(other).catch(err=>console.warn('Reintento ICE:',err));
     },2000);
    }
   }else if(state==='disconnected'){
    videoState.textContent='⚠️ Se ha perdido la conexión; pulsa Reintentar conexión.';
   }else if(state==='connecting'||ice==='checking'){
    videoState.textContent='⏳ Negociando conexión de vídeo…';
   }
  };
  pc.onconnectionstatechange=showConnectionState;
  pc.oniceconnectionstatechange=showConnectionState;
  peer.retryTimeout=setTimeout(()=>{
   if(!closed&&peers.get(other)===peer&&pc.connectionState!=='connected'){
    videoState.textContent='⏳ El vídeo tarda en conectar. Pulsa Reintentar conexión; si estáis en redes diferentes, puede ser necesario TURN.';
   }
  },18000);
  tile.addEventListener('click',event=>{
   if(event.target.closest('button')||event.target.closest('video'))return;
   for(const node of videos.children)node.classList.remove('group-video-featured');
   tile.classList.add('group-video-featured');videos.classList.add('group-video-focus');
  });
  return peer;
 };
 async function offerPeer(other,iceRestart=false){
  const peer=createPeer(other),pc=peer.pc;
  if(pc.signalingState!=='stable'||pc.connectionState==='closed')return;
  const offer=await pc.createOffer(iceRestart?{iceRestart:true}:undefined);
  await pc.setLocalDescription(offer);
  await sendSignal(other,{type:'offer',sdp:pc.localDescription.toJSON()});
 }
 async function retryVideoPeer(other){
  const peer=peers.get(other);
  if(!peer||peer.pc.connectionState==='closed')return;
  if(userId>other){
   if(peer.pc.signalingState==='stable')await offerPeer(other,true);
   else peer.videoState.textContent='⏳ Esperando a que finalice la negociación actual para reintentar.';
  }else{
   await sendSignal(other,{type:'reconnect_request'});
   peer.videoState.textContent='🔄 Solicitud de reconexión enviada; esperando respuesta.';
  }
 }
 async function handleSignal(row){
  const other=row.sender_id,msg=row.signal;if(!msg||!other)return;
  if(msg.type==='screen'){
   shareStatus.textContent=msg.active?'🖥️ '+(profileMap.get(other)?.display_name||'Un participante')+' está compartiendo pantalla':'Nadie comparte pantalla';
   return;
  }
  if(msg.type==='reconnect_request'){
   if(userId>other)await retryVideoPeer(other);
   return;
  }
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
   for(const c of peer.pending.splice(0)){
    try{await pc.addIceCandidate(new RTCIceCandidate(c));}
    catch(e){console.warn('Candidato ICE descartado:',e.message);}
   }
  }
 }
 async function tick(){
  if(busy||closed)return;busy=true;
  try{
   const {data:roomState}=await sb.from('member_group_video_rooms').select('status').eq('id',room.id).maybeSingle();
   if(!roomState||roomState.status!=='open'){say('La sala de vídeo se ha cerrado.');await leaveRoom();return;}
   const {data:participants}=await sb.from('member_group_video_participants').select('user_id,anime_theme').eq('room_id',room.id);
   const active=new Set((participants||[]).map(p=>p.user_id));
   if(Date.now()>lastVideoBadgeRefresh){
    lastVideoBadgeRefresh=Date.now()+12000;
    refreshVideoBadges(active).catch(console.warn);
   }
   for(const p of participants||[])participantThemes.set(p.user_id,p.anime_theme||'none');
   for(const id of participantThemes.keys())if(!active.has(id))participantThemes.delete(id);
   renderVideoParticipants(active);
   if(!active.has(userId)){say('Un moderador te ha retirado de la sala.');await leaveRoom();return;}
   inviteSelect.replaceChildren();for(const [id,p] of profileMap){if(id===userId||active.has(id))continue;const o=document.createElement('option');o.value=id;o.textContent=p.display_name||p.username||'Miembro';inviteSelect.append(o);}
   if(moderator.refresh){moderator.refresh(active);moderator.refreshMute(active);await moderator.refreshBlocked();}
   if(extras.refreshCohost)extras.refreshCohost(active);
   if(Date.now()>(refreshAnalyticsAt||0)){refreshAnalyticsAt=Date.now()+12000;refreshInviteReplies().catch(console.warn);refreshAttendanceStats().catch(console.warn);}
   if(accessPanel.refresh)await accessPanel.refresh();
   for(const [id,peer] of peers)if(!active.has(id)){clearTimeout(peer.retryTimeout);peer.pc.close();peer.tile.remove();peers.delete(id);}
   // Only the newer participant creates offers, avoiding simultaneous negotiation.
   for(const p of participants||[])if(p.user_id!==userId&&!peers.has(p.user_id)&&userId>p.user_id)await offerPeer(p.user_id);
   const {data:events,error:eventsError}=await sb.from('member_group_video_activity').select('id,user_id,kind,target_id,body').eq('room_id',room.id).gt('id',activityCursor).order('id').limit(100);
   if(!eventsError)for(const ev of events||[]){
    activityCursor=ev.id;
    const who=profileMap.get(ev.user_id)?.display_name||profileMap.get(ev.user_id)?.username||'Miembro';
    if(ev.kind==='mute_request'&&ev.target_id===userId){say(who+' te solicita silenciar el micrófono.');}
    const line=document.createElement('p');
    if(ev.kind==='reaction')line.textContent=who+' reaccionó '+ev.body;
    else if(ev.kind==='message')line.textContent=who+': '+ev.body;
    else if(ev.kind==='hand')line.textContent=who+(ev.body==='up'?' ✋ ha levantado la mano':' ha bajado la mano');
    else if(ev.kind==='mute_request')line.textContent=who+' ha solicitado silenciar a '+(profileMap.get(ev.target_id)?.display_name||'un participante');
    if(ev.kind==='reaction')animateReaction(ev.body);activityLog.append(line);while(activityLog.children.length>60)activityLog.firstElementChild.remove();
    activityLog.scrollTop=activityLog.scrollHeight;
   }
   const {data:cohosts}=await sb.from('member_group_video_cohosts').select('user_id').eq('room_id',room.id);
   const isCohost=(cohosts||[]).some(c=>c.user_id===userId);
   roleStatus.textContent=room.created_by===userId?'👑 Eres el anfitrión':isCohost?'👑 Eres coanfitrión — puedes moderar la sala':'Participante de la sala';
   if(isCohost&&!canModerate)roleStatus.textContent+=' (sal y vuelve a entrar para activar los controles)';
   if(groupRecorder?.state==='recording'){
    const {data:approvals}=await sb.from('member_group_video_recording_consents').select('user_id,consented').eq('room_id',room.id);
    if([...active].some(id=>!(approvals||[]).some(a=>a.user_id===id&&a.consented))){groupRecorder.stop();say('Grabación grupal detenida: falta consentimiento de un participante.');}
   }
   if(recorder?.state==='recording'){
    recordingStatus.textContent='🔴 Grabando tu cámara y micrófono · '+Math.floor((Date.now()-recordStart)/60000)+' min '+String(Math.floor((Date.now()-recordStart)/1000)%60).padStart(2,'0')+' s';
    const {data:approvals}=await sb.from('member_group_video_recording_consents').select('user_id,consented').eq('room_id',room.id);
    if([...active].sort().join(',')!==recordingMembers||[...active].some(id=>!(approvals||[]).some(c=>c.user_id===id&&c.consented))){stopRecording();say('Grabación detenida: cambió la participación o el consentimiento.');}
   }
   const {data:signals,error:signalsError}=await sb.from('member_group_video_signals').select('id,sender_id,signal').eq('room_id',room.id).eq('recipient_id',userId).gt('id',lastSignal).order('id').limit(100);
   if(signalsError){qualityStatus.textContent='⚠️ No se pueden recibir señales WebRTC: '+signalsError.message;return;}
   for(const row of signals||[]){lastSignal=row.id;try{await handleSignal(row);}catch(e){console.warn('Señal WebRTC:',e.message);qualityStatus.textContent='⚠️ Error al negociar vídeo. Prueba Reintentar conexión: '+e.message;}}
  }catch(e){console.warn('Sala de vídeo:',e.message);}finally{busy=false;}
 }
 async function stopShare(){
  if(!screenStream)return;
  for(const {pc} of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(originalVideo);}
  screenStream.getTracks().forEach(t=>t.stop());screenStream=null;originalVideo=null;local.srcObject=stream;share.textContent='🖥️ Compartir pantalla';shareStatus.textContent='Nadie comparte pantalla';for(const id of peers.keys())sendSignal(id,{type:'screen',active:false});
 }
 share.onclick=async()=>{
  if(screenStream){await stopShare();return;}
  try{
   const display=await navigator.mediaDevices.getDisplayMedia({video:true});
   screenStream=display;originalVideo=activeVideoTrack();
   for(const {pc} of peers.values()){const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)await sender.replaceTrack(display.getVideoTracks()[0]);}
   local.srcObject=display;share.textContent='🛑 Dejar de compartir';shareStatus.textContent='🖥️ Estás compartiendo pantalla';for(const id of peers.keys())sendSignal(id,{type:'screen',active:true});
   display.getVideoTracks()[0].onended=()=>stopShare().catch(console.warn);
  }catch(e){say('No se pudo compartir pantalla: '+e.message);}
 };
 async function leaveRoom(){
  if(closed)return;closed=true;clearInterval(healthTimer);animeBackgroundRequest++;animeBackgroundController?.stop();stopRecording();if(groupRecorder?.state==='recording')groupRecorder.stop();clearInterval(session.timer);
  for(const {pc,tile,retryTimeout} of peers.values()){clearTimeout(retryTimeout);pc.close();tile.remove();}
  screenStream?.getTracks().forEach(t=>t.stop());stream.getTracks().forEach(t=>t.stop());
  await sb.from('member_group_video_participants').delete().eq('room_id',room.id).eq('user_id',userId);
  if(room.created_by===userId)await sb.from('member_group_video_rooms').update({status:'closed'}).eq('id',room.id);
  clearInterval(voiceIndicatorTimer);for(const m of videoAudioMonitors.values())m.source.disconnect();videoAudioMonitors.clear();voiceContext?.close().catch(()=>{});
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
 if(groupCallSession||multiVideoSession||privateDirectCallSession){say('Finaliza la llamada actual antes de iniciar otra.');return;}
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

function setupGroupVideoCalendar(userId,section,say){
 const panel=document.createElement('section');panel.className='group-video-calendar group-video-activity';
 const heading=document.createElement('h4');heading.textContent='📆 Calendario de videollamadas de mis grupos';
 const intro=document.createElement('p');intro.textContent='Consulta reuniones de todos los grupos a los que perteneces. Los recordatorios se generan automáticamente 15 minutos antes; se mostrarán aquí al abrir la web.';
 const month=document.createElement('input');month.type='month';month.setAttribute('aria-label','Mes del calendario');
 const today=new Date();month.value=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
 const grid=document.createElement('div');grid.className='group-video-calendar-grid';
 const list=document.createElement('div');list.className='group-video-calendar-events';
 const reminderTitle=document.createElement('h5');reminderTitle.textContent='🔔 Recordatorios de próximas videollamadas';
 const reminderList=document.createElement('div');reminderList.className='group-video-reminder-list';reminderList.setAttribute('aria-live','polite');
 const shownNotices=new Set();
 const reload=document.createElement('button');reload.type='button';reload.textContent='🔄 Actualizar calendario';
 let events=[];
 const drawEvents=(selectedDay=null)=>{
  list.replaceChildren();
  const shown=events.filter(e=>!selectedDay||new Date(e.starts_at).getDate()===selectedDay);
  if(!shown.length){list.textContent='No hay videollamadas programadas'+(selectedDay?' para este día.':' en este mes.');return;}
  for(const e of shown){
   const row=document.createElement('div');row.className='group-video-calendar-event';
   const label=document.createElement('span');label.textContent='📹 '+e.title+' · '+new Date(e.starts_at).toLocaleString('es-ES')+' · '+(e.groupName||'Grupo');
   row.append(label);
   if(e.created_by===userId){
    const remove=document.createElement('button');remove.type='button';remove.textContent='Cancelar';
    remove.onclick=async()=>{
     if(!confirm('¿Cancelar esta videollamada programada?'))return;
     const {error}=await sb.from('member_group_video_schedules').delete().eq('id',e.id).eq('created_by',userId);
     if(error){say('No se pudo cancelar: '+error.message);return;}
     say('Videollamada programada cancelada.');await loadCalendar();
    };
    row.append(remove);
   }
   list.append(row);
  }
 };
 const loadCalendar=async()=>{
  const [yy,mm]=month.value.split('-').map(Number);if(!yy||!mm)return;
  const begin=new Date(yy,mm-1,1),end=new Date(yy,mm,1);
  const {data,error}=await sb.from('member_group_video_schedules').select('id,title,group_id,starts_at,created_by')
   .gte('starts_at',begin.toISOString()).lt('starts_at',end.toISOString()).order('starts_at').limit(250);
  if(error){list.textContent='No se pudo abrir el calendario: '+error.message;return;}
  const ids=[...new Set((data||[]).map(e=>e.group_id))];
  const {data:groups}=ids.length?await sb.from('member_chat_groups').select('id,name').in('id',ids):{data:[]};
  const names=new Map((groups||[]).map(g=>[g.id,g.name]));
  events=(data||[]).map(e=>({...e,groupName:names.get(e.group_id)||'Grupo'}));
  grid.replaceChildren();
  for(const name of ['L','M','X','J','V','S','D']){const head=document.createElement('span');head.className='group-video-calendar-weekday';head.textContent=name;grid.append(head);}
  const offset=(begin.getDay()+6)%7;
  for(let k=0;k<offset;k++){const blank=document.createElement('span');blank.className='group-video-calendar-empty';grid.append(blank);}
  const days=new Date(yy,mm,0).getDate();
  for(let d=1;d<=days;d++){
   const day=document.createElement('button');day.type='button';day.className='group-video-calendar-day';
   const count=events.filter(e=>{const dt=new Date(e.starts_at);return dt.getFullYear()===yy&&dt.getMonth()===mm-1&&dt.getDate()===d;}).length;
   day.textContent=String(d)+(count?' · '+count:'');
   day.setAttribute('aria-label',d+' del '+mm+': '+count+' videollamadas');
   if(count)day.classList.add('has-events');
   day.onclick=()=>{for(const b of grid.querySelectorAll('button'))b.classList.remove('selected');day.classList.add('selected');drawEvents(d);};
   grid.append(day);
  }
  drawEvents();
 };
 const loadReminders=async()=>{
  const {data:reminders,error}=await sb.from('member_group_video_reminders').select('id,schedule_id,created_at')
   .is('seen_at',null).order('created_at',{ascending:false}).limit(25);
  if(error){reminderList.textContent='No se pudieron cargar los recordatorios: '+error.message;return;}
  const ids=[...new Set((reminders||[]).map(r=>r.schedule_id))];
  const {data:schedules}=ids.length?await sb.from('member_group_video_schedules').select('id,title,starts_at').in('id',ids):{data:[]};
  const map=new Map((schedules||[]).map(e=>[e.id,e]));
  reminderList.replaceChildren();
  if(!reminders?.length){reminderList.textContent='No tienes recordatorios pendientes.';return;}
  for(const reminder of reminders){
   const event=map.get(reminder.schedule_id);if(!event)continue;
   const message='📹 '+event.title+' · '+new Date(event.starts_at).toLocaleString('es-ES');
   const item=document.createElement('div');item.className='group-video-calendar-event';
   const label=document.createElement('span');label.textContent=(new Date(event.starts_at).getTime()>Date.now()?'🔔 Próxima videollamada: ':'🔔 Recordatorio pendiente: ')+message;
   const mark=document.createElement('button');mark.type='button';mark.textContent='Visto';
   mark.onclick=async()=>{
    const {error:readError}=await sb.from('member_group_video_reminders').update({seen_at:new Date().toISOString()}).eq('id',reminder.id).eq('user_id',userId);
    if(readError){say('No se pudo marcar el recordatorio: '+readError.message);return;}
    item.remove();if(!reminderList.children.length)reminderList.textContent='No tienes recordatorios pendientes.';
   };
   item.append(label,mark);reminderList.append(item);
   if(!shownNotices.has(reminder.id)){
    shownNotices.add(reminder.id);
    if(new Date(event.starts_at).getTime()>Date.now()&&document.hidden&&'Notification'in window&&Notification.permission==='granted'){
     try{new Notification('🔔 Videollamada en 15 minutos',{body:message});}catch(_){}
    }
   }
  }
 };
 month.onchange=loadCalendar;reload.onclick=()=>{loadCalendar();loadReminders();};
 panel.append(heading,intro,month,reload,grid,list,reminderTitle,reminderList);
 const before=section.querySelector('#group-chat-thread');before.parentElement.insertBefore(panel,before);
 loadCalendar();loadReminders();
 const timer=setInterval(()=>{if(!section.isConnected){clearInterval(timer);return;}loadReminders();},45000);
 return {refresh:loadCalendar,reminders:loadReminders};
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
 const videoCalendar=setupGroupVideoCalendar(userId,section,say);
 // Global, signed-in invitation inbox: a member need not open the precise group.
 const inviteInbox=document.createElement('section');inviteInbox.className='group-video-global-inbox';inviteInbox.id='group-video-global-inbox';
 const inboxTitle=document.createElement('h4');inboxTitle.textContent='✉️ Mis invitaciones a videollamadas';
 const inboxHelp=document.createElement('p');inboxHelp.textContent='Las invitaciones de cualquier grupo aparecen aquí cuando hay una sala activa.';
 const inboxRefresh=document.createElement('button');inboxRefresh.type='button';inboxRefresh.textContent='🔄 Buscar invitaciones';
 const inboxState=document.createElement('p');inboxState.className='group-video-inbox-status';inboxState.setAttribute('role','status');
 const inboxList=document.createElement('div');inboxList.className='group-video-inbox-list';
 inviteInbox.append(inboxTitle,inboxHelp,inboxRefresh,inboxState,inboxList);
 section.insertBefore(inviteInbox,section.querySelector('#group-chat-list'));
 let inboxBusy=false,inboxLastSnapshot='',inboxActing=false;
 const replyToVideoInvitation=async(invite,value)=>{
  inboxActing=true;
  for(const button of inboxList.querySelectorAll('button'))button.disabled=true;
  try{
   const {data:updated,error}=await sb.from('member_group_video_invites')
    .update({response:value,responded_at:new Date().toISOString()})
    .eq('id',invite.id).eq('invitee_id',userId).eq('response','pending').select('id');
   if(error||!updated?.length){inboxState.textContent='No se pudo responder: '+(error?.message||'La invitación ya fue respondida.');return;}
   inboxState.textContent=value==='accepted'?'✅ Invitación aceptada. Puedes ir al grupo y unirte a la sala.':'Invitación rechazada.';
  }finally{
   inboxActing=false;
   for(const button of inboxList.querySelectorAll('button'))button.disabled=false;
   inboxLastSnapshot='';
   loadGlobalVideoInvites();
  }
 };
 async function loadGlobalVideoInvites(){
  if(!inviteInbox.isConnected||inboxBusy||inboxActing)return;
  inboxBusy=true;
  try{
   const {data:invites,error}=await sb.from('member_group_video_invites')
    .select('id,room_id,created_at,response')
    .eq('invitee_id',userId).in('response',['pending','accepted'])
    .order('created_at',{ascending:false}).limit(80);
   if(error){inboxState.textContent='No se pudieron cargar las invitaciones: '+error.message;return;}
   const ids=[...new Set((invites||[]).map(i=>i.room_id))];
   if(!ids.length){inboxState.textContent='No tienes invitaciones pendientes a salas activas.';inboxList.replaceChildren();inboxLastSnapshot='';return;}
   const {data:rooms,error:roomsError}=await sb.from('member_group_video_rooms')
    .select('id,group_id,created_by,status').in('id',ids).eq('status','open');
   if(roomsError){inboxState.textContent='No se pudieron comprobar las salas: '+roomsError.message;return;}
   const roomMap=new Map((rooms||[]).map(r=>[r.id,r]));
   const active=(invites||[]).filter(i=>roomMap.has(i.room_id));
   const groupIds=[...new Set(active.map(i=>roomMap.get(i.room_id).group_id))];
   const {data:groups,error:groupsError}=groupIds.length?
    await sb.from('member_chat_groups').select('id,name,owner_id').in('id',groupIds):{data:[],error:null};
   if(groupsError){inboxState.textContent='No se pudieron comprobar los grupos: '+groupsError.message;return;}
   const groupMap=new Map((groups||[]).map(g=>[g.id,g]));
   const visible=active.filter(i=>groupMap.has(roomMap.get(i.room_id).group_id));
   const snapshot=JSON.stringify(visible.map(i=>[i.id,i.response,i.room_id]));
   if(snapshot===inboxLastSnapshot)return;
   inboxLastSnapshot=snapshot;inboxList.replaceChildren();
   const pending=visible.filter(i=>i.response==='pending').length;
   inboxState.textContent=pending?'📩 Tienes '+pending+' invitación'+(pending===1?'':'es')+' pendiente'+(pending===1?'':'s')+'.':((invites||[]).some(i=>i.response==='pending')?'No hay invitaciones pendientes en salas abiertas. Las invitaciones de salas finalizadas caducan; solicita una nueva con la sala activa.':'No tienes invitaciones pendientes a salas activas.');
   for(const invite of visible){
    const room=roomMap.get(invite.room_id),group=groupMap.get(room.group_id);
    const item=document.createElement('article');item.className='group-video-inbox-item';
    const description=document.createElement('span');
    description.textContent='📹 '+group.name+' · '+(invite.response==='pending'?'Invitación pendiente':'Invitación aceptada');
    const controls=document.createElement('div');controls.className='group-video-inbox-actions';
    if(invite.response==='pending'){
     for(const [response,label] of [['accepted','✅ Aceptar invitación'],['declined','❌ Rechazar invitación']]){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>replyToVideoInvitation(invite,response);
      controls.append(button);
     }
    }else{
     const join=document.createElement('button');join.type='button';join.textContent='📹 Abrir grupo y unirme';
     join.onclick=async()=>{
      join.disabled=true;
      try{
       await showGroup(group);
       await joinMultiVideoRoom(room,group,userId,thread,say);
      }catch(e){say('No se pudo abrir la videollamada: '+e.message);}
      finally{join.disabled=false;}
     };
     controls.append(join);
    }
    item.append(description,controls);inboxList.append(item);
   }
  }catch(e){
   inboxState.textContent='Error al consultar las invitaciones: '+e.message;
   inboxLastSnapshot='';
  }finally{inboxBusy=false;}
 }
 inboxRefresh.onclick=()=>{inboxLastSnapshot='';loadGlobalVideoInvites();};
 loadGlobalVideoInvites();
 const globalInboxTimer=setInterval(()=>{
  if(!section.isConnected){clearInterval(globalInboxTimer);return;}
  loadGlobalVideoInvites();
 },4000);
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
  showPrivateGroupVideoLibrary(group,userId,thread,say).catch(e=>console.warn('Biblioteca de vídeo:',e));
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
  const inviteNotice=document.createElement('p');inviteNotice.setAttribute('role','status');
  const inviteActions=document.createElement('div');inviteActions.className='group-call-actions group-video-rsvp';
  callControls.append(inviteNotice,inviteActions);
  let inviteRefreshBusy=false;
  async function checkVideoInvites(){
   if(!thread.isConnected||inviteRefreshBusy)return;
   inviteRefreshBusy=true;
   try{
    const {data,error}=await sb.from('member_group_video_invites').select('id,room_id,response,created_at').eq('invitee_id',userId).order('created_at',{ascending:false}).limit(15);
    const {data:open}=await sb.from('member_group_video_rooms').select('id').eq('group_id',group.id).eq('status','open');
    if(!inviteActions.isConnected)return;
    inviteActions.replaceChildren();inviteNotice.textContent='';
    if(error){inviteNotice.textContent='No se pudieron leer las invitaciones: '+error.message;return;}
    const openIds=new Set((open||[]).map(r=>r.id));
    const invitation=(data||[]).find(i=>openIds.has(i.room_id)&&i.response!=='declined');
    if(!invitation)return;
    if(invitation.response==='accepted'){
     inviteNotice.textContent='✅ Invitación aceptada. Puedes solicitar entrar a la sala (se mantienen los permisos de acceso).';
     const join=document.createElement('button');join.type='button';join.textContent='📹 Unirme ahora';
     join.onclick=()=>multiJoin.click();inviteActions.append(join);return;
    }
    inviteNotice.textContent='✉️ Has recibido una invitación a una videollamada grupal.';
    for(const [value,label] of [['accepted','✅ Aceptar invitación'],['declined','❌ Rechazar invitación']]){
     const button=document.createElement('button');button.type='button';button.textContent=label;
     button.onclick=async()=>{
      for(const b of inviteActions.querySelectorAll('button'))b.disabled=true;
      const {data:updated,error:updateError}=await sb.from('member_group_video_invites').update({response:value,responded_at:new Date().toISOString()})
       .eq('id',invitation.id).eq('invitee_id',userId).eq('response','pending').select('id');
      if(updateError||!updated?.length){say('No se pudo responder a la invitación: '+(updateError?.message||'Ya respondida.'));return checkVideoInvites();}
      say(value==='accepted'?'Invitación aceptada. Pulsa Unirme ahora para entrar.':'Invitación rechazada.');
      inviteNotice.textContent=value==='accepted'?'✅ Invitación aceptada.':'Invitación rechazada.';
      inviteActions.replaceChildren();
      if(value==='accepted'){const join=document.createElement('button');join.textContent='📹 Unirme ahora';join.onclick=()=>multiJoin.click();inviteActions.append(join);}
     };inviteActions.append(button);
    }
   }finally{inviteRefreshBusy=false;}
  }
  const inviteTimer=setInterval(()=>{if(!thread.isConnected){clearInterval(inviteTimer);return;}checkVideoInvites();},5000);
  const lobbyControls=document.createElement('div');lobbyControls.className='group-call-actions';
  const lobbyButton=document.createElement('button');lobbyButton.type='button';lobbyButton.textContent='🏠 Activar sala permanente del grupo';
  const lobbyStatus=document.createElement('span');lobbyStatus.textContent='Una sala permanente conserva el acceso del grupo; la cámara solo se activa al entrar.';
  const {data:lobby}=await sb.from('member_group_video_lobbies').select('enabled').eq('group_id',group.id).maybeSingle();
  if(lobby?.enabled){lobbyButton.textContent='🏠 Sala permanente habilitada';lobbyButton.disabled=true;}
  lobbyButton.onclick=async()=>{lobbyButton.disabled=true;const {error}=await sb.from('member_group_video_lobbies').upsert({group_id:group.id,enabled:true},{onConflict:'group_id'});if(error){lobbyButton.disabled=false;say('No se pudo habilitar la sala: '+error.message);}else{lobbyButton.textContent='🏠 Sala permanente habilitada';say('Acceso permanente habilitado. Iniciar/Unirse abre la sesión activa del grupo.');}};
  lobbyControls.append(lobbyButton,lobbyStatus);thread.append(lobbyControls);
  const schedulePanel=document.createElement('section');schedulePanel.className='group-video-activity';
  const scheduleTitle=document.createElement('h5');scheduleTitle.textContent='📅 Programar videollamada';
  const scheduleName=document.createElement('input');scheduleName.placeholder='Título de la videollamada';scheduleName.maxLength=120;
  const scheduleDate=document.createElement('input');scheduleDate.type='datetime-local';scheduleDate.setAttribute('aria-label','Fecha y hora de la videollamada');
  const scheduleSave=document.createElement('button');scheduleSave.type='button';scheduleSave.textContent='📅 Guardar programación';
  const scheduleList=document.createElement('div');
  const refreshSchedule=async()=>{const {data}=await sb.from('member_group_video_schedules').select('id,title,starts_at,created_by').eq('group_id',group.id).gte('starts_at',new Date(Date.now()-3600000).toISOString()).order('starts_at').limit(12);scheduleList.replaceChildren();for(const item of data||[]){const line=document.createElement('p');line.textContent='📅 '+item.title+' · '+new Date(item.starts_at).toLocaleString('es-ES');scheduleList.append(line);}};
  scheduleSave.onclick=async()=>{const starts=new Date(scheduleDate.value);if(!scheduleName.value.trim()||!Number.isFinite(starts.getTime())||starts.getTime()<=Date.now()){say('Indica un título y una fecha futura.');return;}const {error}=await sb.from('member_group_video_schedules').insert({group_id:group.id,created_by:userId,title:scheduleName.value.trim(),starts_at:starts.toISOString()});if(error){say('No se pudo programar: '+error.message);return;}say('Videollamada programada. El calendario de tus grupos mostrará esta reunión y el sistema creará un recordatorio 15 minutos antes.');scheduleName.value='';await refreshSchedule();videoCalendar.refresh();};
  schedulePanel.append(scheduleTitle,scheduleName,scheduleDate,scheduleSave,scheduleList);thread.append(schedulePanel);refreshSchedule();
  multiStart.onclick=async()=>{
   const {data:existing}=await sb.from('member_group_video_rooms').select('*').eq('group_id',group.id).eq('status','open').maybeSingle();
   if(existing){say('Ya hay una sala abierta. Intentando conectarte a ella…');await joinMultiVideoRoom(existing,group,userId,thread,say);return;}
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
  // Consult after controls mount: otherwise an early check is silently discarded.
  checkVideoInvites();
  const incomingCalls=document.createElement('div');incomingCalls.className='group-call-incoming';thread.append(incomingCalls);
  const videoNotices=document.createElement('div');videoNotices.className='group-call-incoming';videoNotices.setAttribute('aria-live','polite');thread.append(videoNotices);
  let notifiedVideoRoom=null;
  const checkVideoRoomNotice=async()=>{
   if(!thread.isConnected||multiVideoSession)return;
   const {data:openRoom}=await sb.from('member_group_video_rooms').select('id,created_by').eq('group_id',group.id).eq('status','open').maybeSingle();
   if(!openRoom){notifiedVideoRoom=null;videoNotices.replaceChildren();return;}
   if(openRoom.created_by===userId){videoNotices.replaceChildren();return;}
   if(notifiedVideoRoom!==openRoom.id){notifiedVideoRoom=openRoom.id;if('Notification'in window&&Notification.permission==='granted'&&document.hidden){new Notification('📹 Videollamada grupal disponible',{body:'Hay una videollamada activa en tu grupo.'});}}
   videoNotices.replaceChildren();
   const msg=document.createElement('span');msg.textContent='📹 Hay una videollamada grupal activa';
   const joinNotice=document.createElement('button');joinNotice.type='button';joinNotice.textContent='Unirse ahora';joinNotice.onclick=()=>joinMultiVideoRoom(openRoom,group,userId,thread,say);
   videoNotices.append(msg,joinNotice);
  };
  const notificationPermission=document.createElement('button');notificationPermission.type='button';notificationPermission.textContent='🔔 Activar avisos de llamadas';
  notificationPermission.onclick=async()=>{if(!('Notification'in window)){say('Este navegador no admite notificaciones.');return;}const result=await Notification.requestPermission();say(result==='granted'?'Avisos activados mientras tengas la web abierta.':'Notificaciones no autorizadas.');};
  thread.append(notificationPermission);
  checkVideoRoomNotice();
  const videoNoticeTimer=setInterval(()=>{if(!thread.isConnected){clearInterval(videoNoticeTimer);return;}checkVideoRoomNotice();},6000);

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
   const {data,error}=await sb.from('member_chat_group_messages').select('id,sender_id,body,created_at,edited_at,deleted_at,image_path,audio_path,view_once').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100);
   if(currentGroup?.id!==group.id||!messages.isConnected)return;
   messages.replaceChildren();
   if(error){messages.textContent='No se pudieron cargar los mensajes.';return;}
   const ids=[...new Set((data||[]).map(m=>m.sender_id))];
   const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
   const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
   const onceIds=(data||[]).filter(m=>m.view_once&&m.image_path).map(m=>m.id);
   const {data:seenRows,error:seenError}=onceIds.length
    ?await sb.from('member_chat_group_message_views').select('message_id').eq('user_id',userId).in('message_id',onceIds)
    :{data:[],error:null};
   if(seenError)console.warn('Vistas de imágenes grupales:',seenError.message);
   const seenOnceIds=new Set((seenRows||[]).map(row=>row.message_id));
   for(const m of data||[]){
    const item=document.createElement('p');const name=document.createElement('strong');name.textContent=(m.sender_id===userId?'Tú':names.get(m.sender_id)||'Miembro')+': ';const body=document.createElement('span');renderChatSpoilerText(body,m.body);const time=document.createElement('small');time.textContent=' · '+new Date(m.created_at).toLocaleString('es-ES');item.append(name,body,time);
    if(!m.deleted_at&&m.view_once&&m.image_path){
     const once=document.createElement('div');once.className='chat-view-once-message';
     if(m.sender_id===userId){once.textContent='👁️ Imagen de una sola vista enviada';}
     else if(seenOnceIds.has(m.id)){once.textContent='✓ Imagen vista · no disponible';}
     else{
      const open=document.createElement('button');open.type='button';open.className='chat-view-once-open';
      open.textContent='👁️ Abrir imagen · una sola vista';
      open.onclick=()=>openOneTimeChatPhoto('group',m.id,open,refresh);
      once.append(open);
     }
     item.append(once);
    }else if(!m.deleted_at&&(m.image_path||m.audio_path)){
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
  const onceLabel=document.createElement('label');onceLabel.className='chat-view-once-option';
  const onceInput=document.createElement('input');onceInput.type='checkbox';onceInput.disabled=true;
  onceLabel.append(onceInput,document.createTextNode(' 👁️ Imagen de una sola vista'));
  const updateOnceOption=()=>{
   const chosen=recordedFile||upload.files?.[0];
   const isImage=!!chosen?.type.startsWith('image/');
   onceInput.disabled=!isImage;if(!isImage)onceInput.checked=false;
  };
  upload.addEventListener('change',updateOnceOption);
  const spoilerToggle=createChatSpoilerToggle();
   const send=document.createElement('button');send.type='submit';send.textContent='Enviar';form.append(record,recordingStatus,input,upload,onceLabel,spoilerToggle,send);
  form.onsubmit=async e=>{e.preventDefault();const body=input.value.trim(),file=recordedFile||upload.files?.[0];if(recorder?.state==='recording'){say('Detén la grabación antes de enviarla.');return;}if(!body&&!file)return;const outgoingBody=chatOutgoingText(body,spoilerToggle);if(outgoingBody.length>2000){say('El texto del spoiler es demasiado largo (máximo 2000 caracteres).');return;}send.disabled=true;
   let image_path=null,audio_path=null,uploadedPath=null,uploadedBucket=null;
   const view_once=!!(file?.type.startsWith('image/')&&onceInput.checked);
   if(file){
    const allowed=['image/jpeg','image/png','image/webp','image/gif','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/x-m4a','audio/3gpp','audio/3gpp2'];
    if(!allowed.includes(file.type)||file.size>(view_once?5242880:10485760)){say(view_once?'La imagen de una sola vista debe ocupar como máximo 5 MB.':'Archivo no permitido o mayor de 10 MB.');send.disabled=false;return;}
    const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','audio/webm':'webm','audio/mp4':'m4a','audio/mpeg':'mp3','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav','audio/aac':'aac','audio/x-m4a':'m4a','audio/3gpp':'3gp','audio/3gpp2':'3g2'})[file.type];
    const path=group.id+'/'+userId+'/'+crypto.randomUUID()+'.'+ext;
    uploadedBucket=view_once?'view-once-chat-images':'member-group-chat';
    const {error:uploadError}=await sb.storage.from(uploadedBucket).upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){say('No se pudo subir el archivo: '+uploadError.message);send.disabled=false;return;}
    uploadedPath=path;
    if(file.type.startsWith('image/'))image_path=path;else audio_path=path;
   }
   const {error}=await sb.from('member_chat_group_messages').insert({group_id:group.id,sender_id:userId,body:outgoingBody||(view_once?'👁️ Imagen de una sola vista':image_path?'📷 Imagen':'🎤 Audio'),image_path,audio_path,view_once});
   send.disabled=false;if(error){if(uploadedPath)await sb.storage.from(uploadedBucket).remove([uploadedPath]);say('No se pudo enviar: '+error.message);}
   else{input.value='';upload.value='';recordedFile=null;recordingStatus.textContent='';onceInput.checked=false;spoilerToggle.setAttribute('aria-pressed','false');spoilerToggle.textContent='🙈 Spoiler';updateOnceOption();refresh();}};
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
   if(document.visibilityState==='visible'&&activeToastPreferences.sound_enabled&&!isNotificationQuietNow())playNotificationSound(activeToastPreferences.message_sound);
   if(currentGroup?.id!==message.group_id)loadGroups();
  }).subscribe();
}
// Private drafts are held only in this tab's memory, never uploaded or saved in storage.
const privateChatDrafts=new Map();
let privateConversationListFilter='';
let privateChatActivityInterval=null;
let privateChatExpiryTimer=null;

function createPrivateVoicePlayer(label='Mensaje de voz'){
 const root=document.createElement('div');root.className='private-voice-player';root.setAttribute('role','group');root.setAttribute('aria-label',label);
 const audio=document.createElement('audio');audio.className='private-chat-audio';audio.preload='metadata';audio.hidden=true;audio.setAttribute('aria-label',label);
 const header=document.createElement('div');header.className='private-voice-player-header';
 const decoration=document.createElement('span');decoration.className='private-voice-player-sigil';decoration.textContent='🎙️';decoration.setAttribute('aria-hidden','true');
 const title=document.createElement('strong');title.textContent=label;
 const bars=document.createElement('span');bars.className='private-voice-player-bars';bars.setAttribute('aria-hidden','true');
 for(let i=0;i<5;i++){bars.append(document.createElement('i'));}
 header.append(decoration,title,bars);
 const controls=document.createElement('div');controls.className='private-voice-player-controls';
 const play=document.createElement('button');play.type='button';play.className='private-voice-player-play';play.textContent='▶';play.disabled=true;play.setAttribute('aria-label','Reproducir '+label);
 const seek=document.createElement('input');seek.type='range';seek.className='private-voice-player-progress';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.disabled=true;seek.style.setProperty('--voice-progress','0%');seek.setAttribute('aria-label','Posición del mensaje de voz');
 const time=document.createElement('small');time.className='private-voice-player-time';time.textContent='0:00 / --:--';
 const rate=document.createElement('button');rate.type='button';rate.className='private-voice-player-speed';rate.textContent='1×';rate.setAttribute('aria-label','Velocidad de reproducción 1×; cambiar velocidad');rate.title='Cambiar velocidad de reproducción';
 const status=document.createElement('small');status.className='private-voice-player-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 controls.append(play,seek,time,rate);
 root.append(header,controls,status,audio);
 let hint=0;
 const formatSeconds=(seconds)=>{
  if(!Number.isFinite(seconds)||seconds<0)return '--:--';
  const total=Math.floor(seconds),hours=Math.floor(total/3600),mins=Math.floor((total%3600)/60),secs=String(total%60).padStart(2,'0');
  return hours?hours+':'+String(mins).padStart(2,'0')+':'+secs:mins+':'+secs;
 };
 const duration=()=>{
  if(Number.isFinite(audio.duration)&&audio.duration>0)return audio.duration;
  if(audio.seekable?.length){const end=audio.seekable.end(audio.seekable.length-1);if(Number.isFinite(end)&&end>0)return end;}
  return hint;
 };
 const update=()=>{
  const length=duration(),position=Number.isFinite(audio.currentTime)?Math.max(0,audio.currentTime):0;
  const share=length>0?Math.min(1,position/length):0;
  seek.value=String(Math.round(share*1000));seek.style.setProperty('--voice-progress',Math.round(share*100)+'%');
  seek.disabled=!audio.src||length<=0;
  seek.setAttribute('aria-valuetext',formatSeconds(position)+' de '+(length>0?formatSeconds(length):'duración desconocida'));
  time.textContent=formatSeconds(position)+' / '+(length>0?formatSeconds(length):'--:--');
  const playing=!audio.paused&&!audio.ended;
  play.textContent=playing?'❚❚':'▶';
  play.setAttribute('aria-label',(playing?'Pausar ':'Reproducir ')+label);
  root.classList.toggle('is-playing',playing);
 };
 const reset=()=>{
  audio.pause();audio.removeAttribute('src');audio.load();
  hint=0;play.disabled=true;status.textContent='';update();
 };
 const setSource=(url)=>{
  if(!url){reset();return;}
  audio.pause();hint=0;audio.src=url;audio.load();play.disabled=false;status.textContent='';update();
 };
 const setDurationHint=(seconds)=>{hint=Number.isFinite(seconds)&&seconds>0?seconds:0;update();};
 const setError=(message)=>{reset();status.textContent=message||'No se pudo cargar el audio.';};
 play.onclick=async()=>{
  if(!audio.src)return;
  if(!audio.paused){audio.pause();return;}
  try{await audio.play();status.textContent='';}catch(e){status.textContent='No se pudo reproducir. Comprueba la conexión o el permiso de audio.';update();}
 };
 seek.oninput=()=>{
  const length=duration();if(length<=0)return;
  try{audio.currentTime=Math.min(length,Number(seek.value)/1000*length);}catch(e){status.textContent='Este audio no permite desplazarse por la grabación.';}
  update();
 };
 const speeds=[1,1.25,1.5,2];
 rate.onclick=()=>{
  const next=(speeds.indexOf(audio.playbackRate)+1)%speeds.length;
  audio.playbackRate=speeds[next];rate.textContent=speeds[next]+'×';
  rate.setAttribute('aria-label','Velocidad de reproducción '+speeds[next]+'×; cambiar velocidad');
 };
 for(const eventName of ['timeupdate','loadedmetadata','durationchange','seeked','ended','pause'])audio.addEventListener(eventName,update);
 audio.addEventListener('play',()=>{
  // Avoid overlapping audio messages or previews inside the same chat.
  document.querySelectorAll('#private-messages .private-voice-player audio').forEach(other=>{if(other!==audio&&!other.paused)other.pause();});
  update();
 });
 audio.addEventListener('error',()=>{if(audio.src){status.textContent='Audio no disponible. Prueba a recargar la conversación.';update();}});
 return {root,audio,setSource,setDurationHint,setError,reset};
}


let privateDirectCallSession=null;
function closePrivateDirectCall(){
 const session=privateDirectCallSession;
 if(!session)return;
 privateDirectCallSession=null;
 clearInterval(session.timer);
 if(session.filterFrame)cancelAnimationFrame(session.filterFrame);
 session.filterSource?.pause();if(session.filterSource)session.filterSource.srcObject=null;
 session.filterStream?.getTracks().forEach(track=>track.stop());
 if(session.screenFallbackFrame)cancelAnimationFrame(session.screenFallbackFrame);
 session.screenFallbackSource?.pause();
 if(session.screenFallbackSource)session.screenFallbackSource.srcObject=null;
 session.screenFallbackStream?.getTracks().forEach(track=>track.stop());
 session.screenStream?.getTracks().forEach(track=>track.stop());
 session.pc?.close();
 session.localStream?.getTracks().forEach(track=>track.stop());
 if(session.localMedia)session.localMedia.srcObject=null;
 if(session.remoteMedia)session.remoteMedia.srcObject=null;
 session.overlay?.remove();
}
async function startPrivateDirectCall({me,partner,partnerName,kind,incoming=null}){
 if(privateDirectCallSession||groupCallSession||multiVideoSession)throw new Error('Finaliza la llamada que tienes abierta antes de iniciar otra.');
 if(!window.RTCPeerConnection||!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no admite llamadas WebRTC.');
 if(kind!=='audio'&&kind!=='video')throw new Error('Tipo de llamada no admitido.');
 let localStream;
 try{localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==='video'});}
 catch(e){throw new Error('Permiso de micrófono o cámara: '+e.message);}
 if(privateDirectCallSession){localStream.getTracks().forEach(t=>t.stop());throw new Error('Ya hay otra llamada abierta.');}
 const overlay=document.createElement('aside');overlay.className='private-direct-call-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Llamada individual');
 const title=document.createElement('strong');title.textContent=(kind==='video'?'📹 Videollamada':'📞 Llamada de voz')+' con '+partnerName;
 const state=document.createElement('p');state.className='private-direct-call-state';state.setAttribute('role','status');
 state.textContent=incoming?'⏳ Aceptando llamada…':'📲 Llamando…';
 const mediaBox=document.createElement('div');mediaBox.className='private-direct-call-videos';
 const localMedia=document.createElement('video');localMedia.autoplay=true;localMedia.playsInline=true;localMedia.muted=true;localMedia.defaultMuted=true;
 localMedia.setAttribute('muted','');localMedia.srcObject=localStream;localMedia.hidden=kind!=='video';
 localMedia.setAttribute('aria-label','Tu cámara');
 const remoteMedia=document.createElement(kind==='video'?'video':'audio');
 remoteMedia.autoplay=true;remoteMedia.controls=true;
 if(kind==='video')remoteMedia.playsInline=true;
 remoteMedia.setAttribute('aria-label','Audio y vídeo del otro miembro');
 mediaBox.append(localMedia,remoteMedia);
 const actions=document.createElement('div');actions.className='private-direct-call-actions';
 const mic=document.createElement('button');mic.type='button';mic.textContent='🎙️ Silenciar';
 mic.onclick=()=>{const track=localStream.getAudioTracks()[0];if(track){track.enabled=!track.enabled;mic.textContent=track.enabled?'🎙️ Silenciar':'🔇 Activar micrófono';}};
 const camera=document.createElement('button');camera.type='button';camera.hidden=kind!=='video';camera.textContent='📷 Apagar cámara';
 camera.onclick=()=>{const track=localStream.getVideoTracks()[0];if(track){track.enabled=!track.enabled;camera.textContent=track.enabled?'📷 Apagar cámara':'📷 Encender cámara';}};
 const listen=document.createElement('button');listen.type='button';listen.textContent='🔊 Activar sonido';
 listen.onclick=async()=>{
  remoteMedia.muted=false;
  try{await remoteMedia.play();state.textContent='🔊 Sonido remoto activado';}
  catch(e){state.textContent='No se pudo reproducir el sonido: '+e.message;}
 };
 const screenShare=document.createElement('button');screenShare.type='button';screenShare.className='private-direct-screen-share';screenShare.textContent='🖥️ Compartir pantalla';screenShare.hidden=kind!=='video';
 const screenStatus=document.createElement('p');screenStatus.className='private-direct-screen-status';screenStatus.hidden=kind!=='video';
 screenStatus.setAttribute('role','status');screenStatus.setAttribute('aria-live','polite');
 screenStatus.textContent='Para compartir, conecta la videollamada y pulsa Compartir pantalla. El navegador te pedirá elegir qué mostrar.';
 const filterLabel=document.createElement('label');filterLabel.className='private-direct-anime-filter';filterLabel.textContent='✨ Efecto anime';
 filterLabel.hidden=kind!=='video';
 const filterSelect=document.createElement('select');filterSelect.setAttribute('aria-label','Efecto anime de cámara');
 for(const [value,label] of [['none','Sin filtro'],['sakura','🌸 Sakura'],['cyber','💜 Neón cyber'],['galaxy','🌌 Galaxia'],['manga','🖋️ Manga']]){
  const option=document.createElement('option');option.value=value;option.textContent=label;filterSelect.append(option);
 }
 filterLabel.append(filterSelect);
 const hang=document.createElement('button');hang.type='button';hang.className='private-direct-call-hang';hang.textContent='🔴 Colgar';
 actions.append(mic,camera,listen,screenShare,filterLabel,hang);
 const hint=document.createElement('small');hint.textContent='Conexión privada entre navegadores. Algunas redes requieren TURN para conectar.';
 overlay.append(title,state,mediaBox,actions,screenStatus,hint);
 document.body.append(overlay);
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
 localStream.getTracks().forEach(track=>pc.addTrack(track,localStream));
 const session={pc,localStream,localMedia,remoteMedia,overlay,timer:null,call:incoming,
  screenStream:null,screenFallbackStream:null,screenFallbackSource:null,screenFallbackFrame:0,
  filterStream:null,filterSource:null,filterFrame:0};
 privateDirectCallSession=session;
 const videoSender=pc.getSenders().find(sender=>sender.track?.kind==='video');
 const cameraTrack=localStream.getVideoTracks()[0]||null;
 const filterValues={
  none:'none',sakura:'saturate(1.3) brightness(1.07) hue-rotate(-12deg)',
  cyber:'saturate(1.7) contrast(1.2) hue-rotate(30deg)',
  galaxy:'saturate(1.5) contrast(1.13) hue-rotate(90deg)',
  manga:'grayscale(1) contrast(1.85) brightness(1.15)'
 };
 let currentFilter='none',filteredTrack=null,sharingScreen=false;
 const outgoingVideoTrack=()=>currentFilter==='none'?cameraTrack:(filteredTrack||cameraTrack);
 const setupCameraEffect=()=>{
  if(session.filterStream)return;
  if(!cameraTrack||typeof HTMLCanvasElement==='undefined'||!HTMLCanvasElement.prototype.captureStream)throw new Error('Este navegador no admite filtros de vídeo compartidos.');
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Tu navegador no permite aplicar filtros.');
  const source=document.createElement('video');source.autoplay=true;source.muted=true;source.playsInline=true;
  source.srcObject=new MediaStream([cameraTrack]);source.play().catch(()=>{});
  session.filterSource=source;
  const paint=timestamp=>{
   if(privateDirectCallSession!==session)return;
   ctx.filter='none';ctx.fillStyle='#0c0920';ctx.fillRect(0,0,canvas.width,canvas.height);
   if(cameraTrack.enabled&&source.readyState>=2){
    ctx.filter=filterValues[currentFilter]||'none';
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
    ctx.filter='none';
    if(currentFilter==='sakura'||currentFilter==='galaxy'){
     for(let i=0;i<13;i++){
      const x=((i*127+timestamp*.025*(1+i%3))%680)-20;
      const y=(i*73+(timestamp*.016*(i%3+1)))%390;
      ctx.fillStyle=currentFilter==='sakura'?'rgba(255,194,234,.72)':'rgba(172,213,255,.85)';
      ctx.beginPath();ctx.ellipse(x,y,3+i%4,5+i%3,0.6,0,Math.PI*2);ctx.fill();
     }
    }else if(currentFilter==='cyber'){
     ctx.strokeStyle='rgba(168,105,255,.18)';ctx.lineWidth=1;
     for(let y=0;y<360;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(640,y);ctx.stroke();}
    }
   }
   session.filterFrame=requestAnimationFrame(paint);
  };
  session.filterFrame=requestAnimationFrame(paint);
  session.filterStream=canvas.captureStream(24);
  filteredTrack=session.filterStream.getVideoTracks()[0]||null;
  if(!filteredTrack)throw new Error('No se pudo iniciar el vídeo con filtro.');
 };
 const releaseScreenFallback=()=>{
  if(session.screenFallbackFrame){cancelAnimationFrame(session.screenFallbackFrame);session.screenFallbackFrame=0;}
  session.screenFallbackSource?.pause();
  if(session.screenFallbackSource)session.screenFallbackSource.srcObject=null;
  session.screenFallbackSource=null;
  session.screenFallbackStream?.getTracks().forEach(t=>t.stop());
  session.screenFallbackStream=null;
 };
 const prepareSmallerScreenTrack=async(display)=>{
  if(!HTMLCanvasElement.prototype.captureStream)throw new Error('Este navegador no permite reducir la captura para WebRTC.');
  const source=document.createElement('video');
  source.muted=true;source.defaultMuted=true;source.autoplay=true;source.playsInline=true;
  source.srcObject=display;
  session.screenFallbackSource=source;
  await source.play();
  const settings=cameraTrack?.getSettings?.()||{};
  const limitW=Math.min(960,Math.max(320,settings.width||640)),limitH=Math.min(540,Math.max(180,settings.height||360));
  const canvas=document.createElement('canvas');canvas.width=limitW;canvas.height=limitH;
  const context=canvas.getContext('2d',{alpha:false});
  if(!context)throw new Error('El navegador no admite dibujar la pantalla capturada.');
  const renderFrame=()=>{
   if(privateDirectCallSession!==session||source.paused)return;
   if(source.readyState>=2){
    context.fillStyle='#070a13';
    context.fillRect(0,0,canvas.width,canvas.height);
    const naturalW=source.videoWidth||canvas.width,naturalH=source.videoHeight||canvas.height;
    const factor=Math.min(canvas.width/naturalW,canvas.height/naturalH);
    const width=Math.round(naturalW*factor),height=Math.round(naturalH*factor);
    context.drawImage(source,Math.round((canvas.width-width)/2),Math.round((canvas.height-height)/2),width,height);
   }
   session.screenFallbackFrame=requestAnimationFrame(renderFrame);
  };
  renderFrame();
  const stream=canvas.captureStream(15);
  const track=stream.getVideoTracks()[0];
  if(!track){releaseScreenFallback();throw new Error('No se pudo preparar una captura de pantalla compatible.');}
  session.screenFallbackStream=stream;
  return track;
 };
 const stopPrivateScreenShare=async()=>{
  if(!sharingScreen)return;
  sharingScreen=false;
  const display=session.screenStream;session.screenStream=null;
  try{
   if(videoSender&&outgoingVideoTrack())await videoSender.replaceTrack(outgoingVideoTrack());
  }catch(e){
   try{await videoSender?.replaceTrack(null);}catch(_){}
   screenStatus.textContent='⚠️ Se detuvo la pantalla, pero no se pudo restaurar la cámara ('+e.message+'). Cuelga y vuelve a llamar.';
  }
  releaseScreenFallback();
  localMedia.srcObject=localStream;
  localMedia.play().catch(()=>{});
  localMedia.style.filter=filterValues[currentFilter]||'none';
  overlay.classList.remove('is-sharing-screen');
  screenShare.textContent='🖥️ Compartir pantalla';
  if(!screenStatus.textContent.startsWith('⚠️'))screenStatus.textContent='Pantalla detenida. Puedes compartir de nuevo pulsando el botón.';
  display?.getTracks().forEach(track=>track.stop());
 };
 filterSelect.onchange=async()=>{
  if(!cameraTrack||!videoSender)return;
  filterSelect.disabled=true;
  const previous=currentFilter;currentFilter=filterSelect.value;
  try{
   if(currentFilter!=='none')setupCameraEffect();
   if(!sharingScreen)await videoSender.replaceTrack(outgoingVideoTrack());
   localMedia.style.filter=sharingScreen?'none':filterValues[currentFilter];
   state.textContent=currentFilter==='none'?'🎥 Cámara sin filtro':'✨ Efecto '+filterSelect.selectedOptions[0].textContent+' aplicado a tu cámara';
  }catch(e){
   currentFilter=previous;filterSelect.value=previous;
   localMedia.style.filter=sharingScreen?'none':filterValues[previous];
   state.textContent='No se pudo aplicar el efecto: '+e.message;
  }finally{filterSelect.disabled=false;}
 };
 screenShare.onclick=async()=>{
  if(sharingScreen){await stopPrivateScreenShare();return;}
  if(!navigator.mediaDevices?.getDisplayMedia){
   screenStatus.textContent='⚠️ Este navegador o dispositivo no permite compartir pantalla. Usa Chrome o Edge en un ordenador.';return;
  }
  if(!window.isSecureContext){
   screenStatus.textContent='⚠️ Compartir pantalla requiere HTTPS. Abre la dirección segura de la web.';return;
  }
  if(pc.connectionState!=='connected'){
   screenStatus.textContent='⚠️ Primero espera a que el otro miembro acepte y la videollamada muestre «Conexión establecida».';return;
  }
  if(!videoSender||!cameraTrack){
   screenStatus.textContent='⚠️ No se encontró el canal de vídeo. Finaliza y vuelve a iniciar una videollamada.';return;
  }
  screenShare.disabled=true;
  screenStatus.textContent='Selecciona «Pantalla», «Ventana» o «Pestaña» en el diálogo y pulsa Compartir.';
  let display=null;
  try{
   // Must be called synchronously inside the click handler; browser requires fresh user activation.
   display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
   if(privateDirectCallSession!==session||pc.connectionState==='closed'){
    display.getTracks().forEach(t=>t.stop());
    return;
   }
   const sourceTrack=display.getVideoTracks()[0];
   if(!sourceTrack||sourceTrack.readyState!=='live')throw new Error('No hay captura de pantalla activa. Vuelve a seleccionarla.');
   let sentTrack=sourceTrack,reduced=false;
   try{
    await videoSender.replaceTrack(sentTrack);
   }catch(replaceError){
    if(!['InvalidModificationError','OperationError'].includes(replaceError.name))throw replaceError;
    screenStatus.textContent='Ajustando la resolución de la pantalla para transmitirla…';
    sentTrack=await prepareSmallerScreenTrack(display);
    await videoSender.replaceTrack(sentTrack);
    reduced=true;
   }
   session.screenStream=display;sharingScreen=true;overlay.classList.add('is-sharing-screen');
   localMedia.srcObject=new MediaStream([sourceTrack]);localMedia.style.filter='none';
   localMedia.play().catch(()=>{});
   screenShare.textContent='🛑 Dejar de compartir';
   screenStatus.textContent='✅ Pantalla transmitiéndose al otro miembro'+(reduced?' (resolución adaptada)':'')+'. Pulsa «Dejar de compartir» para volver a la cámara.';
   sourceTrack.addEventListener('ended',()=>{
    if(privateDirectCallSession===session)stopPrivateScreenShare().catch(console.warn);
   },{once:true});
  }catch(e){
   display?.getTracks().forEach(track=>track.stop());
   releaseScreenFallback();
   if(e.name==='NotAllowedError'||e.name==='PermissionDeniedError')
    screenStatus.textContent='⚠️ Se canceló o denegó el permiso. Pulsa Compartir pantalla otra vez y confirma la selección.';
   else if(e.name==='InvalidStateError')
    screenStatus.textContent='⚠️ El navegador necesita la pestaña activa. Vuelve a la videollamada, haz clic y comparte desde ahí.';
   else if(e.name==='NotReadableError')
    screenStatus.textContent='⚠️ El sistema no permite capturar esa pantalla. Cierra otras aplicaciones de captura y prueba con una ventana.';
   else if(e.name==='InvalidModificationError')
    screenStatus.textContent='⚠️ Tu dispositivo no permite cambiar la cámara por esa captura. Prueba compartiendo una ventana más pequeña.';
   else screenStatus.textContent='⚠️ No se pudo compartir: '+(e.message||'error desconocido');
  }finally{screenShare.disabled=false;}
 };
 let call=incoming,seenIce=0,busy=false,closed=false;
 const localIce=[],remoteIce=[];
 const updateStatus=()=>{
  if(privateDirectCallSession!==session)return;
  if(pc.connectionState==='connected')state.textContent='🟢 Conexión establecida';
  else if(pc.connectionState==='failed')state.textContent='⚠️ No se puede establecer la conexión. Puede ser necesario un servidor TURN.';
  else if(pc.connectionState==='disconnected')state.textContent='⚠️ Se perdió la conexión. Comprueba tu red.';
  else if(pc.connectionState==='connecting')state.textContent='⏳ Conectando audio y vídeo…';
 };
 pc.onconnectionstatechange=updateStatus;
 pc.ontrack=event=>{
  remoteMedia.srcObject=event.streams?.[0]||new MediaStream([event.track]);
  remoteMedia.play().catch(()=>{state.textContent='Pulsa «Activar sonido» para escuchar al otro miembro.';});
 };
 const sendIce=async candidate=>{
  if(!call?.id){localIce.push(candidate);return;}
  const {error}=await sb.from('member_private_call_ice').insert({call_id:call.id,sender_id:me,candidate});
  if(error)console.warn('ICE individual:',error.message);
 };
 pc.onicecandidate=event=>{if(event.candidate)sendIce(event.candidate.toJSON()).catch(console.warn);};
 const flushIce=async()=>{
  if(!pc.remoteDescription)return;
  while(remoteIce.length){
   try{await pc.addIceCandidate(new RTCIceCandidate(remoteIce.shift()));}
   catch(e){console.warn('ICE remoto omitido:',e.message);}
  }
 };
 const finish=async()=>{
  if(closed)return;
  closed=true;
  hang.disabled=true;
  if(call?.id)await sb.from('member_private_calls').update({status:'ended'}).eq('id',call.id).then(({error})=>{if(error)console.warn('Finalizar llamada:',error.message);});
  if(privateDirectCallSession===session)closePrivateDirectCall();
 };
 hang.onclick=finish;
 try{
  if(!incoming){
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   const {data,error}=await sb.from('member_private_calls')
    .insert({caller_id:me,callee_id:partner,kind,status:'ringing',offer:pc.localDescription.toJSON()})
    .select('id,caller_id,callee_id,kind,status,created_at,offer,answer').single();
   if(error||!data)throw new Error(error?.message||'No se pudo crear la llamada.');
   call=data;session.call=data;
  }else{
   await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));
   const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
   const {data,error}=await sb.from('member_private_calls')
    .update({status:'active',answer:pc.localDescription.toJSON()})
    .eq('id',incoming.id).eq('status','ringing')
    .select('id,caller_id,callee_id,kind,status,created_at,offer,answer').single();
   if(error||!data)throw new Error(error?.message||'La llamada ya no está disponible.');
   call=data;session.call=data;
  }
  for(const candidate of localIce.splice(0))await sendIce(candidate);
  const poll=async()=>{
   if(busy||closed||privateDirectCallSession!==session)return;busy=true;
   try{
    const {data:current,error}=await sb.from('member_private_calls')
      .select('status,answer').eq('id',call.id).maybeSingle();
    if(error){state.textContent='⚠️ No se pudo consultar el estado: '+error.message;return;}
    if(!current||current.status==='ended'||current.status==='declined'){state.textContent='Llamada finalizada';closePrivateDirectCall();return;}
    if(current.status==='ringing'&&me===call.caller_id){
     if(Date.now()-new Date(call.created_at).getTime()>175000){await finish();return;}
     state.textContent='📲 Esperando a que '+partnerName+' acepte la llamada…';
    }
    if(current.status==='active'&&current.answer&&!pc.remoteDescription&&me===call.caller_id){
     await pc.setRemoteDescription(new RTCSessionDescription(current.answer));
     await flushIce();state.textContent='⏳ Negociando la conexión…';
    }
    const {data:ice, error:iceError}=await sb.from('member_private_call_ice')
     .select('id,sender_id,candidate').eq('call_id',call.id).gt('id',seenIce).order('id').limit(100);
    if(iceError){console.warn('ICE individual:',iceError.message);return;}
    for(const item of ice||[]){
     seenIce=Math.max(seenIce,Number(item.id));
     if(item.sender_id!==me)remoteIce.push(item.candidate);
    }
    await flushIce();
  }catch(e){state.textContent='⚠️ Error en la llamada: '+e.message;}
  finally{busy=false;}
  };
  session.timer=setInterval(poll,1500);poll();
  return call;
 }catch(e){
  if(call?.id&&!incoming)await sb.from('member_private_calls').update({status:'ended'}).eq('id',call.id);
  if(privateDirectCallSession===session)closePrivateDirectCall();
  throw e;
 }
}
async function showIncomingPrivateCall(me,partner,partnerName,panel){
 const cutoff=new Date(Date.now()-170000).toISOString();
 const {data,error}=await sb.from('member_private_calls')
  .select('id,caller_id,callee_id,kind,status,created_at,offer,answer')
  .eq('callee_id',me).eq('caller_id',partner).eq('status','ringing').gt('created_at',cutoff)
  .order('created_at',{ascending:false}).limit(1);
 if(error||!data?.length||!panel.isConnected)return;
 const call=data[0];
 const banner=document.createElement('section');banner.className='private-direct-incoming';
 const message=document.createElement('strong');message.textContent=(call.kind==='video'?'📹 Videollamada':'📞 Llamada de voz')+' entrante de '+partnerName;
 const notice=document.createElement('small');notice.textContent='La cámara y el micrófono solo se activan si aceptas.';
 const buttons=document.createElement('div');buttons.className='private-direct-incoming-actions';
 const accept=document.createElement('button');accept.type='button';accept.textContent='✅ Aceptar';
 const decline=document.createElement('button');decline.type='button';decline.textContent='❌ Rechazar';
 accept.onclick=async()=>{
  accept.disabled=true;decline.disabled=true;notice.textContent='Preparando llamada…';
  try{await startPrivateDirectCall({me,partner,partnerName,kind:call.kind,incoming:call});banner.remove();}
  catch(e){notice.textContent=e.message;accept.disabled=false;decline.disabled=false;}
 };
 decline.onclick=async()=>{
  accept.disabled=true;decline.disabled=true;
  const {error:declineError}=await sb.from('member_private_calls').update({status:'declined'}).eq('id',call.id).eq('status','ringing');
  if(declineError){notice.textContent='No se pudo rechazar: '+declineError.message;accept.disabled=false;decline.disabled=false;}
  else banner.remove();
 };
 buttons.append(accept,decline);banner.append(message,notice,buttons);panel.prepend(banner);
}

async function loadPrivateMessages(){
 if(privateChatExpiryTimer){clearTimeout(privateChatExpiryTimer);privateChatExpiryTimer=null;}
 if(privateChatActivityInterval){clearInterval(privateChatActivityInterval);privateChatActivityInterval=null;}
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
 const {data:messages,error}=await sb.from('member_direct_messages') .select('id,sender_id,recipient_id,body,created_at,is_read,image_path,image_paths,audio_path,deleted_at,reply_to_id,edited_at,expires_at,expires_in_seconds,message_kind,birthday_style,view_once,view_once_opened_at').order('created_at',{ascending:false}).limit(300);
 if(!root.isConnected)return;
 if(error){root.textContent='No se pudieron cargar los mensajes: '+error.message;return;}
 const items=messages||[];
 const {data:favoriteRows,error:favoriteError}=await sb.from('member_private_chat_favorites')
  .select('partner_id').eq('user_id',me);
 if(favoriteError)console.warn('Favoritos del chat:',favoriteError.message);
 const favoriteIds=new Set((favoriteRows||[]).map(row=>row.partner_id));
 const {data:allGiftRows,error:giftLoadError}=await sb.from('member_private_chat_gifts')
  .select('id,sender_id,recipient_id,gift_code,created_at')
  .order('created_at',{ascending:false}).limit(200);
 if(giftLoadError)console.warn('Regalos privados:',giftLoadError.message);
 const gifts=allGiftRows||[];
 const ids=[...new Set([
  ...items.flatMap(m=>[m.sender_id,m.recipient_id]),
  ...gifts.flatMap(g=>[g.sender_id,g.recipient_id]),
  ...favoriteIds
 ].filter(id=>id!==me))];
 if(validId(requested)&&requested!==me&&!ids.includes(requested))ids.push(requested);
 const {data:profiles}=ids.length?await sb.from('profiles').select('id,display_name,username,is_public,avatar_url').in('id',ids):{data:[]};
 if(!root.isConnected)return;
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
 const partnerProfiles=new Map((profiles||[]).map(p=>[p.id,p]));
 const latestMessageByPartner=new Map(),latestGiftByPartner=new Map();
 for(const message of items){
  const partnerId=message.sender_id===me?message.recipient_id:message.sender_id;
  if(!latestMessageByPartner.has(partnerId))latestMessageByPartner.set(partnerId,message);
 }
 for(const gift of gifts){
  const partnerId=gift.sender_id===me?gift.recipient_id:gift.sender_id;
  if(!latestGiftByPartner.has(partnerId))latestGiftByPartner.set(partnerId,gift);
 }
 const publicIds=new Set((profiles||[]).filter(p=>p.is_public).map(p=>p.id));
 const partners=[...new Set([...items.map(m=>m.sender_id===me?m.recipient_id:m.sender_id),...gifts.map(g=>g.sender_id===me?g.recipient_id:g.sender_id),...favoriteIds])];
 if(validId(requested)&&requested!==me&&!partners.includes(requested))partners.unshift(requested);
 const {data:archiveRows,error:archiveError}=await sb.from('member_conversation_archives').select('partner_id').eq('user_id',me);
 if(archiveError)console.warn('No se pudo cargar el archivo de conversaciones:',archiveError.message);
 const archivedIds=new Set((archiveRows||[]).map(row=>row.partner_id));
 const wrapper=document.createElement('div');wrapper.className='messages-layout';
 const sidebar=document.createElement('aside');sidebar.className='messages-sidebar';
 const title=document.createElement('h2');title.textContent='Conversaciones';sidebar.append(title);
 const sidebarSearch=document.createElement('input');sidebarSearch.type='search';sidebarSearch.className='private-chat-sidebar-search';
 sidebarSearch.placeholder='🔎 Buscar conversación…';sidebarSearch.setAttribute('aria-label','Buscar conversaciones por nombre');
 sidebarSearch.value=privateConversationListFilter;
 const sidebarSearchResult=document.createElement('small');sidebarSearchResult.className='private-chat-sidebar-result';
 sidebar.append(sidebarSearch,sidebarSearchResult);
 const shareStatusLabel=document.createElement('label');shareStatusLabel.className='private-chat-share-status';
 const shareStatusBox=document.createElement('input');shareStatusBox.type='checkbox';shareStatusBox.disabled=true;shareStatusBox.setAttribute('aria-label','Compartir mi estado de actividad en Mensajes');
 const shareStatusText=document.createElement('span');shareStatusText.textContent='🟢 Compartir mi estado en Mensajes';
 shareStatusLabel.append(shareStatusBox,shareStatusText);
 const shareStatusInfo=document.createElement('small');shareStatusInfo.className='private-chat-sharing-info';
 shareStatusInfo.textContent='Tu actividad está oculta hasta que lo actives.';
 sidebar.append(shareStatusLabel,shareStatusInfo);
 const birthdayPrefs=document.createElement('section');birthdayPrefs.className='private-chat-birthday-preferences';
 const birthdayTitle=document.createElement('strong');birthdayTitle.textContent='🎂 Mi cumpleaños';
 const birthdayInfo=document.createElement('small');birthdayInfo.textContent='Guarda solo día y mes. Por defecto es privado; si lo compartes, tus contactos podrán felicitarte ese día.';
 const birthdayMonth=document.createElement('select');birthdayMonth.setAttribute('aria-label','Mes de cumpleaños');
 const monthPlaceholder=document.createElement('option');monthPlaceholder.value='';monthPlaceholder.textContent='Mes';birthdayMonth.append(monthPlaceholder);
 const monthNames=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
 monthNames.forEach((month,index)=>{const option=document.createElement('option');option.value=String(index+1);option.textContent=month[0].toUpperCase()+month.slice(1);birthdayMonth.append(option);});
 const birthdayDay=document.createElement('select');birthdayDay.setAttribute('aria-label','Día de cumpleaños');
 const populateBirthdayDays=()=>{
  const previous=birthdayDay.value;
  birthdayDay.replaceChildren();
  const option=document.createElement('option');option.value='';option.textContent='Día';birthdayDay.append(option);
  const month=Number(birthdayMonth.value);
  const max=month===2?29:[4,6,9,11].includes(month)?30:month?31:0;
  for(let day=1;day<=max;day++){const choice=document.createElement('option');choice.value=String(day);choice.textContent=String(day);birthdayDay.append(choice);}
  birthdayDay.value=Number(previous)<=max?previous:'';
 };
 birthdayMonth.onchange=populateBirthdayDays;populateBirthdayDays();
 const birthdaySharingLabel=document.createElement('label');birthdaySharingLabel.className='private-chat-birthday-sharing';
 const birthdaySharing=document.createElement('input');birthdaySharing.type='checkbox';
 birthdaySharingLabel.append(birthdaySharing,document.createTextNode(' Compartir con mis contactos de Mensajes'));
 const birthdaySave=document.createElement('button');birthdaySave.type='button';birthdaySave.textContent='Guardar cumpleaños';
 const birthdayRemove=document.createElement('button');birthdayRemove.type='button';birthdayRemove.textContent='Borrar mi fecha';
 const birthdayFeedback=document.createElement('small');birthdayFeedback.setAttribute('role','status');
 const birthdayFields=document.createElement('div');birthdayFields.className='private-chat-birthday-fields';
 birthdayFields.append(birthdayDay,birthdayMonth);
 birthdayPrefs.append(birthdayTitle,birthdayInfo,birthdayFields,birthdaySharingLabel,birthdaySave,birthdayRemove,birthdayFeedback);
 sidebar.append(birthdayPrefs);
 const loadMyBirthday=async()=>{
  const {data,error}=await sb.from('member_chat_birthday_preferences')
   .select('birth_day,birth_month,share_birthday').eq('user_id',me).maybeSingle();
  if(error){birthdayFeedback.textContent='No se pudo consultar tu cumpleaños: '+error.message;return;}
  if(!birthdayPrefs.isConnected)return;
  birthdayMonth.value=data?.birth_month?String(data.birth_month):'';
  populateBirthdayDays();birthdayDay.value=data?.birth_day?String(data.birth_day):'';
  birthdaySharing.checked=data?.share_birthday===true;
 };
 birthdaySave.onclick=async()=>{
  const month=Number(birthdayMonth.value),day=Number(birthdayDay.value);
  if(!month||!day){birthdayFeedback.textContent='Selecciona el día y el mes antes de guardar.';return;}
  birthdaySave.disabled=true;birthdayFeedback.textContent='Guardando…';
  const {error}=await sb.from('member_chat_birthday_preferences').upsert({
   user_id:me,birth_month:month,birth_day:day,
   share_birthday:birthdaySharing.checked,updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  birthdaySave.disabled=false;
  birthdayFeedback.textContent=error?'No se pudo guardar: '+error.message:'✅ Cumpleaños guardado '+(birthdaySharing.checked?'y compartido con tus contactos.':'de forma privada.');
 };
 birthdayRemove.onclick=async()=>{
  birthdayRemove.disabled=true;
  const {error}=await sb.from('member_chat_birthday_preferences').delete().eq('user_id',me);
  birthdayRemove.disabled=false;
  if(error){birthdayFeedback.textContent='No se pudo borrar: '+error.message;return;}
  birthdayMonth.value='';populateBirthdayDays();birthdaySharing.checked=false;
  birthdayFeedback.textContent='✅ Tu fecha de cumpleaños ya no está guardada.';
 };
 const updateMyChatActivity=async()=>{
  if(!root.isConnected||!location.hash.startsWith('#/mensajes')||!shareStatusBox.checked||document.visibilityState!=='visible')return;
  const {error}=await sb.from('member_private_chat_activity').upsert({user_id:me,share_status:true},{onConflict:'user_id'});
  if(error)console.warn('Estado del chat:',error.message);
 };
 shareStatusBox.onchange=async()=>{
  const enabled=shareStatusBox.checked;shareStatusBox.disabled=true;
  const {error}=await sb.from('member_private_chat_activity').upsert({user_id:me,share_status:enabled},{onConflict:'user_id'});
  if(error){shareStatusBox.checked=!enabled;shareStatusInfo.textContent='No se pudo cambiar la privacidad: '+error.message;}
  else shareStatusInfo.textContent=enabled?'Compartido solo con miembros con conversación · actualizado mientras usas Mensajes.':'Tu última conexión en Mensajes está oculta.';
  shareStatusBox.disabled=false;
 };
 const loadMyChatActivity=async()=>{
  const {data,error}=await sb.from('member_private_chat_activity').select('share_status').eq('user_id',me).maybeSingle();
  if(!sidebar.isConnected)return;
  shareStatusBox.disabled=false;
  if(error){shareStatusInfo.textContent='No se pudo consultar tu preferencia de privacidad.';return;}
  shareStatusBox.checked=data?.share_status===true;
  shareStatusInfo.textContent=shareStatusBox.checked?'Estado compartido con miembros con conversación.':'Estado privado. Actívalo para compartir tu última actividad.';
  updateMyChatActivity().catch(console.warn);
 };
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
  const displayName=names.get(id)||'Miembro';
  const avatar=document.createElement('span');avatar.className='private-chat-partner-avatar';
  const profile=partnerProfiles.get(id);
  if(profile?.avatar_url){
   const img=document.createElement('img');img.src=profile.avatar_url;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
   img.onerror=()=>{img.remove();avatar.textContent=displayName.slice(0,1).toUpperCase();};
   avatar.append(img);
  }else avatar.textContent=displayName.slice(0,1).toUpperCase();
  const details=document.createElement('span');details.className='private-chat-partner-details';
  const name=document.createElement('strong');name.textContent=displayName;
  const recent=latestMessageByPartner.get(id),recentGift=latestGiftByPartner.get(id);
  const latestIsGift=recentGift&&(!recent||new Date(recentGift.created_at)>new Date(recent.created_at));
  const preview=document.createElement('small');preview.className='private-chat-partner-preview';
  if(recent||recentGift){
   const giftIcons={sakura:'🌸',star:'⭐',dragon:'🐲',heart:'💖',crystal:'💎'};
   const messagePreview=latestIsGift?'🎁 Regalo anime '+(giftIcons[recentGift.gift_code]||'🎁'):
    recent.deleted_at?'Mensaje eliminado':chatSpoilerPreview(recent.body?.trim())||(recent.image_path?'📷 Imagen':recent.audio_path?'🎤 Audio':'Mensaje');
   const latest=latestIsGift?recentGift:recent;
   preview.textContent=(latest.sender_id===me?'Tú: ':'')+messagePreview;
   const when=document.createElement('small');when.className='private-chat-partner-time';
   when.textContent=new Date(latest.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
   details.append(name,preview,when);
  }else{preview.textContent='Inicia una conversación';details.append(name,preview);}
  link.append(avatar,details);
  if(unread){const count=document.createElement('span');count.className='private-chat-partner-unread';count.textContent=unread>99?'99+':String(unread);count.setAttribute('aria-label',unread+' mensajes sin leer');link.append(count);}
  item.dataset.partnerName=displayName;
  const action=document.createElement('button');action.type='button';action.className='private-chat-archive-action';
  action.textContent=archived?'↩ Recuperar':'📁 Archivar';
  action.setAttribute('aria-label',(archived?'Recuperar':'Archivar')+' conversación con '+(names.get(id)||'Miembro'));
  action.onclick=()=>changeArchive(id,archived,action);
  const fav=document.createElement('button');fav.type='button';fav.className='private-chat-favorite-action'+(favoriteIds.has(id)?' is-favorite':'');
  fav.textContent=favoriteIds.has(id)?'⭐':'☆';
  fav.setAttribute('aria-label',(favoriteIds.has(id)?'Quitar de favoritos: ':'Añadir a favoritos: ')+displayName);
  fav.setAttribute('aria-pressed',String(favoriteIds.has(id)));
  fav.title=favoriteIds.has(id)?'Quitar de favoritos':'Marcar conversación favorita';
  fav.onclick=async()=>{
   fav.disabled=true;
   const result=favoriteIds.has(id)?
    await sb.from('member_private_chat_favorites').delete().eq('user_id',me).eq('partner_id',id):
    await sb.from('member_private_chat_favorites').insert({user_id:me,partner_id:id});
   if(result.error){alert('No se pudo actualizar Favoritos: '+result.error.message);fav.disabled=false;return;}
   await loadPrivateMessages();
  };
  item.append(link,fav,action);destination.append(item);
 };
 const normalPartners=partners.filter(id=>!archivedIds.has(id)).sort((a,b)=>Number(favoriteIds.has(b))-Number(favoriteIds.has(a)));
 archivedPartners.sort((a,b)=>Number(favoriteIds.has(b))-Number(favoriteIds.has(a)));
 if(!normalPartners.length){const p=document.createElement('p');p.textContent=archivedPartners.length?'No tienes conversaciones activas. Revisa las archivadas.':'Aún no tienes conversaciones. Visita Miembros para iniciar una.';sidebar.append(p);}
 for(const id of normalPartners)renderPartner(id,false,sidebar);
 for(const id of archivedPartners)renderPartner(id,true,archiveList);
 sidebar.append(archiveToggle,archiveList);
 const filterConversationList=()=>{
  const query=sidebarSearch.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  let visible=0;
  for(const row of sidebar.querySelectorAll('.private-chat-partner-row')){
   const normalized=(row.dataset.partnerName||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
   const matches=!query||normalized.includes(query);
   row.hidden=!matches;if(matches)visible++;
  }
  sidebarSearchResult.textContent=query?(visible+' conversación'+(visible===1?'':'es')+' encontrada'+(visible===1?'':'s')):'';
 };
 sidebarSearch.oninput=()=>{privateConversationListFilter=sidebarSearch.value;filterConversationList();};
 filterConversationList();
 const panel=document.createElement('section');panel.className='messages-panel';
 let unreadPartnerToMark=null;
 let loadChatTheme=null,refreshPartnerActivity=null,loadPrivateChatNotifications=null,loadPartnerBirthday=null;
 if(!active){panel.textContent='Selecciona un miembro desde su perfil para comenzar.';}
 else if(!names.has(active)&&!items.some(m=>m.sender_id===active||m.recipient_id===active)){panel.textContent='Este miembro no tiene un perfil público disponible.';}
 else {
  const heading=document.createElement('h2');heading.textContent=names.get(active)||'Miembro';
  const chatHeader=document.createElement('header');chatHeader.className='private-chat-personal-header';
  const headingText=document.createElement('div');headingText.className='private-chat-heading-text';
  const activityStatus=document.createElement('small');activityStatus.className='private-chat-connection-status';activityStatus.textContent='⚪ Estado privado';activityStatus.setAttribute('role','status');
  headingText.append(heading,activityStatus);
  const themeLabel=document.createElement('label');themeLabel.className='private-chat-theme-picker';themeLabel.textContent='🎨 Tema del chat';
  const themeSelect=document.createElement('select');themeSelect.setAttribute('aria-label','Tema anime de esta conversación');
  for(const [value,label] of [['default','🌙 Clásico'],['sakura','🌸 Sakura'],['neon','💜 Cyber neón'],['galaxy','🌌 Galaxia'],['sunset','🌅 Atardecer anime']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;themeSelect.append(option);
  }
  themeLabel.append(themeSelect);
  const backgroundLabel=document.createElement('label');backgroundLabel.className='private-chat-theme-picker private-chat-background-picker';
  backgroundLabel.textContent='🏞️ Fondo anime';
  const backgroundSelect=document.createElement('select');backgroundSelect.setAttribute('aria-label','Fondo anime de esta conversación');
  for(const [value,label] of [
   ['none','🌙 Sin fondo'],['sakura-moon','🌸 Luna Sakura'],['neon-city','💜 Ciudad neón'],
   ['galaxy-sky','🌌 Cielo galáctico'],['manga-ink','🖋️ Viñetas manga'],['ocean-anime','🌊 Mar anime']
  ]){
   const option=document.createElement('option');option.value=value;option.textContent=label;backgroundSelect.append(option);
  }
  backgroundLabel.append(backgroundSelect);chatHeader.append(headingText,themeLabel,backgroundLabel);
  const backgroundClasses=['private-chat-bg-sakura-moon','private-chat-bg-neon-city','private-chat-bg-galaxy-sky','private-chat-bg-manga-ink','private-chat-bg-ocean-anime'];
  const applyBackground=value=>{
   panel.classList.remove(...backgroundClasses);
   if(value!=='none')panel.classList.add('private-chat-bg-'+value);
  };
  let backgroundTouched=false;
  backgroundSelect.onchange=async()=>{
   backgroundTouched=true;
   const chosen=backgroundSelect.value;applyBackground(chosen);
   const {error}=await sb.from('member_private_chat_themes')
    .upsert({user_id:me,partner_id:active,background:chosen},{onConflict:'user_id,partner_id'});
   if(error){console.warn('Fondo anime:',error.message);alert('No se pudo guardar el fondo: '+error.message);}
  };
  const chatThemeClasses=['private-chat-theme-sakura','private-chat-theme-neon','private-chat-theme-galaxy','private-chat-theme-sunset'];
  const applyChatTheme=value=>{panel.classList.remove(...chatThemeClasses);if(value!=='default')panel.classList.add('private-chat-theme-'+value);};
  let themeTouched=false;
  themeSelect.onchange=async()=>{
   themeTouched=true;
   const chosen=themeSelect.value;applyChatTheme(chosen);
   const {error}=await sb.from('member_private_chat_themes').upsert({user_id:me,partner_id:active,theme:chosen},{onConflict:'user_id,partner_id'});
   if(error){console.warn('Tema de chat:',error.message);alert('No se pudo guardar el tema: '+error.message);}
  };
  loadChatTheme=async()=>{
   const {data,error}=await sb.from('member_private_chat_themes').select('theme,background').eq('user_id',me).eq('partner_id',active).maybeSingle();
   if(error){console.warn('Aspecto del chat:',error.message);return;}
   if(!panel.isConnected)return;
   if(!themeTouched){themeSelect.value=data?.theme||'default';applyChatTheme(themeSelect.value);}
   if(!backgroundTouched){backgroundSelect.value=data?.background||'none';applyBackground(backgroundSelect.value);}
  };
  refreshPartnerActivity=async()=>{
   if(!panel.isConnected)return;
   const {data,error}=await sb.from('member_private_chat_activity').select('last_active_at').eq('user_id',active).maybeSingle();
   if(!panel.isConnected)return;
   if(error){activityStatus.textContent='⚪ Actividad no disponible';return;}
   if(!data?.last_active_at){activityStatus.textContent='⚪ Estado privado';activityStatus.classList.remove('is-online');return;}
   const last=new Date(data.last_active_at),age=Date.now()-last.getTime();
   if(age>=0&&age<90000){activityStatus.textContent='🟢 Conectado a Mensajes';activityStatus.classList.add('is-online');}
   else{activityStatus.classList.remove('is-online');activityStatus.textContent='⚪ Última actividad en Mensajes: '+last.toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
  };
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
  const chatExtras=document.createElement('section');chatExtras.className='private-direct-extra-controls';
  const callToolbar=document.createElement('div');callToolbar.className='private-direct-call-toolbar';
  const voiceCall=document.createElement('button');voiceCall.type='button';voiceCall.className='outline-btn mini';voiceCall.textContent='📞 Llamada de voz';
  const videoCall=document.createElement('button');videoCall.type='button';videoCall.className='outline-btn mini';videoCall.textContent='📹 Videollamada';
  const callFeedback=document.createElement('small');callFeedback.className='private-direct-call-feedback';callFeedback.setAttribute('role','status');
  const callsAllowed=publicIds.has(active)&&!blockedByMe.has(active)&&!blockedMe.has(active);
  voiceCall.disabled=!callsAllowed;videoCall.disabled=!callsAllowed;
  const callPartner=names.get(active)||'Miembro';
  const initiateCall=async(kind,trigger)=>{
   trigger.disabled=true;callFeedback.textContent='Solicitando acceso al micrófono'+(kind==='video'?' y cámara':'')+'…';
   try{
    await startPrivateDirectCall({me,partner:active,partnerName:callPartner,kind});
    callFeedback.textContent='Llamada iniciada. Esperando respuesta del otro miembro.';
   }catch(e){callFeedback.textContent='No se pudo iniciar: '+e.message;}
   finally{trigger.disabled=!callsAllowed;}
  };
  voiceCall.onclick=()=>initiateCall('audio',voiceCall);
  videoCall.onclick=()=>initiateCall('video',videoCall);
  callToolbar.append(voiceCall,videoCall,callFeedback);
  const notificationPanel=document.createElement('div');notificationPanel.className='private-direct-notification-settings';
  const notificationTitle=document.createElement('strong');notificationTitle.textContent='🔔 Avisos de esta conversación';
  const muteLabel=document.createElement('label');const muteBox=document.createElement('input');muteBox.type='checkbox';
  muteLabel.append(muteBox,document.createTextNode(' Silenciar notificaciones'));
  const popupLabel=document.createElement('label');const popupBox=document.createElement('input');popupBox.type='checkbox';popupBox.checked=true;
  popupLabel.append(popupBox,document.createTextNode(' Mostrar avisos'));
  const soundLabel=document.createElement('label');soundLabel.textContent='Sonido: ';
  const soundSelect=document.createElement('select');soundSelect.setAttribute('aria-label','Sonido de esta conversación');
  for(const [value,label] of [['inherit','🎼 Usar sonido de Mi cuenta'],['anime_sakura','🌸 Sakura'],['anime_powerup','⚡ Power Up'],['anime_arcade','🎮 Arcade anime'],['anime_starlight','✨ Estrellas'],['message','🎵 Clásico'],['gift','✨ Mágico'],['comment','🎮 Arcade clásico'],['follow','🌸 Suave clásico'],['off','🔇 Sin sonido']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;soundSelect.append(option);
  }
  soundLabel.append(soundSelect);
  const notificationStatus=document.createElement('small');notificationStatus.setAttribute('role','status');
  notificationStatus.textContent='Los sonidos también respetan tus ajustes generales y No molestar.';
  const notificationSave=async()=>{
   const state={user_id:me,partner_id:active,muted:muteBox.checked,popup_enabled:popupBox.checked,sound:soundSelect.value};
   for(const el of [muteBox,popupBox,soundSelect])el.disabled=true;
   const {error}=await sb.from('member_private_chat_notifications').upsert(state,{onConflict:'user_id,partner_id'});
   notificationStatus.textContent=error?'⚠️ No se guardaron los avisos: '+error.message:'✅ Preferencias de esta conversación guardadas.';
   for(const el of [muteBox,popupBox,soundSelect])el.disabled=false;
   if(error)loadPrivateChatNotifications?.().catch(console.warn);
  };
  muteBox.onchange=notificationSave;popupBox.onchange=notificationSave;soundSelect.onchange=notificationSave;
  loadPrivateChatNotifications=async()=>{
   const {data,error}=await sb.from('member_private_chat_notifications').select('muted,popup_enabled,sound')
    .eq('user_id',me).eq('partner_id',active).maybeSingle();
   if(error){notificationStatus.textContent='⚠️ '+error.message;return;}
   if(!notificationPanel.isConnected)return;
   muteBox.checked=data?.muted===true;
   popupBox.checked=data?.popup_enabled!==false;
   soundSelect.value=data?.sound||'inherit';
  };
  notificationPanel.append(notificationTitle,muteLabel,popupLabel,soundLabel,notificationStatus);
  const giftSection=document.createElement('section');giftSection.className='private-direct-gift-controls';
  const giftToggle=document.createElement('button');giftToggle.type='button';giftToggle.className='outline-btn mini';giftToggle.textContent='🎁 Regalo anime';
  giftToggle.disabled=!callsAllowed;
  const giftPicker=document.createElement('div');giftPicker.className='private-direct-gift-options';giftPicker.hidden=true;
  const giftFeedback=document.createElement('small');giftFeedback.setAttribute('role','status');
  const availableGifts=[['sakura','🌸','Flores de Sakura'],['star','⭐','Estrella mágica'],['dragon','🐲','Dragón anime'],['heart','💖','Corazón kawaii'],['crystal','💎','Cristal celestial']];
  for(const [code,emoji,name] of availableGifts){
   const gift=document.createElement('button');gift.type='button';gift.textContent=emoji+' '+name;
   gift.onclick=async()=>{
    for(const item of giftPicker.querySelectorAll('button'))item.disabled=true;
    giftFeedback.textContent='Enviando '+name+'…';
    const {error}=await sb.from('member_private_chat_gifts').insert({sender_id:me,recipient_id:active,gift_code:code});
    if(error){giftFeedback.textContent='No se pudo enviar el regalo: '+error.message;for(const item of giftPicker.querySelectorAll('button'))item.disabled=false;return;}
    giftFeedback.textContent='✅ '+name+' enviado (regalo decorativo, sin coste de puntos).';
    giftPicker.hidden=true;giftToggle.setAttribute('aria-expanded','false');
    await refreshLivePrivateConversation();
   };
   giftPicker.append(gift);
  }
  giftToggle.setAttribute('aria-expanded','false');
  giftToggle.onclick=()=>{
   giftPicker.hidden=!giftPicker.hidden;
   giftToggle.setAttribute('aria-expanded',String(!giftPicker.hidden));
  };
  const giftNote=document.createElement('small');giftNote.textContent='Regalos decorativos gratuitos: no descuentan puntos ni modifican tu inventario.';
  giftSection.append(giftToggle,giftPicker,giftNote,giftFeedback);
  const callHistorySection=document.createElement('section');callHistorySection.className='private-direct-history';
  const callHistoryToggle=document.createElement('button');callHistoryToggle.type='button';callHistoryToggle.className='private-direct-history-toggle';
  callHistoryToggle.textContent='📅 Historial de llamadas';callHistoryToggle.setAttribute('aria-expanded','false');
  const callHistoryList=document.createElement('div');callHistoryList.className='private-direct-history-list';callHistoryList.hidden=true;
  const renderCallHistory=async()=>{
   callHistoryList.replaceChildren();
   const loading=document.createElement('p');loading.textContent='Consultando llamadas…';callHistoryList.append(loading);
   const {data:records,error}=await sb.from('member_private_calls')
    .select('id,caller_id,callee_id,kind,status,created_at,updated_at,accepted_at,ended_at,answer')
    .or('caller_id.eq.'+active+',callee_id.eq.'+active)
    .order('created_at',{ascending:false}).limit(50);
   if(!callHistoryList.isConnected||callHistoryList.hidden)return;
   callHistoryList.replaceChildren();
   if(error){const warning=document.createElement('p');warning.textContent='No se pudo cargar el historial: '+error.message;callHistoryList.append(warning);return;}
   if(!records?.length){const empty=document.createElement('p');empty.textContent='Todavía no hay llamadas con este miembro.';callHistoryList.append(empty);return;}
   for(const record of records){
    const outgoing=record.caller_id===me;
    const incomingMissed=!outgoing&&((record.status==='ended'&&!record.answer)||(record.status==='ringing'&&Date.now()-new Date(record.created_at).getTime()>180000));
    const call=document.createElement('article');call.className='private-direct-history-row'+(incomingMissed?' is-missed':'');
    const type=document.createElement('span');type.textContent=(record.kind==='video'?'📹 Videollamada':'📞 Voz')+' · '+(outgoing?'Saliente':'Entrante');
    const timing=document.createElement('small');timing.textContent=new Date(record.created_at).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'});
    let detail='';const ended=record.ended_at||((record.status==='ended'||record.status==='declined')?record.updated_at:null);
    if(record.status==='declined')detail='🚫 Rechazada';
    else if(!record.answer&&(record.status==='ended'||incomingMissed))detail=incomingMissed?'📵 Perdida':'📵 Sin respuesta';
    else if(record.status==='ringing')detail='📲 Sonando';
    else if(record.status==='active')detail='🟢 En curso';
    else if(record.accepted_at&&ended){
     const secs=Math.max(0,Math.round((new Date(ended).getTime()-new Date(record.accepted_at).getTime())/1000));
     detail='✅ Duración '+Math.floor(secs/60)+' min '+String(secs%60).padStart(2,'0')+' s';
    }else detail='✅ Finalizada · duración anterior no registrada';
    const status=document.createElement('small');status.textContent=detail;
    call.append(type,timing,status);callHistoryList.append(call);
   }
  };
  callHistoryToggle.onclick=()=>{
   const visible=callHistoryList.hidden;
   callHistoryList.hidden=!visible;
   callHistoryToggle.setAttribute('aria-expanded',String(visible));
   if(visible)renderCallHistory().catch(err=>{callHistoryList.textContent='Error del historial: '+err.message;});
  };
  callHistorySection.append(callHistoryToggle,callHistoryList);
  chatExtras.append(callToolbar,notificationPanel,giftSection,callHistorySection);
  const birthdayBanner=document.createElement('section');birthdayBanner.className='private-chat-birthday-banner';birthdayBanner.hidden=true;
  const birthdayHeading=document.createElement('strong');birthdayHeading.textContent='🎂 Cumpleaños anime';
  const birthdayNote=document.createElement('p');
  const birthdayActions=document.createElement('div');birthdayActions.className='private-chat-birthday-actions';
  const birthdayStyle=document.createElement('select');birthdayStyle.setAttribute('aria-label','Estilo de tarjeta anime');
  for(const [value,label] of [['sakura','🌸 Sakura'],['star','⭐ Estrella'],['gaming','🎮 Gamer']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;birthdayStyle.append(option);
  }
  const birthdaySend=document.createElement('button');birthdaySend.type='button';birthdaySend.textContent='💌 Enviar tarjeta anime';
  const birthdaySendStatus=document.createElement('small');birthdaySendStatus.setAttribute('role','status');
  birthdayActions.append(birthdayStyle,birthdaySend,birthdaySendStatus);
  birthdayBanner.append(birthdayHeading,birthdayNote,birthdayActions);
  const dateInMadrid=()=>{
   const fields=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',day:'numeric',month:'numeric'})
    .formatToParts(new Date());
   return {day:Number(fields.find(p=>p.type==='day')?.value),month:Number(fields.find(p=>p.type==='month')?.value)};
  };
  birthdaySend.onclick=async()=>{
   if(!publicIds.has(active)||blockedByMe.has(active)||blockedMe.has(active))return;
   birthdaySend.disabled=true;birthdaySendStatus.textContent='Enviando felicitación…';
   const {error}=await sb.from('member_direct_messages').insert({
    sender_id:me,recipient_id:active,body:'🎂',
    message_kind:'birthday',birthday_style:birthdayStyle.value
   });
   if(error){birthdaySend.disabled=false;birthdaySendStatus.textContent='No se pudo enviar: '+error.message;return;}
   birthdaySendStatus.textContent='✅ Tarjeta enviada. ¡Felicidades!';
   await loadPrivateMessages();
  };
  loadPartnerBirthday=async()=>{
   if(blockedByMe.has(active)||blockedMe.has(active))return;
   const {data,error}=await sb.from('member_chat_birthday_preferences')
    .select('birth_day,birth_month,share_birthday').eq('user_id',active).maybeSingle();
   if(error){console.warn('Cumpleaños del contacto:',error.message);return;}
   if(!birthdayBanner.isConnected||!data?.share_birthday)return;
   birthdayBanner.hidden=false;
   const today=dateInMadrid();
   const isBirthday=data.birth_day===today.day&&data.birth_month===today.month;
   const monthNames=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
   birthdayNote.textContent=isBirthday?'🎉 ¡Hoy es el cumpleaños de '+(names.get(active)||'este miembro')+'! Elige una tarjeta especial para felicitarle.':
    '🎈 Su cumpleaños es el '+data.birth_day+' de '+monthNames[data.birth_month-1]+'. Las tarjetas estarán disponibles ese día.';
   const alreadySent=items.some(m=>m.sender_id===me&&m.recipient_id===active&&m.message_kind==='birthday'&&new Date(m.created_at).toLocaleDateString('en-GB',{timeZone:'Europe/Madrid'})===new Date().toLocaleDateString('en-GB',{timeZone:'Europe/Madrid'}));
   birthdayActions.hidden=!isBirthday||alreadySent||!publicIds.has(active);
   if(alreadySent)birthdaySendStatus.textContent='✅ Ya has enviado tu felicitación de hoy.';
  };
  panel.append(chatHeader,chatExtras,birthdayBanner,blockControls);
  const searchWrap=document.createElement('div');searchWrap.className='private-chat-search';
  const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='🔎 Buscar mensajes en esta conversación…';searchInput.setAttribute('aria-label','Buscar mensajes en esta conversación');
  const searchClear=document.createElement('button');searchClear.type='button';searchClear.textContent='Limpiar';searchClear.hidden=true;
  const searchCount=document.createElement('small');searchCount.setAttribute('role','status');searchCount.setAttribute('aria-live','polite');
  searchWrap.append(searchInput,searchClear,searchCount);
  const history=document.createElement('div');history.className='messages-history';
  const conversation=items.filter(m=>(m.sender_id===me&&m.recipient_id===active)||(m.recipient_id===me&&m.sender_id===active)).reverse();
  const conversationGifts=gifts.filter(g=>(g.sender_id===me&&g.recipient_id===active)||(g.recipient_id===me&&g.sender_id===active));
  if(conversation.some(m=>m.sender_id===active&&m.recipient_id===me&&!m.is_read&&!m.deleted_at))unreadPartnerToMark=active;
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
  let previousMessageDay='';
  for(const m of conversation){
   const dateObj=new Date(m.created_at);
   const day=dateObj.toDateString();
   if(day!==previousMessageDay){
    previousMessageDay=day;
    const separator=document.createElement('div');separator.className='private-chat-day-divider';separator.setAttribute('role','separator');
    const today=new Date(),yesterday=new Date(today);yesterday.setDate(today.getDate()-1);
    separator.textContent=day===today.toDateString()?'Hoy':day===yesterday.toDateString()?'Ayer':dateObj.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
    history.append(separator);
   }
   const bubble=document.createElement('div');bubble.className='message-bubble'+(m.sender_id===me?' mine':'');
   if(m.message_kind==='birthday')bubble.classList.add('private-chat-birthday-card','private-chat-birthday-'+m.birthday_style);
   const text=document.createElement('p');if(m.deleted_at){text.textContent='Mensaje eliminado';text.className='private-chat-deleted';}else renderChatSpoilerText(text,m.body);
   const date=document.createElement('small');date.textContent=new Date(m.created_at).toLocaleString('es-ES');
   if(m.reply_to_id){const original=conversationById.get(m.reply_to_id);const quote=document.createElement('div');quote.className='private-chat-reply-quote';quote.textContent=!original?'↪ Mensaje anterior':original.deleted_at?'↪ Mensaje eliminado':'↪ '+(original.sender_id===me?'Tú: ':'Miembro: ')+(chatSpoilerPreview(original.body?.trim())|| (original.image_path?'📷 Imagen':original.audio_path?'🎤 Audio':'Mensaje'));if(original){quote.title='Ir al mensaje original';quote.tabIndex=0;quote.setAttribute('role','button');const jump=()=>{const target=history.querySelector('[data-message-id="'+original.id+'"]');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('private-chat-highlight');setTimeout(()=>target.classList.remove('private-chat-highlight'),1800);}};quote.onclick=jump;quote.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jump();}};}bubble.append(quote);}
   if(m.message_kind==='birthday'&&!m.deleted_at){
    const decoration=document.createElement('div');decoration.className='private-chat-birthday-decoration';
    decoration.textContent=m.birthday_style==='gaming'?'🎮 🎂 🏆':m.birthday_style==='star'?'⭐ 🎂 ✨':'🌸 🎂 🌸';
    decoration.setAttribute('aria-hidden','true');bubble.append(decoration);
   }
   bubble.append(text);
   if(!m.deleted_at){
    if(m.view_once&&m.image_path){
     const once=document.createElement('div');once.className='chat-view-once-message';
     if(m.sender_id===me)once.textContent='👁️ Imagen de una sola vista enviada';
     else if(m.view_once_opened_at)once.textContent='✓ Imagen vista · no disponible';
     else{
      const open=document.createElement('button');open.type='button';open.className='chat-view-once-open';
      open.textContent='👁️ Abrir imagen · una sola vista';
      open.onclick=()=>openOneTimeChatPhoto('direct',m.id,open,loadPrivateMessages);
      once.append(open);
     }
     bubble.append(once);
    }else{
    const paths=[m.image_path,...(Array.isArray(m.image_paths)?m.image_paths:[])].filter(Boolean);
    if(paths.length){
     const gallery=document.createElement('div');gallery.className='private-chat-gallery'+(paths.length>1?' is-multi':'');
     gallery.setAttribute('aria-label',paths.length+' imagen'+(paths.length===1?'':'es')+' del mensaje');
     for(const [i,path] of paths.entries()){
      const photo=document.createElement('img');photo.className='private-chat-photo';photo.alt='Imagen '+(i+1)+' de '+paths.length;photo.loading='lazy';
      gallery.append(photo);
      sb.storage.from('private-chat-images').createSignedUrl(path,3600).then(({data})=>{
       if(!photo.isConnected)return;
       if(data?.signedUrl){
        photo.src=data.signedUrl;photo.tabIndex=0;photo.setAttribute('role','button');photo.setAttribute('aria-label','Ampliar imagen '+(i+1));
        photo.onclick=()=>openPrivateChatLightbox(data.signedUrl);
        photo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPrivateChatLightbox(data.signedUrl);}};
       }else photo.alt='No se pudo cargar la imagen '+(i+1);
      }).catch(()=>{photo.alt='No se pudo cargar la imagen '+(i+1);});
     }
     bubble.append(gallery);
    }
    }
   }
   if(!m.deleted_at&&m.audio_path){
    const voicePlayer=createPrivateVoicePlayer('Mensaje de voz');bubble.append(voicePlayer.root);
    sb.storage.from('private-chat-audio').createSignedUrl(m.audio_path,3600).then(({data,error})=>{
     if(!voicePlayer.root.isConnected)return;
     if(data?.signedUrl)voicePlayer.setSource(data.signedUrl);
     else voicePlayer.setError('No se pudo cargar el mensaje de voz.');
    }).catch(()=>{if(voicePlayer.root.isConnected)voicePlayer.setError('No se pudo cargar el mensaje de voz.');});
   }
   bubble.append(date);
   if(m.expires_at&&!m.deleted_at){
    const expires=document.createElement('small');expires.className='private-chat-expiry';
    expires.textContent='⏳ Temporal · desaparece '+new Date(m.expires_at).toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    bubble.append(expires);
   }
   if(m.edited_at&&!m.deleted_at){const edited=document.createElement('small');edited.className='private-chat-edited';edited.textContent=' · Editado';edited.title='Editado el '+new Date(m.edited_at).toLocaleString('es-ES');bubble.append(edited);}
   if(m.sender_id===me&&!m.deleted_at){
    const receipt=document.createElement('small');receipt.className='message-read-receipt'+(m.is_read?' is-read':'');receipt.textContent=m.is_read?'✓✓ Leído':'✓ Enviado';receipt.setAttribute('aria-label',m.is_read?'Mensaje leído':'Mensaje enviado');bubble.append(receipt);
    if(m.body?.trim()&&m.message_kind!=='birthday'){
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
     const {data:deleted,error:deleteError}=await sb.from('member_direct_messages').update({body:'',image_path:null,image_paths:[],audio_path:null,deleted_at:new Date().toISOString()}).eq('id',m.id).eq('sender_id',me).is('deleted_at',null).select('id');
     if(deleteError||!deleted?.length){alert('No se pudo eliminar el mensaje: '+(deleteError?.message||'No tienes permiso.'));remove.disabled=false;remove.textContent='🗑️ Eliminar';return;}
     const cleanup=[];
     const imageFiles=[m.image_path,...(Array.isArray(m.image_paths)?m.image_paths:[])].filter(Boolean);
     if(imageFiles.length)cleanup.push(sb.storage.from(m.view_once?'view-once-chat-images':'private-chat-images').remove(imageFiles));
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
   bubble.dataset.messageId=m.id;bubble.dataset.chatTime=m.created_at;history.append(bubble);
  }
  if(conversationGifts.length){
   const giftDescriptions={
    sakura:['🌸','Flores de Sakura'],star:['⭐','Estrella mágica'],dragon:['🐲','Dragón anime'],
    heart:['💖','Corazón kawaii'],crystal:['💎','Cristal celestial']
   };
   for(const gift of conversationGifts){
    const [emoji,name]=giftDescriptions[gift.gift_code]||['🎁','Regalo anime'];
    const giftBubble=document.createElement('article');
    giftBubble.className='message-bubble private-direct-gift-bubble'+(gift.sender_id===me?' mine':'');
    giftBubble.dataset.giftId=gift.id;giftBubble.dataset.giftName=name;giftBubble.dataset.chatTime=gift.created_at;
    const symbol=document.createElement('span');symbol.className='private-direct-gift-emoji';symbol.textContent=emoji;symbol.setAttribute('aria-hidden','true');
    const nameEl=document.createElement('strong');nameEl.textContent=(gift.sender_id===me?'Enviaste ':'Recibiste ')+name;
    const timeEl=document.createElement('small');timeEl.textContent=new Date(gift.created_at).toLocaleString('es-ES');
    giftBubble.append(symbol,nameEl,timeEl);history.append(giftBubble);
   }
   const dated=[...history.querySelectorAll('[data-chat-time]')].sort((a,b)=>new Date(a.dataset.chatTime)-new Date(b.dataset.chatTime));
   history.replaceChildren();
   let previousDay='';
   for(const node of dated){
    const date=new Date(node.dataset.chatTime);
    const day=date.toDateString();
    if(day!==previousDay){
     previousDay=day;
     const separator=document.createElement('div');separator.className='private-chat-day-divider';separator.setAttribute('role','separator');
     const now=new Date(),yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
     separator.textContent=day===now.toDateString()?'Hoy':day===yesterday.toDateString()?'Ayer':date.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
     history.append(separator);
    }
    history.append(node);
   }
  }
  const typingIndicator=document.createElement('p');typingIndicator.className='member-typing-indicator';typingIndicator.id='member-typing-indicator';typingIndicator.setAttribute('role','status');typingIndicator.setAttribute('aria-live','polite');
  const filterMessages=()=>{
   const query=searchInput.value.trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es');
   let found=0;
   for(const bubble of history.querySelectorAll('[data-message-id],[data-gift-id]')){
    const message=conversationById.get(bubble.dataset.messageId);
    const content=bubble.dataset.giftId?(bubble.dataset.giftName||'regalo anime'):message&&!message.deleted_at?(message.body||''):'';
    const normalized=content.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es');
    const match=!query||normalized.includes(query);
    bubble.hidden=!match;
    if(match)found++;
   }
   for(const separator of history.querySelectorAll('.private-chat-day-divider'))separator.hidden=!!query;
   searchCount.textContent=query?(found+' resultado'+(found===1?'':'s')+' entre '+(conversation.length+conversationGifts.length)+' mensajes y regalos cargados'):'';
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
   jumpButton.textContent=(pinnedMessage.sender_id===me?'Tú: ':'Miembro: ')+(chatSpoilerPreview(pinnedMessage.body?.trim())|| (pinnedMessage.image_path?'📷 Imagen':pinnedMessage.audio_path?'🎤 Audio':'Mensaje'));
   jumpButton.onclick=()=>{searchInput.value='';filterMessages();const target=history.querySelector('[data-message-id="'+pinnedMessage.id+'"]');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('private-chat-highlight');setTimeout(()=>target.classList.remove('private-chat-highlight'),1800);}};
   pinnedPanel.append(jumpButton);
  }
  const contactCard=document.createElement('section');contactCard.className='private-chat-contact-card';
  const contactCardHeading=document.createElement('div');contactCardHeading.className='private-chat-contact-heading';
  const contactAvatar=document.createElement('span');contactAvatar.className='private-chat-contact-avatar';
  const contactProfile=partnerProfiles.get(active);
  if(contactProfile?.avatar_url){
   const img=document.createElement('img');img.src=contactProfile.avatar_url;img.alt='';img.loading='lazy';img.onerror=()=>{img.remove();contactAvatar.textContent=(names.get(active)||'M').slice(0,1);};
   contactAvatar.append(img);
  }else contactAvatar.textContent=(names.get(active)||'M').slice(0,1);
  const contactIdentity=document.createElement('div');contactIdentity.className='private-chat-contact-identity';
  const contactName=document.createElement('strong');contactName.textContent=names.get(active)||'Miembro';
  const contactSubtitle=document.createElement('small');contactSubtitle.textContent='👤 Ficha privada del contacto · tus mensajes importantes';
  contactIdentity.append(contactName,contactSubtitle);
  const publicLink=document.createElement('a');publicLink.href='#/perfil?id='+encodeURIComponent(active);
  publicLink.className='outline-btn mini';publicLink.textContent='Ver perfil';publicLink.hidden=!publicIds.has(active);
  contactCardHeading.append(contactAvatar,contactIdentity,publicLink);
  const importantHeading=document.createElement('strong');importantHeading.className='private-chat-important-label';
  importantHeading.textContent='📌 Destacados de este contacto';
  const importantList=document.createElement('div');importantList.className='private-chat-contact-highlights';
  if(!pinnedMessages.length){
   const note=document.createElement('small');note.textContent='Pulsa 📌 Fijar en un mensaje para destacarlo aquí. Solo tú puedes ver esta lista.';
   importantList.append(note);
  }else for(const pinnedMessage of [...pinnedMessages].reverse().slice(0,4)){
   const summary=document.createElement('button');summary.type='button';summary.className='private-chat-contact-highlight';
   const value=chatSpoilerPreview(pinnedMessage.body?.trim())||(pinnedMessage.image_path?'📷 Imagen':pinnedMessage.audio_path?'🎤 Audio':'Mensaje');
   summary.textContent=(pinnedMessage.sender_id===me?'Tú: ':'Contacto: ')+value.slice(0,110);
   summary.onclick=()=>{
    const target=history.querySelector('[data-message-id="'+pinnedMessage.id+'"]');
    if(!target)return;
    searchInput.value='';filterMessages();
    target.scrollIntoView({behavior:'smooth',block:'center'});
    target.classList.add('private-chat-highlight');
    setTimeout(()=>target.classList.remove('private-chat-highlight'),1800);
   };
   importantList.append(summary);
  }
  contactCard.append(contactCardHeading,importantHeading,importantList);
  panel.append(contactCard,pinnedPanel,searchWrap,history,typingIndicator);
  subscribePrivateTyping(me,active,typingIndicator);
  if(publicIds.has(active)&&!blockedByMe.has(active)&&!blockedMe.has(active)){
   const form=document.createElement('form');form.className='social-form messages-compose';
   const input=document.createElement('textarea');input.required=false;input.maxLength=2000;input.placeholder='Escribe tu mensaje privado…';input.setAttribute('aria-label','Mensaje privado');
   const draftKey=me+':'+active;input.value=privateChatDrafts.get(draftKey)||'';
   const button=document.createElement('button');button.className='gradient-btn mini';button.type='submit';button.textContent='Enviar mensaje';
    const spoilerToggle=createChatSpoilerToggle();
   const status=document.createElement('p');status.setAttribute('role','status');
   let replyToId=null;
   const replyPreview=document.createElement('div');replyPreview.className='private-chat-reply-preview';replyPreview.hidden=true;
   const replyText=document.createElement('span');const cancelReply=document.createElement('button');cancelReply.type='button';cancelReply.textContent='✕ Cancelar';cancelReply.onclick=()=>{replyToId=null;replyPreview.hidden=true;replyText.textContent='';};
   replyPreview.append(replyText,cancelReply);
   selectReply=message=>{replyToId=message.id;replyText.textContent='Respondiendo a '+(message.sender_id===me?'tu mensaje: ':'mensaje de miembro: ')+(chatSpoilerPreview(message.body?.trim())|| (message.image_path?'📷 Imagen':message.audio_path?'🎤 Audio':'Mensaje'));replyPreview.hidden=false;input.focus();};
   const imageInput=document.createElement('input');imageInput.type='file';imageInput.accept='image/jpeg,image/png,image/webp,image/gif';imageInput.multiple=true;imageInput.className='private-chat-image-input';imageInput.setAttribute('aria-label','Seleccionar hasta cinco imágenes para enviar');
   const imageLabel=document.createElement('label');imageLabel.className='private-chat-image-label';imageLabel.textContent='📷 Añadir hasta 5 imágenes';imageLabel.append(imageInput);
   const imagePreview=document.createElement('p');imagePreview.className='private-chat-image-preview';
   imageInput.onchange=()=>{
    const files=Array.from(imageInput.files||[]);
    imagePreview.textContent=files.length?files.length+' imagen'+(files.length===1?'':'es')+': '+files.map(f=>f.name).join(' · '):'';
    if(files.length>5)imagePreview.textContent+=' · ⚠️ Máximo 5 imágenes';
   };
   const viewOnceLabel=document.createElement('label');viewOnceLabel.className='chat-view-once-option';
   const viewOnceInput=document.createElement('input');viewOnceInput.type='checkbox';
   viewOnceLabel.append(viewOnceInput,document.createTextNode(' 👁️ Imagen de una sola vista'));
   const viewOnceHint=document.createElement('small');viewOnceHint.className='chat-view-once-hint';
   viewOnceHint.textContent='Solo una foto. El destinatario podrá abrirla una vez; no evita capturas de pantalla.';
   viewOnceLabel.append(viewOnceHint);
   viewOnceInput.onchange=()=>{
    imageInput.multiple=!viewOnceInput.checked;
    if(viewOnceInput.checked&&(imageInput.files?.length||0)>1){
     imageInput.value='';imagePreview.textContent='Selecciona una sola imagen para este envío.';
    }
   };
   const voiceButton=document.createElement('button');voiceButton.type='button';voiceButton.className='private-chat-voice-button';voiceButton.textContent='🎤 Grabar voz';
   const voiceStatus=document.createElement('span');voiceStatus.className='private-chat-voice-status';voiceStatus.setAttribute('role','status');
   const voicePreviewPlayer=createPrivateVoicePlayer('Vista previa de tu grabación');const voicePreviewPanel=voicePreviewPlayer.root;voicePreviewPanel.hidden=true;
   const discardVoice=document.createElement('button');discardVoice.type='button';discardVoice.textContent='Eliminar audio';discardVoice.hidden=true;
   let voiceBlob=null,voiceMime='',voiceRecorder=null,voiceStream=null,voiceTimer=null,voiceUrl=null;
   const stopVoice=()=>{if(voiceRecorder?.state==='recording')voiceRecorder.stop();};
   const resetVoice=()=>{voiceBlob=null;voiceMime='';voicePreviewPlayer.reset();if(voiceUrl)URL.revokeObjectURL(voiceUrl);voiceUrl=null;voicePreviewPanel.hidden=true;discardVoice.hidden=true;voiceStatus.textContent='';};
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
      if(blob.size>0&&blob.size<=10485760){voiceBlob=blob;voiceMime=type;voiceUrl=URL.createObjectURL(blob);voicePreviewPlayer.setSource(voiceUrl);voicePreviewPlayer.setDurationHint(Math.ceil((Date.now()-started)/1000));voicePreviewPanel.hidden=false;discardVoice.hidden=false;voiceStatus.textContent='Audio listo para enviar';}
      else voiceStatus.textContent='La grabación está vacía o supera los 10 MB.';
     };
     voiceRecorder.start(250);voiceButton.textContent='⏹ Detener grabación';
     voiceStatus.textContent='Grabando… 0 s';
     voiceTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);voiceStatus.textContent='Grabando… '+seconds+' s';if(seconds>=90)stopVoice();},500);
    }catch(err){voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;voiceStatus.textContent='No se pudo acceder al micrófono. Comprueba sus permisos.';}
   };
   const quickEmoji=document.createElement('div');quickEmoji.className='private-chat-quick-emoji';
   quickEmoji.setAttribute('aria-label','Insertar emoji en tu mensaje');
   for(const emoji of ['😊','❤️','😂','🔥','👍','🎮','🌸']){
    const shortcut=document.createElement('button');shortcut.type='button';shortcut.textContent=emoji;shortcut.setAttribute('aria-label','Insertar '+emoji);
    shortcut.onclick=()=>{
     const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;
     input.setRangeText(emoji,start,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
    };
    quickEmoji.append(shortcut);
   }
   const quickReplySection=document.createElement('div');quickReplySection.className='private-chat-quick-replies';
   const quickReplyTitle=document.createElement('small');quickReplyTitle.textContent='💬 Respuestas rápidas';
   quickReplySection.append(quickReplyTitle);
   for(const phrase of ['¡Hola! 👋','¿Jugamos? 🎮','¡Gracias! 💜','Ahora vuelvo ⏳','¡Qué bien! ✨']){
    const preset=document.createElement('button');preset.type='button';preset.textContent=phrase;
    preset.onclick=()=>{input.value=input.value.trim()?input.value.trimEnd()+' '+phrase:phrase;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();};
    quickReplySection.append(preset);
   }
   const tempLabel=document.createElement('label');tempLabel.className='private-chat-temporary-control';
   tempLabel.textContent='⏳ Duración del mensaje';
   const tempSelect=document.createElement('select');tempSelect.setAttribute('aria-label','Duración de tu próximo mensaje de texto');
   for(const [value,label] of [['','Siempre'],['300','5 minutos'],['3600','1 hora'],['86400','24 horas'],['604800','7 días']]){
    const option=document.createElement('option');option.value=value;option.textContent=label;tempSelect.append(option);
   }
   const tempNote=document.createElement('small');tempNote.textContent='Solo texto. Al caducar deja de mostrarse en el chat, pero no impide capturas de pantalla.';
   tempLabel.append(tempSelect,tempNote);
   const keyboardHelp=document.createElement('small');keyboardHelp.className='private-chat-keyboard-hint';
   keyboardHelp.textContent='Enter para enviar · Shift + Enter para una nueva línea';
   form.append(replyPreview,input,quickReplySection,quickEmoji,spoilerToggle,tempLabel,keyboardHelp,imageLabel,imagePreview,viewOnceLabel,voiceButton,voiceStatus,voicePreviewPanel,discardVoice,button,status);
   input.addEventListener('input',()=>{privateChatDrafts.set(draftKey,input.value);sendPrivateTyping(me,active);});
   input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
     e.preventDefault();
     if(!button.disabled)form.requestSubmit(button);
    }
   });
   form.onsubmit=async e=>{
    e.preventDefault();
    if(button.disabled)return;
    const body=input.value.trim(),files=Array.from(imageInput.files||[]);
     const outgoingBody=chatOutgoingText(body,spoilerToggle);
     if(outgoingBody.length>2000){status.textContent='El texto del spoiler es demasiado largo (máximo 2000 caracteres).';return;}
    const expires_in_seconds=tempSelect.value?Number(tempSelect.value):null;
    const view_once=viewOnceInput.checked;
    if(view_once&&(files.length!==1||voiceBlob||expires_in_seconds)){
     status.textContent='Para una sola vista selecciona exactamente una foto, sin audio ni temporizador.';return;
    }
    if(expires_in_seconds&&(!body||files.length||voiceBlob)){
     status.textContent='Los mensajes temporales deben contener solo texto. Quita los adjuntos o selecciona Siempre.';return;
    }
    if(voiceRecorder?.state==='recording'){status.textContent='Detén la grabación antes de enviar.';return;}
    if(!body&&!files.length&&!voiceBlob){status.textContent='Escribe un mensaje o selecciona una imagen.';return;}
    const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    if(files.length>5||files.some(file=>!allowed[file.type]||file.size>5242880)||files.reduce((sum,file)=>sum+file.size,0)>20971520){
     status.textContent='Máximo 5 imágenes JPG, PNG, WebP o GIF; hasta 5 MB cada una y 20 MB en total.';return;
    }
    button.disabled=true;status.textContent=files.length?'Subiendo imágenes…':'Enviando…';
    const uploadedImagePaths=[];let audio_path=null;
    const imageBucket=view_once?'view-once-chat-images':'private-chat-images';
    const cleanupUploaded=async()=>{
     const tasks=[];
     if(uploadedImagePaths.length)tasks.push(sb.storage.from(imageBucket).remove(uploadedImagePaths));
     if(audio_path)tasks.push(sb.storage.from('private-chat-audio').remove([audio_path]));
     if(tasks.length)await Promise.allSettled(tasks);
    };
    for(const [i,file] of files.entries()){
     status.textContent='Subiendo imagen '+(i+1)+' de '+files.length+'…';
     const path=me+'/'+active+'/'+crypto.randomUUID()+'.'+allowed[file.type];
     const {error:uploadError}=await sb.storage.from(imageBucket).upload(path,file,{contentType:file.type,upsert:false});
     if(uploadError){await cleanupUploaded();status.textContent='No se pudo subir la imagen: '+uploadError.message;button.disabled=false;return;}
     uploadedImagePaths.push(path);
    }
    if(voiceBlob){
     const ext=voiceMime==='audio/mp4'?'mp4':voiceMime==='audio/ogg'?'ogg':'webm';
     audio_path=me+'/'+active+'/'+crypto.randomUUID()+'.'+ext;
     status.textContent='Subiendo mensaje de voz…';
     const {error:audioError}=await sb.storage.from('private-chat-audio').upload(audio_path,voiceBlob,{contentType:voiceMime,upsert:false});
     if(audioError){await cleanupUploaded();status.textContent='No se pudo subir el audio: '+audioError.message;button.disabled=false;return;}
    }
    const image_path=uploadedImagePaths[0]||null,image_paths=uploadedImagePaths.slice(1);
    const {error:sendError}=await sb.from('member_direct_messages').insert({sender_id:me,recipient_id:active,body:outgoingBody||(view_once?'👁️ Imagen de una sola vista':''),image_path,image_paths,audio_path,reply_to_id:replyToId,expires_in_seconds,view_once});
    if(sendError){await cleanupUploaded();status.textContent='No se pudo enviar: '+sendError.message;button.disabled=false;}
    else{privateChatDrafts.delete(draftKey);await loadPrivateMessages();}
   };
   panel.append(form);
  }else{const p=document.createElement('p');p.textContent='Este miembro ya no tiene un perfil público; no puedes enviarle nuevos mensajes.';panel.append(p);}
 }
 wrapper.append(sidebar,panel);root.append(wrapper);
 loadMyChatActivity().catch(console.warn);
 loadMyBirthday().catch(console.warn);
 loadChatTheme?.().catch(console.warn);
 refreshPartnerActivity?.().catch(console.warn);
 loadPrivateChatNotifications?.().catch(console.warn);
 loadPartnerBirthday?.().catch(console.warn);
 if(active&&!blockedByMe.has(active)&&!blockedMe.has(active)&&panel.querySelector('.private-chat-personal-header'))showIncomingPrivateCall(me,active,names.get(active)||'Miembro',panel).catch(console.warn);
 privateChatActivityInterval=setInterval(()=>{
  if(!root.isConnected||!location.hash.startsWith('#/mensajes')){
   if(privateChatActivityInterval){clearInterval(privateChatActivityInterval);privateChatActivityInterval=null;}
   return;
  }
  if(document.visibilityState!=='visible')return;
  updateMyChatActivity().catch(console.warn);
  refreshPartnerActivity?.().catch(console.warn);
 },30000);
 if(unreadPartnerToMark&&document.visibilityState==='visible'){
  sb.from('member_direct_messages').update({is_read:true})
   .eq('recipient_id',me).eq('sender_id',unreadPartnerToMark).eq('is_read',false).is('deleted_at',null)
   .then(({error:readError})=>{
    if(readError)console.warn('No se pudieron marcar los mensajes como leídos:',readError.message);
    else{refreshPrivateMessageBadge(me);refreshNotificationBadge(me);}
   });
 }
 const visibleHistory=panel.querySelector('.messages-history');if(visibleHistory)visibleHistory.scrollTop=visibleHistory.scrollHeight;
 const nearestExpiration=Math.min(...items.filter(m=>m.expires_at).map(m=>new Date(m.expires_at).getTime()).filter(time=>time>Date.now()));
 if(Number.isFinite(nearestExpiration)){
  privateChatExpiryTimer=setTimeout(()=>{
   privateChatExpiryTimer=null;
   if(root.isConnected&&location.hash.startsWith('#/mensajes')){
    refreshPrivateMessageBadge(me).catch(console.warn);
    refreshLivePrivateConversation().catch(console.warn);
   }
  },Math.min(2147000000,Math.max(100,nearestExpiration-Date.now()+150)));
 }
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
 if(document.visibilityState!=='visible'||isNotificationQuietNow())return;
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
async function notifyPrivateConversationEvent(userId,partnerId,kind='message'){
 if(!userId||!partnerId||userId===partnerId)return;
 if(isNotificationQuietNow()||document.visibilityState!=='visible')return;
 const {data,error}=await sb.from('member_private_chat_notifications')
  .select('muted,popup_enabled,sound').eq('user_id',userId).eq('partner_id',partnerId).maybeSingle();
 if(error)console.warn('Preferencias de conversación:',error.message);
 if(data?.muted)return;
 const sound=data?.sound&&data.sound!=='inherit'?data.sound:((kind==='gift')?activeToastPreferences.gift_sound:activeToastPreferences.message_sound);
 if(activeToastPreferences.sound_enabled&&sound!=='off')playNotificationSound(sound);
 if(!liveAlertPreferences.notify_private_messages||!activeToastPreferences.popup_enabled||data?.popup_enabled===false)return;
 const href='#/mensajes?id='+encodeURIComponent(partnerId);
 if(kind==='call')showMemberLiveAlert('📞 Tienes una llamada individual entrante. Pulsa Ver para aceptar o rechazar.',href);
 else if(kind==='gift')showMemberLiveAlert('🎁 ¡Has recibido un regalo anime en tu chat!',href);
 else showMemberLiveAlert('💬 Has recibido un mensaje privado.',href);
}
let privateMessageRealtimeChannel=null;
let privateMessageRealtimeUserId=null;
function syncPrivateMessageRealtime(userId){
 if(privateMessageRealtimeUserId===userId&&privateMessageRealtimeChannel)return;
 if(privateMessageRealtimeChannel){sb.removeChannel(privateMessageRealtimeChannel);privateMessageRealtimeChannel=null;}
 privateMessageRealtimeUserId=userId||null;
 if(!userId)return;
 privateMessageRealtimeChannel=sb.channel('direct-message-alerts-'+userId)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_direct_messages',filter:'recipient_id=eq.'+userId},payload=>{
   refreshPrivateMessageBadge(userId);refreshNotificationBadge(userId);
   notifyPrivateConversationEvent(userId,payload.new?.sender_id,'message').catch(console.warn);
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
  })
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_private_chat_gifts',filter:'recipient_id=eq.'+userId},payload=>{
   notifyPrivateConversationEvent(userId,payload.new?.sender_id,'gift').catch(console.warn);
   refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_private_chat_gifts',filter:'sender_id=eq.'+userId},()=>{
   refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'member_private_calls',filter:'callee_id=eq.'+userId},payload=>{
   notifyPrivateConversationEvent(userId,payload.new?.caller_id,'call').catch(console.warn);
   refreshLivePrivateConversation();
  })
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'member_private_calls',filter:'callee_id=eq.'+userId},()=>{
   refreshLivePrivateConversation();
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

function openPrivateChatLightbox(src,onClose){
 const previous=document.activeElement;
 const overlay=document.createElement('div');overlay.className='private-chat-lightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Imagen ampliada del chat');
 const image=document.createElement('img');image.src=src;image.alt='Imagen del chat ampliada';
 const close=document.createElement('button');close.type='button';close.className='private-chat-lightbox-close';close.textContent='✕ Cerrar';close.setAttribute('aria-label','Cerrar imagen ampliada');
 const dismiss=()=>{document.removeEventListener('keydown',onKey);overlay.remove();if(previous?.isConnected)previous.focus();if(onClose)onClose();};
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}else if(e.key==='Tab'){e.preventDefault();close.focus();}};
 close.onclick=dismiss;overlay.onclick=e=>{if(e.target===overlay)dismiss();};
 overlay.append(image,close);document.body.append(overlay);document.addEventListener('keydown',onKey);close.focus();
}

async function openOneTimeChatPhoto(kind,messageId,button,refresh){
 if(button.disabled)return;
 const original=button.textContent;button.disabled=true;button.textContent='Abriendo imagen…';
 try{
  const {data:path,error}=await sb.rpc('open_chat_view_once',{p_kind:kind,p_message_id:messageId});
  if(error)throw error;
  if(!path){button.textContent='✓ Imagen ya vista o no disponible';return;}
  const {data:blob,error:downloadError}=await sb.storage.from('view-once-chat-images').download(path);
  if(downloadError||!blob){
   button.textContent='⚠️ Apertura consumida; no se pudo descargar.';
   return;
  }
  const localUrl=URL.createObjectURL(blob);
  button.textContent='✓ Imagen vista';
  openPrivateChatLightbox(localUrl,()=>{
   URL.revokeObjectURL(localUrl);
   if(typeof refresh==='function')refresh();
  });
 }catch(error){
  button.disabled=false;button.textContent=original;
  alert('No se pudo abrir la imagen: '+(error?.message||'Error de conexión'));
 }
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


async function initMemberGameLibrary(userId,section){
 const form=section.querySelector('#game-library-form'),list=section.querySelector('#game-library-list'),message=section.querySelector('#game-library-message');
 let filter='all',items=[];
 const labels={playing:'🎮 Jugando',completed:'🏆 Terminado',wishlist:'⭐ Quiero jugar'};
 function render(){
  list.replaceChildren();
  const visible=items.filter(item=>filter==='all'||item.status===filter);
  const summary=document.createElement('p');summary.className='game-library-summary';summary.textContent='Total: '+items.length+' · Jugando: '+items.filter(i=>i.status==='playing').length+' · Terminados: '+items.filter(i=>i.status==='completed').length+' · Quiero jugar: '+items.filter(i=>i.status==='wishlist').length;list.append(summary);
  if(!visible.length){const empty=document.createElement('p');empty.textContent='Todavía no tienes videojuegos en esta categoría.';list.append(empty);return;}
  visible.forEach(item=>{
   const card=document.createElement('article');card.className='game-library-card';
   const title=document.createElement('h4');title.textContent=item.title;
   const meta=document.createElement('p');meta.textContent=labels[item.status]+(item.platform?' · '+item.platform:'');
   card.append(title,meta);
   if(item.cover_url){const img=document.createElement('img');img.className='game-library-cover';img.src=item.cover_url;img.alt='Portada de '+item.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();card.prepend(img);}
   if(item.rating){const rating=document.createElement('p');rating.className='game-library-rating';rating.textContent='★'.repeat(item.rating)+'☆'.repeat(5-item.rating);card.append(rating);}
   if(item.review){const review=document.createElement('p');review.textContent='Reseña: '+item.review;card.append(review);}
   if(item.notes){const notes=document.createElement('p');notes.textContent=item.notes;card.append(notes);}
   const controls=document.createElement('div');controls.className='game-library-actions';
   const select=document.createElement('select');select.setAttribute('aria-label','Estado de '+item.title);
   Object.entries(labels).forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);});select.value=item.status;
   select.onchange=async()=>{select.disabled=true;const {error}=await sb.from('member_game_library').update({status:select.value,updated_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',userId);if(error){message.textContent='No se pudo actualizar: '+error.message;select.value=item.status;}else{item.status=select.value;message.textContent='Estado actualizado.';render();}select.disabled=false;};
   const remove=document.createElement('button');remove.type='button';remove.className='outline-btn mini';remove.textContent='Eliminar';remove.setAttribute('aria-label','Eliminar '+item.title);
   remove.onclick=async()=>{if(!confirm('¿Eliminar '+item.title+' de tu biblioteca?'))return;remove.disabled=true;const {error}=await sb.from('member_game_library').delete().eq('id',item.id).eq('user_id',userId);if(error){message.textContent='No se pudo eliminar: '+error.message;remove.disabled=false;}else{items=items.filter(x=>x.id!==item.id);message.textContent='Videojuego eliminado.';render();}};
   const edit=document.createElement('button');edit.type='button';edit.className='outline-btn mini';edit.textContent='Editar reseña y portada';
   edit.onclick=()=>{const editor=document.createElement('form');editor.className='game-library-editor';const cover=document.createElement('input');cover.type='url';cover.placeholder='URL HTTPS de portada';cover.value=item.cover_url||'';cover.setAttribute('aria-label','Portada');const rating=document.createElement('select');rating.setAttribute('aria-label','Valoración');rating.innerHTML='<option value="">Sin valorar</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'">'+n+' estrellas</option>').join('');rating.value=item.rating||'';const review=document.createElement('textarea');review.maxLength=1500;review.placeholder='Reseña';review.value=item.review||'';const save=document.createElement('button');save.type='submit';save.className='gradient-btn mini';save.textContent='Guardar';editor.append(cover,rating,review,save);editor.onsubmit=async e=>{e.preventDefault();const url=cover.value.trim();if(url&&!/^https:\/\/[^\s]+$/i.test(url)){message.textContent='La portada debe usar HTTPS.';return;}save.disabled=true;const payload={cover_url:url||null,rating:rating.value?Number(rating.value):null,review:review.value.trim()||null};const {error}=await sb.from('member_game_library').update(payload).eq('id',item.id).eq('user_id',userId);save.disabled=false;if(error){message.textContent='No se pudo guardar: '+error.message;return;}Object.assign(item,payload);message.textContent='Reseña y portada actualizadas.';render();};card.append(editor);edit.remove();};
   controls.append(select,edit,remove);card.append(controls);list.append(card);
  });
 }
 async function load(){const {data,error}=await sb.from('member_game_library').select('id,title,status,platform,notes,cover_url,rating,review,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(300);if(!section.isConnected)return;if(error){list.textContent='No se pudo cargar tu biblioteca: '+error.message;return;}items=data||[];render();}
 section.querySelectorAll('[data-game-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.gameFilter;section.querySelectorAll('[data-game-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
 form.onsubmit=async e=>{e.preventDefault();const title=form.querySelector('#game-library-title').value.trim(),status=form.querySelector('#game-library-status').value,platform=form.querySelector('#game-library-platform').value.trim(),notes=form.querySelector('#game-library-notes').value.trim();if(!title)return;const cover_url=form.querySelector('#game-library-cover').value.trim(),ratingValue=form.querySelector('#game-library-rating').value,review=form.querySelector('#game-library-review').value.trim();
 if(cover_url&&!/^https:\/\/[^\s]+$/i.test(cover_url)){message.textContent='La portada debe usar HTTPS.';return;}
 const button=form.querySelector('button[type="submit"]');button.disabled=true;message.textContent='Guardando…';const {data,error}=await sb.from('member_game_library').insert({user_id:userId,title,status,platform,notes,cover_url:cover_url||null,rating:ratingValue?Number(ratingValue):null,review:review||null}).select('id,title,status,platform,notes,cover_url,rating,review,created_at').single();button.disabled=false;if(error){message.textContent='No se pudo guardar: '+error.message;return;}items.unshift(data);form.reset();message.textContent='Videojuego añadido correctamente.';render();};
 await load();
}
