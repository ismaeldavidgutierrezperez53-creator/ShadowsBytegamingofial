/* Publicaciones más populares del mes sin mostrar spoilers ni texto del muro. */
(() => {
 'use strict';
 const make=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 const months=()=>{
  const now=new Date();
  return [0,1,2].map(offset=>{
   const month=new Date(now.getFullYear(),now.getMonth()-offset,1,12);
   const y=month.getFullYear(),m=String(month.getMonth()+1).padStart(2,'0');
   return {key:y+'-'+m+'-01',label:month.toLocaleDateString('es-ES',{month:'long',year:'numeric'})};
  });
 };
 function mount(){
  const feed=document.getElementById('community-feed');
  if(!feed||!feed.isConnected||typeof sb==='undefined'||!sb.auth
     ||document.getElementById('sb-community-monthly-top'))return;
  const panel=make('section','sb-v4-monthly-panel');
  panel.id='sb-community-monthly-top';
  const title=make('h2','','🏆 Publicaciones más populares del mes');
  const description=make('p','',
   'Clasificación mensual de publicaciones de perfiles públicos: 3 puntos por «me gusta» y 2 por comentario. No se muestran spoilers ni el texto de las publicaciones.');
  const tools=make('div','sb-v4-monthly-toolbar');
  const monthLabel=make('label','','Mes de la clasificación');
  const month=make('select');
  month.setAttribute('aria-label','Seleccionar mes de publicaciones populares');
  for(const m of months()){
   const option=make('option','',m.label);option.value=m.key;month.append(option);
  }
  monthLabel.append(month);
  const refresh=make('button','outline-btn mini','↻ Actualizar ranking mensual');
  refresh.type='button';
  tools.append(monthLabel,refresh);
  const feedback=make('p','sb-v4-monthly-status','Preparando clasificación mensual…');
  feedback.setAttribute('role','status');
  const results=make('div','sb-v4-monthly-list');
  const prizeTitle=make('h3','sb-v5-prizes-title','🎁 Premios especiales del podio');
  const prizeInfo=make('p','sb-v5-prizes-intro',
   'Durante el mes, las tres primeras publicaciones muestran un premio provisional. Al terminar, los distintivos oficiales se asignan una sola vez según la clasificación.');
  const prizeStatus=make('p','sb-v4-monthly-status','Cargando premios…');
  const prizeList=make('div','sb-v5-prizes-list');
  panel.append(title,description,tools,feedback,results,prizeTitle,prizeInfo,prizeStatus,prizeList);
  const badges=document.getElementById('sb-post-popularity');
  const trends=document.getElementById('sb-community-trends');
  if(badges)badges.after(panel);
  else if(trends)trends.after(panel);
  else feed.before(panel);
  let posts=[],prizes=[],finalizedMonths=new Set(),names=new Map(),loading=false,loggedIn=false;
  const active=()=>panel.isConnected&&feed.isConnected;
  const awardNames=['👑 Corona de la Comunidad','🌟 Estrella de Plata','🏅 Bronce Destacado'];
  const paint=()=>{
   if(!active())return;
   const chosen=month.value;
   const items=posts.filter(post=>post.month_start===chosen).sort((a,b)=>
    Number(b.score||0)-Number(a.score||0)
    || Number(b.likes_count||0)-Number(a.likes_count||0)
    || new Date(b.created_at)-new Date(a.created_at));
   results.replaceChildren();prizeList.replaceChildren();
   const awarded=prizes.filter(x=>x.month_start===chosen).sort((a,b)=>a.place-b.place);
   const official=finalizedMonths.has(chosen);
   prizeStatus.textContent=official
     ?awarded.length+' premios oficiales confirmados en este mes.'
     :'🏁 Podio provisional · los premios oficiales se entregarán al finalizar el mes.';
   if(official){
    if(!awarded.length)prizeList.append(make('p','sb-v4-monthly-empty',
     'Este mes terminó sin publicaciones que consiguieran puntos suficientes para ganar un premio.'));
    for(const prize of awarded){
     const card=make('article','sb-v5-prize-card');
     const badge=make('strong','',''+(awardNames[prize.place-1]||'🏆 Premio especial'));
     const by=make('span','', 'Para '+(names.get(prize.author_id)||'Miembro')+' · '+prize.score+' puntos al cerrar el mes');
     const go=make('a','outline-btn mini','Ver publicación premiada');
     go.href='#/comunidad?post='+encodeURIComponent(prize.post_id);
     card.append(badge,by,go);prizeList.append(card);
    }
   }else{
    const contenders=items.filter(x=>Number(x.score)>0).slice(0,3);
    if(!contenders.length)prizeList.append(make('p','sb-v4-monthly-empty',
     'Todavía no hay candidatos: se necesitan me gusta o comentarios.'));
    contenders.forEach((candidate,index)=>{
     const card=make('article','sb-v5-prize-card sb-v5-provisional');
     card.append(make('strong','',awardNames[index]||'Premio especial'));
     card.append(make('span','',
      (names.get(candidate.author_id)||'Miembro')+' · '+candidate.score+' puntos (posición provisional)'));
     prizeList.append(card);
    });
   }
   if(!items.length){
    feedback.textContent='No hay publicaciones públicas registradas para el mes seleccionado.';
    results.append(make('p','sb-v4-monthly-empty',
     'Cuando los miembros publiquen contenido, aparecerá aquí la clasificación del mes.'));
    return;
   }
   feedback.textContent=items.length+' publicaciones del mes · mostrando las 10 primeras por interacción.';
   items.slice(0,10).forEach((item,index)=>{
    const article=make('article','sb-v4-monthly-card');
    const rank=make('span','sb-v4-monthly-rank',
     index===0?'🥇 1.º':index===1?'🥈 2.º':index===2?'🥉 3.º':(index+1)+'.º');
    const name=make('strong','',item.gallery_category||'Comunidad');
    const author=make('small','',
     'Por '+(names.get(item.author_id)||'Miembro')+' · '+
     new Date(item.created_at).toLocaleDateString('es-ES'));
    const score=make('b','',Number(item.score||0)+' puntos');
    const activity=make('span','',
     '❤️ '+Number(item.likes_count||0)+' me gusta · 💬 '+
      Number(item.comments_count||0)+' comentarios');
    const go=make('a','outline-btn mini','Ver publicación');
    go.href='#/comunidad?post='+encodeURIComponent(item.post_id);
    article.append(rank,name,author,score,activity);
    if(index<3&&Number(item.score)>0){
     const prize=awarded.find(x=>x.post_id===item.post_id);
     const label=prize
      ?'🎁 Premio oficial: '+(awardNames[prize.place-1]||'Podio')
      :official?'':'🎁 Candidato a '+(awardNames[index]||'premio');
     if(label)article.append(make('span','sb-v5-monthly-prize-chip',label));
    }
    article.append(go);
    results.append(article);
   });
  };
  const load=async()=>{
   if(!active()||!loggedIn||loading)return;
   loading=true;refresh.disabled=true;
   feedback.textContent='Consultando las publicaciones del mes…';
   try{
    // El backend cierra el mes anterior una única vez; nunca decide el ganador el navegador.
    const {error:finalError}=await sb.rpc('sb_finalize_previous_community_month');
    if(finalError)throw finalError;
    const [prizeResponse,seasonResponse]=await Promise.all([
     sb.from('sb_monthly_community_post_prizes')
      .select('month_start,place,post_id,author_id,score,awarded_at')
      .order('month_start',{ascending:false}).limit(60),
     sb.from('sb_monthly_community_prize_seasons').select('month_start').limit(60)
    ]);
    if(prizeResponse.error)throw prizeResponse.error;
    if(seasonResponse.error)throw seasonResponse.error;
    prizes=prizeResponse.data||[];
    finalizedMonths=new Set((seasonResponse.data||[]).map(x=>x.month_start));
    const {data,error}=await sb.from('sb_community_monthly_top_posts')
     .select('post_id,author_id,created_at,gallery_category,month_start,likes_count,comments_count,score')
     .order('created_at',{ascending:false}).limit(400);
    if(error)throw error;
    if(!active())return;
    posts=data||[];
    const authorIds=[...new Set([...posts.map(post=>post.author_id),...prizes.map(p=>p.author_id)])];
    names=new Map();
    if(authorIds.length){
     const {data:profiles,error:profilesError}=await sb.from('profiles')
      .select('id,display_name,username').in('id',authorIds).eq('is_public',true);
     if(profilesError)throw profilesError;
     for(const profile of profiles||[])names.set(profile.id,profile.display_name||profile.username||'Miembro');
    }
    paint();
   }catch(err){if(active())feedback.textContent='No se pudo cargar el ranking mensual: '+(err?.message||'Error');}
   finally{loading=false;refresh.disabled=false;}
  };
  month.onchange=paint;
  refresh.onclick=()=>void load();
  (async()=>{
   try{
    const {data:{user},error}=await sb.auth.getUser();
    if(error)throw error;
    if(!active())return;
    if(!user){
     feedback.textContent='Inicia sesión para ver el ranking mensual de la comunidad.';
     refresh.disabled=true;
     return;
    }
    loggedIn=true;void load();
   }catch(err){if(active())feedback.textContent='No se pudo comprobar tu sesión.';}
  })();
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  new MutationObserver(mount).observe(app,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();