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
    data: { path }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
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
      if ('navigate' in page) await page.navigate(destination);
      return page.focus();
    }
    return self.clients.openWindow(destination);
  })());
});
