/* Shadows Byte Gaming Official V2: subida de fotos, GIF y vídeos de perfil y portada.
   Imágenes (5 MB) al bucket community-images; vídeos cortos (20 MB, 30 s)
   al bucket público profile-videos. Guardar cambios persiste la URL en profiles. */
(() => {
 'use strict';
 const IMAGE_BUCKET = 'community-images';
 const VIDEO_BUCKET = 'profile-videos';
 const IMAGE_LIMIT = 5 * 1024 * 1024;
 const VIDEO_LIMIT = 20 * 1024 * 1024;
 const VIDEO_SECONDS = 30;
 const EXT = {'image/gif':'gif','image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
 let scheduled = false;
 let pending = 0;

 const isVideo = file => file.type === 'video/mp4' || file.type === 'video/webm';
 function queue() {
   if (scheduled) return;
   scheduled = true;
   requestAnimationFrame(() => { scheduled = false; mount(); });
 }
 function status(node, message, error = false) {
   node.textContent = message;
   node.classList.toggle('is-error', error);
 }
 function checkMagic(file, bytes) {
   const text = (start, length) => String.fromCharCode(...bytes.slice(start, start + length));
   switch (file.type) {
     case 'image/gif': return ['GIF87a','GIF89a'].includes(text(0,6));
     case 'image/png': return bytes[0] === 137 && text(1,3) === 'PNG';
     case 'image/jpeg': return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
     case 'image/webp': return text(0,4) === 'RIFF' && text(8,4) === 'WEBP';
     case 'video/mp4': return text(4,4) === 'ftyp';
     case 'video/webm': return bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163;
     default: return false;
   }
 }
 async function checkVideoLength(file) {
   const objectUrl = URL.createObjectURL(file);
   const probe = document.createElement('video');
   probe.preload = 'metadata';
   try {
     const length = await new Promise((resolve, reject) => {
       const timer = setTimeout(() => reject(Error('No se pudo leer el vídeo. Prueba con un MP4 compatible.')), 12000);
       probe.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(probe.duration); }, {once:true});
       probe.addEventListener('error', () => { clearTimeout(timer); reject(Error('Formato de vídeo no compatible con este navegador.')); }, {once:true});
       probe.src = objectUrl;
       probe.load();
     });
     if (!Number.isFinite(length) || length <= 0) throw Error('No se pudo comprobar la duración del vídeo.');
     if (length > VIDEO_SECONDS) throw Error('El vídeo no puede durar más de 30 segundos.');
   } finally {
     probe.removeAttribute('src');
     probe.load();
     URL.revokeObjectURL(objectUrl);
   }
 }
 async function validate(file) {
   if (!file || !Object.prototype.hasOwnProperty.call(EXT,file.type)) {
     throw Error('Selecciona JPG, PNG, WebP, GIF, MP4 o WebM.');
   }
   if (file.size === 0) throw Error('El archivo está vacío.');
   if (file.size > (isVideo(file) ? VIDEO_LIMIT : IMAGE_LIMIT)) {
     throw Error(isVideo(file) ? 'El vídeo supera los 20 MB.' : 'La imagen supera los 5 MB.');
   }
   const bytes = new Uint8Array(await file.slice(0,16).arrayBuffer());
   if (!checkMagic(file,bytes)) throw Error('El contenido del archivo no coincide con su formato.');
   if (isVideo(file)) await checkVideoLength(file);
 }
 function renderInput({fieldId, label, kind, shape, form}) {
   const field = document.getElementById(fieldId);
   if (!field || field.dataset.sbGifEnabled) return;
   field.dataset.sbGifEnabled = 'true';
   field.placeholder = kind === 'avatar' ? 'https://ejemplo.com/perfil.mp4' : 'https://ejemplo.com/portada.mp4';
   const inputLabel = document.querySelector('label[for="' + fieldId + '"]');
   if (inputLabel) inputLabel.textContent = label + ' (URL HTTPS de imagen, GIF o vídeo)';
   const wrapper = document.createElement('div');
   wrapper.className = 'sb-profile-gif-uploader';
   const header = document.createElement('label');
   header.className = 'sb-profile-gif-label';
   const pickerId = 'sb-profile-file-' + kind;
   header.htmlFor = pickerId;
   header.textContent = kind === 'avatar' ? '📸 Subir foto, GIF o vídeo de perfil' : '🎬 Subir imagen, GIF o vídeo de portada';
   const help = document.createElement('small');
   help.className = 'sb-profile-gif-help';
   help.textContent = 'Imágenes y GIF: máximo 5 MB · MP4 o WebM: máximo 20 MB y 30 segundos. Los vídeos se reproducen sin sonido.';
   const picker = document.createElement('input');
   picker.type = 'file'; picker.id = pickerId;
   picker.accept = 'image/gif,image/jpeg,image/png,image/webp,video/mp4,video/webm,.gif,.mp4,.webm';
   picker.setAttribute('aria-describedby',pickerId + '-hint');
   help.id = pickerId + '-hint';
   picker.className = 'sb-profile-gif-file';
   const image = document.createElement('img');
   image.className = 'sb-profile-gif-preview sb-profile-gif-preview--' + shape;
   image.alt = kind === 'avatar' ? 'Vista previa del perfil' : 'Vista previa de la portada';
   image.hidden = true;
   const video = document.createElement('video');
   video.className = image.className;
   video.muted = true; video.loop = true; video.playsInline = true;
   video.controls = true; video.preload = 'metadata'; video.hidden = true;
   const feedback = document.createElement('p');
   feedback.className = 'sb-profile-gif-status';
   feedback.setAttribute('role','status'); feedback.setAttribute('aria-live','polite');
   wrapper.append(header,help,picker,image,video,feedback);
   field.after(wrapper);
   let localUrl = null;
   const clearLocal = () => { if (localUrl) URL.revokeObjectURL(localUrl); localUrl = null; };
   function showPreview(url, movie) {
     image.hidden = movie;
     video.hidden = !movie;
     if (movie) {
       image.removeAttribute('src');
       video.src = url;
       if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(() => {});
     } else {
       video.pause();
       video.removeAttribute('src');
       image.src = url;
     }
   }
   picker.addEventListener('change', async () => {
     const file = picker.files?.[0];
     if (!file) return;
     try { await validate(file); }
     catch (err) {
       status(feedback,err.message,true);
       picker.value = ''; image.hidden = true; video.hidden = true; video.pause();
       return;
     }
     clearLocal();
     localUrl = URL.createObjectURL(file);
     showPreview(localUrl,isVideo(file));
     const saveButton = form.querySelector('button[type="submit"]');
     pending++;
     if (saveButton) saveButton.disabled = true;
     picker.disabled = true;
     status(feedback,'Subiendo ' + (isVideo(file) ? 'vídeo' : (file.type === 'image/gif' ? 'GIF' : 'imagen')) + '…');
     try {
       const {data:{user},error:authError} = await sb.auth.getUser();
       if (authError || !user) throw Error('Inicia sesión para subir archivos.');
       const token = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
       const path = user.id + '/profile-' + kind + '-' + token + '.' + EXT[file.type];
       const bucket = isVideo(file) ? VIDEO_BUCKET : IMAGE_BUCKET;
       const {error:uploadError} = await sb.storage.from(bucket).upload(path,file,{
         contentType:file.type,cacheControl:'3600',upsert:false
       });
       if (uploadError) throw uploadError;
       const {data} = sb.storage.from(bucket).getPublicUrl(path);
       if (!data?.publicUrl || !/^https:\/\//i.test(data.publicUrl)) throw Error('No se pudo obtener el enlace público.');
       if (!field.isConnected) return;
       showPreview(data.publicUrl,isVideo(file));
       field.value = data.publicUrl;
       field.dispatchEvent(new Event('input',{bubbles:true}));
       field.dispatchEvent(new Event('change',{bubbles:true}));
       status(feedback,'✅ Archivo subido. Pulsa «Guardar cambios» para publicarlo en tu perfil.');
       picker.value = '';
     } catch (err) {
       status(feedback,'No se pudo subir: ' + (err.message || 'Error desconocido'),true);
     } finally {
       pending = Math.max(0,pending - 1);
       picker.disabled = false;
       if (saveButton && pending === 0 && saveButton.isConnected) saveButton.disabled = false;
       clearLocal();
     }
   });
 }
 function mount() {
   if (location.hash.split('?')[0] !== '#/cuenta') return;
   const root = document.getElementById('account-profile');
   const form = root?.querySelector('#profile-form');
   if (!form) return;
   renderInput({fieldId:'profile-avatar-url',label:'Foto de perfil',kind:'avatar',shape:'avatar',form});
   renderInput({fieldId:'profile-cover-url',label:'Portada',kind:'cover',shape:'cover',form});
 }
 function start() {
   const root = document.getElementById('app');
   if (!root) return;
   new MutationObserver(queue).observe(root,{childList:true,subtree:true});
   window.addEventListener('hashchange',queue);
   queue();
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();