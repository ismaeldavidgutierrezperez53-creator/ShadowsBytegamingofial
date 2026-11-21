/* Shadows Byte V2 — pantalla de bienvenida anime, sin bloquear la aplicación. */
(() => {
  'use strict';
  const splash = document.getElementById('sb-launch-splash');
  if (!splash) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minDuration = reduceMotion ? 450 : 1450;
  const maxDuration = 3400;
  const startTime = performance.now();
  let hidden = false;
  let scheduled = false;

  function hide() {
    if (hidden) return;
    hidden = true;
    splash.classList.add('is-hiding');
    splash.setAttribute('aria-hidden', 'true');
    splash.querySelector('button')?.setAttribute('tabindex', '-1');
    // Remove even if transitionend never fires.
    window.setTimeout(() => splash.remove(), reduceMotion ? 180 : 520);
  }

  function scheduleHide() {
    if (scheduled || hidden) return;
    scheduled = true;
    const remaining = Math.max(0, minDuration - (performance.now() - startTime));
    window.setTimeout(hide, remaining);
  }

  if (document.readyState === 'complete') scheduleHide();
  else window.addEventListener('load', scheduleHide, { once: true });

  // Guarantee the page is never permanently covered by the launch screen.
  window.setTimeout(hide, maxDuration);
  document.getElementById('sb-launch-splash-skip')?.addEventListener('click', hide);
})();
