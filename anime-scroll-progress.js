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
    /* Hide the progress track (including the percentage) when customizing. */
    html.sb-customize-open #sb-anime-scroll-progress,
    html:has(#sb-customize-panel:not([hidden])) #sb-anime-scroll-progress,
    #sb-anime-scroll-progress[hidden] { display: none !important; }
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
    #sb-anime-scroll-progress.is-complete #sb-anime-scroll-progress-percentage {
      border-color: #ffe5a2;
      background: linear-gradient(135deg, #3a1a58, #54366b);
      animation: sb-anime-progress-complete .8s ease-out 1;
    }
    #sb-anime-scroll-progress.is-complete #sb-anime-scroll-progress-percentage::after {
      content: ' ✦';
      color: #ffeaa8;
    }
    #sb-anime-scroll-progress.is-complete #sb-anime-scroll-progress-fill {
      filter: brightness(1.25);
    }
    @keyframes sb-anime-progress-complete {
      0%, 100% { box-shadow: 0 0 10px var(--sb-user-glow, #ba6bff66); }
      45% { box-shadow: 0 0 24px #ffe5a2, 0 0 14px var(--sb-user-neon, #ba6bff); }
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
      #sb-anime-scroll-progress-percentage { animation: none !important; }
    }
    html[data-sb-motion="off"] #sb-anime-scroll-progress-fill { will-change: auto; }
    html[data-sb-motion="off"] #sb-anime-scroll-progress-percentage { animation: none !important; }
    #sb-anime-scroll-progress-fill {
      background: linear-gradient(90deg, var(--sb-progress-a, #9254ff), var(--sb-progress-b, #00d9ff)) !important;
      box-shadow: 0 0 9px var(--sb-progress-b, #00d9ff);
      overflow: hidden;
      transition: background-color .2s, box-shadow .2s;
    }
    #sb-anime-scroll-progress-percentage { border-color: var(--sb-progress-b, #00d9ff); }
    #sb-anime-scroll-progress-fill::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent 35%, #ffffffbb 50%, transparent 65%);
      transform: translateX(-100%); opacity: 0;
    }
    #sb-anime-scroll-progress.is-scrolling:not(.is-complete) #sb-anime-scroll-progress-fill::after {
      opacity: 1; animation: sb-progress-shimmer .85s linear infinite;
    }
    @keyframes sb-progress-shimmer { to { transform: translateX(100%); } }
    #sb-anime-scroll-progress.is-complete #sb-anime-scroll-progress-fill {
      background: linear-gradient(90deg,#ffae35,#fff1a0) !important;
      box-shadow: 0 0 14px #ffda78;
      animation: sb-progress-finish .8s ease-out 1;
    }
    @keyframes sb-progress-finish { 50% { box-shadow: 0 0 24px 3px #ffe5a2; } }
    @media (prefers-reduced-motion: reduce) {
      #sb-anime-scroll-progress-fill, #sb-anime-scroll-progress-fill::after { animation: none !important; transition: none !important; }
    }
    html[data-sb-motion="off"] #sb-anime-scroll-progress-fill,
    html[data-sb-motion="off"] #sb-anime-scroll-progress-fill::after { animation: none !important; transition: none !important; }
    #sb-anime-scroll-progress.sb-progress-disabled { display:none !important; }
    #sb-anime-scroll-progress .sb-progress-spark {
      position:absolute; width:5px; height:5px; border-radius:50%;
      background:var(--spark-color,#fff1a0); box-shadow:0 0 8px currentColor;
      top:0; pointer-events:none; animation:sb-progress-spark .75s ease-out forwards;
    }
    @keyframes sb-progress-spark {
      from { transform:translate(0,0) scale(1); opacity:1; }
      to { transform:translate(var(--dx),var(--dy)) scale(.2); opacity:0; }
    }
    #sb-progress-settings { border:1px solid #9254ff66; border-radius:10px; padding:10px; margin:10px 0; }
    #sb-progress-settings legend { font-weight:700; }
    #sb-progress-settings input[type=color] { width:100%; height:32px; }
    #sb-progress-settings label { display:block; margin-top:6px; }
    #sb-anime-scroll-progress { height:var(--sb-progress-height,4px)!important; }
    #sb-anime-scroll-progress.sb-progress-bottom #sb-anime-scroll-progress-percentage { top:auto; bottom:calc(100% + 5px); }
    #sb-anime-scroll-progress.sb-progress-no-percent #sb-anime-scroll-progress-percentage { display:none; }
    #sb-anime-scroll-progress-fill { background:var(--sb-progress-gradient,linear-gradient(90deg,var(--sb-progress-a),var(--sb-progress-b))) !important; }
    #sb-anime-scroll-progress[data-style="gaming"]:not(.is-complete) #sb-anime-scroll-progress-fill { background:repeating-linear-gradient(115deg,var(--sb-progress-a) 0 12px,var(--sb-progress-b) 12px 24px) !important; }
    #sb-progress-settings select { width:100%; }
    #sb-progress-preview { margin:12px 0; background:#30233e; border-radius:8px; overflow:hidden; }
    #sb-progress-preview span { display:block; width:70%; border-radius:8px; }
    #sb-progress-preview-caption { display:block; text-align:right; }
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

  // Hide the entire progress widget whenever the customization panel is visible.
  // Observe the panel directly, so this also works when it is closed via X/Escape.
  const customizerPanel = document.getElementById('sb-customize-panel');
  if (customizerPanel) {
    const syncProgressVisibility = () => {
      const customizing = !customizerPanel.hasAttribute('hidden');
      track.hidden = customizing;
      track.setAttribute('aria-hidden', String(customizing));
      if (customizing) {
        track.style.setProperty('display', 'none', 'important');
      } else {
        track.style.removeProperty('display');
      }
    };
    new MutationObserver(syncProgressVisibility).observe(customizerPanel, {
      attributes: true,
      attributeFilter: ['hidden']
    });
    syncProgressVisibility();
  }

  const prefKey = 'sb-scroll-progress-prefs-v1';
  const defaults = { enabled:true, mode:'auto', a:'#9254ff', b:'#00d9ff', style:'anime', thickness:'thin', position:'top', showPercent:true };
  let prefs = {...defaults};
  try {
    const saved = JSON.parse(localStorage.getItem(prefKey)||'{}') || {};
    if(typeof saved.enabled === 'boolean') prefs.enabled = saved.enabled;
    if(typeof saved.showPercent === 'boolean') prefs.showPercent=saved.showPercent;
    for(const [k,values] of Object.entries({style:['anime','gaming','rainbow','fire'],thickness:['thin','medium','thick'],position:['top','bottom']})) if(values.includes(saved[k])) prefs[k]=saved[k];
    if(['auto','custom'].includes(saved.mode)) prefs.mode = saved.mode;
    for(const k of ['a','b']) if(/^#[0-9a-f]{6}$/i.test(saved[k])) prefs[k]=saved[k];
  } catch (_) {}
  track.classList.toggle('sb-progress-disabled', !prefs.enabled);
  const heights={thin:4,medium:7,thick:11};
  function palette(progress){
    const hue=270-progress*130;
    if(prefs.mode==='custom')return [prefs.a,prefs.b];
    if(prefs.style==='gaming')return ['#00a5ff','#65ff64'];
    if(prefs.style==='fire')return ['#ff3131','#ffd34d'];
    if(prefs.style==='rainbow')return ['#ff467d','#a855f7'];
    return ['hsl('+hue+' 90% 62%)','hsl('+(hue-35)+' 95% 57%)'];
  }
  function gradient(colors){
    return prefs.style==='rainbow'&&prefs.mode==='auto'?'linear-gradient(90deg,#ff467d,#ffbe45,#57e97c,#00d9ff,#a855f7)':'linear-gradient(90deg,'+colors.join(',')+')';
  }
  function applyAppearance(){
    track.dataset.style=prefs.style;
    track.classList.toggle('sb-progress-bottom',prefs.position==='bottom');
    track.classList.toggle('sb-progress-no-percent',!prefs.showPercent);
    track.style.setProperty('--sb-progress-height',heights[prefs.thickness]+'px');
  }
  applyAppearance();
  let previous = null;
  let scheduled = false;
  function burst(percent) {
    if(!prefs.enabled || track.hidden || document.documentElement.classList.contains('sb-customize-open') ||
       document.documentElement.classList.contains('sb-menu-open') ||
       document.body.classList.contains('sb-menu-open') ||
       document.documentElement.dataset.sbMotion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count = percent === 100 ? 16 : 8;
    for(let i=0;i<count;i++){
      const spark=document.createElement('span');
      spark.className='sb-progress-spark';
      spark.setAttribute('aria-hidden','true');
      spark.style.left=(percent===100 ? 8+i*84/(count-1) : 50)+'%';
      spark.style.setProperty('--dx',((i%2?1:-1)*(8+i%5*7))+'px');
      spark.style.setProperty('--dy',((prefs.position==='bottom'?-1:1)*(12+i%6*7))+'px');
      spark.style.setProperty('--spark-color',percent===100?'#fff1a0':'#7df9ff');
      track.append(spark);
      setTimeout(()=>spark.remove(),800);
    }
  }
  const update = () => {
    scheduled = false;
    // Situar la barra debajo de la cabecera fija, también en móvil.
    const header = document.querySelector('.topbar');
    if(prefs.position==='bottom'){
      track.style.top='auto';
      const nav=document.querySelector('.sb-mobile-nav, .sb-mobile-bottom-nav, .mobile-bottom-nav');
      const rect=nav?.getBoundingClientRect();
      const offset=rect&&rect.height>0&&rect.bottom>=window.innerHeight-2&&rect.top<window.innerHeight ? Math.max(0,window.innerHeight-rect.top):0;
      track.style.bottom='max('+Math.round(offset)+'px, env(safe-area-inset-bottom, 0px))';
    } else {
      track.style.bottom='auto';
      track.style.top=Math.max(0,Math.round(header?.getBoundingClientRect().bottom||0))+'px';
    }
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const scrollable = Math.max(0, documentHeight - window.innerHeight);
    const current = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    const progress = scrollable > 0 ? Math.max(0, Math.min(1, current / scrollable)) : 0;
    fill.style.transform = 'scaleX(' + progress + ')';
    const percent = scrollable > 0 && scrollable - current <= 1 ? 100 : Math.min(99, Math.floor(progress * 100));
    const colors=palette(progress);
    track.style.setProperty('--sb-progress-a',colors[0]);
    track.style.setProperty('--sb-progress-b',colors[1]);
    track.style.setProperty('--sb-progress-gradient',gradient(colors));
    percentage.textContent = percent + ' %';
    track.setAttribute('aria-valuenow', String(percent));
    track.classList.toggle('is-complete', percent === 100);
    if(previous!==null && track.classList.contains('is-scrolling')) {
      if(percent===100 && previous<100) burst(100);
      else if(percent>=50 && previous<50) burst(50);
    }
    previous=percent;
  };
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  if(customizerPanel && !document.getElementById('sb-progress-settings')) {
    const settings=document.createElement('fieldset');
    settings.id='sb-progress-settings';
    settings.innerHTML='<legend>Barra de progreso</legend><label for="sb-progress-enabled">Mostrar barra</label><select id="sb-progress-enabled"><option value="on">Activada</option><option value="off">Desactivada</option></select><label for="sb-progress-mode">Colores de la barra</label><select id="sb-progress-mode"><option value="auto">Automático según progreso</option><option value="custom">Personalizado</option></select><label for="sb-progress-color-a">Color inicial</label><input id="sb-progress-color-a" type="color"><label for="sb-progress-color-b">Color final</label><input id="sb-progress-color-b" type="color"><label for="sb-progress-style">Estilo de barra</label><select id="sb-progress-style"><option value="anime">Anime</option><option value="gaming">Gaming</option><option value="rainbow">Arcoíris</option><option value="fire">Fuego</option></select><label for="sb-progress-thickness">Grosor</label><select id="sb-progress-thickness"><option value="thin">Fino</option><option value="medium">Mediano</option><option value="thick">Grueso</option></select><label for="sb-progress-position">Posición</label><select id="sb-progress-position"><option value="top">Arriba</option><option value="bottom">Abajo</option></select><label for="sb-progress-percent">Mostrar porcentaje</label><select id="sb-progress-percent"><option value="on">Sí</option><option value="off">No</option></select><div id="sb-progress-preview" aria-hidden="true"><span></span></div><small id="sb-progress-preview-caption">70 % · Vista previa</small><button type="button" id="sb-progress-reset">Restablecer barra</button><small>Preferencias guardadas en este dispositivo.</small>';
    const q=id=>settings.querySelector('#sb-progress-'+id);
    function syncControls(){
      q('enabled').value=prefs.enabled?'on':'off';
      q('mode').value=prefs.mode;
      for(const k of ['style','thickness','position']) q(k).value=prefs[k];
      q('percent').value=prefs.showPercent?'on':'off';
      const colors=palette(.7);
      const preview=q('preview').firstElementChild;
      preview.style.height=heights[prefs.thickness]+'px';
      preview.style.background=prefs.style==='gaming'?'repeating-linear-gradient(115deg,'+colors[0]+' 0 12px,'+colors[1]+' 12px 24px)':gradient(colors);
      q('preview').hidden=!prefs.enabled;
      q('preview-caption').textContent=prefs.enabled?(prefs.showPercent?'70 % · Vista previa':'Vista previa'):'Barra oculta';
      q('color-a').value=prefs.a;
      q('color-b').value=prefs.b;
      q('color-a').disabled=q('color-b').disabled=prefs.mode!=='custom';
    }
    function savePrefs(){
      track.classList.toggle('sb-progress-disabled',!prefs.enabled);
      try{localStorage.setItem(prefKey,JSON.stringify(prefs));}catch(_){}
      applyAppearance(); syncControls(); scheduleUpdate();
    }
    q('enabled').addEventListener('change',()=>{prefs.enabled=q('enabled').value==='on';savePrefs()});
    q('mode').addEventListener('change',()=>{prefs.mode=q('mode').value;savePrefs()});
    for(const k of ['a','b']) q('color-'+k).addEventListener('input',()=>{prefs[k]=q('color-'+k).value;savePrefs()});
    for(const k of ['style','thickness','position']) q(k).addEventListener('change',()=>{prefs[k]=q(k).value;savePrefs()});
    q('percent').addEventListener('change',()=>{prefs.showPercent=q('percent').value==='on';savePrefs()});
    q('reset').addEventListener('click',()=>{prefs={...defaults};savePrefs()});
    syncControls();
    const reset=[...customizerPanel.querySelectorAll('button')].find(b=>b.textContent==='Restablecer diseño');
    if(reset){reset.before(settings);reset.addEventListener('click',()=>{prefs={...defaults};savePrefs()});}else customizerPanel.append(settings);
  }
  let scrollTimer;
  window.addEventListener('scroll', () => {
    track.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => track.classList.remove('is-scrolling'), 180);
    scheduleUpdate();
  }, { passive: true });
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
