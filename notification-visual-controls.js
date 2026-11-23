/* Colores por categoría, efectos accesibles y vista completa de fijadas. */
(() => {
 'use strict';
 const ROOT_ID='sb-notification-visual-controls';
 const COLORS={
  community:'#ad8df3',followers:'#78bde4',tournaments:'#70cbd5',
  polls:'#9ccb8e',rewards:'#f1c477',messages:'#82a6f3',
  news:'#e6a7d6',pinned:'#e7ba70',priority:'#f19d79'
 };
 const OPTIONS=[
  ['community','❤️ Comunidad'],['followers','👥 Seguidores'],
  ['tournaments','🏆 Torneos'],['polls','📊 Encuestas'],
  ['rewards','🎁 Premios y medallas'],['messages','💬 Mensajes'],
  ['news','📰 Noticias'],['pinned','📌 Avisos fijados'],
  ['priority','⭐ Avisos prioritarios']
 ];
 const validHex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
 const validLink=value=>typeof value==='string'&&value.length<350&&/^#\/[a-z0-9/?=&%_-]+$/i.test(value);
 const element=(tag,cls,text)=>{
  const result=document.createElement(tag);
  if(cls)result.className=cls;
  if(text!==undefined)result.textContent=String(text);
  return result;
 };
 function applyTheme(colors,enabled){
  const app=document.getElementById('app');
  if(!app)return;
  for(const [key] of OPTIONS){
   const value=colors?.[key];
   app.style.setProperty('--sb-notify-'+key,validHex(value)?value:COLORS[key]);
  }
  app.classList.toggle('sb-notify-animation-disabled',enabled===false);
 }
 function mount(){
  const center=document.getElementById('member-notifications');
  if(!center||!center.isConnected||typeof sb==='undefined'||!sb.auth
     ||center.querySelector('#'+ROOT_ID))return;

  center.classList.remove('sb-show-only-pinned');
  const section=element('section','sb-visual-controls');
  section.id=ROOT_ID;
  const title=element('h3','','🎨 Personalización y avisos fijados');
  const copy=element('p','sb-visual-help',
   'Elige colores para cada tipo de aviso. Los prioritarios pueden animarse suavemente; puedes desactivar ese efecto.');
  const pinButton=element('button','sb-only-pinned-button','📌 Solo fijadas');
  pinButton.type='button';pinButton.setAttribute('aria-pressed','false');
  pinButton.setAttribute('aria-controls','sb-visual-pinned-list');
  const pinnedView=element('div','sb-visual-pinned-list');
  pinnedView.id='sb-visual-pinned-list';pinnedView.hidden=true;
  const pinnedHeader=element('div','sb-visual-pinned-header');
  const pinnedTitle=element('h4','','📌 Avisos fijados de todo tu historial');
  const reloadPinned=element('button','outline-btn mini','↻ Actualizar fijadas');
  reloadPinned.type='button';
  pinnedHeader.append(pinnedTitle,reloadPinned);
  const pinnedFeedback=element('p','sb-visual-status','');
  pinnedFeedback.setAttribute('role','status');
  const pinnedCards=element('div','sb-visual-pinned-cards');
  pinnedView.append(pinnedHeader,pinnedFeedback,pinnedCards);
  const details=element('details','sb-visual-palette');
  const summary=element('summary','','🎨 Elegir colores y animaciones');
  const palette=element('div','sb-visual-color-grid');
  const status=element('p','sb-visual-status','Cargando colores de tu cuenta…');
  status.setAttribute('role','status');
  const motionLabel=element('label','sb-visual-motion');
  const motionInput=element('input');motionInput.type='checkbox';motionInput.disabled=true;
  const motionCopy=element('span','','✨ Activar animaciones suaves en avisos prioritarios');
  motionLabel.append(motionInput,motionCopy);
  const reset=element('button','outline-btn mini','↺ Restaurar colores originales');
  reset.type='button';reset.disabled=true;
  details.append(summary,palette,motionLabel,reset,status);
  section.append(title,copy,pinButton,pinnedView,details);
  const otherQuick=center.querySelector('#sb-notification-pin-priority-quick');
  if(otherQuick)otherQuick.after(section);
  else {
   const heading=center.querySelector('h2');
   if(heading)heading.after(section);else center.prepend(section);
  }

  const inputs=new Map();
  for(const [key,label] of OPTIONS){
   const row=element('label','sb-visual-color-item');
   const name=element('span','',label);
   const input=element('input');
   input.type='color';input.value=COLORS[key];input.disabled=true;
   input.setAttribute('aria-label','Color de '+label);
   input.dataset.colorKey=key;
   row.append(name,input);palette.append(row);inputs.set(key,input);
  }
  let userId=null;
  let existing=false;
  let colors={...COLORS};
  let motionEnabled=true;
  let savedColors={...COLORS};
  let savedMotion=true;
  let saving=false;
  let pinnedOnly=false;
  let loadVersion=0;

  const disableControls=flag=>{
   for(const input of inputs.values())input.disabled=flag;
   motionInput.disabled=flag;reset.disabled=flag;
  };
  const updateInputs=()=>{
   for(const [key,input] of inputs)input.value=colors[key];
   motionInput.checked=motionEnabled;
   applyTheme(colors,motionEnabled);
  };
  const loadSettings=async()=>{
   const {data:{user},error:authErr}=await sb.auth.getUser();
   if(authErr||!user)throw new Error('Inicia sesión para guardar tus preferencias.');
   userId=user.id;
   const {data,error}=await sb.from('member_notification_preferences')
    .select('user_id,notification_theme_colors,notification_animations_enabled')
    .eq('user_id',user.id).maybeSingle();
   if(error)throw error;
   existing=Boolean(data);
   colors={...COLORS};
   for(const key of Object.keys(COLORS)){
    if(validHex(data?.notification_theme_colors?.[key]))
     colors[key]=data.notification_theme_colors[key].toLowerCase();
   }
   motionEnabled=data?.notification_animations_enabled!==false;
   savedColors={...colors};savedMotion=motionEnabled;updateInputs();
  };
  const save=async()=>{
   if(saving||!userId)return;
   saving=true;disableControls(true);status.textContent='Guardando tus colores…';
   try{
    const {data:{user},error:authErr}=await sb.auth.getUser();
    if(authErr||!user||user.id!==userId)throw new Error('La sesión ha cambiado.');
    const values={notification_theme_colors:{...colors},
     notification_animations_enabled:motionEnabled,updated_at:new Date().toISOString()};
    const query=existing
     ?sb.from('member_notification_preferences').update(values).eq('user_id',user.id)
     :sb.from('member_notification_preferences').insert({user_id:user.id,...values});
    const {data,error}=await query.select('notification_theme_colors,notification_animations_enabled').single();
    if(error)throw error;
    if(!data||Object.keys(COLORS).some(k=>data.notification_theme_colors?.[k]!==colors[k])
       ||data.notification_animations_enabled!==motionEnabled)
      throw new Error('No se pudo verificar la configuración guardada.');
    existing=true;savedColors={...colors};savedMotion=motionEnabled;
    status.textContent='✅ Preferencias guardadas en tu cuenta.';
   }catch(err){
    colors={...savedColors};motionEnabled=savedMotion;updateInputs();
    status.textContent='No se pudo guardar: '+(err?.message||'Error desconocido');
   }finally{saving=false;if(section.isConnected)disableControls(false);}
  };
  for(const [key,input] of inputs){
   input.oninput=()=>{
    if(!validHex(input.value))return;
    colors[key]=input.value.toLowerCase();applyTheme(colors,motionEnabled);
   };
   input.onchange=()=>{if(!saving)void save();};
  }
  motionInput.onchange=()=>{
   motionEnabled=motionInput.checked;applyTheme(colors,motionEnabled);
   void save();
  };
  reset.onclick=()=>{
   colors={...COLORS};updateInputs();void save();
  };

  const loadPinned=async()=>{
   const token=++loadVersion;
   pinnedFeedback.textContent='Buscando avisos fijados…';
   pinnedCards.replaceChildren();
   try{
    const {data:{user},error:authErr}=await sb.auth.getUser();
    if(authErr||!user)throw new Error('Inicia sesión para consultar tus avisos fijados.');
    const {data,error}=await sb.from('member_notification_history')
     .select('source_table,record_id,category,title,href,occurred_at,is_pinned,is_priority')
     .eq('is_pinned',true).order('occurred_at',{ascending:false}).limit(200);
    if(error)throw error;
    if(token!==loadVersion||!section.isConnected||!pinnedOnly)return;
    pinnedFeedback.textContent=data?.length
     ?data.length+' aviso(s) fijado(s) en tu cuenta.'
     :'No tienes avisos fijados. Desactiva «Solo fijadas» y fija uno desde una noticia o notificación.';
    for(const record of data||[]){
     const item=element('article','sb-visual-pinned-card');
     const category=['shop','achievements'].includes(record.category)?'rewards'
      :Object.hasOwn(COLORS,record.category)?record.category:'community';
     item.dataset.sbCategory=category;
     if(record.is_priority)item.classList.add('is-priority');
     const headline=element('strong','',record.title||'Aviso fijado');
     const date=element('small','',record.occurred_at?
      new Date(record.occurred_at).toLocaleString('es-ES'):'');
     const buttons=element('div','sb-visual-pinned-actions');
     if(validLink(record.href)){
      const go=element('a','outline-btn mini','Ver');
      go.href=record.href;buttons.append(go);
     }
     const unpin=element('button','outline-btn mini','📌 Desfijar');
     unpin.type='button';unpin.onclick=async()=>{
      unpin.disabled=true;
      const {data:{user:current},error:authError}=await sb.auth.getUser();
      if(authError||!current){
       pinnedFeedback.textContent='Inicia sesión para modificar tus avisos.';
       unpin.disabled=false;return;
      }
      const {error:saveError}=await sb.from('member_notification_history_actions')
       .update({is_pinned:false,updated_at:new Date().toISOString()})
       .eq('user_id',current.id).eq('source_table',record.source_table)
       .eq('record_id',String(record.record_id));
      if(saveError){
       pinnedFeedback.textContent='No se pudo desfijar: '+saveError.message;
       unpin.disabled=false;return;
      }
      window.dispatchEvent(new CustomEvent('sb-notification-highlights-updated'));
      void loadPinned();
     };
     buttons.append(unpin);item.append(headline,date,buttons);pinnedCards.append(item);
    }
   }catch(err){
    if(token===loadVersion&&section.isConnected)
     pinnedFeedback.textContent='No se pudieron cargar las fijadas: '+(err?.message||'Error desconocido');
   }
  };
  const togglePinned=visible=>{
   pinnedOnly=visible;
   center.classList.toggle('sb-show-only-pinned',visible);
   pinButton.setAttribute('aria-pressed',String(visible));
   pinButton.textContent=visible?'↩️ Ver todas las notificaciones':'📌 Solo fijadas';
   pinnedView.hidden=!visible;
   if(visible)void loadPinned();else loadVersion++;
  };
  pinButton.onclick=()=>togglePinned(!pinnedOnly);
  reloadPinned.onclick=()=>void loadPinned();
  window.addEventListener('sb-notification-highlights-updated',()=>{
   if(section.isConnected&&pinnedOnly)void loadPinned();
  });
  void loadSettings().then(()=>{
   if(!section.isConnected)return;
   disableControls(false);
   status.textContent='Elige un color o cambia las animaciones; se guarda automáticamente.';
  }).catch(err=>{
   if(section.isConnected)status.textContent='No se pudieron cargar los colores: '+(err?.message||'Error');
  });
 }
 function start(){
  const app=document.getElementById('app');
  if(!app)return;
  const observer=new MutationObserver(mount);
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
