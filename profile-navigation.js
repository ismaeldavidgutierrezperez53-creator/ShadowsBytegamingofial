/* Shadows Byte V2 — Navegador compacto de secciones del perfil. */
(() => {
 'use strict';
 const node=(tag, cls, content)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(content!==undefined)item.textContent=content;
  return item;
 };
 const modules=[
  ['✨ Mi centro de perfil','.sbp-dashboard',true],
  ['🎴 Identidad gamer','.sbp-identity-card',true],
  ['🧭 Miembros afines','.sbd-discovery',true],
  ['🎖️ Escaparate gamer','.sb-showcase',true],
  ['📊 Estadísticas gamer','.sbg-stats',true],
  ['🕒 Actividad reciente','.sba-timeline',true],
  ['👥 Conexiones gamer','.sbc-connections',true],
  ['🏅 Retos de colección','.sbr-goals',true],
  ['🌟 Retos sociales','.sbs-challenges',true],
  ['🎨 Editar perfil','#profile-form',true],
  ['🎮 Biblioteca','#game-library',true],
  ['🌸 Afinidad gamer','.sbaf-panel',false],
  ['🎮 Biblioteca compartida','.public-game-library',false],
  ['🏆 Logros','.member-achievements',false],
  ['📊 Estadísticas sociales','.member-profile-stats',false],
  ['💬 Comunidad','.member-social',false],
  ['📷 Galería','.member-gallery-panel',false]
 ];
 function enhance(host,isOwn){
  const anchor=isOwn?host.querySelector('.profile-identity'):host.querySelector('.public-member-body > h1');
  if(!anchor)return;
  let nav=host.querySelector('.sb-nav-panel');
  if(!nav){
   nav=node('section','profile-panel sb-nav-panel');
   nav.setAttribute('aria-label','Navegar por las secciones del perfil');
   const title=node('h2','','🗺️ Explorar secciones del perfil');
   const desc=node('p','sb-nav-caption','Encuentra rápidamente cada apartado sin perder tu posición.');
   const details=node('details','sb-nav-details');
   const summary=node('summary','sb-nav-summary','Ver accesos rápidos');
   const controls=node('div','sb-nav-links');
   details.append(summary,controls);
   const top=node('button','sb-nav-top','↑ Volver al inicio del perfil');
   top.type='button';
   top.onclick=()=>host.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   nav.append(title,desc,details,top);
   anchor.after(nav);
  }
  const links=nav.querySelector('.sb-nav-links');
  const summary=nav.querySelector('.sb-nav-summary');
  const relevant=modules.filter(item=>item[2]===isOwn);
  const available=relevant.filter(([label,selector])=>host.querySelector(selector));
  const signature=available.map(x=>x[1]).join('|');
  if(links.dataset.signature===signature)return;
  links.dataset.signature=signature;
  links.replaceChildren();
  summary.textContent='Ver accesos rápidos ('+available.length+')';
  for(const [label,selector] of available){
   const button=node('button','sb-nav-link',label);
   button.type='button';
   button.onclick=()=>{
    const target=host.querySelector(selector);
    if(!target)return;
    target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    target.classList.add('sb-nav-target');
    // Solo una indicación visual, sin cambios de información.
    target.addEventListener('animationend',()=>target.classList.remove('sb-nav-target'),{once:true});
   };
   links.append(button);
  }
 }
 let scheduled=false;
 function refresh(){
  scheduled=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.profile-identity'))enhance(account,true);
  const publicProfile=document.getElementById('public-member-profile');
  if(publicProfile?.querySelector('.public-member-body > h1'))enhance(publicProfile,false);
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(refresh)}
 const init=()=>{
  const app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);
  schedule();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
