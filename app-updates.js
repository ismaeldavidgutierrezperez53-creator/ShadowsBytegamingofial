/* SB V2: actualizaciones basadas en el despliegue REAL de GitHub Pages. */
(() => {
 'use strict';
 const btn=document.getElementById('sb-update-check');
 const output=document.getElementById('sb-updates-menu-status');
 if(!btn||!output||!/^https?:$/.test(location.protocol))return;
 const toggle=document.getElementById('sb-auto-update-on-open');
 const keyAuto='sb-auto-update-on-open', keyAttempt='sb-update-attempted';
 const keyDismiss='sb-update-dismissed';
 const keyHistory='sb-update-history-v1';
 const keySnooze='sb-update-snooze-v1';
 const snoozeMs=24*60*60*1000;
 const changelogList=document.getElementById('sb-updates-changes-list');
 const elInstalled=document.getElementById('sb-updates-installed');
 const elPublished=document.getElementById('sb-updates-published');
 const elLastCheck=document.getElementById('sb-updates-lastcheck');
 const historyList=document.getElementById('sb-updates-history-list');
 const shaOk=value=>/^[0-9a-f]{40}$/i.test(value||'');
 const stamped=document.querySelector('meta[name="sb-build"]')?.content;
 const legacy=(()=>{try{return localStorage.getItem('sb-v2-seen-github-version');}catch{return null;}})();
 const installed=shaOk(stamped)?stamped:(shaOk(legacy)?legacy:null);
 const currentUrl=new URL('./app-version.json',location.href);
 const started=Date.now();
 let last=0,checking=false,applying=false,changed=false,pending=null,banner=null,unsavedEdits=false;
 const read=(storage,key)=>{try{return storage.getItem(key);}catch{return null;}};
 const write=(storage,key,value)=>{try{storage.setItem(key,value);}catch{}};
 const remove=(storage,key)=>{try{storage.removeItem(key);}catch{}};
 const enabled=()=>read(localStorage,keyAuto)!=='off';
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const message=text=>{output.textContent=text;};
 const shortSha=value=>shaOk(value)?value.slice(0,7):'no identificada';
 const timeString=value=>new Date(value).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'});
 const snoozed=version=>{
   try{
     const data=JSON.parse(read(localStorage,keySnooze)||'null');
     return data?.version===version&&Number.isFinite(data.until)&&data.until>Date.now();
   }catch{return false;}
 };
 const stopSnooze=()=>remove(localStorage,keySnooze);
 const formatChanges=changes=>Array.isArray(changes)
   ? changes.filter(x=>typeof x==='string'&&x.trim().length).slice(0,5).map(x=>x.slice(0,180))
   : [];
 function fillChanges(list,changes){
   if(!list)return;
   list.replaceChildren();
   const descriptions=changes.length?changes:['No hay notas de cambios disponibles para esta versión.'];
   for(const item of descriptions){
     const li=document.createElement('li');
     li.textContent=item;
     list.append(li);
   }
 }
 function getHistory(){
   try{
     const records=JSON.parse(read(localStorage,keyHistory)||'[]');
     return Array.isArray(records)?records.filter(item=>shaOk(item?.version)&&Number.isFinite(item?.when)).slice(0,6):[];
   }catch{return [];}
 }
 function renderHistory(){
   if(!historyList)return;
   historyList.replaceChildren();
   const history=getHistory();
   if(!history.length){
     const item=document.createElement('li');
     item.textContent='Todavía no hay versiones registradas.';
     historyList.append(item);
   }else{
     for(const item of history){
       const node=document.createElement('li');
       node.textContent='Versión '+shortSha(item.version)+' · '+timeString(item.when);
       historyList.append(node);
     }
   }
 }
 if(elInstalled)elInstalled.textContent='Versión cargada: '+shortSha(installed);
 renderHistory();
 if(shaOk(stamped)){
   const history=getHistory();
   if(history[0]?.version!==stamped){
     write(localStorage,keyHistory,JSON.stringify([{version:stamped,when:Date.now()},...history.filter(item=>item.version!==stamped)].slice(0,6)));
     renderHistory();
   }
 }
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
 // Si hay texto o formularios modificados, pedir confirmación antes de
 // recargar para no perder borradores de publicaciones, chats o perfiles.
 document.addEventListener('input',event=>{
   const target=event.target;
   if(target?.closest?.('.sb-updates-menu-control'))return;
   if(target?.matches?.('textarea,input,[contenteditable="true"]') ||
      target?.closest?.('[contenteditable="true"]'))unsavedEdits=true;
 },{capture:true});
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
   const changeDetails=document.createElement('details');
   changeDetails.className='sb-update-notice__changes';
   const changeTitle=document.createElement('summary');
   changeTitle.textContent='✨ Qué cambia en esta versión';
   const changeItems=document.createElement('ul');
   changeItems.className='sb-update-notice__changes-list';
   changeDetails.append(changeTitle,changeItems);
   const actions=document.createElement('div');actions.className='sb-update-notice__actions';
   const accept=document.createElement('button');
   accept.type='button';accept.className='sb-update-now';accept.textContent='🔄 Actualizar ahora';
   const later=document.createElement('button');
   later.type='button';later.className='sb-update-later';later.textContent='Recordar en 24 h';
   accept.addEventListener('click',()=>{void apply();});
   later.addEventListener('click',()=>{
     if(pending){
       write(localStorage,keySnooze,JSON.stringify({version:pending,until:Date.now()+snoozeMs}));
       write(sessionStorage,keyDismiss,pending);
     }
     banner.hidden=true;
     message('Actualización pospuesta 24 horas. Puedes buscarla manualmente cuando quieras.');
   });
   actions.append(accept,later);banner.append(title,body,changeDetails,actions);document.body.append(banner);
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
     return {version:data.version,publishedAt:typeof data.published_at==='string'&&Number.isFinite(Date.parse(data.published_at))?data.published_at:null,
       changes:formatChanges(data.changes)};
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
   if(unsavedEdits&&!window.confirm('Has modificado contenido desde que abriste SB V2. Si hay mensajes o cambios sin guardar, podrían perderse. ¿Actualizar ahora?')){
     message('Actualización pospuesta para que puedas guardar tus cambios.');
     return;
   }
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
     const publishedInfo=await onlineVersion();
     const published=publishedInfo.version;
     if(elPublished)elPublished.textContent='Versión publicada: '+shortSha(published)+(publishedInfo.publishedAt?' · '+timeString(publishedInfo.publishedAt):'');
     if(elLastCheck)elLastCheck.textContent='Última comprobación: '+timeString(Date.now());
     fillChanges(changelogList,publishedInfo.changes);
     if(!installed){
       if(manual)message('✅ Comprobación realizada. La versión se identificará al volver a abrir SB V2.');
     }else if(installed!==published){
       pending=published;
       message('✨ Nueva versión publicada ('+published.slice(0,7)+').');
       // Al comprobar manualmente, el usuario puede anular un recordatorio anterior.
       if(manual){remove(sessionStorage,keyDismiss);stopSnooze();}
       const paused=snoozed(published);
       const auto=standalone()&&enabled()&&!changed&&!unsavedEdits&&!paused&&Date.now()-started<25000
         &&read(sessionStorage,keyAttempt)!==published;
       if(auto)await apply();
       else if(!paused&&read(sessionStorage,keyDismiss)!==published){
         const notice=createBanner();
         const detail=notice.querySelector('.sb-update-notice__text');
         if(detail)detail.textContent='Versión '+shortSha(published)+' publicada'+(publishedInfo.publishedAt?' el '+timeString(publishedInfo.publishedAt):'')+'. Puedes instalarla ahora; la sección abierta se conserva.';
         fillChanges(notice.querySelector('.sb-update-notice__changes-list'),publishedInfo.changes);
         notice.hidden=false;
       }else if(paused){
         message('⏰ Versión '+shortSha(published)+' disponible; aviso pospuesto durante 24 horas.');
       }
     }else{
       pending=null;
       if(banner)banner.hidden=true;
       remove(sessionStorage,keyAttempt);
       stopSnooze();
       message('✅ SB V2 al día · versión '+published.slice(0,7)+'.');
     }
   }catch(error){
     console.warn('No se pudo comprobar la versión publicada:',error);
     if(manual)message('No se pudo comprobar. Revisa tu conexión y vuelve a intentar.');
     if(elLastCheck)elLastCheck.textContent='Última comprobación: sin respuesta · '+timeString(Date.now());
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
