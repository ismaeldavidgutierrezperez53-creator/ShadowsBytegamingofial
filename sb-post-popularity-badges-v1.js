/* Insignias dinámicas por publicación pública: no duplica los logros del perfil. */
(() => {
 'use strict';
 const el=(tag,klass,value)=>{
  const n=document.createElement(tag);
  if(klass)n.className=klass;
  if(value!==undefined)n.textContent=String(value);
  return n;
 };
 const tiers=[
  {likes:10,label:'👑 Viral',cls:'viral'},
  {likes:5,label:'🏆 Popular',cls:'popular'},
  {likes:3,label:'🔥 En auge',cls:'hot'},
  {likes:1,label:'✨ Primer aplauso',cls:'first'}
 ];
 const badge=likes=>tiers.find(x=>likes>=x.likes)||null;
 function mount(){
  const feed=document.getElementById('community-feed');
  if(!feed||!feed.isConnected||typeof sb==='undefined'||!sb.auth
     ||document.getElementById('sb-post-popularity'))return;
  const panel=el('section','sb-v3-popularity');
  panel.id='sb-post-popularity';
  const heading=el('h2','','🏅 Insignias para publicaciones populares');
  const info=el('p','',
   'Las publicaciones ganan insignias automáticamente al recibir 1, 3, 5 o 10 «me gusta». No requieren canjes ni modifican tus recompensas.');
  const examples=el('div','sb-v3-popularity-examples');
  for(const tier of [...tiers].reverse()){
   const example=el('span','sb-v3-pop-badge '+tier.cls,tier.label+' · '+tier.likes+' ❤️');
   examples.append(example);
  }
  const controls=el('div','sb-v3-popularity-controls');
  const refresh=el('button','outline-btn mini','↻ Actualizar insignias');refresh.type='button';
  const status=el('p','sb-v3-feedback','Cargando insignias…');status.setAttribute('role','status');
  controls.append(refresh,status);
  panel.append(heading,info,examples,controls);
  const trends=document.getElementById('sb-community-trends');
  if(trends)trends.after(panel);else feed.before(panel);
  let loading=false,timer=null,observer=null,hasSession=false;
  const current=()=>panel.isConnected&&feed.isConnected;
  const attach=()=>observer?.observe(feed,{childList:true,subtree:true});
  function draw(rows){
   if(!current())return;
   const data=new Map(rows.map(x=>[x.post_id,x]));
   observer?.disconnect();
   try{
    const posts=[...feed.querySelectorAll('.community-bookmark-feed .social-post[data-post-id]')];
    let earned=0;
    for(const post of posts){
     post.querySelectorAll(':scope > .sb-v3-post-badge-line').forEach(x=>x.remove());
     const row=data.get(post.dataset.postId);
     const trophy=badge(Number(row?.likes_count)||0);
     if(!trophy)continue;
     const line=el('div','sb-v3-post-badge-line');
     line.setAttribute('aria-label','Insignia de popularidad de la publicación');
     line.append(el('span','sb-v3-pop-badge '+trophy.cls,trophy.label));
     line.append(el('small','',
      Number(row.likes_count)+' me gusta · '+Number(row.comments_count||0)+' comentarios'));
     post.insertBefore(line,post.querySelector('.post-like-box')||null);
     earned++;
    }
    status.textContent=posts.length
     ?earned+' de '+posts.length+' publicaciones visibles tienen insignia.'
     :'Esperando publicaciones del muro…';
   }finally{attach();}
  }
  async function load(){
   if(!current()||loading||!hasSession)return;
   loading=true;refresh.disabled=true;
   try{
    const posts=[...feed.querySelectorAll('.community-bookmark-feed .social-post[data-post-id]')];
    const ids=[...new Set(posts.map(x=>x.dataset.postId).filter(Boolean))].slice(0,180);
    if(!ids.length){draw([]);return;}
    const {data,error}=await sb.from('sb_public_post_popularity')
     .select('post_id,likes_count,comments_count').in('post_id',ids).limit(180);
    if(error)throw error;
    if(!current())return;
    draw(data||[]);
   }catch(error){if(current())status.textContent='Error al cargar insignias: '+(error?.message||'No disponible');}
   finally{loading=false;refresh.disabled=false;}
  }
  observer=new MutationObserver(()=>{
   if(timer!==null)clearTimeout(timer);
   timer=setTimeout(()=>{timer=null;void load();},650);
  });
  attach();
  refresh.onclick=()=>{if(timer!==null)clearTimeout(timer);timer=null;void load();};
  const lifecycle=new MutationObserver(()=>{
   if(!current()){
    observer.disconnect();lifecycle.disconnect();
    if(timer!==null)clearTimeout(timer);
   }
  });
  lifecycle.observe(document.getElementById('app'),{childList:true});
  (async()=>{
   try{
    const {data:{user},error}=await sb.auth.getUser();
    if(error)throw error;
    if(!user){status.textContent='Inicia sesión para consultar las insignias.';return;}
    hasSession=true;void load();
   }catch(e){if(current())status.textContent='No se pudo comprobar tu sesión para mostrar insignias.';}
  })();
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