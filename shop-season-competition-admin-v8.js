/* Shadows Byte Gaming Official V2 — cierre de torneos estacionales V8.
 * El servidor verifica rol administrador, final de evento y entrega idempotente. */
(function(){
 if(typeof adminInitRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=adminInitRewardShop;
 const el=(tag,cls,label)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(label!==undefined)x.textContent=String(label);
  return x;
 };
 const prettyDate=iso=>iso?new Date(iso).toLocaleString('es-ES',{
  day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
 }):'Sin fecha';
 const init=async()=>{
  const host=document.querySelector('#admin-shop-root .sb-shop-admin');
  if(!host)return;
  if(host.querySelector('.shop-season-competition-admin-v8'))return;
  const [eventsResponse,statusResponse]=await Promise.all([
   sb.rpc('admin_list_shop_season_events'),
   sb.rpc('get_my_shop_season_registrations')
  ]);
  if(!host.isConnected)return;
  const section=el('section','sb-shop-admin__section shop-season-competition-admin-v8');
  const heading=el('div','sb-shop-admin__section-heading');
  const inner=el('div');
  inner.append(el('h3','','🏆 Competiciones y premios del podio'),
   el('p','','Gestiona inscritos y revisa los puntos de los eventos publicados. Cuando un evento termine, podrás cerrar su ranking y entregar una sola vez los premios de oro (+100), plata (+50) y bronce (+25 puntos) con sus insignias exclusivas.'));
  heading.append(inner);section.append(heading);
  if(eventsResponse.error||statusResponse.error){
   section.append(el('p','shop-season-competition-admin-v8-error',
    'No se pudieron cargar los eventos: '+(eventsResponse.error?.message||statusResponse.error?.message)));
   host.append(section);return;
  }
  const statusMap=new Map((statusResponse.data||[]).map(s=>[s.event_id,s]));
  const today=Date.now();
  const list=el('div','shop-season-competition-admin-v8-list');
  for(const event of eventsResponse.data||[]){
   const card=el('article','shop-season-competition-admin-v8-card');
   const status=statusMap.get(event.event_id);
   const ended=!!event.ends_at&&today>=Date.parse(event.ends_at);
   const finalized=!!status?.finalized;
   const ready=!!event.active&&ended&&!finalized;
   const top=el('div','shop-season-competition-admin-v8-heading');
   const name=el('div','');
   name.append(el('strong','',(event.event_emoji||'🎉')+' '+event.event_title),
    el('span','',event.active?'● Evento publicado':'◷ Borrador · no visible'));
   top.append(name,el('strong','shop-season-competition-admin-v8-count',
    Number(status?.participant_count||0)+' inscritos'));
   card.append(top,el('p','shop-season-competition-admin-v8-dates',
    'Inicio: '+prettyDate(event.starts_at)+' · Fin: '+prettyDate(event.ends_at)));
   const buttons=el('div','shop-season-competition-admin-v8-actions');
   const scoreboard=el('div','shop-season-competition-admin-v8-scoreboard');
   scoreboard.hidden=true;
   const show=el('button','outline-btn mini','👥 Ver participantes');
   show.type='button';show.disabled=!event.active;
   show.onclick=async()=>{
    if(!scoreboard.hidden){scoreboard.hidden=true;show.textContent='👥 Ver participantes';return}
    scoreboard.hidden=false;scoreboard.textContent='Cargando clasificación…';show.disabled=true;
    const {data,error}=await sb.rpc('get_shop_season_leaderboard',{p_event_id:event.event_id});
    if(!scoreboard.isConnected)return;
    scoreboard.replaceChildren();
    if(error)scoreboard.append(el('p','shop-season-competition-admin-v8-error',error.message));
    else if(!(data||[]).length)scoreboard.append(el('p','','Todavía no hay participantes inscritos.'));
    else for(const row of data){
     const entry=el('div','shop-season-competition-admin-v8-player');
     entry.append(el('strong','','#'+row.place_no+' '+(row.is_me?'Tú':row.display_label)),
      el('span','',Number(row.score)+' puntos · '+Number(row.missions_completed)+' misiones'));
     if(row.award_points)entry.append(el('small','',(['','🥇','🥈','🥉'][Number(row.place_no)]||'🏅')+' Premio adjudicado: +'+row.award_points+' puntos · '+(row.prize_name||'insignia')));
     scoreboard.append(entry);
    }
    show.disabled=false;show.textContent='Ocultar participantes';
   };
   buttons.append(show);
   const finalize=el('button','gradient-btn mini',finalized?'✓ Clasificación cerrada':
    ready?'🏅 Cerrar ranking y entregar premios':
    !event.active?'🔒 Evento en borrador':!ended?'⏳ Pendiente de finalizar':'🔒 No disponible');
   finalize.type='button';finalize.disabled=!ready;
   const message=el('p','shop-season-competition-admin-v8-status');
   message.setAttribute('role','status');
   finalize.onclick=async()=>{
    if(finalize.disabled)return;
    if(!confirm('¿Cerrar definitivamente «'+event.event_title+'» y entregar los premios al podio? Esta acción es irreversible. Solo reciben premios los participantes con puntos de competición.'))return;
    finalize.disabled=true;message.textContent='Calculando el podio y entregando premios…';
    try{
     const {data:ok,error}=await sb.rpc('admin_finalize_shop_season_event',{p_event_id:event.event_id});
     if(error){message.textContent='No se pudo cerrar: '+error.message;finalize.disabled=false;return}
     if(!ok){message.textContent='Este evento ya tenía el ranking cerrado.';finalize.textContent='✓ Clasificación cerrada';return}
     finalize.textContent='✓ Clasificación cerrada';
     message.textContent='✅ Clasificación cerrada. Los premios se han registrado en Supabase sin duplicados.';
     if(!scoreboard.hidden)show.click();
    }catch(error){message.textContent='Error: '+(error?.message||String(error));finalize.disabled=false}
   };
   buttons.append(finalize);card.append(buttons,message,scoreboard);list.append(card);
  }
  if(!(eventsResponse.data||[]).length)list.append(el('p','','No hay eventos creados todavía.'));
  section.append(list);
  const older=host.querySelector('.shop-season-admin-v7');
  if(older)older.insertAdjacentElement('afterend',section);
  else host.append(section);
 };
 adminInitRewardShop=async function(){
  await previous();
  await init();
 };
})();