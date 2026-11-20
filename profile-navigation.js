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
   const stats=node('div','sb-nav-stats');
   stats.setAttribute('aria-label','Resumen de accesos del perfil');
   const statFields={};
   for(const [key,label] of [['total','📂 Disponibles'],['favorites','⭐ Favoritos'],['hidden','🙈 Ocultos'],['results','🔎 Resultados']]){
    const badge=node('span','sb-nav-stat');
    badge.append(node('span','sb-nav-stat-label',label));
    const number=node('strong','sb-nav-stat-number','0');
    badge.append(number);
    badge.classList.add('sb-nav-stat-'+key);
    statFields[key]=number;
    stats.append(badge);
   }
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
    const enabled=nav.dataset.onlyFavorites!=='true';
    nav.dataset.onlyFavorites=String(enabled);
    applyFilter();
   });
   const onlyHidden=node('button','sb-nav-only-hidden','🙈 Solo ocultos');
   onlyHidden.type='button';
   onlyHidden.setAttribute('aria-pressed','false');
   onlyHidden.addEventListener('click',()=>{
    const next=nav.dataset.onlyHidden!=='true';
    if(next){
     nav.dataset.hiddenFilterPriorVisibility=nav.dataset.showHidden==='yes'?'yes':'no';
     nav.dataset.showHidden='yes';
    }else{
     nav.dataset.showHidden=nav.dataset.hiddenFilterPriorVisibility==='yes'?'yes':'no';
     delete nav.dataset.hiddenFilterPriorVisibility;
    }
    nav.dataset.onlyHidden=String(next);
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   const resultCount=node('p','sb-nav-search-count');
   resultCount.setAttribute('role','status');
   searchBox.append(search,clear,onlyFavorites,onlyHidden);
   const layoutKey='sb-profile-nav-layout-'+(isOwn?'own':'public')+'-v1';
   let chosenLayout='grid';
   try{chosenLayout=localStorage.getItem(layoutKey)==='list'?'list':'grid'}catch(_){}
   nav.dataset.layout=chosenLayout;
   const layoutBar=node('div','sb-nav-layout-bar');
   layoutBar.setAttribute('role','group');
   layoutBar.setAttribute('aria-label','Presentación de los accesos del perfil');
   layoutBar.append(node('span','sb-nav-layout-label','Vista de accesos:'));
   const layoutButtons=[];
   for(const [mode,label] of [['grid','▦ Cuadrícula'],['list','☰ Lista']]){
    const button=node('button','sb-nav-layout-btn',label);
    button.type='button';
    button.dataset.mode=mode;
    button.setAttribute('aria-pressed',String(chosenLayout===mode));
    button.onclick=()=>{
     if(nav.dataset.layout===mode)return;
     nav.dataset.layout=mode;
     try{localStorage.setItem(layoutKey,mode)}catch(_){}
     for(const b of layoutButtons)b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
    };
    layoutButtons.push(button);
    layoutBar.append(button);
   }
   const sortKey='sb-profile-nav-sort-'+(isOwn?'own':'public')+'-v1';
   let sortMode='favorites';
   try{
    const saved=localStorage.getItem(sortKey);
    if(['favorites','az','za'].includes(saved))sortMode=saved;
   }catch(_){}
   nav.dataset.sortMode=sortMode;
   const sortBox=node('div','sb-nav-sortbox');
   const sortLabel=node('label','sb-nav-sort-label','Ordenar accesos:');
   const sortSelect=node('select','sb-nav-sort-select');
   sortSelect.id='sb-nav-sort-'+(isOwn?'own':'public');
   sortLabel.htmlFor=sortSelect.id;
   for(const [value,label] of [['favorites','⭐ Favoritos primero'],['az','A → Z'],['za','Z → A']]){
    const option=node('option','',label);
    option.value=value;
    sortSelect.append(option);
   }
   sortSelect.value=sortMode;
   sortSelect.addEventListener('change',()=>{
    if(!['favorites','az','za'].includes(sortSelect.value))return;
    try{localStorage.setItem(sortKey,sortSelect.value)}catch(_){}
    nav.dataset.sortMode=sortSelect.value;
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   const resetFilters=node('button','sb-nav-reset-filters','↺ Limpiar filtros');
   resetFilters.type='button';
   resetFilters.title='Quitar búsqueda y filtro Solo favoritos, y volver a Favoritos primero';
   resetFilters.onclick=()=>{
    const hadSearch=Boolean(search.value);
    const hadFavorites=nav.dataset.onlyFavorites==='true';
    const hadHidden=nav.dataset.onlyHidden==='true';
    const hadSort=nav.dataset.sortMode!=='favorites';
    if(!hadSearch&&!hadFavorites&&!hadHidden&&!hadSort)return;
    search.value='';
    nav.dataset.onlyFavorites='false';
    if(hadHidden){
     nav.dataset.onlyHidden='false';
     nav.dataset.showHidden=nav.dataset.hiddenFilterPriorVisibility==='yes'?'yes':'no';
     delete nav.dataset.hiddenFilterPriorVisibility;
     links.dataset.signature='';
    }
    if(hadSort){
     nav.dataset.sortMode='favorites';
     sortSelect.value='favorites';
     try{localStorage.setItem(sortKey,'favorites')}catch(_){}
     links.dataset.signature='';
    }
    if(hadSort||hadHidden)enhance(host,isOwn);
    else applyFilter();
   };
   sortBox.append(sortLabel,sortSelect,resetFilters);
   const controls=node('div','sb-nav-links');
   const applyFilter=()=>{
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es').trim();
    const query=normalize(search.value);
    const enabled=nav.dataset.onlyFavorites==='true';
    const hiddenOnly=nav.dataset.onlyHidden==='true';
    const label=enabled?'★ Solo favoritos':'☆ Solo favoritos';
    if(onlyFavorites.textContent!==label)onlyFavorites.textContent=label;
    if(onlyFavorites.getAttribute('aria-pressed')!==String(enabled))onlyFavorites.setAttribute('aria-pressed',String(enabled));
    const hiddenLabel=hiddenOnly?'🙈 Mostrando ocultos':'🙈 Solo ocultos';
    if(onlyHidden.textContent!==hiddenLabel)onlyHidden.textContent=hiddenLabel;
    if(onlyHidden.getAttribute('aria-pressed')!==String(hiddenOnly))onlyHidden.setAttribute('aria-pressed',String(hiddenOnly));
    let visible=0;
    for(const item of controls.querySelectorAll('.sb-nav-favorite-item')){
     const matchesText=normalize(item.dataset.searchLabel).includes(query);
     // Leer el estado actual de la estrella, incluso después de reordenar favoritos.
     const star=item.querySelector('.sb-nav-star');
     const isFavorite=star?.getAttribute('aria-pressed')==='true';
     const isHidden=item.dataset.shortcutHidden==='true';
     const matched=matchesText&&(!enabled||isFavorite)&&(!hiddenOnly||isHidden);
     if(item.hidden!==!matched)item.hidden=!matched;
     if(matched)visible++;
    }
    const message=query||enabled||hiddenOnly?(visible?visible+' apartados encontrados':'No hay apartados que coincidan.'):''; 
    if(resultCount.textContent!==message)resultCount.textContent=message;
    const visibleResult=String(visible);
    if(statFields.results.textContent!==visibleResult)statFields.results.textContent=visibleResult;
    const hasActiveFilters=Boolean(query)||enabled||hiddenOnly||nav.dataset.sortMode!=='favorites';
    if(resetFilters.disabled===hasActiveFilters)resetFilters.disabled=!hasActiveFilters;
   };
   search.addEventListener('input',applyFilter);
   clear.addEventListener('click',()=>{search.value='';applyFilter();search.focus()});
   details.append(summary,searchBox,layoutBar,sortBox,resultCount,controls);
   const top=node('button','sb-nav-top','↑ Volver al inicio del perfil');
   top.type='button';
   top.onclick=()=>host.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   nav.append(title,desc,stats,details,top);
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
  const stats=nav.querySelector('.sb-nav-stats');
  if(stats){
   const counts={
    total:available.length,
    favorites:available.filter(([_,selector])=>favorites.includes(selector)).length,
    hidden:available.filter(([_,selector])=>hidden.includes(selector)).length
   };
   for(const [name,value] of Object.entries(counts)){
    const field=stats.querySelector('.sb-nav-stat-'+name+' .sb-nav-stat-number');
    if(field&&field.textContent!==String(value))field.textContent=String(value);
   }
  }
  const sortMode=['favorites','az','za'].includes(nav.dataset.sortMode)?nav.dataset.sortMode:'favorites';
  const sortSelect=nav.querySelector('.sb-nav-sort-select');
  if(sortSelect&&sortSelect.value!==sortMode)sortSelect.value=sortMode;
  const featuredVisibilityKey='sb-profile-featured-visible-'+(isOwn?'own':'public')+'-v1';
  let featuredVisible=true;
  try{featuredVisible=localStorage.getItem(featuredVisibilityKey)!=='no'}catch(_){}
  let featuredToggle=nav.querySelector('.sb-nav-featured-toggle');
  if(!featuredToggle){
   featuredToggle=node('button','sb-nav-featured-toggle');
   featuredToggle.type='button';
   featuredToggle.addEventListener('click',()=>{
    const next=featuredToggle.getAttribute('aria-pressed')!=='true';
    try{localStorage.setItem(featuredVisibilityKey,next?'yes':'no')}catch(_){}
    enhance(host,isOwn);
   });
   nav.querySelector('.sb-nav-details').after(featuredToggle);
  }
  const toggleLabel=featuredVisible?'👁 Ocultar accesos destacados':'👁 Mostrar accesos destacados';
  if(featuredToggle.textContent!==toggleLabel)featuredToggle.textContent=toggleLabel;
  if(featuredToggle.getAttribute('aria-pressed')!==String(featuredVisible))featuredToggle.setAttribute('aria-pressed',String(featuredVisible));
  const featured=nav.querySelector('.sb-nav-featured')||node('section','sb-nav-featured');
  if(!featured.isConnected){
   featured.setAttribute('aria-label','Mis accesos destacados');
   nav.querySelector('.sb-nav-details').after(featured);
  }
  const featuredLimitKey='sb-profile-featured-limit-'+(isOwn?'own':'public')+'-v1';
  let featuredLimit=3;
  try{
   const stored=Number(localStorage.getItem(featuredLimitKey));
   if([1,3,5].includes(stored))featuredLimit=stored;
  }catch(_){}
  let featuredControls=featured.querySelector('.sb-nav-featured-controls');
  if(!featuredControls){
   featuredControls=node('div','sb-nav-featured-controls');
   featuredControls.append(node('span','sb-nav-featured-label','Mostrar destacados:'));
   for(const limit of [1,3,5]){
    const btn=node('button','sb-nav-featured-count',String(limit));
    btn.type='button';
    btn.dataset.count=String(limit);
    btn.setAttribute('aria-label','Mostrar '+limit+' accesos destacados');
    btn.onclick=()=>{
     if(featured.dataset.limit===String(limit))return;
     try{localStorage.setItem(featuredLimitKey,String(limit))}catch(_){}
     featured.dataset.limit=String(limit);
     enhance(host,isOwn);
    };
    featuredControls.append(btn);
   }
  }
  const featuredCandidates=favorites.filter(selector=>!hidden.includes(selector)&&available.some(item=>item[1]===selector));
  const topThree=featuredCandidates.slice(0,featuredLimit);
  const featuredSignature=topThree.join('|')+'#'+featuredLimit;
  if(featured.dataset.limit!==String(featuredLimit))featured.dataset.limit=String(featuredLimit);
  for(const btn of featuredControls.querySelectorAll('.sb-nav-featured-count')){
   const selected=Number(btn.dataset.count)===featuredLimit;
   if(btn.getAttribute('aria-pressed')!==String(selected))btn.setAttribute('aria-pressed',String(selected));
  }
  if(featured.dataset.signature!==featuredSignature){
   featured.dataset.signature=featuredSignature;
   featured.replaceChildren();
   if(topThree.length){
    featured.append(node('h3','','⭐ Mis accesos destacados'));
    const shortcuts=node('div','sb-nav-featured-links');
    for(const selector of topThree){
     const entry=available.find(item=>item[1]===selector);
     if(!entry)continue;
     const item=node('div','sb-nav-favorite-item sb-nav-featured-item');
     item.dataset.searchLabel=entry[0];
     const button=node('button','sb-nav-link',entry[0]);
     button.type='button';
     button.onclick=()=>{
      const target=host.querySelector(selector);
      if(!target)return;
      target.dispatchEvent(new Event('sb:profile-expand'));
      target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
     };
     item.append(button);
     shortcuts.append(item);
    }
    featured.append(shortcuts,featuredControls);
   }
  }
  const shouldHideFeatured=!featuredVisible||featuredCandidates.length===0;
  if(featured.hidden!==shouldHideFeatured)featured.hidden=shouldHideFeatured;
  const signature=available.map(x=>x[1]).join('|')+'#'+favorites.join('|')+'#'+hidden.join('|')+'#'+showHidden+'#'+sortMode+'#'+(nav.dataset.onlyHidden==='true');
  if(links.dataset.signature===signature)return;
  links.dataset.signature=signature;
  links.replaceChildren();
  summary.textContent='Ver accesos rápidos ('+(available.length-hidden.filter(x=>available.some(a=>a[1]===x)).length)+')';
  const cleanName=entry=>entry[0].replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/,'').trim();
  const compareNames=(a,b)=>cleanName(a).localeCompare(cleanName(b),'es',{sensitivity:'base'});
  const ordered=[...available].sort((a,b)=>{
   if(sortMode==='az')return compareNames(a,b);
   if(sortMode==='za')return compareNames(b,a);
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
   if(selected&&sortMode==='favorites'){
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
