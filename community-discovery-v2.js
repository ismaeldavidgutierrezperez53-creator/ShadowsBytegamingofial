/* Descubre publicaciones recientes y gestiona guardados sin alterar el muro.
   Consulta únicamente publicaciones visibles mediante las políticas RLS de Supabase. */
(() => {
 'use strict';
 const ID='sb-community-discovery';
 const make=(tag,klass,value)=>{
  const el=document.createElement(tag);
  if(klass)el.className=klass;
  if(value!==undefined)el.textContent=String(value);
  return el;
 };
 const safePostText=(content)=>{
  const text=String(content||'').trim();
  // No enseñar spoilers ocultos del muro en vistas previas.
  if(/\|\||\[spoiler\b|<spoiler\b|spoiler\s*:/i.test(text))
   return '🔒 Esta publicación puede contener spoilers. Ábrela para verla con sus controles.';
  return text.length>160?text.slice(0,157)+'…':(text||'Publicación con imagen o contenido compartido.');
 };
 function mount(){
  const feed=document.getElementById('community-feed');
  if(!feed||!feed.isConnected||typeof sb==='undefined'||!sb.auth
     ||document.getElementById(ID))return;
  const panel=make('section','sb-discovery');
  panel.id=ID;
  const title=make('h2','','👥 Descubre y guarda publicaciones');
  const intro=make('p','sb-discovery-intro',
   'Encuentra lo más reciente del muro y vuelve a las publicaciones que guardes. Los guardados son privados.');
  const actions=make('div','sb-discovery-tabs');
  const recent=make('button','sb-discovery-active','🆕 Recientes');
  const saved=make('button','','🔖 Mis guardadas');
  const reload=make('button','','↻ Actualizar');
  for(const button of [recent,saved,reload])button.type='button';
  recent.setAttribute('aria-pressed','true');saved.setAttribute('aria-pressed','false');
  actions.append(recent,saved,reload);
  const tools=make('div','sb-discovery-tools');
  const searchLabel=make('label','','Buscar');
  const search=make('input');search.type='search';search.maxLength=90;
  search.placeholder='Buscar por contenido o categoría';search.setAttribute('aria-label','Buscar publicaciones');
  searchLabel.append(search);
  const categoryLabel=make('label','','Categoría');
  const category=make('select');category.setAttribute('aria-label','Filtrar categoría de publicaciones');
  const allOption=make('option','','Todas');allOption.value='all';category.append(allOption);
  categoryLabel.append(category);tools.append(searchLabel,categoryLabel);
  const status=make('p','sb-discovery-status','Preparando publicaciones…');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const list=make('div','sb-discovery-list');
  panel.append(title,intro,actions,tools,status,list);
  feed.before(panel);
  let mode='recent',version=0,items=[],bookmarks=new Set(),userId=null;
  const setSelected=()=>{
   recent.classList.toggle('sb-discovery-active',mode==='recent');
   saved.classList.toggle('sb-discovery-active',mode==='saved');
   recent.setAttribute('aria-pressed',String(mode==='recent'));
   saved.setAttribute('aria-pressed',String(mode==='saved'));
  };
  function draw(){
   if(!panel.isConnected)return;
   const q=search.value.trim().toLocaleLowerCase('es');
   const filtered=items.filter(post=>
    (category.value==='all'||post.gallery_category===category.value)
    &&(post.content+' '+post.gallery_category).toLocaleLowerCase('es').includes(q));
   list.replaceChildren();
   status.textContent=filtered.length+' de '+items.length+' publicaciones visibles · '
    +(mode==='saved'?'Guardadas':'Recientes')
    +(userId?'':' · Inicia sesión para guardar publicaciones');
   if(!filtered.length){
    list.append(make('p','sb-discovery-empty',mode==='saved'
     ?'No tienes publicaciones guardadas con estos filtros. Puedes guardar alguna desde Recientes o desde el muro.'
     :'No hay publicaciones que coincidan. Prueba otra búsqueda.'));
    return;
   }
   for(const post of filtered){
    const card=make('article','sb-discovery-card');
    const heading=make('div','sb-discovery-card-heading');
    const label=make('strong','',post.gallery_category||'Comunidad');
    const date=make('small','',post.created_at?new Date(post.created_at).toLocaleDateString('es-ES'):'');
    heading.append(label,date);
    const text=make('p','sb-discovery-preview',safePostText(post.content));
    const buttons=make('div','sb-discovery-card-actions');
    const link=make('a','outline-btn mini','Ver publicación');
    link.href='#/comunidad?post='+encodeURIComponent(post.id);
    buttons.append(link);
    if(userId){
     const isSaved=bookmarks.has(post.id);
     const save=make('button','outline-btn mini',isSaved?'🔖 Quitar guardado':'🔖 Guardar');
     save.type='button';save.setAttribute('aria-pressed',String(isSaved));
     save.onclick=async()=>{
      save.disabled=true;
      const {data:{user},error:authErr}=await sb.auth.getUser();
      if(authErr||user?.id!==userId){
       save.disabled=false;status.textContent='Vuelve a iniciar sesión para gestionar tus guardados.';return;
      }
      const action=isSaved
       ?sb.from('member_post_bookmarks').delete().eq('user_id',userId).eq('post_id',post.id)
       :sb.from('member_post_bookmarks').insert({user_id:userId,post_id:post.id});
      const {error}=await action;
      if(error){
       save.disabled=false;status.textContent='No se pudo guardar: '+error.message;return;
      }
      if(isSaved)bookmarks.delete(post.id);else bookmarks.add(post.id);
      if(mode==='saved'&&isSaved)items=items.filter(item=>item.id!==post.id);
      draw();
     };
     buttons.append(save);
    }
    card.append(heading,text,buttons);
    list.append(card);
   }
  }
  async function load(){
   const token=++version;
   setSelected();
   status.textContent=mode==='saved'?'Cargando tus guardados…':'Buscando publicaciones recientes…';
   list.replaceChildren();
   try{
    const {data:{user},error:authErr}=await sb.auth.getUser();
    if(authErr)throw authErr;
    if(!panel.isConnected||token!==version)return;
    userId=user?.id||null;
    const currentMode=mode;
    let posts=[],savedIds=[];
    if(userId){
     const {data,error}=await sb.from('member_post_bookmarks')
      .select('post_id,created_at').eq('user_id',userId)
      .order('created_at',{ascending:false}).limit(100);
     if(error)throw error;
     bookmarks=new Set((data||[]).map(row=>row.post_id));
     savedIds=(data||[]).map(row=>row.post_id);
    }else bookmarks=new Set();
    if(currentMode==='saved'){
     if(userId&&savedIds.length){
      const {data,error}=await sb.from('member_posts')
       .select('id,content,created_at,gallery_category')
       .in('id',savedIds).limit(100);
      if(error)throw error;
      const indexed=new Map((data||[]).map(row=>[row.id,row]));
      posts=savedIds.map(id=>indexed.get(id)).filter(Boolean);
     }
    }else{
     const {data,error}=await sb.from('member_posts')
      .select('id,content,created_at,gallery_category')
      .order('created_at',{ascending:false}).limit(24);
     if(error)throw error;
     posts=data||[];
    }
    if(token!==version||!panel.isConnected)return;
    items=posts;
    const selected=category.value;
    category.replaceChildren();
    const all=make('option','','Todas');all.value='all';category.append(all);
    for(const name of [...new Set(posts.map(x=>x.gallery_category||'Otros'))].sort((a,b)=>a.localeCompare(b,'es'))){
     const option=make('option','',name);option.value=name;category.append(option);
    }
    category.value=[...category.options].some(x=>x.value===selected)?selected:'all';
    draw();
   }catch(e){
    if(token!==version||!panel.isConnected)return;
    status.textContent='No se pudieron cargar las publicaciones: '+(e?.message||'Error desconocido');
    const tryAgain=make('button','outline-btn mini','Reintentar');
    tryAgain.type='button';tryAgain.onclick=()=>void load();
    list.replaceChildren(tryAgain);
   }
  }
  recent.onclick=()=>{mode='recent';void load();};
  saved.onclick=()=>{mode='saved';void load();};
  reload.onclick=()=>void load();
  search.oninput=draw;
  category.onchange=draw;
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
