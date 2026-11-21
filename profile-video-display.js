/* Convierte URLs de vídeo de perfil/portada en vídeos reales (sin romper imágenes ni GIF).
   Compatibilidad: Mi cuenta, vista previa, tarjetas de Miembros y perfil público. */
(() => {
 'use strict';
 const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
 const tracked = new Set();
 const playerObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
   for (const entry of entries) {
     const video = entry.target;
     if (entry.isIntersecting && !document.hidden && !REDUCED.matches) video.play().catch(() => {});
     else video.pause();
   }
 }, {threshold:0.12}) : null;
 let queued = false;
 function isVideoUrl(value) {
   if (!value) return false;
   try {
     const url = new URL(value, location.href);
     return url.protocol === 'https:' && /\.(mp4|webm)$/i.test(url.pathname);
   } catch (_) { return false; }
 }
 function watch(video) {
   tracked.add(video);
   if (playerObserver) playerObserver.observe(video);
   else if (!REDUCED.matches) video.play().catch(() => {});
 }
 function makeVideo(url, className, label) {
   const video = document.createElement('video');
   video.className = className || '';
   video.src = url;
   video.setAttribute('aria-label',label || 'Vídeo decorativo del perfil');
   video.preload = 'metadata';
   video.muted = true;
   video.defaultMuted = true;
   video.loop = true;
   video.playsInline = true;
   video.disablePictureInPicture = true;
   video.style.width = '100%';
   video.style.height = '100%';
   video.style.objectFit = 'cover';
   video.style.display = 'block';
   video.addEventListener('error', () => {
     if (!video.isConnected) return;
     const parent = video.parentElement;
     if (parent?.matches('.member-avatar,.public-member-avatar,.profile-avatar,.profile-preview-avatar,.sbp-identity-avatar')) {
       video.replaceWith(document.createTextNode('🎮'));
     } else if (parent?.classList.contains('sb-member-card-cover')) {
       parent.parentElement?.classList.remove('sb-member-card-has-cover');
       parent.remove();
     } else video.remove();
   },{once:true});
   watch(video);
   return video;
 }
 function replaceVideoImages() {
   document.querySelectorAll('#account-profile img, #public-member-profile img, #members-list img').forEach(img => {
     const source = img.getAttribute('src');
     if (!isVideoUrl(source)) return;
     // La portada de vista previa se gestiona aparte porque la aplicación actualiza su IMG.
     if (img.matches('.profile-preview-cover-image')) return;
     const video = makeVideo(source,img.className,img.alt || 'Vídeo del perfil');
     img.replaceWith(video);
   });
 }
 function coverVideo(parent, className, url, label) {
   if (!parent) return;
   let video = parent.querySelector(':scope > video.' + className);
   if (!isVideoUrl(url)) {
     if (video) { playerObserver?.unobserve(video); tracked.delete(video); video.remove(); }
     parent.classList.remove('sb-has-video-cover');
     return;
   }
   parent.classList.add('sb-has-video-cover');
   if (!video) {
     video = makeVideo(url,className,label);
     parent.prepend(video);
   } else if (video.getAttribute('src') !== url) video.src = url;
 }
 function syncAccount() {
   const form = document.querySelector('#account-profile #profile-form');
   if (!form) return;
   const coverUrl = form.querySelector('#profile-cover-url')?.value.trim() || '';
   const cover = document.querySelector('#account-profile .profile-cover');
   coverVideo(cover,'sb-profile-video-cover',coverUrl,'Vídeo de mi portada');
   if (isVideoUrl(coverUrl) && cover) cover.style.backgroundImage = 'none';
   const previewCover = document.querySelector('#account-profile .profile-preview-cover');
   const image = previewCover?.querySelector('.profile-preview-cover-image');
   if (isVideoUrl(coverUrl)) {
     if (image) {
       image.hidden = true;
       image.removeAttribute('src');
     }
     coverVideo(previewCover,'sb-preview-video-cover',coverUrl,'Vista previa de la portada en vídeo');
     const notice = previewCover?.querySelector('.profile-preview-cover-notice');
     if (notice) notice.textContent = '';
   } else {
     coverVideo(previewCover,'sb-preview-video-cover','', '');
   }
 }
 function openVideo(source, title) {
   if (!isVideoUrl(source) || typeof HTMLDialogElement === 'undefined') return;
   document.querySelector('.sb-profile-video-dialog')?.close();
   const dialog = document.createElement('dialog');
   dialog.className = 'sb-profile-video-dialog';
   dialog.setAttribute('aria-label',title);
   const close = document.createElement('button');
   close.type = 'button'; close.className = 'sb-profile-video-close'; close.textContent = '✕ Cerrar';
   close.onclick = () => dialog.close();
   const heading = document.createElement('strong'); heading.textContent = title;
   const video = document.createElement('video');
   video.src = source; video.controls = true; video.playsInline = true;
   video.preload = 'metadata'; video.muted = true; video.loop = true;
   dialog.append(close,heading,video);
   dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
   dialog.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); dialog.remove(); }, {once:true});
   document.body.append(dialog);
   try { dialog.showModal(); video.play().catch(() => {}); close.focus(); }
   catch (_) { dialog.remove(); }
 }
 function syncPublic() {
   const root = document.getElementById('public-member-profile');
   if (!root) return;
   const avatar = root.querySelector('.public-member-avatar');
   const avatarVideo = avatar?.querySelector('video');
   if (avatarVideo && !avatar.dataset.sbVideoViewer) {
     avatar.dataset.sbVideoViewer = 'true';
     avatar.classList.remove('sb-public-avatar-zoom');
     avatar.setAttribute('role','button');
     avatar.setAttribute('tabindex','0');
     avatar.setAttribute('aria-label','Ampliar vídeo de perfil');
     avatar.addEventListener('click', () => {
       const active = avatar.querySelector('video');
       if (active) openVideo(active.currentSrc || active.src,'Vídeo de perfil');
     });
     avatar.addEventListener('keydown', event => {
       if (event.target === avatar && (event.key === 'Enter' || event.key === ' ')) {
         event.preventDefault();
         const active = avatar.querySelector('video');
         if (active) openVideo(active.currentSrc || active.src,'Vídeo de perfil');
       }
     });
   }
   const cover = root.querySelector('.public-member-cover');
   const coverVideo = cover?.querySelector('video.public-member-cover-image');
   if (cover && coverVideo) {
     let view = cover.querySelector('.sb-public-cover-view');
     if (!view) {
       view = document.createElement('button');
       view.type = 'button'; view.className = 'sb-public-cover-view';
       cover.append(view);
     }
     view.textContent = '▶ Ver vídeo de portada';
     view.setAttribute('aria-label','Reproducir el vídeo de portada');
     view.onclick = () => {
       const active = cover.querySelector('video.public-member-cover-image');
       if (active) openVideo(active.currentSrc || active.src,'Vídeo de portada');
     };
   }
 }
 function scan() {
   queued = false;
   replaceVideoImages();
   syncAccount();
   syncPublic();
   // El observer solo observa inserción/eliminación de nodos para evitar bucles de atributos.
   for (const video of tracked) if (!video.isConnected) {
     playerObserver?.unobserve(video);
     tracked.delete(video);
   }
 }
 function queue() {
   if (queued) return;
   queued = true;
   requestAnimationFrame(scan);
 }
 function start() {
   const app = document.getElementById('app');
   if (app) new MutationObserver(queue).observe(app,{childList:true,subtree:true});
   document.addEventListener('input',event => {
     if (event.target?.id === 'profile-cover-url' || event.target?.id === 'profile-avatar-url') queue();
   });
   document.addEventListener('change',event => {
     if (event.target?.id === 'profile-cover-url' || event.target?.id === 'profile-avatar-url') queue();
   });
   document.addEventListener('visibilitychange', () => {
     for (const video of tracked) {
       if (document.hidden || REDUCED.matches) video.pause();
       else if (!playerObserver && video.isConnected) video.play().catch(() => {});
     }
   });
   REDUCED.addEventListener?.('change', () => {
     if (REDUCED.matches) for (const video of tracked) video.pause();
     else queue();
   });
   window.addEventListener('hashchange',queue);
   queue();
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();