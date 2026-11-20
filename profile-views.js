/* Shadows Byte Gaming Official V2 — Visitas al perfil con consentimiento mutuo. */
(() => {
  'use strict';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  async function mountAccount(host) {
    if (host.dataset.sbViewsMount || !host.querySelector('#profile-form')) return;
    host.dataset.sbViewsMount = 'pending';
    if (typeof sb === 'undefined') { delete host.dataset.sbViewsMount; return; }
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user || !host.isConnected || !host.querySelector('#profile-form')) {
      delete host.dataset.sbViewsMount;
      return;
    }

    const card = create('section', 'profile-panel sb-profile-views');
    card.setAttribute('aria-label', 'Historial de visitas al perfil');
    card.append(create('h2', '', '👁️ Quién ha visto mi perfil'));
    card.append(create('p', 'sb-views-intro', 'Descubre qué miembros han visitado tu perfil público durante los últimos 30 días. Solo funciona cuando ambas personas activan esta opción.'));
    const privacy = create('label', 'sb-views-toggle');
    const checkbox = create('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', 'Activar historial de visitas al perfil');
    privacy.append(checkbox, create('span', '', 'Activar historial de visitas'));
    card.append(privacy);
    const explanation = create('p', 'sb-views-hint', 'Al activarlo, otros miembros que también lo tengan activado podrán saber cuándo visitas sus perfiles. Si lo desactivas, se borran tus visitas registradas y las recibidas.');
    card.append(explanation);
    const alertPrivacy = create('label', 'sb-views-toggle sb-views-notifications-toggle');
    const notificationToggle = create('input');
    notificationToggle.type = 'checkbox';
    notificationToggle.disabled = true;
    notificationToggle.setAttribute('aria-label', 'Avisarme cuando alguien visite mi perfil');
    alertPrivacy.append(notificationToggle, create('span', '', '🔔 Avisarme cuando visiten mi perfil'));
    card.append(alertPrivacy);
    const notifyStatus = create('p', 'sb-views-hint sb-views-notification-status', 'Los avisos aparecerán en la campana y el centro de notificaciones. Máximo un aviso por visitante cada 24 horas.');
    notifyStatus.setAttribute('role', 'status');
    card.append(notifyStatus);
    const toolbar = create('div', 'sb-views-toolbar');
    const count = create('strong', 'sb-views-count', 'Visitas recientes');
    const refresh = create('button', 'outline-btn mini', '↻ Actualizar');
    refresh.type = 'button';
    refresh.disabled = true;
    toolbar.append(count, refresh);
    const status = create('p', 'sb-views-status', 'Cargando ajustes de privacidad…');
    status.setAttribute('role', 'status');
    const list = create('div', 'sb-views-list');
    card.append(toolbar, status, list);
    const anchor = host.querySelector('.sbp-dashboard') || host.querySelector('.profile-identity');
    if (!anchor || !anchor.isConnected) { delete host.dataset.sbViewsMount; return; }
    anchor.after(card);
    host.dataset.sbViewsMount = 'ready';
    checkbox.disabled = true;

    async function loadVisitors() {
      list.replaceChildren();
      if (!checkbox.checked) {
        refresh.disabled = true;
        count.textContent = 'Visitas recientes';
        status.textContent = 'Historial desactivado. Actívalo para empezar a registrar visitas.';
        return;
      }
      refresh.disabled = true;
      status.textContent = 'Cargando visitas…';
      const { data, error: loadError } = await sb.rpc('get_profile_visitors');
      if (!card.isConnected || !checkbox.checked) return;
      refresh.disabled = false;
      if (loadError) {
        status.textContent = 'No se pudieron cargar las visitas. Inténtalo otra vez.';
        return;
      }
      const visitors = Array.isArray(data) ? data : [];
      count.textContent = visitors.length + (visitors.length === 1 ? ' visitante reciente' : ' visitantes recientes') + (visitors.length === 50 ? ' (máximo mostrado)' : '');
      if (!visitors.length) {
        status.textContent = 'Todavía no hay visitas visibles. Los dos miembros deben activar el historial.';
        return;
      }
      status.textContent = 'Se muestra la última visita de cada miembro en los últimos 30 días.';
      for (const visitor of visitors) {
        if (!uuid.test(String(visitor.viewer_id || ''))) continue;
        const link = create('a', 'sb-views-visitor');
        link.href = '#/perfil?id=' + encodeURIComponent(visitor.viewer_id);
        const avatar = create('span', 'sb-views-avatar');
        const name = String(visitor.display_name || visitor.username || 'Miembro');
        if (/^https:\/\/[^\s]+$/i.test(String(visitor.avatar_url || ''))) {
          const img = create('img');
          img.src = visitor.avatar_url;
          img.alt = '';
          img.loading = 'lazy';
          img.referrerPolicy = 'no-referrer';
          img.onerror = () => img.remove();
          avatar.append(img);
        } else {
          avatar.textContent = name.charAt(0).toUpperCase();
        }
        const info = create('span', 'sb-views-person');
        info.append(create('strong', '', name));
        const date = new Date(visitor.viewed_at);
        info.append(create('small', '', Number.isNaN(date.getTime()) ? 'Visita reciente' : 'Última visita: ' + date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })));
        link.append(avatar, info, create('span', 'sb-views-arrow', 'Ver perfil ›'));
        list.append(link);
      }
    }

    refresh.addEventListener('click', loadVisitors);
    checkbox.addEventListener('change', async () => {
      const enabled = checkbox.checked;
      checkbox.disabled = true;
      refresh.disabled = true;
      status.textContent = 'Guardando configuración…';
      const { data, error: toggleError } = await sb.rpc('set_profile_views_enabled', { new_enabled: enabled });
      if (!card.isConnected) return;
      checkbox.disabled = false;
      if (toggleError) {
        checkbox.checked = !enabled;
        status.textContent = 'No se pudo cambiar la privacidad. Inténtalo de nuevo.';
        refresh.disabled = !checkbox.checked;
        return;
      }
      checkbox.checked = data === true;
      notificationToggle.disabled = !checkbox.checked;
      if (!checkbox.checked) {
        list.replaceChildren();
        count.textContent = 'Visitas recientes';
        status.textContent = 'Historial desactivado y visitas registradas eliminadas.';
      } else {
        await loadVisitors();
      }
    });
    notificationToggle.addEventListener('change', async () => {
      const requested = notificationToggle.checked;
      notificationToggle.disabled = true;
      notifyStatus.textContent = 'Guardando preferencia de avisos…';
      const { data, error: notificationError } = await sb.rpc('set_profile_view_notifications', { new_notify: requested });
      if (!card.isConnected) return;
      if (notificationError) {
        notificationToggle.checked = !requested;
        notifyStatus.textContent = 'No se pudo guardar la preferencia. Inténtalo de nuevo.';
      } else {
        notificationToggle.checked = data === true;
        notifyStatus.textContent = data === true
          ? 'Avisos activados. Como máximo recibirás uno por visitante cada 24 horas.'
          : 'Avisos desactivados. El historial de visitas seguirá funcionando.';
      }
      notificationToggle.disabled = !checkbox.checked;
    });
    const { data: preferences, error: settingsError } = await sb.from('member_profile_view_settings')
      .select('enabled,notify_on_view').eq('user_id', user.id).maybeSingle();
    if (!card.isConnected) return;
    if (settingsError) {
      status.textContent = 'No se pudieron leer los ajustes de privacidad.';
      return;
    }
    checkbox.checked = preferences?.enabled === true;
    checkbox.disabled = false;
    notificationToggle.checked = preferences?.notify_on_view !== false;
    notificationToggle.disabled = !checkbox.checked;
    await loadVisitors();
  }

  async function recordPublicVisit(host) {
    if (typeof sb === 'undefined' || !host.querySelector('.public-member-body > h1')) return;
    if (location.hash.split('?')[0] !== '#/perfil') return;
    const target = new URLSearchParams(location.hash.split('?')[1] || '').get('id');
    if (!target || !uuid.test(target) || host.dataset.sbViewsRecorded === target) return;
    host.dataset.sbViewsRecorded = target;
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !host.isConnected || location.hash.split('?')[0] !== '#/perfil'
        || new URLSearchParams(location.hash.split('?')[1] || '').get('id') !== target
        || user.id === target) return;
      const { error } = await sb.rpc('record_profile_view', { target_profile: target });
      if (error) console.warn('No se pudo registrar una visita de perfil:', error.message);
    } catch (error) {
      console.warn('No se pudo registrar una visita de perfil:', error);
    }
  }

  let scheduled = false;
  function check() {
    scheduled = false;
    const account = document.getElementById('account-profile');
    if (account) mountAccount(account).catch(console.warn);
    const publicProfile = document.getElementById('public-member-profile');
    if (publicProfile) recordPublicVisit(publicProfile).catch(console.warn);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(check);
  }
  function init() {
    const app = document.getElementById('app');
    if (!app) return;
    new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
