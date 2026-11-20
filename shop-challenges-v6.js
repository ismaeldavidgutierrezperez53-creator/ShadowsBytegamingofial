/* Shadows Byte Gaming Official V2 — retos diarios y semanales, rachas y premios anime.
   El servidor valida los objetivos y concede puntos/artículos; la UI solo muestra datos. */
(function(){
 if(typeof renderRewardShop!=='function'||typeof sb==='undefined')return;
 const priorRender=renderRewardShop;
 let generation=0;
 let celebration='';
 const el=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const formatNumber=n=>Number(n||0).toLocaleString('es-ES');
 const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const moveToChallenges=()=>document.getElementById('shop-challenges-v6')?.scrollIntoView({
  behavior:reduceMotion()?'auto':'smooth',block:'start'
 });
 const formatUtc=timestamp=>timestamp?new Date(timestamp).toLocaleString('es-ES',{
  timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'
 })+' UTC':'';
 const buildPanel=(challenges,equipped,token)=>{
  const section=el('section','shop-challenges-v6');
  section.id='shop-challenges-v6';
  const header=el('div','shop-challenges-v6-header');
  const heading=el('div','shop-challenges-v6-heading');
  heading.append(el('h3','','✨ Desafíos diarios, semanales y rachas'),
   el('p','','Consigue puntos extra completando actividades reales de la tienda. Cada misión se verifica en Supabase; los objetivos diarios y semanales se reinician en horario UTC.'));
  header.append(heading);
  const currentStreak=challenges.find(x=>x.scope==='streak');
  const streakDays=Math.max(0,Number(currentStreak?.streak_days||0));
  const streakSummary=el('div','shop-challenges-v6-streak');
  streakSummary.append(el('strong','',streakDays+' '+(streakDays===1?'día':'días')),
   el('span','','🔥 Racha actual'));
  header.append(streakSummary);section.append(header);
  if(celebration){
   const toast=el('p','shop-challenges-v6-success',celebration);
   toast.setAttribute('role','status');section.append(toast);celebration='';
  }
  const earnedNow=challenges.filter(c=>c.claimed).reduce((sum,c)=>sum+Number(c.reward_points||0),0);
  const counters=el('div','shop-challenges-v6-counters');
  for(const [label,value] of [
   ['Objetivos completados',challenges.filter(c=>c.claimed).length+' / '+challenges.length],
   ['Puntos del periodo','+'+formatNumber(earnedNow)],
   ['Premios anime',challenges.filter(c=>c.special_owned&&c.special_item_id).length]
  ]){
   const counter=el('div','shop-challenges-v6-counter');
   counter.append(el('strong','',value),el('span','',label));counters.append(counter);
  }
  section.append(counters);
  for(const [scope,headline,summary] of [
   ['daily','☀️ Misiones diarias','Se reinician cada día a las 00:00 UTC.'],
   ['weekly','📆 Misiones semanales','Se reinician los lunes a las 00:00 UTC.'],
   ['streak','🔥 Premios por rachas','Cuenta días consecutivos reclamando el bono diario; si rompes la racha, empieza otra.']
  ]){
   const subset=challenges.filter(c=>c.scope===scope);
   if(!subset.length)continue;
   const group=el('section','shop-challenges-v6-group');
   const groupHeading=el('div','shop-challenges-v6-group-heading');
   groupHeading.append(el('h4','',headline),el('p','',summary));group.append(groupHeading);
   const cards=el('div','shop-challenges-v6-grid');
   for(const challenge of subset){
    const goal=Math.max(1,Number(challenge.goal||1));
    const progress=Math.max(0,Math.min(goal,Number(challenge.progress||0)));
    const isDone=!!challenge.claimed;
    const canClaim=!isDone&&progress>=goal;
    const card=el('article','shop-challenges-v6-card'+
     (canClaim?' is-ready':'')+(isDone?' is-claimed':'')+
     (challenge.special_item_id?' is-anime':''));
    const title=el('div','shop-challenges-v6-card-title');
    title.append(el('span','shop-challenges-v6-emoji',challenge.icon||'✨'),
     el('h5','',challenge.title));
    if(challenge.special_item_id)title.append(el('span','shop-challenges-v6-special-tag','ANIME EXCLUSIVO'));
    card.append(title,el('p','shop-challenges-v6-description',challenge.description));
    const amounts=el('div','shop-challenges-v6-progress-heading');
    amounts.append(el('strong','',formatNumber(progress)+' / '+formatNumber(goal)),
     el('span','',isDone?'✓ Premio reclamado':canClaim?'¡Completada!':'En progreso'));
    const bar=document.createElement('progress');
    bar.max=goal;bar.value=progress;bar.className='shop-challenges-v6-progress';
    bar.setAttribute('aria-label','Progreso de '+challenge.title);
    card.append(amounts,bar);
    const reward=el('div','shop-challenges-v6-reward');
    reward.append(el('strong','','🪙 +'+formatNumber(challenge.reward_points)+' puntos'));
    if(challenge.special_item_id){
     const special=el('span','',challenge.special_owned?
      '🏅 En tu colección: '+challenge.special_item_name:
      '🔒 Desbloquea: '+challenge.special_item_name);
     reward.append(special);
    }
    card.append(reward);
    if(challenge.expires_at){
     card.append(el('small','shop-challenges-v6-reset','⏰ Fin del periodo: '+formatUtc(challenge.expires_at)));
    }else{
     card.append(el('small','shop-challenges-v6-reset','⏰ Debes mantener la racha diaria (UTC).'));
    }
    const action=el('button','gradient-btn mini shop-challenges-v6-action',
     isDone?'✓ Ya reclamado':canClaim?'🎁 Reclamar premio':'🔒 Sigue avanzando');
    action.type='button';action.disabled=isDone||!canClaim;
    const status=el('p','shop-challenges-v6-status');status.setAttribute('role','status');
    action.onclick=async()=>{
     if(action.disabled)return;
     action.disabled=true;status.textContent='Comprobando la misión…';
     try{
      const {data:ok,error}=await sb.rpc('claim_shop_challenge',{p_challenge_key:challenge.challenge_key});
      if(token!==generation||!card.isConnected)return;
      if(error){status.textContent='No se pudo reclamar: '+error.message;action.disabled=false;return}
      if(!ok){
       status.textContent='Ya se había reclamado este premio.';
       await renderRewardShop();moveToChallenges();return;
      }
      celebration='🎉 ¡'+challenge.title+' completada! Has recibido '+formatNumber(challenge.reward_points)+
       ' puntos'+(challenge.special_item_id&&!challenge.special_owned?' y tu recompensa anime exclusiva.':'.');
      await renderRewardShop();moveToChallenges();
     }catch(error){
      if(card.isConnected){status.textContent='Error de conexión: '+(error?.message||String(error));action.disabled=false}
     }
    };
    card.append(action,status);
    if(challenge.special_owned&&challenge.special_item_id){
     const equip=el('button','outline-btn mini shop-challenges-v6-equip','✨ Equipar premio');
     equip.type='button';
     if(equipped.get(challenge.special_item_id)) {
      equip.disabled=true;equip.textContent='✓ Premio equipado';
     }
     equip.onclick=async()=>{
      if(equip.disabled)return;
      equip.disabled=true;status.textContent='Equipando…';
      try{
       const {data:ok,error}=await sb.rpc('equip_reward_shop_item',{requested_item:challenge.special_item_id});
       if(error||!ok){status.textContent=error?.message||'No se pudo equipar';equip.disabled=false;return}
       status.textContent='✓ ¡Recompensa equipada en tu perfil!';
       equip.textContent='✓ Premio equipado';
       // Another reward of the same category may be equipped; refresh to reflect it.
       await renderRewardShop();moveToChallenges();
      }catch(error){status.textContent='Error: '+(error?.message||String(error));equip.disabled=false}
     };
     card.append(equip);
    }
    cards.append(card);
   }
   group.append(cards);section.append(group);
  }
  const help=el('p','shop-challenges-v6-help',
   'La racha se calcula por fechas UTC del bono diario. Las misiones diarias y semanales pueden volver a reclamarse en un nuevo periodo. Los premios anime solo se añaden una vez a tu colección.');
  section.append(help);
  return section;
 };
 renderRewardShop=async function(){
  const token=++generation;
  await priorRender();
  const host=document.getElementById('reward-shop');
  const existing=host?.querySelector('#shop-purchase-missions')||
   host?.querySelector('#shop-catalog-filters');
  if(!host?.isConnected||!existing||token!==generation)return;
  const place=(panel)=>{
   existing.insertAdjacentElement(existing.id==='shop-purchase-missions'?'afterend':'beforebegin',panel);
  };
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||token!==generation||!host.isConnected)return;
   const [result,equippedRes]=await Promise.all([
    sb.rpc('get_my_shop_challenges'),
    sb.from('member_shop_equipped').select('category,item_id').eq('user_id',user.id)
   ]);
   if(token!==generation||!host.isConnected||!existing.isConnected)return;
   if(result.error){
    const notice=el('section','shop-challenges-v6');
    notice.append(el('h3','','✨ Desafíos diarios, semanales y rachas'),
     el('p','shop-challenges-v6-error','No se pudieron consultar los desafíos: '+result.error.message));
    place(notice);return;
   }
   const current=new Map();
   for(const entry of equippedRes.data||[])current.set(entry.item_id,true);
   const panel=buildPanel(result.data||[],current,token);
   place(panel);
   const go=el('button','outline-btn mini shop-challenges-v6-shortcut','✨ Ver desafíos diarios y rachas');
   go.type='button';go.onclick=moveToChallenges;
   const currentShortcut=host.querySelector('.shop-explorer-shortcut');
   if(currentShortcut)currentShortcut.insertAdjacentElement('afterend',go);
  }catch(error){
   if(token!==generation||!host?.isConnected||!existing.isConnected)return;
   const notice=el('section','shop-challenges-v6');
   notice.append(el('h3','','✨ Desafíos diarios, semanales y rachas'),
    el('p','shop-challenges-v6-error','Error al cargar los desafíos: '+(error?.message||String(error))));
   place(notice);
  }
 };
})();