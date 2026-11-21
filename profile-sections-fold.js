/* Shadows Byte Gaming Official V2 — apartados secundarios de Mi cuenta, plegables. */
(() => {
 'use strict';

 const SECTION_SELECTORS = [
  '.sb-nav-panel',                  // Explorar secciones del perfil
  '.sbp-dashboard',                 // Mi centro de perfil
  '.sb-profile-views',              // Visitas y estadísticas anuales
  '.sbd-discovery',                 // Descubre miembros afines
  '.sbgl-links',                    // Mis enlaces gamer
  '.sbgl-link-analytics',           // Estadísticas de enlaces
  '.sbgl-badges',                   // Logros por enlaces
  '.sbv-editor',                    // Vitrina de insignias
  '.sb-reward-history',             // Historial de puntos
  '.sbrs-panel',                    // Estadísticas de puntos
  '.sbpg-panel',                    // Mis metas de puntos
  '.sbpm-panel',                    // Medallero de metas
  '.sbgt-gallery',                  // Galería de trofeos anime
  '.sb-showcase',                   // Escaparate gamer
  '.sbg-stats',                     // Estadísticas gamer
  '.sba-timeline',                  // Actividad reciente
  '.sbc-connections',               // Conexiones gamer
  '.sbr-goals',                     // Retos de colección
  '.sbs-challenges',                // Retos sociales
  '.sb-profile-levels-shortcut',    // Reserva para acceso a logros
  '#account-notification-settings', // Configuración de notificaciones
  '.poll-month-trophy-gallery',     // Trofeos de encuestas
  '.poll-trophy-museum',            // Museo de trofeos anime
  '.profile-now-panel',             // Mi momento anime y gaming
  '#game-library',                  // Biblioteca de videojuegos
  '.account-follows-panel',         // Seguidores y siguiendo
  '#account-blocked-members',       // Miembros bloqueados
  '#account-gallery',               // Galería de imágenes
  '.account-community-panel'        // Mi comunidad
 ];

 function sectionRank(element) {
  const rank = SECTION_SELECTORS.findIndex(selector => element.matches(selector));
  if (rank !== -1) return rank;
  const title = element.querySelector(':scope > h2, :scope > h3');
  if (element.classList.contains('profile-panel') &&
      /mis logros y nivel/i.test(title?.textContent || '')) return 19;
  return -1;
 }

 function isReportPanel(node) {
  return node.classList.contains('account-report-panel') &&
    /mis denuncias/i.test(node.querySelector(':scope > h3')?.textContent || '');
 }
 function isHistoryPanel(node) {
  return node.classList.contains('account-report-panel') &&
    /historial de avisos de denuncias/i.test(node.querySelector(':scope > h3')?.textContent || '');
 }

 function reveal(group) {
  const content = group.querySelector('#sb-profile-sections-content');
  const button = group.querySelector('#sb-profile-sections-toggle');
  if (!content || !button) return;
  content.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  button.textContent = '🙈 Ocultar contenido';
 }


 function mountFollowsShortcut(body) {
  const identity = body.querySelector(':scope > .profile-identity');
  if (!identity) return;
  let shortcut = body.querySelector(':scope > .sb-profile-follow-shortcut');
  if (!shortcut) {
   shortcut = document.createElement('button');
   shortcut.type = 'button';
   shortcut.className = 'sb-profile-follow-shortcut';
   shortcut.setAttribute('aria-controls','account-follows');
   shortcut.setAttribute('aria-label','Abrir Seguidores y Siguiendo y gestionar tus conexiones');
   const title = document.createElement('strong');
   title.textContent = '👥 Seguidores y Siguiendo';
   const description = document.createElement('span');
   description.textContent = 'Ver seguidores, filtro Mutuos y botones Seguir';
   shortcut.append(title, description);
   shortcut.addEventListener('click', () => {
    const group = body.querySelector('#sb-profile-sections-group');
    if (group) reveal(group);
    const target = body.querySelector('#account-follows');
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
     if (!target.isConnected) return;
     target.scrollIntoView({behavior:reduceMotion?'auto':'smooth', block:'start'});
     target.focus({preventScroll:true});
    });
   });
  }
  if (identity.nextElementSibling !== shortcut) identity.after(shortcut);
 }

 function buildGroup(body) {
  const group = document.createElement('section');
  group.className = 'profile-panel sb-profile-sections-group';
  group.id = 'sb-profile-sections-group';
  group.setAttribute('aria-label', 'Secciones adicionales de mi perfil');
  const title = document.createElement('h2');
  title.textContent = '🗂️ Secciones de mi perfil';
  const caption = document.createElement('p');
  caption.textContent = 'Estadísticas, comunidad, logros, biblioteca y otras opciones de tu cuenta.';
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'sb-profile-sections-toggle';
  button.className = 'gradient-btn mini sb-profile-sections-toggle';
  button.textContent = '👁️ Mostrar contenido';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'sb-profile-sections-content');
  const content = document.createElement('div');
  content.id = 'sb-profile-sections-content';
  content.className = 'sb-profile-sections-content';
  content.hidden = true;
  button.addEventListener('click', () => {
   if (content.hidden) reveal(group);
   else {
    content.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.textContent = '👁️ Mostrar contenido';
   }
  });
  group.append(title, caption, button, content);
  body.append(group);
  return group;
 }

 let pending = false;
 function sync() {
  pending = false;
  const host = document.getElementById('account-profile');
  const body = host?.querySelector('.profile-body');
  if (!body || !host.querySelector('#profile-form')) return;
  const group = body.querySelector(':scope > #sb-profile-sections-group') || buildGroup(body);
  mountFollowsShortcut(body);
  const content = group.querySelector('#sb-profile-sections-content');
  if (!content) return;

  // Mover los elementos originales (no clonarlos): sus formularios,
  // referencias, controles y suscripciones siguen funcionando.
  const selected = [...content.children, ...body.children]
    .filter(node => node !== group && sectionRank(node) >= 0);
  selected.sort((a, b) => sectionRank(a) - sectionRank(b));
  for (let index = 0; index < selected.length; index++) {
   const section = selected[index];
   if (content.children[index] !== section)
    content.insertBefore(section, content.children[index] || null);
  }

  // Mantener el bloque completo justo antes de Mis denuncias y dejar
  // debajo el historial y el centro de seguridad, aunque lleguen módulos tarde.
  const report = [...body.children].find(isReportPanel);
  const history = [...body.children].find(isHistoryPanel);
  const security = body.querySelector(':scope > #security-privacy-center');
  const footer = [group, report, history, security].filter(Boolean);
  const currentTail = [...body.children].slice(-footer.length);
  if (footer.some((node, index) => node !== currentTail[index]))
   body.append(...footer);
 }

 function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(sync);
 }

 function init() {
  const app = document.getElementById('app');
  if (!app) return;
  new MutationObserver(schedule).observe(app, {childList: true, subtree: true});
  document.addEventListener('click', event => {
   // El atajo de No molestar está fuera del bloque: abrirlo antes de navegar.
   if (!event.target.closest('.account-dnd-shortcut')) return;
   const group = document.getElementById('sb-profile-sections-group');
   if (group) reveal(group);
  }, true);
  addEventListener('hashchange', schedule);
  schedule();
 }
 if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', init, {once: true});
 else init();
})();
