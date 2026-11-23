/* Historial privado de etiquetas exclusivas: fechas verificadas, importaciones y retiradas. */
(() => {
 'use strict';
 if(typeof sb==='undefined')return;
 const validId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
 const make=(tag,cls='',value)=>{
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  if(value!==undefined)element.textContent=String(value);
  return element;
 };
 const dateLabel=value=>{
  if(!value)return 'Fecha no disponible';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'Fecha no disponible':
   date.toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
 };
 const badgeFor=(item)=>{
  const node=window.SBExclusiveMemberTags?.makeBadge?.({
   label:item.label,emoji:item.emoji,color:item.color,animation:item.animation,
   source:item.source
  });
  return node||make('strong','',String(item.emoji||'🏅')+' '+String(item.label||'Etiqueta especial'));
 };
 let queued=false;
 let mounting=false;
 async function mount(){
  if(location.hash.split('?')[0]!=='#/cuenta')return;
  const root=document.getElementById('account-profile');
  if(!root?.querySelector('.profile-grid')||root.querySelector('#sb-member-tag-history')||mounting)return;
  mounting=true;
  try{
   const {data,error}=await sb.auth.getSession();
   const userId=data?.session?.user?.id;
   if(error||!validId(userId)||!root.isConnected||location.hash.split('?')[0]!=='#/cuenta')return;
   if(root.querySelector('#sb-member-tag-history'))return;
   const panel=make('section','profile-panel sb-member-tag-history');
   panel.id='sb-member-tag-history';
   const heading=make('h3','','📜 Historial de etiquetas desbloqueadas');
   const intro=make('p','sb-member-tag-history-intro',
    'Consulta tus etiquetas ganadas por logros y las que te asignó la administración. Los registros se conservan aunque una etiqueta se retire.');
   const toolbar=make('div','sb-member-tag-history-toolbar');
   const filter=make('select','sb-member-tag-history-filter');
   filter.setAttribute('aria-label','Filtrar historial de etiquetas');
   for(const [value,label] of [
    ['all','Todas las etiquetas'],
    ['automatic','🏆 Ganadas por logros'],
    ['admin','🏅 Otorgadas por administración'],
    ['revoked','⛔ Retiradas']
   ])filter.add(new Option(label,value));
   const search=make('input','sb-member-tag-history-search');
   search.type='search';search.maxLength=80;search.placeholder='Buscar etiqueta';
   search.setAttribute('aria-label','Buscar etiqueta en mi historial');
   const refresh=make('button','outline-btn mini','↻ Actualizar historial');
   refresh.type='button';
   toolbar.append(filter,search,refresh);
   const summary=make('p','sb-member-tag-history-summary','Cargando etiquetas…');
   summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
   const list=make('div','sb-member-tag-history-list');
   const pagination=make('div','sb-member-tag-history-pagination');
   const more=make('button','outline-btn mini','Mostrar más etiquetas');
   more.type='button';more.hidden=true;pagination.append(more);
   const footnote=make('small','sb-member-tag-history-footnote',
    'Las fechas de desbloqueos anteriores a la activación del registro pueden ser desconocidas. En esos casos se indica la fecha en que se registró el logro.');
   panel.append(heading,intro,toolbar,summary,list,pagination,footnote);
   const progress=root.querySelector('#sb-auto-member-tag-progress');
   if(progress)progress.after(panel);
   else root.querySelector('.profile-grid')?.before(panel);
   if(!panel.isConnected)return;
   let entries=[],shown=12,busy=false,request=0;
   const present=()=>{
    if(!panel.isConnected)return;
    const needle=search.value.trim().toLocaleLowerCase('es');
    const filtered=entries.filter(entry=>{
     if(filter.value==='automatic'&&entry.source!=='automatic')return false;
     if(filter.value==='admin'&&entry.source!=='admin')return false;
     if(filter.value==='revoked'&&!entry.revokedAt)return false;
     return !needle||entry.label.toLocaleLowerCase('es').includes(needle);
    });
    list.replaceChildren();
    for(const entry of filtered.slice(0,shown)){
     const card=make('article','sb-member-tag-history-item'+(entry.revokedAt?' is-revoked':''));
     const top=make('div','sb-member-tag-history-item-head');
     top.append(badgeFor(entry));
     const type=make('span','sb-member-tag-history-kind',
      entry.source==='automatic'?'🏆 Por nivel o logros':'🏅 Administración');
     top.append(type);
     const state=make('strong','sb-member-tag-history-state',
      entry.revokedAt?'⛔ Retirada':entry.source==='automatic'?'✅ Desbloqueada':'✅ Asignada');
     const date=make('p','sb-member-tag-history-date',
      entry.imported
       ?'📅 Registrada el '+dateLabel(entry.date)+' · Fecha original del desbloqueo desconocida'
       :entry.source==='automatic'
       ?'📅 Desbloqueada el '+dateLabel(entry.date)
       :'📅 Otorgada el '+dateLabel(entry.date));
     card.append(top,state,date);
     if(entry.revokedAt){
      card.append(make('p','sb-member-tag-history-revocation','Retirada el '+dateLabel(entry.revokedAt)));
     }
     list.append(card);
    }
    if(!filtered.length){
     const empty=make('p','sb-member-tag-history-empty',
       entries.length?'No hay etiquetas que coincidan con el filtro.':'Todavía no tienes etiquetas registradas.');
     list.append(empty);
    }
    more.hidden=filtered.length<=shown;
    summary.textContent=entries.length+' registros · '+entries.filter(e=>e.source==='automatic').length+
      ' por logros · '+entries.filter(e=>e.source==='admin').length+
      ' de administración · Mostrando '+Math.min(filtered.length,shown)+' de '+filtered.length;
   };
   const load=async()=>{
    if(busy)return;
    busy=true;const token=++request;refresh.disabled=true;
    summary.textContent='Consultando tu historial…';
    try{
     const [automatic,manual,catalog]=await Promise.all([
      sb.from('sb_member_auto_tag_unlocks')
       .select('tag_id,unlocked_at,imported_existing').eq('user_id',userId)
       .order('unlocked_at',{ascending:false}).limit(300),
      sb.from('sb_member_tag_grant_history')
       .select('id,tag_id,tag_label,tag_emoji,tag_color,tag_animation,granted_at,revoked_at,imported_existing')
       .eq('user_id',userId).order('granted_at',{ascending:false}).limit(300),
      sb.from('sb_exclusive_tag_catalog').select('id,label,emoji,color,animation').limit(150)
     ]);
     if(automatic.error||manual.error||catalog.error){
      throw automatic.error||manual.error||catalog.error;
     }
     if(token!==request||!panel.isConnected)return;
     const definitions=new Map((catalog.data||[]).map(item=>[item.id,item]));
     const unlocked=(automatic.data||[]).map(row=>{
      const tag=definitions.get(row.tag_id)||{};
      return {source:'automatic',label:String(tag.label||'Etiqueta exclusiva'),
       emoji:tag.emoji||'🏆',color:tag.color||'purple',animation:tag.animation||'none',
       date:row.unlocked_at,imported:row.imported_existing===true,revokedAt:null};
     });
     const granted=(manual.data||[]).map(row=>({
      source:'admin',label:String(row.tag_label||'Etiqueta especial'),
      emoji:row.tag_emoji||'⭐',color:row.tag_color||'purple',
      animation:row.tag_animation||'none',date:row.granted_at,
      imported:row.imported_existing===true,revokedAt:row.revoked_at||null
     }));
     entries=[...unlocked,...granted].sort((a,b)=>
      (Date.parse(b.date)||0)-(Date.parse(a.date)||0));
     shown=12;present();
    }catch(error){
     if(panel.isConnected)summary.textContent='No se pudo cargar el historial: '+(error.message||'Comprueba tu conexión.');
    }finally{busy=false;refresh.disabled=false;}
   };
   filter.addEventListener('change',()=>{shown=12;present()});
   search.addEventListener('input',()=>{shown=12;present()});
   refresh.addEventListener('click',()=>void load());
   more.addEventListener('click',()=>{shown+=12;present()});
   void load();
   if(new URLSearchParams(location.hash.split('?')[1]||'').get('focus')==='unlock-tags'){
    requestAnimationFrame(()=>{if(panel.isConnected)panel.scrollIntoView({
     behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',
     block:'start'
    })});
   }
  }catch(error){console.warn('No se pudo abrir el historial de etiquetas',error);}
  finally{mounting=false;}
 }
 function schedule(){
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;void mount()});
 }
 const app=document.getElementById('app');
 if(app){
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
})();