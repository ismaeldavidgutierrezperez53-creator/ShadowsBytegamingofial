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
   const searchBox=node('div','sb-nav-searchbox');
   const search=node('input','sb-nav-search');
   search.type='search';
   search.placeholder='Buscar biblioteca, retos, estadísticas…';
   search.setAttribute('aria-label','Buscar secciones del perfil');
   search.autocomplete='off';
   const clear=node('button','sb-nav-search-clear','Limpiar');
   clear.type='button';
   const resultCount=node('p','sb-nav-search-count');
   resultCount.setAttribute('role','status');
   searchBox.append(search,clear);
   const controls=node('div','sb-nav-links');
   const applyFilter=()=>{
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
    const query=normalize(search.value);
    let visible=0;
    for(const item of controls.querySelectorAll('.sb-nav-favorite-item')){
     const matched=normalize(item.dataset.searchLabel).includes(query);
     item.hidden=!matched;
     if(matched)visible++;
    }
    resultCount.textContent=query?(visible?visible+' apartados encontrados':'No hay apartados que coincidan.'):'';
   };
   search.addEventListener('input',applyFilter);
   clear.addEventListener('click',()=>{search.value='';applyFilter();search.focus()});
   details.append(summary,searchBox,resultCount,controls);
   const top=node('button','sb-nav-top','↑ Volver al inicio del perfil');
   top.type='button';
   top.onclick=()=>host.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   nav.append(title,desc,details,top);
   anchor.after(nav);
  }
  const links=nav.querySelector('.sb-nav-links');
  const summary=nav.querySelector('.sb-nav-summary');
  const key='sb-profile-favorite-sections-'+(isOwn?'own':'public')+'-v1';
  const readFavorites=()=>{
   try{
    const saved=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(saved)?saved.filter(x=>typeof x==='string').slice(0,25):[];
   }catch(_){return []}
  };
  const relevant=modules.filter(item=>item[2]===isOwn);
  const available=relevant.filter(([label,selector])=>host.querySelector(selector));
  const favorites=readFavorites();
  const signature=available.map(x=>x[1]).join('|')+'#'+favorites.join('|');
  if(links.dataset.signature===signature)return;
  links.dataset.signature=signature;
  links.replaceChildren();
  summary.textContent='Ver accesos rápidos ('+available.length+')';
  const ordered=[...available].sort((a,b)=>Number(favorites.includes(b[1]))-Number(favorites.includes(a[1])));
  for(const [label,selector] of ordered){
   const item=node('div','sb-nav-favorite-item');
   item.dataset.searchLabel=label;
   const button=node('button','sb-nav-link',label);
   button.type='button';
   button.onclick=()=>{
    const target=host.querySelector(selector);
    if(!target)return;
    target.dispatchEvent(new Event('sb:profile-expand'));
    target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    target.classList.add('sb-nav-target');
    target.addEventListener('animationend',()=>target.classList.remove('sb-nav-target'),{once:true});
   };
   const selected=favorites.includes(selector);
   const star=node('button','sb-nav-star'+(selected?' is-favorite':''),selected?'★':'☆');
   star.type='button';
   star.setAttribute('aria-label',(selected?'Quitar de favoritos: ':'Añadir a favoritos: ')+label);
   star.setAttribute('aria-pressed',String(selected));
   star.title=selected?'Quitar de favoritos':'Marcar como favorito';
   star.onclick=()=>{
    const current=readFavorites();
    const nextList=current.includes(selector)?current.filter(x=>x!==selector):[...current,selector];
    try{localStorage.setItem(key,JSON.stringify(nextList))}catch(_){}
    links.dataset.signature='';
    enhance(host,isOwn);
   };
   item.append(button,star);
   links.append(item);
  }
  const filterInput=nav.querySelector('.sb-nav-search');
  if(filterInput)filterInput.dispatchEvent(new Event('input'));
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
