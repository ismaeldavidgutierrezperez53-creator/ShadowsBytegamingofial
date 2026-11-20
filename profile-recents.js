/* Shadows Byte Gaming Official V2 — accesos a apartados visitados recientemente. */
(()=>{
 'use strict';
 const sections=[
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
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const key=type=>'sb-profile-recent-sections-'+type+'-v1';
 const read=type=>{
  try{
   const x=JSON.parse(localStorage.getItem(key(type))||'[]');
   return Array.isArray(x)?[...new Set(x.filter(v=>typeof v==='string'&&sections.some(s=>s[1]===v&&s[2]===(type==='own'))))].slice(0,5):[];
  }catch(_){return []}
 };
 const write=(type,values)=>{try{localStorage.setItem(key(type),JSON.stringify(values))}catch(_){}};
 const typeOf=host=>host.id==='account-profile'?'own':'public';
 function render(host){
  const nav=host.querySelector('.sb-nav-panel');
  if(!nav)return;
  let panel=nav.querySelector('.sb-recent-panel');
  if(!panel){
   panel=node('section','sb-recent-panel');
   panel.setAttribute('aria-label','Apartados visitados recientemente');
   const title=node('h3','','🕒 Apartados recientes');
   const desc=node('p','sb-recent-description','Vuelve a los últimos apartados que abriste desde este organizador.');
   const items=node('div','sb-recent-items');
   const clear=node('button','sb-recent-clear','Borrar recientes');
   clear.type='button';
   clear.addEventListener('click',()=>{
    write(typeOf(host),[]);
    render(host);
   });
   panel.append(title,desc,items,clear);
   const settings=nav.querySelector('.sb-nav-visibility-settings');
   if(settings)settings.after(panel);else nav.append(panel);
  }
  const type=typeOf(host);
  const active=read(type).filter(selector=>host.querySelector(selector));
  const signature=active.join('|');
  if(panel.dataset.signature===signature)return;
  panel.dataset.signature=signature;
  const list=panel.querySelector('.sb-recent-items');
  list.replaceChildren();
  for(const selector of active){
   const entry=sections.find(x=>x[1]===selector&&x[2]===(type==='own'));
   if(!entry)continue;
   const button=node('button','sb-recent-go',entry[0]);
   button.type='button';
   button.addEventListener('click',()=>{
    const target=host.querySelector(selector);
    if(!target)return;
    track(host,selector);
    target.dispatchEvent(new Event('sb:profile-expand'));
    target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   });
   list.append(button);
  }
  const clear=panel.querySelector('.sb-recent-clear');
  clear.hidden=active.length===0;
  const description=panel.querySelector('.sb-recent-description');
  const message=active.length?'Últimos '+active.length+' apartados que consultaste.':'Todavía no has abierto ningún apartado desde los accesos rápidos.';
  if(description.textContent!==message)description.textContent=message;
 }
 function track(host,selector){
  const type=typeOf(host);
  write(type,[selector,...read(type).filter(x=>x!==selector)].slice(0,5));
  render(host);
 }
 function scan(){
  for(const id of ['account-profile','public-member-profile']){
   const host=document.getElementById(id);
   if(host?.querySelector('.sb-nav-panel'))render(host);
  }
 }
 let pending=false;
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;scan()})}
 function init(){
  const app=document.getElementById('app');
  if(!app)return;
  app.addEventListener('click',e=>{
   const button=e.target.closest?.('.sb-nav-favorite-item > .sb-nav-link');
   if(!button)return;
   const host=button.closest('#account-profile,#public-member-profile');
   if(!host)return;
   const label=button.closest('.sb-nav-favorite-item')?.dataset.searchLabel;
   const entry=sections.find(x=>x[0]===label&&x[2]===(typeOf(host)==='own'));
   if(entry&&host.querySelector(entry[1]))track(host,entry[1]);
  },true);
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
