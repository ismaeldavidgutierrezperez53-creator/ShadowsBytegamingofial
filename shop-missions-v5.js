/* Shadows Byte Gaming Official V2 — misiones de compra y premios permanentes.
   Los puntos, las insignias y el título exclusivo se entregan únicamente en Supabase. */
(function(){
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const previous=renderRewardShop;
 let generation=0;
 let lastClaimMessage='';
 const create=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const fmt=n=>Number(n||0).toLocaleString('es-ES');
 const prefersLess=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const scrollToPanel=()=>{
  document.getElementById('shop-purchase-missions')?.scrollIntoView({
   behavior:prefersLess()?'auto':'smooth',block:'start'
  });
 };
 const buildMissionPanel=async(host,missions,user,token)=>{
  const panel=create('section','shop-missions-panel');
  panel.id='shop-purchase-missions';
  const header=create('div','shop-missions-header');
  const heading=create('div','shop-missions-heading');
  heading.append(
   create('h3','','🎯 Misiones de compra'),
   create('p','','Completa objetivos con tus compras y regalos, reclama puntos y colecciona insignias. Cada misión se premia una única vez.')
  );
  header.append(heading);
  const claimed=missions.filter(m=>m.claimed);
  const pointsEarned=claimed.reduce((total,m)=>total+Number(m.reward_points||0),0);
  const summary=create('div','shop-missions-summary');
  for(const [label,value] of [
   ['Misiones completadas',claimed.length+' / '+missions.length],
   ['Puntos ganados','+'+fmt(pointsEarned)],
   ['Insignias',claimed.length]
  ]){
   const stat=create('div','shop-missions-stat');
   stat.append(create('strong','',value),create('span','',label));summary.append(stat)
  }
  header.append(summary);panel.append(header);
  if(lastClaimMessage){
   const notice=create('p','shop-missions-celebration',lastClaimMessage);notice.setAttribute('role','status');
   panel.append(notice);lastClaimMessage='';
  }
  const list=create('div','shop-missions-grid');
  for(const mission of missions){
   const progress=Math.max(0,Math.min(Number(mission.progress)||0,Number(mission.goal)||1));
   const goal=Math.max(1,Number(mission.goal)||1);
   const done=!!mission.claimed;
   const ready=!done&&progress>=goal;
   const card=create('article','shop-missions-card'+(done?' is-claimed':ready?' is-ready':'')+(mission.is_special?' is-special':''));
   const badge=create('span','shop-missions-icon',mission.mission_icon||'🎯');
   badge.setAttribute('aria-hidden','true');
   const title=create('h4','',mission.mission_title);
   const titleRow=create('div','shop-missions-title');titleRow.append(badge,title);
   if(mission.is_special)titleRow.append(create('span','shop-missions-exclusive','👑 Premio exclusivo'));
   card.append(titleRow,create('p','shop-missions-desc',mission.mission_description));
   const meterRow=create('div','shop-missions-meter-header');
   meterRow.append(create('strong','',fmt(progress)+' / '+fmt(goal)),create('span','',done?'✓ Reclamada':ready?'¡Meta conseguida!':'En progreso'));
   const progressBar=document.createElement('progress');progressBar.className='shop-missions-progress';
   progressBar.max=goal;progressBar.value=progress;
   progressBar.setAttribute('aria-label','Progreso de '+mission.mission_title);
   card.append(meterRow,progressBar);
   const reward=create('div','shop-missions-prize');
   reward.append(
    create('span','shop-missions-points','🪙 +'+fmt(mission.reward_points)+' puntos'),
    create('span','shop-missions-badge',(done?'🏅':'🔒')+' '+(mission.badge_icon||'🏅')+' '+mission.badge_name)
   );
   if(mission.is_special)reward.append(create('span','shop-missions-title-prize','✨ Título de perfil «Leyenda de la Tienda»'));
   card.append(reward);
   const action=create('button','gradient-btn mini shop-missions-claim',
    done?'✓ Premio reclamado':ready?'🎁 Reclamar recompensa':'🔒 Completa la misión');
   action.type='button';action.disabled=done||!ready;
   const message=create('p','shop-missions-status');message.setAttribute('role','status');
   action.onclick=async()=>{
    if(action.disabled)return;
    action.disabled=true;message.textContent='Validando misión…';
    try{
     const {data:ok,error}=await sb.rpc('claim_shop_purchase_mission',{p_mission_key:mission.mission_key});
     if(!card.isConnected||token!==generation)return;
     if(error){message.textContent='No se pudo reclamar: '+error.message;action.disabled=false;return}
     if(!ok){message.textContent='Esta misión ya estaba reclamada.';await renderRewardShop();return}
     lastClaimMessage='🎉 ¡'+mission.badge_name+' desbloqueada! Has ganado '+fmt(mission.reward_points)+' puntos'+(mission.is_special?' y el título exclusivo de perfil.':'.');
     await renderRewardShop();scrollToPanel();
    }catch(error){
     if(card.isConnected){message.textContent='Error de conexión: '+(error?.message||String(error));action.disabled=false}
    }
   };
   card.append(action,message);list.append(card);
  }
  panel.append(list);
  const collection=create('section','shop-missions-collection');
  const collectionHeading=create('div','shop-missions-collection-header');
  collectionHeading.append(create('h4','','🏅 Mis insignias coleccionables'),
   create('p','','Insignias ganadas por cumplir objetivos. Permanecen en tu cuenta y no se duplican.'));
  collection.append(collectionHeading);
  if(claimed.length){
   const medals=create('div','shop-missions-medals');
   for(const mission of claimed){
    const tile=create('div','shop-missions-medal');
    tile.append(create('span','shop-missions-medal-icon',mission.badge_icon||'🏆'),
     create('strong','',mission.badge_name),
     create('small','','Desbloqueada el '+new Date(mission.claimed_at).toLocaleDateString('es-ES')));
    medals.append(tile);
   }
   collection.append(medals);
  }else{
   collection.append(create('p','shop-missions-empty','Aún no has reclamado ninguna insignia. Completa una misión para conseguir la primera.'));
  }
  const special=missions.find(m=>m.is_special);
  if(special?.claimed&&special.special_owned){
   const exclusive=create('div','shop-missions-equip');
   const detail=create('div','');
   detail.append(create('strong','','🌟 Tu premio especial: Leyenda de la Tienda'),
    create('p','','Ya tienes el título exclusivo. Puedes equiparlo en tu perfil sin gastar puntos.'));
   const equip=create('button','outline-btn mini','✨ Equipar título');
   equip.type='button';
   const status=create('span','shop-missions-status');status.setAttribute('role','status');
   const {data:equipped,error:readError}=await sb.from('member_shop_equipped').select('item_id')
    .eq('user_id',user.id).eq('category','title').maybeSingle();
   if(!readError&&equipped?.item_id==='title_shop_legend'){equip.disabled=true;equip.textContent='✓ Título equipado'}
   equip.onclick=async()=>{
    equip.disabled=true;status.textContent='Equipando…';
    const {data:ok,error}=await sb.rpc('equip_reward_shop_item',{requested_item:'title_shop_legend'});
    if(error||!ok){status.textContent=error?.message||'No se pudo equipar';equip.disabled=false;return}
    status.textContent='✓ ¡Título equipado!';equip.textContent='✓ Título equipado';
   };
   exclusive.append(detail,equip,status);collection.append(exclusive);
  }
  panel.append(collection);
  return panel;
 };
 renderRewardShop=async function(){
  const token=++generation;
  await previous();
  const host=document.getElementById('reward-shop');
  const catalogue=host?.querySelector('#shop-catalog-filters');
  if(!host?.isConnected||!catalogue)return;
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||token!==generation||!host.isConnected)return;
   const {data,error}=await sb.rpc('get_my_shop_purchase_missions');
   if(!host.isConnected||token!==generation)return;
   if(error){
    const problem=create('section','shop-missions-panel');
    problem.append(create('h3','','🎯 Misiones de compra'),
     create('p','shop-missions-error','No se pudieron cargar las misiones: '+error.message));
    host.insertBefore(problem,catalogue);return
   }
   const panel=await buildMissionPanel(host,data||[],user,token);
   if(token===generation&&host.isConnected&&catalogue.isConnected)host.insertBefore(panel,catalogue);
  }catch(error){
   if(token!==generation||!host?.isConnected||!catalogue.isConnected)return;
   const problem=create('section','shop-missions-panel');
   problem.append(create('h3','','🎯 Misiones de compra'),
    create('p','shop-missions-error','Ha fallado la carga de misiones: '+(error?.message||String(error))));
   host.insertBefore(problem,catalogue);
  }
 };
})();