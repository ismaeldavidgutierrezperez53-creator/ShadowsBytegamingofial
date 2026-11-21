/* Avisos automáticos de nuevas versiones para Shadows Byte V2 (GitHub Pages/PWA). */
(() => {
  'use strict';
  const CHECK_INTERVAL = 10 * 60 * 1000;
  const FOCUS_CHECK_INTERVAL = 2 * 60 * 1000;
  const REQUEST_TIMEOUT = 12000;
  const GITHUB_COMMITS_URL = 'https://api.github.com/repos/ismaeldavidgutierrezperez53-creator/ShadowsBytegamingofial/commits/main';
  const SITE_INDEX_URL = new URL('./index.html', location.href);
  const VERSION_KEYS = {
    github: 'sb-v2-seen-github-version',
    page: 'sb-v2-seen-page-version'
  };
  const DISMISSED_KEY = 'sb-v2-update-dismissed';
  const status = document.getElementById('sb-updates-menu-status');
  const manual = document.getElementById('sb-update-check');
  if (!manual || !status || !location.protocol.startsWith('http')) return;

  const memory = new Map();
  const get = key => { try { return localStorage.getItem(key); } catch { return memory.get(key) || null; } };
  const put = (key,value) => { try { localStorage.setItem(key,value); } catch { memory.set(key,value); } };
  const getDismissed = () => { try { return sessionStorage.getItem(DISMISSED_KEY); } catch { return null; } };
  const setDismissed = sha => { try { sessionStorage.setItem(DISMISSED_KEY,sha); } catch {} };
  const clearDismissed = () => { try { sessionStorage.removeItem(DISMISSED_KEY); } catch {} };

  let inFlight = false;
  let lastCheck = 0;
  let availableVersion = null;
  let notice = null;
  const message = text => { status.textContent = text; };

  function ensureNotice() {
    if (notice) return notice;
    notice = document.createElement('aside');
    notice.className = 'sb-update-notice';
    notice.hidden = true;
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    const title = document.createElement('p');
    title.className = 'sb-update-notice__title';
    title.textContent = '🔄 ¡Nueva actualización!';
    const detail = document.createElement('p');
    detail.className = 'sb-update-notice__text';
    detail.textContent = 'Hay mejoras nuevas en Shadows Byte Gaming Official V2. Actualiza para disfrutar la versión más reciente.';
    const actions = document.createElement('div');
    actions.className = 'sb-update-notice__actions';
    const now = document.createElement('button');
    now.type = 'button';
    now.className = 'sb-update-now';
    now.textContent = '✨ Actualizar ahora';
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'sb-update-later';
    later.textContent = 'Más tarde';
    actions.append(now,later);
    notice.append(title,detail,actions);
    document.body.append(notice);
    now.addEventListener('click', applyUpdate);
    later.addEventListener('click', () => {
      if (availableVersion) setDismissed(availableVersion.value);
      notice.hidden = true;
      message('Actualización pendiente. Puedes buscarla de nuevo aquí.');
    });
    return notice;
  }

  async function fetchPublishedIndex(signal) {
    const url = new URL(SITE_INDEX_URL.href);
    url.searchParams.set('sb_update_check', String(Date.now()));
    const response = await fetch(url, { cache:'no-store', credentials:'omit', signal });
    if (!response.ok) throw new Error('La web no responde.');
    const html = await response.text();
    if (!/<html[\s>]/i.test(html)) throw new Error('No se pudo comprobar la web.');
    // This backup detects actual published index changes if GitHub API is blocked.
    let hash = 2166136261;
    for (let i=0;i<html.length;i++) hash = Math.imul(hash ^ html.charCodeAt(i),16777619);
    return { source:'page', value:'page-' + (hash >>> 0).toString(16) + '-' + html.length };
  }

  async function latestVersion() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      try {
        const response = await fetch(GITHUB_COMMITS_URL, {
          cache: 'no-store', credentials: 'omit',
          headers: { Accept:'application/vnd.github+json' },
          signal: controller.signal
        });
        if (!response.ok) throw new Error('GitHub no disponible: ' + response.status);
        const data = await response.json();
        if (typeof data.sha !== 'string' || !/^[a-f0-9]{40}$/.test(data.sha))
          throw new Error('Versión de GitHub no válida.');
        return { source:'github', value:data.sha };
      } catch (error) {
        // Fallback within same GitHub Pages origin; no extra permissions.
        if (controller.signal.aborted) throw error;
        return await fetchPublishedIndex(controller.signal);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  function applyUpdate() {
    if (!availableVersion) return;
    put(VERSION_KEYS[availableVersion.source], availableVersion.value);
    clearDismissed();
    if (notice) notice.hidden = true;
    // A new URL forces a fresh index navigation; current hash route is preserved.
    const next = new URL(location.href);
    next.searchParams.set('sb_updated', Date.now().toString(36));
    location.replace(next.href);
  }

  async function checkForUpdates(fromButton = false) {
    if (inFlight || !navigator.onLine) {
      if (fromButton && !navigator.onLine) message('Sin conexión. Lo comprobaremos cuando vuelva internet.');
      return;
    }
    if (document.visibilityState === 'hidden' && !fromButton) return;
    inFlight = true;
    lastCheck = Date.now();
    if (fromButton) message('Comprobando nuevas versiones…');
    manual.disabled = true;
    try {
      const version = await latestVersion();
      const key = VERSION_KEYS[version.source];
      const previous = get(key);
      if (!previous) {
        // First visit: establish a baseline without announcing a false update.
        put(key, version.value);
        if (fromButton) message('✅ Aplicación al día. Se avisará de nuevas versiones.');
      } else if (previous !== version.value) {
        availableVersion = version;
        message('🔄 Nueva versión detectada.');
        if (fromButton) clearDismissed();
        if (getDismissed() !== version.value) ensureNotice().hidden = false;
      } else {
        availableVersion = null;
        if (notice) notice.hidden = true;
        if (fromButton) message('✅ No hay actualizaciones pendientes.');
      }
    } catch (error) {
      console.warn('Shadows Byte: no se pudo comprobar la actualización:', error);
      if (fromButton) message('No se pudo comprobar ahora. Prueba más tarde.');
    } finally {
      manual.disabled = false;
      inFlight = false;
    }
  }

  manual.addEventListener('click', () => checkForUpdates(true));
  window.addEventListener('online', () => checkForUpdates());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > FOCUS_CHECK_INTERVAL)
      checkForUpdates();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && Date.now() - lastCheck > FOCUS_CHECK_INTERVAL) checkForUpdates();
  });

  // Poll only while the app/site is open; background push is managed separately.
  setInterval(() => checkForUpdates(), CHECK_INTERVAL);
  if (document.readyState === 'complete') checkForUpdates();
  else window.addEventListener('load', () => checkForUpdates(), { once:true });
})();
