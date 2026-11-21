/* Shadows Byte Gaming Official — lector público de noticias, versión 1.
   Cada noticia publicada tiene su propia URL #/noticia?id=... */
(function () {
  'use strict';
  if (typeof pages === 'undefined' || typeof newsCards !== 'function' || typeof sb === 'undefined') return;

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
  const safeCover = url => typeof url === 'string' && /^https:\/\//i.test(url.trim()) ? url.trim() : '';
  const articleUrl = id => '#/noticia?id=' + encodeURIComponent(String(id));
  const formatDate = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' :
      date.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });
  };

  // Los enlaces son accesibles tanto desde Inicio como desde Noticias.
  newsCards = function (items) {
    const visible = Array.isArray(items) ? items.filter(n => n && (n.status == null || n.status === 'published')).sort((a,b) => Number(!!b.is_featured)-Number(!!a.is_featured)) : [];
    if (!visible.length) return '<div class="empty">Aún no hay noticias publicadas</div>';
    return '<div class="content-grid news-grid">' + visible.map(n => {
      const title = String(n.title || 'Noticia');
      const url = n.id == null ? '' : articleUrl(n.id);
      const cover = safeCover(n.cover_url);
      const date = formatDate(n.published_at);
      const fullExcerpt = String(n.excerpt || n.content || '').trim();
      const excerpt = fullExcerpt.length > 185 ? fullExcerpt.slice(0, 185).trimEnd() + '…' : fullExcerpt;
      const img = cover ? '<img class="news-cover" src="' + escape(cover) +
        '" alt="Imagen de ' + escape(title) + '" loading="lazy" decoding="async" onerror="this.hidden=true">' : '';
      const imageHTML = img && url ? '<a class="sb-news-cover-link" href="' + escape(url) +
        '" aria-label="Leer ' + escape(title) + '">' + img + '</a>' : img;
      const dateHTML = date ? '<time class="news-date" datetime="' + escape(n.published_at) + '">📅 ' + escape(date) + '</time>' : '';
      const featuredHTML = n.is_featured ? '<span class="sb-news-featured-badge">⭐ Destacada</span>' : '';
      const titleHTML = '<h3>' + (url ? '<a class="sb-news-title-link" href="' + escape(url) + '">' +
        escape(title) + '</a>' : escape(title)) + '</h3>';
      const readHTML = url
        ? '<a class="sb-news-read-btn" href="' + escape(url) +
          '" aria-label="Leer noticia completa: ' + escape(title) + '">Leer noticia completa <span aria-hidden="true">›</span></a>'
        : '<p class="sb-news-unavailable">No se puede abrir esta noticia.</p>';
      return '<article class="auth-card news-card' + (n.is_featured ? ' sb-news-featured-card' : '') + '">' + imageHTML + featuredHTML + dateHTML + titleHTML +
        (excerpt ? '<p>' + escape(excerpt) + '</p>' : '') + readHTML + '</article>';
    }).join('') + '</div>';
  };

  // app.js consulta el objeto pages cuando cambia el hash. Se conserva su router.
  pages['/noticia'] = () =>
    '<section class="page sb-article-page"><div class="sb-article-wrap">' +
    '<nav class="sb-article-navigation" aria-label="Navegación de la noticia">' +
    '<a class="sb-article-back" href="#/noticias">← Volver a noticias</a>' +
    '</nav><div id="sb-news-article" role="region" aria-live="polite">' +
    '<p class="sb-article-loading">Cargando noticia completa…</p></div></div></section>';

  function contentParagraphs(value) {
    const raw = String(value || '').trim().replace(/\r\n?/g, '\n');
    if (!raw) return '<p>Esta noticia todavía no tiene contenido ampliado.</p>';
    return raw.split(/\n\s*\n/).map(paragraph =>
      '<p>' + escape(paragraph).replace(/\n/g, '<br>') + '</p>'
    ).join('');
  }

  async function renderFullNews() {
    const currentHash = location.hash;
    if (currentHash.slice(1).split('?')[0] !== '/noticia') return;
    const host = document.getElementById('sb-news-article');
    if (!host) return;
    const id = new URLSearchParams(currentHash.split('?').slice(1).join('?')).get('id');
    if (!id || id.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      host.innerHTML = '<div class="sb-article-error"><h1>Noticia no encontrada</h1><p>El enlace no es válido.</p><a href="#/noticias" class="sb-article-back">Ver todas las noticias</a></div>';
      return;
    }

    try {
      const { data: n, error } = await sb.from('news')
        .select('id,title,excerpt,content,cover_url,published_at,status,is_featured')
        .eq('id', id).eq('status', 'published').maybeSingle();
      if (!host.isConnected || location.hash !== currentHash) return;
      if (error) throw error;
      if (!n) {
        host.innerHTML = '<div class="sb-article-error"><h1>Noticia no disponible</h1><p>Esta noticia no existe o ya no está publicada.</p><a href="#/noticias" class="sb-article-back">Ver todas las noticias</a></div>';
        return;
      }

      const title = String(n.title || 'Noticia');
      const cover = safeCover(n.cover_url);
      const date = formatDate(n.published_at);
      const lead = String(n.excerpt || '').trim();
      const content = String(n.content || '').trim();
      host.innerHTML =
        '<article class="sb-full-news">' +
          '<header class="sb-full-news-header"><span class="sb-full-news-kicker">📰 SHADOWS BYTE · NOTICIAS</span>' +
          (n.is_featured ? '<span class="sb-news-featured-badge">⭐ Noticia destacada</span>' : '') +
          '<h1>' + escape(title) + '</h1>' +
          (date ? '<time datetime="' + escape(n.published_at) + '">📅 ' + escape(date) + '</time>' : '') +
          '</header>' +
          (cover ? '<img class="sb-full-news-cover" src="' + escape(cover) +
            '" alt="Imagen de ' + escape(title) + '" onerror="this.hidden=true">' : '') +
          '<div class="sb-full-news-body">' +
            (lead && lead !== content ? '<p class="sb-full-news-lead">' + escape(lead) + '</p>' : '') +
            contentParagraphs(content || lead) +
          '</div>' +
          '<footer class="sb-full-news-footer"><a class="sb-article-back" href="#/noticias">← Volver a todas las noticias</a>' +
          '<button type="button" class="sb-share-news" id="sb-share-news">🔗 Compartir noticia</button>' +
          '<span class="sb-share-status" id="sb-share-status" role="status"></span></footer>' +
        '</article>';
      if (window.SBNewsMentions) window.SBNewsMentions.linkWithin(host.querySelector('.sb-full-news'));
      if (typeof window.sbNewsEnhanceArticle === 'function') window.sbNewsEnhanceArticle(n);
      document.title = title + ' | Shadows Byte Gaming Official';
      const share = document.getElementById('sb-share-news');
      if (share) share.addEventListener('click', async () => {
        const url = location.href;
        const status = document.getElementById('sb-share-status');
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
          } else if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
            if (status) status.textContent = 'Enlace copiado.';
          } else {
            window.prompt('Copia el enlace de la noticia:', url);
          }
        } catch (e) {
          if (e.name !== 'AbortError' && status) status.textContent = 'No se pudo compartir el enlace.';
        }
      });
    } catch (error) {
      if (!host.isConnected || location.hash !== currentHash) return;
      console.error('No se pudo cargar la noticia', error);
      host.innerHTML = '<div class="sb-article-error"><h1>No se pudo cargar la noticia</h1>' +
        '<p>Comprueba tu conexión e inténtalo de nuevo.</p>' +
        '<button class="sb-share-news" id="sb-retry-news" type="button">Reintentar</button></div>';
      document.getElementById('sb-retry-news')?.addEventListener('click', () => {
        host.innerHTML = '<p class="sb-article-loading">Cargando noticia completa…</p>';
        renderFullNews();
      });
    }
  }

  function handleRoute() {
    if (location.hash.slice(1).split('?')[0] === '/noticia') {
      renderFullNews();
    } else if (document.title.includes(' | Shadows Byte Gaming Official')) {
      document.title = 'Shadows Byte Gaming Official';
    }
  }

  window.addEventListener('hashchange', handleRoute);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleRoute);
  } else {
    queueMicrotask(handleRoute);
  }
})();
