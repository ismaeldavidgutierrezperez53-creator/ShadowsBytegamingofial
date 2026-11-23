/* Accesos claros a fijar y dar prioridad, incluso si el centro no tiene avisos nuevos. */
(() => {
 'use strict';
 const PANEL_ID='sb-notification-pin-priority-quick';
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 function mount(){
  const root=document.getElementById('member-notifications');
  if(!root||!root.isConnected||typeof sb==='undefined'||!sb.auth||root.querySelector('#'+PANEL_ID))return;
  const section=make('section','sb-pin-priority-quick');
  section.id=PANEL_ID;
  const title=make('h3','','📌 Fijar y ⭐ destacar avisos');
  const help=make('p','sb-pin-priority-help',
   'Pulsa Fijar o Prioritario dentro de cada aviso. Si no tienes notificaciones nuevas, puedes probarlo con las noticias recientes de tu historial.');
  const historyBtn=make('button','outline-btn mini','📚 Abrir historial completo');
  historyBtn.type='button';
  const feedback=make('p','sb-pin-priority-status','');
  feedback.setAttribute('role','status');
  const cards=make('div','sb-pin-priority-cards');
  historyBtn.onclick=()=>{
   const history=document.getElementById('sb-notification-history');
   if(!history){feedback.textContent='El historial aún no está disponible. Actualiza la página e inténtalo de nuevo.';return;}
   history.open=true;
   history.scrollIntoView({behavior:'smooth',block:'start'});
   const status=history.querySelector('.sb-history-status');
   if(status)status.textContent='Busca los botones 📌 Fijar y ⭐ Dar prioridad dentro de cada registro.';
  };
  section.append(title,help,historyBtn,feedback,cards);
  const header=root.querySelector('h2');
  if(header)header.after(section);else root.prepend(section);
  let sequence=0;
  async function load(){
   const token=++sequence;
   feedback.textContent='Cargando avisos de ejemplo del historial…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError)throw authError;
    if(!user){
     feedback.textContent='Inicia sesión para fijar avisos de tu historial.';
     cards.replaceChildren();return;
    }
    const {data,error}=await sb.from('member_notification_history')
     .select('record_id,source_table,title,occurred_at,archived_at,is_read,is_pinned,is_priority,priority_override')
     .eq('source_table','news')
     .order('occurred_at',{ascending:false}).limit(3);
    if(error)throw error;
    if(token!==sequence||!section.isConnected)return;
    cards.replaceChildren();
    if(!data?.length){
     feedback.textContent='Todavía no hay noticias en el historial. Pulsa «Abrir historial completo» para gestionar otros avisos.';
     return;
    }
    feedback.textContent='Puedes usar estos botones ahora. Se guardarán en tu cuenta.';
    for(const row of data){
     const card=make('article','sb-pin-priority-card'+(row.is_pinned?' is-pinned':'')+(row.is_priority?' is-priority':''));
     card.dataset.sbCategory='news';
     const heading=make('strong','',row.title||'Aviso del historial');
     const date=make('small','',row.occurred_at?new Date(row.occurred_at).toLocaleString('es-ES'):'');
     const chips=make('div','sb-pin-priority-chips');
     if(row.is_pinned)chips.append(make('span','','📌 Fijado'));
     if(row.is_priority)chips.append(make('span','','⭐ Prioritario'));
     const actions=make('div','sb-pin-priority-actions');
     const pin=make('button','outline-btn mini',row.is_pinned?'📌 Desfijar':'📌 Fijar');
     pin.type='button';pin.setAttribute('aria-pressed',String(Boolean(row.is_pinned)));
     const star=make('button','outline-btn mini',row.is_priority?'⭐ Quitar prioridad':'⭐ Prioritario');
     star.type='button';star.setAttribute('aria-pressed',String(Boolean(row.is_priority)));
     const buttons=[pin,star];
     if(row.priority_override){
      const automatic=make('button','outline-btn mini','↺ Prioridad automática');
      automatic.type='button';buttons.push(automatic);
      automatic.onclick=()=>void save(row,{priority_override:null},buttons);
     }
     pin.onclick=()=>void save(row,{is_pinned:!row.is_pinned},buttons);
     star.onclick=()=>void save(row,{priority_override:row.is_priority?'normal':'high'},buttons);
     actions.append(...buttons);
     card.append(heading,date,chips,actions);
     cards.append(card);
    }
   }catch(err){
    if(token===sequence&&section.isConnected)feedback.textContent=
     'No se pudieron cargar los avisos del historial: '+(err?.message||'Error desconocido');
   }
  }
  async function save(row,patch,buttons){
   buttons.forEach(btn=>btn.disabled=true);
   feedback.textContent='Guardando preferencia…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!user)throw new Error('Debes iniciar sesión.');
    const key={source_table:row.source_table,record_id:String(row.record_id)};
    const {data:existing,error:readError}=await sb.from('member_notification_history_actions')
     .select('is_read,archived_at,is_pinned,priority_override')
     .eq('user_id',user.id).eq('source_table',key.source_table)
     .eq('record_id',key.record_id).maybeSingle();
    if(readError)throw readError;
    const payload={
     user_id:user.id,...key,
     is_read:existing?.is_read??(row.is_read!==false),
     archived_at:existing?.archived_at??(row.archived_at||null),
     is_pinned:Object.prototype.hasOwnProperty.call(patch,'is_pinned')?
      patch.is_pinned:(existing?.is_pinned??Boolean(row.is_pinned)),
     priority_override:Object.prototype.hasOwnProperty.call(patch,'priority_override')?
      patch.priority_override:(existing?.priority_override??row.priority_override??null),
     updated_at:new Date().toISOString()
    };
    const {error}=await sb.from('member_notification_history_actions')
     .upsert(payload,{onConflict:'user_id,source_table,record_id'});
    if(error)throw error;
    await load();
    window.dispatchEvent(new CustomEvent('sb-notification-highlights-updated'));
    if(section.isConnected)feedback.textContent='✅ Preferencia guardada. También aparece en el historial completo.';
   }catch(err){
    if(section.isConnected)feedback.textContent='No se pudo guardar: '+(err?.message||'Error desconocido');
   }finally{
    buttons.forEach(btn=>btn.disabled=false);
   }
  }
  void load();
 }
 function start(){
  const app=document.getElementById('app');
  if(!app)return;
  const observer=new MutationObserver(()=>mount());
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
