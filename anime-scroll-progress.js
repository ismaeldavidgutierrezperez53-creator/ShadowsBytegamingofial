// Barra de progreso anime: indica cuánto se ha recorrido de la página.
(() => {
  'use strict';
  if (document.getElementById('sb-anime-scroll-progress')) return;

  const style = document.createElement('style');
  style.id = 'sb-anime-scroll-progress-style';
  style.textContent = `
    #sb-anime-scroll-progress {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      z-index: 10005;
      pointer-events: none;
      background: transparent;
      overflow: hidden;
    }
    #sb-anime-scroll-progress-fill {
      display: block;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #6ce7ff, var(--sb-user-neon, #ba6bff), #ff8cdd);
      box-shadow: 0 0 11px var(--sb-user-glow, #ba6bff66);
      transform-origin: left center;
      transform: scaleX(0);
      will-change: transform;
    }
    @media (prefers-reduced-motion: reduce) {
      #sb-anime-scroll-progress-fill { will-change: auto; }
    }
    html[data-sb-motion="off"] #sb-anime-scroll-progress-fill { will-change: auto; }
  `;
  document.head.appendChild(style);

  const track = document.createElement('div');
  track.id = 'sb-anime-scroll-progress';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.id = 'sb-anime-scroll-progress-fill';
  track.appendChild(fill);
  document.body.appendChild(track);

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const scrollable = Math.max(0, documentHeight - window.innerHeight);
    const current = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    const progress = scrollable > 0 ? Math.max(0, Math.min(1, current / scrollable)) : 0;
    fill.style.transform = 'scaleX(' + progress + ')';
  };
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(document.documentElement);
    observer.observe(document.body);
  }
  scheduleUpdate();
})();
