/* Shadows Byte Gaming — Web Push setup (permission only after user click). */
(() => {
  'use strict';
  const ENDPOINT='https://nutoxlbdotcllwlshhhr.supabase.co/functions/v1/dispatch-web-push';
  const id='sb-webpush-settings';
  const supported=() => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && window.isSecureContext;
  const iosDevice=() => /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const installedApp=() => window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone===true;
  const iosNotInstalled=() => iosDevice() && !installedApp();
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
  let lastSync=0;
  let pendingSync=null;
  // Repara el registro existente sin volver a solicitar permiso o crear una suscripción.
  // En dispositivos nuevos, el usuario debe pulsar Activar expresamente.
  async function syncExisting(force=false){
    if(!supported() || Notification.permission!=='granted')return;
    if(!force && Date.now()-lastSync<60000)return;
    if(pendingSync)return pendingSync;
    pendingSync=(async()=>{
      const user=await currentUser();
      if(!user)return;
      const reg=await registration(true);
      const sub=await reg.pushManager.getSubscription();
      if(!sub)return;
      const keys=sub.toJSON().keys;
      if(!keys?.p256dh || !keys?.auth)return;
      const table=sb.from('member_web_push_subscriptions');
      const {data:record,error:readError}=await table.select('endpoint,p256dh,auth,updated_at')
        .eq('user_id',user.id).eq('endpoint',sub.endpoint).maybeSingle();
      if(readError)throw readError;
      // No reescribir la fila en cada visita; sólo reparar datos faltantes o caducados.
      const old=record?.updated_at ? Date.parse(record.updated_at) : 0;
      if(!record || record.p256dh!==keys.p256dh || record.auth!==keys.auth
         || !Number.isFinite(old) || Date.now()-old>7*86400000){
        const {error}=await table.upsert({
          endpoint:sub.endpoint,user_id:user.id,p256dh:keys.p256dh,auth:keys.auth,
          user_agent:navigator.userAgent.slice(0,500),updated_at:new Date().toISOString()
        },{onConflict:'endpoint'});
        if(error)throw error;
      }
      lastSync=Date.now();
    })().finally(()=>{pendingSync=null;});
    return pendingSync;
  }
  async function refresh(){
    if(!panel())return;
    if(iosNotInstalled()){
      setStatus('📱 Primero instala esta web en la pantalla de inicio y ábrela desde su icono. En iPhone o iPad las notificaciones solo se activan en la aplicación instalada.');
      const help=panel()?.querySelector('.sb-webpush-mobile-help');
      if(help)help.open=true;
      return;
    }
    if(!supported()){setStatus('Este navegador no admite avisos del sistema. Usa una conexión HTTPS y un navegador compatible.','error');return;}
    const user=await currentUser();
    if(!user){setStatus('Inicia sesión para activar los avisos en este dispositivo.');return;}
    if(Notification.permission==='denied'){setStatus('Los avisos están bloqueados. Debes permitirlos en los ajustes del navegador.','error');return;}
    try { await syncExisting(); }
    catch(error){
      console.warn('No se pudo sincronizar la suscripción push:',error);
      setStatus('El permiso existe, pero no se pudo recuperar el registro de este dispositivo. Pulsa Activar para intentarlo de nuevo.','error');
      return;
    }
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
    if(iosNotInstalled())return refresh();
    if(!supported())return refresh();
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
      lastSync=Date.now();
      setStatus('✅ Este dispositivo está registrado. Recibirás avisos push cuando esté cerrado, si el sistema permite las notificaciones.','ok');
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
      lastSync=0;
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
      const user=await currentUser();
      if(!user)throw new Error('Inicia sesión para enviar una prueba.');
      const {data:registered,error:registrationError}=await sb.from('member_web_push_subscriptions')
        .select('endpoint').eq('user_id',user.id).eq('endpoint',sub.endpoint).maybeSingle();
      if(registrationError||!registered)throw new Error('Primero activa las notificaciones en este dispositivo.');
      const {data,error}=await sb.functions.invoke('dispatch-web-push',{
        body:{type:'test',endpoint:sub.endpoint}
      });
      if(error)throw error;
      setStatus(data?.delivered>0
        ? '✅ Aviso de prueba enviado. Comprueba las notificaciones de tu sistema.'
        : 'No se ha entregado ningún aviso. Comprueba No molestar y los permisos del navegador.',
        data?.delivered>0?'ok':'error');
    }catch(err){setStatus('No se pudo enviar el aviso de prueba: '+(err?.message||'error desconocido'),'error');}
    finally{busy(false);}
  }
  async function delayedTest(){
    if(!supported()){setStatus('Tu navegador no admite avisos push externos.','error');return;}
    if(Notification.permission!=='granted'){
      setStatus('Activa primero las notificaciones y permite su uso en Android.','error');
      return;
    }
    busy(true);
    try{
      const reg=await registration();
      const sub=reg && await reg.pushManager.getSubscription();
      if(!sub)throw new Error('Primero activa las notificaciones en este dispositivo.');
      const user=await currentUser();
      if(!user)throw new Error('Inicia sesión antes de enviar la prueba.');
      const {data:registered,error:registrationError}=await sb.from('member_web_push_subscriptions')
        .select('endpoint').eq('user_id',user.id).eq('endpoint',sub.endpoint).maybeSingle();
      if(registrationError || !registered)
        throw new Error('Este dispositivo no está registrado. Pulsa Activar notificaciones.');
      const {data,error}=await sb.functions.invoke('dispatch-web-push',{
        body:{type:'test_delayed',endpoint:sub.endpoint}
      });
      if(error)throw error;
      if(!data?.scheduled)throw new Error(data?.error || 'No se pudo programar la prueba.');
      setStatus('✅ Prueba programada para 20 segundos. Cierra SB V2 en Windows o Android y comprueba las notificaciones del sistema. No cierres Chrome/Edge mediante Forzar detención.','ok');
    }catch(err){
      setStatus('No se pudo programar la prueba: '+(err?.message||'error desconocido'),'error');
    }finally{busy(false);}
  }
  function mount(){
    const notifications=document.getElementById('member-notifications');
    if(!notifications || panel())return;
    const root=document.createElement('section');
    root.id=id;root.className='sb-webpush-settings';
    root.innerHTML='<h2>🔔 Notificaciones en tu ordenador y móvil</h2>'
      +'<p>🔔 Avisos para toda la actividad importante de tu cuenta: seguidores, mensajes privados y grupales, llamadas y videollamadas, comentarios, Me gusta, regalos, noticias, encuestas, torneos, insignias, metas, premios y denuncias.</p>'
      +'<p>Los avisos pueden recibirse con la página cerrada en Android y Windows. Actívalos una vez en cada dispositivo e inicia sesión con la misma cuenta. Dependen de permisos, conexión, batería y modo No molestar.</p>'
      +'<p>🎵 <a href="#/sonidos" class="outline-btn mini">🎵 Abrir sonidos anime</a></p>'
      +'<p class="sb-webpush-status" role="status" aria-live="polite">Comprobando el navegador…</p>'
      +'<details class="sb-webpush-mobile-help"><summary>📱 Cómo activar las notificaciones en mi móvil</summary>'
      +'<div class="sb-webpush-mobile-steps"><h3>🤖 Android (Chrome)</h3>'
      +'<ol><li>Abre esta web en Chrome e inicia sesión.</li><li>Entra en Notificaciones y pulsa Activar notificaciones.</li><li>Permite las notificaciones cuando Chrome lo pregunte y pulsa Enviar prueba.</li><li>Para comprobar que llegan con la aplicación cerrada, pulsa Probar con la app cerrada y ciérrala antes de 20 segundos.</li><li>Si no llega nada, revisa Ajustes de Android → Aplicaciones → Shadows Byte (o Chrome) → Notificaciones, y comprueba No molestar y el ahorro de batería.</li></ol>'
      +'<h3>💻 Windows (Chrome o Edge)</h3>'
      +'<ol><li>Instala SB V2 desde el navegador y ábrela desde su icono.</li><li>Inicia sesión, entra en Notificaciones y pulsa Activar notificaciones.</li><li>Permite los avisos cuando Windows o el navegador lo soliciten, y usa Enviar prueba.</li><li>Para probar con la app cerrada, pulsa la prueba diferida y cierra la ventana de SB V2, sin cerrar el navegador a la fuerza.</li><li>Si no aparece, revisa Configuración de Windows → Sistema → Notificaciones, No molestar, y los permisos de notificaciones de Chrome/Edge.</li></ol>'
      +'<h3>🍎 iPhone o iPad</h3>'
      +'<ol><li>Abre esta web en Safari (iOS o iPadOS 16.4 o posterior).</li><li>Usa Compartir y elige Añadir a pantalla de inicio; activa Abrir como app si aparece.</li><li>Abre Shadows Byte desde el icono de inicio, inicia sesión y pulsa Activar notificaciones.</li><li>Acepta el permiso y pulsa Enviar prueba.</li></ol>'
      +'<p>Activa las notificaciones por separado en cada dispositivo. Si están bloqueadas, revisa los ajustes de notificaciones del teléfono.</p></div></details>'
      +'<div class="sb-webpush-actions"><button type="button" data-push="enable">🔔 Activar notificaciones</button>'
      +'<button type="button" data-push="test">🧪 Enviar prueba</button>'
      +'<button type="button" class="sb-webpush-delayed" data-push="delayed">📱💻 Probar con la app cerrada (20 s)</button>'
      +'<button type="button" data-push="repair">🔄 Comprobar y reparar este dispositivo</button>'
      +'<button type="button" class="sb-webpush-disable" data-push="disable">Desactivar</button></div>';
    notifications.parentElement.insertBefore(root,notifications);
    if((iosDevice() && !installedApp()) || /Android/i.test(navigator.userAgent)){
      root.querySelector('.sb-webpush-mobile-help').open=true;
    }
    root.querySelector('[data-push="enable"]').addEventListener('click',enable);
    root.querySelector('[data-push="test"]').addEventListener('click',test);
    root.querySelector('[data-push="delayed"]').addEventListener('click',delayedTest);
    root.querySelector('[data-push="repair"]').addEventListener('click',async()=>{
      busy(true);
      try{
        await syncExisting(true);
        await refresh();
      }catch(e){setStatus('No se pudo reparar: '+(e?.message||'error desconocido'),'error');}
      finally{busy(false);}
    });
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
    const resync=()=>{
      if(!supported() || Notification.permission!=='granted')return;
      syncExisting().then(()=>refresh()).catch(error=>{
        console.warn('Recuperación de avisos pendiente:',error);
        setStatus('No se pudo sincronizar este dispositivo. Abre Notificaciones y pulsa Comprobar y reparar.','error');
      });
    };
    window.addEventListener('focus',resync);
    window.addEventListener('online',resync);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)resync();});
    navigator.serviceWorker?.addEventListener('controllerchange',resync);
    navigator.serviceWorker?.addEventListener('message',event=>{
      if(event.data?.type==='sb-push-subscription-changed')resync();
    });
    if(typeof sb!=='undefined'&&sb.auth?.onAuthStateChange){
      sb.auth.onAuthStateChange((event)=>{
        if(event==='SIGNED_OUT'){
          navigator.serviceWorker?.getRegistration('./').then(r=>r?.pushManager?.getSubscription()).then(s=>s?.unsubscribe()).catch(()=>{});
        }
        if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED') {
          // No pedir permisos ni crear suscripciones durante la restauración de sesión.
          syncExisting().catch(error=>console.warn('Registro de avisos pendiente:',error));
        }
        queueMicrotask(()=>refresh().catch(()=>{}));
      });
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
