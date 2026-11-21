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
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sb-public-follow-stat';
      item.setAttribute('aria-haspopup', 'dialog');
      item.setAttribute('aria-label', 'Ver lista de ' + label.toLowerCase() + ' de ' + name);
      const number = document.createElement('strong');
      number.textContent = '…';
      const caption = document.createElement('span');
      caption.textContent = label;
      item.append(number, caption);
      stats.append(item);
      return {button: item, number};
    };
    const followersStat = makeStat('Seguidores');
    const followingStat = makeStat('Siguiendo');
    const followersNumber = followersStat.number;
    const followingNumber = followingStat.number;
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


    // Listas accesibles y paginadas: no se carga todo el directorio al abrir el perfil.
    const openFollowList = initialTab => {
      if (typeof HTMLDialogElement === 'undefined') {
        note.textContent = 'Tu navegador no admite esta ventana. Actualízalo para ver las listas.';
        return;
      }
      const previous = document.querySelector('.sb-public-follow-dialog');
      if (previous?.open) previous.close();
      const opener = initialTab === 'followers' ? followersStat.button : followingStat.button;
      const dialog = document.createElement('dialog');
      dialog.className = 'sb-public-follow-dialog';
      const panel = document.createElement('div');
      panel.className = 'sb-public-follow-dialog-panel';
      const heading = document.createElement('h2');
      heading.id = 'sb-public-follow-dialog-title';
      heading.textContent = '👥 Comunidad de ' + name;
      dialog.setAttribute('aria-labelledby', heading.id);
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'sb-public-follow-close';
      close.textContent = '✕ Cerrar';
      close.setAttribute('aria-label', 'Cerrar lista de seguidores');
      close.onclick = () => dialog.close();
      const tabs = document.createElement('div');
      tabs.className = 'sb-public-follow-dialog-tabs';
      tabs.setAttribute('role', 'group');
      tabs.setAttribute('aria-label', 'Tipo de seguimiento');
      const makeTab = (key, label) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.textContent = label;
        tab.dataset.type = key;
        tab.setAttribute('aria-pressed', String(initialTab === key));
        tabs.append(tab);
        return tab;
      };
      const followerTab = makeTab('followers', 'Seguidores');
      const followingTab = makeTab('following', 'Siguiendo');
      const status = document.createElement('p');
      status.className = 'sb-public-follow-dialog-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      const list = document.createElement('div');
      list.className = 'sb-public-follow-list';
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'sb-public-follow-more';
      more.textContent = 'Cargar más';
      more.hidden = true;
      const hint = document.createElement('p');
      hint.className = 'sb-public-follow-dialog-hint';
      hint.textContent = 'Solo aparecen miembros con perfiles públicos.';
      panel.append(heading, close, tabs, status, list, more, hint);
      dialog.append(panel);
      document.body.append(dialog);

      let currentTab = initialTab;
      let offset = 0;
      let loaded = 0;
      let pageToken = 0;
      const validMemberId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const createPerson = (person, viewerId, followedIds) => {
        const link = document.createElement('a');
        link.className = 'sb-public-follow-person';
        link.href = '#/perfil?id=' + encodeURIComponent(person.id);
        const avatarBox = document.createElement('span');
        avatarBox.className = 'sb-public-follow-person-avatar';
        const displayName = person.display_name || person.username || 'Miembro';
        avatarBox.textContent = displayName.charAt(0).toUpperCase();
        if (typeof person.avatar_url === 'string' && /^https:\/\/[^\s]+$/i.test(person.avatar_url)) {
          const media = typeof sbProfileMedia === 'function'
            ? sbProfileMedia(person.avatar_url, 'Perfil de ' + displayName)
            : document.createElement('img');
          if (!media.src) media.src = person.avatar_url;
          if (media.tagName === 'IMG') {
            media.alt = '';
            media.loading = 'lazy';
            media.referrerPolicy = 'no-referrer';
          }
          media.addEventListener('error', () => {
            avatarBox.replaceChildren(document.createTextNode(displayName.charAt(0).toUpperCase()));
          }, {once: true});
          avatarBox.replaceChildren(media);
        }
        const info = document.createElement('span');
        info.className = 'sb-public-follow-person-info';
        const title = document.createElement('strong');
        title.textContent = displayName;
        const subtitle = document.createElement('small');
        subtitle.textContent = person.username && person.username !== displayName
          ? '@' + person.username : 'Ver perfil público';
        info.append(title, subtitle);
        const arrow = document.createElement('span');
        arrow.className = 'sb-public-follow-person-arrow';
        arrow.textContent = '›';
        arrow.setAttribute('aria-hidden', 'true');
        link.append(avatarBox, info, arrow);
        // El botón es hermano del enlace: no se anidan controles interactivos.
        const row = document.createElement('div');
        row.className = 'sb-public-follow-person-row';
        row.append(link);
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'sb-public-follow-person-action';
        // La propia cuenta mantiene un control visible, pero no permite auto-seguirse.
        if (viewerId === person.id) {
          action.textContent = 'Tu perfil';
          action.setAttribute('aria-label', 'Este es tu propio perfil');
          action.disabled = true;
          action.classList.add('is-own');
          row.append(action);
          return row;
        }
        const renderAction = following => {
          action.dataset.following = following === null ? 'unknown' : String(following);
          action.textContent = following === null ? '↻ Comprobar' : following ? '✓ Siguiendo' : '➕ Seguir';
          action.setAttribute('aria-label',
            (following ? 'Dejar de seguir a ' : 'Seguir a ') + displayName);
          action.title = following ? 'Dejar de seguir' : 'Seguir sin salir de la lista';
        };
        renderAction(followedIds === null ? null : followedIds.has(person.id));
        action.onclick = async () => {
          if (action.disabled) return;
          action.disabled = true;
          try {
            const {data: authData} = await sb.auth.getUser();
            const user = authData?.user;
            if (!user) { dialog.close(); location.hash = '#/auth'; return; }
            if (user.id === person.id) { action.remove(); return; }
            // Leer el estado vigente evita cambios duplicados si otra pestaña actuó.
            const state = await sb.from('member_follows').select('following_id')
              .eq('follower_id', user.id).eq('following_id', person.id).maybeSingle();
            if (state.error) throw state.error;
            const wasFollowing = Boolean(state.data);
            if (action.dataset.following === 'unknown') {
              // "Comprobar" solo consulta; no cambia la relación hasta otro clic.
              renderAction(wasFollowing);
              status.textContent = 'Seguimiento comprobado para ' + displayName + '.';
              return;
            }
            const result = wasFollowing
              ? await sb.from('member_follows').delete().eq('follower_id', user.id).eq('following_id', person.id)
              : await sb.from('member_follows').insert({follower_id: user.id, following_id: person.id});
            if (result.error) throw result.error;
            if (!dialog.open) return;
            renderAction(!wasFollowing);
            status.textContent = wasFollowing
              ? 'Has dejado de seguir a ' + displayName + '.'
              : 'Ahora sigues a ' + displayName + '.';
            void refreshCounts();
            if (person.id === id) void refreshFollow();
            // En la lista de personas a las que sigo, reflejar una baja inmediatamente.
            if (user.id === id && currentTab === 'following') void loadPage(true);
          } catch (_) {
            if (dialog.open) status.textContent = 'No se pudo actualizar el seguimiento. Inténtalo de nuevo.';
          } finally {
            if (action.isConnected) action.disabled = false;
          }
        };
        row.append(action);
        return row;
      };
      const loadPage = async (reset = false) => {
        const token = ++pageToken;
        if (reset) {
          offset = 0;
          loaded = 0;
          list.replaceChildren();
        }
        more.hidden = true;
        status.textContent = 'Cargando miembros…';
        const field = currentTab === 'followers' ? 'follower_id' : 'following_id';
        const target = currentTab === 'followers' ? 'following_id' : 'follower_id';
        try {
          const result = await sb.from('member_follows')
            .select(field).eq(target, id).order('created_at', {ascending: false})
            .range(offset, offset + 49);
          if (result.error) throw result.error;
          if (!dialog.open || token !== pageToken) return;
          const rows = result.data || [];
          const ids = [...new Set(rows.map(entry => entry[field]).filter(value => validMemberId.test(String(value))))];
          const profiles = ids.length
            ? await sb.from('profiles').select('id,display_name,username,avatar_url')
              .in('id', ids).eq('is_public', true)
            : {data: [], error: null};
          if (profiles.error) throw profiles.error;
          if (!dialog.open || token !== pageToken) return;
          // La sesión y los estados de seguimiento son opcionales para dibujar la lista:
          // si fallan, cada fila conserva su botón de acción y sus enlaces.
          let viewerId = null;
          let followedIds = null;
          try {
            const sessionResult = await sb.auth.getSession();
            viewerId = sessionResult.data?.session?.user?.id || null;
            if (viewerId && ids.length) {
              // Una consulta por página, no una consulta por cada botón.
              const current = await sb.from('member_follows').select('following_id')
                .eq('follower_id', viewerId).in('following_id', ids);
              if (!current.error) {
                followedIds = new Set((current.data || []).map(item => item.following_id));
              }
            } else {
              followedIds = new Set();
            }
          } catch (_) {
            // La comprobación puntual se repetirá al pulsar cualquier botón.
          }
          if (!dialog.open || token !== pageToken) return;
          const byId = new Map((profiles.data || []).map(person => [person.id, person]));
          for (const row of rows) {
            const person = byId.get(row[field]);
            if (!person) continue;
            list.append(createPerson(person, viewerId, followedIds));
            loaded++;
          }
          offset += rows.length;
          more.hidden = rows.length < 50;
          status.textContent = loaded
            ? 'Mostrando ' + loaded + ' perfiles públicos'
            : 'Todavía no hay miembros con perfil público en esta lista.';
        } catch (_) {
          if (!dialog.open || token !== pageToken) return;
          status.textContent = 'No se pudo cargar la lista. Inténtalo de nuevo.';
          more.hidden = false;
          more.textContent = '↻ Reintentar';
          return;
        }
        more.textContent = 'Cargar más';
      };
      const switchTab = tab => {
        currentTab = tab;
        followerTab.setAttribute('aria-pressed', String(tab === 'followers'));
        followingTab.setAttribute('aria-pressed', String(tab === 'following'));
        void loadPage(true);
      };
      followerTab.onclick = () => switchTab('followers');
      followingTab.onclick = () => switchTab('following');
      more.onclick = () => void loadPage();
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        pageToken++;
        dialog.remove();
        if (opener.isConnected && profileRoute() && profileId() === id) opener.focus({preventScroll: true});
      }, {once: true});
      try {
        dialog.showModal();
        void loadPage(true);
      } catch (_) {
        dialog.remove();
        note.textContent = 'No se pudo abrir la lista de miembros.';
      }
    };
    followersStat.button.addEventListener('click', () => openFollowList('followers'));
    followingStat.button.addEventListener('click', () => openFollowList('following'));

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
      const followDialog = document.querySelector('.sb-public-follow-dialog');
      if (followDialog?.open) followDialog.close();
      schedule();
    });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
