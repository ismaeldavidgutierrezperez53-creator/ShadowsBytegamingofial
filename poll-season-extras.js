// Cuenta atrás, podio anime y trofeos mensuales.
// No concede premios: todos los trofeos proceden de resultados confirmados en Supabase.
(function(){
 'use strict';
 const monthlyPrizes=[
  {position:1,icon:'🥇',name:'Rey de Encuestas',points:100,glow:'gold'},
  {position:2,icon:'🥈',name:'Voz de Plata',points:50,glow:'silver'},
  {position:3,icon:'🥉',name:'Voz de Bronce',points:25,glow:'bronze'}
 ];
 const esNumber=new Intl.NumberFormat('es-ES');
 const monthFormat=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',month:'long',year:'numeric'});
 const make=(tag,className,value)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(value!==undefined)element.textContent=value;
  return element;
 };
 const monthText=date=>monthFormat.format(new Date(date+'T12:00:00Z'));
 // Determine the exact next-month midnight in Madrid, even over DST changes.
 function endOfMadridMonth(monthStart){
  const parts=monthStart.split('-').map(Number);
  if(parts.length!==3||!parts.every(Number.isFinite))return NaN;
  const utcMidnight=Date.UTC(parts[0],parts[1],1,0,0,0);
  const guess=new Date(utcMidnight);
  const madridParts=new Intl.DateTimeFormat('en-GB',{
   timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',
   hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(guess);
  const values=Object.fromEntries(madridParts.filter(x=>x.type!=='literal')
   .map(x=>[x.type,Number(x.value)]));
  const localAtGuess=Date.UTC(values.year,values.month-1,values.day,values.hour,values.minute);
  return utcMidnight-(localAtGuess-utcMidnight);
 }
 let tickTimer=null;
 let countRoot=null;
 function mountCountdown(host,monthStart){
  if(!host)return;
  if(tickTimer!==null){clearInterval(tickTimer);tickTimer=null;}
  countRoot=host;
  host.replaceChildren();
  const end=endOfMadridMonth(monthStart);
  const title=make('div','poll-anime-countdown-title','⏳ Cuenta atrás para el cierre');
  const grid=make('div','poll-anime-countdown-grid');
  const fields=[['Días',0],['Horas',0],['Minutos',0],['Segundos',0]];
  const counters=[];
  for(const [label] of fields){
   const cell=make('div','poll-anime-countdown-cell');
   const number=make('strong',null,'00');
   const caption=make('span',null,label);
   cell.append(number,caption);grid.append(cell);counters.push(number);
  }
  const detail=make('p','poll-anime-countdown-description',
   'Los premios se confirman al finalizar la temporada (hora de España).');
  host.append(title,grid,detail);
  host.setAttribute('aria-label','Tiempo restante de la temporada de encuestas');
  function tick(){
   if(!host.isConnected||countRoot!==host){
    if(tickTimer!==null){clearInterval(tickTimer);tickTimer=null;}
    return;
   }
   const milliseconds=Math.max(0,end-Date.now());
   const seconds=Math.ceil(milliseconds/1000);
   const days=Math.floor(seconds/86400);
   const hours=Math.floor(seconds%86400/3600);
   const mins=Math.floor(seconds%3600/60);
   const secs=seconds%60;
   [days,hours,mins,secs].forEach((num,i)=>{
    const next=String(num).padStart(2,'0');
    if(counters[i].textContent!==next)counters[i].textContent=next;
   });
   if(milliseconds<=0){
    detail.textContent='🌟 Temporada finalizada. Preparando la clasificación del nuevo mes…';
    if(tickTimer!==null){clearInterval(tickTimer);tickTimer=null;}
    // The monthly leaderboard changes when the Madrid calendar changes.
    if(typeof window.SBPollParticipation?.render==='function'){
     window.SBPollParticipation.render();
    }
   }
  }
  tick();
  if(end>Date.now())tickTimer=setInterval(tick,1000);
 }
 function podiumCard(rank,position,finished){
  const prize=monthlyPrizes.find(p=>p.position===position);
  const item=make('article','poll-anime-podium-place poll-anime-podium-'+prize.glow);
  item.dataset.position=String(position);
  item.setAttribute('aria-label','Puesto '+position+(finished?' definitivo':' provisional'));
  const crest=make('span','poll-anime-podium-crest',prize.icon);
  crest.setAttribute('aria-hidden','true');
  const sparkles=make('span','poll-anime-podium-sparkles','✦ 🌸 ✦');
  sparkles.setAttribute('aria-hidden','true');
  const label=make('span','poll-anime-podium-ribbon',
   finished?prize.name:'Puesto '+position+' · Provisional');
  const body=make('div','poll-anime-podium-identity');
  if(rank){
   const name=make('a','poll-anime-podium-name',rank.display_name||'Miembro');
   name.href='#/perfil?id='+encodeURIComponent(rank.user_id);
   body.append(name);
   body.append(make('strong','poll-anime-podium-votes',
    esNumber.format(Number(rank.votes_count)||0)+' votos'));
   if(finished){
    body.append(make('span','poll-anime-podium-prize','+'+prize.points+' puntos entregados'));
   }else{
    body.append(make('span','poll-anime-podium-prize','Premio posible: +'+prize.points+' puntos'));
   }
  }else{
   body.append(make('span','poll-anime-podium-private',
    'Puesto sin datos públicos'));
   body.append(make('span','poll-anime-podium-private-note',
    'Puede corresponder a un perfil privado o seguir vacante'));
  }
  const base=make('div','poll-anime-podium-base');
  base.append(make('strong',null,String(position)));
  item.append(sparkles,crest,label,body,base);
  return item;
 }
 function renderPodium(host,ranking,finished=false){
  if(!host)return;
  host.querySelector('.poll-anime-podium')?.remove();
  const podium=make('section','poll-anime-podium');
  podium.setAttribute('aria-label',finished?'Podio de ganadores de la temporada':'Podio provisional de encuestas');
  const heading=make('div','poll-anime-podium-heading');
  heading.append(make('h5',null,finished?'🏆 Podio de campeones':'🌸 Podio anime · En directo'));
  heading.append(make('p',null,finished?
   'Trofeos oficiales de la temporada finalizada.':
   'Clasificación provisional; los premios solo se confirman al cerrar el mes.'));
  podium.append(heading);
  const places=make('div','poll-anime-podium-places');
  const participants=new Map((ranking||[]).map(p=>[Number(p.position),p]));
  for(const place of [2,1,3]){
   places.append(podiumCard(participants.get(place)||null,place,finished));
  }
  podium.append(places);
  host.prepend(podium);
 }
 function trophyCard(record,{memberId,own,isPublic,displayName,profile,pref}={}){
  const prize=monthlyPrizes.find(p=>p.position===Number(record.position));
  if(!prize)return null;
  const item=make('article','poll-month-trophy-card poll-month-trophy-'+prize.glow);
  const shine=make('span','poll-month-trophy-shine','✧ ✦ ✧');
  shine.setAttribute('aria-hidden','true');
  const icon=make('span','poll-month-trophy-icon',prize.icon);
  icon.setAttribute('aria-hidden','true');
  const content=make('div','poll-month-trophy-content');
  content.append(make('strong','poll-month-trophy-name',
   typeof record.badge==='string'&&record.badge?record.badge:prize.name));
  content.append(make('span','poll-month-trophy-month',monthText(record.month_start)));
  content.append(make('span','poll-month-trophy-detail',
   esNumber.format(Number(record.votes_count)||0)+' votos · +'+
   esNumber.format(Number(record.points)||0)+' puntos'));
  item.append(shine,icon,content);
  item.dataset.trophyMonth=record.month_start;
  if(memberId){
   const actions=make('div','poll-month-trophy-buttons');
   const feedback=make('p','poll-month-trophy-share-feedback','');
   feedback.setAttribute('role','status');
   if(own){
    const ceremony=make('button',null,'👑 Ver mi ceremonia');
    ceremony.type='button';
    ceremony.setAttribute('aria-label','Ver ceremonia del trofeo '+prize.name+' de '+monthText(record.month_start));
    ceremony.onclick=()=>window.SBPollAwardCeremony?.openForWinner(memberId,record.month_start,feedback);
    actions.append(ceremony);
    const certificate=make('button',null,'🖼️ Descargar certificado PNG');
    certificate.type='button';
    certificate.setAttribute('aria-label','Descargar certificado de ganador de '+monthText(record.month_start));
    certificate.onclick=()=>window.SBPollAwardCertificate?.downloadOfficial({
     memberId,month:record.month_start,feedback
    });
    actions.append(certificate);
   }
   if(isPublic){
    const share=make('button',null,own?'🔗 Compartir mi trofeo':'🔗 Compartir trofeo');
    share.type='button';
    share.setAttribute('aria-label','Compartir trofeo '+prize.name+' de '+monthText(record.month_start));
    share.onclick=()=>window.SBPollAwardCeremony?.shareTrophy({
     memberId,record,displayName,feedback
    });
    actions.append(share);
   }else if(own){
    feedback.textContent='Tu perfil es privado. Hazlo público para compartir tu trofeo.';
   }
   if(actions.children.length){
    item.append(actions);
    actions.append(feedback);
   }
  }
  window.SBPollHallOfFame?.enhanceTrophyCard(item,record,profile);
  window.SBPollTrophyMuseum?.attachControls(item,{memberId,month:record.month_start,own,pref});
  return item;
 }
 function mountProfileTrophies(host,memberId,options={}){
  if(!host||!memberId)return;
  const own=options.own===true;
  const existing=host.querySelector('.poll-month-trophy-gallery');
  existing?.remove();
  const section=make('section','profile-panel poll-month-trophy-gallery');
  section.setAttribute('aria-label','Galería de trofeos mensuales de encuestas');
  section.append(make('h2',null,'🏆 Trofeos de temporadas de encuestas'));
  section.append(make('p','poll-month-trophy-intro',
   'Insignias conseguidas por quedar en el podio al finalizar una temporada.'));
  const status=make('p','poll-month-trophy-status','Consultando trofeos…');
  status.setAttribute('role','status');
  section.append(status);
  host.append(section);
  (async()=>{
   try{
    const {data,error}=await sb.from('community_poll_season_results')
     .select('month_start,position,points,badge,votes_count')
     .eq('user_id',memberId).lte('position',3)
     .order('month_start',{ascending:false}).limit(60);
    if(!section.isConnected)return;
    status.remove();
    if(error){
     section.append(make('p','poll-month-trophy-status','No se pudo cargar la galería de trofeos.'));
     console.warn('Galería de trofeos de encuestas:',error.message);
     return;
    }
    const awards=(data||[]).filter(r=>r.points>0);
    if(!awards.length){
     // Do not add a blank panel on the public profile of a non-winner.
     if(!own){section.remove();return;}
     section.append(make('p','poll-month-trophy-status',
      'Todavía no has ganado trofeos mensuales. ¡Participa para subir al podio!'));
     const link=make('a','outline-btn mini','🗳️ Participar en encuestas');
     link.href='#/encuestas';section.append(link);
     return;
    }
    const {data:profileData,error:profileError}=await sb.from('profiles')
      .select('is_public,display_name,username,anime_card_style,favorite_anime,avatar_url').eq('id',memberId).maybeSingle();
    if(!section.isConnected)return;
    const prefResult=own?await sb.from('member_poll_trophy_museum')
     .select('month_start,is_featured').eq('user_id',memberId):{data:[],error:null};
    if(!section.isConnected)return;
    if(prefResult.error)console.warn('Favoritos de trofeos:',prefResult.error.message);
    const museumPrefs=new Map((prefResult.data||[]).map(item=>[item.month_start,item]));
    const isPublic=!profileError&&profileData?.is_public===true;
    const displayName=profileData?.display_name||profileData?.username||'Un miembro';
    const summary=make('p','poll-month-trophy-summary',
     '🏅 '+awards.length+' trofeo'+(awards.length===1?'':'s')+
     ' · '+esNumber.format(awards.reduce((n,r)=>n+(Number(r.points)||0),0))+
     ' puntos extra por temporadas');
    section.append(summary);
    const grid=make('div','poll-month-trophy-grid');
    const max=6;
    awards.forEach((item,i)=>{
     const card=trophyCard(item,{memberId,own,isPublic,displayName,profile:profileData,pref:museumPrefs.get(item.month_start)});
     if(!card)return;
     if(i>=max)card.hidden=true;
     grid.append(card);
    });
    section.append(grid);
    const requestedMonth=new URLSearchParams(location.hash.split('?')[1]||'').get('trofeo');
    const requestedCard=requestedMonth&&[...grid.children].find(card=>card.dataset.trophyMonth===requestedMonth);
    if(requestedCard)requestedCard.hidden=false;
    if(awards.length>max){
     let expanded=!!requestedCard;
     const button=make('button','poll-month-trophy-more','Ver todos los trofeos ('+awards.length+')');
     button.type='button';
     if(expanded){
      [...grid.children].forEach(card=>card.hidden=false);
      button.textContent='Ver menos trofeos';
     }
     button.setAttribute('aria-expanded',String(expanded));
     button.onclick=()=>{
      expanded=!expanded;
      for(const [i,card] of [...grid.children].entries())card.hidden=!expanded&&i>=max;
      button.textContent=expanded?'Ver menos trofeos':'Ver todos los trofeos ('+awards.length+')';
      button.setAttribute('aria-expanded',String(expanded));
     };
     section.append(button);
    }
    if(requestedCard){
     requestedCard.classList.add('poll-month-trophy-highlight');
     requestedCard.tabIndex=-1;
     requestAnimationFrame(()=>{
      if(!requestedCard.isConnected)return;
      requestedCard.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      requestedCard.focus({preventScroll:true});
     });
    }
   }catch(error){
    if(section.isConnected){
     status.textContent='No se pudo conectar con la galería de trofeos.';
     console.warn('Galería de trofeos de encuestas:',error);
    }
   }
  })();
 }
 window.SBPollSeasonExtras={mountCountdown,renderPodium,mountProfileTrophies,endOfMadridMonth};
})();
