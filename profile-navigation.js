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
  ['👁️ Visitas al perfil','.sb-profile-views',true],
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
   const onlyFavorites=node('button','sb-nav-only-favorites','☆ Solo favoritos');
   onlyFavorites.type='button';
   onlyFavorites.setAttribute('aria-pressed','false');
   onlyFavorites.addEventListener('click',()=>{
    const enabled=onlyFavorites.getAttribute('aria-pressed')!=='true';
    onlyFavorites.setAttribute('aria-pressed',String(enabled));
    onlyFavorites.textContent=enabled?'★ Solo favoritos':'☆ Solo favoritos';
    applyFilter();
   });
   const resultCount=node('p','sb-nav-search-count');
   resultCount.setAttribute('role','status');
   searchBox.append(search,clear,onlyFavorites);
   const controls=node('div','sb-nav-links');
   const applyFilter=()=>{
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
    const query=normalize(search.value);
    let visible=0;
    for(const item of controls.querySelectorAll('.sb-nav-favorite-item')){
     const matchesText=normalize(item.dataset.searchLabel).includes(query);
     const matchesFavorites=onlyFavorites.getAttribute('aria-pressed')!=='true'||item.dataset.favorite==='true';
     const matched=matchesText&&matchesFavorites;
     if(item.hidden!==!matched)item.hidden=!matched;
     if(matched)visible++;
    }
    const filtering=query||onlyFavorites.getAttribute('aria-pressed')==='true';
    const message=filtering?(visible?visible+' apartados encontrados':'No hay apartados que coincidan.'):'';
    if(resultCount.textContent!==message)resultCount.textContent=message;
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
  const hiddenKey='sb-profile-hidden-shortcuts-'+(isOwn?'own':'public')+'-v1';
  const readHidden=()=>{
   try{
    const saved=JSON.parse(localStorage.getItem(hiddenKey)||'[]');
    return Array.isArray(saved)?saved.filter(x=>typeof x==='string'&&modules.some(m=>m[1]===x)).slice(0,25):[];
   }catch(_){return []}
  };
  let showHidden=nav.dataset.showHidden==='yes';
  const settings=nav.querySelector('.sb-nav-visibility-settings')||node('div','sb-nav-visibility-settings');
  if(!settings.isConnected){
   const toggle=node('button','sb-nav-visibility-toggle');
   toggle.type='button';
   toggle.addEventListener('click',()=>{
    nav.dataset.showHidden=nav.dataset.showHidden==='yes'?'no':'yes';
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   settings.append(toggle);
   const details=nav.querySelector('.sb-nav-details');
   details.after(settings);
  }
  const hidden=readHidden();
  const visibilityToggle=settings.querySelector('.sb-nav-visibility-toggle');
  const visibilityLabel=showHidden?'Ocultar ajustes de accesos':'Gestionar accesos ocultos';
  if(visibilityToggle.textContent!==visibilityLabel)visibilityToggle.textContent=visibilityLabel;
  if(visibilityToggle.getAttribute('aria-expanded')!==String(showHidden))visibilityToggle.setAttribute('aria-expanded',String(showHidden));
  const readFavorites=()=>{
   try{
    const saved=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(saved)?saved.filter(x=>typeof x==='string').slice(0,25):[];
   }catch(_){return []}
  };
  const relevant=modules.filter(item=>item[2]===isOwn);
  const available=relevant.filter(([label,selector])=>host.querySelector(selector));
  const favorites=readFavorites();
  const signature=available.map(x=>x[1]).join('|')+'#'+favorites.join('|')+'#'+hidden.join('|')+'#'+showHidden;
  if(links.dataset.signature===signature)return;
  links.dataset.signature=signature;
  links.replaceChildren();
  summary.textContent='Ver accesos rápidos ('+(available.length-hidden.filter(x=>available.some(a=>a[1]===x)).length)+')';
  const ordered=[...available].sort((a,b)=>{
   const ia=favorites.indexOf(a[1]),ib=favorites.indexOf(b[1]);
   if(ia<0&&ib<0)return 0;
   if(ia<0)return 1;
   if(ib<0)return -1;
   return ia-ib;
  });
  for(const [label,selector] of ordered){
   const item=node('div','sb-nav-favorite-item');
   item.dataset.searchLabel=label;
   const isHidden=hidden.includes(selector);
   item.dataset.shortcutHidden=String(isHidden);
   item.classList.toggle('sb-nav-hidden-shortcut',isHidden);
   if(isHidden&&!showHidden)continue;
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
   item.dataset.favorite=String(selected);
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
   if(selected){
    const move=elDirection=>{
     const list=readFavorites();
     const i=list.indexOf(selector);
     const nextIndex=i+elDirection;
     if(i<0||nextIndex<0||nextIndex>=list.length)return;
     [list[i],list[nextIndex]]=[list[nextIndex],list[i]];
     try{localStorage.setItem(key,JSON.stringify(list))}catch(_){}
     links.dataset.signature='';
     enhance(host,isOwn);
     nav.querySelector('.sb-nav-details').open=true;
    };
    const i=favorites.indexOf(selector);
    const arrows=node('span','sb-nav-move');
    const up=node('button','sb-nav-move-btn','↑');
    up.type='button';up.disabled=i===0;
    up.setAttribute('aria-label','Subir '+label);
    up.title='Subir favorito';
    up.onclick=()=>move(-1);
    const down=node('button','sb-nav-move-btn','↓');
    down.type='button';down.disabled=i===favorites.length-1;
    down.setAttribute('aria-label','Bajar '+label);
    down.title='Bajar favorito';
    down.onclick=()=>move(1);
    arrows.append(up,down);item.append(arrows);
   }
   if(showHidden){
    const toggle=node('button','sb-nav-hide-btn',isHidden?'Mostrar':'Ocultar');
    toggle.type='button';
    toggle.title=isHidden?'Restaurar acceso rápido':'Ocultar solo este acceso rápido';
    toggle.setAttribute('aria-label',(isHidden?'Restaurar ':'Ocultar ')+label+' en accesos rápidos');
    toggle.onclick=()=>{
     const current=readHidden();
     const next=isHidden?current.filter(x=>x!==selector):[...current,selector];
     try{localStorage.setItem(hiddenKey,JSON.stringify(next))}catch(_){}
     links.dataset.signature='';
     enhance(host,isOwn);
    };
    item.append(toggle);
   }
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
