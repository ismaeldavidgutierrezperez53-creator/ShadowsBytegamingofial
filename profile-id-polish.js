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

    const panel = document.createElement('section');
    panel.className = 'sb-profile-id-panel';
    panel.dataset.profileId = id;
    panel.setAttribute('aria-label', 'ID y enlace de este perfil');

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
    panel.append(details, actions, status);
    const info = body.querySelector(':scope > .member-gaming-status');
    (info || title).after(panel);
  }

  let queued = false;
  function queueMount() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); });
  }
  const start = () => {
    const root = document.getElementById('app') || document.body;
    new MutationObserver(queueMount).observe(root, {childList:true, subtree:true});
    window.addEventListener('hashchange', queueMount);
    queueMount();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
