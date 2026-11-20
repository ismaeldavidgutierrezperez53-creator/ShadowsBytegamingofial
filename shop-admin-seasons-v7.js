/* Shadows Byte Gaming Official V2 · Gestor de temporadas V7.
   Solo el administrador autorizado por Supabase puede guardar o activar eventos. */
(function(){
 if(typeof adminInitRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=adminInitRewardShop;
 const el=(tag,cls,value)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(value!==undefined)x.textContent=String(value);
  return x;
 };
 const field=(label,input)=>{
  const node=el('label','shop-season-admin-v7-field');
  node.append(el('span','',label),input);return node;
 };
 const options=(select,items)=>{
  select.replaceChildren();
  for(const [value,label] of items){
   const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);
  }
 };
 const toLocal=iso=>{
  if(!iso)return '';
  const d=new Date(iso);
  return Number.isFinite(d.getTime())?new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
 };
 const fromLocal=value=>value?new Date(value).toISOString():null;
 const niceDate=iso=>iso?new Date(iso).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Por definir';
 const setStatus=(node,message,error=false)=>{
  node.textContent=message;node.dataset.status=error?'error':'success';
 };
 const addInput=(type,placeholder='',required=false)=>{
  const input=document.createElement('input');input.type=type;input.placeholder=placeholder;input.required=required;return input;
 };
 const initSeasonAdmin=async()=>{
  const host=document.querySelector('#admin-shop-root .sb-shop-admin');
  if(!host||host.querySelector('.shop-season-admin-v7'))return;
  const [seasonResult,itemsResult]=await Promise.all([
   sb.rpc('admin_list_shop_season_events'),sb.rpc('admin_shop_items')
  ]);
  if(!host.isConnected)return;
  const panel=el('section','sb-shop-admin__section shop-season-admin-v7');
  const heading=el('div','sb-shop-admin__section-heading');
  const header=el('div','');
  header.append(el('h3','','🎉 Eventos de temporada — Administración'),
   el('p','','Programa Navidad, Halloween, aniversarios y eventos personalizados. Crea misiones, asigna premios exclusivos y activa el evento cuando esté preparado.'));
  heading.append(header);panel.append(heading);
  if(seasonResult.error||itemsResult.error){
   panel.append(el('p','shop-season-admin-v7-error',
    'No se pudo cargar el gestor: '+(seasonResult.error?.message||itemsResult.error?.message)));
   host.append(panel);return;
  }
  const events=[...(seasonResult.data||[])];
  const prizes=(itemsResult.data||[]).filter(x=>x.active===false&&['badge','title'].includes(x.category));
  const seasonNames={christmas:'🎄 Navidad',halloween:'🎃 Halloween',anniversary:'🎉 Aniversario',custom:'✨ Evento especial'};
  const eventCard=el('div','shop-season-admin-v7-editor');
  eventCard.append(el('h4','','📆 Programar evento'));
  const eventForm=document.createElement('form');eventForm.className='shop-season-admin-v7-form';
  const eventChoice=document.createElement('select');
  const eventId=addInput('text','evento_nuevo',true);eventId.pattern='[a-z0-9_-]{4,60}';
  const eventSeason=document.createElement('select');
  options(eventSeason,Object.entries(seasonNames));
  const eventTitle=addInput('text','Festival Anime',true);eventTitle.minLength=3;eventTitle.maxLength=100;
  const eventEmoji=addInput('text','🎉',true);eventEmoji.value='🎉';eventEmoji.maxLength=12;
  const description=document.createElement('textarea');description.rows=2;description.maxLength=600;
  description.placeholder='Descripción que verán los miembros…';
  const start=addInput('datetime-local');const end=addInput('datetime-local');
  const activeLabel=el('label','shop-season-admin-v7-toggle');
  const active=addInput('checkbox');activeLabel.append(active,el('span','','Publicado / visible en el calendario'));
  const eventButtons=el('div','shop-season-admin-v7-buttons');
  const eventSave=el('button','gradient-btn','💾 Guardar evento');eventSave.type='submit';
  const eventNew=el('button','outline-btn','＋ Nuevo evento');eventNew.type='button';
  eventButtons.append(eventSave,eventNew);
  const eventStatus=el('p','shop-season-admin-v7-status');eventStatus.setAttribute('role','status');
  eventForm.append(
   field('Seleccionar evento',eventChoice),field('ID único',eventId),
   field('Temporada',eventSeason),field('Nombre',eventTitle),
   field('Icono / emoji',eventEmoji),field('Descripción',description),
   field('Inicio (hora local)',start),field('Fin (hora local)',end),
   activeLabel,eventButtons,eventStatus
  );eventCard.append(eventForm);panel.append(eventCard);
  const missionCard=el('div','shop-season-admin-v7-editor');
  missionCard.append(el('h4','','🎯 Misiones y premios del evento'),
   el('p','shop-season-admin-v7-help','Elige el evento, después crea una misión o edita una existente. Para premios limitados, selecciona una insignia o título exclusivo de la tienda. Los puntos van de 0 a 150 por misión.'));
  const missionForm=document.createElement('form');missionForm.className='shop-season-admin-v7-form';
  const missionEvent=document.createElement('select');
  const missionChoice=document.createElement('select');
  const missionKey=addInput('text','mision_nueva',true);missionKey.pattern='[a-z0-9_-]{3,50}';
  const missionTitle=addInput('text','Misión del festival',true);
  missionTitle.minLength=3;missionTitle.maxLength=100;
  const missionDescription=document.createElement('textarea');
  missionDescription.rows=2;missionDescription.maxLength=400;
  const metric=document.createElement('select');
  options(metric,[['bonus_days','☀️ Días con bono diario'],['purchases','🛒 Compras con puntos'],['gifts','🎁 Regalos enviados']]);
  const goal=addInput('number','Objetivo',true);goal.min='1';goal.max='30';goal.step='1';goal.value='1';
  const points=addInput('number','Puntos',true);points.min='0';points.max='150';points.step='1';points.value='20';
  const exclusive=document.createElement('select');
  options(exclusive,[['','Sin premio exclusivo'],...prizes.map(p=>[p.id,
   (p.category==='badge'?'🏅':'✨')+' '+p.name+' · '+p.id])]);
  const missionButtons=el('div','shop-season-admin-v7-buttons');
  const missionSave=el('button','gradient-btn','💾 Guardar misión');missionSave.type='submit';
  const missionNew=el('button','outline-btn','＋ Nueva misión');missionNew.type='button';
  missionButtons.append(missionSave,missionNew);
  const missionStatus=el('p','shop-season-admin-v7-status');missionStatus.setAttribute('role','status');
  missionForm.append(
   field('Evento',missionEvent),field('Misión existente',missionChoice),
   field('ID único de misión',missionKey),field('Nombre de misión',missionTitle),
   field('Descripción',missionDescription),field('Tipo de objetivo',metric),
   field('Cantidad requerida',goal),field('Puntos de recompensa',points),
   field('Insignia o título exclusivo',exclusive),missionButtons,missionStatus
  );missionCard.append(missionForm);panel.append(missionCard);
  const eventList=el('div','shop-season-admin-v7-event-list');panel.append(eventList);
  host.append(panel);
  const getEvent=key=>events.find(ev=>ev.event_id===key);
  const selectedMission=()=>getEvent(missionEvent.value)?.missions?.find(m=>m.key===missionChoice.value);
  const redrawEventList=()=>{
   eventList.replaceChildren();
   eventList.append(el('h4','','📋 Calendario de eventos configurados'));
   if(!events.length){eventList.append(el('p','','Todavía no se han creado eventos.'));return}
   for(const event of events){
    const row=el('article','shop-season-admin-v7-event-row');
    const texts=el('div','');
    texts.append(el('strong','',(event.event_emoji||'✨')+' '+event.event_title),
     el('span','',event.active?'● Publicado':'◷ Borrador / oculto'),
     el('small','',niceDate(event.starts_at)+' — '+niceDate(event.ends_at)),
     el('small','',((event.missions||[]).length)+' misiones · '+Number(event.claim_count||0)+' premios reclamados'));
    const edit=el('button','outline-btn mini','Editar');
    edit.type='button';edit.onclick=()=>{
     eventChoice.value=event.event_id;loadEvent();panel.scrollIntoView({block:'start',behavior:'smooth'});
    };
    row.append(texts,edit);eventList.append(row);
   }
  };
  const refreshEventDropdowns=(preserveId='')=>{
   options(eventChoice,[['','＋ Crear evento nuevo'],...events.map(e=>[e.event_id,e.event_title])]);
   options(missionEvent,[['','Selecciona un evento…'],...events.map(e=>[e.event_id,e.event_title])]);
   if(preserveId){eventChoice.value=preserveId;missionEvent.value=preserveId}
  };
  const clearEvent=()=>{
   eventChoice.value='';eventId.value='';eventId.readOnly=false;
   eventSeason.value='custom';eventTitle.value='';eventEmoji.value='🎉';
   description.value='';start.value='';end.value='';active.checked=false;
   eventStatus.textContent='';eventStatus.removeAttribute('data-status');
  };
  const loadEvent=()=>{
   const e=getEvent(eventChoice.value);
   if(!e){clearEvent();return}
   eventId.value=e.event_id;eventId.readOnly=true;
   eventSeason.value=e.season;eventTitle.value=e.event_title;
   eventEmoji.value=e.event_emoji;description.value=e.event_description||'';
   start.value=toLocal(e.starts_at);end.value=toLocal(e.ends_at);
   active.checked=!!e.active;
   eventStatus.textContent='Editando: '+e.event_title;eventStatus.removeAttribute('data-status');
   missionEvent.value=e.event_id;reloadMissionDropdown();
  };
  const clearMission=()=>{
   missionChoice.value='';missionKey.readOnly=false;
   missionKey.value='';missionTitle.value='';missionDescription.value='';
   metric.value='bonus_days';goal.value='1';points.value='20';exclusive.value='';
   missionStatus.textContent='';missionStatus.removeAttribute('data-status');
  };
  const reloadMissionDropdown=(selectKey='')=>{
   const e=getEvent(missionEvent.value);
   options(missionChoice,[['','＋ Crear misión nueva'],...(e?.missions||[]).map(m=>[m.key,m.title])]);
   if(selectKey)missionChoice.value=selectKey;
   loadMission();
  };
  const loadMission=()=>{
   const m=selectedMission();
   if(!m){clearMission();return}
   missionKey.value=m.key;missionKey.readOnly=true;
   missionTitle.value=m.title;missionDescription.value=m.description||'';
   metric.value=m.metric;goal.value=String(m.goal);points.value=String(m.points);
   exclusive.value=m.item_id||'';
   missionStatus.textContent='Editando: '+m.title;missionStatus.removeAttribute('data-status');
  };
  const reload=async(eventIdSelected='',missionKeySelected='')=>{
   const {data,error}=await sb.rpc('admin_list_shop_season_events');
   if(error)throw new Error(error.message);
   events.splice(0,events.length,...(data||[]));refreshEventDropdowns(eventIdSelected);
   if(eventIdSelected){loadEvent();reloadMissionDropdown(missionKeySelected)}
   redrawEventList();
  };
  eventChoice.onchange=loadEvent;eventNew.onclick=()=>{clearEvent();eventId.focus()};
  missionEvent.onchange=()=>reloadMissionDropdown();
  missionChoice.onchange=loadMission;missionNew.onclick=()=>{clearMission();missionKey.focus()};
  eventForm.onsubmit=async e=>{
   e.preventDefault();
   if((!start.value||!end.value)&&active.checked){
    setStatus(eventStatus,'Debes indicar inicio y fin para publicar.',true);return
   }
   if(!!start.value!==!!end.value){
    setStatus(eventStatus,'Completa ambas fechas o deja el evento en borrador.',true);return
   }
   let from=null,to=null;
   try{
    from=fromLocal(start.value);to=fromLocal(end.value);
   }catch{setStatus(eventStatus,'Las fechas del evento no son válidas.',true);return}
   if(from&&to&&Date.parse(to)<=Date.parse(from)){
    setStatus(eventStatus,'La fecha final debe ser posterior al inicio.',true);return}
   eventSave.disabled=true;eventStatus.textContent='Guardando evento…';
   const payload={
    p_id:eventId.value.trim(),p_season:eventSeason.value,p_title:eventTitle.value.trim(),
    p_description:description.value.trim(),p_emoji:eventEmoji.value.trim(),
    p_starts_at:from,p_ends_at:to,p_active:active.checked
   };
   try{
    const {error}=await sb.rpc('admin_save_shop_season_event',payload);
    if(error){setStatus(eventStatus,error.message,true);return}
    await reload(payload.p_id);
    setStatus(eventStatus,'✓ Evento guardado. El calendario muestra los eventos publicados en sus fechas.');
   }catch(error){setStatus(eventStatus,error?.message||String(error),true)}
   finally{eventSave.disabled=false}
  };
  missionForm.onsubmit=async e=>{
   e.preventDefault();
   if(!missionEvent.value){setStatus(missionStatus,'Selecciona primero un evento.',true);return}
   if(Number(points.value)===0&&!exclusive.value){
    setStatus(missionStatus,'Selecciona un premio exclusivo o asigna al menos un punto.',true);return
   }
   missionSave.disabled=true;missionStatus.textContent='Guardando misión…';
   const payload={
    p_event_id:missionEvent.value,p_mission_key:missionKey.value.trim(),
    p_title:missionTitle.value.trim(),p_description:missionDescription.value.trim(),
    p_metric:metric.value,p_goal:Number(goal.value),p_reward_points:Number(points.value),
    p_reward_item_id:exclusive.value||null
   };
   try{
    const {error}=await sb.rpc('admin_save_shop_season_mission',payload);
    if(error){setStatus(missionStatus,error.message,true);return}
    await reload(payload.p_event_id,payload.p_mission_key);
    setStatus(missionStatus,'✓ Misión guardada. Los premios y objetivos se validan en Supabase.');
   }catch(error){setStatus(missionStatus,error?.message||String(error),true)}
   finally{missionSave.disabled=false}
  };
  refreshEventDropdowns();clearEvent();clearMission();redrawEventList();
 };
 adminInitRewardShop=async function(){
  await previous();
  await initSeasonAdmin();
 };
})();