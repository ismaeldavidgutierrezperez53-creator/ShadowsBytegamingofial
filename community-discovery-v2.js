/* Filtros del muro real: búsqueda, álbum e imágenes.
   Conserva «Últimas publicaciones» y «Mis guardados» existentes. */
(() => {
 'use strict';
 const ID='sb-community-discovery';
 const make=(tag,klass,text)=>{
  const el=document.createElement(tag);
  if(klass)el.className=klass;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 function mount(){
  const feed=document.getElementById('community-feed');
  if(!feed||!feed.isConnected||document.getElementById(ID))return;
  const panel=make('section','sb-discovery');
  panel.id=ID;
  const heading=make('h2','','🔎 Explorar publicaciones de la comunidad');
  const info=make('p','sb-discovery-intro',
   'Busca y filtra el muro por categoría o imágenes. Funciona con «Últimas publicaciones» y «Mis guardados» sin duplicar ninguna publicación.');
  const controls=make('div','sb-discovery-tools');
  const searchLabel=make('label','','Buscar en el muro');
  const search=make('input');search.type='search';search.maxLength=90;
  search.placeholder='Buscar publicaciones';search.autocomplete='off';
  search.setAttribute('aria-label','Buscar publicaciones de la comunidad');
  searchLabel.append(search);
  const categoryLabel=make('label','','Categoría');
  const category=make('select');category.setAttribute('aria-label','Filtrar publicaciones por categoría');
  for(const value of ['Todas','Anime','Gaming','Capturas','Otros']){
   const option=make('option','',value);option.value=value==='Todas'?'all':value;
   category.append(option);
  }
  categoryLabel.append(category);
  const imageLabel=make('label','sb-discovery-images');
  const onlyImages=make('input');onlyImages.type='checkbox';
  const imageCopy=make('span','','🖼️ Solo publicaciones con imagen');
  imageLabel.append(onlyImages,imageCopy);
  const reset=make('button','outline-btn mini','Limpiar filtros');
  reset.type='button';
  const status=make('p','sb-discovery-status','Esperando publicaciones…');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  controls.append(searchLabel,categoryLabel,imageLabel,reset);
  panel.append(heading,info,controls,status);
  feed.before(panel);
  let queued=false;
  const apply=()=>{
   if(!panel.isConnected||!feed.isConnected)return;
   const posts=[...feed.querySelectorAll('.community-bookmark-feed .social-post')];
   const term=search.value.trim().toLocaleLowerCase('es');
   const categoryValue=category.value;
   let shown=0;
   for(const post of posts){
    const content=post.querySelector('.social-post-body')?.textContent||'';
    const author=post.querySelector('.feed-author')?.textContent||'';
    const album=post.dataset.sbDiscoveryCategory||'Otros';
    const hasImage=Boolean(post.querySelector('.social-post-image'));
    const matches=(categoryValue==='all'||album===categoryValue)
     &&(!onlyImages.checked||hasImage)
     &&(!term||(content+' '+author+' '+album).toLocaleLowerCase('es').includes(term));
    post.hidden=!matches;if(matches)shown++;
   }
   const mode=feed.querySelector('.community-bookmark-toolbar [aria-pressed="true"]')?.textContent||'publicaciones';
   status.textContent=posts.length
     ?shown+' de '+posts.length+' publicaciones visibles · '+mode
     :feed.querySelector('.community-bookmark-feed')?
       'No hay publicaciones en esta vista o todavía se están cargando.'
       :'Cargando el muro de la comunidad…';
  };
  const schedule=()=>{
   if(queued)return;
   queued=true;queueMicrotask(()=>{queued=false;apply();});
  };
  const feedObserver=new MutationObserver(schedule);
  feedObserver.observe(feed,{childList:true,subtree:true});
  const lifecycle=new MutationObserver(()=>{
   if(!feed.isConnected||!panel.isConnected){
    feedObserver.disconnect();lifecycle.disconnect();
   }
  });
  lifecycle.observe(document.getElementById('app'),{childList:true});
  search.oninput=schedule;category.onchange=schedule;onlyImages.onchange=schedule;
  reset.onclick=()=>{
   search.value='';category.value='all';onlyImages.checked=false;apply();
   search.focus();
  };
  apply();
 }
 function start(){
  const app=document.getElementById('app');
  if(!app)return;
  const observer=new MutationObserver(mount);
  observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
