/* Estadísticas privadas de reacciones a Mi Info. Los datos provienen de un RPC con RLS. */
(() => {
  'use strict';
  const EMOJIS = [
    {key:'heart',emoji:'❤️',label:'Me encanta'},
    {key:'laugh',emoji:'😂',label:'Me divierte'},
    {key:'fire',emoji:'🔥',label:'Increíble'},
    {key:'like',emoji:'👍',label:'Me gusta'}
  ];
  const create = (tag,cls,value) => {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const numeric = n => Math.max(0,Number.isFinite(Number(n))?Number(n):0);
  const fmt = n => new Intl.NumberFormat('es-ES').format(numeric(n));

  function mount() {
    if (location.hash.split('?')[0] !== '#/cuenta' || typeof sb === 'undefined') return;
    const infoRoot = document.querySelector('#account-profile .sb-member-info-own');
    if (!infoRoot || infoRoot.querySelector('.sb-info-stats')) return;

    const panel = create('section','sb-info-stats');
    panel.setAttribute('aria-label','Estadísticas privadas de reacciones a Mi Info');
    const head = create('div','sb-info-stats-head');
    const heading = create('h3','sb-info-stats-title','📊 Estadísticas de Mi Info');
    const reload = create('button','outline-btn mini sb-info-stats-reload','↻ Actualizar');
    reload.type = 'button';
    head.append(heading,reload);
    const help = create('p','sb-info-stats-help',
      'Solo tú ves estas estadísticas. Las reacciones propias y los cambios de emoji no suman nuevas reacciones.');
    const grid = create('div','sb-info-stats-grid');
    const cards = new Map();
    const items = [
      ['total_received','💜','Total recibidas'],
      ['last_7_days','📅','Últimos 7 días'],
      ['last_30_days','🗓️','Últimos 30 días'],
      ['favorite_reaction','🏆','Emoji favorito']
    ];
    for (const [key,emoji,title] of items) {
      const card = create('div','sb-info-stat-card');
      const label = create('span','sb-info-stat-label',emoji+' '+title);
      const value = create('strong','sb-info-stat-value','—');
      card.append(label,value);
      grid.append(card);
      cards.set(key,value);
    }
    const active = create('p','sb-info-stats-active','');
    const breakdownTitle = create('h4','sb-info-stats-subtitle','Reacciones activas por emoji');
    const breakdown = create('div','sb-info-stats-breakdown');
    const bars = new Map();
    for (const {key,emoji,label} of EMOJIS) {
      const row = create('div','sb-info-stat-emoji-row');
      const name = create('span','sb-info-stat-emoji-name',emoji+' '+label);
      const track = create('div','sb-info-stat-track');
      track.setAttribute('aria-hidden','true');
      const fill = create('span','sb-info-stat-fill sb-info-stat-fill-'+key);
      fill.style.width = '0%';
      track.append(fill);
      const count = create('strong','sb-info-stat-emoji-count','0');
      row.append(name,track,count);
      breakdown.append(row);
      bars.set(key,{fill,count});
    }
    const status = create('p','sb-info-stats-status','Cargando estadísticas…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    panel.append(head,help,grid,active,breakdownTitle,breakdown,status);
    const history = infoRoot.querySelector('.sb-info-received-history');
    if (history) history.before(panel);
    else infoRoot.append(panel);

    let busy = false;
    let lastLoaded = 0;
    async function load() {
      if (busy || !panel.isConnected) return;
      busy = true;
      reload.disabled = true;
      status.textContent = 'Actualizando estadísticas…';
      try {
        const {data:auth,error:authError} = await sb.auth.getUser();
        if (authError || !auth?.user?.id) throw Error('Inicia sesión para ver tus estadísticas.');
        const {data,error} = await sb.rpc('get_my_info_reaction_stats');
        if (error) throw error;
        if (!panel.isConnected) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw Error('No se recibieron estadísticas.');
        const total = numeric(row.total_received);
        const activeCount = numeric(row.active_total);
        cards.get('total_received').textContent = fmt(total);
        cards.get('last_7_days').textContent = fmt(row.last_7_days);
        cards.get('last_30_days').textContent = fmt(row.last_30_days);
        const favorite = EMOJIS.find(item=>item.key===row.favorite_reaction);
        cards.get('favorite_reaction').textContent = favorite ? favorite.emoji : '—';
        cards.get('favorite_reaction').title = favorite
          ? favorite.label+' ('+fmt(row.favorite_count)+' activas)' : 'Todavía no hay reacciones activas';
        active.textContent = 'Reacciones activas de otros miembros: '+fmt(activeCount)+
          '. El emoji favorito se calcula entre las reacciones activas.';
        const largest = Math.max(1,...EMOJIS.map(item=>numeric(row[item.key+'_count'])));
        for (const item of EMOJIS) {
          const amount = numeric(row[item.key+'_count']);
          const bar = bars.get(item.key);
          bar.count.textContent = fmt(amount);
          bar.fill.style.width = Math.min(100,Math.round(amount/largest*100))+'%';
        }
        status.textContent = total
          ? '✅ Estadísticas actualizadas.'
          : 'Aún no tienes reacciones recibidas de otros miembros.';
        lastLoaded = Date.now();
      } catch (error) {
        console.warn('Estadísticas de Mi Info:',error);
        if (panel.isConnected) status.textContent =
          error?.message?.includes('Inicia sesión')
            ? 'Inicia sesión para consultar las estadísticas.'
            : 'No se pudieron cargar las estadísticas. Pulsa «Actualizar» para reintentar.';
      } finally {
        busy = false;
        if (panel.isConnected) reload.disabled = false;
      }
    }
    reload.addEventListener('click',() => { void load(); });
    const savedStatus = infoRoot.querySelector('.sb-member-info-status');
    if (savedStatus) {
      new MutationObserver(() => {
        if (savedStatus.textContent?.startsWith('✅') && panel.isConnected) void load();
      }).observe(savedStatus,{childList:true,characterData:true,subtree:true});
    }
    window.addEventListener('focus',() => {
      if (panel.isConnected && Date.now()-lastLoaded>20000) void load();
    });
    void load();
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); });
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
