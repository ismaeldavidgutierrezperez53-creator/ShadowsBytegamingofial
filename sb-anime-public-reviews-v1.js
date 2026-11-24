/* Reseñas voluntarias de anime, sin compartir listas privadas. */
(() => {
 'use strict';
 const make=(tag,klass,value)=>{
  const e=document.createElement(tag);
  if(klass)e.className=klass;
  if(value!==undefined)e.textContent=String(value);
  return e;
 };
 const errText=e=>e?.message||'No se pudo completar la operación.';
 function mount(){
  const root=document.getElementById('sb-anime-gaming-hub');
  const holder=root?.querySelector('.sb-ag-extras');
  if(!root||!holder||typeof sb==='undefined'||!sb.auth||root.querySelector('#sb-shared-anime-reviews'))return;
  const panel=make('section','sb-ag-panel sb-v3-review-panel');
  panel.id='sb-shared-anime-reviews';
  const heading=make('h3','','🌸 Valoraciones y reseñas entre miembros');
  const explain=make('p','','Publica una opinión de manera voluntaria: nunca se publica tu lista privada ni el progreso de los episodios.');
  const form=make('form','sb-v3-review-form');
  const titleLabel=make('label','','Título del anime');
  const title=make('input');
  title.maxLength=120;title.required=true;title.autocomplete='off';title.placeholder='Ej.: Fullmetal Alchemist';
  titleLabel.append(title);
  const ratingLabel=make('label','','Tu valoración');
  const rating=make('select');rating.required=true;
  for(const [value,label] of [['','Elige una puntuación'],['5','★★★★★ · 5/5'],['4','★★★★☆ · 4/5'],['3','★★★☆☆ · 3/5'],['2','★★☆☆☆ · 2/5'],['1','★☆☆☆☆ · 1/5']]){
   const opt=make('option','',label);opt.value=value;rating.append(opt);
  }
  ratingLabel.append(rating);
  const reviewLabel=make('label','','Tu reseña (opcional, hasta 1000 caracteres)');
  const review=make('textarea');review.maxLength=1000;review.rows=3;
  review.placeholder='¿Qué destacarías de esta serie? Evita spoilers sin avisar.';
  reviewLabel.append(review);
  const actions=make('div','sb-v3-inline-actions');
  const submit=make('button','gradient-btn mini','📣 Publicar reseña');submit.type='submit';
  const cancel=make('button','outline-btn mini','Cancelar edición');cancel.type='button';cancel.hidden=true;
  actions.append(submit,cancel);
  const feedback=make('p','sb-v3-feedback','Preparando reseñas…');feedback.setAttribute('role','status');
  form.append(titleLabel,ratingLabel,reviewLabel,actions);
  const tools=make('div','sb-v3-review-tools');
  const search=make('input');search.type='search';search.maxLength=120;
  search.placeholder='🔎 Buscar título o miembro';
  search.setAttribute('aria-label','Buscar reseñas compartidas');
  const sort=make('select');
  sort.setAttribute('aria-label','Ordenar reseñas');
  for(const [value,label] of [['recent','Más recientes'],['rating','Mayor valoración']]){
   const opt=make('option','',label);opt.value=value;sort.append(opt);
  }
  const refresh=make('button','outline-btn mini','↻ Actualizar reseñas');refresh.type='button';
  tools.append(search,sort,refresh);
  const list=make('div','sb-v3-review-list');
  panel.append(heading,explain,form,feedback,tools,list);
  const recommendation=root.querySelector('#sb-social-anime-recs');
  if(recommendation)recommendation.after(panel);else holder.append(panel);
  let me=null,records=[],comments=[],names=new Map(),editId=null,loading=false,busy=false,openReviews=new Set();
  const live=()=>panel.isConnected&&root.isConnected;
  const reset=()=>{
   editId=null;form.reset();title.value='';review.value='';rating.value='';
   submit.textContent='📣 Publicar reseña';cancel.hidden=true;
  };
  cancel.onclick=()=>{reset();feedback.textContent='Edición cancelada.';};

  const makeCommentForm=(item,parentId=null)=>{
   const commentForm=make('form','sb-v4-comment-form');
   const commentLabel=make('label','',parentId?'Responder al comentario':'Escribir un comentario');
   const textarea=make('textarea');
   textarea.rows=2;textarea.required=true;textarea.maxLength=800;
   textarea.placeholder=parentId?'Tu respuesta (máximo 800 caracteres)':'Comenta sobre esta reseña (máximo 800 caracteres)';
   commentLabel.append(textarea);
   const send=make('button','outline-btn mini',parentId?'↩️ Enviar respuesta':'💬 Publicar comentario');
   send.type='submit';
   const message=make('p','sb-v4-comment-message','');
   message.setAttribute('role','status');
   commentForm.append(commentLabel,send,message);
   commentForm.onsubmit=async e=>{
    e.preventDefault();
    if(busy||!me)return;
    const content=textarea.value.trim();
    if(content.length<1||content.length>800){
     message.textContent='Escribe entre 1 y 800 caracteres.';return;
    }
    busy=true;send.disabled=true;message.textContent='Guardando comentario…';
    try{
     const {data:{user},error:authError}=await sb.auth.getUser();
     if(authError||user?.id!==me.id)throw new Error('La sesión ha cambiado.');
     const {error}=await sb.from('sb_member_anime_review_comments').insert({
      review_id:item.id,author_id:me.id,parent_id:parentId,content
     });
     if(error)throw error;
     openReviews.add(item.id);
     await load();
     feedback.textContent='✅ Comentario publicado.';
    }catch(err){
     message.textContent='No se pudo publicar: '+errText(err);
    }finally{busy=false;send.disabled=false;}
   };
   return commentForm;
  };
  const appendDiscussion=(item,card)=>{
   const related=comments.filter(c=>c.review_id===item.id);
   const details=make('details','sb-v4-review-discussion');
   if(openReviews.has(item.id))details.open=true;
   const summary=make('summary','','💬 Comentarios y respuestas ('+related.length+')');
   details.append(summary);
   details.addEventListener('toggle',()=>{
    if(details.open)openReviews.add(item.id);
    else openReviews.delete(item.id);
   });
   const thread=make('div','sb-v4-review-thread');
   if(!related.length)thread.append(make('p','sb-v3-empty','Todavía no hay comentarios. ¡Participa!'));
   const parents=related.filter(c=>!c.parent_id);
   const addComment=(comment,reply=false)=>{
    const article=make('div','sb-v4-comment'+(reply?' sb-v4-comment-reply':''));
    article.append(make('strong','',comment.author_id===me?.id?'Tú':names.get(comment.author_id)||'Miembro'));
    article.append(make('small','',new Date(comment.created_at).toLocaleString('es-ES')));
    const text=make('p','',comment.content);article.append(text);
    const buttons=make('div','sb-v4-comment-actions');
    if(!reply){
     const replyButton=make('button','outline-btn mini','↩️ Responder');
     replyButton.type='button';
     const replyForm=makeCommentForm(item,comment.id);
     replyForm.hidden=true;
     replyButton.onclick=()=>{
      replyForm.hidden=!replyForm.hidden;
      if(!replyForm.hidden)replyForm.querySelector('textarea')?.focus();
     };
     buttons.append(replyButton);
     article.append(buttons,replyForm);
    }
    if(comment.author_id===me?.id){
     const del=make('button','outline-btn mini','Eliminar');del.type='button';
     del.onclick=async()=>{
      if(busy||!confirm('¿Eliminar este comentario? Sus respuestas también desaparecerán.'))return;
      busy=true;del.disabled=true;
      try{
       const {data:{user},error:authError}=await sb.auth.getUser();
       if(authError||user?.id!==me.id)throw new Error('La sesión ha cambiado.');
       const {error}=await sb.from('sb_member_anime_review_comments')
        .delete().eq('id',comment.id).eq('author_id',me.id);
       if(error)throw error;
       openReviews.add(item.id);
       await load();feedback.textContent='✅ Comentario eliminado.';
      }catch(err){feedback.textContent='No se pudo eliminar: '+errText(err);}
      finally{busy=false;del.disabled=false;}
     };
     buttons.append(del);
     if(reply)article.append(buttons);
    }
    return article;
   };
   for(const parent of parents){
    const top=addComment(parent);
    thread.append(top);
    for(const answer of related.filter(c=>c.parent_id===parent.id))
     thread.append(addComment(answer,true));
   }
   details.append(thread,makeCommentForm(item));
   card.append(details);
  };
  const paint=()=>{
   if(!live())return;
   const term=search.value.trim().toLocaleLowerCase('es');
   const filtered=records.filter(x=>
    (x.anime_title+' '+(names.get(x.author_id)||'')).toLocaleLowerCase('es').includes(term))
    .sort((a,b)=>sort.value==='rating'
     ?Number(b.rating)-Number(a.rating)||new Date(b.updated_at)-new Date(a.updated_at)
     :new Date(b.updated_at)-new Date(a.updated_at));
   list.replaceChildren();
   if(!filtered.length){
    list.append(make('p','sb-v3-empty',
      records.length?'No hay reseñas que coincidan.':'Todavía no hay reseñas compartidas. Publica la primera.'));
    return;
   }
   for(const item of filtered){
    const mine=item.author_id===me?.id;
    const card=make('article','sb-v3-review-card');
    card.append(make('strong','',item.anime_title));
    card.append(make('div','sb-v3-stars','★'.repeat(item.rating)+'☆'.repeat(5-item.rating)+' · '+item.rating+'/5'));
    card.append(make('small','',mine?'Tu reseña':(names.get(item.author_id)||'Miembro')));
    if(item.review){
     const details=make('details','sb-v3-review-details');
     details.append(make('summary','','Leer reseña (puede contener spoilers)'));
     details.append(make('p','',item.review));
     card.append(details);
    }
    if(mine){
     const row=make('div','sb-v3-inline-actions');
     const edit=make('button','outline-btn mini','✏️ Editar');edit.type='button';
     edit.onclick=()=>{
      editId=item.id;title.value=item.anime_title;rating.value=String(item.rating);
      review.value=item.review||'';cancel.hidden=false;
      submit.textContent='💾 Guardar cambios';
      form.scrollIntoView({behavior:'smooth',block:'start'});title.focus();
     };
     const remove=make('button','outline-btn mini','Eliminar');remove.type='button';
     remove.onclick=async()=>{
      if(busy||!confirm('¿Eliminar esta reseña para todos los miembros?'))return;
      busy=true;remove.disabled=true;feedback.textContent='Eliminando reseña…';
      try{
       const {data:{user},error:authError}=await sb.auth.getUser();
       if(authError||user?.id!==me.id)throw new Error('Sesión no válida');
       const {error}=await sb.from('sb_member_anime_reviews').delete()
        .eq('id',item.id).eq('author_id',me.id);
       if(error)throw error;
       reset();await load();feedback.textContent='✅ Reseña eliminada.';
      }catch(e){feedback.textContent='No se pudo eliminar: '+errText(e);}
      finally{busy=false;remove.disabled=false;}
     };
     row.append(edit,remove);card.append(row);
    }
    appendDiscussion(item,card);
    list.append(card);
   }
  };
  const load=async()=>{
   if(loading||!live())return;
   loading=true;feedback.textContent='Cargando opiniones compartidas…';refresh.disabled=true;
   try{
    const {data,error}=await sb.from('sb_member_anime_reviews')
     .select('id,author_id,anime_title,rating,review,created_at,updated_at')
     .order('updated_at',{ascending:false}).limit(150);
    if(error)throw error;
    if(!live())return;
    records=data||[];
    comments=[];
    if(records.length){
     const reviewIds=records.map(x=>x.id);
     const {data:answers,error:commentsError}=await sb.from('sb_member_anime_review_comments')
      .select('id,review_id,author_id,parent_id,content,created_at')
      .in('review_id',reviewIds)
      .order('created_at',{ascending:false}).limit(400);
     if(commentsError)throw commentsError;
     comments=(answers||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    }
    if(!live())return;
    const ids=[...new Set([...records.map(x=>x.author_id),...comments.map(x=>x.author_id)])];
    if(ids.length){
     const {data:profiles,error:profileError}=await sb.from('profiles')
      .select('id,display_name,username').in('id',ids);
     if(profileError)throw profileError;
     names=new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
    }
    paint();
    feedback.textContent=records.length+' reseñas disponibles. Los textos se abren al pulsar «Leer reseña».';
   }catch(e){if(live())feedback.textContent='No se pudieron cargar las reseñas: '+errText(e);}
   finally{loading=false;refresh.disabled=false;}
  };
  form.onsubmit=async event=>{
   event.preventDefault();
   if(busy||!me)return;
   const anime_title=title.value.trim().replace(/\s+/g,' ');
   const score=Number(rating.value);
   const text=review.value.trim();
   if(!anime_title||anime_title.length>120||!Number.isInteger(score)||score<1||score>5||text.length>1000){
    feedback.textContent='Revisa el título (máximo 120), la valoración (1–5) y el texto (máximo 1000).';return;
   }
   busy=true;submit.disabled=true;feedback.textContent='Guardando reseña…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||user?.id!==me.id)throw new Error('La sesión ha cambiado.');
    const payload={anime_title,rating:score,review:text,updated_at:new Date().toISOString()};
    const query=editId
     ?sb.from('sb_member_anime_reviews').update(payload).eq('id',editId).eq('author_id',me.id)
     :sb.from('sb_member_anime_reviews').insert({...payload,author_id:me.id});
    const {error}=await query;
    if(error)throw error;
    reset();await load();feedback.textContent='✅ Reseña publicada correctamente.';
   }catch(e){
    const duplicate=e?.code==='23505';
    feedback.textContent=duplicate
     ?'Ya has valorado este anime. Usa «Editar» en tu reseña.'
     :'No se pudo guardar: '+errText(e);
   }finally{busy=false;submit.disabled=false;}
  };
  search.oninput=paint;sort.onchange=paint;refresh.onclick=()=>void load();
  (async()=>{
   try{
    const {data:{user},error}=await sb.auth.getUser();
    if(error||!user)throw error||new Error('Debes iniciar sesión.');
    if(!live())return;
    me=user;await load();
   }catch(e){
    if(live()){feedback.textContent='Inicia sesión para consultar y escribir reseñas.';submit.disabled=true;refresh.disabled=true;}
   }
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