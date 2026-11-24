/* Tendencias de publicaciones públicas de los últimos 7/14 días.
   No muestra el cuerpo ni los spoilers de las publicaciones en las vistas previas. */
(() => {
 'use strict';
 const create=(tag,cls,value)=>{
  const n=document.createElement(tag);if(cls)n.className=cls;
  if(value!==undefined)n.textContent=String(value);
  return n;
 };
 function mount(){
  const feed=document.getElementById('community-feed');
  if(!feed||!feed.isConnected||typeof sb==='undefined'||!sb.auth
     ||document.getElementById('sb-community-trends'))return;
  const panel=create('section','sb-trends');
  panel.id='sb-community-trends';
  const title=create('h2','','🔥 Tendencias de la comunidad');
  const introduction=create('p','sb-trends-description',
   'Publicaciones populares según «me gusta» y comentarios, sin mostrar spoilers. Solo se cuentan publicaciones de perfiles públicos.');
  const toolbar=create('div','sb-trends-toolbar');
  const periodLabel=create('label','','Período');
  const period=create('select');period.setAttribute('aria-label','Período de tendencias');
  for(const [value,label] of [['7','Últimos 7 días'],['14','Últimos 14 días']]){
   const option=create('option','',label);option.value=value;period.append(option);
  }
  periodLabel.append(period);
  const refresh=create('button','outline-btn mini','↻ Actualizar tendencias');
  refresh.type='button';toolbar.append(periodLabel,refresh);
  const feedback=create('p','sb-trends-status','Cargando actividad…');
  feedback.setAttribute('role','status');
  const tagHeading=create('h3','','🏷️ Etiquetas en tendencia');
  const tags=create('div','sb-trends-tags');
  const postHeading=create('h3','','📣 Publicaciones destacadas');
  const posts=create('div','sb-trends-posts');
  panel.append(title,introduction,toolbar,feedback,tagHeading,tags,postHeading,posts);
  const search=document.getElementById('sb-community-discovery');
  if(search?.isConnected)search.after(panel);else feed.before(panel);
  let records=[],names=new Map(),loading=false;
  const active=()=>panel.isConnected&&feed.isConnected;
  const score=record=>Number(record.likes_count||0)*3+Number(record.comments_count||0)*2;
  function paint(){
   if(!active())return;
   const cutoff=Date.now()-Number(period.value)*86400000;
   const filtered=records.filter(row=>new Date(row.created_at).getTime()>=cutoff);
   const ranked=[...filtered].sort((a,b)=>score(b)-score(a)||
     new Date(b.created_at)-new Date(a.created_at));
   feedback.textContent=filtered.length
    ?filtered.length+' publicaciones públicas · clasificación por interacción (3 puntos por me gusta y 2 por comentario).'
    :'No hay publicaciones públicas recientes en este período.';
   const tagCounts=new Map();
   for(const post of filtered){
    for(const label of post.post_tags||[])tagCounts.set(label,(tagCounts.get(label)||0)+1);
   }
   tags.replaceChildren();
   const topTags=[...tagCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es')).slice(0,6);
   if(!topTags.length)tags.append(create('p','sb-trends-empty','Todavía no hay etiquetas en tendencia.'));
   for(const [name,count] of topTags){
    const link=create('a','sb-trends-tag','#'+name+' · '+count);
    link.href='#/comunidad';link.title='Etiqueta usada en '+count+' publicaciones';
    link.onclick=()=>{
     const category=document.querySelector('#sb-community-discovery select[aria-label="Filtrar publicaciones por etiqueta"]');
     if(category){
      category.value=name;
      category.dispatchEvent(new Event('change',{bubbles:true}));
     }
    };
    tags.append(link);
   }
   posts.replaceChildren();
   if(!ranked.length){posts.append(create('p','sb-trends-empty','Publica o participa en Comunidad para que aparezcan nuevas tendencias.'));return;}
   ranked.slice(0,5).forEach((post,index)=>{
    const card=create('article','sb-trends-post');
    const position=create('span','sb-trends-rank','#'+(index+1));
    const heading=create('strong','',post.gallery_category||'Comunidad');
    const by=create('small','','Por '+(names.get(post.author_id)||'Miembro')+
     ' · '+new Date(post.created_at).toLocaleDateString('es-ES'));
    const counts=create('span','sb-trends-counts',
     '❤️ '+post.likes_count+' · 💬 '+post.comments_count);
    const go=create('a','outline-btn mini','Ver publicación');
    go.href='#/comunidad?post='+encodeURIComponent(post.post_id);
    go.setAttribute('aria-label','Ver publicación número '+(index+1));
    card.append(position,heading,by,counts,go);
    posts.append(card);
   });
  }
  async function load(){
   if(loading)return;
   loading=true;refresh.disabled=true;feedback.textContent='Consultando tendencias…';
   try{
    const {data:{user},error:authErr}=await sb.auth.getUser();
    if(authErr)throw authErr;
    if(!user){records=[];names.clear();paint();feedback.textContent='Inicia sesión para consultar las tendencias.';return;}
    const {data,error}=await sb.from('sb_community_post_trends')
     .select('post_id,author_id,created_at,gallery_category,post_tags,likes_count,comments_count')
     .order('created_at',{ascending:false}).limit(200);
    if(error)throw error;
    if(!active())return;
    records=data||[];
    const authorIds=[...new Set(records.map(x=>x.author_id))];
    if(authorIds.length){
     const {data:authors,error:authorErr}=await sb.from('profiles')
      .select('id,display_name,username').in('id',authorIds).eq('is_public',true);
     if(authorErr)throw authorErr;
     names=new Map((authors||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
    }
    paint();
   }catch(e){if(active())feedback.textContent='No se pudieron cargar las tendencias: '+(e?.message||'Error');}
   finally{loading=false;refresh.disabled=false;}
  }
  period.onchange=paint;refresh.onclick=()=>void load();
  void load();
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  const observer=new MutationObserver(mount);
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();