/* 👑 Etiqueta principal: una de las 3 favoritas, validada por Supabase.
   Se muestra junto al autor en perfiles, muro y comentarios. */
(() => {
 'use strict';
 if(typeof sb==='undefined')return;
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const TTL=50000;
 const cache=new Map();
 let scheduled=false,scanning=false,editorBusy=false;
 let ownId='';
 const make=(tag,cls='',text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const previewTag=badge=>{
  const element=window.SBExclusiveMemberTags?.makeBadge?.({...badge,source:badge.source||'automatic'})
   ||make('span','sb-exclusive-tag',(badge.emoji||'👑')+' '+(badge.label||'Etiqueta'));
  element.classList.add('sb-primary-badge');
  element.title='👑 Etiqueta principal: '+badge.label+' · Distintivo decorativo, sin permisos';
  return element;
 };
 const getHashUser=()=>{
  if(location.hash.split('?')[0]!=='#/perfil')return null;
  const value=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
  return UUID.test(value||'')?value:null;
 };
 const authorId=anchor=>{
  const href=anchor.getAttribute('href')||'';
  if(!href.startsWith('#/perfil?id='))return null;
  const id=new URLSearchParams(href.split('?')[1]||'').get('id');
  return UUID.test(id||'')?id:null;
 };
 const permittedColors=new Set(['purple','blue','pink','green','orange','gold','slate']);
 const permittedAnimations=new Set(['none','shine','neon','pulse','float','sparkle']);
 const permittedNameEffects=new Set(['classic','none','fire','lightning','stars','hearts','legendary']);
 // Envuelve únicamente el texto del nombre, conservando su enlace y nombre accesible.
 const updateNameAura=(node,badge)=>{
  let aura=node.querySelector(':scope > .sb-primary-name-aura');
  if(!badge){
   if(aura)aura.replaceWith(...Array.from(aura.childNodes));
   node.classList.remove('sb-primary-name-active');
   return;
  }
  if(!aura){
   const nameNode=Array.from(node.childNodes).find(child=>
    child.nodeType===3 && child.textContent.trim()
   );
   if(nameNode){
    aura=make('span','sb-primary-name-aura');
    nameNode.before(aura);
    aura.append(nameNode);
   }
  }
  if(!aura)return;
  aura.dataset.color=permittedColors.has(badge.color)?badge.color:'purple';
  aura.dataset.animation=permittedAnimations.has(badge.animation)?badge.animation:'none';
  aura.dataset.effect=permittedNameEffects.has(badge.nameEffect)?badge.nameEffect:'classic';
  node.classList.add('sb-primary-name-active');
 };
 const renderOne=(node,badge)=>{
  if(!node.isConnected)return;
  const prior=node.querySelector(':scope > .sb-primary-tag-inline');
  if(!badge){prior?.remove();updateNameAura(node,null);return;}
  updateNameAura(node,badge);
  if(prior?.dataset.tagId===badge.tag_id)return;
  prior?.remove();
  const wrapper=make('span','sb-primary-tag-inline');
  wrapper.dataset.tagId=badge.tag_id;
  wrapper.setAttribute('aria-label','Etiqueta principal: '+badge.label);
  wrapper.append(previewTag(badge));
  node.append(wrapper);
 };
 const candidateNodes=()=>{
  const items=[];
  const publicId=getHashUser();
  if(publicId){
   const title=document.querySelector('#public-member-profile .public-member-body > h1');
   if(title)items.push([title,publicId]);
  }
  if(location.hash.split('?')[0]==='#/cuenta' && UUID.test(ownId)){
   const title=document.querySelector('#account-profile .profile-identity-copy h2');
   if(title)items.push([title,ownId]);
  }
  const anchors=document.querySelectorAll(
   '.feed-author[href^="#/perfil?id="],'+
   '.social-comment > a[href^="#/perfil?id="],'+
   '.member-gallery-comment > a[href^="#/perfil?id="]'
  );
  for(const a of anchors){
   const id=authorId(a);
   if(id)items.push([a,id]);
  }
  return items;
 };
 async function updateNames(){
  if(scanning)return;
  scanning=true;
  try{
   const items=candidateNodes();
   if(!items.length)return;
   const now=Date.now(),needed=new Set();
   for(const [node,id] of items){
    const cached=cache.get(id);
    if(cached&&now-cached.at<TTL)renderOne(node,cached.badge);
    else needed.add(id);
   }
   if(!needed.size)return;
   const ids=[...needed].slice(0,100);
   const [primaryResult,effectsResult]=await Promise.all([
    sb.rpc('sb_get_member_primary_featured_tags',{p_members:ids}),
    sb.from('sb_member_name_effects').select('user_id,effect').in('user_id',ids)
   ]);
   if(primaryResult.error)throw primaryResult.error;
   if(effectsResult.error)console.warn('Preferencias de efectos de nombre:',effectsResult.error.message);
   const effects=new Map((effectsResult.data||[]).map(x=>[x.user_id,x.effect]));
   const found=new Map((primaryResult.data||[]).map(x=>[x.member_id,{
    ...x,nameEffect:effects.get(x.member_id)||'classic'
   }]));
   for(const id of ids)cache.set(id,{badge:found.get(id)||null,at:Date.now()});
   for(const [node,id] of candidateNodes()){
    if(!ids.includes(id))continue;
    renderOne(node,found.get(id)||null);
   }
  }catch(error){console.warn('Etiquetas principales junto a nombres:',error?.message||error)}
  finally{scanning=false;}
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  setTimeout(()=>{
   scheduled=false;
   void mountEditor();
   void updateNames();
  },90);
 }
 async function identifyOwnUser(){
  try{
   const {data}=await sb.auth.getSession();
   const id=data?.session?.user?.id||'';
   if(id!==ownId){ownId=id;cache.clear();}
  }catch(_){}
  schedule();
 }

 async function mountEditor(){
  if(location.hash.split('?')[0]!=='#/cuenta'||editorBusy)return;
  const editor=document.getElementById('sb-featured-tags-editor');
  if(!editor||editor.querySelector('#sb-primary-tag-picker'))return;
  editorBusy=true;
  try{
   const {data}=await sb.auth.getSession();
   const id=data?.session?.user?.id;
   if(!UUID.test(id||'')||!editor.isConnected)return;
   ownId=id;
   const picker=make('section','sb-primary-tag-picker');
   picker.id='sb-primary-tag-picker';
   picker.append(make('h4','','👑 Mi etiqueta principal'),
    make('p','sb-primary-explainer',
     'Elige una de las etiquetas que ya guardaste entre tus tres favoritas. Se verá junto a tu nombre en el perfil, las publicaciones y los comentarios.'));
   const status=make('p','sb-primary-status','Cargando favoritas guardadas…');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const list=make('div','sb-primary-options');
   const actions=make('div','sb-primary-actions');
   const none=make('button','outline-btn mini','Quitar etiqueta principal');
   none.type='button';
   const refresh=make('button','outline-btn mini','↻ Actualizar');
   refresh.type='button';
   actions.append(none,refresh);
   picker.append(status,list,actions);
   editor.querySelector('.sb-featured-actions')?.before(picker);
   if(!picker.isConnected)editor.append(picker);
   let currentId=null,loading=false;
   const say=(message,isError=false)=>{
    status.textContent=message;status.dataset.error=String(isError);
   };
   async function load(){
    if(loading||!picker.isConnected)return;
    loading=true;refresh.disabled=true;none.disabled=true;
    say('Consultando tu vitrina guardada…');
    try{
     const [featured,primary]=await Promise.all([
      sb.rpc('sb_get_member_featured_tags',{p_user:id}),
      sb.rpc('sb_get_member_primary_featured_tags',{p_members:[id]})
     ]);
     if(featured.error||primary.error)throw featured.error||primary.error;
     if(!picker.isConnected||location.hash.split('?')[0]!=='#/cuenta')return;
     const options=(featured.data||[]).sort((a,b)=>a.slot-b.slot);
     currentId=primary.data?.[0]?.tag_id||null;
     list.replaceChildren();
     for(const tag of options){
      const card=make('div','sb-primary-option'+(currentId===tag.tag_id?' is-active':''));
      const label=make('div','sb-primary-option-label');
      label.append(previewTag(tag));
      const pick=make('button',currentId===tag.tag_id?'outline-btn mini':'gradient-btn mini',
       currentId===tag.tag_id?'👑 Principal':'👑 Elegir como principal');
      pick.type='button';pick.disabled=currentId===tag.tag_id;
      pick.addEventListener('click',()=>void setPrimary(tag.tag_id));
      card.append(label,pick);list.append(card);
     }
     if(!options.length){
      list.append(make('p','sb-primary-none',
       'Primero destaca hasta tres etiquetas en tu vitrina y pulsa «💾 Guardar vitrina».'));
     }
     none.disabled=!currentId;
     say(currentId?'✅ Tu etiqueta principal está activa.':'Todavía no has elegido una etiqueta principal.');
    }catch(error){
     if(picker.isConnected)say('No se pudieron cargar las etiquetas: '+(error?.message||'Error'),true);
    }finally{loading=false;refresh.disabled=false;}
   }
   async function setPrimary(tagId){
    if(loading)return;
    loading=true;none.disabled=true;refresh.disabled=true;
    [...list.querySelectorAll('button')].forEach(button=>button.disabled=true);
    say('Guardando etiqueta principal…');
    try{
     const {error}=await sb.rpc('sb_set_my_primary_featured_tag',{p_tag_id:tagId});
     if(error)throw error;
     cache.delete(id);
     window.dispatchEvent(new CustomEvent('sb-primary-tag-changed',{detail:{userId:id}}));
     loading=false;
     await load();
     say(tagId?'✅ Etiqueta principal actualizada.':'✅ Etiqueta principal retirada.');
    }catch(error){
     say('No se pudo guardar: '+(error?.message||'Error de conexión'),true);
    }finally{
     loading=false;refresh.disabled=false;
     [...list.querySelectorAll('button')].forEach(button=>{
      button.disabled=button.textContent==='👑 Principal';
     });
     none.disabled=!currentId;
    }
   }
   none.addEventListener('click',()=>void setPrimary(null));
   refresh.addEventListener('click',()=>void load());
   const handler=()=>{if(picker.isConnected)void load();else window.removeEventListener('sb-featured-tags-saved',handler)};
   window.addEventListener('sb-featured-tags-saved',handler);
   void load();
  }catch(error){console.warn('Selector de etiqueta principal:',error?.message||error)}
  finally{editorBusy=false;}
 }
 const app=document.getElementById('app');
 if(!app)return;
 new MutationObserver(schedule).observe(app,{subtree:true,childList:true});
 window.addEventListener('hashchange',()=>{void identifyOwnUser();cache.clear();schedule()});
 window.addEventListener('focus',()=>{cache.clear();void identifyOwnUser()});
 window.addEventListener('sb-name-effect-changed',event=>{
  const id=event.detail?.userId;
  if(id)cache.delete(id);else cache.clear();
  schedule();
 });
 window.addEventListener('sb-featured-tags-saved',event=>{
  const id=event.detail?.userId;
  if(id)cache.delete(id);else cache.clear();
  schedule();
 });
 window.addEventListener('sb-primary-tag-changed',event=>{
  const id=event.detail?.userId;
  if(id)cache.delete(id);else cache.clear();
  schedule();
 });
 sb.auth.onAuthStateChange(()=>setTimeout(()=>{void identifyOwnUser()},0));
 void identifyOwnUser();
})();