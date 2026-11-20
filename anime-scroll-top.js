// Acceso rapido a la cabecera con estilo anime. No modifica las rutas ni los menus.
(() => {
  'use strict';
  if (document.getElementById('sb-anime-back-to-top')) return;

  const style = document.createElement('style');
  style.id = 'sb-anime-back-to-top-style';
  style.textContent = `
    #sb-anime-back-to-top {
      position: fixed;
      left: 16px;
      bottom: 78px;
      z-index: 9997;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--sb-user-neon, #bd6dff);
      border-radius: 50%;
      background: linear-gradient(145deg, #43216b, #160c2e);
      color: #fff;
      box-shadow: 0 0 14px var(--sb-user-glow, #a45aff66), inset 0 0 10px #a45aff33;
      font: 800 30px/1 Arial, sans-serif;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(12px);
      transition: opacity .22s ease, transform .22s ease, visibility .22s ease, box-shadow .22s ease;
    }
    #sb-anime-back-to-top.is-visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0);
    }
    #sb-anime-back-to-top:hover {
      box-shadow: 0 0 25px var(--sb-user-neon, #bd6dff);
      transform: translateY(-3px);
    }
    #sb-anime-back-to-top:focus-visible {
      outline: 3px solid #59e4ff;
      outline-offset: 4px;
    }
    #sb-anime-back-to-top .sb-up-spark {
      position: absolute;
      top: 5px;
      right: 8px;
      color: #f8b5ff;
      font-size: 13px;
    }
    @media (max-width: 600px) {
      #sb-anime-back-to-top { left: 10px; bottom: 70px; width: 50px; height: 50px; font-size: 27px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #sb-anime-back-to-top { transition: none; }
    }
    html[data-sb-motion="off"] #sb-anime-back-to-top { transition: none; }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.id = 'sb-anime-back-to-top';
  button.type = 'button';
  button.title = 'Volver arriba';
  button.setAttribute('aria-label', 'Volver arriba');
  button.innerHTML = '<span aria-hidden="true" class="sb-up-spark">✦</span><span aria-hidden="true">↑</span>';
  document.body.appendChild(button);

  const syncVisibility = () => {
    const show = (window.scrollY || document.documentElement.scrollTop || 0) > 400;
    button.classList.toggle('is-visible', show);
    button.tabIndex = show ? 0 : -1;
    button.setAttribute('aria-hidden', String(!show));
  };
  button.addEventListener('click', () => {
    const prefersLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionDisabled = document.documentElement.dataset.sbMotion === 'off';
    window.scrollTo({ top: 0, behavior: prefersLessMotion || motionDisabled ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', syncVisibility, { passive: true });
  window.addEventListener('hashchange', () => requestAnimationFrame(syncVisibility));
  syncVisibility();
})();
