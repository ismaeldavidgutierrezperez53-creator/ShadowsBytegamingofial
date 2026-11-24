/* Reacciones emoji a las reseñas públicas de anime y sus comentarios.
   Un voto por persona y elemento; pulsar el mismo emoji lo elimina. */
(()=>{
 'use strict';
 const EMOJIS=[['heart','❤️','Me encanta'],['laugh','😂','Me divierte'],
  ['fire','🔥','Increíble'],['clap','👏','Aplauso'],['wow','😮','Sorprendente']];
 const create=(tag,cls,txt)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=String(txt);
  return el;
 };
 let me=null,authPromise=null,reactions=[],loaded=false,loadPromise=null;
 const busy=new Set();
 const panel=()=>document.getElementById('sb-shared-anime-reviews');
 const elements=()=>[...document.querySelectorAll(
  '#sb-shared-anime-reviews article.sb-v3-review-card[data-review-id],'+
  '#sb-shared-anime-reviews .sb-v4-comment[data-comment-id]')];
 const kind=id=>id.dataset.reviewId?'review':'comment';
 const target=id=>id.dataset.reviewId||id.dataset.commentId;
 const byTarget=(type,id)=>reactions.filter(r=>type==='review'?r.review_id===id:r.comment_id===id);
 function ensureBar(el){
  if(el.querySelector(':scope > .sb-v6-emoji-bar'))return false;
  const type=kind(el),id=target(el);
  if(!id)return false;
  const bar=create('div','sb-v6-emoji-bar');
  bar.dataset.type=type;bar.dataset.targetId=id;
  bar.setAttribute('role','group');
  bar.setAttribute('aria-label','Reacciones a '+(type==='review'?'esta reseña':'este comentario'));
  for(const [key,emoji,label] of EMOJIS){
   const button=create('button','sb-v6-emoji-button',emoji);
   button.type='button';button.dataset.emoji=key;
   button.setAttribute('aria-label',label);
   button.setAttribute('aria-pressed','false');
   bar.append(button);
  }
  const message=create('small','sb-v6-emoji-status','');
  message.setAttribute('role','status');bar.append(message);
  if(type==='review'){
   const discussion=el.querySelector(':scope > .sb-v4-review-discussion');
   if(discussion)discussion.before(bar);
   else el.append(bar);
  }else{
   const content=el.querySelector(':scope > p');
   if(content)content.after(bar);
   else el.append(bar);
  }
  return true;
 }
 function paint(){
  if(!loaded)return;
  for(const bar of document.querySelectorAll('#sb-shared-anime-reviews .sb-v6-emoji-bar')){
   const type=bar.dataset.type,id=bar.dataset.targetId;
   const votes=byTarget(type,id);
   const own=votes.find(v=>v.user_id===me?.id);
   for(const button of bar.querySelectorAll('button[data-emoji]')){
    const key=button.dataset.emoji;
    const selected=own?.emoji===key;
    button.setAttribute('aria-pressed',String(selected));
    const count=votes.filter(v=>v.emoji===key).length;
    const info=EMOJIS.find(x=>x[0]===key);
    button.textContent=info[1]+' '+count;
    button.title=info[2]+': '+count+(selected?' · Tu reacción':'');
    button.disabled=busy.has(type+':'+id)||!me;
   }
  }
 }
 async function getMe(){
  if(me)return me;
  if(!authPromise)authPromise=sb.auth.getUser().then(({data,error})=>{
   if(error)throw error;
   me=data?.user||null;return me;
  }).catch(()=>null);
  return authPromise;
 }
 async function refresh(){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
   const p=panel();if(!p||typeof sb==='undefined')return;
   await getMe();
   const els=elements();
   const reviews=[...new Set(els.map(e=>e.dataset.reviewId).filter(Boolean))];
   const comments=[...new Set(els.map(e=>e.dataset.commentId).filter(Boolean))];
   const tasks=[];
   if(reviews.length)tasks.push(sb.from('sb_anime_discussion_reactions')
    .select('id,user_id,review_id,comment_id,emoji').in('review_id',reviews).limit(3000));
   if(comments.length)tasks.push(sb.from('sb_anime_discussion_reactions')
    .select('id,user_id,review_id,comment_id,emoji').in('comment_id',comments).limit(3000));
   if(!tasks.length){reactions=[];loaded=true;paint();return;}
   const results=await Promise.all(tasks);
   const failed=results.find(x=>x.error);
   if(failed?.error){
    for(const status of p.querySelectorAll('.sb-v6-emoji-status'))
     status.textContent='No se pudieron cargar las reacciones: '+failed.error.message;
    return;
   }
   reactions=results.flatMap(x=>x.data||[]);
   loaded=true;paint();
  })().finally(()=>{loadPromise=null;});
  return loadPromise;
 }
 async function react(bar,key){
  const type=bar.dataset.type,targetId=bar.dataset.targetId;
  const busyKey=type+':'+targetId;
  if(!targetId||busy.has(busyKey))return;
  const current=await getMe();
  if(!current){bar.querySelector('.sb-v6-emoji-status').textContent='Inicia sesión para reaccionar.';return;}
  const status=bar.querySelector('.sb-v6-emoji-status');
  busy.add(busyKey);status.textContent='Guardando reacción…';paint();
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.id!==current.id)throw new Error('La sesión ha cambiado.');
   const existing=byTarget(type,targetId).find(x=>x.user_id===user.id);
   const table=sb.from('sb_anime_discussion_reactions');
   let query;
   if(existing?.emoji===key)
    query=table.delete().eq('id',existing.id).eq('user_id',user.id);
   else if(existing)
    query=table.update({emoji:key}).eq('id',existing.id).eq('user_id',user.id);
   else
    query=table.insert({user_id:user.id,emoji:key,
     ...(type==='review'?{review_id:targetId}:{comment_id:targetId})});
   const {error}=await query;
   if(error)throw error;
   await refresh();status.textContent='✅ Reacción actualizada.';
  }catch(err){
   status.textContent='No se pudo guardar: '+(err?.message||'Error');
  }finally{busy.delete(busyKey);paint();}
 }
 function scan(){
  if(typeof sb==='undefined'||!sb.auth)return;
  const p=panel();if(!p)return;
  let changed=false;
  for(const el of elements())if(ensureBar(el))changed=true;
  if(changed){paint();void refresh();}
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  let pending=false;
  const schedule=()=>{
   if(pending)return;pending=true;
   queueMicrotask(()=>{pending=false;scan();});
  };
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
   const button=e.target.closest?.('#sb-shared-anime-reviews .sb-v6-emoji-bar button[data-emoji]');
   if(!button)return;
   void react(button.closest('.sb-v6-emoji-bar'),button.dataset.emoji);
  });
  window.addEventListener('hashchange',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();