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
   (card.querySelector('.news-date')||card.querySelector('h3')||card).after(count);
   valid.push({id,count});
  }
  if(!valid.length)return;
  const ids=[...new Set(valid.map(item=>item.id))].slice(0,100);
  const {data,error}=await sb.rpc('content_news_view_counts',{p_ids:ids});
  const counts=new Map((data||[]).map(row=>[row.news_id,row.views]));
  for(const item of valid)if(item.count.isConnected){
   item.count.textContent=error?'👁 Visitas no disponibles':'👁 '+formatCount(counts.get(item.id))+' visitas';
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
   bar.append(readers);
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
  readers.hidden=true;bar.append(readers);
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
 function scan(){
  mountPreference();
  ensureConsentNotice();
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