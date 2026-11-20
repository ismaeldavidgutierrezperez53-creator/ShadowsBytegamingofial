// Salón de la Fama de Encuestas: solo resultados cerrados, perfiles públicos.
(function(){
'use strict';
const PAGE_SIZE=12;
const ranks={
 1:{name:'Rey de Encuestas',emoji:'🥇',tone:'gold',points:100},
 2:{name:'Voz de Plata',emoji:'🥈',tone:'silver',points:50},
 3:{name:'Voz de Bronce',emoji:'🥉',tone:'bronze',points:25}
};
const themes=['sakura','neon','stellar','lunar'];
const num=new Intl.NumberFormat('es-ES');
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const monthLabel=m=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(m+'T12:00:00Z'));
const cleanTheme=s=>themes.includes(s)?s:'sakura';
function miniCard(record,profile,season,preview=false){
 const rank=ranks[Number(record.position)];
 if(!rank)return null;
 const card=make('article','poll-fame-card poll-fame-'+rank.tone+' poll-anime-personal-card');
 card.dataset.animeTheme=cleanTheme(profile?.anime_card_style);
 const mark=make('span','poll-fame-medal',rank.emoji);
 mark.setAttribute('aria-hidden','true');
 const ornament=make('span','poll-fame-ornament','✦ ✿ ✦');
 ornament.setAttribute('aria-hidden','true');
 const text=make('div','poll-fame-text');
 text.append(make('strong','poll-fame-rank-name',record.badge||rank.name));
 const who=preview?'Participante de ejemplo':record.display_name;
 if(who&&record.user_id&&!preview){
  const link=make('a','poll-fame-member',who);
  link.href='#/perfil?id='+encodeURIComponent(record.user_id)+'&trofeo='+encodeURIComponent(season.month_start);
  text.append(link);
 }else{
  text.append(make('span','poll-fame-member',who||
   (Number(record.position)<=Number(season.participant_count)?'Perfil privado':'Sin ganador')));
 }
 if(profile?.favorite_anime&&!preview)text.append(make('span','poll-fame-favorite','🌸 Anime: '+profile.favorite_anime.slice(0,65)));
 text.append(make('span','poll-fame-month',monthLabel(season.month_start)));
 if(record.user_id||preview){
  text.append(make('span','poll-fame-votes',num.format(Number(record.votes_count)||0)+' votos'));
  text.append(make('span','poll-fame-points',preview?'Premio de ejemplo':'+'+num.format(Number(record.points)||0)+' puntos'));
 }else{
  text.append(make('span','poll-fame-hidden',
   Number(record.position)<=Number(season.participant_count)?'Identidad reservada':'Puesto sin adjudicar'));
 }
 card.append(ornament,mark,text);
 if(profile?.avatar_url&&/^https:\/\/[^\s]+$/i.test(profile.avatar_url)&&!preview){
  const avatar=make('img','poll-fame-avatar');
  avatar.src=profile.avatar_url;
  avatar.alt='';
  avatar.loading='lazy';
  avatar.referrerPolicy='no-referrer';
  avatar.onerror=()=>avatar.remove();
  text.prepend(avatar);
 }
 if(preview){
  card.classList.add('poll-fame-sample');
  card.append(make('span','poll-fame-demo-mark','MUESTRA · NO OFICIAL'));
 }
 return card;
}
function enhanceTrophyCard(card,record,profile){
 if(!card||!record||!ranks[Number(record.position)])return;
 card.classList.add('poll-anime-personal-card');
 card.dataset.animeTheme=cleanTheme(profile?.anime_card_style);
 const extra=make('div','poll-month-anime-persona');
 extra.append(make('span','poll-month-anime-kicker','✦ TARJETA DE CAMPEÓN ✦'));
 const name=profile?.display_name||profile?.username;
 if(name)extra.append(make('strong','poll-month-anime-winner',name.slice(0,65)));
 if(profile?.favorite_anime)extra.append(make('span','poll-month-anime-series','🌸 Anime favorito: '+profile.favorite_anime.slice(0,80)));
 const themeLabel={sakura:'🌸 Sakura',neon:'⚡ Neón',stellar:'🌌 Estelar',lunar:'🌙 Lunar'};
 extra.append(make('small','poll-month-anime-style',themeLabel[cleanTheme(profile?.anime_card_style)]));
 const buttons=card.querySelector('.poll-month-trophy-buttons');
 if(buttons)card.insertBefore(extra,buttons);
 else card.append(extra);
}
function previewCard(){
 document.querySelector('.poll-fame-preview-overlay')?.remove();
 const overlay=make('div','poll-fame-preview-overlay');
 const panel=make('div','poll-fame-preview-dialog');
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','Vista previa de tarjetas anime de campeones');
 const previousFocus=document.activeElement;
 const header=make('div','poll-fame-preview-head');
 header.append(make('h3',null,'🎴 Tarjetas anime personalizadas'));
 const close=make('button',null,'✕ Cerrar');
 close.type='button';
 header.append(close);panel.append(header);
 panel.append(make('p','poll-fame-preview-disclaimer','Vista previa de diseño: no entrega premios ni crea ganadores.'));
 const choices=make('div','poll-fame-theme-controls');
 const cards=make('div','poll-fame-grid');
 panel.append(choices,cards);
 const dateParts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 const currentYear=dateParts.find(part=>part.type==='year')?.value;
 const currentMonth=dateParts.find(part=>part.type==='month')?.value;
 const month=currentYear+'-'+currentMonth+'-01';
 function paint(theme){
  choices.replaceChildren();cards.replaceChildren();
  for(const style of themes){
   const btn=make('button','poll-fame-style-button',({sakura:'🌸 Sakura',neon:'⚡ Neón',stellar:'🌌 Estelar',lunar:'🌙 Lunar'})[style]);
   btn.type='button';btn.setAttribute('aria-pressed',String(style===theme));btn.onclick=()=>paint(style);choices.append(btn);
  }
  for(const place of [1,2,3]){
   const r=ranks[place];
   const example={month_start:month,position:place,points:r.points,votes_count:place===1?20:place===2?15:10,badge:r.name};
   cards.append(miniCard(example,{anime_card_style:theme},{month_start:month,participant_count:3},true));
  }
 }
 paint('sakura');
 const key=e=>{if(e.key==='Escape'){e.preventDefault();stop();}};
 const stop=()=>{overlay.remove();document.removeEventListener('keydown',key,true);if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});};
 close.onclick=stop;overlay.onclick=e=>{if(e.target===overlay)stop();};
 overlay.append(panel);document.body.append(overlay);
 document.addEventListener('keydown',key,true);close.focus();
}
let active=0;
function mount(container){
 if(!container?.isConnected)return;
 const token=++active;
 const old=container.querySelector('#poll-hall-of-fame');
 old?.remove();
 const shell=make('section','poll-hall-of-fame');
 shell.id='poll-hall-of-fame';
 const header=make('div','poll-fame-header');
 const intro=make('div');
 intro.append(make('span','poll-fame-eyebrow','SHADOWS BYTE GAMING OFFICIAL'));
 intro.append(make('h3',null,'🏛️ Salón de la Fama'));
 intro.append(make('p',null,'Todos los campeones mensuales de Encuestas. Los resultados son definitivos; los perfiles privados se muestran de forma anónima.'));
 header.append(intro);
 const actions=make('div','poll-fame-header-actions');
 const preview=make('button','poll-fame-preview-button','🎴 Probar tarjetas anime');
 preview.type='button';preview.onclick=previewCard;
 const certificate=make('button','poll-fame-preview-button','🖼️ Probar certificado PNG');
 certificate.type='button';
 const exampleStatus=make('span','poll-fame-example-status','');
 exampleStatus.setAttribute('role','status');
 certificate.onclick=()=>window.SBPollAwardCertificate?.downloadPreview(exampleStatus);
 actions.append(preview,certificate,exampleStatus);
 header.append(actions);shell.append(header);
 const entries=make('div','poll-fame-seasons');
 const feedback=make('p','poll-fame-feedback','Cargando temporadas cerradas…');
 feedback.setAttribute('role','status');
 const load=make('button','poll-fame-more','Ver temporadas anteriores');
 load.type='button';load.hidden=true;
 shell.append(entries,feedback,load);
 container.append(shell);
 let offset=0,loading=false;
 const loadNext=async()=>{
  if(loading||!shell.isConnected)return;
  loading=true;load.disabled=true;load.hidden=true;feedback.textContent='Consultando campeones…';
  try{
   const {data:months,error:monthErr}=await sb.from('community_poll_seasons')
     .select('month_start,participant_count,votes_total,finalized_at')
     .order('month_start',{ascending:false})
     .range(offset,offset+PAGE_SIZE-1);
   if(!shell.isConnected||token!==active)return;
   if(monthErr)throw monthErr;
   const seasons=months||[];
   if(!seasons.length){
    feedback.textContent=offset===0?
     '🌸 El Salón de la Fama se inaugurará cuando termine la primera temporada, al finalizar noviembre de 2026.':
     'Has llegado al inicio del historial de campeones.';
    return;
   }
   const ids=seasons.map(s=>s.month_start);
   const {data:leaders,error:rankErr}=await sb.from('community_poll_season_leaderboard')
    .select('month_start,position,user_id,display_name,votes_count,points,badge')
    .in('month_start',ids).lte('position',3).order('position',{ascending:true}).limit(PAGE_SIZE*3);
   if(!shell.isConnected||token!==active)return;
   if(rankErr)throw rankErr;
   const publicIds=[...new Set((leaders||[]).map(r=>r.user_id).filter(Boolean))];
   let profileRows=[];
   if(publicIds.length){
    const {data}=await sb.from('profiles')
     .select('id,is_public,avatar_url,anime_card_style,favorite_anime')
     .in('id',publicIds).eq('is_public',true);
    if(!shell.isConnected||token!==active)return;
    profileRows=data||[];
   }
   const profiles=new Map(profileRows.map(p=>[p.id,p]));
   const positions=new Map((leaders||[]).map(row=>[row.month_start+':'+row.position,row]));
   const batch=document.createDocumentFragment();
   for(const season of seasons){
    const group=make('section','poll-fame-season');
    group.append(make('h4',null,'🏆 '+monthLabel(season.month_start)));
    group.append(make('p','poll-fame-season-stats',
     num.format(Number(season.participant_count)||0)+' participantes · '+num.format(Number(season.votes_total)||0)+' votos'));
    const grid=make('div','poll-fame-grid');
    for(const place of [1,2,3]){
     const result=positions.get(season.month_start+':'+place)||
      {month_start:season.month_start,position:place,votes_count:0,points:0,badge:ranks[place].name};
     grid.append(miniCard(result,profiles.get(result.user_id),season));
    }
    group.append(grid);batch.append(group);
   }
   entries.append(batch);
   offset+=seasons.length;
   feedback.textContent=num.format(offset)+' temporada'+(offset===1?'':'s')+' consultada'+(offset===1?'':'s')+'.';
   load.hidden=seasons.length<PAGE_SIZE;
  }catch(error){
   if(shell.isConnected&&token===active)feedback.textContent='No se pudo cargar el Salón de la Fama. Pulsa Reintentar.';
   load.hidden=false;load.textContent='↻ Reintentar';
   console.warn('Salón de la Fama:',error);
  }finally{
   loading=false;load.disabled=false;
  }
 };
 load.onclick=()=>loadNext();
 loadNext();
}
window.SBPollHallOfFame={mount,enhanceTrophyCard,previewCard};
})();
