/* Celebración anime de etiquetas desbloqueadas, consumida una sola vez por cuenta.
   Supabase verifica el logro y reclama la celebración de forma atómica. */
(() => {
 'use strict';
 if (typeof sb === 'undefined') return;
 let currentUser = null, channel = null, checking = false, showing = false;
 let syncBusy = false;
 const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = String(text);
  return node;
 };
 const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const isValidUuid = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

 function celebrate(rows, preview = false) {
  if (!rows?.length) return;
  showing = true;
  const previousFocus = document.activeElement;
  const dialog = make('dialog','sb-auto-tag-celebration');
  dialog.setAttribute('aria-label','¡Etiqueta exclusiva desbloqueada!');
  const panel = make('div','sb-auto-tag-celebration-panel');
  const hero = make('div','sb-auto-tag-celebration-hero','🎊 🏆 ✨');
  hero.setAttribute('aria-hidden','true');
  const title = make('h2','',preview?'✨ Vista previa de celebración':rows.length===1?'¡Nueva etiqueta desbloqueada!':'¡Nuevas etiquetas desbloqueadas!');
  const description = make('p','',preview
   ?'Esta es una demostración visual. No has recibido una etiqueta ni una notificación real.'
   :'¡Enhorabuena! Tu actividad, tus retos y tus logros te han hecho ganar '+(rows.length===1?'este distintivo exclusivo.':'estos distintivos exclusivos.'));
  const rewards = make('div','sb-auto-tag-celebration-rewards');
  for(const row of rows){
   const item = make('div','sb-auto-tag-celebration-reward');
   const badge = window.SBExclusiveMemberTags?.makeBadge?.({...row,source:'automatic'})
    || make('strong','',String(row.emoji||'🏆')+' '+String(row.label||'Etiqueta especial'));
   item.append(badge);
   rewards.append(item);
  }
  const hint = make('small','',preview?'Demostración: no modifica tus puntos, etiquetas ni permisos.':'Ya aparecen en tus perfiles y chats. El premio es visual y no cambia tus permisos.');
  const actions = make('div','sb-auto-tag-celebration-actions');
  const link = make('a','gradient-btn mini','🏅 Ver mis etiquetas');
  link.href = '#/cuenta?focus=unlock-tags';
  const close = make('button','outline-btn mini','Continuar');
  close.type='button';
  actions.append(link,close);
  panel.append(hero,title,description,rewards,hint,actions);
  if(!reducedMotion()){
   const stars = make('div','sb-auto-tag-celebration-particles');
   stars.setAttribute('aria-hidden','true');
   for(let i=0;i<22;i++){
    const star = make('span','',i%4===0?'✦':i%4===1?'❖':i%4===2?'✧':'★');
    star.style.left=(5+(i*41)%90)+'%';
    star.style.animationDelay=(-i*.2)+'s';
    star.style.animationDuration=(2.2+(i%5)*.32)+'s';
    stars.append(star);
   }
   panel.prepend(stars);
  }
  dialog.append(panel);
  document.body.append(dialog);
  const finish = () => {
   dialog.remove();
   showing=false;
   if(previousFocus?.isConnected && typeof previousFocus.focus==='function')previousFocus.focus();
   if(!preview)queueMicrotask(() => {void takePending();});
  };
  if(typeof dialog.showModal==='function'){
   dialog.addEventListener('close',finish,{once:true});
   close.addEventListener('click',()=>dialog.close());
   link.addEventListener('click',()=>dialog.close());
   try{dialog.showModal();}catch(error){console.warn('No se pudo abrir la celebración',error);finish();}
  } else {
   dialog.classList.add('sb-auto-tag-celebration-fallback');
   dialog.setAttribute('role','dialog');
   dialog.setAttribute('aria-modal','true');
   close.addEventListener('click',finish,{once:true});
   link.addEventListener('click',finish,{once:true});
  }
  close.focus();
 }

 async function takePending(){
  if(!currentUser||checking||showing||document.visibilityState==='hidden')return;
  checking=true;
  try{
   const {data,error}=await sb.rpc('take_my_auto_tag_celebrations');
   if(error)throw error;
   if(data?.length && currentUser)celebrate(data);
  }catch(error){
   console.warn('No se pudo consultar la celebración de etiquetas:',error.message);
  }finally{checking=false;}
 }
 async function refreshSession(){
  if(syncBusy)return;
  syncBusy=true;
  try{
   const {data,error}=await sb.auth.getSession();
   if(error)throw error;
   const id=data?.session?.user?.id;
   if(!isValidUuid(id)){
    if(channel){void sb.removeChannel(channel);channel=null;}
    currentUser=null;return;
   }
   if(id!==currentUser){
    if(channel)void sb.removeChannel(channel);
    currentUser=id;
    channel=sb.channel('sb-exclusive-tag-awards-'+id)
      .on('postgres_changes',{
       event:'INSERT',schema:'public',table:'member_notifications',filter:'recipient_id=eq.'+id
      },payload=>{
       if(payload.new?.kind==='exclusive_tag_unlock')void takePending();
      }).subscribe();
   }
   await takePending();
  }catch(error){console.warn('No se pudo iniciar el monitor de etiquetas:',error.message);}
  finally{syncBusy=false;}
 }
 window.sbPreviewAutoTagCelebration=()=>{
  if(showing)return;
  celebrate([{tag_id:null,label:'Explorador Otaku',emoji:'🌸',color:'green',animation:'sparkle'}],true);
 };
 window.addEventListener('hashchange',()=>{void refreshSession();});
 window.addEventListener('focus',()=>{void refreshSession();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshSession();});
 sb.auth.onAuthStateChange(()=>{setTimeout(()=>{void refreshSession();},0);});
 void refreshSession();
})();