/* Plantillas locales de favoritos para Mi cuenta; no modifican datos ni visibilidad. */
(()=>{
 'use strict';
 const FAVORITES_KEY='sb-profile-favorite-sections-own-v1';
 const CUSTOM_KEY='sb-profile-preset-custom-own-v1';
 const TEMPLATES=[
  {id:'anime',name:'🌸 Anime',sections:[['🎴 Identidad gamer','.sbp-identity-card'],['🧭 Miembros afines','.sbd-discovery'],['🎖️ Escaparate gamer','.sb-showcase'],['🕒 Actividad reciente','.sba-timeline']]},
  {id:'gaming',name:'🎮 Gaming',sections:[['🎮 Biblioteca','#game-library'],['📊 Estadísticas gamer','.sbg-stats'],['🏅 Retos de colección','.sbr-goals'],['🎖️ Escaparate gamer','.sb-showcase']]},
  {id:'community',name:'👥 Comunidad',sections:[['👥 Conexiones gamer','.sbc-connections'],['🌟 Retos sociales','.sbs-challenges'],['👁️ Visitas al perfil','.sb-profile-views'],['🧭 Miembros afines','.sbd-discovery']]}
 ];
 const el=(tag,cls,text)=>{const item=document.createElement(tag);if(cls)item.className=cls;if(text!==undefined)item.textContent=text;return item};
 const labels=new Map([...TEMPLATES.flatMap(t=>t.sections),['✨ Mi centro de perfil','.sbp-dashboard'],['🎨 Editar perfil','#profile-form'],['🌟 Retos sociales','.sbs-challenges']].map(([label,selector])=>[selector,label]));
 const readCustom=()=>{
  try{
   const data=JSON.parse(localStorage.getItem(CUSTOM_KEY)||'null');
   if(!data||!Array.isArray(data.sections))return null;
   const sections=[...new Set(data.sections.filter(selector=>typeof selector==='string'&&labels.has(selector)))].slice(0,20);
   return sections.length?{id:'custom',name:'⭐ Mi plantilla',sections:sections.map(selector=>[labels.get(selector),selector])}:null;
  }catch(_){return null}
 };
 function mount(root){
  const nav=root.querySelector('.sb-nav-panel');
  if(!nav||nav.querySelector('.sb-profile-presets'))return;
  const panel=el('section','sb-profile-presets');
  panel.setAttribute('aria-label','Plantillas de organización del perfil');
  panel.append(el('h3','','🎨 Plantillas de organización'));
  panel.append(el('p','sb-presets-help','Elige una plantilla para ordenar tus secciones favoritas. No se borran ni ocultan apartados del perfil.'));
  const chooser=el('div','sb-presets-choices');
  const preview=el('div','sb-presets-preview');
  preview.hidden=true;
  const heading=el('h4','','Vista previa');
  const description=el('p','sb-presets-preview-description');
  const list=el('ul','sb-presets-list');
  const actions=el('div','sb-presets-actions');
  const apply=el('button','sb-presets-btn sb-presets-apply','Aplicar plantilla');
  apply.type='button';
  const cancel=el('button','sb-presets-btn','Cancelar');
  cancel.type='button';
  const notice=el('p','sb-presets-notice');
  notice.setAttribute('role','status');
  let pending=null;
  const dismiss=()=>{pending=null;preview.hidden=true};
  cancel.onclick=()=>{dismiss();notice.textContent='No se ha cambiado tu organización.'};
  apply.onclick=()=>{
   if(!pending)return;
   const available=pending.sections.filter(([_,selector])=>root.querySelector(selector)).map(([_,selector])=>selector);
   if(!available.length){notice.textContent='Esta plantilla todavía no tiene apartados disponibles.';return}
   try{
    localStorage.setItem(FAVORITES_KEY,JSON.stringify(available));
    dismiss();
    notice.textContent='Plantilla aplicada. Actualizando favoritos.';
    // El navegador del perfil lee la preferencia al volver a cargar.
    location.reload();
   }catch(_){notice.textContent='No se pudo guardar la plantilla en este navegador.'}
  };
  actions.append(apply,cancel);
  preview.append(heading,description,list,actions);
  const showPreview=template=>{
   pending=template;
   heading.textContent='Vista previa: '+template.name;
   list.replaceChildren();
   const available=template.sections.filter(([_,selector])=>root.querySelector(selector));
   for(const [label] of available)list.append(el('li','',label));
   description.textContent=available.length
    ?'Se marcarán '+available.length+' apartados disponibles como favoritos, en este orden. Se sustituirá la lista actual de favoritos, pero no los accesos ocultos ni otros ajustes.'
    :'No hay apartados disponibles de esta plantilla en tu perfil.';
   apply.disabled=!available.length;
   preview.hidden=false;
   notice.textContent='';
  };
  for(const template of TEMPLATES){
   const btn=el('button','sb-presets-btn',template.name);
   btn.type='button';
   btn.onclick=()=>showPreview(template);
   chooser.append(btn);
  }
  const customBox=el('div','sb-presets-custom');
  const customTitle=el('h4','','⭐ Mi plantilla personalizada');
  const customText=el('p','sb-presets-help','Guarda el orden actual de tus favoritos para recuperarlo cuando quieras.');
  const customActions=el('div','sb-presets-actions');
  const save=el('button','sb-presets-btn','💾 Guardar mis favoritos');
  save.type='button';
  const view=el('button','sb-presets-btn','👁 Vista previa');
  view.type='button';
  const remove=el('button','sb-presets-btn sb-presets-remove','Eliminar mi plantilla');
  remove.type='button';
  const updateButtons=()=>{
   const exists=!!readCustom();
   if(view.disabled===exists)view.disabled=!exists;
   if(remove.disabled===exists)remove.disabled=!exists;
  };
  save.onclick=()=>{
   let favoriteSelectors=[];
   try{
    const raw=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
    if(Array.isArray(raw))favoriteSelectors=[...new Set(raw.filter(selector=>typeof selector==='string'&&labels.has(selector)&&root.querySelector(selector)))].slice(0,20);
   }catch(_){}
   if(!favoriteSelectors.length){notice.textContent='Marca primero al menos un apartado como favorito.';return}
   if(readCustom()&&!window.confirm('¿Sustituir tu plantilla personalizada guardada por los favoritos actuales?'))return;
   try{
    localStorage.setItem(CUSTOM_KEY,JSON.stringify({sections:favoriteSelectors}));
    updateButtons();
    dismiss();
    notice.textContent='Tu plantilla personalizada se ha guardado.';
   }catch(_){notice.textContent='No se pudo guardar tu plantilla en este navegador.'}
  };
  view.onclick=()=>{
   const custom=readCustom();
   if(custom)showPreview(custom);
   else notice.textContent='Todavía no tienes una plantilla personalizada.';
  };
  remove.onclick=()=>{
   if(!readCustom()||!window.confirm('¿Eliminar tu plantilla personalizada? Tus favoritos actuales no cambiarán.'))return;
   try{
    localStorage.removeItem(CUSTOM_KEY);
    dismiss();
    updateButtons();
    notice.textContent='Plantilla personalizada eliminada. Los favoritos actuales se conservan.';
   }catch(_){notice.textContent='No se pudo eliminar la plantilla.'}
  };
  customActions.append(save,view,remove);
  customBox.append(customTitle,customText,customActions);
  updateButtons();
  panel.append(chooser,customBox,preview,notice);
  const backup=nav.querySelector('.sb-profile-backup');
  if(backup)backup.before(panel);else nav.append(panel);
 }
 let scheduled=false;
 function scan(){
  scheduled=false;
  const root=document.getElementById('account-profile');
  if(root?.querySelector('#profile-form')&&root.querySelector('.sb-nav-panel'))mount(root);
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan)}
 function init(){
  const app=document.getElementById('app');if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
