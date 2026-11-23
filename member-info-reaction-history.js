/* Historial privado de las reacciones recibidas en Mi Info. */
(() => {
  'use strict';
  const TABLE = 'member_profile_info_reaction_history';
  const PAGE_SIZE = 10;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const EMOJI = {heart:'❤️',laugh:'😂',fire:'🔥',like:'👍'};
  const client = () => typeof sb !== 'undefined' ? sb : null;
  const el = (tag,cls,text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible'
      : new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(date);
  };

  function mount() {
    if (location.hash.split('?')[0] !== '#/cuenta' || !client()) return;
    const infoRoot = document.querySelector('#account-profile .sb-member-info-own');
    if (!infoRoot || infoRoot.querySelector('.sb-info-received-history')) return;

    const details = el('details','sb-info-received-history');
    const summary = el('summary','sb-info-history-summary','🕘 Historial de reacciones recibidas');
    const help = el('p','sb-info-history-help',
      'Solo tú puedes ver este historial. Conserva las reacciones de otros miembros aunque cambien o quiten su emoji.');
    const status = el('p','sb-info-history-status','Abre el historial para ver las reacciones recibidas.');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const list = el('ol','sb-info-history-list');
    list.setAttribute('aria-label','Actividad de reacciones recibidas');
    const toolbar = el('div','sb-info-history-actions');
    const refresh = el('button','outline-btn mini','↻ Actualizar historial');
    refresh.type = 'button';
    const more = el('button','outline-btn mini','Mostrar más');
    more.type = 'button';
    more.hidden = true;
    toolbar.append(refresh,more);
    details.append(summary,help,status,list,toolbar);
    infoRoot.append(details);

    let ownerId = null;
    let loading = false;
    let loaded = false;
    let offset = 0;
    let requestVersion = 0;
    const names = new Map();

    async function load(reset) {
      if (loading || !details.isConnected || !details.open) return;
      loading = true;
      refresh.disabled = true;
      more.disabled = true;
      const version = ++requestVersion;
      status.textContent = reset ? 'Cargando historial…' : 'Cargando más reacciones…';
      try {
        // No consultar el historial de otra cuenta ni confiar en un ID de la URL.
        const {data:{user},error:authError} = await client().auth.getUser();
        if (authError || !user) throw Error('Inicia sesión para consultar tu historial.');
        if (!ownerId || ownerId !== user.id) {
          ownerId = user.id;
          offset = 0;
          names.clear();
          list.replaceChildren();
        }
        const start = reset ? 0 : offset;
        const {data,error,count} = await client().from(TABLE)
          .select('id,reactor_id,reaction,event_type,occurred_at',{count:'exact'})
          .eq('info_user_id',ownerId)
          .order('occurred_at',{ascending:false})
          .order('id',{ascending:false})
          .range(start,start+PAGE_SIZE-1);
        if (error) throw error;
        if (!details.isConnected || version !== requestVersion) return;
        const records = data || [];
        const missing = [...new Set(records.map(row=>row.reactor_id)
          .filter(id=>UUID.test(id||'') && !names.has(id)))];
        if (missing.length) {
          const {data:profiles,error:profileError} = await client().from('profiles')
            .select('id,display_name,username')
            .in('id',missing).eq('is_public',true);
          if (profileError) console.warn('Nombres de reacciones recibidas:',profileError);
          const publicMembers = new Map((profiles||[]).map(p=>[p.id,p]));
          for (const id of missing) names.set(id,publicMembers.get(id)||null);
        }
        if (!details.isConnected || version !== requestVersion) return;
        if (reset) list.replaceChildren();
        for (const row of records) {
          const item = el('li','sb-info-history-item');
          const emoji = el('span','sb-info-history-emoji',EMOJI[row.reaction] || '💜');
          emoji.setAttribute('aria-hidden','true');
          const content = el('div','sb-info-history-content');
          const member = names.get(row.reactor_id);
          const name = String(member?.display_name || member?.username || 'Un miembro (perfil privado)').trim().slice(0,80);
          const firstLine = el('div','sb-info-history-firstline');
          if (member && UUID.test(row.reactor_id||'')) {
            const link = el('a','sb-info-history-member',name);
            link.href = '#/perfil?id='+encodeURIComponent(row.reactor_id);
            firstLine.append(link);
          } else {
            firstLine.append(el('strong','sb-info-history-member',name));
          }
          firstLine.append(el('span','sb-info-history-event',
            row.event_type === 'changed' ? 'cambió su reacción a '+(EMOJI[row.reaction]||'💜')
              : 'reaccionó con '+(EMOJI[row.reaction]||'💜')));
          const time = el('time','sb-info-history-date',formatDate(row.occurred_at));
          if (row.occurred_at) time.dateTime = row.occurred_at;
          content.append(firstLine,time);
          item.append(emoji,content);
          list.append(item);
        }
        offset = start + records.length;
        loaded = true;
        more.hidden = records.length < PAGE_SIZE || (typeof count === 'number' && offset >= count);
        status.textContent = !offset ? 'Aún no has recibido reacciones de otros miembros.'
          : 'Mostrando '+offset+' de '+(typeof count === 'number' ? count : 'varias')+' actividades.';
      } catch (error) {
        console.warn('Historial de reacciones recibidas:',error);
        if (details.isConnected) {
          status.textContent = error?.message?.includes('Inicia sesión')
            ? 'Inicia sesión para consultar tu historial.'
            : 'No se pudo cargar el historial. Pulsa «Actualizar historial» para reintentarlo.';
        }
      } finally {
        if (details.isConnected) {
          loading = false;
          refresh.disabled = false;
          more.disabled = false;
        }
      }
    }

    details.addEventListener('toggle',() => {
      if (details.open && !loaded) void load(true);
    });
    refresh.addEventListener('click',() => { if (!loading) void load(true); });
    more.addEventListener('click',() => { if (!loading) void load(false); });
    window.addEventListener('focus',() => {
      if (details.isConnected && details.open && loaded && !loading) void load(true);
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
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
