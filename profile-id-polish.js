/* Shadows Byte Gaming Official V2 — mejoras ligeras del ID del perfil público.
   No modifica cuentas, permisos ni datos de Supabase. */
(() => {
  'use strict';

  const css = `
    #public-member-profile .sb-profile-id-panel {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
      gap: 12px; margin: 18px 0 22px; padding: 14px 16px;
      border: 1px solid rgba(168, 127, 239, .52); border-radius: 15px;
      background: linear-gradient(120deg, rgba(92, 43, 142, .28), rgba(26, 65, 100, .22));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      min-width: 0;
    }
    #public-member-profile .sb-profile-id-details {display:flex; flex-direction:column; gap:4px; min-width:0; flex:1 1 165px;}
    #public-member-profile .sb-profile-id-details strong {font:700 13px/1.4 Orbitron,Arial,sans-serif; color:#d6bdff;}
    #public-member-profile .sb-profile-id-details code {font:600 14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace; color:#f5eaff; overflow-wrap:anywhere;}
    #public-member-profile .sb-profile-id-actions {display:flex; flex-wrap:wrap; gap:8px; align-items:center;}
    #public-member-profile .sb-profile-id-actions button {
      min-height:40px; padding:8px 12px; border-radius:10px;
      border:1px solid rgba(192,157,250,.65); background:#271a3d; color:#f9f3ff;
      font:700 14px/1.3 Rajdhani,Arial,sans-serif; cursor:pointer;
    }
    #public-member-profile .sb-profile-id-actions button:hover {background:#3b255c; border-color:#e3b4ff;}
    #public-member-profile .sb-profile-id-actions button:focus-visible {outline:3px solid #7de4ff; outline-offset:2px;}
    #public-member-profile .sb-profile-id-status {flex-basis:100%; min-height:0; margin:0; font-size:13px; color:#aaf5d9;}
    #public-member-profile .sb-profile-id-status:empty {display:none;}
    #public-member-profile .public-member-cover {background-position:center; background-size:cover;}
    #public-member-profile .public-member-body > h1 {font-size:clamp(24px,4vw,34px); line-height:1.25; letter-spacing:.01em;}
    #public-member-profile .public-member-body > .member-gaming-status {overflow-wrap:anywhere; line-height:1.55;}
    @media(max-width:600px) {
      #public-member-profile .sb-profile-id-panel {padding:12px; margin:15px 0 18px;}
      #public-member-profile .sb-profile-id-actions {width:100%; display:grid; grid-template-columns:repeat(2,minmax(0,1fr));}
      #public-member-profile .sb-profile-id-actions button {width:100%; min-width:0;}
    }
    @media(max-width:350px) {
      #public-member-profile .sb-profile-id-actions {grid-template-columns:1fr;}
    }

    /* Evita que el navegador reajuste el scroll por módulos cargados al fondo. */
    #public-member-profile .public-member-body { overflow-anchor:none; }
    #public-member-profile .sb-public-clean-nav { scroll-margin-top:85px; }
    /* Vista reducida: el ID completo y las copias siguen disponibles bajo demanda. */
    #public-member-profile .sb-profile-id-panel {
      display:block; padding:10px 13px; margin:12px 0 16px;
      border-color:rgba(166,124,220,.36); border-radius:12px;
      background:rgba(30,20,48,.65); box-shadow:none;
    }
    #public-member-profile .sb-profile-id-summary {
      color:#dfcefa; font:700 14px/1.4 Rajdhani,Arial,sans-serif;
      cursor:pointer; padding:2px 1px; list-style:none;
    }
    #public-member-profile .sb-profile-id-summary::-webkit-details-marker {display:none}
    #public-member-profile .sb-profile-id-summary::after {content:' ▾'; color:#a9def5}
    #public-member-profile .sb-profile-id-panel[open] .sb-profile-id-summary::after {content:' ▴'}
    #public-member-profile .sb-profile-id-summary:focus-visible {outline:3px solid #7de4ff;outline-offset:3px}
    #public-member-profile .sb-profile-id-panel:not([open]) > :not(summary) {display:none!important}
    #public-member-profile .sb-profile-id-panel[open] {display:flex;flex-wrap:wrap}
    #public-member-profile .sb-profile-id-panel[open] > summary {flex-basis:100%;margin-bottom:10px}
    #public-member-profile .sb-profile-id-panel[open] .sb-profile-id-actions {margin-top:4px}
    /* Selector de contenidos: no elimina ni reconstruye los módulos originales. */
    #public-member-profile .sb-public-clean-nav {
      margin:18px 0 12px; padding:14px;
      border:1px solid rgba(159,119,211,.45);border-radius:16px;
      background:linear-gradient(145deg,rgba(40,27,65,.8),rgba(20,23,46,.8));
      min-width:0;
    }
    #public-member-profile .sb-public-clean-nav > h2 {
      margin:0 0 12px;font:700 clamp(18px,2.8vw,22px)/1.35 Rajdhani,Arial,sans-serif;
      color:#f2e8ff;
    }
    #public-member-profile .sb-public-clean-tabs {
      display:flex;flex-wrap:wrap;gap:8px;min-width:0;
    }
    #public-member-profile .sb-public-clean-tab {
      flex:1 1 auto;min-height:42px;padding:9px 12px;border-radius:11px;
      border:1px solid rgba(165,122,215,.54);background:#231a36;color:#eee3fa;
      font:700 14px/1.3 Rajdhani,Arial,sans-serif;cursor:pointer;
      white-space:normal;text-align:center;
    }
    #public-member-profile .sb-public-clean-tab[aria-pressed="true"] {
      background:linear-gradient(115deg,#66329b,#345a86);
      color:#fff;border-color:#c497ed;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);
    }
    #public-member-profile .sb-public-clean-tab[hidden] {display:none!important}
    #public-member-profile .sb-public-clean-tab:hover {border-color:#e2bbff}
    #public-member-profile .sb-public-clean-tab:focus-visible,
    #public-member-profile .sb-public-clean-tools > summary:focus-visible {outline:3px solid #7de4ff;outline-offset:3px}
    #public-member-profile .sb-public-clean-item[hidden] {display:none!important}
    #public-member-profile .sb-public-clean-tools {margin:0 0 20px;min-width:0}
    #public-member-profile .sb-public-clean-tools > summary {
      display:inline-flex;align-items:center;list-style:none;cursor:pointer;
      padding:7px 10px;border-radius:9px;
      color:#dac8f3;font:700 14px/1.4 Rajdhani,Arial,sans-serif;
    }
    #public-member-profile .sb-public-clean-tools > summary::-webkit-details-marker {display:none}
    #public-member-profile .sb-public-clean-tools > summary::after {content:' ▾';margin-left:4px}
    #public-member-profile .sb-public-clean-tools[open] > summary::after {content:' ▴'}
    #public-member-profile .sb-public-clean-tools > .sb-nav-panel {margin:9px 0 0;max-width:100%}
    @media(max-width:600px) {
      #public-member-profile .sb-public-clean-nav {padding:12px;margin:14px 0 9px}
      #public-member-profile .sb-public-clean-tabs {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      #public-member-profile .sb-public-clean-tab {min-width:0;padding:9px 6px}
    }
    @media(max-width:350px) {
      #public-member-profile .sb-public-clean-tabs {grid-template-columns:1fr}
    }

  `;
  const style = document.createElement('style');
  style.id = 'sb-profile-id-polish-style';
  style.textContent = css;
  document.head.append(style);

  const validId = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const getProfileId = () => new URLSearchParams((location.hash.split('?')[1] || '')).get('id') || '';
  const copyText = async value => {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
    const temp = document.createElement('textarea');
    temp.value = value; temp.readOnly = true; temp.style.position = 'fixed';
    temp.style.opacity = '0'; document.body.append(temp); temp.select();
    try { if (!document.execCommand('copy')) throw Error('No se pudo copiar'); }
    finally { temp.remove(); }
  };

  function mount() {
    if (location.hash.split('?')[0] !== '#/perfil') return;
    const id = getProfileId();
    if (!validId(id)) return;
    const host = document.getElementById('public-member-profile');
    const body = host?.querySelector('.public-member-body');
    const title = body?.querySelector(':scope > h1');
    if (!body || !title) return;

    const existing = body.querySelector('.sb-profile-id-panel');
    if (existing?.dataset.profileId === id) return;
    existing?.remove();

    const panel = document.createElement('details');
    panel.className = 'sb-profile-id-panel';
    panel.dataset.profileId = id;
    panel.setAttribute('aria-label', 'ID y enlace de este perfil');
    const summary = document.createElement('summary');
    summary.className = 'sb-profile-id-summary';
    summary.textContent = '🪪 Ver ID y opciones de copia';

    const details = document.createElement('div');
    details.className = 'sb-profile-id-details';
    const heading = document.createElement('strong');
    heading.textContent = '🪪 ID del perfil';
    const shortId = document.createElement('code');
    shortId.textContent = id.slice(0, 8) + '…' + id.slice(-4);
    shortId.title = 'Identificador abreviado del miembro';
    details.append(heading, shortId);

    const actions = document.createElement('div');
    actions.className = 'sb-profile-id-actions';
    const status = document.createElement('p');
    status.className = 'sb-profile-id-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    function button(label, value, success) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', async () => {
        try { await copyText(value); status.textContent = success; }
        catch (_) { status.textContent = 'No se pudo copiar automáticamente. Comprueba los permisos del navegador.'; }
      });
      return btn;
    }
    actions.append(
      button('📋 Copiar ID', id, 'ID del perfil copiado.'),
      button('🔗 Copiar enlace', location.origin + location.pathname + location.search + '#/perfil?id=' + encodeURIComponent(id), 'Enlace del perfil copiado.')
    );
    panel.append(summary, details, actions, status);
    const info = body.querySelector(':scope > .member-gaming-status');
    (info || title).after(panel);
  }


  /* El perfil público muestra un resumen; el resto se consulta en pestañas.
     Los módulos originales permanecen en el DOM, con sus eventos y consultas intactos. */
  const profileGroups = [
    ['resumen', '✨ Resumen'],
    ['anime', '🌸 Anime y logros'],
    ['gaming', '🎮 Videojuegos'],
    ['comunidad', '💬 Comunidad'],
    ['otros', '📂 Más']
  ];
  function profileGroupFor(element) {
    if (element.tagName !== 'SECTION' ||
        element.matches('.sb-profile-id-panel,.sb-nav-panel,.sb-public-clean-nav')) return null;
    if (element.matches('.member-profile-stats')) return 'resumen';
    if (element.matches('.member-social,.member-gallery-panel,.account-follows-panel,.sbc-connections')) return 'comunidad';
    if (element.matches('.gamer-profile-panel,.public-game-library,.sb-showcase,.sbg-stats,.sbgl-links,.sbgl-link-analytics')) return 'gaming';
    if (element.matches('.public-anime-identity,.member-anime-badges,.member-achievements,.profile-now-panel,.poll-month-trophy-gallery,.poll-trophy-museum,.sbgt-gallery,.sbv-editor,.sbpm-panel')) return 'anime';
    const heading = (element.querySelector(':scope > h2, :scope > h3, :scope > div h2')?.textContent || '').toLocaleLowerCase('es');
    if (/anime|manga|trofeo|insignia|logro|nivel|medalla|encuesta|temporada|premio/.test(heading)) return 'anime';
    if (/videojuego|biblioteca|gaming|gamer|juego|consola/.test(heading)) return 'gaming';
    if (/comunidad|social|galer[ií]a|publicaciones|seguidores|conexiones|comentarios/.test(heading)) return 'comunidad';
    if (/estad[ií]sticas personales|resumen del perfil/.test(heading)) return 'resumen';
    return 'otros';
  }
  function initialProfileGroup() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const key = params.get('seccion');
    if (params.has('game') || ['biblioteca', 'escaparate', 'estadisticas'].includes(key)) return 'gaming';
    if (key === 'logros') return 'anime';
    if (['actividad', 'conexiones', 'sociales'].includes(key)) return 'comunidad';
    return 'resumen';
  }
  function cleanPublicProfile() {
    if (location.hash.split('?')[0] !== '#/perfil') return;
    const body = document.querySelector('#public-member-profile .public-member-body');
    if (!body || !body.querySelector(':scope > h1')) return;
    let selector = body.querySelector(':scope > .sb-public-clean-nav');
    if (!selector) {
      selector = document.createElement('section');
      selector.className = 'sb-public-clean-nav';
      selector.setAttribute('aria-label', 'Elegir contenido visible del perfil');
      selector.dataset.activeGroup = initialProfileGroup();
      selector.dataset.route = location.hash;
      const heading = document.createElement('h2');
      heading.textContent = 'Explorar el perfil';
      const tabs = document.createElement('div');
      tabs.className = 'sb-public-clean-tabs';
      tabs.setAttribute('role', 'group');
      tabs.setAttribute('aria-label', 'Apartados del perfil');
      for (const [key, label] of profileGroups) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sb-public-clean-tab';
        button.dataset.group = key;
        button.textContent = label;
        button.addEventListener('click', () => {
          if (selector.dataset.activeGroup === key) return;
          selector.dataset.activeGroup = key;
          updatePublicGroups(body, selector);
        });
        tabs.append(button);
      }
      selector.append(heading, tabs);
      const firstSection = [...body.children].find(node => profileGroupFor(node));
      if (firstSection) body.insertBefore(selector, firstSection);
      else body.append(selector);
      // El buscador avanzado original queda disponible, pero no ocupa
      // espacio en la vista normal ni pierde sus atajos.
      body.addEventListener('sb:profile-expand', event => {
        const target = event.target;
        const section = target instanceof Element ? target.closest('.sb-public-clean-item') : null;
        if (!section || !body.contains(section)) return;
        const group = section.dataset.sbPublicGroup;
        if (group && selector.dataset.activeGroup !== group) {
          selector.dataset.activeGroup = group;
          updatePublicGroups(body, selector);
        }
      }, true);
    }
    if (selector.dataset.route !== location.hash) {
      selector.dataset.route = location.hash;
      const deepLinkGroup = initialProfileGroup();
      if (deepLinkGroup !== 'resumen') selector.dataset.activeGroup = deepLinkGroup;
    }
    let tools = body.querySelector(':scope > .sb-public-clean-tools');
    if (!tools) {
      tools = document.createElement('details');
      tools.className = 'sb-public-clean-tools';
      const summary = document.createElement('summary');
      summary.textContent = '🧭 Accesos rápidos y búsqueda avanzada';
      tools.append(summary);
      selector.after(tools);
    }
    const advancedNav = body.querySelector(':scope > .sb-nav-panel');
    if (advancedNav && advancedNav.parentElement !== tools) tools.append(advancedNav);
    updatePublicGroups(body, selector);
  }
  function updatePublicGroups(body, selector) {
    const counts = Object.fromEntries(profileGroups.map(([key]) => [key, 0]));
    const selected = selector.dataset.activeGroup || 'resumen';
    for (const child of [...body.children]) {
      const group = profileGroupFor(child);
      if (!group) continue;
      child.classList.add('sb-public-clean-item');
      if (child.dataset.sbPublicGroup !== group) child.dataset.sbPublicGroup = group;
      counts[group]++;
      const shouldHide = group !== selected;
      if (child.hidden !== shouldHide) child.hidden = shouldHide;
    }
    for (const button of selector.querySelectorAll('.sb-public-clean-tab')) {
      const key = button.dataset.group;
      const isSelected = key === selected;
      button.hidden = counts[key] === 0 && !isSelected;
      button.setAttribute('aria-pressed', String(isSelected));
    }
  }

  let queued = false;
  function queueMount() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); cleanPublicProfile(); });
  }
  const start = () => {
    const root = document.getElementById('app') || document.body;
    // Las estadísticas y galerías generan muchas mutaciones internas.
    // Reorganizar sólo cuando cambia la estructura externa del perfil
    // evita continuos reajustes del diseño y saltos del scroll.
    new MutationObserver(records => {
      if (location.hash.split('?')[0] !== '#/perfil') return;
      const body = document.querySelector('#public-member-profile .public-member-body');
      const host = document.getElementById('public-member-profile');
      if (records.some(record => record.target === root ||
          record.target === host || record.target === body)) queueMount();
    }).observe(root, {childList:true, subtree:true});
    window.addEventListener('hashchange', queueMount);
    queueMount();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
