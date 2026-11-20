/* Shadows Byte Gaming Official V2 — analítica agregada y panel de administración */
(() => {
  'use strict';

  const sbClient = () => typeof sb !== 'undefined' ? sb : null;
  const make = (tag, className, label) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  };
  const fmt = value => {
    const n = Number(value);
    return (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0).toLocaleString('es-ES');
  };
  const routeSection = () => {
    const path = (location.hash.slice(1) || '/').split('?')[0].replace(/\/+$/,'') || '/';
    const names = {
      '/':'inicio', '/anime':'anime', '/manga':'manga', '/manhwa':'manhwa',
      '/gaming':'gaming', '/noticias':'noticias', '/waifu-husbando':'waifu-husbando',
      '/pokedex':'pokedex', '/one-piece':'one-piece', '/comunidad':'comunidad',
      '/miembros':'miembros', '/cartelera':'cartelera', '/eventos':'eventos',
      '/encuestas':'encuestas', '/favoritos':'favoritos', '/logros':'logros',
      '/tienda':'tienda', '/regalos':'regalos', '/cuenta':'cuenta',
      '/mensajes':'mensajes', '/notificaciones':'notificaciones', '/perfil':'perfil',
      '/admin':'admin', '/contacto':'contacto', '/no-molestar':'no-molestar',
      '/auth':'auth', '/forgot-password':'recuperar-clave',
      '/reset-password':'recuperar-clave'
    };
    return names[path] || 'otras';
  };
  // No cookies, IPs, URL parameters, emails or browser identifiers are logged.
  // Respeta las señales de privacidad del navegador.
  const allowedToTrack = () => navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1';
  let lastRoute = '';
  let lastEventAt = 0;
  async function registerPageView() {
    if (!allowedToTrack()) return;
    const client = sbClient();
    if (!client) return;
    const section = routeSection();
    const now = Date.now();
    if (lastRoute === section && now - lastEventAt < 10000) return;
    lastRoute = section;
    lastEventAt = now;
    try {
      const { error } = await client.rpc('record_site_section_view', { p_section: section });
      if (error) console.debug('Registro de visitas no disponible:', error.message);
    } catch (error) {
      console.debug('No se pudo registrar una visita a sección:', error);
    }
  }

  const sectionTitles = {
    'inicio':'🏠 Inicio', 'anime':'🎌 Anime', 'manga':'📖 Manga',
    'manhwa':'📚 Manhwa', 'gaming':'🎮 Gaming', 'noticias':'📰 Noticias',
    'waifu-husbando':'💜 Waifu / Husbando', 'pokedex':'⚡ Pokédex',
    'one-piece':'🏴‍☠️ One Piece', 'comunidad':'💬 Comunidad',
    'miembros':'👥 Miembros', 'cartelera':'🎬 Cartelera',
    'eventos':'📆 Eventos', 'encuestas':'📊 Encuestas',
    'favoritos':'❤️ Favoritos', 'logros':'🏆 Logros',
    'tienda':'🛍️ Tienda', 'regalos':'🎁 Regalos',
    'cuenta':'👤 Mi cuenta', 'mensajes':'✉️ Mensajes',
    'notificaciones':'🔔 Notificaciones', 'perfil':'👤 Perfil público',
    'admin':'🛡️ Administración', 'contacto':'📩 Contacto',
    'no-molestar':'🌙 No molestar', 'auth':'🔑 Acceso',
    'recuperar-clave':'🔐 Recuperación', 'otras':'✨ Otras'
  };

  function mountAdmin(dashboard) {
    if (!dashboard || dashboard.querySelector('.sb-site-analytics')) return;
    const panel = make('section','admin-panel sb-site-analytics');
    panel.setAttribute('aria-label','Estadísticas privadas de la web');
    const heading = make('div','sb-site-analytics-heading');
    const titles = make('div');
    titles.append(make('span','admin-kicker','ANALÍTICA DE LA WEB'),
      make('h2','','📊 Estadísticas para administradores'),
      make('p','','Visitas registradas, actividad de miembros y secciones más consultadas.'));
    const refresh = make('button','admin-secondary','↻ Actualizar estadísticas');
    refresh.type = 'button';
    heading.append(titles,refresh);
    panel.append(heading);

    const status = make('p','sb-site-analytics-status','Cargando métricas…');
    status.setAttribute('role','status');
    panel.append(status);

    const metrics = make('div','sb-site-analytics-metrics');
    const fields = [
      ['total_views','Visitas registradas desde el inicio','👁️'],
      ['views_30d','Visitas · últimos 30 días','📅'],
      ['active_members_7d','Miembros activos · últimos 7 días','🟢'],
      ['registered_7d','Nuevos registros · últimos 7 días','🆕'],
      ['registered_total','Miembros registrados','👥'],
      ['registered_30d','Nuevos registros · últimos 30 días','📈']
    ];
    const values = new Map();
    for (const [key, name, emoji] of fields) {
      const tile = make('div','sb-site-analytics-tile');
      tile.append(make('span','sb-site-analytics-label',emoji+' '+name));
      const number = make('strong','','—');
      tile.append(number);
      metrics.append(tile);
      values.set(key,number);
    }
    panel.append(metrics);

    const chartTitle=make('h3','','📈 Evolución de visitas · 30 días');
    const chartNote=make('p','sb-site-analytics-note',
      'Cada barra es una vista de página registrada. Puedes desplazarte horizontalmente en móviles.');
    const scroll=make('div','sb-site-analytics-scroll');
    const chart=make('div','sb-site-analytics-bars');
    chart.setAttribute('role','list');
    chart.setAttribute('aria-label','Vistas de página registradas cada día durante los últimos 30 días');
    scroll.append(chart);
    panel.append(chartTitle,chartNote,scroll);

    const topTitle=make('h3','','🔥 Secciones más visitadas · 30 días');
    const list=make('div','sb-site-analytics-top');
    list.setAttribute('role','list');
    panel.append(topTitle,list);
    const detail=make('p','sb-site-analytics-disclaimer',
      'Las visitas empiezan a contarse al instalar esta función. Se incluyen páginas vistas por visitantes y miembros; no son visitantes únicos. «Miembros activos» cuenta cuentas que navegaron por la web en los últimos 7 días. No se almacenan IP, correo, rutas con parámetros ni identificadores de visitantes anónimos. El navegador puede bloquear el seguimiento.');
    panel.append(detail);

    const overview=dashboard.querySelector('#admin-overview')?.closest('.admin-panel');
    if (overview) overview.after(panel);
    else dashboard.querySelector('.admin-welcome')?.after(panel);

    let revision=0;
    const render = data => {
      for (const [key] of fields) values.get(key).textContent=fmt(data[key]);
      chart.replaceChildren();
      const days=Array.isArray(data.daily_30d)?data.daily_30d:[];
      const maximum=Math.max(1,...days.map(d=>Math.max(0,Number(d.views)||0)));
      for(const day of days) {
        const date=String(day.day||'');
        if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))continue;
        const count=Math.max(0,Math.floor(Number(day.views)||0));
        const column=make('div','sb-site-analytics-column');
        column.setAttribute('role','listitem');
        column.setAttribute('aria-label',date+': '+fmt(count)+' visitas');
        const track=make('span','sb-site-analytics-track');
        track.setAttribute('aria-hidden','true');
        const bar=make('span','sb-site-analytics-fill');
        bar.style.height=count?Math.max(7,Math.round(count/maximum*100))+'%':'0%';
        track.append(bar);
        column.append(make('strong','',fmt(count)),track,make('small','',date.slice(8,10)));
        column.title=date+': '+fmt(count)+' visitas';
        chart.append(column);
      }
      list.replaceChildren();
      const sections=Array.isArray(data.top_sections_30d)?data.top_sections_30d:[];
      if (!sections.length) list.append(make('p','sb-site-analytics-empty','Aún no hay visitas de secciones registradas.'));
      const topMax=Math.max(1,...sections.map(entry=>Number(entry.views)||0));
      for(const item of sections) {
        const row=make('div','sb-site-analytics-section');
        row.setAttribute('role','listitem');
        const title=sectionTitles[item.section]||'✨ Otra sección';
        const text=make('span','',title);
        const count=make('strong','',fmt(item.views));
        const bar=make('span','sb-site-analytics-section-track');
        const progress=make('span','sb-site-analytics-section-fill');
        progress.style.width=Math.max(1,Math.round((Number(item.views)||0)/topMax*100))+'%';
        bar.setAttribute('aria-hidden','true');
        bar.append(progress);
        row.append(text,count,bar);
        list.append(row);
      }
      status.textContent=data.tracking_since
        ? 'Datos desde '+new Date(data.tracking_since+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC'})+
          '. Los nuevos registros se obtienen de las cuentas de Supabase.'
        : 'El seguimiento está preparado. Aún no hay visitas registradas; aparecerán a medida que se navegue por la web.';
    };

    async function load() {
      const ticket=++revision;
      refresh.disabled=true;
      status.textContent='Cargando estadísticas…';
      try {
        const client=sbClient();
        if (!client) throw new Error('Supabase no disponible');
        const {data:{user},error:userError}=await client.auth.getUser();
        if (userError || !user || user.app_metadata?.role !== 'admin')
          throw new Error('Acceso exclusivo de administradores');
        const {data,error}=await client.rpc('get_site_admin_analytics');
        if (!panel.isConnected || ticket!==revision) return;
        if (error) throw error;
        if (!data || !Array.isArray(data.daily_30d)) throw new Error('Datos inesperados');
        render(data);
      } catch (error) {
        if (!panel.isConnected || ticket!==revision) return;
        status.textContent='No se pudieron consultar las métricas: '+String(error.message||'error desconocido')+
          '. Pulsa Actualizar estadísticas para reintentarlo.';
      } finally {
        if (panel.isConnected && ticket===revision) refresh.disabled=false;
      }
    }
    refresh.addEventListener('click',load);
    load();
  }

  let scheduled = false;
  function scan() {
    scheduled=false;
    const dashboard=document.querySelector('#admin-root .admin-dashboard');
    if(dashboard) mountAdmin(dashboard);
  }
  function schedule() {
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(scan);
  }
  function init() {
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>{
      registerPageView();
      schedule();
    });
    registerPageView();
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
