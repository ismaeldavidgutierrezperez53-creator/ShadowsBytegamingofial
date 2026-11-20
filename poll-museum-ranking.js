// Clasificación oficial de trofeos y de museos más populares.
(function(){
 'use strict';
 const prizes=[
  {position:1,emoji:'🥇',name:'Leyenda del Museo',points:100},
  {position:2,emoji:'🥈',name:'Estrella del Museo',points:50},
  {position:3,emoji:'🥉',name:'Promesa del Museo',points:25}
 ];
 const number=new Intl.NumberFormat('es-ES');
 const make=(tag,cls,txt)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(txt!==undefined)n.textContent=txt;return n;
 };
 const monthName=month=>new Intl.DateTimeFormat('es-ES',{
  month:'long',year:'numeric',timeZone:'Europe/Madrid'
 }).format(new Date(month+'T12:00:00Z'));
 const monthNow=()=>{
  const parts=new Intl.DateTimeFormat('en-US',{month:'2-digit',year:'numeric',timeZone:'Europe/Madrid'}).formatToParts(new Date());
  return parts.find(x=>x.type==='year')?.value+'-'+parts.find(x=>x.type==='month')?.value+'-01';
 };
 const idOk=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id||'');
 function rows(root,data,kind){
  root.replaceChildren();
  if(!data?.length){
   root.append(make('p','poll-museum-ranking-empty',
    kind==='live'?'Aún no hay «Me gusta» válidos este mes.':
    kind==='trophies'?'Todavía no hay trofeos públicos valorados.':
    'Todavía no hay premiados en este mes.'));
   return;
  }
  for(const [index,item] of data.entries()){
   const rankingPosition=Number(item.position)||index+1;
   const name=String(item.display_name||'Miembro').slice(0,65);
   const row=make('article','poll-museum-ranking-row');
   const place=make('span','poll-museum-ranking-place',
    prizes[rankingPosition-1]?.emoji||'#'+rankingPosition);
   const content=make('div','poll-museum-ranking-member');
   const owner=item.trophy_owner_id||item.user_id;
   if(idOk(owner)){
    const link=make('a','poll-museum-ranking-name',name);
    link.href='#/perfil?id='+encodeURIComponent(owner)+
     (kind==='trophies'?'&trofeo='+encodeURIComponent(item.month_start):'');
    content.append(link);
   }else content.append(make('strong','poll-museum-ranking-name',name));
   if(kind==='trophies'){
    content.append(make('span','poll-museum-ranking-detail',
     (item.badge||'Trofeo mensual')+' · '+monthName(item.month_start)));
   }else if(kind==='archive'){
    content.append(make('span','poll-museum-ranking-detail',
     (item.badge||prizes[index]?.name||'Museo premiado')+' · +'+
     number.format(Number(item.points)||0)+' puntos'));
   }else{
    content.append(make('span','poll-museum-ranking-detail',
     'Puesto provisional · Únicos «Me gusta» por miembro'));
   }
   const score=make('strong','poll-museum-ranking-score',
    number.format(Number(kind==='trophies'?item.likes_count:item.unique_likes)||0)+
    ' '+(kind==='trophies'?'❤️':'💖'));
   row.append(place,content,score);
   root.append(row);
  }
 }
 function sample(host){
  const node=host.querySelector('.poll-museum-ranking-sample');
  if(node){node.remove();return false;}
  const wrap=make('div','poll-museum-ranking-sample');
  wrap.append(make('p','poll-museum-ranking-sample-note',
   '👁️ MUESTRA DE DISEÑO · Estos miembros y puntuaciones son ficticios. No hay premios entregados.'));
  const list=make('div','poll-museum-ranking-list');
  for(const [i,n] of [14,9,5].entries()){
   const row=make('article','poll-museum-ranking-row');
   row.append(make('span','poll-museum-ranking-place',prizes[i].emoji));
   const detail=make('div','poll-museum-ranking-member');
   detail.append(make('strong','poll-museum-ranking-name','Museo de ejemplo '+(i+1)));
   detail.append(make('span','poll-museum-ranking-detail',
    prizes[i].name+' · Premio futuro: +'+prizes[i].points+' puntos'));
   row.append(detail,make('strong','poll-museum-ranking-score',n+' 💖'));
   list.append(row);
  }
  wrap.append(list);
  host.append(wrap);
  return true;
 }
 let token=0;
 function mount(container){
  if(!container?.isConnected)return;
  container.querySelector('.poll-museum-ranking')?.remove();
  const revision=++token;
  const root=make('section','poll-museum-ranking');
  root.id='poll-museum-ranking';
  const header=make('div','poll-museum-ranking-header');
  const text=make('div');
  text.append(make('span','poll-museum-ranking-eyebrow','SHADOWS BYTE · MUSEO DE TROFEOS'));
  text.append(make('h3',null,'💖 Ranking de trofeos y museos populares'));
  text.append(make('p',null,'Los «Me gusta» de trofeos públicos alimentan el ranking. Los premios se confirman al finalizar cada mes.'));
  const demo=make('button','poll-museum-ranking-button','👁️ Probar clasificación');
  demo.type='button';
  demo.onclick=()=>{demo.textContent=sample(root)?'✕ Ocultar muestra':'👁️ Probar clasificación';};
  header.append(text,demo);root.append(header);
  const prizesRoot=make('div','poll-museum-ranking-prizes');
  for(const prize of prizes){
   const card=make('div','poll-museum-ranking-prize');
   card.append(make('strong',null,prize.emoji+' '+prize.name));
   card.append(make('span',null,'+'+prize.points+' puntos al finalizar el mes'));
   prizesRoot.append(card);
  }
  root.append(prizesRoot);
  const tabs=make('div','poll-museum-ranking-panels');
  const live=make('section','poll-museum-ranking-panel');
  live.append(make('h4',null,'🌸 Museos más populares · '+monthName(monthNow())));
  live.append(make('p','poll-museum-ranking-help',
   'Cada miembro cuenta una sola vez por museo durante el mes, aunque valore varios trofeos. Clasificación provisional.'));
  const liveList=make('div','poll-museum-ranking-list','Consultando ranking mensual…');
  live.append(liveList);
  const best=make('section','poll-museum-ranking-panel');
  best.append(make('h4',null,'❤️ Trofeos con más Me gusta'));
  best.append(make('p','poll-museum-ranking-help',
   'Clasificación histórica de los trofeos exhibidos en perfiles públicos.'));
  const bestList=make('div','poll-museum-ranking-list','Consultando trofeos…');
  best.append(bestList);
  tabs.append(live,best);root.append(tabs);
  const history=make('section','poll-museum-ranking-history');
  history.append(make('h4',null,'🏆 Premios de museos · Temporadas finalizadas'));
  const selector=make('select','poll-museum-ranking-select');
  selector.setAttribute('aria-label','Seleccionar un mes cerrado del museo');
  const archiveList=make('div','poll-museum-ranking-list','Consultando historial…');
  history.append(selector,archiveList);
  root.append(history);
  const status=make('p','poll-museum-ranking-status','');
  status.setAttribute('role','status');
  root.append(status);
  container.append(root);
  const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('museo');
  if(requested==='demo')demo.textContent=sample(root)?'✕ Ocultar muestra':'👁️ Probar clasificación';
  if(requested==='ranking'||requested==='demo'||/^\d{4}-(0[1-9]|1[0-2])-01$/.test(requested||'')){
   root.tabIndex=-1;
   requestAnimationFrame(()=>{
    if(!root.isConnected)return;
    root.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    root.focus({preventScroll:true});
   });
  }
  async function reload(){
   try{
    const [liveData,trophyData,monthData]=await Promise.all([
     sb.from('member_poll_museum_monthly_live')
      .select('month_start,user_id,display_name,unique_likes,first_like_at')
      .eq('month_start',monthNow())
      .order('unique_likes',{ascending:false})
      .order('first_like_at',{ascending:true}).limit(10),
     sb.from('member_poll_museum_trophy_ranking')
      .select('trophy_owner_id,month_start,display_name,badge,likes_count')
      .order('likes_count',{ascending:false})
      .order('month_start',{ascending:false}).limit(10),
     sb.from('member_poll_museum_monthly_seasons')
      .select('month_start,finalized_at')
      .order('month_start',{ascending:false}).limit(24)
    ]);
    if(!root.isConnected||revision!==token)return;
    if(liveData.error||trophyData.error||monthData.error)throw liveData.error||trophyData.error||monthData.error;
    rows(liveList,liveData.data||[],'live');
    rows(bestList,trophyData.data||[],'trophies');
    selector.replaceChildren();
    const months=monthData.data||[];
    if(!months.length){
     selector.disabled=true;
     archiveList.replaceChildren(make('p','poll-museum-ranking-empty',
      'La primera entrega mensual del museo será después del cierre de noviembre de 2026.'));
    }else{
     selector.disabled=false;
     for(const month of months){
      const option=document.createElement('option');option.value=month.month_start;
      option.textContent=monthName(month.month_start);selector.append(option);
     }
     const loadMonth=async()=>{
      const month=selector.value;
      archiveList.replaceChildren(make('p','poll-museum-ranking-help','Cargando ganadores…'));
      const {data,error}=await sb.from('member_poll_museum_monthly_awards')
       .select('month_start,user_id,position,unique_likes,points,badge')
       .eq('month_start',month).order('position',{ascending:true}).limit(3);
      if(!root.isConnected||revision!==token||month!==selector.value)return;
      if(error){archiveList.textContent='No se pudo cargar el historial.';return;}
      const ids=[...new Set((data||[]).map(x=>x.user_id))];
      const profiles=ids.length?await sb.from('profiles')
       .select('id,display_name,username').in('id',ids).eq('is_public',true):{data:[]};
      if(!root.isConnected||revision!==token||month!==selector.value)return;
      const named=new Map((profiles.data||[]).map(p=>[p.id,p.display_name||p.username]));
      rows(archiveList,(data||[]).map(x=>({...x,
       display_name:named.get(x.user_id)||'Ganador privado',
       user_id:named.has(x.user_id)?x.user_id:null})),'archive');
     };
     selector.onchange=loadMonth;await loadMonth();
    }
    status.textContent='Clasificación actualizada.';
   }catch(error){
    if(root.isConnected){status.textContent='No se pudo cargar la clasificación. Prueba a actualizar la página.';console.warn('Ranking de museos:',error);}
   }
  }
  reload();
 }
 window.SBPollMuseumRanking={mount};
})();
