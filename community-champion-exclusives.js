/* Eventos exclusivos de campeones. La elegibilidad y el acceso se verifican con RLS en Supabase. */
(() => {
 'use strict';
 const make=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 const fmt=x=>{
  const d=new Date(x);
  return Number.isFinite(d.getTime())?d.toLocaleString('es-ES'):'Fecha no disponible';
 };
 const stateWord=x=>x==='published'?'Publicado':x==='draft'?'Borrador':'Cancelado';
 async function mount(container){
  if(!container)return;
  let generation=0;
  container.replaceChildren();
  const info=make('p','sb-exclusive-intro',
   'Eventos especiales reservados a campeones de torneos y retos con un primer puesto oficialmente premiado. No se otorgan XP ni puntos de tienda por inscribirse.');
  const top=make('div','sb-exclusive-toolbar');
  const reloadButton=make('button','sb-legends-refresh','↻ Actualizar eventos');
  reloadButton.type='button';
  const status=make('p','sb-exclusive-status','');
  status.setAttribute('role','status');
  const list=make('div','sb-exclusive-list');
  top.append(reloadButton);
  container.append(info,top,status,list);
  async function reload(){
   const token=++generation;
   status.textContent='Cargando eventos exclusivos…';
   reloadButton.disabled=true;
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError)throw authError;
    if(!user){
     if(token===generation){list.textContent='Inicia sesión para consultar los eventos exclusivos.';status.textContent='';}
     return;
    }
    const {data:events,error}=await sb.from('sb_champion_events')
     .select('id,title,description,starts_at,ends_at,status')
     .eq('status','published').order('starts_at',{ascending:false}).limit(80);
    if(error)throw error;
    const [eligibility,registered]=await Promise.all([
     sb.from('community_competition_awards').select('competition_id',{count:'exact',head:true})
      .eq('user_id',user.id).eq('place',1),
     events?.length?sb.from('sb_champion_event_entries').select('event_id')
      .eq('user_id',user.id).in('event_id',events.map(e=>e.id))
      :Promise.resolve({data:[],error:null})
    ]);
    if(eligibility.error)throw eligibility.error;
    if(registered.error)throw registered.error;
    if(token!==generation||!container.isConnected)return;
    const qualified=(eligibility.count||0)>0;
    const registeredIds=new Set((registered.data||[]).map(e=>e.event_id));
    list.replaceChildren();
    if(!events?.length){
     list.append(make('p','sb-legend-empty',
      'Todavía no hay eventos para campeones publicados. Administración puede crear el primero en Gestión de competiciones.'));
    }
    for(const event of events||[]){
     const card=make('article','sb-exclusive-card');
     const title=make('h4','', '👑 '+event.title);
     const date=make('p','sb-exclusive-date','📅 '+fmt(event.starts_at)+' — '+fmt(event.ends_at));
     const description=make('p','',event.description||'Evento reservado a campeones oficiales.');
     const now=Date.now(),isOver=now>=new Date(event.ends_at).getTime();
     const isRegistered=registeredIds.has(event.id);
     const state=make('span','sb-exclusive-chip',
      isOver?'Finalizado':now>=new Date(event.starts_at).getTime()?'En curso':'Próximamente');
     const action=make('button','sb-exclusive-action',
      isRegistered?'↩️ Cancelar mi inscripción':qualified?'✅ Inscribirme como campeón':'🔒 Exclusivo para campeones');
     action.type='button';
     action.disabled=isOver||!qualified;
     if(isOver)action.textContent=isRegistered?'Inscrito · Finalizado':'Inscripciones cerradas';
     action.onclick=async()=>{
      if(!qualified||isOver)return;
      action.disabled=true;
      const response=isRegistered
       ?await sb.from('sb_champion_event_entries').delete()
        .eq('event_id',event.id).eq('user_id',user.id)
       :await sb.from('sb_champion_event_entries').insert({event_id:event.id,user_id:user.id});
      if(response.error){
       status.textContent='No se pudo modificar la inscripción: '+response.error.message;
       action.disabled=false;return;
      }
      await reload();
      status.textContent=isRegistered?'Inscripción cancelada.':'✅ Te has inscrito correctamente como campeón.';
     };
     card.append(title,state,description,date,action);
     list.append(card);
    }
    status.textContent=qualified
     ?'👑 Tienes una victoria oficial: puedes inscribirte en los eventos abiertos.'
     :'🔒 Para participar debes ganar una competición y recibir oficialmente la medalla de oro.';
   }catch(error){
    if(token===generation&&container.isConnected)status.textContent=
     'No se pudieron cargar los eventos: '+(error?.message||'Error desconocido');
   }finally{
    if(token===generation)reloadButton.disabled=false;
   }
  }
  reloadButton.onclick=()=>void reload();
  await reload();
 }
 function mountAdmin(panel){
  if(!panel||panel.querySelector('.sb-exclusive-admin'))return;
  const wrapper=make('section','sb-exclusive-admin');
  wrapper.id='sb-exclusive-admin-events';
  const heading=make('div','sb-exclusive-admin-heading');
  heading.append(make('h3','','👑 Eventos exclusivos de campeones'),
   make('p','',
    'Crea eventos a los que solo pueden inscribirse miembros con al menos una medalla de oro oficial. No conceden recompensas económicas ni XP.'));
  const form=make('form','sb-exclusive-admin-form');
  const field=(title,name,type,required=true)=>{
   const label=make('label','',title);
   const node=make('input');
   node.name=name;node.type=type;node.required=required;
   label.append(node);return label;
  };
  const titleField=field('Nombre del evento','title','text');
  titleField.querySelector('input').minLength=3;
  titleField.querySelector('input').maxLength=120;
  titleField.querySelector('input').placeholder='Ej.: Duelo de campeones';
  const desc=make('label','','Descripción');
  const textarea=make('textarea');
  textarea.name='description';textarea.maxLength=1500;textarea.rows=3;
  textarea.placeholder='Temática, reglas y detalles de participación';
  desc.append(textarea);
  const start=field('Inicio','starts_at','datetime-local');
  const end=field('Fin','ends_at','datetime-local');
  const state=make('label','','Estado');
  const select=make('select');select.name='status';
  for(const [key,label] of [['draft','Borrador'],['published','Publicado']]){
   const option=make('option','',label);option.value=key;select.append(option);
  }
  state.append(select);
  const submit=make('button','gradient-btn','➕ Crear evento exclusivo');
  submit.type='submit';
  form.append(titleField,desc,start,end,state,submit);
  const note=make('p','sb-exclusive-status','');
  note.setAttribute('role','status');
  const list=make('div','sb-exclusive-admin-list');
  const refresh=make('button','admin-secondary','🔄 Actualizar eventos');
  refresh.type='button';
  wrapper.append(heading,form,note,refresh,list);
  panel.append(wrapper);
  let generation=0;
  const reload=async()=>{
   const token=++generation;
   list.textContent='Cargando eventos…';
   const {data,error}=await sb.from('sb_champion_events')
    .select('id,title,description,starts_at,ends_at,status,created_at')
    .order('created_at',{ascending:false}).limit(80);
   if(token!==generation||!wrapper.isConnected)return;
   if(error){list.textContent='No se pudieron cargar los eventos: '+error.message;return;}
   list.replaceChildren();
   if(!data?.length){list.append(make('p','sb-legend-empty','Todavía no has creado eventos exclusivos.'));return;}
   for(const item of data){
    const card=make('article','sb-exclusive-admin-card');
    const heading=make('h4','',item.title);
    const state=make('span','sb-exclusive-chip',stateWord(item.status));
    const dates=make('p','',fmt(item.starts_at)+' — '+fmt(item.ends_at));
    const detail=make('p','',item.description||'Sin descripción adicional.');
    const button=make('button','admin-secondary',
     item.status==='draft'?'📢 Publicar':item.status==='published'?'🚫 Cancelar':'↩️ Volver a borrador');
    button.type='button';
    button.onclick=async()=>{
     const next=item.status==='draft'?'published':item.status==='published'?'cancelled':'draft';
     if(!confirm('¿Cambiar «'+item.title+'» a '+stateWord(next)+'?'))return;
     button.disabled=true;
     const result=await sb.from('sb_champion_events').update({status:next}).eq('id',item.id);
     if(result.error){note.textContent='No se pudo cambiar el estado: '+result.error.message;button.disabled=false;return;}
     await reload();note.textContent='Evento actualizado correctamente.';
    };
    card.append(heading,state,dates,detail,button);list.append(card);
   }
  };
  form.onsubmit=async event=>{
   event.preventDefault();
   const fd=new FormData(form);
   const title=String(fd.get('title')||'').trim();
   const description=String(fd.get('description')||'').trim();
   const startDate=new Date(String(fd.get('starts_at')||''));
   const endDate=new Date(String(fd.get('ends_at')||''));
   if(title.length<3||title.length>120||description.length>1500||
    !Number.isFinite(startDate.getTime())||!Number.isFinite(endDate.getTime())||
    endDate<=startDate||endDate.getTime()<=Date.now()){
    note.textContent='Revisa el nombre y las fechas. La fecha de fin debe ser posterior al inicio y estar en el futuro.';return;
   }
   submit.disabled=true;
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!user)throw new Error('Debes iniciar sesión como administrador.');
    const payload={title,description,
     starts_at:startDate.toISOString(),ends_at:endDate.toISOString(),
     status:String(fd.get('status')||'draft'),created_by:user.id};
    const result=await sb.from('sb_champion_events').insert(payload);
    if(result.error)throw result.error;
    form.reset();await reload();
    note.textContent=payload.status==='published'?'✅ Evento exclusivo publicado.':'📝 Evento guardado como borrador.';
   }catch(error){note.textContent='No se pudo crear el evento: '+(error?.message||'Error desconocido');}
   finally{submit.disabled=false;}
  };
  refresh.onclick=()=>void reload();
  void reload();
 }
 window.SBChampionExclusives={mount,mountAdmin};
})();
