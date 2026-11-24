/* Historial personal de insignias desbloqueadas al reaccionar en la comunidad. */
(() => {
  'use strict';
  const BADGES = 'member_community_reaction_badges';
  const CATALOG = 'member_community_reaction_badge_catalog';
  const client = () => typeof sb !== 'undefined' ? sb : null;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const count = n => new Intl.NumberFormat('es-ES').format(Math.max(0,Number(n)||0));
  const formatDate = value => {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle:'long',timeStyle:'short',timeZone:'Europe/Madrid'
    }).format(date);
  };

  function mount(root, isAccount) {
    if (!root || root.querySelector('.sb-community-badge-history')) return;
    const host = isAccount
      ? el('details','sb-community-badge-history sb-community-badge-history-account')
      : el('section','sb-community-badge-history section');
    if (!isAccount) host.id = 'sb-community-badge-history-logros';
    host.setAttribute('aria-label','Historial de insignias desbloqueadas');

    if (isAccount) {
      host.append(el('summary','sb-community-badge-history-heading',
        '📜 Historial de insignias desbloqueadas'));
    } else {
      host.append(el('h2','sb-community-badge-history-heading',
        '📜 Historial de insignias desbloqueadas'));
    }
    const introduction = el('p','sb-community-badge-history-intro',
      'Consulta qué insignia has conseguido, la fecha y la recompensa que aparece en tu perfil. Se incluyen las insignias anteriores.');
    const status = el('p','sb-community-badge-history-status',
      isAccount ? 'Abre este apartado para consultar tu historial.' : 'Cargando historial…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const list = el('ol','sb-community-badge-history-list');
    list.setAttribute('aria-label','Insignias obtenidas, de más reciente a más antigua');
    const footer = el('div','sb-community-badge-history-footer');
    const refresh = el('button','outline-btn mini sb-community-badge-history-refresh',
      '↻ Actualizar historial');
    refresh.type = 'button';
    const link = el('a','outline-btn mini sb-community-badge-history-link','🏆 Ver mis logros');
    link.href = '#/logros';
    footer.append(refresh);
    if (isAccount) footer.append(link);
    host.append(introduction,status,list,footer);

    if (isAccount) root.after(host);
    else root.after(host);

    let loading = false;
    let loaded = false;
    let lastLoaded = 0;
    let viewerId = '';
    let requestVersion = 0;

    async function load() {
      if (!host.isConnected || loading || (isAccount && !host.open)) return;
      loading = true;
      refresh.disabled = true;
      const version = ++requestVersion;
      status.textContent = 'Actualizando historial…';
      try {
        const api = client();
        if (!api) throw Error('No se pudo conectar con Supabase.');
        const {data:auth,error:authError} = await api.auth.getUser();
        if (authError || !auth?.user?.id) throw Error('Inicia sesión para consultar tu historial.');
        const uid = auth.user.id;
        if (viewerId !== uid) {
          viewerId = uid;
          list.replaceChildren();
          loaded = false;
        }
        const [badgeResult,catalogResult] = await Promise.all([
          api.from(BADGES)
            .select('badge_key,unlocked_at')
            .eq('user_id',uid)
            .order('unlocked_at',{ascending:false})
            .order('badge_key',{ascending:true}),
          api.from(CATALOG)
            .select('badge_key,target_posts,emoji,title,description,sort_order')
            .order('sort_order',{ascending:true})
        ]);
        if (badgeResult.error) throw badgeResult.error;
        if (catalogResult.error) throw catalogResult.error;
        if (!host.isConnected || version !== requestVersion) return;
        const {data:session} = await api.auth.getSession();
        if (session?.session?.user?.id !== uid || !host.isConnected) return;

        const badges = badgeResult.data || [];
        const names = new Map((catalogResult.data||[]).map(entry=>[entry.badge_key,entry]));
        list.replaceChildren();
        for (const record of badges) {
          const award = names.get(record.badge_key);
          const label = String(award?.title || 'Insignia de la comunidad').slice(0,100);
          const emoji = String(award?.emoji || '🏅').slice(0,8);
          const item = el('li','sb-community-badge-history-entry');
          const symbol = el('span','sb-community-badge-history-emoji',emoji);
          symbol.setAttribute('aria-hidden','true');
          const content = el('div','sb-community-badge-history-details');
          const name = el('strong','sb-community-badge-history-name',label);
          const time = el('time','sb-community-badge-history-date',
            '📅 Desbloqueada: '+formatDate(record.unlocked_at));
          if (record.unlocked_at && Number.isFinite(Date.parse(record.unlocked_at)))
            time.dateTime = record.unlocked_at;
          const reward = el('p','sb-community-badge-history-reward',
            '🎁 Recompensa: insignia «'+label+'» para tu perfil.');
          content.append(name,time,reward);
          if (award?.target_posts) content.append(el('p','sb-community-badge-history-milestone',
            '🎯 Hito: '+count(award.target_posts)+
            (Number(award.target_posts)===1?' publicación distinta':' publicaciones distintas')+
            ' de otros miembros.'));
          item.append(symbol,content);
          list.append(item);
        }
        loaded = true;
        lastLoaded = Date.now();
        status.textContent = badges.length
          ? count(badges.length)+' de '+count((catalogResult.data||[]).length)+
            ' insignias desbloqueadas. Ordenadas de más reciente a más antigua.'
          : 'Todavía no has desbloqueado insignias por reaccionar a publicaciones.';
      } catch (error) {
        console.warn('Historial de insignias comunitarias:',error);
        if (host.isConnected) status.textContent =
          error?.message?.includes('Inicia sesión')
            ? 'Inicia sesión para consultar tu historial de insignias.'
            : 'No se pudo cargar el historial. Pulsa «Actualizar historial» para reintentar.';
      } finally {
        loading = false;
        if (host.isConnected) refresh.disabled = false;
      }
    }
    if (isAccount) {
      host.addEventListener('toggle',()=>{
        if (host.open && (!loaded || Date.now()-lastLoaded>15000)) void load();
      });
    } else void load();
    refresh.addEventListener('click',()=>void load());
    window.addEventListener('focus',()=>{
      if (host.isConnected && (!isAccount || host.open) && loaded
          && Date.now()-lastLoaded>30000) void load();
    });
    window.addEventListener('sb-community-reaction-badge-unlocked',()=>{
      if (host.isConnected && (!isAccount || host.open)) void load();
      else loaded = false;
    });
  }

  function refreshMount() {
    if (!client()) return;
    const route = location.hash.split('?')[0];
    if (route==='#/logros') {
      const achievements = document.getElementById('sb-community-reaction-logros');
      if (achievements && !document.querySelector('#sb-community-badge-history-logros'))
        mount(achievements,false);
    }
    if (route==='#/cuenta') {
      const profile = document.querySelector('#account-profile .profile-body');
      const achievements = profile?.querySelector('.sb-community-reaction-account');
      if (achievements && !profile.querySelector('.sb-community-badge-history-account'))
        mount(achievements,true);
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(()=>{ scheduled = false; refreshMount(); });
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
