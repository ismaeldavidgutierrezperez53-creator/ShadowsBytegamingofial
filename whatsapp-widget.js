// Botón flotante de WhatsApp y configuración exclusiva del administrador.
const WHATSAPP_ICON='<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" fill="currentColor"><path d="M16 .8A15.1 15.1 0 0 0 3 23.6L.9 31l7.6-2A15.2 15.2 0 1 0 16 .8Zm0 27.6a12.3 12.3 0 0 1-6.3-1.7l-.5-.3-4.5 1.2 1.2-4.4-.3-.5A12.4 12.4 0 1 1 16 28.4Zm6.8-9.2c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2 0-.5 0-.7l-1.2-2.9c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.4 3.6 1.6 3.9c.2.2 2.7 4.2 6.6 5.8 1 .4 1.7.6 2.3.7 1 .1 2.2-.1 3-.8.9-.7 1.3-1.8 1.4-2.5.1-.6-.1-.7-.5-.9Z"/></svg>';
const css=document.createElement('style');css.textContent=`
#site-whatsapp-button{position:fixed;right:22px;bottom:22px;width:62px;height:62px;border-radius:50%;background:#25d366;color:white;display:flex;align-items:center;justify-content:center;z-index:9998;box-shadow:0 6px 24px #0007;transition:transform .2s,box-shadow .2s;text-decoration:none}
#site-whatsapp-button:hover{transform:scale(1.09);box-shadow:0 8px 28px #25d36680}
#site-whatsapp-button:focus-visible{outline:3px solid white;outline-offset:4px}
#site-whatsapp-button[hidden]{display:none!important}
@media(max-width:600px){#site-whatsapp-button{right:16px;bottom:16px;width:56px;height:56px}}
@media(prefers-reduced-motion:reduce){#site-whatsapp-button{transition:none}}
`;document.head.append(css);
const whatsappButton=document.createElement('a');whatsappButton.id='site-whatsapp-button';whatsappButton.hidden=true;whatsappButton.target='_blank';whatsappButton.rel='noopener noreferrer';whatsappButton.setAttribute('aria-label','Contactar por WhatsApp');whatsappButton.title='Escríbenos por WhatsApp';whatsappButton.innerHTML=WHATSAPP_ICON;document.body.append(whatsappButton);
async function refreshWhatsAppButton(){
 try{
  const {data,error}=await sb.from('site_social_links').select('url').eq('platform','WhatsApp').maybeSingle();
  if(error)throw error;
  const match=data?.url?.match(/^https:\/\/wa\.me\/([1-9]\d{7,14})$/);
  whatsappButton.hidden=!match;
  if(match)whatsappButton.href='https://wa.me/'+match[1];
  else whatsappButton.removeAttribute('href');
 }catch(error){whatsappButton.hidden=true;console.warn('WhatsApp no disponible:',error.message)}
}
async function initWhatsAppAdmin(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard||document.getElementById('whatsapp-admin-panel'))return;
 const section=document.createElement('section');section.className='admin-panel';section.id='whatsapp-admin-panel';
 section.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">CONTACTO</span><h2>WhatsApp flotante</h2><p>Configura el número que aparecerá en todas las páginas. Incluye el prefijo internacional, sin +, espacios ni guiones (ejemplo: 34600111222). Si lo dejas vacío, se oculta el botón.</p></div></div><form id="whatsapp-admin-form"><div class="admin-fields"><div class="admin-field"><label for="whatsapp-admin-number">Número de WhatsApp</label><input id="whatsapp-admin-number" type="tel" inputmode="tel" autocomplete="tel" placeholder="34600111222" maxlength="20"></div></div><div class="admin-form-actions"><button class="gradient-btn" type="submit">Guardar WhatsApp</button></div><p id="whatsapp-admin-message" role="status" aria-live="polite"></p></form>';
 dashboard.append(section);
 const input=section.querySelector('input'),message=section.querySelector('#whatsapp-admin-message'),button=section.querySelector('button');
 const {data,error}=await sb.from('site_social_links').select('url').eq('platform','WhatsApp').maybeSingle();
 if(error)message.textContent='No se pudo cargar el número: '+error.message;
 else input.value=data?.url?.replace(/^https:\/\/wa\.me\//,'')||'';
 section.querySelector('form').onsubmit=async event=>{
  event.preventDefault();
  const number=input.value.trim().replace(/[\s()+-]/g,'');
  if(number&&!/^[1-9]\d{7,14}$/.test(number)){message.textContent='Introduce un número internacional válido, por ejemplo 34600111222.';return}
  button.disabled=true;message.textContent='Guardando…';
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.app_metadata?.role!=='admin')throw Error('Solo el administrador puede cambiar el número.');
   const result=number?await sb.from('site_social_links').upsert({platform:'WhatsApp',url:'https://wa.me/'+number,updated_at:new Date().toISOString()}):await sb.from('site_social_links').delete().eq('platform','WhatsApp');
   if(result.error)throw result.error;
   message.textContent=number?'Número de WhatsApp guardado correctamente.':'Botón de WhatsApp desactivado.';
   await refreshWhatsAppButton();
  }catch(error){message.textContent='No se pudo guardar: '+error.message}
  finally{button.disabled=false}
 };
}
const previousWhatsAppInitAdmin=initAdmin;
initAdmin=async function(...args){const result=await previousWhatsAppInitAdmin.apply(this,args);await initWhatsAppAdmin();return result;};
refreshWhatsAppButton();
