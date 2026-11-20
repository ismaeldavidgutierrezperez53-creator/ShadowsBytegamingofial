/* Shadows Byte V2 — Navegador compacto de secciones del perfil. */
(() => {
 'use strict';
 const node=(tag, cls, content)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(content!==undefined)item.textContent=content;
  return item;
 };
 const visibilityUndo=new Map();
 const favoriteUndo=new Map();
 const visibilityRedo=new Map();
 const favoriteRedo=new Map();
 const modules=[
  ['✨ Mi centro de perfil','.sbp-dashboard',true],
  ['🎴 Identidad gamer','.sbp-identity-card',true],
  ['👁️ Visitas al perfil','.sb-profile-views',true],
  ['🧭 Miembros afines','.sbd-discovery',true],
  ['🎖️ Escaparate gamer','.sb-showcase',true],
  ['📊 Estadísticas gamer','.sbg-stats',true],
  ['🕒 Actividad reciente','.sba-timeline',true],
  ['👥 Conexiones gamer','.sbc-connections',true],
  ['🔗 Mis enlaces gamer','.sbgl-links',true],
  ['📊 Clics en mis enlaces','.sbgl-link-analytics',true],
  ['🏆 Logros de enlaces gamer','.sbgl-badges',true],
  ['🎖️ Mi vitrina de insignias','.sbv-editor',true],
  ['💰 Historial de recompensas','.sb-reward-history',true],
  ['📊 Estadísticas de puntos','.sbrs-panel',true],
  ['🏅 Retos de colección','.sbr-goals',true],
  ['🌟 Retos sociales','.sbs-challenges',true],
  ['🎨 Editar perfil','#profile-form',true],
  ['🎮 Biblioteca','#game-library',true],
  ['🌸 Afinidad gamer','.sbaf-panel',false],
  ['🎮 Biblioteca compartida','.public-game-library',false],
  ['🏆 Logros','.member-achievements',false],
  ['📊 Estadísticas sociales','.member-profile-stats',false],
  ['💬 Comunidad','.member-social',false],
  ['📷 Galería','.member-gallery-panel',false],
  ['🏆 Insignias de enlaces','.sbgl-badges',false]
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
   const detailsOpenKey='sb-profile-shortcuts-menu-open-'+(isOwn?'own':'public')+'-v1';
   try{details.open=localStorage.getItem(detailsOpenKey)==='true'}catch(_){}
   details.addEventListener('toggle',()=>{
    try{localStorage.setItem(detailsOpenKey,String(details.open))}catch(_){}
   });
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
    if(enabled)nav.dataset.onlyUnstarred='false';
    applyFilter();
   });
   const onlyUnstarred=node('button','sb-nav-only-unstarred','☆ Sin favoritos');
   onlyUnstarred.type='button';
   onlyUnstarred.setAttribute('aria-pressed','false');
   onlyUnstarred.addEventListener('click',()=>{
    const active=nav.dataset.onlyUnstarred!=='true';
    nav.dataset.onlyUnstarred=String(active);
    if(active)nav.dataset.onlyFavorites='false';
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
   const addVisibleFavorites=node('button','sb-nav-add-visible-favorites','⭐ Añadir resultados a favoritos');
   addVisibleFavorites.type='button';
   addVisibleFavorites.addEventListener('click',()=>{
    const items=[...controls.querySelectorAll('.sb-nav-favorite-item')].filter(item=>!item.hidden&&item.dataset.shortcutSelector);
    const current=readFavorites();
    const toAdd=[...new Set(items.map(item=>item.dataset.shortcutSelector))].filter(selector=>!current.includes(selector));
    if(!toAdd.length)return;
    if(!window.confirm('¿Añadir '+toAdd.length+' accesos de los resultados a tus favoritos? Podrás deshacer este cambio.'))return;
    if(!writeFavorites([...current,...toAdd]))return;
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   const removeVisibleFavorites=node('button','sb-nav-remove-visible-favorites','☆ Quitar resultados de favoritos');
   removeVisibleFavorites.type='button';
   removeVisibleFavorites.addEventListener('click',()=>{
    const items=[...controls.querySelectorAll('.sb-nav-favorite-item')].filter(item=>!item.hidden&&item.dataset.shortcutSelector);
    const selected=new Set(items.map(item=>item.dataset.shortcutSelector));
    const current=readFavorites();
    const toRemove=current.filter(selector=>selected.has(selector));
    if(!toRemove.length)return;
    if(!window.confirm('¿Quitar de favoritos los '+toRemove.length+' accesos mostrados? Podrás deshacer este cambio.'))return;
    if(!writeFavorites(current.filter(selector=>!selected.has(selector))))return;
    // Al retirar estrellas, salir de Solo favoritos para que los apartados sigan visibles.
    // También quitar Sin favoritos si estaba activo, evitando una vista engañosa.
    nav.dataset.onlyFavorites='false';
    nav.dataset.onlyUnstarred='false';
    links.dataset.signature='';
    enhance(host,isOwn);
    const feedback=nav.querySelector('.sb-nav-bulk-feedback');
    if(feedback)feedback.textContent='✓ Se han quitado '+toRemove.length+' favoritos. Puedes usar ↶ Deshacer cambio de favoritos.';
   });
   const hideVisibleResults=node('button','sb-nav-hide-visible-results','🙈 Ocultar resultados');
   hideVisibleResults.type='button';
   hideVisibleResults.addEventListener('click',()=>{
    const items=[...controls.querySelectorAll('.sb-nav-favorite-item')].filter(item=>!item.hidden&&item.dataset.shortcutSelector&&item.dataset.shortcutHidden!=='true');
    const current=readHidden();
    const toHide=[...new Set(items.map(item=>item.dataset.shortcutSelector))].filter(selector=>!current.includes(selector));
    if(!toHide.length)return;
    if(!window.confirm('¿Ocultar los '+toHide.length+' accesos visibles de los resultados? Tus favoritos y su orden se conservarán.'))return;
    if(!writeHidden([...current,...toHide]))return;
    links.dataset.signature='';
    enhance(host,isOwn);
    const feedback=nav.querySelector('.sb-nav-bulk-feedback');
    if(feedback)feedback.textContent='✓ Se han ocultado '+toHide.length+' accesos. Puedes usar ↶ Deshacer último cambio en Gestionar accesos ocultos.';
   });
   const restoreVisibleResults=node('button','sb-nav-restore-visible-results','↺ Restaurar resultados ocultos');
   restoreVisibleResults.type='button';
   restoreVisibleResults.addEventListener('click',()=>{
    const matching=[...controls.querySelectorAll('.sb-nav-favorite-item')].filter(item=>!item.hidden&&item.dataset.shortcutSelector&&item.dataset.shortcutHidden==='true');
    const current=readHidden();
    const selected=new Set(matching.map(item=>item.dataset.shortcutSelector));
    const toRestore=current.filter(selector=>selected.has(selector));
    if(!toRestore.length)return;
    if(!window.confirm('¿Restaurar los '+toRestore.length+' accesos ocultos de los resultados? Los demás accesos ocultos permanecerán igual.'))return;
    if(!writeHidden(current.filter(selector=>!selected.has(selector))))return;
    links.dataset.signature='';
    enhance(host,isOwn);
    const feedback=nav.querySelector('.sb-nav-bulk-feedback');
    if(feedback)feedback.textContent='✓ Se han restaurado '+toRestore.length+' accesos. Puedes usar ↶ Deshacer último cambio en Gestionar accesos ocultos.';
   });
   const resultCount=node('p','sb-nav-search-count');
   resultCount.setAttribute('role','status');
   const bulkFeedback=node('p','sb-nav-bulk-feedback');
   bulkFeedback.setAttribute('role','status');
   bulkFeedback.setAttribute('aria-live','polite');
   searchBox.append(search,clear,onlyFavorites,onlyUnstarred,onlyHidden);
   const bulkDetails=node('details','sb-nav-bulk-details');
   const bulkSummary=node('summary','sb-nav-bulk-summary','⚙️ Gestionar resultados (4 acciones)');
   const bulkTools=node('div','sb-nav-bulk-tools');
   bulkTools.append(addVisibleFavorites,removeVisibleFavorites,hideVisibleResults,restoreVisibleResults);
   bulkDetails.append(bulkSummary,bulkTools,bulkFeedback);
   const bulkOpenKey='sb-profile-bulk-menu-open-'+(isOwn?'own':'public')+'-v1';
   try{bulkDetails.open=localStorage.getItem(bulkOpenKey)==='true'}catch(_){}
   bulkDetails.addEventListener('toggle',()=>{
    try{localStorage.setItem(bulkOpenKey,String(bulkDetails.open))}catch(_){}
   });
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
   resetFilters.title='Borrar la búsqueda, quitar los filtros y volver a Favoritos primero';
   resetFilters.onclick=()=>{
    const hadSearch=Boolean(search.value);
    const hadFavorites=nav.dataset.onlyFavorites==='true';
    const hadUnstarred=nav.dataset.onlyUnstarred==='true';
    const hadHidden=nav.dataset.onlyHidden==='true';
    const hadSort=nav.dataset.sortMode!=='favorites';
    if(!hadSearch&&!hadFavorites&&!hadUnstarred&&!hadHidden&&!hadSort)return;
    search.value='';
    nav.dataset.onlyFavorites='false';
    nav.dataset.onlyUnstarred='false';
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
   const undoFavorite=node('button','sb-nav-undo-favorite','↶ Deshacer cambio de favoritos');
   undoFavorite.type='button';
   undoFavorite.addEventListener('click',()=>{
    const previous=favoriteUndo.get(key);
    if(!previous)return;
    if(readFavorites().join('|')!==previous.after.join('|')){
     favoriteUndo.delete(key);
     enhance(host,isOwn);
     return;
    }
    try{localStorage.setItem(key,JSON.stringify(previous.before))}catch(_){return}
    favoriteUndo.delete(key);
    favoriteRedo.set(key,previous);
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   sortBox.append(undoFavorite);
   const redoFavorite=node('button','sb-nav-redo-favorite','↷ Rehacer cambio de favoritos');
   redoFavorite.type='button';
   redoFavorite.addEventListener('click',()=>{
    const previous=favoriteRedo.get(key);
    if(!previous)return;
    if(readFavorites().join('|')!==previous.before.join('|')){
     favoriteRedo.delete(key);
     enhance(host,isOwn);
     return;
    }
    try{localStorage.setItem(key,JSON.stringify(previous.after))}catch(_){return}
    favoriteRedo.delete(key);
    favoriteUndo.set(key,previous);
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   sortBox.append(redoFavorite);
   const exportDetails=node('details','sb-nav-export-details');
   const exportSummary=node('summary','sb-nav-export-summary','📁 Exportar accesos (9 herramientas)');
   const exportBox=node('div','sb-nav-export-tools');
   exportDetails.append(exportSummary,exportBox);
   const exportOpenKey='sb-profile-export-menu-open-'+(isOwn?'own':'public')+'-v1';
   try{exportDetails.open=localStorage.getItem(exportOpenKey)==='true'}catch(_){}
   exportDetails.addEventListener('toggle',()=>{
    try{localStorage.setItem(exportOpenKey,String(exportDetails.open))}catch(_){}
   });
   const buildFavoriteList=()=>{
    const favorites=readFavorites();
    const currentHidden=readHidden();
    const entries=modules.filter(([_,selector,own])=>own===isOwn&&favorites.includes(selector)&&host.querySelector(selector));
    const mode=nav.dataset.sortMode;
    const clean=entry=>entry[0].replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/,'').trim();
    const compare=(a,b)=>clean(a).localeCompare(clean(b),'es',{sensitivity:'base'});
    entries.sort((a,b)=>mode==='az'?compare(a,b):mode==='za'?compare(b,a):favorites.indexOf(a[1])-favorites.indexOf(b[1]));
    return {
     count:entries.length,
     entries:entries.map(([label,selector])=>({label,hidden:currentHidden.includes(selector)})),
     list:'⭐ Mis accesos favoritos — Shadows Byte Gaming Official V2\n'+entries.map(([label,selector],i)=>(i+1)+'. '+label+(currentHidden.includes(selector)?' (oculto)':'')).join('\n')
    };
   };
   const copyFavorites=node('button','sb-nav-copy-favorites','📋 Copiar mis accesos favoritos');
   copyFavorites.type='button';
   copyFavorites.addEventListener('click',async()=>{
    const {list,count}=buildFavoriteList();
    if(!count)return;
    try{
     if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(list);
     else{
      const field=node('textarea','sb-nav-copy-fallback',list);
      field.value=list;
      field.setAttribute('readonly','');
      field.style.position='fixed';
      field.style.left='-9999px';
      document.body.append(field);
      field.select();
      const copied=document.execCommand('copy');
      field.remove();
      if(!copied)throw new Error('No se pudo copiar');
     }
     copyFavorites.textContent='✓ Lista copiada ('+count+')';
    }catch(_){
     copyFavorites.textContent='No se pudo copiar; revisa permisos';
    }
   });
   exportBox.append(copyFavorites);
   const downloadFavorites=node('button','sb-nav-download-favorites','⬇ Descargar mis accesos favoritos');
   downloadFavorites.type='button';
   downloadFavorites.addEventListener('click',()=>{
    const {list,count}=buildFavoriteList();
    if(!count)return;
    try{
     const file=new Blob(['\uFEFF',list],{type:'text/plain;charset=utf-8'});
     const url=URL.createObjectURL(file);
     const link=node('a');
     link.href=url;
     link.download='shadows-byte-accesos-favoritos-'+(isOwn?'mi-perfil':'perfil-publico')+'.txt';
     link.style.display='none';
     document.body.append(link);
     link.click();
     link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     downloadFavorites.textContent='✓ Archivo preparado ('+count+')';
    }catch(_){
     downloadFavorites.textContent='No se pudo preparar el archivo';
    }
   });
   exportBox.append(downloadFavorites);
   const downloadCsv=node('button','sb-nav-download-csv','📊 Descargar favoritos CSV');
   downloadCsv.type='button';
   downloadCsv.addEventListener('click',()=>{
    const {count,entries}=buildFavoriteList();
    if(!count)return;
    const csvCell=value=>{
     let raw=String(value);
     if(/^\s*[=+@-]/.test(raw))raw="'"+raw;
     return '"'+raw.replace(/"/g,'""')+'"';
    };
    const rows=[['Orden','Acceso','Estado'],...entries.map((entry,index)=>[String(index+1),entry.label,entry.hidden?'Oculto':'Visible'])];
    const csv='sep=;\r\n'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
    try{
     const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
     const url=URL.createObjectURL(blob);
     const link=node('a');
     link.href=url;
     link.download='shadows-byte-accesos-favoritos-'+(isOwn?'mi-perfil':'perfil-publico')+'.csv';
     link.style.display='none';
     document.body.append(link);
     link.click();
     link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     downloadCsv.textContent='✓ CSV preparado ('+count+')';
    }catch(_){
     downloadCsv.textContent='No se pudo preparar el CSV';
    }
   });
   exportBox.append(downloadCsv);
   const downloadAllCsv=node('button','sb-nav-download-all-csv','📑 Descargar todos los accesos CSV');
   downloadAllCsv.type='button';
   downloadAllCsv.addEventListener('click',()=>{
    const favorites=readFavorites();
    const hidden=readHidden();
    const entries=modules.filter(([_,selector,own])=>own===isOwn&&host.querySelector(selector));
    const mode=nav.dataset.sortMode;
    const clean=entry=>entry[0].replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/,'').trim();
    const compare=(a,b)=>clean(a).localeCompare(clean(b),'es',{sensitivity:'base'});
    entries.sort((a,b)=>{
     if(mode==='az')return compare(a,b);
     if(mode==='za')return compare(b,a);
     const ia=favorites.indexOf(a[1]),ib=favorites.indexOf(b[1]);
     if(ia<0&&ib<0)return 0;
     if(ia<0)return 1;
     if(ib<0)return -1;
     return ia-ib;
    });
    if(!entries.length)return;
    const csvCell=value=>{
     let raw=String(value);
     if(/^\s*[=+@-]/.test(raw))raw="'"+raw;
     return '"'+raw.replace(/"/g,'""')+'"';
    };
    const rows=[['Orden','Acceso','Favorito','Estado'],...entries.map(([label,selector],index)=>[
     String(index+1),label,favorites.includes(selector)?'Sí':'No',hidden.includes(selector)?'Oculto':'Visible'
    ])];
    const csv='sep=;\r\n'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
    try{
     const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
     const url=URL.createObjectURL(blob);
     const link=node('a');
     link.href=url;
     link.download='shadows-byte-todos-los-accesos-'+(isOwn?'mi-perfil':'perfil-publico')+'.csv';
     link.style.display='none';
     document.body.append(link);
     link.click();
     link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     downloadAllCsv.textContent='✓ CSV completo preparado ('+entries.length+')';
    }catch(_){
     downloadAllCsv.textContent='No se pudo preparar el CSV completo';
    }
   });
   exportBox.append(downloadAllCsv);
   const copyAllShortcuts=node('button','sb-nav-copy-all-shortcuts','📋 Copiar todos los accesos');
   copyAllShortcuts.type='button';
   copyAllShortcuts.addEventListener('click',async()=>{
    const favorites=readFavorites();
    const hidden=readHidden();
    const entries=modules.filter(([_,selector,own])=>own===isOwn&&host.querySelector(selector));
    if(!entries.length)return;
    const mode=nav.dataset.sortMode;
    const clean=entry=>entry[0].replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/,'').trim();
    const compare=(a,b)=>clean(a).localeCompare(clean(b),'es',{sensitivity:'base'});
    entries.sort((a,b)=>{
     if(mode==='az')return compare(a,b);
     if(mode==='za')return compare(b,a);
     const ia=favorites.indexOf(a[1]),ib=favorites.indexOf(b[1]);
     if(ia<0&&ib<0)return 0;
     if(ia<0)return 1;
     if(ib<0)return -1;
     return ia-ib;
    });
    const list='📋 Todos los accesos — Shadows Byte Gaming Official V2\n'+entries.map(([label,selector],index)=>
     (index+1)+'. '+label+(favorites.includes(selector)?' ⭐':'')+(hidden.includes(selector)?' (oculto)':'')
    ).join('\n');
    try{
     if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(list);
     else{
      const field=node('textarea','sb-nav-copy-fallback',list);
      field.value=list;
      field.setAttribute('readonly','');
      field.style.position='fixed';
      field.style.left='-9999px';
      document.body.append(field);
      field.select();
      const copied=document.execCommand('copy');
      field.remove();
      if(!copied)throw new Error('No se pudo copiar');
     }
     copyAllShortcuts.textContent='✓ Accesos copiados ('+entries.length+')';
    }catch(_){
     copyAllShortcuts.textContent='No se pudo copiar; revisa permisos';
    }
   });
   exportBox.append(copyAllShortcuts);
   const downloadAllTxt=node('button','sb-nav-download-all-txt','⬇ Descargar todos los accesos TXT');
   downloadAllTxt.type='button';
   downloadAllTxt.addEventListener('click',()=>{
    const favorites=readFavorites();
    const hidden=readHidden();
    const entries=modules.filter(([_,selector,own])=>own===isOwn&&host.querySelector(selector));
    if(!entries.length)return;
    const mode=nav.dataset.sortMode;
    const clean=entry=>entry[0].replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/,'').trim();
    const compare=(a,b)=>clean(a).localeCompare(clean(b),'es',{sensitivity:'base'});
    entries.sort((a,b)=>{
     if(mode==='az')return compare(a,b);
     if(mode==='za')return compare(b,a);
     const ia=favorites.indexOf(a[1]),ib=favorites.indexOf(b[1]);
     if(ia<0&&ib<0)return 0;
     if(ia<0)return 1;
     if(ib<0)return -1;
     return ia-ib;
    });
    const list='📋 Todos los accesos — Shadows Byte Gaming Official V2\n'+entries.map(([label,selector],index)=>
     (index+1)+'. '+label+(favorites.includes(selector)?' ⭐':'')+(hidden.includes(selector)?' (oculto)':'')
    ).join('\n');
    try{
     const blob=new Blob(['\uFEFF',list],{type:'text/plain;charset=utf-8'});
     const url=URL.createObjectURL(blob);
     const link=node('a');
     link.href=url;
     link.download='shadows-byte-todos-los-accesos-'+(isOwn?'mi-perfil':'perfil-publico')+'.txt';
     link.style.display='none';
     document.body.append(link);
     link.click();
     link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     downloadAllTxt.textContent='✓ TXT completo preparado ('+entries.length+')';
    }catch(_){
     downloadAllTxt.textContent='No se pudo preparar el TXT completo';
    }
   });
   exportBox.append(downloadAllTxt);
   const downloadFilteredCsv=node('button','sb-nav-download-filtered-csv','🔎 Descargar resultados filtrados CSV');
   downloadFilteredCsv.type='button';
   downloadFilteredCsv.addEventListener('click',()=>{
    const items=[...controls.querySelectorAll('.sb-nav-favorite-item')]
     .filter(item=>!item.hidden&&item.dataset.shortcutSelector);
    if(!items.length)return;
    const favorites=readFavorites();
    const hidden=readHidden();
    const csvCell=value=>{
     let raw=String(value);
     if(/^\s*[=+@-]/.test(raw))raw="'"+raw;
     return '"'+raw.replace(/"/g,'""')+'"';
    };
    const rows=[['Orden','Acceso','Favorito','Estado'],...items.map((item,index)=>{
     const selector=item.dataset.shortcutSelector;
     return [String(index+1),item.dataset.searchLabel||'',favorites.includes(selector)?'Sí':'No',hidden.includes(selector)?'Oculto':'Visible'];
    })];
    const csv='sep=;\r\n'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
    try{
     const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
     const url=URL.createObjectURL(blob);
     const link=node('a');
     link.href=url;
     link.download='shadows-byte-accesos-filtrados-'+(isOwn?'mi-perfil':'perfil-publico')+'.csv';
     link.style.display='none';
     document.body.append(link);
     link.click();
     link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     downloadFilteredCsv.textContent='✓ Resultados CSV preparados ('+items.length+')';
    }catch(_){
     downloadFilteredCsv.textContent='No se pudo preparar el CSV filtrado';
    }
   });
   exportBox.append(downloadFilteredCsv);
   const copyFiltered=node('button','sb-nav-copy-filtered','📋 Copiar resultados filtrados');
   copyFiltered.type='button';
   copyFiltered.addEventListener('click',async()=>{
    const items=[...controls.querySelectorAll('.sb-nav-favorite-item')]
     .filter(item=>!item.hidden&&item.dataset.shortcutSelector);
    if(!items.length)return;
    const favorites=readFavorites();
    const hidden=readHidden();
    const list='🔎 Resultados del perfil — Shadows Byte Gaming Official V2\n'+items.map((item,i)=>{
     const selector=item.dataset.shortcutSelector;
     return (i+1)+'. '+(item.dataset.searchLabel||'')+
      (favorites.includes(selector)?' ⭐':'')+
      (hidden.includes(selector)?' (oculto)':'');
    }).join('\n');
    try{
     if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(list);
     else{
      const field=node('textarea','sb-nav-copy-fallback',list);
      field.value=list;
      field.setAttribute('readonly','');
      field.style.position='fixed';
      field.style.left='-9999px';
      document.body.append(field);
      field.select();
      const copied=document.execCommand('copy');
      field.remove();
      if(!copied)throw new Error('No se pudo copiar');
     }
     copyFiltered.textContent='✓ Resultados copiados ('+items.length+')';
    }catch(_){
     copyFiltered.textContent='No se pudo copiar; revisa permisos';
    }
   });
   exportBox.append(copyFiltered);
   const downloadFilteredTxt=node('button','sb-nav-download-filtered-txt','⬇ Descargar resultados filtrados TXT');
   downloadFilteredTxt.type='button';
   downloadFilteredTxt.addEventListener('click',()=>{
    const items=[...controls.querySelectorAll('.sb-nav-favorite-item')]
     .filter(item=>!item.hidden&&item.dataset.shortcutSelector);
    if(!items.length)return;
    const favorites=readFavorites();
    const hidden=readHidden();
    const list='🔎 Resultados del perfil — Shadows Byte Gaming Official V2\n'+items.map((item,i)=>{
     const selector=item.dataset.shortcutSelector;
     return (i+1)+'. '+(item.dataset.searchLabel||'')+
      (favorites.includes(selector)?' ⭐':'')+
      (hidden.includes(selector)?' (oculto)':'');
    }).join('\n');
    try{
     const blob=new Blob(['\uFEFF',list],{type:'text/plain;charset=utf-8'});
     const url=URL.createObjectURL(blob);
     const link=node('a');
     link.href=url;
     link.download='shadows-byte-accesos-filtrados-'+(isOwn?'mi-perfil':'perfil-publico')+'.txt';
     link.style.display='none';
     document.body.append(link);
     link.click();
     link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
     downloadFilteredTxt.textContent='✓ TXT preparado ('+items.length+')';
    }catch(_){
     downloadFilteredTxt.textContent='No se pudo preparar el TXT filtrado';
    }
   });
   exportBox.append(downloadFilteredTxt);
   const controls=node('div','sb-nav-links');
   const applyFilter=()=>{
    if(bulkFeedback.textContent)bulkFeedback.textContent='';
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es').trim();
    const query=normalize(search.value);
    const enabled=nav.dataset.onlyFavorites==='true';
    const unstarredOnly=nav.dataset.onlyUnstarred==='true';
    const hiddenOnly=nav.dataset.onlyHidden==='true';
    const label=enabled?'★ Solo favoritos':'☆ Solo favoritos';
    if(onlyFavorites.textContent!==label)onlyFavorites.textContent=label;
    if(onlyFavorites.getAttribute('aria-pressed')!==String(enabled))onlyFavorites.setAttribute('aria-pressed',String(enabled));
    const unstarredLabel=unstarredOnly?'☆ Mostrando sin estrella':'☆ Sin favoritos';
    if(onlyUnstarred.textContent!==unstarredLabel)onlyUnstarred.textContent=unstarredLabel;
    if(onlyUnstarred.getAttribute('aria-pressed')!==String(unstarredOnly))onlyUnstarred.setAttribute('aria-pressed',String(unstarredOnly));
    const hiddenLabel=hiddenOnly?'🙈 Mostrando ocultos':'🙈 Solo ocultos';
    if(onlyHidden.textContent!==hiddenLabel)onlyHidden.textContent=hiddenLabel;
    if(onlyHidden.getAttribute('aria-pressed')!==String(hiddenOnly))onlyHidden.setAttribute('aria-pressed',String(hiddenOnly));
    let visible=0;
    let addable=0;
    let removable=0;
    let hideable=0;
    let restorable=0;
    for(const item of controls.querySelectorAll('.sb-nav-favorite-item')){
     const matchesText=normalize(item.dataset.searchLabel).includes(query);
     // Leer el estado actual de la estrella, incluso después de reordenar favoritos.
     const star=item.querySelector('.sb-nav-star');
     const isFavorite=star?.getAttribute('aria-pressed')==='true';
     const isHidden=item.dataset.shortcutHidden==='true';
     const matched=matchesText&&(!enabled||isFavorite)&&(!unstarredOnly||!isFavorite)&&(!hiddenOnly||isHidden);
     if(item.hidden!==!matched)item.hidden=!matched;
     if(matched){
      visible++;
      if(!isFavorite)addable++;
      else removable++;
      if(!isHidden)hideable++;
      else restorable++;
     }
    }
    const message=query||enabled||unstarredOnly||hiddenOnly?(visible?visible+' apartados encontrados':'No hay apartados que coincidan.'):''; 
    if(resultCount.textContent!==message)resultCount.textContent=message;
    const bulkLabel=addable?'⭐ Añadir resultados a favoritos ('+addable+')':'⭐ No hay resultados sin estrella';
    if(addVisibleFavorites.textContent!==bulkLabel)addVisibleFavorites.textContent=bulkLabel;
    if(addVisibleFavorites.disabled!==(addable===0))addVisibleFavorites.disabled=addable===0;
    const removeLabel=removable?'☆ Quitar resultados de favoritos ('+removable+')':'☆ No hay favoritos en los resultados';
    if(removeVisibleFavorites.textContent!==removeLabel)removeVisibleFavorites.textContent=removeLabel;
    if(removeVisibleFavorites.disabled!==(removable===0))removeVisibleFavorites.disabled=removable===0;
    const hideLabel=hideable?'🙈 Ocultar resultados ('+hideable+')':'🙈 No hay resultados visibles para ocultar';
    if(hideVisibleResults.textContent!==hideLabel)hideVisibleResults.textContent=hideLabel;
    if(hideVisibleResults.disabled!==(hideable===0))hideVisibleResults.disabled=hideable===0;
    const restoreLabel=restorable?'↺ Restaurar resultados ocultos ('+restorable+')':'↺ No hay resultados ocultos para restaurar';
    if(restoreVisibleResults.textContent!==restoreLabel)restoreVisibleResults.textContent=restoreLabel;
    if(restoreVisibleResults.disabled!==(restorable===0))restoreVisibleResults.disabled=restorable===0;
    const filteredLabel='🔎 Descargar resultados filtrados CSV ('+visible+')';
    if(downloadFilteredCsv.disabled!==(visible===0))downloadFilteredCsv.disabled=visible===0;
    if(downloadFilteredCsv.textContent!==filteredLabel)downloadFilteredCsv.textContent=filteredLabel;
    const copyFilteredLabel='📋 Copiar resultados filtrados ('+visible+')';
    if(copyFiltered.disabled!==(visible===0))copyFiltered.disabled=visible===0;
    if(!copyFiltered.textContent.startsWith('✓')&&!copyFiltered.textContent.startsWith('No se pudo')&&copyFiltered.textContent!==copyFilteredLabel)copyFiltered.textContent=copyFilteredLabel;
    const filteredTxtLabel='⬇ Descargar resultados filtrados TXT ('+visible+')';
    if(downloadFilteredTxt.disabled!==(visible===0))downloadFilteredTxt.disabled=visible===0;
    if(downloadFilteredTxt.textContent!==filteredTxtLabel)downloadFilteredTxt.textContent=filteredTxtLabel;
    const visibleResult=String(visible);
    if(statFields.results.textContent!==visibleResult)statFields.results.textContent=visibleResult;
    const hasActiveFilters=Boolean(query)||enabled||unstarredOnly||hiddenOnly||nav.dataset.sortMode!=='favorites';
    if(resetFilters.disabled===hasActiveFilters)resetFilters.disabled=!hasActiveFilters;
   };
   search.addEventListener('input',applyFilter);
   clear.addEventListener('click',()=>{search.value='';applyFilter();search.focus()});
   details.append(summary,searchBox,bulkDetails,layoutBar,sortBox,exportDetails,resultCount,controls);
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
  const writeHidden=(next)=>{
   const before=readHidden();
   const normalized=[...new Set(next)].slice(0,25);
   if(before.join('|')===normalized.join('|'))return false;
   try{
    localStorage.setItem(hiddenKey,JSON.stringify(normalized));
    visibilityUndo.set(hiddenKey,{before,after:normalized});
    visibilityRedo.delete(hiddenKey);
    return true;
   }catch(_){return false}
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
   const restoreAll=node('button','sb-nav-restore-all','↺ Restaurar todos los accesos ocultos');
   restoreAll.type='button';
   restoreAll.addEventListener('click',()=>{
    const current=readHidden();
    if(!current.length)return;
    if(!window.confirm('¿Restaurar los '+current.length+' accesos ocultos de '+(isOwn?'Mi cuenta':'los perfiles públicos')+'? Tus favoritos y su orden se conservarán.'))return;
    if(!writeHidden([]))return;
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   settings.append(restoreAll);
   const hideNonFavorites=node('button','sb-nav-hide-nonfavorites','☆ Ocultar los no favoritos');
   hideNonFavorites.type='button';
   hideNonFavorites.addEventListener('click',()=>{
    const currentFavorites=readFavorites();
    const currentHidden=readHidden();
    const actual=modules.filter(item=>item[2]===isOwn&&host.querySelector(item[1])).map(item=>item[1]);
    const visibleFavorites=actual.filter(selector=>currentFavorites.includes(selector)&&!currentHidden.includes(selector));
    const toHide=actual.filter(selector=>!currentFavorites.includes(selector)&&!currentHidden.includes(selector));
    if(!visibleFavorites.length||!toHide.length)return;
    if(!window.confirm('¿Ocultar '+toHide.length+' accesos sin estrella? Tus '+visibleFavorites.length+' favoritos visibles permanecerán disponibles. Puedes deshacerlo desde Restaurar todos.'))return;
    if(!writeHidden([...currentHidden,...toHide]))return;
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   settings.append(hideNonFavorites);
   const undo=node('button','sb-nav-undo-visibility','↶ Deshacer último cambio');
   undo.type='button';
   undo.addEventListener('click',()=>{
    const last=visibilityUndo.get(hiddenKey);
    if(!last)return;
    const current=readHidden();
    if(current.join('|')!==last.after.join('|')){
     visibilityUndo.delete(hiddenKey);
     enhance(host,isOwn);
     return;
    }
    try{localStorage.setItem(hiddenKey,JSON.stringify(last.before))}catch(_){return}
    visibilityUndo.delete(hiddenKey);
    visibilityRedo.set(hiddenKey,last);
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   settings.append(undo);
   const redo=node('button','sb-nav-redo-visibility','↷ Rehacer último cambio');
   redo.type='button';
   redo.addEventListener('click',()=>{
    const last=visibilityRedo.get(hiddenKey);
    if(!last)return;
    if(readHidden().join('|')!==last.before.join('|')){
     visibilityRedo.delete(hiddenKey);
     enhance(host,isOwn);
     return;
    }
    try{localStorage.setItem(hiddenKey,JSON.stringify(last.after))}catch(_){return}
    visibilityRedo.delete(hiddenKey);
    visibilityUndo.set(hiddenKey,last);
    links.dataset.signature='';
    enhance(host,isOwn);
   });
   settings.append(redo);
   const details=nav.querySelector('.sb-nav-details');
   details.after(settings);
  }
  const hidden=readHidden();
  const restoreAll=settings.querySelector('.sb-nav-restore-all');
  if(restoreAll){
   const showRestore=showHidden&&hidden.length>0;
   if(restoreAll.hidden===showRestore)restoreAll.hidden=!showRestore;
   const restoreLabel='↺ Restaurar todos los accesos ocultos ('+hidden.length+')';
   if(restoreAll.textContent!==restoreLabel)restoreAll.textContent=restoreLabel;
  }
  const undoVisibility=settings.querySelector('.sb-nav-undo-visibility');
  if(undoVisibility){
   const last=visibilityUndo.get(hiddenKey);
   const valid=!!last&&readHidden().join('|')===last.after.join('|');
   if(last&&!valid)visibilityUndo.delete(hiddenKey);
   if(undoVisibility.hidden===showHidden)undoVisibility.hidden=!showHidden;
   if(undoVisibility.disabled===valid)undoVisibility.disabled=!valid;
  }
  const redoVisibility=settings.querySelector('.sb-nav-redo-visibility');
  if(redoVisibility){
   const last=visibilityRedo.get(hiddenKey);
   const valid=!!last&&readHidden().join('|')===last.before.join('|');
   if(last&&!valid)visibilityRedo.delete(hiddenKey);
   if(redoVisibility.hidden===showHidden)redoVisibility.hidden=!showHidden;
   if(redoVisibility.disabled!==!valid)redoVisibility.disabled=!valid;
  }
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
  const writeFavorites=next=>{
   const before=readFavorites();
   const normalized=[...new Set(next)].slice(0,25);
   if(before.join('|')===normalized.join('|'))return false;
   try{
    localStorage.setItem(key,JSON.stringify(normalized));
    favoriteUndo.set(key,{before,after:normalized});
    favoriteRedo.delete(key);
    return true;
   }catch(_){return false}
  };
  const undoFavorite=nav.querySelector('.sb-nav-undo-favorite');
  if(undoFavorite){
   const previous=favoriteUndo.get(key);
   const valid=!!previous&&readFavorites().join('|')===previous.after.join('|');
   if(previous&&!valid)favoriteUndo.delete(key);
   if(undoFavorite.disabled!==!valid)undoFavorite.disabled=!valid;
  }
  const redoFavorite=nav.querySelector('.sb-nav-redo-favorite');
  if(redoFavorite){
   const previous=favoriteRedo.get(key);
   const valid=!!previous&&readFavorites().join('|')===previous.before.join('|');
   if(previous&&!valid)favoriteRedo.delete(key);
   if(redoFavorite.disabled!==!valid)redoFavorite.disabled=!valid;
  }
  const relevant=modules.filter(item=>item[2]===isOwn);
  const available=relevant.filter(([label,selector])=>host.querySelector(selector));
  const favorites=readFavorites();
  const downloadAllTxt=nav.querySelector('.sb-nav-download-all-txt');
  if(downloadAllTxt){
   const count=available.length;
   if(downloadAllTxt.disabled!==(count===0))downloadAllTxt.disabled=count===0;
   const label='⬇ Descargar todos los accesos TXT ('+count+')';
   if(!downloadAllTxt.textContent.startsWith('✓')&&!downloadAllTxt.textContent.startsWith('No se pudo')&&downloadAllTxt.textContent!==label)downloadAllTxt.textContent=label;
  }
  const copyAllShortcuts=nav.querySelector('.sb-nav-copy-all-shortcuts');
  if(copyAllShortcuts){
   const count=available.length;
   if(copyAllShortcuts.disabled!==(count===0))copyAllShortcuts.disabled=count===0;
   const label='📋 Copiar todos los accesos ('+count+')';
   if(!copyAllShortcuts.textContent.startsWith('✓')&&!copyAllShortcuts.textContent.startsWith('No se pudo')&&copyAllShortcuts.textContent!==label)copyAllShortcuts.textContent=label;
  }
  const downloadAllCsv=nav.querySelector('.sb-nav-download-all-csv');
  if(downloadAllCsv){
   const count=available.length;
   if(downloadAllCsv.disabled!==(count===0))downloadAllCsv.disabled=count===0;
   const label='📑 Descargar todos los accesos CSV ('+count+')';
   if(!downloadAllCsv.textContent.startsWith('✓')&&!downloadAllCsv.textContent.startsWith('No se pudo')&&downloadAllCsv.textContent!==label)downloadAllCsv.textContent=label;
  }
  const copyFavorites=nav.querySelector('.sb-nav-copy-favorites');
  if(copyFavorites){
   const count=available.filter(([_,selector])=>favorites.includes(selector)).length;
   if(copyFavorites.disabled!==(count===0))copyFavorites.disabled=count===0;
   const downloadCsv=nav.querySelector('.sb-nav-download-csv');
   if(downloadCsv){
    if(downloadCsv.disabled!==(count===0))downloadCsv.disabled=count===0;
    const csvLabel='📊 Descargar favoritos CSV ('+count+')';
    if(!downloadCsv.textContent.startsWith('✓')&&!downloadCsv.textContent.startsWith('No se pudo')&&downloadCsv.textContent!==csvLabel)downloadCsv.textContent=csvLabel;
   }
   const downloadFavorites=nav.querySelector('.sb-nav-download-favorites');
   if(downloadFavorites){
    if(downloadFavorites.disabled!==(count===0))downloadFavorites.disabled=count===0;
    const downloadLabel='⬇ Descargar mis accesos favoritos ('+count+')';
    if(!downloadFavorites.textContent.startsWith('✓')&&!downloadFavorites.textContent.startsWith('No se pudo')&&downloadFavorites.textContent!==downloadLabel)downloadFavorites.textContent=downloadLabel;
   }
   const label='📋 Copiar mis accesos favoritos ('+count+')';
   if(!copyFavorites.textContent.startsWith('✓')&&!copyFavorites.textContent.startsWith('No se pudo')&&copyFavorites.textContent!==label)copyFavorites.textContent=label;
  }
  const hideNonFavorites=settings.querySelector('.sb-nav-hide-nonfavorites');
  if(hideNonFavorites){
   const favoritesVisible=available.some(([_,selector])=>favorites.includes(selector)&&!hidden.includes(selector));
   const nonFavoritesVisible=available.filter(([_,selector])=>!favorites.includes(selector)&&!hidden.includes(selector)).length;
   const shouldShow=showHidden;
   if(hideNonFavorites.hidden===shouldShow)hideNonFavorites.hidden=!shouldShow;
   const shouldDisable=!favoritesVisible||nonFavoritesVisible===0;
   if(hideNonFavorites.disabled!==shouldDisable)hideNonFavorites.disabled=shouldDisable;
   const title=nonFavoritesVisible?'☆ Ocultar los no favoritos ('+nonFavoritesVisible+')':'☆ No hay accesos sin estrella visibles';
   if(hideNonFavorites.textContent!==title)hideNonFavorites.textContent=title;
   hideNonFavorites.title=!favoritesVisible?'Marca primero algún acceso visible como favorito':nonFavoritesVisible?'Ocultar los accesos sin estrella con confirmación':'Todos los accesos sin estrella ya están ocultos';
  }
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
   item.dataset.shortcutSelector=selector;
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
    if(!writeFavorites(nextList))return;
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
     if(!writeFavorites(list))return;
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
     if(!writeHidden(next))return;
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
