/* Shadows Byte Gaming V2 — barra inferior accesible en Android y navegadores móviles. */
(() => {
  'use strict';
  const bar = document.getElementById('sb-mobile-bottom-nav');
  if (!bar) return;
  const tabs = [...bar.querySelectorAll('a[data-sb-tab]')];

  function syncActive() {
    const hashRoute = (location.hash.slice(1) || '/').split(/[?&]/)[0];
    let route = hashRoute;
    if (route === '/perfil') route = '/cuenta';
    else if (['/miembros', '/eventos', '/encuestas', '/cartelera'].includes(route)) route = '/comunidad';
    else if (route === '/no-molestar') route = '/notificaciones';
    for (const tab of tabs) {
      if (tab.dataset.sbTab === route) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    }
  }

  function isTextControl(element) {
    return element instanceof HTMLElement &&
      !!element.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="date"]):not([type="time"]):not([type="button"]):not([type="submit"]):not([type="hidden"]),textarea,[contenteditable="true"]');
  }

  // El teclado de Android no debe quedar detrás del menú inferior.
  document.addEventListener('focusin', event => {
    if (isTextControl(event.target)) document.body.classList.add('sb-bottom-typing');
  });
  document.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!isTextControl(document.activeElement)) document.body.classList.remove('sb-bottom-typing');
    });
  });
  tabs.forEach(tab => tab.addEventListener('click', () => {
    // No interceptar enlaces: el router existente sigue encargándose de navegar.
    document.querySelector('.topbar')?.classList.remove('open');
    document.body.classList.remove('sb-menu-open');
  }));
  window.addEventListener('hashchange', () => {
    document.body.classList.remove('sb-bottom-typing');
    syncActive();
  });
  window.addEventListener('pageshow', syncActive);
  syncActive();
})();
