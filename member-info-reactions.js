/* Reacciones a Mi Info: una por usuario, contadores y vista responsive. */
(() => {
  'use strict';
  const TABLE = 'member_profile_info_reactions';
  const BUTTONS = [
    {key:'heart', emoji:'❤️', label:'Me encanta'},
    {key:'laugh', emoji:'😂', label:'Me divierte'},
    {key:'fire', emoji:'🔥', label:'Increíble'},
    {key:'like', emoji:'👍', label:'Me gusta'}
  ];
  const VALID_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const client = () => typeof sb === 'undefined' ? null : sb;
  const create = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  function routeId() {
    const hash = location.hash;
    if (hash.split('?')[0] !== '#/perfil') return '';
    const value = new URLSearchParams(hash.split('?')[1] || '').get('id') || '';
    return VALID_ID.test(value) ? value : '';
  }
  async function getCurrentUserId() {
    const api = client();
    if (!api) return null;
    const {data,error} = await api.auth.getSession();
    if (error) throw error;
    return data?.session?.user?.id || null;
  }
  async function readReactions(infoUserId) {
    const {data,error} = await client().from(TABLE)
      .select('reactor_id,reaction').eq('info_user_id',infoUserId);
    if (error) throw error;
    return data || [];
  }
  function createWidget(infoUserId, owner = false) {
    const root = create('div','sb-info-reactions');
    root.dataset.owner = owner ? 'true' : 'false';
    root.setAttribute('aria-label',owner?'Reacciones recibidas en mi Info':'Reacciones a esta Info');
    root.append(create('h3','sb-info-reactions-title',
      owner ? '💝 Reacciones que ha recibido mi Info' : '💝 ¿Qué te parece esta Info?'));
    const bar = create('div','sb-info-reactions-bar');
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label','Reaccionar a la Info');
    const elements = new Map();
    for (const info of BUTTONS) {
      const button = create('button','sb-info-reaction-button');
      button.type = 'button';
      button.disabled = true;
      button.title = info.label;
      const icon = create('span','sb-info-reaction-emoji',info.emoji);
      icon.setAttribute('aria-hidden','true');
      const count = create('span','sb-info-reaction-count','0');
      button.append(icon,count);
      bar.append(button);
      elements.set(info.key,{button,count,info});
    }
    const note = create('p','sb-info-reactions-note','Cargando reacciones…');
    note.setAttribute('role','status');
    note.setAttribute('aria-live','polite');
    root.append(bar,note);
    let viewerId = null;
    let currentReaction = '';
    let busy = false;
    let loaded = false;
    const refresh = async () => {
      if (!root.isConnected || !client()) return;
      try {
        const records = await readReactions(infoUserId);
        if (!root.isConnected) return;
        const totals = Object.fromEntries(BUTTONS.map(item => [item.key,0]));
        currentReaction = '';
        for (const record of records) {
          if (Object.hasOwn(totals,record.reaction)) totals[record.reaction] += 1;
          if (record.reactor_id === viewerId) currentReaction = record.reaction;
        }
        loaded = true;
        for (const {button,count,info} of elements.values()) {
          const total = totals[info.key];
          const selected = currentReaction === info.key;
          count.textContent = String(total);
          button.setAttribute('aria-pressed', String(selected));
          button.setAttribute('aria-label', info.label+': '+total+' reacciones'+(selected?', tu reacción':''));
          button.classList.toggle('sb-info-reaction-selected',selected);
          button.disabled = busy || owner || viewerId === infoUserId || !viewerId;
        }
        if (!busy) note.textContent = owner || viewerId === infoUserId
          ? 'Aquí verás cómo reaccionan los demás miembros a tu Info.'
          : viewerId
            ? 'Puedes cambiar tu reacción o quitarla tocando el mismo emoji.'
            : 'Inicia sesión para reaccionar. Las cantidades son públicas.';
      } catch (error) {
        console.warn('No se pudieron leer las reacciones de Info:',error);
        if (root.isConnected) note.textContent = 'No se pudieron cargar las reacciones. Vuelve a abrir el perfil.';
      }
    };
    async function react(key) {
      if (busy || !loaded || owner) return;
      if (!viewerId) {
        note.replaceChildren();
        note.append(document.createTextNode('Para reaccionar, '));
        const login = create('a',null,'inicia sesión');
        login.href = '#/auth';
        note.append(login,document.createTextNode('.'));
        return;
      }
      if (viewerId === infoUserId) {
        note.textContent = 'No puedes reaccionar a tu propia Info.';
        return;
      }
      busy = true;
      for (const {button} of elements.values()) button.disabled = true;
      note.textContent = 'Guardando reacción…';
      try {
        const {data,error:authError} = await client().auth.getUser();
        if (authError || data?.user?.id !== viewerId) throw authError || Error('Sesión caducada');
        let result;
        if (currentReaction === key) {
          result = await client().from(TABLE).delete()
            .eq('info_user_id',infoUserId).eq('reactor_id',viewerId);
        } else {
          result = await client().from(TABLE).upsert({
            info_user_id: infoUserId,
            reactor_id: viewerId,
            reaction: key,
            updated_at: new Date().toISOString()
          },{onConflict:'info_user_id,reactor_id'});
        }
        if (result.error) throw result.error;
        busy = false;
        await refresh();
        if (root.isConnected) note.textContent = currentReaction
          ? '✅ Reacción guardada. Toca el mismo emoji para quitarla.'
          : '✅ Reacción eliminada.';
      } catch (error) {
        console.warn('No se pudo guardar reacción a Info:',error);
        busy = false;
        if (root.isConnected) {
          note.textContent = 'No se pudo guardar. Verifica tu sesión y que la Info siga siendo pública.';
          for (const {button} of elements.values()) button.disabled = owner || !viewerId || viewerId === infoUserId;
        }
      }
    }
    for (const {button,info} of elements.values()) {
      button.addEventListener('click',() => { void react(info.key); });
    }
    (async () => {
      try { viewerId = await getCurrentUserId(); }
      catch (error) { console.warn('Reacciones de Info: sesión',error); }
      if (root.isConnected) await refresh();
    })();
    return {root,refresh};
  }
  function mountPublic() {
    const id = routeId();
    if (!id || !client()) return;
    const profile = document.getElementById('public-member-profile');
    const info = profile?.querySelector('.sb-member-info-public:not([hidden])');
    if (!info || !info.querySelector('.sb-member-info-message')?.textContent?.trim()) return;
    if (info.querySelector('.sb-info-reactions')) return;
    const widget = createWidget(id);
    info.append(widget.root);
  }
  async function mountOwn() {
    if (location.hash.split('?')[0] !== '#/cuenta' || !client()) return;
    const own = document.querySelector('#account-profile .sb-member-info-own');
    if (!own || own.querySelector('.sb-info-reactions') || own.dataset.sbReactionsLoading) return;
    own.dataset.sbReactionsLoading = '1';
    try {
      const id = await getCurrentUserId();
      if (!own.isConnected || !id) return;
      const widget = createWidget(id,true);
      own.append(widget.root);
      const status = own.querySelector('.sb-member-info-status');
      if (status) new MutationObserver(() => {
        if (status.textContent?.startsWith('✅') && widget.root.isConnected) void widget.refresh();
      }).observe(status,{childList:true,subtree:true,characterData:true});
    } catch (error) {
      console.warn('Reacciones recibidas en Mi Info:',error);
    } finally {
      delete own.dataset.sbReactionsLoading;
    }
  }
  function mountCards() {
    if (location.hash.split('?')[0] !== '#/miembros') return;
    const cards = document.querySelectorAll('#members-list .member-card');
    for (const card of cards) {
      const info = card.querySelector('.sb-member-info-card');
      if (!info || card.querySelector('.sb-info-react-link')) continue;
      const href = card.querySelector('a.member-view-link')?.getAttribute('href');
      if (!href) continue;
      const link = create('a','sb-info-react-link','❤️ 😂 🔥 👍  Reaccionar');
      link.href = href;
      link.setAttribute('aria-label','Ir al perfil y reaccionar a la Info');
      info.after(link);
    }
  }
  let pending = false;
  function scan() {
    pending = false;
    const route = location.hash.split('?')[0];
    if (route === '#/perfil') mountPublic();
    if (route === '#/cuenta') void mountOwn();
    if (route === '#/miembros') mountCards();
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(scan);
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app') || document.body,{subtree:true,childList:true});
    addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
