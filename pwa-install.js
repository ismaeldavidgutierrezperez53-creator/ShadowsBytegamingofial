/* Instala Shadows Byte como aplicación sin alterar el Service Worker de avisos. */
(() => {
  'use strict';
  const button = document.getElementById('sb-install-app-button');
  const help = document.getElementById('sb-install-help');
  if (!button || !help) return;
  let promptEvent = null, justInstalled = false;
  const installed = () => justInstalled || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const markInstalled = () => { button.textContent = '✅ Aplicación instalada'; button.disabled = true; help.hidden = true; };
  const inform = (title, message, steps = []) => {
    help.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = title; help.append(heading);
    if (message) { const p = document.createElement('p'); p.textContent = message; help.append(p); }
    if (steps.length) {
      const ol = document.createElement('ol');
      steps.forEach(step => { const li = document.createElement('li'); li.textContent = step; ol.append(li); });
      help.append(ol);
    }
    help.hidden = false;
  };
  const manual = () => {
    if (ios()) inform('📱 Instalar en iPhone o iPad', 'Añade Shadows Byte desde el navegador:',
      ['Abre la página en Safari.', 'Pulsa Compartir y selecciona «Añadir a pantalla de inicio».',
       'Confirma y abre Shadows Byte desde su icono.']);
    else if (/Android/i.test(navigator.userAgent)) inform('📱 Instalar en Android', 'En Google Chrome:',
      ['Pulsa el menú ⋮.', 'Elige «Instalar aplicación» o «Añadir a pantalla de inicio».',
       'Confirma y abre la aplicación desde su icono.']);
    else inform('💻 Instalar en el ordenador', 'En Google Chrome o Microsoft Edge:',
      ['Abre el menú del navegador (⋮ o ···).',
       'Selecciona «Instalar Shadows Byte» o «Aplicaciones > Instalar este sitio como aplicación».',
       'Confirma para abrir Shadows Byte en su propia ventana.']);
  };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); promptEvent = event; });
  window.addEventListener('appinstalled', () => { justInstalled = true; promptEvent = null; markInstalled(); });
  if (installed()) markInstalled();
  button.addEventListener('click', async () => {
    if (installed()) { markInstalled(); return; }
    if (!isSecureContext) {
      inform('Necesitas HTTPS', 'Abre la página publicada con HTTPS, no el archivo index.html de tu ordenador.');
      return;
    }
    if (promptEvent) {
      const pending = promptEvent; promptEvent = null;
      try {
        await pending.prompt();
        const choice = await pending.userChoice;
        if (choice?.outcome === 'accepted')
          inform('✅ Instalación solicitada', 'Confirma la instalación en tu navegador.');
        else manual();
      } catch (error) { console.warn('Install prompt:', error); manual(); }
      return;
    }
    if (typeof navigator.install === 'function') {
      try { await navigator.install(); justInstalled = true; markInstalled(); }
      catch (error) { console.warn('Web Install API:', error); manual(); }
      return;
    }
    manual();
  });
  // PWA y Web Push comparten exactamente el mismo sw.js y scope.
  if ('serviceWorker' in navigator && isSecureContext) {
    const register = () => navigator.serviceWorker.register('./sw.js', {scope:'./'})
      .catch(error => console.warn('Registro de Service Worker:', error));
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, {once:true});
  }
})();
