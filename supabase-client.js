// Shadows Byte Gaming Official V2 — public browser client
const SUPABASE_URL = 'https://nutoxlbdotcllwlshhhr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2Jdko8NdnlP8p_5YaArHaA_DzFN6iVE';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
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
 const result=signup?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});
 const message=document.getElementById('auth-message');
 if(result.error){message.textContent=result.error.message;return;}
 message.textContent=signup?'Registro recibido. Revisa tu correo si se requiere confirmación.':'Sesión iniciada correctamente.';
 if(!signup) setTimeout(()=>{location.hash='#/';},500);
}
async function logout(){await sb.auth.signOut();location.hash='#/auth';}

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
