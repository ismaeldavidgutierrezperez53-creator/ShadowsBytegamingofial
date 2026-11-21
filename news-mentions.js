/* Menciones @usuario en noticias: editor, comentarios y respuestas. */
(function () {
  'use strict';
  if (typeof sb === 'undefined') return;
  const mentionPattern = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{2,32})/g;
  const typingPattern = /(^|[\s([{])@([A-Za-z0-9_]{0,32})$/;

  function attachPicker(input) {
    if (!input || input.dataset.sbNewsMentionsAttached) return;
    input.dataset.sbNewsMentionsAttached = 'true';
    const isNewsAdminField = /^admin-(title|excerpt|content)$/.test(input.id);
    const menu = document.createElement('div');
    menu.className = 'sb-news-mention-picker';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Miembros para mencionar');
    menu.hidden = true;
    input.insertAdjacentElement('afterend', menu);
    let request = 0, choices = [], selected = 0, timer = null;
    const close = () => { menu.hidden = true; menu.replaceChildren(); choices = []; input.removeAttribute('aria-activedescendant'); };
    const matchAtCaret = () => input.value.slice(0, input.selectionStart ?? input.value.length).match(typingPattern);
    function choose(member) {
      const match = matchAtCaret();
      if (!match || !member.username) return;
      const caret = input.selectionStart ?? input.value.length;
      const start = caret - match[2].length - 1;
      input.setRangeText('@' + member.username + ' ', start, caret, 'end');
      request++;
      close();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
    async function refresh() {
      const seq = ++request;
      const match = matchAtCaret();
      if (!match) { close(); return; }
      try {
        const prefix = match[2];
        const query = sb.from('profiles').select('id,username,display_name')
          .eq('is_public', true).not('username', 'is', null)
          .order('username', { ascending: true }).limit(8);
        const { data, error } = await (prefix ? query.ilike('username', prefix.replace(/[\\%_]/g, '\\$&') + '%') : query);
        if (seq !== request || !menu.isConnected || !matchAtCaret()) return;
        close();
        if (error) return;
        const everyone = isNewsAdminField && 'everyone'.startsWith(prefix.toLowerCase())
          ? [{ username: 'everyone', display_name: 'todos los miembros' }] : [];
        choices = everyone.concat((data || []).filter(m =>
          /^[A-Za-z0-9_]{2,32}$/.test(m.username || '') &&
          m.username.toLowerCase() !== 'everyone'
        ));
        if (!choices.length) return;
        choices.forEach((member, i) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'sb-news-mention-option' + (member.username === 'everyone' ? ' sb-news-mention-everyone' : '');
          button.setAttribute('role', 'option');
          button.id = 'sb-news-mention-' + i + '-' + seq;
          button.textContent = member.username === 'everyone'
            ? '📣 @everyone · mencionar a todos los miembros'
            : '@' + member.username + (member.display_name ? ' · ' + member.display_name : '');
          button.addEventListener('mousedown', event => event.preventDefault());
          button.addEventListener('click', () => choose(member));
          menu.append(button);
        });
        selected = 0;
        menu.hidden = false;
        highlight();
      } catch (error) { if (seq === request) close(); }
    }
    function highlight() {
      const buttons = menu.querySelectorAll('button');
      buttons.forEach((button, i) => {
        button.classList.toggle('selected', i === selected);
        button.setAttribute('aria-selected', String(i === selected));
      });
      if (buttons[selected]) input.setAttribute('aria-activedescendant', buttons[selected].id);
    }
    function schedule() {
      clearTimeout(timer);
      request++;
      const match = matchAtCaret();
      if (!match) { close(); return; }
      timer = setTimeout(refresh, 120);
    }
    input.setAttribute('aria-autocomplete', 'list');
    input.addEventListener('input', schedule);
    input.addEventListener('click', schedule);
    input.addEventListener('keydown', event => {
      if (menu.hidden || !choices.length) {
        if (event.key === 'Escape') { request++; close(); }
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
        highlight();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        choose(choices[selected]);
      } else if (event.key === 'Escape') {
        event.preventDefault(); request++; close();
      }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input && !menu.contains(document.activeElement)) close(); }, 160));
  }

  async function linkWithin(root) {
    if (!root || !root.isConnected) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('a,button,textarea,input,script,style,code')) continue;
      if (mentionPattern.test(node.textContent)) textNodes.push(node);
      mentionPattern.lastIndex = 0;
    }
    // @everyone sólo se resalta en el artículo, nunca en comentarios de miembros.
    const isArticle = root.classList.contains('sb-full-news');
    const usernames = [...new Set(textNodes.flatMap(node =>
      [...node.textContent.matchAll(mentionPattern)].map(match => match[2])
        .filter(name => name.toLowerCase() !== 'everyone')
    ))].slice(0, 40);
    if (!usernames.length && !isArticle) return;
    let profileMap = new Map();
    if (usernames.length) {
      const { data, error } = await sb.from('profiles').select('id,username')
        .eq('is_public', true).in('username', usernames).limit(40);
      if (error || !root.isConnected) return;
      profileMap = new Map((data || []).map(member => [member.username.toLowerCase(), member.id]));
    }
    for (const node of textNodes) {
      if (!node.isConnected || !root.contains(node)) continue;
      const text = node.textContent, fragment = document.createDocumentFragment();
      const re = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{2,32})/g;
      let cursor = 0, replaced = false, match;
      while ((match = re.exec(text))) {
        const everyone = isArticle && match[2].toLowerCase() === 'everyone';
        const id = profileMap.get(match[2].toLowerCase());
        if (!id && !everyone) continue;
        const at = match.index + match[1].length;
        if (at > cursor) fragment.append(document.createTextNode(text.slice(cursor, at)));
        if (everyone) {
          const tag = document.createElement('span');
          tag.className = 'sb-news-everyone-tag';
          tag.textContent = '@everyone';
          fragment.append(tag);
        } else {
          const anchor = document.createElement('a');
          anchor.href = '#/perfil?id=' + encodeURIComponent(id);
          anchor.className = 'sb-news-mention-link';
          anchor.textContent = '@' + match[2];
          fragment.append(anchor);
        }
        cursor = at + match[2].length + 1;
        replaced = true;
      }
      if (!replaced) continue;
      if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
    }
  }
  window.SBNewsMentions = { attachPicker, linkWithin };
})();
