/* Anime sparkles and safe route transitions; no content is hidden while loading. */
(()=>{'use strict';const reduced=matchMedia('(prefers-reduced-motion: reduce)');if(reduced.matches)return;const layer=document.createElement('div');layer.className='sb-anime-sparkles';layer.setAttribute('aria-hidden','true');const count=innerWidth<700?10:22;for(let i=0;i<count;i++){const s=document.createElement('i');s.className='sb-anime-sparkle';s.style.setProperty('--sx',((i*37.7+17)%100)+'%');s.style.setProperty('--sy',((i*29.3+9)%100)+'%');s.style.setProperty('--ss',(2+i%3)+'px');s.style.setProperty('--sd',(2.8+(i%5)*.7)+'s');s.style.setProperty('--so',(-i*.67)+'s');layer.appendChild(s)}document.body.appendChild(layer);const app=document.getElementById('app');if(!app)return;let token=0;const play=()=>{const current=++token;requestAnimationFrame(()=>{if(current!==token||reduced.matches)return;app.classList.remove('sb-anime-route-enter');void app.offsetWidth;app.classList.add('sb-anime-route-enter')})};addEventListener('hashchange',play);})();


/* Anime V2: reflejos reactivos en tarjetas y destellos ligeros al pulsar. */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reduceMotion.matches &&
    document.documentElement.dataset.sbMotion !== 'off' && !document.hidden;
  const cardSelector = '.news-card,.anime-card,.manga-card,.gaming-card,.community-card,.member-card,.feature-card,.content-card,.post-card,.category-card';

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let pending = false;
    let last = null;
    document.addEventListener('pointermove', event => {
      if (!motionAllowed() || !(event.target instanceof Element)) return;
      const card = event.target.closest(cardSelector);
      if (!card) return;
      last = { card, x: event.clientX, y: event.clientY };
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!last || !last.card.isConnected || !motionAllowed()) return;
        const rect = last.card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.min(100, Math.max(0, (last.x - rect.left) * 100 / rect.width));
        const y = Math.min(100, Math.max(0, (last.y - rect.top) * 100 / rect.height));
        last.card.style.setProperty('--sb-holo-x', x.toFixed(1) + '%');
        last.card.style.setProperty('--sb-holo-y', y.toFixed(1) + '%');
      });
    }, { passive: true });
  }

  document.addEventListener('click', event => {
    if (!motionAllowed() || !(event.target instanceof Element)) return;
    const target = event.target.closest('button,.gradient-btn,.news-details summary');
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;

    const rect = target.getBoundingClientRect();
    const x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
    const y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
    // Solo cuatro elementos que se eliminan al finalizar la animación.
    for (let i = 0; i < 4; i++) {
      const spark = document.createElement('span');
      spark.className = 'sb-anime-v2-click-star';
      spark.setAttribute('aria-hidden', 'true');
      spark.textContent = '✦';
      const angle = (i * Math.PI / 2) + Math.PI / 4;
      const distance = 18 + i * 3;
      spark.style.setProperty('--sb-star-x', x + 'px');
      spark.style.setProperty('--sb-star-y', y + 'px');
      spark.style.setProperty('--sb-star-dx', Math.round(Math.cos(angle) * distance) + 'px');
      spark.style.setProperty('--sb-star-dy', Math.round(Math.sin(angle) * distance) + 'px');
      spark.style.setProperty('--sb-star-size', (11 + i * 2) + 'px');
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
      document.body.appendChild(spark);
      window.setTimeout(() => spark.remove(), 800);
    }
  }, { passive: true });
})();
