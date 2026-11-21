/* Mejoras no invasivas de foto, portada y botones de los perfiles públicos. */
(() => {
  'use strict';

  const profileRoute = () => location.hash.split('?')[0] === '#/perfil';
  const profileId = () => new URLSearchParams(location.hash.split('?')[1] || '').get('id') || '';
  const profileLink = () => location.origin + location.pathname + location.search + '#/perfil?id=' + encodeURIComponent(profileId());

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = document.createElement('textarea');
    input.value = value; input.readOnly = true;
    input.style.cssText = 'position:fixed;opacity:0;left:0;top:0;';
    document.body.append(input); input.select();
    try {
      if (!document.execCommand('copy')) throw new Error('No se pudo copiar');
    } finally { input.remove(); }
  }

  function openImage(source, title) {
    if (!source || !/^https:\/\//i.test(source) || typeof HTMLDialogElement === 'undefined') return;
    document.querySelector('.sb-public-image-dialog')?.close();
    const dialog = document.createElement('dialog');
    dialog.className = 'sb-public-image-dialog';
    dialog.setAttribute('aria-label', title);

    const close = document.createElement('button');
    close.type = 'button'; close.className = 'sb-public-image-close';
    close.textContent = '✕ Cerrar'; close.onclick = () => dialog.close();
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = source; img.alt = title; img.referrerPolicy = 'no-referrer';
    const caption = document.createElement('figcaption');
    caption.textContent = title;
    img.onerror = () => {
      img.remove();
      caption.textContent = 'No se pudo cargar la imagen.';
    };
    figure.append(img, caption); dialog.append(close, figure);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      document.body.classList.remove('sb-public-image-open');
    }, {once:true});
    document.body.append(dialog);
    try {
      dialog.showModal();
      document.body.classList.add('sb-public-image-open');
      close.focus();
    } catch (_) { dialog.remove(); }
  }

  function mount() {
    if (!profileRoute()) return;
    const root = document.getElementById('public-member-profile');
    const body = root?.querySelector('.public-member-body');
    const cover = root?.querySelector('.public-member-cover');
    const name = body?.querySelector(':scope > h1')?.textContent?.trim() || 'miembro';
    const id = profileId();
    if (!body || !cover || !id) return;
    if (body.dataset.sbPublicPolish === id) return;
    body.dataset.sbPublicPolish = id;

    const avatar = body.querySelector(':scope > .public-member-avatar');
    const avatarImage = avatar?.querySelector('img');
    if (avatar && avatarImage) {
      avatar.classList.add('sb-public-avatar-zoom');
      avatar.setAttribute('role', 'button');
      avatar.tabIndex = 0;
      avatar.setAttribute('aria-label', 'Ampliar la foto de perfil de ' + name);
      const zoom = () => {
        const image = avatar.querySelector('img');
        if (image?.src) openImage(image.src, 'Foto de perfil de ' + name);
      };
      avatar.addEventListener('click', zoom);
      avatar.addEventListener('keydown', event => {
        if (event.target !== avatar) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); zoom();
        }
      });
      avatarImage.addEventListener('error', () => {
        avatar.classList.remove('sb-public-avatar-zoom');
        avatar.removeAttribute('role'); avatar.removeAttribute('tabindex');
        avatar.removeAttribute('aria-label');
      }, {once:true});
    }

    const coverImage = cover.querySelector('.public-member-cover-image');
    if (coverImage) {
      const view = document.createElement('button');
      view.type = 'button'; view.className = 'sb-public-cover-view';
      view.textContent = '🔍 Ver portada';
      view.setAttribute('aria-label', 'Ampliar portada de ' + name);
      view.onclick = () => {
        const image = cover.querySelector('.public-member-cover-image');
        if (image?.src) openImage(image.src, 'Portada de ' + name);
      };
      cover.append(view);
      coverImage.addEventListener('error', () => view.remove(), {once:true});
    }

    // Reutilizar los enlaces existentes: no duplicar botones ni cambiar permisos.
    const message = body.querySelector('.member-private-message-link');
    const back = body.querySelector('a[href="#/miembros"]');
    if (!message || !back) return;
    const actions = document.createElement('div');
    actions.className = 'sb-public-profile-actions';
    actions.setAttribute('aria-label', 'Acciones del perfil');

    const share = document.createElement('button');
    share.type = 'button'; share.className = 'sb-public-share';
    share.textContent = '🔗 Compartir perfil';
    const note = document.createElement('p');
    note.className = 'sb-public-profile-note';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    share.onclick = async () => {
      const url = profileLink();
      if (navigator.share) {
        try {
          await navigator.share({title:'Perfil de ' + name, url});
          note.textContent = 'Enlace compartido.';
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
        }
      }
      try {
        await copyText(url);
        note.textContent = 'Enlace del perfil copiado.';
      } catch (_) {
        note.textContent = 'Copia este enlace: ' + url;
      }
    };
    back.classList.add('sb-public-back');
    actions.append(message, share, back, note);
    const idPanel = body.querySelector('.sb-profile-id-panel');
    const state = body.querySelector(':scope > .member-gaming-status');
    (idPanel || state || body.querySelector(':scope > h1'))?.after(actions);
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {queued = false; mount();});
  }
  const initialize = () => {
    const app = document.getElementById('app');
    if (app) new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange', () => {
      document.querySelector('.sb-public-image-dialog')?.close();
      schedule();
    });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
