/* Shadows Byte Gaming — Web Push setup (permission only after user click). */
(() => {
  'use strict';
  const ENDPOINT='https://nutoxlbdotcllwlshhhr.supabase.co/functions/v1/dispatch-web-push';
  const id='sb-webpush-settings';
  const supported=() => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && window.isSecureContext;
  const iosNotInstalled=() => /iPhone|iPad|iPod/i.test(navigator.userAgent)
    && !window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone;
  const currentUser=async()=>{
    if (typeof sb==='undefined'||!sb.auth) return null;
    const {data:{user}}=await sb.auth.getUser();
    return user||null;
  };
  const panel=()=>document.getElementById(id);
  const setStatus=(msg,state='')=>{
    const el=panel()?.querySelector('.sb-webpush-status');
    if(el){el.textContent=msg;el.dataset.state=state;}
  };
  const busy=(value)=>{
    panel()?.querySelectorAll('button').forEach(b=>{b.disabled=value;});
  };
  async function registration(create=false){
    if(create)return navigator.serviceWorker.register('./sw.js',{scope:'./'});
    return navigator.serviceWorker.getRegistration('./');
  }
  const decodeKey=(s)=>{
    const padded=s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4);
    const raw=atob(padded);
    return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
  };
  async function refresh(){
    if(!panel())return;
    if(!supported()){setStatus('Este navegador no admite avisos del sistema. Usa una conexión HTTPS y un navegador compatible.','error');return;}
    if(iosNotInstalled()){setStatus('En iPhone o iPad: comparte la web, pulsa Añadir a pantalla de inicio y ábrela desde su icono para activar las notificaciones.');return;}
    const user=await currentUser();
    if(!user){setStatus('Inicia sesión para activar los avisos en este dispositivo.');return;}
    if(Notification.permission==='denied'){setStatus('Los avisos están bloqueados. Debes permitirlos en los ajustes del navegador.','error');return;}
    const reg=await registration();
    const subscription=reg && await reg.pushManager.getSubscription();
    if(!subscription || Notification.permission!=='granted'){
      setStatus('Los avisos externos están desactivados. Pulsa Activar y acepta el permiso.');
      return;
    }
    // Un permiso del navegador no basta: el dispositivo debe estar registrado en Supabase.
    const {data:registered,error:registrationError}=await sb.from('member_web_push_subscriptions')
      .select('endpoint').eq('user_id',user.id).eq('endpoint',subscription.endpoint).maybeSingle();
    if(registrationError){
      setStatus('No se pudo verificar este dispositivo. Pulsa Activar para actualizar el registro.','error');
      return;
    }
    setStatus(registered
      ? '✅ Avisos del sistema activados en este dispositivo. También pueden llegar con la web cerrada.'
      : 'Tu navegador permite notificaciones, pero falta registrar este dispositivo. Pulsa Activar.',
      registered?'ok':'');
  }
  async function enable(){
    if(!supported())return refresh();
    if(iosNotInstalled())return refresh();
    /* Prompt immediately from the user gesture, before any network request. */
    let permission=Notification.permission;
    if(permission==='default') permission=await Notification.requestPermission();
    if(permission!=='granted'){setStatus('Debes permitir las notificaciones en el navegador para continuar.','error');return;}
    if(!await currentUser()){setStatus('Primero inicia sesión en tu cuenta.','error');return;}
    busy(true);
    try{
      const reg=await registration(true);
      const res=await fetch(ENDPOINT,{method:'GET',cache:'no-store'});
      if(!res.ok)throw new Error('No se ha podido obtener la clave de notificaciones.');
      const config=await res.json();
      if(!config.publicKey)throw new Error('Falta la clave pública del servidor.');
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});
      const keys=sub.toJSON().keys;
      if(!keys?.p256dh||!keys?.auth)throw new Error('El navegador no proporcionó las claves necesarias.');
      const user=await currentUser();
      if(!user)throw new Error('Tu sesión ha caducado. Inicia sesión de nuevo.');
      const {error}=await sb.from('member_web_push_subscriptions').upsert({
        endpoint:sub.endpoint,user_id:user.id,p256dh:keys.p256dh,auth:keys.auth,
        user_agent:navigator.userAgent.slice(0,500),updated_at:new Date().toISOString()
      },{onConflict:'endpoint'});
      if(error)throw error;
      setStatus('✅ Notificaciones activadas. Recibirás avisos del sistema en este ordenador o móvil.','ok');
    }catch(err){
      console.error('Web Push activation error:',err);
      setStatus('No se pudieron activar los avisos: '+(err?.message||'error desconocido'),'error');
    }finally{busy(false);}
  }
  async function disable(){
    busy(true);
    try{
      const reg=await registration();
      const sub=reg && await reg.pushManager.getSubscription();
      if(sub){
        const user=await currentUser();
        if(user){
          const {error}=await sb.from('member_web_push_subscriptions').delete()
            .eq('user_id',user.id).eq('endpoint',sub.endpoint);
          if(error)throw error;
        }
        await sub.unsubscribe();
      }
      setStatus('Avisos del sistema desactivados en este dispositivo.','ok');
    }catch(e){setStatus('No se pudo desactivar: '+(e?.message||'error desconocido'),'error');}
    finally{busy(false);}
  }
  async function test(){
    busy(true);
    try{
      const reg=await registration();
      const sub=reg && await reg.pushManager.getSubscription();
      if(!sub)throw new Error('Activa primero las notificaciones.');
      const {data,error}=await sb.functions.invoke('dispatch-web-push',{body:{type:'test'}});
      if(error)throw error;
      setStatus(data?.delivered>0
        ? '✅ Aviso de prueba enviado. Comprueba las notificaciones de tu sistema.'
        : 'No se ha entregado ningún aviso. Comprueba No molestar y los permisos del navegador.',
        data?.delivered>0?'ok':'error');
    }catch(err){setStatus('No se pudo enviar el aviso de prueba: '+(err?.message||'error desconocido'),'error');}
    finally{busy(false);}
  }
  function mount(){
    const notifications=document.getElementById('member-notifications');
    if(!notifications || panel())return;
    const root=document.createElement('section');
    root.id=id;root.className='sb-webpush-settings';
    root.innerHTML='<h2>🔔 Notificaciones en tu ordenador y móvil</h2>'
      +'<p>Recibe avisos de mensajes, seguidores y novedades incluso cuando no tengas la página abierta. Solo se activa si tú lo permites.</p>'
      +'<p class="sb-webpush-status" role="status" aria-live="polite">Comprobando el navegador…</p>'
      +'<div class="sb-webpush-actions"><button type="button" data-push="enable">🔔 Activar notificaciones</button>'
      +'<button type="button" data-push="test">🧪 Enviar prueba</button>'
      +'<button type="button" class="sb-webpush-disable" data-push="disable">Desactivar</button></div>';
    notifications.parentElement.insertBefore(root,notifications);
    root.querySelector('[data-push="enable"]').addEventListener('click',enable);
    root.querySelector('[data-push="test"]').addEventListener('click',test);
    root.querySelector('[data-push="disable"]').addEventListener('click',disable);
    refresh().catch(()=>setStatus('No se pudo comprobar el permiso del navegador.','error'));
  }
  /* The site replaces the #app contents on each hash-route render. */
  const start=()=>{
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(mount).observe(app,{childList:true,subtree:true});
    mount();
    window.addEventListener('hashchange',()=>queueMicrotask(mount));
    if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange){
      sb.auth.onAuthStateChange((event)=>{
        if(event==='SIGNED_OUT'){
          navigator.serviceWorker?.getRegistration('./').then(r=>r?.pushManager?.getSubscription()).then(s=>s?.unsubscribe()).catch(()=>{});
        }
        queueMicrotask(()=>refresh().catch(()=>{}));
      });
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
