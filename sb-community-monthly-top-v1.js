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
  panel.append(title,description,tools,feedback,results);
  const badges=document.getElementById('sb-post-popularity');
  const trends=document.getElementById('sb-community-trends');
  if(badges)badges.after(panel);
  else if(trends)trends.after(panel);
  else feed.before(panel);
  let posts=[],names=new Map(),loading=false,loggedIn=false;
  const active=()=>panel.isConnected&&feed.isConnected;
  const paint=()=>{
   if(!active())return;
   const chosen=month.value;
   const items=posts.filter(post=>post.month_start===chosen).sort((a,b)=>
    Number(b.score||0)-Number(a.score||0)
    || Number(b.likes_count||0)-Number(a.likes_count||0)
    || new Date(b.created_at)-new Date(a.created_at));
   results.replaceChildren();
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
    article.append(rank,name,author,score,activity,go);
    results.append(article);
   });
  };
  const load=async()=>{
   if(!active()||!loggedIn||loading)return;
   loading=true;refresh.disabled=true;
   feedback.textContent='Consultando las publicaciones del mes…';
   try{
    const {data,error}=await sb.from('sb_community_monthly_top_posts')
     .select('post_id,author_id,created_at,gallery_category,month_start,likes_count,comments_count,score')
     .order('created_at',{ascending:false}).limit(400);
    if(error)throw error;
    if(!active())return;
    posts=data||[];
    const authorIds=[...new Set(posts.map(post=>post.author_id))];
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