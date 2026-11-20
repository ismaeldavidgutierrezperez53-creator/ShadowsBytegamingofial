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
    const statsPanel = create('section', 'sb-views-stats-panel');
    statsPanel.setAttribute('aria-label', 'Estadísticas de visitas al perfil');
    statsPanel.append(create('h3', '', '📊 Estadísticas de mi perfil'));
    const statsGrid = create('div', 'sb-views-stats-grid');
    const metricLabels = [
      ['👁️', 'Visitas registradas', 'total_visits'],
      ['👥', 'Visitantes únicos', 'unique_visitors'],
      ['📅', 'Últimos 7 días', 'visitors_7d'],
      ['🗓️', 'Últimos 30 días', 'visitors_30d']
    ];
    const metricValues = new Map();
    for (const [symbol, label, key] of metricLabels) {
      const tile = create('div', 'sb-views-metric');
      const value = create('strong', 'sb-views-metric-value', '—');
      const title = create('span', 'sb-views-metric-label', symbol + ' ' + label);
      tile.append(value, title);
      statsGrid.append(tile);
      metricValues.set(key, value);
    }
    statsPanel.append(statsGrid);
    statsPanel.append(create('p', 'sb-views-stats-explanation', 'Las visitas se cuentan una vez cada 10 minutos por miembro. Las cifras corresponden a visitas registradas con el historial activo y perfiles públicos.'));
    const weeklyPanel = create('section', 'sb-views-week-chart');
    weeklyPanel.setAttribute('aria-label', 'Gráfico semanal de visitas a mi perfil');
    weeklyPanel.append(create('h3', '', '📈 Visitas por día · últimos 7 días'));
    const chartStatus = create('p', 'sb-views-chart-status', 'Cargando gráfico semanal…');
    chartStatus.setAttribute('role', 'status');
    const chartBars = create('div', 'sb-views-chart-bars');
    chartBars.setAttribute('role', 'list');
    chartBars.setAttribute('aria-label', 'Visitas diarias durante los últimos siete días');
    weeklyPanel.append(chartStatus, chartBars);
    weeklyPanel.append(create('p', 'sb-views-chart-help', 'Cada barra representa visitas registradas en un día (horario de Madrid). De las visitas anteriores a este gráfico solo se conserva la última fecha conocida por miembro.'));
    statsPanel.append(weeklyPanel);
    statsPanel.append(create('h3', 'sb-views-frequent-title', '🌟 Visitantes frecuentes'));
    const frequentList = create('div', 'sb-views-frequent-list');
    const statsStatus = create('p', 'sb-views-stats-status', 'Cargando estadísticas…');
    statsStatus.setAttribute('role', 'status');
    statsPanel.append(statsStatus, frequentList);
    const toolbar = create('div', 'sb-views-toolbar');
    const count = create('strong', 'sb-views-count', 'Visitas recientes');
    const refresh = create('button', 'outline-btn mini', '↻ Actualizar');
    refresh.type = 'button';
    refresh.disabled = true;
    toolbar.append(count, refresh);
    const status = create('p', 'sb-views-status', 'Cargando ajustes de privacidad…');
    status.setAttribute('role', 'status');
    const list = create('div', 'sb-views-list');
    card.append(statsPanel, toolbar, status, list);
    const anchor = host.querySelector('.sbp-dashboard') || host.querySelector('.profile-identity');
    if (!anchor || !anchor.isConnected) { delete host.dataset.sbViewsMount; return; }
    anchor.after(card);
    host.dataset.sbViewsMount = 'ready';
    checkbox.disabled = true;

    function resetStats() {
      for (const value of metricValues.values()) value.textContent = '—';
      frequentList.replaceChildren();
      statsStatus.textContent = 'Activa el historial para consultar tus estadísticas.';
      chartBars.replaceChildren();
      chartStatus.textContent = 'Activa el historial para mostrar el gráfico semanal.';
    }

    function renderWeeklyChart(data, error) {
      chartBars.replaceChildren();
      if (error || !Array.isArray(data) || data.length !== 7) {
        chartStatus.textContent = 'No se pudo cargar el gráfico. Pulsa Actualizar para reintentarlo.';
        return;
      }
      const days = data.map(entry => ({
        date: String(entry.visit_day || ''),
        count: Math.max(0, Math.floor(Number(entry.visits) || 0)),
        visitors: Math.max(0, Math.floor(Number(entry.visitors) || 0))
      }));
      if (days.some(day => !/^\\d{4}-\\d{2}-\\d{2}$/.test(day.date))) {
        chartStatus.textContent = 'No se pudieron interpretar las fechas del gráfico.';
        return;
      }
      const peak = Math.max(1, ...days.map(day => day.count));
      const total = days.reduce((sum, day) => sum + day.count, 0);
      chartStatus.textContent = total
        ? total.toLocaleString('es-ES') + (total === 1 ? ' visita registrada' : ' visitas registradas') + ' durante los siete días.'
        : 'Todavía no hay visitas registradas en los últimos siete días.';
      for (const day of days) {
        const date = new Date(day.date + 'T12:00:00Z');
        const shortDate = date.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
        const fullDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        const column = create('div', 'sb-views-chart-column');
        column.setAttribute('role', 'listitem');
        column.setAttribute('aria-label', fullDate + ': ' + day.count + ' visitas y ' + day.visitors + ' visitantes');
        const countText = create('strong', 'sb-views-chart-value', day.count.toLocaleString('es-ES'));
        const track = create('span', 'sb-views-chart-track');
        track.setAttribute('aria-hidden', 'true');
        const bar = create('span', 'sb-views-chart-fill');
        bar.style.height = day.count ? Math.max(8, Math.round(day.count / peak * 100)) + '%' : '0%';
        if (!day.count) bar.classList.add('is-empty');
        track.append(bar);
        const weekday = create('span', 'sb-views-chart-weekday', shortDate);
        const dayLabel = create('small', 'sb-views-chart-date', fullDate);
        column.title = fullDate + ': ' + day.count + ' visitas (' + day.visitors + ' visitantes únicos)';
        column.append(countText, track, weekday, dayLabel);
        chartBars.append(column);
      }
    }

    function renderStats(data, error) {
      frequentList.replaceChildren();
      if (error || !data || typeof data !== 'object') {
        for (const value of metricValues.values()) value.textContent = '—';
        statsStatus.textContent = 'No se pudieron cargar las estadísticas. Pulsa Actualizar para reintentarlo.';
        return;
      }
      const toCount = value => {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
      };
      for (const [,,key] of metricLabels) {
        metricValues.get(key).textContent = toCount(data[key]).toLocaleString('es-ES');
      }
      const frequent = Array.isArray(data.frequent_visitors) ? data.frequent_visitors.slice(0, 5) : [];
      if (!frequent.length) {
        statsStatus.textContent = 'Todavía no hay visitantes frecuentes. Aparecerán cuando alguien registre al menos 2 visitas.';
        return;
      }
      statsStatus.textContent = 'Los miembros con más visitas válidas a tu perfil.';
      for (const item of frequent) {
        if (!uuid.test(String(item.viewer_id || ''))) continue;
        const row = create('a', 'sb-views-frequent-person');
        row.href = '#/perfil?id=' + encodeURIComponent(item.viewer_id);
        const avatar = create('span', 'sb-views-avatar');
        const name = String(item.display_name || item.username || 'Miembro');
        if (/^https:\/\/[^\s]+$/i.test(String(item.avatar_url || ''))) {
          const photo = create('img');
          photo.src = item.avatar_url;
          photo.alt = '';
          photo.loading = 'lazy';
          photo.referrerPolicy = 'no-referrer';
          photo.onerror = () => photo.remove();
          avatar.append(photo);
        } else {
          avatar.textContent = name.charAt(0).toUpperCase();
        }
        const body = create('span', 'sb-views-frequent-name');
        body.append(create('strong', '', name));
        const date = new Date(item.last_viewed_at);
        body.append(create('small', '', Number.isNaN(date.getTime()) ? 'Visitante frecuente' : 'Última visita: ' + date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })));
        const count = toCount(item.visits_count);
        row.append(avatar, body, create('span', 'sb-views-visit-badge', count + (count === 1 ? ' visita' : ' visitas')));
        frequentList.append(row);
      }
    }

    async function loadVisitors() {
      list.replaceChildren();
      if (!checkbox.checked) {
        resetStats();
        refresh.disabled = true;
        count.textContent = 'Visitas recientes';
        status.textContent = 'Historial desactivado. Actívalo para empezar a registrar visitas.';
        return;
      }
      refresh.disabled = true;
      status.textContent = 'Cargando visitas…';
      const [visitsResult, statsResult, weeklyResult] = await Promise.all([
        sb.rpc('get_profile_visitors'),
        sb.rpc('get_profile_visit_stats'),
        sb.rpc('get_profile_visit_weekly')
      ]);
      if (!card.isConnected || !checkbox.checked) return;
      const { data, error: loadError } = visitsResult;
      renderStats(statsResult.data, statsResult.error);
      renderWeeklyChart(weeklyResult.data, weeklyResult.error);
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
        resetStats();
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
