/* Shadows Byte Gaming Official V2 — GIF e imágenes para avatar y portada.
   Usa el bucket público community-images existente, bajo la carpeta del usuario.
   Las URLs generadas se guardan mediante el formulario normal de Mi cuenta. */
(() => {
 'use strict';
 const BUCKET = 'community-images';
 const MAX_SIZE = 5 * 1024 * 1024;
 const ACCEPTED = {'image/gif':'gif','image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
 let scheduled = false;
 let pending = 0;

 function queue() {
   if (scheduled) return;
   scheduled = true;
   requestAnimationFrame(() => { scheduled = false; mount(); });
 }
 function alertStatus(node, message, error = false) {
   node.textContent = message;
   node.classList.toggle('is-error', error);
 }
 async function validImage(file) {
   if (!file || !Object.prototype.hasOwnProperty.call(ACCEPTED, file.type)) {
     throw Error('Selecciona una imagen JPG, PNG, WebP o GIF.');
   }
   if (file.size > MAX_SIZE) throw Error('La imagen supera el límite de 5 MB.');
   if (file.size === 0) throw Error('El archivo está vacío.');
   const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
   const ascii = indexes => String.fromCharCode(...indexes.map(i => b[i] || 0));
   const good = file.type === 'image/gif'
     ? ['GIF87a','GIF89a'].includes(ascii([0,1,2,3,4,5]))
     : file.type === 'image/png'
       ? b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71
       : file.type === 'image/jpeg'
         ? b[0] === 255 && b[1] === 216 && b[2] === 255
         : ascii([0,1,2,3]) === 'RIFF' && ascii([8,9,10,11]) === 'WEBP';
   if (!good) throw Error('El archivo no parece una imagen válida.');
 }
 function renderInput({fieldId, label, slot, kind, shape, form}) {
   const field = document.getElementById(fieldId);
   if (!field || field.dataset.sbGifEnabled) return;
   field.dataset.sbGifEnabled = 'true';
   field.placeholder = kind === 'avatar'
     ? 'https://ejemplo.com/foto.gif'
     : 'https://ejemplo.com/portada.gif';
   const inputLabel = document.querySelector('label[for="' + fieldId + '"]');
   if (inputLabel) inputLabel.textContent = label + ' (URL HTTPS, JPG, PNG, WebP o GIF)';
   const wrapper = document.createElement('div');
   wrapper.className = 'sb-profile-gif-uploader';
   const header = document.createElement('label');
   header.className = 'sb-profile-gif-label';
   const pickerId = 'sb-profile-file-' + kind;
   header.htmlFor = pickerId;
   header.textContent = kind === 'avatar' ? '📸 Subir foto o GIF animado' : '🖼️ Subir portada o GIF animado';
   const help = document.createElement('small');
   help.className = 'sb-profile-gif-help';
   help.textContent = 'GIF, JPG, PNG o WebP · máximo 5 MB. El GIF conserva su animación.';
   const picker = document.createElement('input');
   picker.type = 'file'; picker.id = pickerId;
   picker.accept = 'image/gif,image/jpeg,image/png,image/webp,.gif';
   picker.setAttribute('aria-describedby', pickerId + '-hint');
   help.id = pickerId + '-hint';
   picker.className = 'sb-profile-gif-file';
   const preview = document.createElement('img');
   preview.className = 'sb-profile-gif-preview sb-profile-gif-preview--' + shape;
   preview.alt = kind === 'avatar' ? 'Vista previa de la imagen o GIF de perfil' : 'Vista previa de la imagen o GIF de portada';
   preview.hidden = true;
   const status = document.createElement('p');
   status.className = 'sb-profile-gif-status';
   status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
   wrapper.append(header,help,picker,preview,status);
   if (slot === 'after') field.after(wrapper);
   else field.parentNode.insertBefore(wrapper, field);
   let localUrl = null;
   picker.addEventListener('change', async () => {
     const file = picker.files?.[0];
     if (!file) return;
     try {
       await validImage(file);
     } catch (err) {
       alertStatus(status, err.message, true);
       picker.value = '';
       preview.hidden = true;
       return;
     }
     if (localUrl) URL.revokeObjectURL(localUrl);
     localUrl = URL.createObjectURL(file);
     preview.src = localUrl; preview.hidden = false;
     preview.onload = () => {};
     const saveButton = form.querySelector('button[type="submit"]');
     pending++;
     if (saveButton) saveButton.disabled = true;
     picker.disabled = true;
     alertStatus(status,'Subiendo ' + (file.type === 'image/gif' ? 'GIF animado' : 'imagen') + '…');
     let path = '';
     try {
       const {data:{user},error:authError} = await sb.auth.getUser();
       if (authError || !user) throw Error('Inicia sesión para subir imágenes.');
       const token = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
       path = user.id + '/profile-' + kind + '-' + token + '.' + ACCEPTED[file.type];
       const {error:uploadError} = await sb.storage.from(BUCKET).upload(path,file,{
         contentType:file.type, cacheControl:'3600', upsert:false
       });
       if (uploadError) throw uploadError;
       if (!field.isConnected) return;
       const {data} = sb.storage.from(BUCKET).getPublicUrl(path);
       if (!data?.publicUrl || !/^https:\/\//i.test(data.publicUrl)) {
         throw Error('No se pudo obtener el enlace público de la imagen.');
       }
       field.value = data.publicUrl;
       field.dispatchEvent(new Event('input',{bubbles:true}));
       field.dispatchEvent(new Event('change',{bubbles:true}));
       alertStatus(status,'✅ Imagen subida. Pulsa «Guardar cambios» para ponerla en tu perfil.');
       picker.value = '';
     } catch (err) {
       if (field.isConnected) alertStatus(status,'No se pudo subir: ' + (err.message || 'Error desconocido'),true);
     } finally {
       pending = Math.max(0,pending - 1);
       picker.disabled = false;
       if (saveButton && pending === 0 && saveButton.isConnected) saveButton.disabled = false;
       if (localUrl) { URL.revokeObjectURL(localUrl); localUrl = null; }
     }
   });
 }
 function mount() {
   if (location.hash.split('?')[0] !== '#/cuenta') return;
   const root = document.getElementById('account-profile');
   const form = root?.querySelector('#profile-form');
   if (!form) return;
   renderInput({fieldId:'profile-avatar-url',label:'Foto de perfil',slot:'after',kind:'avatar',shape:'avatar',form});
   renderInput({fieldId:'profile-cover-url',label:'Portada',slot:'after',kind:'cover',shape:'cover',form});
 }
 const start = () => {
   const root = document.getElementById('app');
   if (!root) return;
   new MutationObserver(queue).observe(root,{childList:true,subtree:true});
   window.addEventListener('hashchange',queue);
   queue();
 };
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();