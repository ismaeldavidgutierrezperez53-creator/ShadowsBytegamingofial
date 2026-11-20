/* Shadows Byte V2: copia local de organización de perfiles, sin credenciales ni datos personales. */
(()=>{
 'use strict';
 const prefixes=['sb-profile-favorite-sections-','sb-profile-hidden-shortcuts-'];
 const allowedSelectors=new Set([
  '.sbp-dashboard','.sbp-identity-card','.sb-profile-views','.sbd-discovery','.sb-showcase','.sbg-stats',
  '.sba-timeline','.sbc-connections','.sbr-goals','.sbs-challenges','#profile-form',
  '#game-library','.sbaf-panel','.public-game-library','.member-achievements',
  '.member-profile-stats','.member-social','.member-gallery-panel'
 ]);
 const keys=[
  ...prefixes.flatMap(prefix=>['own','public'].map(type=>prefix+type+'-v1')),
  'sb-profile-compact-v1',
  'sb-profile-nav-layout-own-v1',
  'sb-profile-nav-layout-public-v1',
  'sb-profile-preset-custom-own-v1',
  'sb-profile-featured-limit-own-v1',
  'sb-profile-featured-limit-public-v1'
 ];
 const isFeaturedLimitKey=key=>key.startsWith('sb-profile-featured-limit-');
 const customKey='sb-profile-preset-custom-own-v1';
 const allowedCustom=new Set(['.sbp-dashboard','.sbp-identity-card','.sbd-discovery','.sb-showcase','.sba-timeline','#profile-form','#game-library','.sbg-stats','.sbr-goals','.sbc-connections','.sbs-challenges','.sb-profile-views']);
 const isLayoutKey=key=>key.startsWith('sb-profile-nav-layout-');
 const element=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
 const safeArray=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'&&allowedSelectors.has(v)))].slice(0,25):[];
 function readValue(key){
  try{
   const raw=localStorage.getItem(key);
   if(key==='sb-profile-compact-v1')return raw==='yes'?'yes':'no';
   if(isLayoutKey(key))return raw==='list'?'list':'grid';
   if(isFeaturedLimitKey(key))return ['1','3','5'].includes(raw)?raw:'3';
   if(key===customKey){
    const value=JSON.parse(raw||'null');
    if(!value||!Array.isArray(value.sections))return null;
    return {sections:[...new Set(value.sections.filter(v=>typeof v==='string'&&allowedCustom.has(v)))].slice(0,20)};
   }
   return safeArray(JSON.parse(raw||'[]'));
  }catch(_){return key==='sb-profile-compact-v1'?'no':isLayoutKey(key)?'grid':isFeaturedLimitKey(key)?'3':key===customKey?null:[]}
 }
 function mount(host){
  const nav=host.querySelector('.sb-nav-panel');
  if(!nav||nav.querySelector('.sb-profile-backup'))return;
  const section=element('section','sb-profile-backup');
  section.setAttribute('aria-label','Guardar y recuperar organización del perfil');
  section.append(element('h3','','💾 Copia de mi organización'));
  section.append(element('p','sb-profile-backup-help','Guarda favoritos, su orden, accesos ocultos, modo compacto, vista de lista/cuadrícula, cantidad de accesos destacados y tu plantilla personalizada en un archivo. No incluye mensajes, datos de cuenta ni videojuegos.'));
  const actions=element('div','sb-profile-backup-actions');
  const exportButton=element('button','sb-profile-backup-btn','⬇ Exportar configuración');
  exportButton.type='button';
  const importButton=element('button','sb-profile-backup-btn','⬆ Importar configuración');
  importButton.type='button';
  const resetButton=element('button','sb-profile-backup-btn sb-profile-backup-reset','↺ Restablecer organización');
  resetButton.type='button';
  const file=element('input','sb-profile-backup-file');
  file.type='file';file.accept='.json,application/json';file.hidden=true;
  file.setAttribute('aria-label','Seleccionar archivo de configuración del perfil');
  const notice=element('p','sb-profile-backup-notice','');
  notice.setAttribute('role','status');
  const preview=element('div','sb-profile-backup-preview');
  preview.hidden=true;
  const previewTitle=element('h4','','Vista previa de la importación');
  const previewSummary=element('p','sb-profile-backup-help');
  const previewActions=element('div','sb-profile-backup-actions');
  const applyButton=element('button','sb-profile-backup-btn','✓ Aplicar configuración');
  applyButton.type='button';
  const cancelButton=element('button','sb-profile-backup-btn','Cancelar');
  cancelButton.type='button';
  previewActions.append(applyButton,cancelButton);
  preview.append(previewTitle,previewSummary,previewActions);
  let pendingImport=null;
  const dismissPreview=()=>{pendingImport=null;preview.hidden=true;previewSummary.textContent=''};
  cancelButton.onclick=()=>{dismissPreview();notice.textContent='Importación cancelada.'};
  applyButton.onclick=()=>{
   if(!pendingImport)return;
   try{
    for(const key of keys){
     const value=pendingImport[key];
     // Las copias antiguas no tienen el modo de presentación: se conserva el actual.
     if(value===undefined||value===null&&key!==customKey)continue;
     if(key===customKey&&value===null){localStorage.removeItem(key);continue}
     localStorage.setItem(key,key==='sb-profile-compact-v1'||isLayoutKey(key)||isFeaturedLimitKey(key)?value:JSON.stringify(value));
    }
    dismissPreview();
    notice.textContent='Configuración importada. Actualizando el organizador.';
    location.reload();
   }catch(_){notice.textContent='No se pudo guardar la configuración en este navegador.'}
  };
  resetButton.onclick=()=>{
   if(!window.confirm('¿Restablecer el organizador? Se eliminarán tus favoritos, accesos ocultos, preferencia de modo compacto, vistas de lista/cuadrícula, cantidad de accesos destacados y plantilla personalizada en este navegador. No afecta a tu cuenta.'))return;
   try{
    keys.forEach(key=>localStorage.removeItem(key));
    dismissPreview();
    notice.textContent='Organización restablecida. Actualizando el organizador.';
    location.reload();
   }catch(_){notice.textContent='No se pudo restablecer el organizador.'}
  };
  exportButton.onclick=()=>{
   try{
    const preferences={};
    keys.forEach(key=>preferences[key]=readValue(key));
    const content=JSON.stringify({app:'Shadows Byte Gaming Official V2',schemaVersion:1,preferences},null,2);
    const blob=new Blob([content],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=element('a');anchor.href=url;anchor.download='shadows-byte-perfil-preferencias.json';
    document.body.append(anchor);anchor.click();anchor.remove();
    URL.revokeObjectURL(url);
    notice.textContent='Configuración exportada. Guarda el archivo en un lugar seguro.';
   }catch(_){notice.textContent='No se pudo exportar la configuración.'}
  };
  importButton.onclick=()=>{dismissPreview();file.value='';file.click()};
  file.onchange=async()=>{
   const selected=file.files?.[0];
   if(!selected)return;
   if(selected.size>100000){notice.textContent='Archivo demasiado grande. Máximo 100 KB.';return}
   try{
    const parsed=JSON.parse(await selected.text());
    if(parsed?.app!=='Shadows Byte Gaming Official V2'||parsed.schemaVersion!==1||!parsed.preferences||typeof parsed.preferences!=='object'||Array.isArray(parsed.preferences)){
     notice.textContent='Este archivo no es una copia compatible del organizador.';return;
    }
    const validated={};
    for(const key of keys){
     const value=parsed.preferences[key];
     if(key==='sb-profile-compact-v1'){
      if(value!=='yes'&&value!=='no')throw Error('Modo compacto inválido');
      validated[key]=value;
     }else if(isFeaturedLimitKey(key)){
      // Las copias de seguridad anteriores conservan el ajuste actual.
      if(value===undefined){validated[key]=null;continue}
      if(!['1','3','5'].includes(value))throw Error('Cantidad de destacados inválida');
      validated[key]=value;
     }else if(key===customKey){
      if(value===undefined){validated[key]=undefined;continue}
      if(value===null){validated[key]=null;continue}
      if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.sections)||value.sections.length>20||value.sections.some(v=>typeof v!=='string'||!allowedCustom.has(v)))throw Error('Plantilla inválida');
      validated[key]={sections:[...new Set(value.sections)]};
     }else if(isLayoutKey(key)){
      // Compatibilidad con copias v1 exportadas antes de introducir lista/cuadrícula.
      if(value===undefined){validated[key]=null;continue}
      if(value!=='grid'&&value!=='list')throw Error('Vista de accesos inválida');
      validated[key]=value;
     }else{
      if(!Array.isArray(value)||value.length>100||value.some(v=>typeof v!=='string'||!allowedSelectors.has(v)))throw Error('Lista inválida');
      validated[key]=safeArray(value);
     }
    }
    pendingImport=validated;
    const ownFav=validated['sb-profile-favorite-sections-own-v1'].length;
    const publicFav=validated['sb-profile-favorite-sections-public-v1'].length;
    const hidden=validated['sb-profile-hidden-shortcuts-own-v1'].length+validated['sb-profile-hidden-shortcuts-public-v1'].length;
    const layoutName=value=>value===null?'sin cambios':value==='list'?'lista':'cuadrícula';
    const custom=validated[customKey];
    const customSummary=custom===undefined?'sin cambios':custom===null?'no incluida':custom.sections.length+' secciones guardadas';
    const featuredOwn=validated['sb-profile-featured-limit-own-v1']||'sin cambios';
    const featuredPublic=validated['sb-profile-featured-limit-public-v1']||'sin cambios';
    previewSummary.textContent='Destacados en Mi cuenta: '+featuredOwn+'. Destacados públicos: '+featuredPublic+'. Plantilla personalizada: '+customSummary+'. Archivo: '+selected.name+' · '+ownFav+' favoritos en Mi cuenta, '+publicFav+' favoritos públicos, '+hidden+' accesos ocultos. Modo compacto: '+(validated['sb-profile-compact-v1']==='yes'?'activado':'desactivado')+'. Vista en Mi cuenta: '+layoutName(validated['sb-profile-nav-layout-own-v1'])+'. Vista en perfiles públicos: '+layoutName(validated['sb-profile-nav-layout-public-v1'])+'. Se sustituirán las preferencias indicadas en este navegador.';
    preview.hidden=false;
    notice.textContent='Revisa la vista previa antes de aplicar los cambios.';
   }catch(_){dismissPreview();notice.textContent='El archivo es inválido o no se pudo importar.'}
  };
  actions.append(exportButton,importButton,resetButton,file);
  section.append(actions,preview,notice);
  nav.append(section);
 }
 let pending=false;
 function scan(){
  pending=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sb-nav-panel'))mount(account);
  const publicProfile=document.getElementById('public-member-profile');
  if(publicProfile?.querySelector('.sb-nav-panel'))mount(publicProfile);
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(scan)}}
 function init(){
  const app=document.getElementById('app');if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
