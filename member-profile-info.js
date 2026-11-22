/* Info personal al estilo de WhatsApp: editor propio y lectura pública segura. */
(() => {
  'use strict';
  const TABLE = 'member_profile_info';
  const LIMIT = 139;
  const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const cache = new Map();
  const cacheMs = 60 * 1000;
  const client = () => typeof sb !== 'undefined' ? sb : null;
  const clean = value => String(value || '').trim().slice(0, LIMIT);
  const el = (tag, cls, text) => {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const stamp = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : 'Actualizado: ' + new Intl.DateTimeFormat('es-ES', {day:'numeric', month:'short', year:'numeric'}).format(date);
  };
  async function getInfo(userId) {
    const {data, error} = await client().from(TABLE)
      .select('user_id,about_text,is_public,updated_at').eq('user_id',userId).maybeSingle();
    if (error) throw error;
    return data;
  }
  function mountOwn() {
    const root = document.getElementById('account-profile');
    const formRoot = root?.querySelector('#profile-form');
    const identity = root?.querySelector('.profile-identity');
    if (!formRoot || !identity || root.querySelector('.sb-member-info-own') || !client()) return;
    const panel = el('section', 'profile-panel sb-member-info sb-member-info-own');
    panel.setAttribute('aria-label', 'Mi Info');
    panel.append(el('h3', null, '💭 Mi Info'), el('p', 'sb-member-info-help',
      'Escribe una frase, pensamiento o mensaje como en WhatsApp. Se verá junto a tu perfil cuando lo compartas.'));
    const form = el('form', 'sb-member-info-form');
    const label = el('label', null, '¿Qué estás pensando?');
    const input = el('textarea', 'sb-member-info-input');
    input.rows = 2;
    input.maxLength = LIMIT;
    input.placeholder = 'Ej.: Hoy toca anime y una buena partida 🎮';
    input.setAttribute('aria-label', 'Mi Info personal');
    const counter = el('small', 'sb-member-info-counter', '0 / 139');
    const updateCount = () => { counter.textContent = input.value.length + ' / ' + LIMIT; };
    input.addEventListener('input', updateCount);
    label.append(input, counter);
    const privacyLabel = el('label', 'sb-member-info-privacy');
    const visibility = el('input');
    visibility.type = 'checkbox';
    visibility.checked = true;
    privacyLabel.append(visibility, el('span', null, '🌐 Mostrar mi Info a otros miembros'));
    const hint = el('p', 'sb-member-info-help', 'Si desmarcas la casilla, solo tú podrás leer tu Info. Puedes cambiarla cuando quieras.');
    const actions = el('div', 'sb-member-info-actions');
    const save = el('button', 'gradient-btn mini', '💾 Guardar Info');
    save.type = 'submit';
    save.disabled = true;
    const clear = el('button', 'outline-btn mini', 'Borrar texto');
    clear.type = 'button';
    clear.onclick = () => {
      input.value = '';
      updateCount();
      status.textContent = 'Texto borrado del editor. Pulsa «Guardar Info» para confirmar.';
      input.focus();
    };
    actions.append(save, clear);
    const status = el('p', 'sb-member-info-status', 'Cargando tu Info…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.append(label, privacyLabel, hint, actions, status);
    panel.append(form);
    identity.after(panel);
    let ownerId = '';
    (async () => {
      try {
        const {data, error} = await client().auth.getUser();
        if (error || !data?.user) throw error || Error('Sesión no disponible');
        ownerId = data.user.id;
        const record = await getInfo(ownerId);
        if (!panel.isConnected) return;
        input.value = record?.about_text || '';
        visibility.checked = record?.is_public !== false;
        updateCount();
        status.textContent = record?.about_text
          ? (record.is_public ? 'Tu Info está visible para los demás miembros.' : 'Tu Info es privada.')
          : 'Todavía no has escrito tu Info.';
        save.disabled = false;
      } catch (error) {
        console.warn('Info de miembro: carga', error);
        if (panel.isConnected) status.textContent = 'No se pudo cargar tu Info. Reabre Mi cuenta para intentarlo.';
      }
    })();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (save.disabled || !ownerId) return;
      save.disabled = true;
      status.textContent = 'Guardando tu Info…';
      try {
        const {data, error: authError} = await client().auth.getUser();
        if (authError || data?.user?.id !== ownerId) throw authError || Error('Sesión caducada');
        const record = {
          user_id: ownerId,
          about_text: clean(input.value),
          is_public: visibility.checked,
          updated_at: new Date().toISOString()
        };
        const {error} = await client().from(TABLE).upsert(record, {onConflict:'user_id'});
        if (error) throw error;
        input.value = record.about_text;
        updateCount();
        cache.delete(ownerId);
        status.textContent = !record.about_text ? '✅ Info borrada correctamente.' :
          record.is_public ? '✅ Info guardada y visible para los demás miembros.' :
            '✅ Info guardada de forma privada.';
      } catch (error) {
        console.warn('Info de miembro: guardado', error);
        status.textContent = 'No se pudo guardar la Info. Comprueba tu sesión e inténtalo de nuevo.';
      } finally {
        if (panel.isConnected) save.disabled = false;
      }
    });
  }
  function mountPublic() {
    const root = document.getElementById('public-member-profile');
    const body = root?.querySelector('.public-member-body');
    const id = new URLSearchParams((location.hash.split('?')[1] || '')).get('id');
    if (!body || !ID_RE.test(id || '') || body.querySelector('.sb-member-info-public') || !client()) return;
    const panel = el('section', 'sb-member-info sb-member-info-public');
    panel.hidden = true;
    panel.append(el('h2', null, '💭 Info'));
    const message = el('p', 'sb-member-info-message');
    const updated = el('small', 'sb-member-info-date');
    panel.append(message, updated);
    (body.querySelector('.member-gaming-status') || body.querySelector('h1'))?.after(panel);
    (async () => {
      try {
        const record = await getInfo(id);
        if (!panel.isConnected || new URLSearchParams((location.hash.split('?')[1] || '')).get('id') !== id) return;
        if (!record?.is_public || !clean(record.about_text)) { panel.remove(); return; }
        message.textContent = clean(record.about_text);
        updated.textContent = stamp(record.updated_at);
        panel.hidden = false;
      } catch (error) {
        console.warn('Info de perfil público:', error);
        panel.remove();
      }
    })();
  }
  async function mountMembers() {
    const root = document.getElementById('members-list');
    if (!root || !client()) return;
    const cards = [...root.querySelectorAll('.member-card:not([data-sb-info-checked])')];
    if (!cards.length) return;
    const pending = [];
    const rows = [];
    for (const card of cards) {
      card.dataset.sbInfoChecked = '1';
      const href = card.querySelector('a.member-view-link')?.getAttribute('href') || '';
      const id = new URLSearchParams(href.split('?')[1] || '').get('id');
      if (!ID_RE.test(id || '')) continue;
      rows.push({card,id});
      const hit = cache.get(id);
      if (!hit || hit.until < Date.now()) pending.push(id);
    }
    const unique = [...new Set(pending)];
    for (let start = 0; start < unique.length; start += 45) {
      const chunk = unique.slice(start, start + 45);
      try {
        const {data,error} = await client().from(TABLE)
          .select('user_id,about_text,is_public,updated_at')
          .in('user_id',chunk).eq('is_public',true);
        if (error) throw error;
        const found = new Map((data || []).map(item => [item.user_id,item]));
        for (const id of chunk) cache.set(id,{value:found.get(id) || null,until:Date.now()+cacheMs});
      } catch (error) {
        console.warn('Info de miembros:',error);
        for (const id of chunk) cache.delete(id);
      }
    }
    if (location.hash.split('?')[0] !== '#/miembros') return;
    for (const {card,id} of rows) {
      const record = cache.get(id)?.value;
      if (!card.isConnected || !record?.is_public || !clean(record.about_text)) continue;
      const info = el('p','sb-member-info-card');
      const label = el('strong',null,'💭 Info: ');
      const value = el('span',null,clean(record.about_text));
      info.append(label,value);
      (card.querySelector('.member-gaming-status') || card.querySelector('h2'))?.after(info);
    }
  }
  let scheduled = false;
  function scan() {
    scheduled = false;
    const route = location.hash.split('?')[0];
    if (route === '#/cuenta') mountOwn();
    if (route === '#/perfil') mountPublic();
    if (route === '#/miembros') void mountMembers();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }
  function start() {
    const host = document.getElementById('app') || document.body;
    new MutationObserver(schedule).observe(host,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
