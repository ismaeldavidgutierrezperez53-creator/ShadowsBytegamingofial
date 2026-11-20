/* Shadows Byte Gaming Official V2 · Temporadas V7.
   Las recompensas y las condiciones de cada evento se verifican exclusivamente en Supabase. */
(function(){
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const prior=renderRewardShop;
 let generation=0,notice='';
 const ui=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const money=n=>Number(n||0).toLocaleString('es-ES');
 const when=ts=>ts?new Date(ts).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Por anunciar';
 const months=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'});
 const dayName=new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',timeZone:'UTC'});
 const lowMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const scrollSection=()=>document.getElementById('shop-season-events-v7')?.scrollIntoView({behavior:lowMotion()?'auto':'smooth',block:'start'});
 const groupRows=rows=>{
  const groups=new Map();
  for(const row of rows||[]){
   if(!groups.has(row.event_id))groups.set(row.event_id,{event_id:row.event_id,season:row.season,
    title:row.event_title,description:row.event_description,emoji:row.event_emoji,
    starts_at:row.starts_at,ends_at:row.ends_at,status:row.event_status,missions:[]});
   if(row.mission_key)groups.get(row.event_id).missions.push(row);
  }
  return Array.from(groups.values());
 };
 const eventDays=(event,utcMs)=>utcMs>=Date.parse(event.starts_at)&&utcMs<Date.parse(event.ends_at);
 const buildCalendar=(all,focusEvent)=>{
  const wrapper=ui('section','shop-season-v7-calendar');
  const bar=ui('div','shop-season-v7-calendar-head');
  const label=ui('h4','','📅 Calendario de eventos');
  const navigation=ui('div','shop-season-v7-navigation');
  const previous=ui('button','outline-btn mini','‹ Anterior');previous.type='button';
  const monthLabel=ui('strong','shop-season-v7-month-label','');
  const next=ui('button','outline-btn mini','Siguiente ›');next.type='button';
  const today=ui('button','outline-btn mini','Hoy');today.type='button';
  navigation.append(previous,monthLabel,next,today);
  bar.append(label,navigation);wrapper.append(bar);
  const weekdays=ui('div','shop-season-v7-weekdays');
  for(const name of ['L','M','X','J','V','S','D'])weekdays.append(ui('span','',name));
  const days=ui('div','shop-season-v7-days');days.setAttribute('role','group');
  days.setAttribute('aria-label','Días del calendario de eventos');
  wrapper.append(weekdays,days);
  const note=ui('p','shop-season-v7-calendar-note','Los días resaltados corresponden a eventos programados. Las fechas se comprueban en Supabase.');
  wrapper.append(note);
  const now=new Date();
  const closest=all.find(event=>event.status==='live')||all.find(event=>event.status==='upcoming');
  let year=now.getFullYear(),month=now.getMonth();
  if(closest&&!all.some(event=>eventDays(event,Date.UTC(year,month,15)))) {
   const nextDate=new Date(closest.starts_at);year=nextDate.getUTCFullYear();month=nextDate.getUTCMonth();
  }
  const viewMonth=(event)=>{
   const date=new Date(event.starts_at);year=date.getUTCFullYear();month=date.getUTCMonth();renderMonth();
   wrapper.scrollIntoView({block:'start',behavior:lowMotion()?'auto':'smooth'});
  };
  const renderMonth=()=>{
   const first=new Date(Date.UTC(year,month,1));
   const offset=(first.getUTCDay()+6)%7;
   const daysInMonth=new Date(Date.UTC(year,month+1,0)).getUTCDate();
   monthLabel.textContent=months.format(first);
   days.replaceChildren();
   for(let gap=0;gap<offset;gap++){const empty=ui('span','shop-season-v7-calendar-pad');empty.setAttribute('aria-hidden','true');days.append(empty)}
   for(let d=1;d<=daysInMonth;d++){
    const stamp=Date.UTC(year,month,d);
    const button=ui('button','shop-season-v7-day',String(d));button.type='button';
    const occurring=all.filter(ev=>eventDays(ev,stamp));
    const current=now.getFullYear()===year&&now.getMonth()===month&&now.getDate()===d;
    if(current){button.classList.add('is-today');button.setAttribute('aria-current','date')}
    if(occurring.length) {
     button.classList.add('has-event');
     if(occurring.some(ev=>ev.status==='live'))button.classList.add('is-live');
     const dot=ui('span','shop-season-v7-dot');dot.setAttribute('aria-hidden','true');button.append(dot);
     button.onclick=()=>focusEvent(occurring[0].event_id);
    }else button.disabled=true;
    button.setAttribute('aria-label',dayName.format(new Date(stamp))+
     (occurring.length?' · '+occurring.map(x=>x.title).join(', '):' · sin eventos'));
    days.append(button);
   }
  };
  const move=shift=>{const newDate=new Date(Date.UTC(year,month+shift,1));year=newDate.getUTCFullYear();month=newDate.getUTCMonth();renderMonth()};
  previous.onclick=()=>move(-1);next.onclick=()=>move(1);
  today.onclick=()=>{year=now.getFullYear();month=now.getMonth();renderMonth()};
  renderMonth();
  return {wrapper,viewMonth};
 };
 const build=(events,equipped,token)=>{
  const section=ui('section','shop-season-v7');
  section.id='shop-season-events-v7';
  const heading=ui('div','shop-season-v7-header');
  const copy=ui('div','');
  copy.append(ui('h3','','🎉 Eventos de temporada'),
   ui('p','','Calendario anime de Navidad, Halloween y eventos especiales. Las misiones y sus premios solo pueden reclamarse durante las fechas oficiales de cada evento.'));
  heading.append(copy);
  const summary=ui('div','shop-season-v7-summary');
  for(const [title,value] of [
   ['En curso',events.filter(e=>e.status==='live').length],
   ['Próximos',events.filter(e=>e.status==='upcoming').length],
   ['Finalizados',events.filter(e=>e.status==='ended').length]
  ]){
   const item=ui('div','shop-season-v7-summary-item');
   item.append(ui('strong','',value),ui('span','',title));summary.append(item);
  }
  heading.append(summary);section.append(heading);
  if(notice){
   const banner=ui('p','shop-season-v7-success',notice);banner.setAttribute('role','status');
   section.append(banner);notice='';
  }
  const cardMap=new Map();
  const focusEvent=(id)=>{
   const target=cardMap.get(id);if(!target)return;
   target.scrollIntoView({block:'center',behavior:lowMotion()?'auto':'smooth'});
   target.classList.add('shop-season-v7-focus');
   target.focus({preventScroll:true});
  };
  const calendar=buildCalendar(events,focusEvent);
  section.append(calendar.wrapper);
  const content=ui('div','shop-season-v7-events');
  const visible=[...events].sort((a,b)=>
   ({live:0,upcoming:1,ended:2}[a.status]??3)-({live:0,upcoming:1,ended:2}[b.status]??3)
    ||Date.parse(a.starts_at)-Date.parse(b.starts_at));
  if(!visible.length)content.append(ui('p','shop-season-v7-empty','No hay eventos publicados todavía. El administrador puede programar nuevas temporadas desde la administración de la tienda.'));
  for(const event of visible){
   const card=ui('article','shop-season-v7-event shop-season-v7-'+event.season);
   card.tabIndex=-1;cardMap.set(event.event_id,card);
   const top=ui('div','shop-season-v7-event-header');
   const title=ui('div','shop-season-v7-event-heading');
   title.append(ui('span','shop-season-v7-event-emoji',event.emoji||'🎉'),
    ui('h4','',event.title));
   const state=ui('span','shop-season-v7-state '+('shop-season-v7-state-'+event.status),
    event.status==='live'?'● En curso':event.status==='upcoming'?'◷ Próximamente':'✓ Finalizado');
   top.append(title,state);card.append(top,ui('p','shop-season-v7-event-desc',event.description));
   const dates=ui('div','shop-season-v7-event-dates');
   dates.append(ui('span','','🗓️ Inicio: '+when(event.starts_at)),
    ui('span','','⌛ Fin: '+when(event.ends_at)));
   card.append(dates);
   const show=ui('button','outline-btn mini shop-season-v7-show-month','📅 Ver en calendario');
   show.type='button';show.onclick=()=>calendar.viewMonth(event);card.append(show);
   const intro=ui('h5','shop-season-v7-missions-title','🎯 Misiones exclusivas');
   card.append(intro);
   if(!event.missions.length)card.append(ui('p','shop-season-v7-empty','Las misiones de este evento todavía se están preparando.'));
   const missions=ui('div','shop-season-v7-missions');
   for(const mission of event.missions){
    const target=Math.max(1,Number(mission.goal||1));
    const progress=Math.min(target,Math.max(0,Number(mission.progress||0)));
    const earned=!!mission.claimed;
    const enabled=event.status==='live'&&!earned&&progress>=target;
    const box=ui('div','shop-season-v7-mission'+(enabled?' is-ready':'')+(earned?' is-claimed':''));
    box.append(ui('strong','shop-season-v7-mission-name',mission.mission_title),
     ui('p','shop-season-v7-mission-description',mission.mission_description));
    const stats=ui('div','shop-season-v7-mission-stats');
    stats.append(ui('strong','',progress+' / '+target),
     ui('span','',earned?'✓ Reclamada':event.status==='upcoming'?'Disponible al comenzar':event.status==='ended'?'Evento cerrado':enabled?'¡Completada!':'En progreso'));
    const meter=document.createElement('progress');meter.max=target;meter.value=progress;meter.className='shop-season-v7-meter';
    meter.setAttribute('aria-label','Progreso de '+mission.mission_title);
    box.append(stats,meter);
    const rewards=ui('div','shop-season-v7-mission-reward');
    if(Number(mission.reward_points)>0)rewards.append(ui('span','shop-season-v7-points','🪙 +'+money(mission.reward_points)+' puntos'));
    if(mission.reward_item_id)rewards.append(ui('span','shop-season-v7-exclusive',
     (mission.reward_owned?'🏅 En tu colección: ':'🔒 Premio limitado: ')+(mission.reward_item_name||'Recompensa anime exclusiva')));
    box.append(rewards);
    const button=ui('button','gradient-btn mini shop-season-v7-claim',
     earned?'✓ Premio reclamado':event.status==='upcoming'?'🔒 Próximamente':event.status==='ended'?'🔒 Evento finalizado':enabled?'🎁 Reclamar premio':'🔒 Completa la misión');
    button.type='button';button.disabled=!enabled;
    const status=ui('p','shop-season-v7-action-status');status.setAttribute('role','status');
    button.onclick=async()=>{
     if(button.disabled)return;
     button.disabled=true;status.textContent='Comprobando misión…';
     try{
      const {data:ok,error}=await sb.rpc('claim_shop_season_mission',{
       p_event_id:event.event_id,p_mission_key:mission.mission_key
      });
      if(token!==generation||!box.isConnected)return;
      if(error){status.textContent='No se pudo reclamar: '+error.message;button.disabled=false;return}
      if(!ok){status.textContent='Este premio ya se había reclamado.';await renderRewardShop();scrollSection();return}
      notice='🎉 ¡Misión '+mission.mission_title+' completada! '+
       (Number(mission.reward_points)>0?'+'+money(mission.reward_points)+' puntos. ':'')+
       (mission.reward_item_id?'Premio anime desbloqueado para siempre.':'');
      await renderRewardShop();scrollSection();
     }catch(error){if(box.isConnected){status.textContent='Error: '+(error?.message||String(error));button.disabled=false}}
    };
    box.append(button,status);
    if(mission.reward_item_id&&mission.reward_owned){
     const equip=ui('button','outline-btn mini shop-season-v7-equip',
      equipped.has(mission.reward_item_id)?'✓ Premio equipado':'✨ Equipar premio');
     equip.type='button';equip.disabled=equipped.has(mission.reward_item_id);
     equip.onclick=async()=>{
      if(equip.disabled)return;equip.disabled=true;status.textContent='Equipando…';
      const {data:ok,error}=await sb.rpc('equip_reward_shop_item',{requested_item:mission.reward_item_id});
      if(error||!ok){status.textContent=error?.message||'No se pudo equipar.';equip.disabled=false;return}
      status.textContent='✓ Premio equipado en tu perfil.';
      await renderRewardShop();scrollSection();
     };
     box.append(equip);
    }
    missions.append(box);
   }
   card.append(missions);content.append(card);
  }
  section.append(content);
  const footer=ui('p','shop-season-v7-footer','⏰ Los periodos se aplican en horario UTC en Supabase. Las compras, bonos y regalos solo cuentan si se realizaron dentro del evento. Los premios reclamados quedan en tu colección después de que termine.');
  section.append(footer);
  return section;
 };
 renderRewardShop=async function(){
  const token=++generation;
  await prior();
  const host=document.getElementById('reward-shop');
  const anchor=host?.querySelector('#shop-challenges-v6')||host?.querySelector('#shop-purchase-missions')||host?.querySelector('#shop-catalog-filters');
  if(!host?.isConnected||!anchor||token!==generation)return;
  const insert=(node)=>anchor.insertAdjacentElement(anchor.id==='shop-catalog-filters'?'beforebegin':'afterend',node);
  try{
   const {data:{user}}=await sb.auth.getUser();
   if(!user||token!==generation||!host.isConnected)return;
   const [events,equipped]=await Promise.all([
    sb.rpc('get_my_shop_season_events'),
    sb.from('member_shop_equipped').select('item_id').eq('user_id',user.id)
   ]);
   if(token!==generation||!host.isConnected||!anchor.isConnected)return;
   if(events.error){
    const alert=ui('section','shop-season-v7');
    alert.append(ui('h3','','🎉 Eventos de temporada'),ui('p','shop-season-v7-error','No se pudieron cargar los eventos: '+events.error.message));
    insert(alert);return;
   }
   const panel=build(groupRows(events.data||[]),new Set((equipped.data||[]).map(x=>x.item_id)),token);
   insert(panel);
   const shortcut=ui('button','outline-btn mini shop-season-v7-shortcut','🎉 Ver calendario de eventos');
   shortcut.type='button';shortcut.onclick=scrollSection;
   const oldShortcut=host.querySelector('.shop-challenges-v6-shortcut')||host.querySelector('.shop-explorer-shortcut');
   if(oldShortcut)oldShortcut.insertAdjacentElement('afterend',shortcut);
  }catch(error){
   if(token!==generation||!host?.isConnected||!anchor.isConnected)return;
   const alert=ui('section','shop-season-v7');
   alert.append(ui('h3','','🎉 Eventos de temporada'),ui('p','shop-season-v7-error','Error al cargar eventos: '+(error?.message||String(error))));
   insert(alert);
  }
 };
})();