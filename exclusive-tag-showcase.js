/* Vitrina de etiquetas favoritas: hasta tres, elegidas por el miembro y validadas en Supabase. */
(() => {
 'use strict';
 if(typeof sb==='undefined')return;
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const make=(tag,cls='',value)=>{
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  if(value!==undefined)element.textContent=String(value);
  return element;
 };
 const badgeFor=item=>{
  return window.SBExclusiveMemberTags?.makeBadge?.(item)
   ||make('strong','',String(item?.emoji||'🏅')+' '+String(item?.label||'Etiqueta'));
 };
 const validRoute=(id,own)=>{
  if(own)return location.hash.split('?')[0]==='#/cuenta';
  return location.hash.split('?')[0]==='#/perfil' &&
    new URLSearchParams(location.hash.split('?')[1]||'').get('id')===id;
 };
 const viewTag=(item)=>{
  const display=make('div','sb-featured-tag-preview');
  display.append(badgeFor(item));
  return display;
 };
 let ownBusy=false,publicBusy=false,queued=false;
 const publicVisited=new WeakMap();
 let lastPublicAnchor=null;

 async function mountAccount(){
  if(location.hash.split('?')[0]!=='#/cuenta')return;
  const root=document.getElementById('account-profile');
  if(!root?.querySelector('.profile-grid')||root.querySelector('#sb-featured-tags-editor')||ownBusy)return;
  ownBusy=true;
  try{
   const {data,error}=await sb.auth.getSession();
   const id=data?.session?.user?.id;
   if(error||!UUID.test(id||'')||!root.isConnected||!validRoute(id,true))return;
   if(root.querySelector('#sb-featured-tags-editor'))return;
   const section=make('section','profile-panel sb-featured-editor');
   section.id='sb-featured-tags-editor';
   section.append(
    make('h3','','🏆 Mi vitrina de etiquetas favoritas'),
    make('p','sb-featured-intro',
     'Destaca hasta 3 etiquetas que hayas conseguido. Cambia su orden y guárdalas para que aparezcan en tu perfil público con sus efectos anime.')
   );
   const status=make('p','sb-featured-status','Cargando tus etiquetas…');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const count=make('strong','sb-featured-count','0 de 3 destacadas');
   const previewTitle=make('h4','','✨ Vista previa en mi perfil');
   const preview=make('div','sb-featured-preview');
   const orderTitle=make('h4','','↕️ Orden de mis favoritas');
   const ordered=make('div','sb-featured-ordered');
   const availableTitle=make('h4','','🏷️ Mis etiquetas disponibles');
   const availableList=make('div','sb-featured-available');
   const actions=make('div','sb-featured-actions');
   const save=make('button','gradient-btn mini','💾 Guardar vitrina');
   save.type='button';save.disabled=true;
   const clear=make('button','outline-btn mini','Quitar todas');
   clear.type='button';
   const refresh=make('button','outline-btn mini','↻ Actualizar etiquetas');
   refresh.type='button';
   const viewPublic=make('a','outline-btn mini','👁️ Ver mi perfil público');
   viewPublic.href='#/perfil?id='+encodeURIComponent(id);
   actions.append(save,clear,refresh,viewPublic);
   section.append(status,count,previewTitle,preview,orderTitle,ordered,
    availableTitle,availableList,actions,
    make('small','sb-featured-note',
     'Las etiquetas retiradas o que ya no cumplas se ocultarán automáticamente. La vitrina es decorativa y no cambia permisos.'));
   const history=root.querySelector('#sb-member-tag-history');
   const progress=root.querySelector('#sb-auto-member-tag-progress');
   const grid=root.querySelector('.profile-grid');
   if(history)history.after(section);
   else if(progress)progress.after(section);
   else grid.before(section);
   if(!section.isConnected)return;

   let available=[],selected=[],dirty=false,loading=false;
   const mapTags=()=>new Map(available.map(tag=>[tag.tag_id,tag]));
   const statusText=(value,err=false)=>{
    status.textContent=value;status.dataset.error=err?'true':'false';
   };
   const change=()=>{
    dirty=true;draw();
    statusText('Cambios sin guardar: pulsa «Guardar vitrina» para publicarlos.');
   };
   const addControl=(container,label,click,disabled,style='outline-btn mini')=>{
    const btn=make('button',style,label);btn.type='button';btn.disabled=!!disabled;
    btn.addEventListener('click',click);container.append(btn);return btn;
   };
   function draw(){
    const map=mapTags();
    selected=selected.filter(id=>map.has(id)).slice(0,3);
    count.textContent=selected.length+' de 3 destacadas';
    preview.replaceChildren();
    ordered.replaceChildren();
    availableList.replaceChildren();
    for(const id of selected){
     const tag=map.get(id);
     if(tag)preview.append(viewTag(tag));
    }
    if(!selected.length)preview.append(make('p','sb-featured-empty',
     'Todavía no has destacado ninguna etiqueta. Elige una de las disponibles.'));
    for(let i=0;i<selected.length;i++){
     const tag=map.get(selected[i]);
     if(!tag)continue;
     const row=make('div','sb-featured-selected-row');
     const label=make('div','sb-featured-selected-label');
     label.append(make('span','sb-featured-order-num',String(i+1)),badgeFor(tag));
     const buttons=make('div','sb-featured-row-actions');
     addControl(buttons,'↑',()=>{
      [selected[i-1],selected[i]]=[selected[i],selected[i-1]];change();
     },i===0).setAttribute('aria-label','Subir '+tag.label);
     addControl(buttons,'↓',()=>{
      [selected[i],selected[i+1]]=[selected[i+1],selected[i]];change();
     },i===selected.length-1).setAttribute('aria-label','Bajar '+tag.label);
     addControl(buttons,'✕ Quitar',()=>{selected.splice(i,1);change()},false)
      .setAttribute('aria-label','Quitar '+tag.label+' de la vitrina');
     row.append(label,buttons);ordered.append(row);
    }
    if(!selected.length)ordered.append(make('p','sb-featured-empty',
     'Añade etiquetas para elegir su posición.'));
    for(const tag of available){
     const chosen=selected.includes(tag.tag_id);
     const card=make('div','sb-featured-available-item');
     const info=make('div','sb-featured-available-info');
     info.append(badgeFor(tag),make('small','',
      tag.source==='automatic'?'🏆 Ganada por logros':'🏅 Otorgada por administración'));
     const button=addControl(card,chosen?'✓ Destacada':'➕ Destacar',()=>{
      if(selected.length>=3||selected.includes(tag.tag_id))return;
      selected.push(tag.tag_id);change();
     },chosen||selected.length>=3,
     chosen?'outline-btn mini':'gradient-btn mini');
     button.setAttribute('aria-label',(chosen?'Etiqueta destacada: ':'Destacar etiqueta ')+tag.label);
     card.prepend(info);
     availableList.append(card);
    }
    if(!available.length)availableList.append(make('p','sb-featured-empty',
     'Todavía no tienes etiquetas exclusivas disponibles. Consigue XP, completa retos o recibe una etiqueta del equipo.'));
    save.disabled=loading||!dirty;
    clear.disabled=loading||!selected.length;
   }
   async function load(){
    if(loading)return;
    loading=true;save.disabled=true;clear.disabled=true;refresh.disabled=true;
    statusText('Consultando tus etiquetas verificadas…');
    try{
     const [eligible,featured]=await Promise.all([
      sb.rpc('sb_get_my_eligible_featured_tags'),
      sb.rpc('sb_get_member_featured_tags',{p_user:id})
     ]);
     if(eligible.error||featured.error)throw eligible.error||featured.error;
     if(!section.isConnected||!validRoute(id,true))return;
     available=eligible.data||[];
     const known=new Set(available.map(t=>t.tag_id));
     selected=(featured.data||[])
      .sort((a,b)=>a.slot-b.slot).map(tag=>tag.tag_id).filter(tagId=>known.has(tagId))
      .slice(0,3);
     dirty=false;
     draw();
     statusText(available.length?'Elige tus favoritas y pulsa «Guardar vitrina».':
      'Aún no tienes etiquetas para destacar.');
    }catch(error){
     if(section.isConnected)statusText('No se pudieron cargar tus etiquetas: '+(error.message||'Error de conexión'),true);
    }finally{loading=false;refresh.disabled=false;draw()}
   }
   save.addEventListener('click',async()=>{
    if(loading||!dirty)return;
    loading=true;save.disabled=true;refresh.disabled=true;clear.disabled=true;
    statusText('Guardando la vitrina…');
    try{
     const {error}=await sb.rpc('sb_set_my_featured_tags',{p_tag_ids:selected});
     if(error)throw error;
     dirty=false;
     window.dispatchEvent(new CustomEvent('sb-featured-tags-saved',{detail:{userId:id}}));
     statusText('✅ Vitrina guardada. Ya se puede ver en tu perfil público.');
     statusText('✅ Vitrina guardada. Tus favoritas se muestran en tu perfil público.');
    }catch(error){statusText('No se pudo guardar: '+(error.message||'Error inesperado'),true)}
    finally{loading=false;refresh.disabled=false;draw()}
   });
   clear.addEventListener('click',()=>{selected=[];change()});
   refresh.addEventListener('click',()=>{if(dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;void load()});
   void load();
  }catch(error){console.warn('No se pudo montar la vitrina de etiquetas',error);}
  finally{ownBusy=false;}
 }

 async function mountPublic(){
  if(location.hash.split('?')[0]!=='#/perfil')return;
  const userId=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
  const anchor=document.querySelector('#public-member-profile .public-member-body');
  if(!anchor||!UUID.test(userId||'')||publicBusy)return;
  const prior=anchor.querySelector('#sb-featured-tags-public');
  if(publicVisited.get(anchor)===userId && !prior)return;
  if(prior){
   if(prior.dataset.userId===userId)return;
   prior.remove();
  }
  publicBusy=true;
  try{
   const {data,error}=await sb.rpc('sb_get_member_featured_tags',{p_user:userId});
   if(error)throw error;
   if(!anchor.isConnected||!validRoute(userId,false))return;
   publicVisited.set(anchor,userId);lastPublicAnchor=anchor;
   if(!data?.length)return;
   if(anchor.querySelector('#sb-featured-tags-public'))return;
   const panel=make('section','sb-featured-public');
   panel.id='sb-featured-tags-public';panel.dataset.userId=userId;
   panel.setAttribute('aria-label','Vitrina de etiquetas favoritas del miembro');
   panel.append(make('h3','','🏆 Vitrina de etiquetas favoritas'));
   const badges=make('div','sb-featured-public-list');
   for(const item of data.slice(0,3))badges.append(viewTag(item));
   panel.append(badges,make('small','',
    'Etiquetas destacadas por este miembro · No conceden permisos especiales.'));
   const old=anchor.querySelector('.sb-exclusive-profile-tags');
   const heading=anchor.querySelector(':scope > h1');
   if(old)old.after(panel);
   else if(heading)heading.after(panel);
   else anchor.prepend(panel);
  }catch(error){console.warn('No se pudo cargar la vitrina pública',error)}
  finally{publicBusy=false;}
 }
 function schedule(){
  if(queued)return;queued=true;
  queueMicrotask(()=>{
   queued=false;void mountAccount();void mountPublic();
  });
 }
 const app=document.getElementById('app');
 if(app){
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{
   if(lastPublicAnchor)publicVisited.delete(lastPublicAnchor);
   schedule();
  });
  schedule();
 }
})();