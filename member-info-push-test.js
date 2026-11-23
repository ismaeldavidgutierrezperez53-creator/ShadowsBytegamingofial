/* Prueba segura de notificaciones de reacciones desde Mi Info. */
(() => {
  'use strict';
  const SELECTOR = '#account-profile .sb-member-info-own';
  const scriptElement = (tag, cls, text) => {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function mount() {
    if (location.hash.split('?')[0] !== '#/cuenta') return;
    const panel = document.querySelector(SELECTOR);
    if (!panel || panel.querySelector('.sb-info-push-test') || typeof sb === 'undefined') return;

    const block = scriptElement('div','sb-info-push-test');
    const button = scriptElement('button','outline-btn mini sb-info-push-test-button','🔔 Probar aviso de reacción');
    button.type = 'button';
    const status = scriptElement('p','sb-info-push-test-status',
      'Envía una simulación únicamente a este dispositivo, sin necesitar otra cuenta.');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    block.append(button,status);
    (panel.querySelector('.sb-member-info-actions') || panel).after(block);

    button.addEventListener('click',async () => {
      if (button.disabled) return;
      button.disabled = true;
      status.textContent = 'Comprobando notificaciones del dispositivo…';
      try {
        if (!window.isSecureContext || !('Notification' in window)
            || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          throw Error('Este navegador no admite notificaciones push. Abre la aplicación instalada o usa Chrome o Edge con HTTPS.');
        }
        if (Notification.permission !== 'granted') {
          throw Error('Las notificaciones están desactivadas. Abre Notificaciones y pulsa Activar.');
        }
        const {data:userResult,error:userError} = await sb.auth.getUser();
        if (userError || !userResult?.user?.id) {
          throw Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        }
        const reg = await navigator.serviceWorker.getRegistration('./');
        const subscription = await reg?.pushManager?.getSubscription();
        if (!subscription) {
          throw Error('No hay una suscripción activa en este dispositivo. Abre Notificaciones y pulsa Activar.');
        }
        const {data:known,error:readError} = await sb.from('member_web_push_subscriptions')
          .select('endpoint').eq('user_id',userResult.user.id)
          .eq('endpoint',subscription.endpoint).maybeSingle();
        if (readError || !known) {
          throw Error('Este dispositivo aún no está vinculado a tu cuenta. Abre Notificaciones y pulsa Comprobar y reparar.');
        }
        status.textContent = 'Enviando simulación de reacción ❤️…';
        const {data,error} = await sb.functions.invoke('dispatch-web-push',{
          body:{type:'test_info_reaction',endpoint:subscription.endpoint}
        });
        if (error || data?.error) {
          throw Error(data?.error || error?.message || 'No se pudo enviar.');
        }
        if (data?.delivered > 0) {
          status.textContent = '✅ Simulación enviada a este dispositivo. Comprueba el aviso fuera de la web.';
        } else {
          status.textContent = 'No se entregó la simulación. Revisa No molestar, las preferencias de notificaciones y los permisos del navegador.';
        }
      } catch (error) {
        status.textContent = error?.message || 'No se pudo completar la simulación.';
        console.warn('Prueba de notificación de reacción a Mi Info:', error);
      } finally {
        if (block.isConnected) button.disabled = false;
      }
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app') || document.body,
      {childList:true,subtree:true});
    addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
