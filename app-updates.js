/* SB V2: actualizaciones basadas en el despliegue REAL de GitHub Pages. */
(() => {
 'use strict';
 const btn=document.getElementById('sb-update-check');
 const output=document.getElementById('sb-updates-menu-status');
 if(!btn||!output||!/^https?:$/.test(location.protocol))return;
 const toggle=document.getElementById('sb-auto-update-on-open');
 const keyAuto='sb-auto-update-on-open', keyAttempt='sb-update-attempted';
 const keyDismiss='sb-update-dismissed';
 const shaOk=value=>/^[0-9a-f]{40}$/i.test(value||'');
 const stamped=document.querySelector('meta[name="sb-build"]')?.content;
 const legacy=(()=>{try{return localStorage.getItem('sb-v2-seen-github-version');}catch{return null;}})();
 const installed=shaOk(stamped)?stamped:(shaOk(legacy)?legacy:null);
 const currentUrl=new URL('./app-version.json',location.href);
 const started=Date.now();
 let last=0,checking=false,applying=false,changed=false,pending=null,banner=null;
 const read=(storage,key)=>{try{return storage.getItem(key);}catch{return null;}};
 const write=(storage,key,value)=>{try{storage.setItem(key,value);}catch{}};
 const remove=(storage,key)=>{try{storage.removeItem(key);}catch{}};
 const enabled=()=>read(localStorage,keyAuto)!=='off';
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const message=text=>{output.textContent=text;};
 if(toggle){
   toggle.checked=enabled();
   toggle.addEventListener('change',()=>{
     write(localStorage,keyAuto,toggle.checked?'on':'off');
     message(toggle.checked?'Actualización al abrir activada.':'Te avisaremos antes de actualizar.');
   });
 }
 for(const type of ['pointerdown','keydown','input','touchstart']){
   document.addEventListener(type,()=>{changed=true;},{capture:true,once:true,passive:true});
 }
 function createBanner(){
   if(banner)return banner;
   banner=document.createElement('aside');
   banner.className='sb-update-notice';
   banner.hidden=true;
   banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
   const title=document.createElement('p');
   title.className='sb-update-notice__title';
   title.textContent='✨ Nueva versión de SB V2';
   const body=document.createElement('p');
   body.className='sb-update-notice__text';
   body.textContent='La actualización ya está publicada. Puedes instalarla ahora sin perder la sección abierta.';
   const actions=document.createElement('div');actions.className='sb-update-notice__actions';
   const accept=document.createElement('button');
   accept.type='button';accept.className='sb-update-now';accept.textContent='🔄 Actualizar ahora';
   const later=document.createElement('button');
   later.type='button';later.className='sb-update-later';later.textContent='Más tarde';
   accept.addEventListener('click',()=>{void apply();});
   later.addEventListener('click',()=>{
     if(pending)write(sessionStorage,keyDismiss,pending);
     banner.hidden=true;message('Actualización pendiente. Puedes buscarla desde el menú.');
   });
   actions.append(accept,later);banner.append(title,body,actions);document.body.append(banner);
   return banner;
 }
 async function onlineVersion(){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   try{
     const endpoint=new URL(currentUrl.href);
     endpoint.searchParams.set('sb_check',String(Date.now()));
     const response=await fetch(endpoint.href,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
     if(!response.ok)throw new Error('No disponible');
     const data=await response.json();
     if(!shaOk(data?.version))throw new Error('Versión no válida');
     return data.version;
   }finally{clearTimeout(timer);}
 }
 async function readyWorker(){
   if(!('serviceWorker' in navigator))return;
   let registration;
   try{
     registration=await navigator.serviceWorker.getRegistration('./');
     if(!registration)return;
     await registration.update();
   }catch(error){console.warn('Actualización del Service Worker:',error);return;}
   if(!registration.waiting&&registration.installing){
     await Promise.race([
       new Promise(resolve=>{
         const worker=registration.installing;
         if(!worker||worker.state==='installed'||worker.state==='activated')return resolve();
         worker.addEventListener('statechange',()=>{
           if(worker.state==='installed'||worker.state==='activated'||worker.state==='redundant')resolve();
         });
       }),
       new Promise(resolve=>setTimeout(resolve,2300))
     ]);
   }
   if(registration.waiting){
     const activated=new Promise(resolve=>{
       const done=()=>{navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};
       navigator.serviceWorker.addEventListener('controllerchange',done);
       setTimeout(done,2800);
     });
     registration.waiting.postMessage({type:'SB_APPLY_UPDATE'});
     await activated;
   }
 }
 async function apply(){
   if(applying||!pending)return;
   applying=true;btn.disabled=true;
   banner?.querySelectorAll('button').forEach(b=>b.disabled=true);
   message('🔄 Instalando actualización de SB V2…');
   write(sessionStorage,keyAttempt,pending);
   try{
     await readyWorker();
     const next=new URL(location.href);
     next.searchParams.set('sb_updated',Date.now().toString(36));
     location.replace(next.href); // preserva la ruta # y el inicio de sesión
   }catch(error){
     applying=false;btn.disabled=false;
     banner?.querySelectorAll('button').forEach(b=>b.disabled=false);
     remove(sessionStorage,keyAttempt);
     message('No se pudo actualizar. Inténtalo otra vez.');
     console.warn('Actualización fallida:',error);
   }
 }
 async function check(manual=false){
   if(checking||applying)return;
   if(!navigator.onLine){if(manual)message('Sin conexión. Comprobaremos al volver internet.');return;}
   if(!manual&&document.visibilityState==='hidden')return;
   checking=true;last=Date.now();btn.disabled=true;
   if(manual)message('Comprobando la versión publicada…');
   try{
     const published=await onlineVersion();
     if(!installed){
       if(manual)message('✅ Comprobación realizada. La versión se identificará al volver a abrir SB V2.');
     }else if(installed!==published){
       pending=published;
       message('✨ Nueva versión publicada ('+published.slice(0,7)+').');
       if(manual)remove(sessionStorage,keyDismiss);
       const auto=standalone()&&enabled()&&!changed&&Date.now()-started<25000
         &&read(sessionStorage,keyAttempt)!==published;
       if(auto)await apply();
       else if(read(sessionStorage,keyDismiss)!==published)createBanner().hidden=false;
     }else{
       pending=null;
       if(banner)banner.hidden=true;
       remove(sessionStorage,keyAttempt);
       message('✅ SB V2 al día · versión '+published.slice(0,7)+'.');
     }
   }catch(error){
     console.warn('No se pudo comprobar la versión publicada:',error);
     if(manual)message('No se pudo comprobar. Revisa tu conexión y vuelve a intentar.');
   }finally{checking=false;if(!applying)btn.disabled=false;}
 }
 btn.addEventListener('click',()=>{void check(true);});
 window.addEventListener('online',()=>{void check();});
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'&&Date.now()-last>120000)void check();
 });
 window.addEventListener('pageshow',event=>{
   if(event.persisted&&Date.now()-last>120000)void check();
 });
 setInterval(()=>{void check();},600000);
 if(document.readyState==='complete')void check();
 else window.addEventListener('load',()=>{void check();},{once:true});
})();
