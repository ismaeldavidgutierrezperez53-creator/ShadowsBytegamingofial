/* Anime V3: estela ligera durante la navegación entre secciones.
   Se elimina al terminar y respeta Animaciones: Desactivadas. */
(() => {
  'use strict';
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;
  const motionAllowed = () =>
    !media.matches &&
    document.documentElement.dataset.sbMotion !== 'off' &&
    !document.hidden;

  const showStreak = () => {
    if (active) { active.remove(); active = null; }
    if (!motionAllowed()) return;
    const streak = document.createElement('span');
    streak.className = 'sb-v3-route-streak';
    streak.setAttribute('aria-hidden', 'true');
    document.body.appendChild(streak);
    active = streak;
    streak.addEventListener('animationend', () => {
      streak.remove();
      if (active === streak) active = null;
    }, { once: true });
    window.setTimeout(() => {
      streak.remove();
      if (active === streak) active = null;
    }, 1000);
  };

  window.addEventListener('hashchange', showStreak);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) { active.remove(); active = null; }
  });
})();
