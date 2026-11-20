// Barra de progreso anime: indica cuánto se ha recorrido de la página.
(() => {
  'use strict';
  if (document.getElementById('sb-anime-scroll-progress')) return;

  const style = document.createElement('style');
  style.id = 'sb-anime-scroll-progress-style';
  style.textContent = `
    #sb-anime-scroll-progress {
      position: fixed;
      top: 64px;
      left: 0;
      width: 100%;
      height: 7px;
      z-index: 10005;
      pointer-events: none;
      background: linear-gradient(90deg, #4c236e, #3a2755, #4c236e);
      border-top: 1px solid #d597ff99;
      border-bottom: 1px solid #ac65ea88;
      box-shadow: 0 0 12px #ad56ee99;
      overflow: visible;
    }
    #sb-anime-scroll-progress-percentage {
      position: absolute;
      top: 11px;
      right: 12px;
      z-index: 2;
      min-width: 44px;
      padding: 3px 8px;
      border: 1px solid var(--sb-user-neon, #ba6bff);
      border-radius: 999px;
      background: #1a0d2e;
      color: #fff;
      box-shadow: 0 0 10px var(--sb-user-glow, #ba6bff66);
      font: 700 12px/1.3 Arial, sans-serif;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
    }
    #sb-anime-scroll-progress-fill {
      display: block;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #6ce7ff, var(--sb-user-neon, #ba6bff), #ff8cdd);
      box-shadow: 0 0 11px var(--sb-user-glow, #ba6bff66);
      transform-origin: left center;
      transform: scaleX(0);
      position: relative;
      z-index: 1;
      will-change: transform;
    }
    #sb-anime-scroll-progress::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 6px;
      height: 100%;
      background: #f5bbff;
      box-shadow: 0 0 12px #f5bbff;
    }
    @media (max-width: 600px) {
      #sb-anime-scroll-progress { height: 6px; }
      #sb-anime-scroll-progress-percentage { right: 8px; top: 10px; font-size: 11px; padding: 3px 7px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #sb-anime-scroll-progress-fill { will-change: auto; }
    }
    html[data-sb-motion="off"] #sb-anime-scroll-progress-fill { will-change: auto; }
  `;
  document.head.appendChild(style);

  const track = document.createElement('div');
  track.id = 'sb-anime-scroll-progress';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', 'Progreso de la página');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', '0');
  const fill = document.createElement('span');
  fill.id = 'sb-anime-scroll-progress-fill';
  track.appendChild(fill);
  const percentage = document.createElement('span');
  percentage.id = 'sb-anime-scroll-progress-percentage';
  percentage.setAttribute('aria-hidden', 'true');
  percentage.textContent = '0 %';
  track.appendChild(percentage);
  document.body.appendChild(track);

  let scheduled = false;
  const update = () => {
    scheduled = false;
    // Situar la barra debajo de la cabecera fija, también en móvil.
    const header = document.querySelector('.topbar');
    if (header) {
      const bottom = header.getBoundingClientRect().bottom;
      track.style.top = Math.max(0, Math.round(bottom)) + 'px';
    }
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const scrollable = Math.max(0, documentHeight - window.innerHeight);
    const current = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    const progress = scrollable > 0 ? Math.max(0, Math.min(1, current / scrollable)) : 0;
    fill.style.transform = 'scaleX(' + progress + ')';
    const percent = Math.round(progress * 100);
    percentage.textContent = percent + ' %';
    track.setAttribute('aria-valuenow', String(percent));
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
