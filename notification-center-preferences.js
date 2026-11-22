/* Preferencias por categoría para avisos emergentes y push.
   Los registros del historial se conservan aunque se desactive una categoría. */
(() => {
 'use strict';
 const fields=[
  ['community','❤️ Comunidad','Publicaciones, comentarios y reacciones'],
  ['followers','👥 Seguidores','Nuevos seguidores'],
  ['tournaments','🏆 Torneos y misiones','Competiciones, inscripciones, comienzos y recordatorios'],
  ['polls','📊 Encuestas','Encuestas nuevas, recordatorios y actividades relacionadas'],
  ['rewards','🎁 Premios y medallas','Premios, regalos, medallas y logros'],
  ['messages','💬 Mensajes','Mensajes privados y de grupo'],
  ['news','📰 Noticias','Noticias publicadas, respuestas y menciones en noticias']
 ];
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const col=k=>'alert_'+k+'_enabled';
 async function mount(root,userId){
  if(!root||!userId||root.querySelector('.sb-notification-category-settings'))return;
  const section=make('details','sb-notification-category-settings');
  const heading=make('summary','','⚙️ Personalizar mis avisos');
  const introduction=make('p','sb-notification-category-help',
   'Elige qué avisos emergentes y notificaciones externas quieres recibir. Las preferencias se guardan en tu cuenta y se aplican en tus dispositivos. Los avisos permanecen en el historial.');
  const form=make('div','sb-notification-category-grid');
  const message=make('p','sb-notification-category-status','Cargando preferencias…');
  message.setAttribute('role','status');
  const controls=[];
  section.append(heading,introduction,form,message);
  const placement=root.querySelector('.notification-center-controls');
  if(placement)placement.after(section);else root.append(section);
  for(const [key,name,description] of fields){
   const row=make('label','sb-notification-category-item');
   const input=make('input');input.type='checkbox';input.disabled=true;
   input.dataset.preference=key;
   const label=make('span','sb-notification-category-copy');
   label.append(make('strong','',name),make('small','',description));
   row.append(input,label);form.append(row);
   controls.push({key,input});
  }
  const allCols=fields.map(([key])=>col(key)).join(',');
  let existing=false;
  const load=async()=>{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||user.id!==userId)throw new Error('Vuelve a iniciar sesión para configurar tus avisos.');
   const {data,error}=await sb.from('member_notification_preferences')
    .select('user_id,'+allCols).eq('user_id',userId).maybeSingle();
   if(error)throw error;
   existing=Boolean(data);
   for(const {key,input} of controls)input.checked=data?.[col(key)]!==false;
  };
  const disabled=value=>{for(const {input} of controls)input.disabled=value};
  try{
   await load();
   if(!section.isConnected)return;
   disabled(false);message.textContent='Preferencias listas. Los cambios se guardan automáticamente.';
  }catch(error){
   if(section.isConnected)message.textContent='No se pudieron cargar las preferencias: '+(error?.message||'Error desconocido');
   return;
  }
  for(const {key,input} of controls){
   input.onchange=async()=>{
    const value=input.checked,field=col(key);
    disabled(true);message.textContent='Guardando tu preferencia…';
    try{
     const {data:{user},error:authError}=await sb.auth.getUser();
     if(authError||!user||user.id!==userId)throw new Error('La sesión ha cambiado.');
     const changes={[field]:value,updated_at:new Date().toISOString()};
     const request=existing
      ?sb.from('member_notification_preferences').update(changes).eq('user_id',userId)
      :sb.from('member_notification_preferences').insert({user_id:userId,...changes});
     const {data,error}=await request.select(field).single();
     if(error)throw error;
     if(data?.[field]!==value)throw new Error('La configuración guardada no coincide.');
     existing=true;
     if(typeof loadToastPreferences==='function')await loadToastPreferences(userId);
     message.textContent=(value?'✅ Avisos activados: ':'🔕 Avisos desactivados: ')+fields.find(item=>item[0]===key)[1]+'.';
    }catch(error){
     input.checked=!value;
     message.textContent='No se pudo guardar: '+(error?.message||'Error desconocido');
    }finally{
     if(section.isConnected)disabled(false);
    }
   };
  }
 }
 window.SBNotificationCenterPreferences={mount};
})();
