// Redes sociales administradas manualmente desde Supabase.
const SOCIAL_PLATFORMS=['YouTube','Discord','Instagram','TikTok','Facebook','Twitch','X (Twitter)'];
const SOCIAL_ICONS={Discord:'M19.7 5.4a18 18 0 0 0-4.4-1.4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.4C1.5 9.5.7 13.5 1.1 17.5a18 18 0 0 0 5.4 2.7l1.2-1.9-1.7-.8.4-.3a15 15 0 0 0 11.2 0l.4.3-1.7.8 1.2 1.9a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.5-3.2-12.1zM8.5 15.2c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2zm7 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2z',Instagram:'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z',TikTok:'M14 2h4c0 3 2 5 5 5v4a9 9 0 0 1-5-1.5V16a7 7 0 1 1-7-7v4a3 3 0 1 0 3 3z',YouTube:'M23 7a3 3 0 0 0-2-2c-2-.5-16-.5-18 0a3 3 0 0 0-2 2c-.5 2-.5 8 0 10a3 3 0 0 0 2 2c2 .5 16 .5 18 0a3 3 0 0 0 2-2c.5-2 .5-8 0-10zM10 8l6 4-6 4z'};
const SOCIAL_COLORS={Discord:'#8b91ff',Instagram:'#ff82bf',TikTok:'#70eee4',YouTube:'#ff7373',Twitch:'#c3a0ff','X (Twitter)':'#e2e8f0',Facebook:'#82b6ff'};
function decorateSocialLinks(host){
 for(const a of host.querySelectorAll('a')){
  const platform=a.textContent.trim();if(!SOCIAL_PLATFORMS.includes(platform)||a.dataset.socialPlatform)continue;
  a.dataset.socialPlatform=platform;a.style.setProperty('--social-accent',SOCIAL_COLORS[platform]||'#eabf49');
  const path=SOCIAL_ICONS[platform];
  if(path){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);p.setAttribute('fill','currentColor');p.setAttribute('fill-rule','evenodd');svg.append(p);a.prepend(svg);}
  const record=()=>{if(typeof sb!=='undefined')sb.from('site_social_clicks').insert({platform}).then(({error})=>{if(error)console.warn('Social click:',error.message);},()=>{});};
  a.addEventListener('click',record);a.addEventListener('auxclick',e=>{if(e.button===1)record();});
 }
}
async function loadSocialStats(section){
 const host=section.querySelector('.social-click-stats');if(!host)return;
 host.textContent='Cargando estadísticas…';
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError||user?.app_metadata?.role!=='admin'){host.textContent='Estadísticas disponibles solo para administradores.';return;}
 const results=await Promise.all(SOCIAL_PLATFORMS.map(platform=>sb.from('site_social_clicks').select('id',{count:'exact',head:true}).eq('platform',platform)));
 if(results.some(x=>x.error)){host.textContent='No se pudieron cargar las estadísticas.';return;}
 const counts=results.map(x=>x.count||0);host.replaceChildren();
 const total=document.createElement('strong');total.textContent='Total de clics: '+counts.reduce((a,b)=>a+b,0);host.append(total);
 SOCIAL_PLATFORMS.forEach((platform,i)=>{const row=document.createElement('div');row.className='social-stat-row';const label=document.createElement('span');label.textContent=platform;const number=document.createElement('strong');number.textContent=counts[i];row.append(label,number);host.append(row);});
}
async function loadSiteSocialLinks(){
 const hosts=[...document.querySelectorAll('.social-links')];if(!hosts.length)return;hosts.forEach(decorateSocialLinks);if(typeof sb==='undefined'){for(const host of hosts)if(host.id==='sb-social-directory')host.textContent='Conexión no disponible. Recarga la página.';return;}
 let data,error;try{({data,error}=await sb.from('site_social_links').select('platform,url').abortSignal(AbortSignal.timeout(10000)));}catch(e){error=e;}
 if(error){for(const host of hosts)if(host.id==='sb-social-directory')host.textContent='No se pudieron cargar las redes sociales. Vuelve a intentarlo.';return;}
 for(const host of hosts){if(!host.isConnected)continue;
 host.replaceChildren();
 for(const platform of SOCIAL_PLATFORMS){
  const item=data?.find(row=>row.platform===platform);
  if(!item||!/^https:\/\/[^\s]+$/i.test(item.url))continue;
  const a=document.createElement('a');a.href=item.url;a.textContent=platform;a.target='_blank';a.rel='noopener noreferrer';host.append(a);
 }
 decorateSocialLinks(host);
 if(!host.children.length)host.textContent='Próximamente publicaremos nuestras redes sociales.';
 }
}
async function initSocialAdmin(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard||document.getElementById('social-admin-panel'))return;
 const section=document.createElement('section');section.className='admin-panel';section.id='social-admin-panel';
 section.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">CONFIGURACIÓN</span><h2>Redes sociales</h2><p>Pega manualmente los enlaces. Deja un campo vacío para ocultar esa red en la web.</p></div></div><form id="social-admin-form"><div class="admin-fields" id="social-admin-fields"></div><div class="admin-form-actions"><button class="gradient-btn" type="submit">Guardar redes sociales</button></div><p id="social-admin-message" role="status" aria-live="polite"></p></form>';
 dashboard.append(section);
 const stats=document.createElement('div');stats.className='social-stats-panel';stats.innerHTML='<h3>Estadísticas de redes sociales</h3><p>Clics registrados desde la web, no seguidores ni visitas confirmadas.</p><div class="social-click-stats" aria-live="polite"></div><button type="button" class="gradient-btn">Actualizar estadísticas</button>';section.append(stats);stats.querySelector('button').onclick=()=>loadSocialStats(section);loadSocialStats(section);
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
pages['/redes-sociales']=()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>🌐 Redes sociales</h1><p>Sigue a Shadows Byte Gaming Official en nuestras redes oficiales.</p></div><section class="section"><div id="sb-social-directory" class="social-links" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:14px" aria-live="polite">Cargando redes sociales…</div><p>Los enlaces se abren en una nueva pestaña.</p></section></section>`;
const previousSocialRender=render;
render=async function(...args){const result=await previousSocialRender.apply(this,args);await loadSiteSocialLinks();return result;};
const previousSocialInitAdmin=initAdmin;
initAdmin=async function(...args){const result=await previousSocialInitAdmin.apply(this,args);await initSocialAdmin();return result;};

// El router original conserva su listener de hashchange; observar el montaje real.
const socialDirectoryObserver=new MutationObserver(()=>{
 const host=document.getElementById('sb-social-directory');
 if(host&&!host.dataset.socialLoaded){host.dataset.socialLoaded='1';void loadSiteSocialLinks();}
});
socialDirectoryObserver.observe(app,{childList:true,subtree:true});
// Refrescar la vista inicial tras registrar las extensiones.
render();
