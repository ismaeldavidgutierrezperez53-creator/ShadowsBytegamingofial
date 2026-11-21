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
    // Contadores públicos: muestran datos reales y nunca presentan un error como cero.
    const followGroup = document.createElement('div');
    followGroup.className = 'sb-public-follow-group';
    const stats = document.createElement('div');
    stats.className = 'sb-public-follow-stats';
    stats.setAttribute('aria-label', 'Estadísticas de seguimiento');
    const makeStat = label => {
      const item = document.createElement('div');
      item.className = 'sb-public-follow-stat';
      const number = document.createElement('strong');
      number.textContent = '…';
      const caption = document.createElement('span');
      caption.textContent = label;
      item.append(number, caption);
      stats.append(item);
      return number;
    };
    const followersNumber = makeStat('Seguidores');
    const followingNumber = makeStat('Siguiendo');
    let countsRequest = 0;
    const refreshCounts = async () => {
      const request = ++countsRequest;
      try {
        const [followers, following] = await Promise.all([
          sb.from('member_follows').select('follower_id', {count: 'exact', head: true}).eq('following_id', id),
          sb.from('member_follows').select('following_id', {count: 'exact', head: true}).eq('follower_id', id)
        ]);
        if (!stats.isConnected || countsRequest !== request) return;
        const format = result => result.error ? '—' : Number(result.count ?? 0).toLocaleString('es-ES');
        followersNumber.textContent = format(followers);
        followingNumber.textContent = format(following);
      } catch (_) {
        if (!stats.isConnected || countsRequest !== request) return;
        followersNumber.textContent = followingNumber.textContent = '—';
      }
    };

    // Acción principal de seguimiento: reutiliza member_follows y sus políticas RLS.
    const follow = document.createElement('button');
    follow.type = 'button'; follow.className = 'sb-public-follow';
    follow.textContent = 'Comprobando…'; follow.disabled = true;
    const updateFollow = following => {
      follow.dataset.following = String(following);
      follow.textContent = following ? '✓ Siguiendo' : '➕ Seguir';
      follow.setAttribute('aria-label', following ? 'Dejar de seguir a ' + name : 'Seguir a ' + name);
      follow.title = following ? 'Pulsa para dejar de seguir' : 'Pulsa para seguir';
      follow.disabled = false;
    };
    const checkFollowing = async userId => {
      const {data, error} = await sb.from('member_follows')
        .select('follower_id').eq('follower_id', userId).eq('following_id', id).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    };
    const refreshFollow = async () => {
      try {
        const {data: {user}, error} = await sb.auth.getUser();
        if (!follow.isConnected) return;
        if (error) throw error;
        if (user?.id === id) { follow.remove(); return; }
        if (!user) { updateFollow(false); return; }
        updateFollow(await checkFollowing(user.id));
      } catch (_) {
        if (!follow.isConnected) return;
        follow.textContent = '↻ Comprobar seguimiento';
        follow.disabled = false;
        follow.dataset.following = 'unknown';
        follow.setAttribute('aria-label', 'Volver a comprobar seguimiento');
        note.textContent = 'No se pudo comprobar el seguimiento. Puedes volver a intentarlo.';
      }
    };
    follow.addEventListener('click', async () => {
      if (follow.disabled) return;
      follow.disabled = true;
      try {
        const {data: {user}, error: authError} = await sb.auth.getUser();
        if (authError) throw authError;
        if (!user) { location.hash = '#/auth'; return; }
        if (user.id === id) { follow.remove(); return; }
        // Verificar siempre el estado actual evita duplicar seguimientos.
        const isFollowing = await checkFollowing(user.id);
        const {error} = isFollowing
          ? await sb.from('member_follows').delete().eq('follower_id', user.id).eq('following_id', id)
          : await sb.from('member_follows').insert({follower_id: user.id, following_id: id});
        if (error) throw error;
        if (!follow.isConnected) return;
        updateFollow(!isFollowing);
        void refreshCounts();
        note.textContent = isFollowing ? 'Has dejado de seguir a ' + name + '.' : 'Ahora sigues a ' + name + '.';
        const social = body.querySelector('.member-social');
        if (social?.isConnected && typeof loadMemberSocial === 'function') void loadMemberSocial(id, social);
      } catch (_) {
        if (follow.isConnected) {
          note.textContent = 'No se pudo cambiar el seguimiento. Inténtalo de nuevo.';
          await refreshFollow();
        }
      } finally {
        if (follow.isConnected) follow.disabled = false;
      }
    });
    // Mantiene el botón superior sincronizado con el de la pestaña Comunidad.
    const socialPanel = body.querySelector('.member-social');
    if (socialPanel) {
      let pendingSocialSync = false;
      new MutationObserver(records => {
        if (!stats.isConnected || pendingSocialSync) return;
        // La sección Comunidad reemplaza sus hijos al cambiar un seguimiento.
        if (!records.some(record => record.target === socialPanel)) return;
        pendingSocialSync = true;
        queueMicrotask(() => {
          pendingSocialSync = false;
          if (stats.isConnected) void refreshCounts();
          if (follow.isConnected && !follow.disabled) void refreshFollow();
        });
      }).observe(socialPanel, {childList:true});
    }
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
    followGroup.append(follow, stats);
    actions.append(message, followGroup, share, back, note);
    void refreshFollow();
    void refreshCounts();
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
