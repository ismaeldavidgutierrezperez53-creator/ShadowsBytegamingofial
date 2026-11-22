/* Historial, ranking general y galería de campeones.
   Solo lectura: premios reales de Supabase; no modifica XP ni saldos. */
(() => {
 'use strict';
 const instances=new WeakMap();
 const PAGE=400;
 const MAX_RECORDS=4000;
 const MAX_EVENTS=1000;
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const dateText=value=>{
  const d=new Date(value);
  return Number.isFinite(d.getTime())?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'Fecha no disponible';
 };
 const publicProfileLink=(id,label)=>{
  const a=make('a','sb-legend-profile-link',label);
  a.href='#/perfil?id='+encodeURIComponent(id);
  return a;
 };
 const batches=(items,size)=>{
  const result=[];
  for(let i=0;i<items.length;i+=size)result.push(items.slice(i,i+size));
  return result;
 };
 async function readPaged(table,columns,configure,max=MAX_RECORDS){
  const out=[];
  for(let start=0;start<max;start+=PAGE){
   const end=Math.min(start+PAGE,max)-1;
   const q=configure(sb.from(table).select(columns));
   const {data,error}=await q.range(start,end);
   if(error)throw new Error(error.message);
   const page=data||[];
   out.push(...page);
   if(page.length<end-start+1)return {rows:out,truncated:false};
  }
  return {rows:out,truncated:true};
 }
 const getAllForIds=async(table,columns,ids)=>{
  const collected=[];
  let truncated=false;
  for(const chunk of batches(ids,70)){
   const result=await readPaged(table,columns,q=>q.in('competition_id',chunk));
   collected.push(...result.rows);
   if(result.truncated)truncated=true;
  }
  return {rows:collected,truncated};
 };
 const getProfiles=async(ids)=>{
  const profiles=new Map();
  for(const chunk of batches(ids,70)){
   const {data,error}=await sb.from('profiles')
    .select('id,display_name,username,avatar_url,is_public')
    .in('id',chunk).eq('is_public',true);
   if(error)throw new Error(error.message);
   for(const profile of data||[])profiles.set(profile.id,profile);
  }
  return profiles;
 };
 const profileName=profile=>profile?.display_name||profile?.username||'Miembro';
 const iconForPlace=place=>({1:'🥇',2:'🥈',3:'🥉'})[place]||'🏅';
 const setEmpty=(node,message)=>{
  node.replaceChildren(make('p','sb-legend-empty',message));
 };
 function renderHistory(container,competitions,entries,awards,profiles){
  container.replaceChildren();
  const finished=competitions.filter(c=>new Date(c.ends_at).getTime()<=Date.now());
  if(!finished.length){
   setEmpty(container,'Todavía no hay torneos ni retos publicados que hayan terminado. Aquí aparecerá el historial cuando finalicen.');
   return;
  }
  const cards=make('div','sb-legend-history-list');
  const createCard=c=>{
   const eventEntries=entries.filter(e=>e.competition_id===c.id);
   const podium=awards.filter(a=>a.competition_id===c.id).sort((a,b)=>a.place-b.place);
   const card=make('article','sb-legend-history-card');
   const date=make('span','sb-legend-date',dateText(c.ends_at));
   const name=make('h4','', (c.kind==='tournament'?'🏆 ':'🎯 ')+c.title);
   const meta=make('div','sb-legend-history-meta');
   meta.append(make('span','',eventEntries.length+' inscripciones visibles'),
    make('span','',podium.length?'Podio confirmado':'Pendiente de resultados oficiales'));
   card.append(date,name,meta);
   if(podium.length){
    const podiumList=make('div','sb-legend-podium');
    for(const prize of podium.slice(0,3)){
     const person=profiles.get(prize.user_id);
     const entry=make('div','sb-legend-podium-entry');
     entry.append(make('span','',iconForPlace(Number(prize.place))+' '+Number(prize.place)+'.º'));
     if(person)entry.append(publicProfileLink(person.id,profileName(person)));
     else entry.append(make('span','','Miembro no público'));
     podiumList.append(entry);
    }
    card.append(podiumList);
   }
   return card;
  };
  for(const c of finished.slice(0,12))cards.append(createCard(c));
  container.append(cards);
  if(finished.length>12){
   const extra=make('details','sb-legend-more');
   extra.append(make('summary','', 'Ver '+(finished.length-12)+' competiciones anteriores'));
   const older=make('div','sb-legend-history-list');
   for(const c of finished.slice(12))older.append(createCard(c));
   extra.append(older);container.append(extra);
  }
 }
 function makeGlobalRows(entries,awards,competitions,profiles){
  const publishedIds=new Set(competitions.map(c=>c.id));
  const result=new Map();
  const ensure=id=>{
   let row=result.get(id);
   if(!row){
    row={id,score:0,completed:0,participations:new Set(),gold:0,silver:0,bronze:0,storePoints:0};
    result.set(id,row);
   }
   return row;
  };
  for(const e of entries){
   if(!publishedIds.has(e.competition_id)||!profiles.has(e.user_id))continue;
   const row=ensure(e.user_id);
   row.participations.add(e.competition_id);
   if(e.completed)row.completed++;
   const score=Number(e.score||0);
   if(Number.isFinite(score)&&score>0)row.score+=score;
  }
  for(const a of awards){
   if(!publishedIds.has(a.competition_id)||!profiles.has(a.user_id))continue;
   const row=ensure(a.user_id);
   const place=Number(a.place);
   if(place===1)row.gold++;
   if(place===2)row.silver++;
   if(place===3)row.bronze++;
   row.storePoints+=Number(a.points)||0;
  }
  return [...result.values()].sort((a,b)=>
   b.gold-a.gold||b.silver-a.silver||b.bronze-a.bronze||
   b.score-a.score||b.completed-a.completed||
   profileName(profiles.get(a.id)).localeCompare(profileName(profiles.get(b.id)),'es')
  );
 }

 const seasonKey=value=>{
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return null;
  return String(date.getUTCFullYear())+'-'+String(Math.floor(date.getUTCMonth()/3)+1);
 };
 const seasonLabel=key=>{
  const match=/^([0-9]{4})-([1-4])$/.exec(key||'');
  if(!match)return 'Temporada';
  return 'Temporada '+match[1]+' · T'+match[2];
 };
 const trophyRules=[
  {icon:'🏅',name:'Primer podio',description:'Conseguir tu primera medalla oficial',kind:'podium',target:1},
  {icon:'🥇',name:'Primer oro',description:'Ganar tu primera competición',kind:'gold',target:1},
  {icon:'🏆',name:'Doble corona',description:'Ganar 2 competiciones',kind:'gold',target:2},
  {icon:'👑',name:'Triple corona',description:'Ganar 3 competiciones',kind:'gold',target:3},
  {icon:'💎',name:'Leyenda del podio',description:'Conseguir 5 podios oficiales',kind:'podium',target:5},
  {icon:'🌟',name:'Maestro de competiciones',description:'Conseguir 10 podios oficiales',kind:'podium',target:10}
 ];
 const trophyProgress=(rule,row)=>{
  if(!row)return 0;
  return rule.kind==='gold'?row.gold:row.gold+row.silver+row.bronze;
 };
 function renderExclusiveTrophies(container,ranking,profiles,viewerId){
  container.replaceChildren();
  container.append(make('p','sb-legend-caption',
   'Trofeos exclusivos de tu colección, basados en medallas oficialmente entregadas. No se conceden puntos de tienda ni XP adicionales.'));
  const myProfile=profiles.get(viewerId);
  const own=ranking.find(row=>row.id===viewerId);
  if(!myProfile){
   container.append(make('p','sb-legend-empty',
    'Para consultar tus trofeos, necesitas tener un perfil público. Las medallas oficiales se muestran solo cuando administración confirma el podio.'));
  }
  const unlocked=myProfile?trophyRules.filter(rule=>trophyProgress(rule,own)>=rule.target).length:0;
  const title=make('div','sb-legend-collection-header');
  title.append(make('h4','','🎖️ Colección de trofeos'),
   make('span','',unlocked+' / '+trophyRules.length+' desbloqueados'));
  container.append(title);
  const gallery=make('div','sb-legend-trophies-grid');
  for(const rule of trophyRules){
   const value=myProfile?trophyProgress(rule,own):0;
   const earned=value>=rule.target;
   const card=make('article','sb-legend-trophy '+(earned?'is-earned':'is-locked'));
   card.append(make('span','sb-legend-trophy-icon',rule.icon),
    make('h5','',rule.name),
    make('p','',rule.description),
    make('strong','sb-legend-trophy-status',earned?'✓ Desbloqueado':'🔒 Pendiente'),
    make('small','',Math.min(value,rule.target)+' / '+rule.target+' '+(rule.kind==='gold'?'victorias':'podios')));
   gallery.append(card);
  }
  container.append(gallery);
 }

 async function mountProfileTrophies(container,memberId){
  if(!container||!memberId||container.querySelector('.sb-legend-profile-trophies'))return;
  const section=make('section','profile-panel sb-legend-profile-trophies');
  const title=make('h2','','🏆 Trofeos competitivos');
  const detail=make('p','sb-legend-caption',
   'Colección de trofeos exclusivos ganados en retos y torneos con podio oficial.');
  const gallery=make('div','sb-legend-profile-trophy-list');
  gallery.textContent='Cargando trofeos…';
  section.append(title,detail,gallery);container.append(section);
  try{
   const result=await readPaged('community_competition_awards','place,competition_id',query=>query.eq('user_id',memberId),1000);
   if(!section.isConnected)return;
   gallery.replaceChildren();
   const medals=result.rows;
   const metrics={gold:medals.filter(a=>Number(a.place)===1).length};
   metrics.podium=medals.filter(a=>[1,2,3].includes(Number(a.place))).length;
   const earned=trophyRules.filter(rule=>trophyProgress(rule,metrics)>=rule.target);
   if(!earned.length){
    gallery.append(make('p','sb-legend-empty',
     'Este miembro todavía no tiene trofeos confirmados. Se desbloquean después de recibir medallas oficiales.'));
   }else{
    for(const rule of earned){
     const badge=make('span','sb-legend-profile-trophy-chip',rule.icon+' '+rule.name);
     badge.title=rule.description;
     gallery.append(badge);
    }
   }
   if(result.truncated)section.append(make('small','',
    'Colección calculada con los primeros 1000 premios consultados.'));
  }catch(error){
   if(section.isConnected)gallery.textContent='No se pudieron cargar los trofeos competitivos.';
  }
 }

 function renderCompetitiveSeasons(container,competitions,entries,awards,profiles){
  container.replaceChildren();
  const bySeason=new Map();
  const current=seasonKey(new Date().toISOString());
  bySeason.set(current,[]);
  for(const item of competitions){
   const key=seasonKey(item.ends_at);
   if(!key)continue;
   if(!bySeason.has(key))bySeason.set(key,[]);
   bySeason.get(key).push(item);
  }
  const seasons=[...bySeason.keys()].sort((a,b)=>b.localeCompare(a));
  const toolbar=make('div','sb-legend-season-toolbar');
  const selector=make('select','sb-legend-season-select');
  selector.setAttribute('aria-label','Elegir temporada competitiva');
  for(const key of seasons){
   const option=make('option','',seasonLabel(key));
   option.value=key;selector.append(option);
  }
  selector.value=current;
  toolbar.append(make('label','', 'Temporada competitiva'),selector);
  const output=make('div','sb-legend-season-content');
  container.append(make('p','sb-legend-caption',
   'Temporadas automáticas de tres meses (T1: enero-marzo, T2: abril-junio, T3: julio-septiembre, T4: octubre-diciembre). Cada reto se asigna por su fecha de finalización, en UTC.'),
   toolbar,output);
  const draw=()=>{
   output.replaceChildren();
   const key=selector.value;
   const selected=bySeason.get(key)||[];
   const ids=new Set(selected.map(c=>c.id));
   const memberEntries=entries.filter(e=>ids.has(e.competition_id));
   const memberAwards=awards.filter(a=>ids.has(a.competition_id));
   const podiumEvents=new Set(memberAwards.map(a=>a.competition_id));
   const finished=selected.filter(c=>new Date(c.ends_at).getTime()<=Date.now());
   const unique=new Set(memberEntries.map(e=>e.user_id));
   const metrics=make('div','sb-legend-season-stats');
   for(const [label,value] of [
    ['🏆 Competiciones',selected.length],
    ['👥 Participantes',unique.size],
    ['✅ Finalizadas',finished.length],
    ['🏅 Podios confirmados',podiumEvents.size]
   ]){
    const tile=make('div','sb-legend-season-stat');
    tile.append(make('strong','',String(value)),make('span','',label));metrics.append(tile);
   }
   const seasonTitle=make('h4','sb-legend-season-title',
    '📆 '+seasonLabel(key)+(key===current?' · En curso':''));
   output.append(seasonTitle,metrics);
   if(!selected.length){
    output.append(make('p','sb-legend-empty','Todavía no hay competiciones publicadas asignadas a esta temporada.'));
    return;
   }
   const seasonRank=makeGlobalRows(memberEntries,memberAwards,selected,profiles);
   const rankTitle=make('h5','sb-legend-season-subtitle','🎯 Clasificación de la temporada');
   output.append(rankTitle);
   if(!seasonRank.length){
    output.append(make('p','sb-legend-empty','Aún no hay resultados públicos para esta temporada.'));
   }else{
    const ol=make('ol','sb-legend-season-ranking');
    for(let i=0;i<Math.min(10,seasonRank.length);i++){
     const member=seasonRank[i];
     const row=make('li','sb-legend-season-ranking-row');
     row.append(make('b','',i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1)+'.º'),
      publicProfileLink(member.id,profileName(profiles.get(member.id))),
      make('span','',member.score.toLocaleString('es-ES')+' puntos de reto'),
      make('small','',member.gold+' oros · '+member.silver+' platas'));
     ol.append(row);
    }
    output.append(ol);
   }
   const events=make('div','sb-legend-season-events');
   events.append(make('h5','sb-legend-season-subtitle','Competiciones de la temporada'));
   for(const comp of selected){
    const card=make('div','sb-legend-season-event');
    card.append(make('strong','',(comp.kind==='challenge'?'🎯 ':'🏆 ')+comp.title),
     make('span','',dateText(comp.ends_at)+' · '+(podiumEvents.has(comp.id)?'Premios entregados':
      new Date(comp.ends_at).getTime()<=Date.now()?'Pendiente de confirmar':'Por finalizar')));
    events.append(card);
   }
   output.append(events);
   const fullyFinished=finished.length===selected.length;
   const hasAnyPodium=podiumEvents.size>0;
   const completedWithResults=finished.filter(c=>
    memberEntries.some(e=>e.competition_id===c.id&&(e.completed||Number(e.score)>0)));
   const allPrizesConfirmed=completedWithResults.every(c=>podiumEvents.has(c.id));
   if(fullyFinished&&hasAnyPodium&&allPrizesConfirmed&&seasonRank.some(row=>row.gold>0)){
    const champion=seasonRank.find(row=>row.gold>0);
    const notice=make('div','sb-legend-season-winner','👑 Campeón de la temporada: ');
    notice.append(publicProfileLink(champion.id,profileName(profiles.get(champion.id))));
    output.prepend(notice);
   }else{
    output.append(make('small','sb-legend-season-hint',
     'La clasificación es provisional hasta que termine la temporada y se confirmen los podios. No se otorgan premios nuevos desde esta sección.'));
   }
  };
  selector.onchange=draw;
  draw();
 }
 function renderHallOfFame(container,ranking,profiles,awards,competitions){
  container.replaceChildren();
  container.append(make('p','sb-legend-caption',
   'Salón de la Fama de miembros con medallas oficiales. Los logros solo se reconocen tras confirmar resultados en Administración.'));
  const honored=ranking.filter(row=>row.gold+row.silver+row.bronze>0);
  if(!honored.length){
   setEmpty(container,'Aún no se han entregado medallas oficiales. Los primeros miembros del Salón de la Fama aparecerán cuando se confirme un podio.');
   return;
  }
  const eventNames=new Map(competitions.map(c=>[c.id,c.title]));
  const gallery=make('div','sb-legend-hall-grid');
  for(let i=0;i<Math.min(honored.length,18);i++){
   const member=honored[i],profile=profiles.get(member.id);
   const card=make('article','sb-legend-hall-card');
   if(i===0)card.classList.add('sb-legend-hall-featured');
   const emblem=make('span','sb-legend-hall-crown',member.gold>=3?'👑':member.gold?'🏆':'🎖️');
   const place=make('span','sb-legend-hall-place','#'+(i+1)+' Histórico');
   const heading=make('h4','');
   heading.append(publicProfileLink(profile.id,profileName(profile)));
   const honor=member.gold>0?(member.gold>=3?'Leyenda competitiva':'Campeón histórico'):'Medallista oficial';
   const medals=make('p','sb-legend-hall-medals',
    '🥇 '+member.gold+' · 🥈 '+member.silver+' · 🥉 '+member.bronze);
   card.append(emblem,place,heading,make('strong','sb-legend-hall-honor',honor),medals);
   const won=awards.filter(a=>a.user_id===member.id&&Number(a.place)===1)
    .sort((a,b)=>new Date(b.awarded_at)-new Date(a.awarded_at));
   if(won.length)card.append(make('small','',
    'Victoria destacada: '+(eventNames.get(won[0].competition_id)||'Competición')));
   const link=publicProfileLink(profile.id,'👤 Ver perfil');
   link.classList.add('sb-legend-hall-link');card.append(link);
   gallery.append(card);
  }
  container.append(gallery);
  if(honored.length>18)container.append(make('p','sb-legend-caption',
   'Se muestran los 18 miembros más destacados. Consulta el Ranking general para ver más posiciones.'));
 }

 function renderRanking(container,ranking,profiles){
  container.replaceChildren();
  const note=make('p','sb-legend-caption',
   'Ordenado por oros, platas, bronces y puntuación acumulada de los retos. Solo cuentan participantes con perfil público. La puntuación no es XP.');
  container.append(note);
  if(!ranking.length){
   container.append(make('p','sb-legend-empty','No hay participantes públicos con resultados todavía.'));
   return;
  }
  const list=make('ol','sb-legend-general-list');
  const rowFor=(item,index)=>{
   const profile=profiles.get(item.id);
   const li=make('li','sb-legend-general-row');
   li.append(make('strong','sb-legend-general-position',index<3?iconForPlace(index+1):String(index+1)+'.º'));
   li.append(publicProfileLink(profile.id,profileName(profile)));
   const trophies=make('span','sb-legend-general-trophies',
    '🥇 '+item.gold+'  🥈 '+item.silver+'  🥉 '+item.bronze);
   const score=make('span','sb-legend-general-score',item.score.toLocaleString('es-ES')+' pts de reto');
   li.append(trophies,score);
   return li;
  };
  for(let i=0;i<Math.min(15,ranking.length);i++)list.append(rowFor(ranking[i],i));
  container.append(list);
  if(ranking.length>15){
   const more=make('details','sb-legend-more');
   more.append(make('summary','', 'Mostrar otros '+(ranking.length-15)+' participantes'));
   const rest=make('ol','sb-legend-general-list');
   for(let i=15;i<ranking.length;i++)rest.append(rowFor(ranking[i],i));
   more.append(rest);container.append(more);
  }
 }
 function renderChampions(container,ranking,profiles,awards,competitions){
  container.replaceChildren();
  const champions=ranking.filter(row=>row.gold>0);
  if(!champions.length){
   setEmpty(container,'Todavía no hay campeones confirmados. Cuando administración entregue los premios al finalizar una competición, sus ganadores aparecerán aquí.');
   return;
  }
  const byId=new Map(competitions.map(c=>[c.id,c]));
  const gallery=make('div','sb-legend-champions-grid');
  for(const champion of champions){
   const profile=profiles.get(champion.id);
   const won=awards.filter(a=>a.user_id===champion.id&&Number(a.place)===1)
    .sort((a,b)=>new Date(b.awarded_at)-new Date(a.awarded_at));
   const last=won[0];
   const card=make('article','sb-legend-champion-card');
   const emblem=make('div','sb-legend-champion-emblem','👑');
   emblem.setAttribute('aria-hidden','true');
   const initial=make('div','sb-legend-champion-avatar',profileName(profile).charAt(0).toLocaleUpperCase('es'));
   const name=make('h4','');
   name.append(publicProfileLink(profile.id,profileName(profile)));
   const title=make('p','sb-legend-champion-title',champion.gold===1?'Campeón oficial':'Campeón · '+champion.gold+' títulos');
   const metrics=make('p','sb-legend-champion-metrics',
    '🥇 '+champion.gold+' oros · 🥈 '+champion.silver+' platas · 🥉 '+champion.bronze+' bronces');
   card.append(emblem,initial,name,title,metrics);
   if(last){
    const tournament=byId.get(last.competition_id);
    card.append(make('p','sb-legend-champion-last',
     'Última victoria: '+(tournament?.title||'Competición')+' · '+dateText(last.awarded_at)));
   }
   const open=publicProfileLink(profile.id,'Ver perfil público');
   open.classList.add('sb-legend-champion-open');
   card.append(open);gallery.append(card);
  }
  container.append(gallery);
 }
 async function load(state){
  const token=++state.token;
  state.status.textContent='Cargando clasificaciones, trofeos y temporadas…';
  state.refresh.disabled=true;
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError)throw new Error(authError.message);
   if(!user){
    if(token!==state.token||!state.root.isConnected)return;
    for(const node of Object.values(state.panels))setEmpty(node,'Inicia sesión para consultar los resultados.');
    state.status.textContent='';return;
   }
   const events=await readPaged('community_competitions','id,title,kind,starts_at,ends_at,status',
    query=>query.eq('status','published').order('ends_at',{ascending:false}),MAX_EVENTS);
   const ids=events.rows.map(c=>c.id);
   const [resultEntries,resultAwards]=await Promise.all([
    getAllForIds('community_competition_entries','competition_id,user_id,score,completed',ids),
    getAllForIds('community_competition_awards','competition_id,user_id,place,points,badge,awarded_at',ids)
   ]);
   const personIds=[...new Set([
    ...resultEntries.rows.map(e=>e.user_id),
    ...resultAwards.rows.map(a=>a.user_id)
   ])];
   const profiles=await getProfiles(personIds);
   if(token!==state.token||!state.root.isConnected)return;
   const entries=resultEntries.rows.filter(e=>profiles.has(e.user_id));
   const awards=resultAwards.rows.filter(a=>profiles.has(a.user_id));
   const ranking=makeGlobalRows(entries,awards,events.rows,profiles);
   renderHistory(state.panels.history,events.rows,entries,resultAwards.rows,profiles);
   renderRanking(state.panels.ranking,ranking,profiles);
   renderChampions(state.panels.champions,ranking,profiles,awards,events.rows);
   renderExclusiveTrophies(state.panels.trophies,ranking,profiles,user.id);
   renderCompetitiveSeasons(state.panels.seasons,events.rows,entries,awards,profiles);
   renderHallOfFame(state.panels.hall,ranking,profiles,awards,events.rows);
   state.status.textContent=(events.truncated||resultEntries.truncated||resultAwards.truncated)
    ?'Alcanzado el límite de consulta. Las clasificaciones muestran solo los registros recuperados.'
    :'Actualizado con los resultados registrados en Supabase.';
  }catch(error){
   if(token!==state.token||!state.root.isConnected)return;
   state.status.textContent='No se pudieron cargar los resultados: '+(error?.message||'Error desconocido');
  }finally{
   if(token===state.token)state.refresh.disabled=false;
  }
 }
 const activate=(state,tab)=>{
  for(const [key,node] of Object.entries(state.panels)){
   node.hidden=key!==tab;
   state.tabs[key].setAttribute('aria-selected',String(key===tab));
   state.tabs[key].tabIndex=key===tab?0:-1;
  }
 };
 const mount=root=>{
  if(!root)return;
  let state=instances.get(root);
  if(state&&state.wrapper.isConnected)return;
  const wrapper=make('section','sb-legends');
  wrapper.id='community-competition-legends';
  wrapper.setAttribute('aria-label','Historial, clasificación general, trofeos, temporadas y Salón de la Fama');
  const heading=make('div','sb-legends-heading');
  const intro=make('div','');
  intro.append(make('h3','','🏆 Leyendas de la comunidad'),
   make('p','','Explora torneos, clasificaciones, trofeos exclusivos, temporadas y el Salón de la Fama.'));
  const refresh=make('button','sb-legends-refresh','↻ Actualizar resultados');
  refresh.type='button';
  heading.append(intro,refresh);wrapper.append(heading);
  const tabsBox=make('div','sb-legends-tabs');
  tabsBox.setAttribute('role','tablist');
  tabsBox.setAttribute('aria-label','Secciones de historial y rankings');
  const status=make('p','sb-legends-status','');
  status.setAttribute('role','status');
  const defs=[['ranking','📊 Ranking general'],['history','📅 Historial'],['champions','👑 Campeones'],['trophies','🏆 Mis trofeos'],['seasons','🗓️ Temporadas'],['hall','🌟 Salón de la Fama']];
  const panels={},tabs={};
  for(const [key,title] of defs){
   const button=make('button','sb-legends-tab',title);
   button.type='button';
   button.id='sb-legends-tab-'+key;
   button.setAttribute('role','tab');
   button.setAttribute('aria-controls','sb-legends-panel-'+key);
   const panel=make('div','sb-legends-panel');
   panel.id='sb-legends-panel-'+key;
   panel.setAttribute('role','tabpanel');
   panel.setAttribute('aria-labelledby',button.id);
   tabs[key]=button;panels[key]=panel;
   button.onclick=()=>activate(state,key);
   tabsBox.append(button);
  }
  wrapper.append(tabsBox,status,...defs.map(([key])=>panels[key]));
  root.append(wrapper);
  state={root,wrapper,tabs,panels,status,refresh,token:0};
  instances.set(root,state);
  refresh.onclick=()=>void load(state);
  activate(state,'ranking');
  void load(state);
 };
 const refresh=root=>{
  const state=instances.get(root);
  if(state&&state.wrapper.isConnected)void load(state);
  else mount(root);
 };
 window.SBCompetitionLegends={mount,refresh,mountProfileTrophies};
})();
