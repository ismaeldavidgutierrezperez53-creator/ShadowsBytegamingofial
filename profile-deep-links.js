/* Shadows Byte V2: enlaces directos a secciones de perfiles públicos. */
(()=>{
 'use strict';
 const sections=[
  ['identidad','.sbp-identity-card','Identidad gamer'],
  ['escaparate','.sb-showcase','Escaparate gamer'],
  ['estadisticas','.sbg-stats','Estadísticas gamer'],
  ['actividad','.sba-timeline','Actividad reciente'],
  ['conexiones','.sbc-connections','Conexiones gamer'],
  ['coleccion','.sbr-goals','Retos de colección'],
  ['sociales','.sbs-challenges','Retos sociales'],
  ['biblioteca','.public-game-library','Biblioteca compartida'],
  ['logros','.member-achievements','Logros']
 ];
 const sectionByKey=new Map(sections.map(([key,selector])=>[key,selector]));
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 let doneLocation='';
 const params=()=>new URLSearchParams(location.hash.split('?')[1]||'');
 const profileId=()=>params().get('id');
 const linkTo=(id,key)=>location.origin+location.pathname+location.search+'#/perfil?id='+encodeURIComponent(id)+'&seccion='+encodeURIComponent(key);
 const scrollTo=target=>{
  target.dispatchEvent(new Event('sb:profile-expand'));
  target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 };
 async function copyLink(button,status,url){
  try{
   await navigator.clipboard.writeText(url);
   status.textContent='✓ Enlace copiado.';
  }catch(_){
   status.textContent='Copia este enlace: '+url;
  }
 }
 function scan(){
  const root=document.getElementById('public-member-profile');
  if(!root?.querySelector('.public-member-body'))return;
  const id=profileId();
  if(!id||!uuid.test(id))return;
  // Solo crear accesos para las secciones que se hayan mostrado en un perfil público.
  for(const [key,selector,label] of sections){
   const target=root.querySelector(selector);
   if(!target||target.querySelector(':scope > .sb-share-section'))continue;
   const heading=target.querySelector('h2');
   if(!heading)continue;
   const group=el('div','sb-share-section');
   const button=el('button','sb-share-section-button','🔗 Compartir '+label);
   button.type='button';
   button.setAttribute('aria-label','Copiar enlace directo a '+label);
   const feedback=el('span','sb-share-feedback');
   feedback.setAttribute('role','status');
   button.addEventListener('click',()=>copyLink(button,feedback,linkTo(id,key)));
   group.append(button,feedback);
   heading.after(group);
  }
  const key=params().get('seccion');
  const locationKey=location.hash;
  if(!sectionByKey.has(key)||doneLocation===locationKey)return;
  const target=root.querySelector(sectionByKey.get(key));
  if(!target||!target.querySelector('h2'))return;
  doneLocation=locationKey;
  requestAnimationFrame(()=>{if(target.isConnected)scrollTo(target)});
 }
 let scheduled=false;
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})}
 function init(){
  const app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  addEventListener('hashchange',()=>{doneLocation='';schedule()});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
