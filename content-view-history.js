/* Shadows Byte Gaming V2 · Visualizaciones automáticas sin identificar.
   El historial nominal solo se activa tras consentimiento informado. */
(function(){
 'use strict';
 if(typeof sb==='undefined')return;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 let user=null,historyEnabled=false,historyChoiceMade=false,authPending=null,scanQueued=false;
 const attemptedPosts=new Set();
 const recentCounts=new Map();
 const watchedPosts=new WeakSet();
 const formatCount=n=>Number(n||0).toLocaleString('es-ES');
 const postObserver=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=0.2){
   postObserver.unobserve(entry.target);
   const article=entry.target;
   setTimeout(()=>{
    if(article.isConnected&&isInViewport(article))registerPost(article).catch(console.warn);
   },550);
  }
 },{threshold:[0,0.2,1]}):null;

 function isInViewport(element){
  const rect=element.getBoundingClientRect();
  return rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<window.innerHeight&&rect.left<window.innerWidth&&rect.right>0;
 }
 function getVisitorId(key){
  try{
   let id=localStorage.getItem(key);
   if(!uuid.test(id||'')){
    id=crypto.randomUUID();
    localStorage.setItem(key,id);
   }
   return id;
  }catch(_){return crypto.randomUUID();}
 }
 function pagePath(){return location.hash.slice(1).split('?')[0]||'/';}
 async function refreshAuth(force=false){
  if(authPending&&!force)return authPending;
  authPending=(async()=>{
   try{
    const {data,error}=await sb.auth.getUser();
    if(error)throw error;
    user=data?.user||null;historyEnabled=false;historyChoiceMade=false;
    if(user){
     const settings=await sb.from('member_content_view_settings')
      .select('enabled').eq('user_id',user.id).maybeSingle();
     if(settings.error){console.warn('Privacidad de visualizaciones:',settings.error.message);historyChoiceMade=true;}
     else historyChoiceMade=!!settings.data;
     historyEnabled=settings.data?.enabled===true;
    }
   }catch(error){console.warn('Visualizaciones, sesión:',error);user=null;historyEnabled=false;}
   document.querySelectorAll('.sb-content-views-preference').forEach(node=>updatePreference(node));
   return user;
  })();
  return authPending;
 }
 function updatePreference(node){
  if(!node.isConnected)return;
  const input=node.querySelector('input');
  const status=node.querySelector('[data-status]');
  const hint=node.querySelector('[data-hint]');
  if(!user){
   input.disabled=true;input.checked=false;
   status.textContent='Sin sesión';
   hint.textContent='Las visualizaciones se cuentan sin mostrar tu identidad.';
  }else{
   input.disabled=false;input.checked=historyEnabled;
   status.textContent=!historyChoiceMade?'Elige si mostrar tu nombre':historyEnabled?'Historial visible':'Historial privado';
   hint.textContent='Los contadores son automáticos. Si permites el historial, los autores verán tu nombre al leer sus noticias o publicaciones. Puedes desactivarlo cuando quieras y borrar tus visitas identificadas.';
  }
 }
 function mountPreference(){
  if(!['/comunidad','/noticias','/noticia','/cuenta','/perfil'].includes(pagePath()))return;
  const page=document.querySelector('#app > .page');
  if(!page||page.querySelector('.sb-content-views-preference'))return;
  const box=document.createElement('section');box.className='sb-content-views-preference';
  const label=document.createElement('label');
  const checkbox=document.createElement('input');checkbox.type='checkbox';
  const caption=document.createElement('span');caption.textContent='👁️ Mostrar mi nombre a los autores cuando vea contenido';
  label.append(checkbox,caption);
  const status=document.createElement('strong');status.dataset.status='';
  const hint=document.createElement('small');hint.dataset.hint='';
  checkbox.onchange=async()=>{
   checkbox.disabled=true;status.textContent='Guardando preferencia…';
   try{await saveHistoryDecision(checkbox.checked);}
   catch(error){console.error('Preferencia de historial:',error);status.textContent='No se pudo guardar. Inténtalo de nuevo.';}
   finally{updatePreference(box);}
  };
  box.append(label,status,hint);
  const hero=page.querySelector('.page-hero');
  if(hero)hero.after(box);else page.prepend(box);
  updatePreference(box);
 }

 async function saveHistoryDecision(enabled){
  if(!user)throw new Error('Debes iniciar sesión.');
  const {error}=await sb.rpc('content_set_view_history',{p_enabled:Boolean(enabled)});
  if(error)throw error;
  historyEnabled=Boolean(enabled);
  historyChoiceMade=true;
  document.querySelectorAll('.sb-content-views-preference').forEach(updatePreference);
  document.querySelectorAll('.sb-content-view-consent').forEach(node=>node.remove());
  if(enabled){
   // A visitor may already have opened an item before granting permission.
   attemptedPosts.clear();
   for(const article of document.querySelectorAll('.social-post[data-post-id]')){
    if(isInViewport(article))registerPost(article).catch(console.warn);
   }
   const newsId=document.querySelector('#sb-news-interactions[data-news-id]')?.dataset.newsId;
   if(uuid.test(newsId||'')){
    sb.rpc('news_record_view',{
     p_news_id:newsId,p_visitor_id:getVisitorId('sb-news-visit-v1:'+newsId)
    }).then(({error})=>{if(error)console.warn('Lector de noticia:',error.message);});
   }
  }
 }
 function ensureConsentNotice(){
  const page=document.querySelector('#app > .page');
  const onContentPage=['/comunidad','/noticias','/noticia','/cuenta','/perfil'].includes(pagePath());
  const exists=document.querySelector('.sb-content-view-consent');
  if(!page||!onContentPage||!user||historyChoiceMade){
   if(exists)exists.remove();
   return;
  }
  if(exists)return;
  const section=document.createElement('section');
  section.className='sb-content-view-consent';
  section.setAttribute('aria-label','Privacidad de las visualizaciones');
  const title=document.createElement('h2');
  title.textContent='👁️ ¿Quieres aparecer entre quienes han visto una noticia o publicación?';
  const information=document.createElement('p');
  information.textContent='El número de visualizaciones se cuenta automáticamente. Si das permiso, el autor podrá ver tu nombre, perfil y fecha de visita cuando leas su contenido. Si no lo permites, tu identidad no aparecerá. Podrás cambiar la decisión y borrar tu historial desde esta sección.';
  const choices=document.createElement('div');
  choices.className='sb-content-view-consent-choices';
  const yes=document.createElement('button');yes.type='button';
  yes.textContent='Permitir mostrar mi nombre';yes.className='sb-content-view-consent-button';
  const no=document.createElement('button');no.type='button';
  no.textContent='Continuar en privado';no.className='sb-content-view-consent-button';
  const state=document.createElement('small');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
  const setChoice=async enabled=>{
   yes.disabled=no.disabled=true;
   state.textContent='Guardando tu elección…';
   try{
    await saveHistoryDecision(enabled);
   }catch(error){
    console.warn('Permiso de visualizaciones:',error);
    yes.disabled=no.disabled=false;
    state.textContent='No se pudo guardar tu elección. Vuelve a intentarlo.';
   }
  };
  yes.onclick=()=>setChoice(true);
  no.onclick=()=>setChoice(false);
  choices.append(yes,no);
  section.append(title,information,choices,state);
  const preference=page.querySelector('.sb-content-views-preference');
  if(preference)preference.after(section);
  else (page.querySelector('.page-hero')||page).after(section);
 }
 function makeCount(text){
  const span=document.createElement('span');span.className='sb-content-view-count';
  span.textContent=text;return span;
 }
 function makeReadersButton(kind,id){
  const btn=document.createElement('button');btn.type='button';
  btn.className='sb-content-view-readers';btn.textContent='👥 Quién lo vio';
  btn.onclick=()=>openViewers(kind,id);
  return btn;
 }
 function makeStatsButton(kind,id){
  const btn=document.createElement('button');btn.type='button';
  btn.className='sb-content-view-readers sb-content-view-stats';
  btn.textContent='📊 Estadísticas';btn.hidden=true;
  btn.onclick=()=>openStats(kind,id);
  return btn;
 }
 async function scanNewsCards(){
  const cards=[...document.querySelectorAll('.news-card:not([data-sb-content-views])')];
  const valid=[];
  for(const card of cards){
   card.dataset.sbContentViews='yes';
   const href=card.querySelector('a[href^="#/noticia?id="]')?.getAttribute('href')||'';
   const id=new URLSearchParams(href.split('?')[1]||'').get('id');
   if(!uuid.test(id||''))continue;
   const count=makeCount('👁 Consultando visitas…');
   count.classList.add('sb-news-card-count');
   const stats=makeStatsButton('news',id);
   (card.querySelector('.news-date')||card.querySelector('h3')||card).after(count,stats);
   valid.push({id,count,stats});
  }
  if(!valid.length)return;
  const ids=[...new Set(valid.map(item=>item.id))].slice(0,100);
  const {data,error}=await sb.rpc('content_news_view_counts',{p_ids:ids});
  const counts=new Map((data||[]).map(row=>[row.news_id,row.views]));
  for(const item of valid)if(item.count.isConnected){
   item.count.textContent=error?'👁 Visitas no disponibles':'👁 '+formatCount(counts.get(item.id))+' visitas';
  }
  const viewer=await refreshAuth();
  if(!viewer)return;
  const [articles,staff]=await Promise.all([
   sb.from('news').select('id,author_id').in('id',ids),
   sb.from('site_staff_roles').select('role').eq('user_id',viewer.id).maybeSingle()
  ]);
  const authors=new Map((articles.data||[]).map(item=>[item.id,item.author_id]));
  const role=staff.data?.role;
  const canModerate=viewer.app_metadata?.role==='admin'||role==='owner'||role==='admin';
  for(const item of valid)if(item.stats.isConnected){
   item.stats.hidden=!(canModerate||authors.get(item.id)===viewer.id);
  }
 }
 async function registerPost(article){
  const id=article.dataset.postId;
  if(!uuid.test(id||'')||attemptedPosts.has(id))return;
  attemptedPosts.add(id);
  try{
   const {data,error}=await sb.rpc('content_record_post_view',{
    p_post_id:id,p_visitor_id:getVisitorId('sb-post-visit-v1:'+id)
   });
   if(error)throw error;
   recentCounts.set(id,data);
   document.querySelectorAll('.social-post[data-post-id]').forEach(node=>{
    if(node.dataset.postId===id){
     const counter=node.querySelector('.sb-content-view-count');
     if(counter)counter.textContent='👁 '+formatCount(data)+' visualizaciones';
    }
   });
  }catch(error){attemptedPosts.delete(id);console.warn('Visitas de publicación:',error);}
 }
 async function scanPosts(){
  const cards=[...document.querySelectorAll('.social-post[data-post-id]:not([data-sb-content-views])')].filter(a=>uuid.test(a.dataset.postId||''));
  if(!cards.length)return;
  for(const article of cards){
   article.dataset.sbContentViews='yes';
   const bar=document.createElement('div');bar.className='sb-content-view-bar';
   bar.append(makeCount('👁 Consultando visualizaciones…'));
   const readers=makeReadersButton('post',article.dataset.postId);readers.hidden=true;
   bar.append(readers,makeStatsButton('post',article.dataset.postId));
   const likes=article.querySelector('.post-like-box,.sb-anime-reaction-bar');
   if(likes)likes.before(bar);else article.append(bar);
   if(postObserver){watchedPosts.add(article);postObserver.observe(article);}
   else if(isInViewport(article))registerPost(article).catch(console.warn);
  }
  const ids=[...new Set(cards.map(card=>card.dataset.postId))].slice(0,100);
  const [countsResult,postResult]=await Promise.all([
   sb.rpc('content_post_view_counts',{p_ids:ids}),
   sb.from('member_posts').select('id,author_id').in('id',ids)
  ]);
  const counts=new Map((countsResult.data||[]).map(r=>[r.post_id,r.views]));
  const authors=new Map((postResult.data||[]).map(r=>[r.id,r.author_id]));
  await refreshAuth();
  for(const article of cards)if(article.isConnected){
   const id=article.dataset.postId;
   const counter=article.querySelector('.sb-content-view-count');
   if(counter)counter.textContent=countsResult.error&&!recentCounts.has(id)?'👁 Visitas no disponibles':'👁 '+formatCount(recentCounts.has(id)?recentCounts.get(id):counts.get(id))+' visualizaciones';
   const readers=article.querySelector('.sb-content-view-readers');
   if(readers)readers.hidden=!(user&&authors.get(id)===user.id);
   const stats=article.querySelector('.sb-content-view-stats');
   if(stats)stats.hidden=!(user&&authors.get(id)===user.id);
  }
 }
 async function scanNewsArticle(){
  const section=document.querySelector('#sb-news-interactions[data-news-id]:not([data-sb-content-views])');
  if(!section||!uuid.test(section.dataset.newsId||''))return;
  section.dataset.sbContentViews='yes';
  const id=section.dataset.newsId;
  const bar=section.querySelector('.sb-news-engagement');
  if(!bar)return;
  const readers=makeReadersButton('news',id);
  readers.hidden=true;
  const stats=makeStatsButton('news',id);
  bar.append(readers,stats);
  const viewer=await refreshAuth();
  if(!viewer||!section.isConnected)return;
  const isMetaAdmin=viewer.app_metadata?.role==='admin';
  const [newsResult,staffResult]=await Promise.all([
   sb.from('news').select('author_id').eq('id',id).maybeSingle(),
   sb.from('site_staff_roles').select('role').eq('user_id',viewer.id).maybeSingle()
  ]);
  const role=staffResult.data?.role;
  if(!section.isConnected)return;
  readers.hidden=!(newsResult.data?.author_id===viewer.id||isMetaAdmin||role==='owner'||role==='admin');
  stats.hidden=readers.hidden;
 }
 function buildViewer(name,id,avatarUrl,time){
  const link=document.createElement('a');link.className='sb-content-view-person';
  link.href='#/perfil?id='+encodeURIComponent(id);
  const avatar=document.createElement('span');avatar.className='sb-content-view-avatar';
  if(/^https:\/\//i.test(avatarUrl||'')&&!/\.(?:mp4|webm|mov)(?:[?#]|$)/i.test(avatarUrl)){
   const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=avatarUrl;
   img.onerror=()=>{img.remove();avatar.textContent=name.slice(0,1).toUpperCase();};
   avatar.append(img);
  }else avatar.textContent=name.slice(0,1).toUpperCase();
  const meta=document.createElement('span');meta.className='sb-content-view-person-meta';
  const title=document.createElement('strong');title.textContent=name;
  const date=document.createElement('small');date.textContent=new Date(time).toLocaleString('es-ES');
  meta.append(title,date);link.append(avatar,meta);
  return link;
 }
 async function openViewers(kind,id){
  if(!uuid.test(id||''))return;
  const previous=document.activeElement;
  document.querySelector('.sb-content-views-overlay')?.remove();
  const overlay=document.createElement('div');overlay.className='sb-content-views-overlay';
  const modal=document.createElement('section');modal.className='sb-content-views-modal';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','sb-content-views-heading');
  const heading=document.createElement('h2');heading.id='sb-content-views-heading';
  heading.textContent=kind==='news'?'👁 Lectores de la noticia':'👁 Quién vio la publicación';
  const close=document.createElement('button');close.type='button';close.className='sb-content-view-close';
  close.textContent='✕';close.setAttribute('aria-label','Cerrar');
  const detail=document.createElement('p');detail.className='sb-content-view-help';
  detail.textContent='Solo aparecen los miembros que han permitido mostrar su nombre. Las demás visitas permanecen anónimas.';
  const list=document.createElement('div');list.className='sb-content-view-list';
  list.textContent='Cargando visitantes…';
  const dismiss=()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('hashchange',dismiss);overlay.remove();if(previous?.isConnected)previous.focus();};
  const onKey=event=>{
   if(event.key==='Escape')dismiss();
   if(event.key==='Tab'){
    const controls=[close,...list.querySelectorAll('a[href]')].filter(item=>item.isConnected);
    const i=controls.indexOf(document.activeElement);
    if(event.shiftKey&&i===0){event.preventDefault();controls[controls.length-1].focus();}
    if(!event.shiftKey&&i===controls.length-1){event.preventDefault();controls[0].focus();}
   }
  };
  close.onclick=dismiss;
  overlay.onclick=event=>{if(event.target===overlay)dismiss();};
  document.addEventListener('keydown',onKey);window.addEventListener('hashchange',dismiss);
  modal.append(close,heading,detail,list);overlay.append(modal);document.body.append(overlay);close.focus();
  try{
   const table=kind==='news'?'news_member_views':'member_post_views';
   const field=kind==='news'?'news_id':'post_id';
   const {data,error}=await sb.from(table)
    .select('viewer_id,viewed_at').eq(field,id).order('viewed_at',{ascending:false}).limit(100);
   if(!overlay.isConnected)return;
   if(error)throw error;
   list.replaceChildren();
   if(!data?.length){list.textContent='Aún no hay lectores identificados para este contenido.';return;}
   const ids=[...new Set(data.map(row=>row.viewer_id))];
   const res=await sb.from('profiles').select('id,username,display_name,avatar_url').in('id',ids).eq('is_public',true);
   if(!overlay.isConnected)return;
   if(res.error)throw res.error;
   const profiles=new Map((res.data||[]).map(member=>[member.id,member]));
   for(const item of data){
    const member=profiles.get(item.viewer_id);
    if(!member)continue;
    list.append(buildViewer(member.display_name||member.username||'Miembro',member.id,member.avatar_url,item.viewed_at));
   }
   if(!list.children.length)list.textContent='No hay visitantes con perfiles públicos en esta lista.';
  }catch(error){
   console.warn('Historial de visualizaciones:',error);
   if(overlay.isConnected)list.textContent='No se puede mostrar esta lista. Comprueba que seas el autor o administrador.';
  }
 }

 function formatAnalyticsDate(value,period){
  const date=new Date(value+'T12:00:00');
  const opts=period==='month'?{month:'short',year:'2-digit'}:{day:'numeric',month:'short'};
  return new Intl.DateTimeFormat('es-ES',opts).format(date);
 }
 function openStats(kind,id){
  if(!uuid.test(id||''))return;
  const previous=document.activeElement;
  document.querySelector('.sb-content-views-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='sb-content-views-overlay';
  const modal=document.createElement('section');
  modal.className='sb-content-views-modal sb-analytics-modal';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','sb-content-analytics-heading');
  const close=document.createElement('button');
  close.type='button';close.className='sb-content-view-close';
  close.textContent='✕';close.setAttribute('aria-label','Cerrar estadísticas');
  const heading=document.createElement('h2');heading.id='sb-content-analytics-heading';
  heading.textContent=kind==='news'?'📊 Estadísticas de la noticia':'📊 Estadísticas de la publicación';
  const help=document.createElement('p');help.className='sb-content-view-help';
  help.textContent='Visitantes únicos por primera visualización. Fechas en horario de España. Solo tú puedes ver estas estadísticas.';
  const tabs=document.createElement('div');tabs.className='sb-analytics-tabs';
  tabs.setAttribute('aria-label','Agrupar visitas por período');
  const periods=[['day','Días'],['week','Semanas'],['month','Meses']];
  const tabButtons=periods.map(([period,label])=>{
   const btn=document.createElement('button');btn.type='button';
   btn.textContent=label;btn.dataset.period=period;
   btn.setAttribute('aria-pressed',period==='day'?'true':'false');
   btn.onclick=()=>load(period);
   tabs.append(btn);return btn;
  });
  const summary=document.createElement('div');summary.className='sb-analytics-summary';
  const status=document.createElement('p');status.className='sb-analytics-status';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const viewport=document.createElement('div');viewport.className='sb-analytics-chart-scroll';
  const chart=document.createElement('div');chart.className='sb-analytics-bars';
  chart.setAttribute('role','group');chart.setAttribute('aria-label','Visualizaciones por período');
  viewport.append(chart);
  const dismiss=()=>{
   document.removeEventListener('keydown',onKey);
   window.removeEventListener('hashchange',dismiss);
   overlay.remove();
   if(previous?.isConnected)previous.focus();
  };
  const onKey=event=>{
   if(event.key==='Escape')dismiss();
   if(event.key==='Tab'){
    const controls=[close,...tabButtons].filter(item=>item.isConnected);
    const pos=controls.indexOf(document.activeElement);
    if(event.shiftKey&&pos===0){event.preventDefault();controls[controls.length-1].focus();}
    else if(!event.shiftKey&&pos===controls.length-1){event.preventDefault();controls[0].focus();}
   }
  };
  close.onclick=dismiss;
  overlay.onclick=event=>{if(event.target===overlay)dismiss();};
  modal.append(close,heading,help,tabs,summary,status,viewport);
  overlay.append(modal);document.body.append(overlay);
  document.addEventListener('keydown',onKey);
  window.addEventListener('hashchange',dismiss);
  close.focus();
  const totalsPromise=sb.rpc(
   kind==='news'?'content_news_view_counts':'content_post_view_counts',
   {p_ids:[id]}
  );
  let revision=0;
  async function load(period){
   const rev=++revision;
   tabButtons.forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.period===period?'true':'false'));
   status.textContent='Cargando estadísticas…';
   summary.replaceChildren();chart.replaceChildren();
   try{
    const [seriesResult,totalsResult]=await Promise.all([
     sb.rpc('content_view_analytics',{p_kind:kind,p_content_id:id,p_period:period}),
     totalsPromise
    ]);
    if(rev!==revision||!overlay.isConnected)return;
    if(seriesResult.error)throw seriesResult.error;
    const rows=seriesResult.data||[];
    const total=rows.reduce((acc,row)=>acc+Number(row.views||0),0);
    const max=Math.max(0,...rows.map(row=>Number(row.views||0)));
    const key=kind==='news'?'news_id':'post_id';
    const lifetime=totalsResult.error?null:
     Number((totalsResult.data||[]).find(item=>item[key]===id)?.views||0);
    const periodName=period==='day'?'14 días':period==='week'?'12 semanas':'12 meses';
    const figures=[
     ['Total histórico',lifetime===null?'—':formatCount(lifetime)],
     ['Últimos '+periodName,formatCount(total)],
     ['Máximo por '+(period==='day'?'día':period==='week'?'semana':'mes'),formatCount(max)]
    ];
    for(const [label,value] of figures){
     const card=document.createElement('div');card.className='sb-analytics-number';
     const big=document.createElement('strong');big.textContent=value;
     const small=document.createElement('span');small.textContent=label;
     card.append(big,small);summary.append(card);
    }
    chart.style.setProperty('--sb-bars',String(rows.length));
    for(const row of rows){
     const value=Number(row.views||0);
     const label=formatAnalyticsDate(row.bucket_start,period);
     const column=document.createElement('div');column.className='sb-analytics-column';
     column.setAttribute('role','img');
     column.setAttribute('aria-label',label+': '+formatCount(value)+' visitantes únicos');
     const number=document.createElement('strong');number.textContent=formatCount(value);
     const frame=document.createElement('div');frame.className='sb-analytics-bar-frame';
     const fill=document.createElement('span');fill.className='sb-analytics-bar-fill';
     fill.style.height=(max===0?0:Math.max(4,Math.round(value/max*100)))+'%';
     frame.append(fill);
     const date=document.createElement('small');date.textContent=label;
     column.append(number,frame,date);chart.append(column);
    }
    status.textContent=total===0
     ?'Todavía no hay visualizaciones en este período. El gráfico se actualizará con nuevas visitas.'
     :'Mostrando '+formatCount(total)+' visitantes únicos registrados en este período.';
   }catch(error){
    if(rev!==revision||!overlay.isConnected)return;
    console.warn('Estadísticas de visualizaciones:',error);
    status.textContent='No se pudieron cargar las estadísticas. Comprueba que eres el autor o administrador.';
   }
  }
  load('day');
 }

 function mountStatisticsEntry(){
  const path=pagePath();
  const previous=document.querySelector('.sb-content-stats-entry');
  if(!user||!['/noticias','/comunidad'].includes(path)){
   previous?.remove();
   return;
  }
  const page=document.querySelector('#app > .page');
  if(!page||page.querySelector('.sb-content-stats-entry'))return;
  const entry=document.createElement('div');entry.className='sb-content-stats-entry';
  const button=document.createElement('button');
  button.type='button';button.className='sb-content-stats-entry-button';
  button.textContent='📊 Mis estadísticas';
  const label=document.createElement('small');
  label.textContent='Panel general, contenidos más vistos y gráficos de tus noticias y publicaciones.';
  button.onclick=openMyStatistics;
  entry.append(button,label);
  const preference=page.querySelector('.sb-content-views-preference');
  if(preference)preference.after(entry);
  else (page.querySelector('.page-hero')||page).prepend(entry);
 }
 async function syncStatisticsPermissions(){
  const postCards=[...document.querySelectorAll('.social-post[data-post-id]')].filter(node=>node.querySelector('.sb-content-view-stats'));
  const newsCards=[...document.querySelectorAll('.news-card')].filter(node=>node.querySelector('.sb-content-view-stats'));
  const articles=[...document.querySelectorAll('#sb-news-interactions[data-news-id]')].filter(node=>node.querySelector('.sb-content-view-stats'));
  const viewer=await refreshAuth();
  mountStatisticsEntry();
  if(!viewer){
   for(const node of [...postCards,...newsCards,...articles]){
    const stats=node.querySelector('.sb-content-view-stats');
    if(stats)stats.hidden=true;
   }
   return;
  }
  const postIds=[...new Set(postCards.map(node=>node.dataset.postId).filter(id=>uuid.test(id||'')))].slice(0,100);
  const newsIdOfCard=card=>{
   const href=card.querySelector('a[href^="#/noticia?id="]')?.getAttribute('href')||'';
   return new URLSearchParams(href.split('?')[1]||'').get('id');
  };
  const newsIds=[...new Set([...newsCards.map(newsIdOfCard),...articles.map(node=>node.dataset.newsId)].filter(id=>uuid.test(id||'')))].slice(0,100);
  const [posts,news,staff]=await Promise.all([
   postIds.length?sb.from('member_posts').select('id,author_id').in('id',postIds):Promise.resolve({data:[]}),
   newsIds.length?sb.from('news').select('id,author_id').in('id',newsIds):Promise.resolve({data:[]}),
   sb.from('site_staff_roles').select('role').eq('user_id',viewer.id).maybeSingle()
  ]);
  // Ignore results from a session that has changed while these requests were running.
  if(!user||user.id!==viewer.id)return;
  const postAuthors=new Map((posts.data||[]).map(item=>[item.id,item.author_id]));
  const newsAuthors=new Map((news.data||[]).map(item=>[item.id,item.author_id]));
  const isStaff=viewer.app_metadata?.role==='admin'||['owner','admin'].includes(staff.data?.role);
  for(const node of postCards){
   const own=postAuthors.get(node.dataset.postId)===viewer.id;
   const stats=node.querySelector('.sb-content-view-stats');
   const viewers=node.querySelector('.sb-content-view-readers:not(.sb-content-view-stats)');
   if(stats)stats.hidden=!own;
   if(viewers)viewers.hidden=!own;
  }
  for(const node of newsCards){
   const stats=node.querySelector('.sb-content-view-stats');
   if(stats)stats.hidden=!(isStaff||newsAuthors.get(newsIdOfCard(node))===viewer.id);
  }
  for(const node of articles){
   const allowed=isStaff||newsAuthors.get(node.dataset.newsId)===viewer.id;
   const stats=node.querySelector('.sb-content-view-stats');
   const viewers=node.querySelector('.sb-content-view-readers:not(.sb-content-view-stats)');
   if(stats)stats.hidden=!allowed;
   if(viewers)viewers.hidden=!allowed;
  }
 }
 function openMyStatistics(){
  if(!user)return;
  const previous=document.activeElement;
  document.querySelector('.sb-content-views-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='sb-content-views-overlay';
  const modal=document.createElement('section');
  modal.className='sb-content-views-modal sb-analytics-index-modal';
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','sb-analytics-index-heading');
  const close=document.createElement('button');
  close.type='button';close.className='sb-content-view-close';
  close.textContent='✕';close.setAttribute('aria-label','Cerrar');
  const heading=document.createElement('h2');
  heading.id='sb-analytics-index-heading';heading.textContent='📊 Mis estadísticas';
  const intro=document.createElement('p');intro.className='sb-content-view-help';
  intro.textContent='Consulta tus visitas totales y los contenidos más vistos, o elige una noticia o publicación para ver su gráfico individual.';
  const tabs=document.createElement('div');tabs.className='sb-analytics-tabs';
  const kinds=[['overview','🌐 General'],['news','📰 Noticias'],['post','💬 Publicaciones']];
  const buttons=kinds.map(([kind,label])=>{
   const button=document.createElement('button');button.type='button';
   button.dataset.kind=kind;button.textContent=label;
   button.onclick=()=>load(kind);tabs.append(button);return button;
  });
  const state=document.createElement('p');
  state.className='sb-analytics-status';
  state.setAttribute('role','status');state.setAttribute('aria-live','polite');
  const list=document.createElement('div');list.className='sb-analytics-index-list';
  const dismiss=()=>{
   document.removeEventListener('keydown',onKey);
   window.removeEventListener('hashchange',dismiss);
   overlay.remove();
   if(previous?.isConnected)previous.focus();
  };
  const onKey=event=>{
   if(event.key==='Escape')dismiss();
   if(event.key==='Tab'){
    const controls=[close,...buttons,...list.querySelectorAll('button')].filter(node=>node.isConnected);
    const i=controls.indexOf(document.activeElement);
    if(i===0&&event.shiftKey){event.preventDefault();controls[controls.length-1].focus();}
    if(i===controls.length-1&&!event.shiftKey){event.preventDefault();controls[0].focus();}
   }
  };
  close.onclick=dismiss;
  overlay.onclick=event=>{if(event.target===overlay)dismiss();};
  modal.append(close,heading,intro,tabs,state,list);
  overlay.append(modal);document.body.append(overlay);
  document.addEventListener('keydown',onKey);
  window.addEventListener('hashchange',dismiss);
  close.focus();

  let version=0;
  async function loadOverview(){
   list.classList.add('sb-analytics-overview-list');
   const panel=document.createElement('div');
   panel.className='sb-analytics-overview';
   const periodTabs=document.createElement('div');
   periodTabs.className='sb-analytics-period-tabs';
   periodTabs.setAttribute('aria-label','Agrupación de las visualizaciones');
   const periods=[['day','Días'],['week','Semanas'],['month','Meses']];
   const cards=document.createElement('div');
   cards.className='sb-analytics-overview-cards';
   const chartBox=document.createElement('section');
   chartBox.className='sb-analytics-overview-chart';
   const topBox=document.createElement('section');
   topBox.className='sb-analytics-overview-ranking';
   panel.append(periodTabs,cards,chartBox,topBox);
   list.append(panel);
   const periodButtons=periods.map(([period,title])=>{
    const button=document.createElement('button');
    button.type='button';button.textContent=title;
    button.dataset.period=period;
    button.onclick=()=>refresh(period);
    periodTabs.append(button);
    return button;
   });
   async function refresh(period){
    const request=++version;
    periodButtons.forEach(button=>
     button.setAttribute('aria-pressed',String(button.dataset.period===period)));
    state.textContent='Cargando el panel general…';
    cards.replaceChildren();chartBox.replaceChildren();topBox.replaceChildren();
    try{
     const {data,error}=await sb.rpc('content_view_overview',{p_period:period});
     if(request!==version||!overlay.isConnected||!panel.isConnected)return;
     if(error)throw error;
     const summary=data?.summary||{};
     const trend=Array.isArray(data?.trend)?data.trend:[];
     const ranking=Array.isArray(data?.top)?data.top:[];
     const newsViews=Number(summary.news_views||0);
     const postViews=Number(summary.post_views||0);
     const newsCount=Number(summary.news_count||0);
     const postCount=Number(summary.post_count||0);
     const values=[
      [formatCount(Number(summary.total_views||0)),'👁️ Visualizaciones totales'],
      [formatCount(newsViews),'📰 Visitas a noticias'],
      [formatCount(postViews),'💬 Visitas a publicaciones'],
      [formatCount(newsCount+postCount),'📄 Contenidos · '+formatCount(newsCount)+' noticias / '+formatCount(postCount)+' publicaciones']
     ];
     for(const [number,label] of values){
      const card=document.createElement('div');
      card.className='sb-analytics-number';
      const big=document.createElement('strong');big.textContent=number;
      const small=document.createElement('span');small.textContent=label;
      card.append(big,small);cards.append(card);
     }
     const header=document.createElement('h3');
     header.textContent='📈 Evolución de las visualizaciones';
     const explanation=document.createElement('p');
     explanation.className='sb-content-view-help';
     explanation.textContent='Cada visitante se cuenta una vez por noticia o publicación. Si ve dos contenidos, suma dos visualizaciones.';
     const legend=document.createElement('div');
     legend.className='sb-analytics-overview-legend';
     for(const [kind,label] of [['news','Noticias'],['post','Publicaciones']]){
      const item=document.createElement('span');
      const symbol=document.createElement('i');symbol.className='sb-overview-legend-'+kind;symbol.setAttribute('aria-hidden','true');
      item.append(symbol,document.createTextNode(label));legend.append(item);
     }
     const scroll=document.createElement('div');
     scroll.className='sb-analytics-chart-scroll';
     const chart=document.createElement('div');
     chart.className='sb-analytics-bars sb-analytics-overview-bars';
     chart.style.setProperty('--sb-bars',String(trend.length||12));
     chart.setAttribute('role','group');
     chart.setAttribute('aria-label','Visualizaciones de noticias y publicaciones por período');
     const peak=Math.max(0,...trend.map(item=>Number(item.news_views||0)+Number(item.post_views||0)));
     for(const item of trend){
      const news=Number(item.news_views||0),posts=Number(item.post_views||0);
      const total=news+posts;
      const label=formatAnalyticsDate(item.bucket_start,period);
      const column=document.createElement('div');column.className='sb-analytics-column';
      column.setAttribute('role','img');
      column.setAttribute('aria-label',label+': '+formatCount(news)+' noticias y '+formatCount(posts)+' publicaciones');
      const number=document.createElement('strong');number.textContent=formatCount(total);
      const frame=document.createElement('div');frame.className='sb-analytics-bar-frame';
      const stacked=document.createElement('div');stacked.className='sb-overview-stack';
      stacked.style.height=(peak?total/peak*100:0)+'%';
      const newsPart=document.createElement('span');
      newsPart.className='sb-overview-stack-news';newsPart.style.flexGrow=String(news);
      const postPart=document.createElement('span');
      postPart.className='sb-overview-stack-post';postPart.style.flexGrow=String(posts);
      stacked.append(newsPart,postPart);frame.append(stacked);
      const date=document.createElement('small');date.textContent=label;
      column.append(number,frame,date);chart.append(column);
     }
     scroll.append(chart);chartBox.append(header,explanation,legend,scroll);
     const topHeading=document.createElement('h3');
     topHeading.textContent='🏆 Los 10 contenidos más vistos';
     topBox.append(topHeading);
     if(!ranking.length){
      const empty=document.createElement('p');
      empty.className='sb-content-view-help';
      empty.textContent='Todavía no tienes noticias publicadas ni publicaciones para analizar.';
      topBox.append(empty);
     }else{
      const listRank=document.createElement('div');
      listRank.className='sb-analytics-ranking-list';
      for(const [index,item] of ranking.entries()){
       if(!uuid.test(item.content_id||'')||!['post','news'].includes(item.kind))continue;
       const rank=document.createElement('div');rank.className='sb-analytics-ranking-item';
       const ordinal=document.createElement('span');ordinal.className='sb-analytics-ranking-position';
       ordinal.textContent=String(index+1)+'.';
       const body=document.createElement('div');body.className='sb-analytics-ranking-text';
       const title=document.createElement('strong');
       title.textContent=(item.kind==='news'?'📰 ':'💬 ')+(item.title||'Contenido');
       const sub=document.createElement('small');
       sub.textContent=formatCount(item.views||0)+' visualizaciones';
       body.append(title,sub);
       const button=document.createElement('button');
       button.type='button';button.className='sb-content-view-readers';
       button.textContent='Ver gráfico';
       button.onclick=()=>{dismiss();openStats(item.kind,item.content_id);};
       rank.append(ordinal,body,button);listRank.append(rank);
      }
      topBox.append(listRank);
     }
     const range=period==='day'?'14 días':period==='week'?'12 semanas':'12 meses';
     state.textContent='Resumen actualizado · Evolución de los últimos '+range+'.';
    }catch(error){
     if(request!==version||!overlay.isConnected)return;
     console.warn('Panel general de visualizaciones:',error);
     state.textContent='No se pudo cargar el panel general. Revisa tu sesión o inténtalo de nuevo.';
    }
   }
   refresh('day');
  }
  async function load(kind){
   const v=++version;
   buttons.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.kind===kind)));
   state.textContent='Cargando tus contenidos…';
   list.replaceChildren();
   list.classList.remove('sb-analytics-overview-list');
   if(kind==='overview'){loadOverview();return;}
   try{
    let rows=[];
    if(kind==='post'){
     const {data,error}=await sb.from('member_posts')
      .select('id,content,created_at').eq('author_id',user.id)
      .order('created_at',{ascending:false}).limit(50);
     if(error)throw error;
     rows=(data||[]).map(item=>({
      id:item.id,
      title:(item.content||'Publicación sin texto').replace(/\|\|/g,'').slice(0,105),
      date:item.created_at
     }));
    }else{
     const {data:staff,error:staffError}=await sb.from('site_staff_roles')
      .select('role').eq('user_id',user.id).maybeSingle();
     if(staffError)console.warn('Rol para estadísticas:',staffError.message);
     const isStaff=user.app_metadata?.role==='admin'||['owner','admin'].includes(staff?.role);
     let query=sb.from('news').select('id,title,published_at,created_at,status')
      .eq('status','published').order('published_at',{ascending:false}).limit(50);
     if(!isStaff)query=query.eq('author_id',user.id);
     const {data,error}=await query;
     if(error)throw error;
     rows=(data||[]).map(item=>({
      id:item.id,title:item.title||'Noticia sin título',
      date:item.published_at||item.created_at
     }));
    }
    if(v!==version||!overlay.isConnected)return;
    state.textContent=rows.length
     ?'Selecciona «Ver gráfico» para consultar las estadísticas.'
     :kind==='news'?'No tienes noticias publicadas con estadísticas disponibles.':'Todavía no tienes publicaciones propias.';
    for(const item of rows){
     const record=document.createElement('div');record.className='sb-analytics-index-item';
     const meta=document.createElement('span');meta.className='sb-analytics-index-meta';
     const title=document.createElement('strong');title.textContent=item.title;
     const stamp=document.createElement('small');
     const d=new Date(item.date);
     stamp.textContent=Number.isNaN(d.getTime())?'':d.toLocaleDateString('es-ES');
     meta.append(title,stamp);
     const button=document.createElement('button');
     button.type='button';button.textContent='📊 Ver gráfico';
     button.className='sb-content-view-readers';
     button.onclick=()=>{dismiss();openStats(kind,item.id);};
     record.append(meta,button);list.append(record);
    }
   }catch(error){
    if(v!==version||!overlay.isConnected)return;
    console.warn('Índice de estadísticas:',error);
    state.textContent='No se pudieron cargar tus contenidos. Revisa tu sesión e inténtalo otra vez.';
   }
  }
  load('overview');
 }
 function scan(){
  mountPreference();
  ensureConsentNotice();
  mountStatisticsEntry();
  syncStatisticsPermissions().catch(error=>console.warn('Permisos de estadísticas:',error));
  scanNewsCards().catch(error=>console.warn('Contadores de noticias:',error));
  scanPosts().catch(error=>console.warn('Contadores de publicaciones:',error));
  scanNewsArticle().catch(error=>console.warn('Lectores de noticias:',error));
 }
 function queueScan(){
  if(scanQueued)return;
  scanQueued=true;
  requestAnimationFrame(()=>{scanQueued=false;scan();});
 }
 function start(){
  refreshAuth().then(queueScan);
  queueScan();
  const obs=new MutationObserver(changes=>{
   if(changes.some(change=>[...change.addedNodes].some(node=>
    node.nodeType===1&&(
     node.matches?.('.page,.news-card,.social-post[data-post-id],#sb-news-interactions,#app')||
     node.querySelector?.('.news-card,.social-post[data-post-id],#sb-news-interactions')
    )
   )))queueScan();
  });
  obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{attemptedPosts.clear();queueScan();});
  sb.auth.onAuthStateChange((event)=>{
   if(event==='INITIAL_SESSION')return;
   setTimeout(()=>refreshAuth(true).then(queueScan),0);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();