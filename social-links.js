// Redes sociales administradas manualmente desde Supabase.
const SOCIAL_PLATFORMS=['YouTube','Discord','Instagram','TikTok','Facebook','Twitch','X (Twitter)'];
async function loadSiteSocialLinks(){
 const host=document.querySelector('.social-links');if(!host||typeof sb==='undefined')return;
 const {data,error}=await sb.from('site_social_links').select('platform,url');
 if(error){host.textContent='Redes sociales temporalmente no disponibles.';return;}
 host.replaceChildren();
 for(const platform of SOCIAL_PLATFORMS){
  const item=data?.find(row=>row.platform===platform);
  if(!item||!/^https:\/\/[^\s]+$/i.test(item.url))continue;
  const a=document.createElement('a');a.href=item.url;a.textContent=platform;a.target='_blank';a.rel='noopener noreferrer';host.append(a);
 }
 if(!host.children.length)host.textContent='Próximamente publicaremos nuestras redes sociales.';
}
async function initSocialAdmin(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard||document.getElementById('social-admin-panel'))return;
 const section=document.createElement('section');section.className='admin-panel';section.id='social-admin-panel';
 section.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">CONFIGURACIÓN</span><h2>Redes sociales</h2><p>Pega manualmente los enlaces. Deja un campo vacío para ocultar esa red en la web.</p></div></div><form id="social-admin-form"><div class="admin-fields" id="social-admin-fields"></div><div class="admin-form-actions"><button class="gradient-btn" type="submit">Guardar redes sociales</button></div><p id="social-admin-message" role="status" aria-live="polite"></p></form>';
 dashboard.append(section);
 const fields=section.querySelector('#social-admin-fields');
 for(const platform of SOCIAL_PLATFORMS){
  const wrap=document.createElement('div');wrap.className='admin-field';
  const label=document.createElement('label');label.textContent=platform;
  const input=document.createElement('input');input.type='url';input.placeholder='https://...';input.dataset.platform=platform;input.setAttribute('aria-label','Enlace de '+platform);
  label.append(input);wrap.append(label);fields.append(wrap);
 }
 const msg=section.querySelector('#social-admin-message');
 const {data,error}=await sb.from('site_social_links').select('platform,url');
 if(error){msg.textContent='No se pudieron cargar los enlaces: '+error.message;return;}
 for(const input of fields.querySelectorAll('input'))input.value=data?.find(row=>row.platform===input.dataset.platform)?.url||'';
 section.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const button=section.querySelector('button[type=submit]');button.disabled=true;msg.textContent='Guardando…';
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.app_metadata?.role!=='admin')throw Error('Solo el administrador puede guardar enlaces.');
   for(const input of fields.querySelectorAll('input')){
    const platform=input.dataset.platform,url=input.value.trim();
    if(url&&!/^https:\/\/[^\s]+$/i.test(url))throw Error('El enlace de '+platform+' debe empezar por https://');
    const result=url?await sb.from('site_social_links').upsert({platform,url,updated_at:new Date().toISOString()}):await sb.from('site_social_links').delete().eq('platform',platform);
    if(result.error)throw result.error;
   }
   msg.textContent='Redes sociales guardadas correctamente.';
   await loadSiteSocialLinks();
  }catch(error){msg.textContent='Error al guardar: '+error.message}
  finally{button.disabled=false}
 };
}
const previousSocialRender=render;
render=function(...args){const result=previousSocialRender.apply(this,args);loadSiteSocialLinks();return result;};
const previousSocialInitAdmin=initAdmin;
initAdmin=async function(...args){const result=await previousSocialInitAdmin.apply(this,args);await initSocialAdmin();return result;};

// Refrescar la vista inicial tras registrar las extensiones.
render();
