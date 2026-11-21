/* Shadows Byte Gaming Official — service worker for system Web Push alerts. */
self.addEventListener('push', (event) => {
  let notice = {};
  try { notice = event.data ? event.data.json() : {}; } catch { notice = {}; }
  const title = String(notice.title || '🔔 Shadows Byte Gaming').slice(0, 100);
  const body = String(notice.body || 'Tienes una nueva notificación.').slice(0, 220);
  const path = typeof notice.path === 'string' && /^#\/[a-z0-9/?=&%_-]{1,200}$/i.test(notice.path)
    ? notice.path : '#/notificaciones';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './anime-favicon.png',
    badge: './anime-favicon.png',
    tag: String(notice.tag || 'sb-notice').slice(0, 120),
    lang: 'es',
    timestamp: Date.now(),
    actions: [
      {action:'open',title:'Ver ahora'},
      {action:'dismiss',title:'Descartar'}
    ],
    data: { path }
  }));
});
/* Si cambia la suscripción push, avisar a las ventanas abiertas.
   La nueva suscripción sólo se guarda al recuperar sesión con permiso del usuario. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true})
    .then(clients => {
      for(const client of clients){
        client.postMessage({type:'sb-push-subscription-changed'});
      }
    }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Las acciones rápidas se muestran sólo en sistemas compatibles.
  if(event.action==='dismiss')return;
  const requested = event.notification.data?.path || '#/notificaciones';
  const path = typeof requested === 'string' && /^#\/[a-z0-9/?=&%_-]{1,200}$/i.test(requested)
    ? requested : '#/notificaciones';
  const destination = new URL(path, self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    const page = windows.find(client => {
      try {const u=new URL(client.url);return u.origin===self.location.origin && u.pathname.startsWith(new URL(self.registration.scope).pathname);}
      catch {return false;}
    });
    if (page) {
      try {
        if ('navigate' in page) await page.navigate(destination);
        return await page.focus();
      } catch (error) {
        console.warn('No se pudo abrir el aviso en la ventana existente:', error);
      }
    }
    return self.clients.openWindow(destination);
  })());
});
/* PWA: fallback sin conexión. Se conservan los handlers Push existentes. */
const SB_OFFLINE_CACHE = 'sb-offline-v1';
const SB_OFFLINE_URL = new URL('./offline.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SB_OFFLINE_CACHE).then(cache =>
    cache.add(new Request(SB_OFFLINE_URL, {cache:'reload'})))
    .catch(error => console.warn('Offline cache:', error)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('sb-offline-') && key !== SB_OFFLINE_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(SB_OFFLINE_URL)) || Response.error()));
});
