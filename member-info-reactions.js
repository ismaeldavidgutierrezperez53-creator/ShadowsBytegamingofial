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
  function createWidget(infoUserId, owner = false, options = {}) {
    const root = create('div','sb-info-reactions');
    root.dataset.owner = owner ? 'true' : 'false';
    if (options.compact) root.classList.add('sb-info-reactions-compact');
    root.setAttribute('aria-label',owner?'Reacciones recibidas en mi Info':'Reacciones a esta Info');
    root.append(create('h3','sb-info-reactions-title',
      options.compact ? (owner ? '💝 Reacciones recibidas' : '💜 Reacciona aquí') :
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
    const refresh = async (providedRecords = null) => {
      if (!root.isConnected || !client()) return;
      try {
        const records = providedRecords ?? await readReactions(infoUserId);
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
          button.disabled = busy;
        }
        if (!busy) {
          if (viewerId) {
            note.textContent = currentReaction
              ? (options.compact ? '✓ Tu reacción está marcada. Toca otra o quítala.' : 'Tu reacción está marcada. Toca el mismo emoji para quitarla.')
              : (owner || viewerId === infoUserId
                ? 'Esta es tu Info. También puedes reaccionar con un emoji.'
                : 'Toca un emoji para reaccionar.');
          } else {
            note.replaceChildren(document.createTextNode('Para reaccionar, '));
            const login = create('a',null,'inicia sesión');
            login.href = '#/auth';
            note.append(login,document.createTextNode('.'));
          }
        }
      } catch (error) {
        console.warn('No se pudieron leer las reacciones de Info:',error);
        if (root.isConnected) note.textContent = 'No se pudieron cargar las reacciones. Vuelve a abrir el perfil.';
      }
    };
    async function react(key) {
      if (busy || !loaded) return;
      if (!viewerId) {
        note.replaceChildren();
        note.append(document.createTextNode('Para reaccionar, '));
        const login = create('a',null,'inicia sesión');
        login.href = '#/auth';
        note.append(login,document.createTextNode('.'));
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
          ? (options.compact ? '✅ ¡Reacción guardada!' : '✅ Reacción guardada. Toca el mismo emoji para quitarla.')
          : '✅ Reacción eliminada.';
      } catch (error) {
        console.warn('No se pudo guardar reacción a Info:',error);
        busy = false;
        if (root.isConnected) {
          note.textContent = 'No se pudo guardar. Verifica tu sesión y que la Info siga siendo pública.';
          for (const {button} of elements.values()) button.disabled = false;
        }
      }
    }
    for (const {button,info} of elements.values()) {
      button.addEventListener('click',() => { void react(info.key); });
    }
    // Iniciar únicamente después de insertar el widget en el DOM.
    // Antes, una respuesta precargada podía resolverse de forma síncrona
    // y dejaba la etiqueta «Cargando reacciones…» para siempre.
    let initialized = false;
    async function initialize() {
      if (initialized || !root.isConnected) return;
      initialized = true;
      try {
        viewerId = Object.prototype.hasOwnProperty.call(options,'viewerId')
          ? options.viewerId : await getCurrentUserId();
      } catch (error) { console.warn('Reacciones de Info: sesión',error); }
      if (root.isConnected) await refresh(options.preloaded ?? null);
    }
    return {root,refresh,initialize};
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
    void widget.initialize();
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
      void widget.initialize();
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
  // Una sola consulta para las tarjetas visibles, con botones táctiles en cada una.
  async function mountCards() {
    if (location.hash.split('?')[0] !== '#/miembros' || !client()) return;
    const cards = [...document.querySelectorAll('#members-list .member-card')]
      .filter(card => card.querySelector('.sb-member-info-card')
        && !card.querySelector('.sb-info-reactions')
        && !card.querySelector('.sb-info-react-link')
        && !card.dataset.sbInfoReactionsLoading);
    if (!cards.length) return;
    const rows = [];
    for (const card of cards) {
      const info = card.querySelector('.sb-member-info-card');
      const href = card.querySelector('a.member-view-link')?.getAttribute('href') || '';
      const id = new URLSearchParams(href.split('?')[1] || '').get('id') || '';
      if (!VALID_ID.test(id)) continue;
      card.dataset.sbInfoReactionsLoading = '1';
      rows.push({card,info,id,href});
    }
    if (!rows.length) return;
    let viewerId = null;
    try {
      viewerId = await getCurrentUserId();
    } catch (error) {
      console.warn('Reacciones de Miembros: sesión',error);
    }
    for (let start=0; start<rows.length; start+=35) {
      const chunk=rows.slice(start,start+35);
      try {
        const ids=[...new Set(chunk.map(row=>row.id))];
        const {data,error}=await client().from(TABLE)
          .select('info_user_id,reactor_id,reaction').in('info_user_id',ids);
        if (error) throw error;
        const byId=new Map(ids.map(id=>[id,[]]));
        for (const record of data || []) byId.get(record.info_user_id)?.push(record);
        for (const row of chunk) {
          if (!row.card.isConnected || !row.info.isConnected) continue;
          if (row.card.querySelector('.sb-info-reactions')) continue;
          row.card.querySelector('.sb-info-react-link')?.remove();
          const widget=createWidget(row.id,row.id===viewerId,
            {compact:true, viewerId, preloaded:byId.get(row.id)||[]});
          row.info.after(widget.root);
          void widget.initialize();
        }
      } catch(error) {
        console.warn('Reacciones directas en Miembros:',error);
        for(const row of chunk) {
          if (!row.card.isConnected || row.card.querySelector('.sb-info-react-link')) continue;
          const link=create('a','sb-info-react-link','Ver perfil para reaccionar');
          link.href=row.href;
          row.info.after(link);
        }
      } finally {
        for(const row of chunk) delete row.card.dataset.sbInfoReactionsLoading;
      }
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
