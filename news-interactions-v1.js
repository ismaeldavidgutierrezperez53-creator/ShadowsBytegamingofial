/* Noticias V2: comentarios, ❤️, visitas únicas aproximadas y relacionadas. */
(function(){
  'use strict';
  if(typeof sb==='undefined') return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cover=v=>typeof v==='string'&&/^https:\/\//i.test(v.trim())?v.trim():'';
  const date=v=>{const d=new Date(v);return v&&!Number.isNaN(d.getTime())?d.toLocaleString('es-ES',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';};
  const current=id=>location.hash.startsWith('#/noticia?')&&document.getElementById('sb-news-interactions')?.dataset.newsId===id;
  const setStatus=(id,message)=>{const node=document.getElementById(id);if(node)node.textContent=message;};
  function uuid(){
    if(window.crypto?.randomUUID)return window.crypto.randomUUID();
    const b=new Uint8Array(16);window.crypto.getRandomValues(b);
    b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    const hex=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }
  function visitorId(articleId){
    const key='sb-news-visit-v1:'+articleId;
    try{
      let id=localStorage.getItem(key);
      if(!id||!/^[a-f0-9-]{36}$/i.test(id)){id=uuid();localStorage.setItem(key,id);}
      return id;
    }catch(_){return uuid();}
  }
  async function trackViews(articleId){
    try{
      const {data,error}=await sb.rpc('news_record_view',{p_news_id:articleId,p_visitor_id:visitorId(articleId)});
      if(error)throw error;
      if(current(articleId))setStatus('sb-news-views','👁 '+Number(data||0).toLocaleString('es-ES')+' visitas');
    }catch(error){console.error('Contador de noticia:',error);if(current(articleId))setStatus('sb-news-views','👁 Visitas no disponibles');}
  }
  async function updateLikes(articleId,user){
    const button=document.getElementById('sb-news-like');
    if(!button)return;
    try{
      const requests=[sb.from('news_reactions').select('news_id',{count:'exact',head:true}).eq('news_id',articleId)];
      if(user)requests.push(sb.from('news_reactions').select('news_id').eq('news_id',articleId).eq('user_id',user.id).maybeSingle());
      const [total,own]=await Promise.all(requests);
      if(total.error)throw total.error;
      if(own?.error)throw own.error;
      if(!current(articleId))return;
      const active=Boolean(own?.data);
      button.dataset.liked=String(active);
      button.setAttribute('aria-pressed',String(active));
      button.textContent=(active?'❤️':'🤍')+' Me gusta · '+Number(total.count||0).toLocaleString('es-ES');
      button.disabled=false;
    }catch(error){console.error('Reacciones:',error);if(current(articleId)){button.textContent='❤️ Reacciones no disponibles';button.disabled=true;}}
  }
  function setupLike(articleId,user){
    const button=document.getElementById('sb-news-like');
    if(!button)return;
    if(!user){
      button.textContent='🤍 Inicia sesión para dar Me gusta';
      button.addEventListener('click',()=>{location.hash='#/auth';});
    }else button.addEventListener('click',async()=>{
      if(button.disabled)return;
      button.disabled=true;
      const liked=button.dataset.liked==='true';
      try{
        const {error}=liked
          ?await sb.from('news_reactions').delete().eq('news_id',articleId).eq('user_id',user.id)
          :await sb.from('news_reactions').insert({news_id:articleId,user_id:user.id});
        if(error&&error.code!=='23505')throw error;
      }catch(error){console.error('No se pudo guardar Me gusta:',error);setStatus('sb-news-action-status','No se pudo actualizar tu reacción. Inténtalo de nuevo.');}
      await updateLikes(articleId,user);
    });
    updateLikes(articleId,user);
  }
  async function loadComments(articleId,user){
    const host=document.getElementById('sb-news-comments-list');
    if(!host)return;
    try{
      const {data:comments,error}=await sb.from('news_comments')
        .select('id,author_id,parent_id,content,created_at').eq('news_id',articleId)
        .order('created_at',{ascending:false}).limit(150);
      if(error)throw error;
      if(!current(articleId))return;
      const all=comments||[];
      const authorIds=[...new Set(all.map(c=>c.author_id))];
      const names=new Map();
      if(authorIds.length){
        const {data:profiles,error:profileError}=await sb.from('profiles')
          .select('id,display_name,username,is_public').in('id',authorIds).eq('is_public',true);
        if(!profileError)(profiles||[]).forEach(p=>names.set(p.id,String(p.display_name||p.username||'Miembro')));
      }
      if(!current(articleId))return;
      const total=document.getElementById('sb-news-comments-total');
      if(total)total.textContent=all.length+' comentario'+(all.length===1?'':'s')+(all.length===150?' (mostrando los últimos 150)':'');
      if(!all.length){host.innerHTML='<p class="sb-news-no-comments">Todavía no hay comentarios. ¡Sé el primero!</p>';return;}
      const isAdmin=user?.app_metadata?.role==='admin';
      const byId=new Map(all.map(c=>[c.id,c]));
      const children=new Map();
      const roots=[];
      for(const c of all){
        if(c.parent_id&&byId.has(c.parent_id)){
          if(!children.has(c.parent_id))children.set(c.parent_id,[]);
          children.get(c.parent_id).push(c);
        }else roots.push(c);
      }
      // Si la respuesta original no figura entre los 150 últimos, se muestra como hilo independiente.
      for(const list of children.values())list.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      const renderComment=(c,depth=0)=>{
        const name=user?.id===c.author_id?'Tú':names.get(c.author_id)||'Miembro';
        const canDelete=user&&(user.id===c.author_id||isAdmin);
        const childHtml=(children.get(c.id)||[]).map(reply=>renderComment(reply,depth+1)).join('');
        return '<article class="sb-news-comment'+(depth?' sb-news-comment-reply':'')+'" id="news-comment-'+esc(c.id)+'" tabindex="-1" data-depth="'+Math.min(depth,5)+'">'+
          '<div class="sb-news-comment-head"><strong>'+esc(name)+'</strong><time datetime="'+esc(c.created_at)+'">'+esc(date(c.created_at))+'</time></div>'+
          '<p>'+esc(c.content).replace(/\\n/g,'<br>')+'</p>'+
          '<div class="sb-news-comment-actions">'+
          (user?'<button type="button" class="sb-news-reply-btn" data-reply-id="'+esc(c.id)+'" data-reply-name="'+esc(name)+'">↩ Responder</button>':'')+
          (canDelete?'<button type="button" class="sb-news-delete-comment" data-comment-id="'+esc(c.id)+'" aria-label="Eliminar comentario">Eliminar</button>':'')+
          '</div><div class="sb-news-reply-form-slot" data-reply-slot="'+esc(c.id)+'"></div>'+
          (childHtml?'<div class="sb-news-reply-thread">'+childHtml+'</div>':'')+'</article>';
      };
      host.innerHTML=roots.map(c=>renderComment(c)).join('');
      host.querySelectorAll('[data-comment-id]').forEach(btn=>btn.addEventListener('click',async()=>{
        if(!window.confirm('¿Eliminar este comentario y sus respuestas?'))return;
        btn.disabled=true;
        const {error:deleteError}=await sb.from('news_comments').delete().eq('id',btn.dataset.commentId).eq('news_id',articleId);
        if(deleteError){setStatus('sb-news-comments-status','No se pudo eliminar el comentario.');btn.disabled=false;return;}
        setStatus('sb-news-comments-status','Comentario eliminado.');
        await loadComments(articleId,user);
      }));
      host.querySelectorAll('[data-reply-id]').forEach(btn=>btn.addEventListener('click',()=>{
        const slot=host.querySelector('[data-reply-slot="'+btn.dataset.replyId+'"]');
        if(!slot)return;
        host.querySelectorAll('.sb-news-reply-form-slot').forEach(other=>{if(other!==slot)other.replaceChildren();});
        if(slot.hasChildNodes()){slot.replaceChildren();return;}
        const form=document.createElement('form');
        form.className='sb-news-inline-reply-form';
        const label=document.createElement('label');label.textContent='Responder a '+btn.dataset.replyName;
        const textarea=document.createElement('textarea');textarea.rows=3;textarea.maxLength=1500;
        textarea.required=true;textarea.placeholder='Escribe tu respuesta…';
        const controls=document.createElement('div');controls.className='sb-news-reply-controls';
        const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.className='sb-news-reply-cancel';
        cancel.onclick=()=>form.remove();
        const send=document.createElement('button');send.type='submit';send.textContent='Enviar respuesta';send.className='sb-news-submit';
        controls.append(cancel,send);form.append(label,textarea,controls);slot.append(form);textarea.focus();
        form.onsubmit=async event=>{
          event.preventDefault();
          const content=textarea.value.trim();
          if(!content||content.length>1500){setStatus('sb-news-comments-status','Escribe entre 1 y 1500 caracteres.');return;}
          send.disabled=true;setStatus('sb-news-comments-status','Enviando respuesta…');
          try{
            const {error:replyError}=await sb.from('news_comments').insert({
              news_id:articleId,author_id:user.id,parent_id:btn.dataset.replyId,content
            });
            if(replyError)throw replyError;
            if(!current(articleId))return;
            setStatus('sb-news-comments-status','Respuesta publicada. El autor recibirá una notificación.');
            await loadComments(articleId,user);
          }catch(error){
            console.error('Responder comentario:',error);
            if(current(articleId))setStatus('sb-news-comments-status','No se pudo publicar la respuesta.');
            if(form.isConnected)send.disabled=false;
          }
        };
      }));
      const requestedId=new URLSearchParams(location.hash.split('?').slice(1).join('?')).get('comment');
      if(requestedId&&/^[0-9a-f-]{36}$/i.test(requestedId)){
        const destination=document.getElementById('news-comment-'+requestedId);
        if(destination){
          requestAnimationFrame(()=>{
            if(destination.isConnected&&current(articleId)){
              destination.scrollIntoView({behavior:'smooth',block:'center'});
              destination.focus({preventScroll:true});
            }
          });
        }
      }
    }catch(error){
      console.error('Comentarios de noticia:',error);
      if(current(articleId))host.innerHTML='<p>No se pudieron cargar los comentarios. Vuelve a abrir la noticia para reintentar.</p>';
    }
  }
  function setupCommentForm(articleId,user){
    const wrap=document.getElementById('sb-news-comment-form-wrap');
    if(!wrap)return;
    if(!user){wrap.innerHTML='<p>Para comentar, <a href="#/auth">inicia sesión</a> con tu cuenta.</p>';return;}
    wrap.innerHTML='<form id="sb-news-comment-form"><label for="sb-news-comment-text">Escribe un comentario</label>'+
      '<textarea id="sb-news-comment-text" rows="4" maxlength="1500" placeholder="Comparte tu opinión con respeto…" required></textarea>'+
      '<div class="sb-news-form-bottom"><span>Máximo 1500 caracteres</span><button type="submit" class="sb-news-submit">Publicar comentario</button></div></form>';
    document.getElementById('sb-news-comment-form')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget;
      const area=form.querySelector('textarea');
      const button=form.querySelector('button[type=submit]');
      const content=area.value.trim();
      if(content.length<1||content.length>1500){setStatus('sb-news-comments-status','Escribe entre 1 y 1500 caracteres.');return;}
      button.disabled=true;setStatus('sb-news-comments-status','Publicando comentario…');
      try{
        const {error}=await sb.from('news_comments').insert({news_id:articleId,author_id:user.id,content});
        if(error)throw error;
        if(!current(articleId))return;
        area.value='';
        setStatus('sb-news-comments-status','Comentario publicado.');
        await loadComments(articleId,user);
      }catch(error){console.error('Publicar comentario:',error);if(current(articleId))setStatus('sb-news-comments-status','No se pudo publicar el comentario. Inténtalo de nuevo.');}
      finally{if(current(articleId))button.disabled=false;}
    });
  }
  function keywords(text){
    const stop=new Set(['como','para','sobre','entre','esta','este','estas','estos','una','uno','unos','unas','que','del','las','los','con','por','sin','desde','noticia','noticias','shadows','gaming','official','byte','tiene','puede']);
    return new Set(String(text||'').toLocaleLowerCase('es').split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=4&&!stop.has(w)));
  }
  async function loadRelated(news){
    const host=document.getElementById('sb-news-related-list');if(!host)return;
    try{
      const {data,error}=await sb.from('news')
        .select('id,title,excerpt,cover_url,published_at').eq('status','published')
        .lte('published_at',new Date().toISOString()).neq('id',news.id)
        .order('published_at',{ascending:false}).limit(18);
      if(error)throw error;
      if(!current(news.id))return;
      if(!data?.length){host.innerHTML='<p>Aún no hay más noticias publicadas.</p>';return;}
      const reference=keywords((news.title||'')+' '+(news.excerpt||''));
      const scored=data.map((item,index)=>{
        const terms=keywords((item.title||'')+' '+(item.excerpt||''));
        let score=0;for(const t of terms)if(reference.has(t))score++;
        return {...item,score,index};
      }).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3);
      host.innerHTML=scored.map(item=>{
        const image=cover(item.cover_url);
        const href='#/noticia?id='+encodeURIComponent(item.id);
        return '<a class="sb-news-related-card" href="'+esc(href)+'">'+
          (image?'<img src="'+esc(image)+'" alt="" loading="lazy" onerror="this.hidden=true">':'<span class="sb-news-related-placeholder">📰</span>')+
          '<span class="sb-news-related-card-body"><strong>'+esc(item.title||'Noticia')+'</strong>'+
          '<small>'+esc(date(item.published_at))+'</small></span></a>';
      }).join('');
    }catch(error){console.error('Noticias relacionadas:',error);if(current(news.id))host.innerHTML='<p>No se pudieron cargar más noticias.</p>';}
  }
  window.sbNewsEnhanceArticle=async function(news){
    const article=document.querySelector('.sb-full-news');
    if(!article||!news?.id||article.querySelector('#sb-news-interactions'))return;
    const footer=article.querySelector('.sb-full-news-footer');
    if(!footer)return;
    const section=document.createElement('section');
    section.id='sb-news-interactions';
    section.className='sb-news-interactions';
    section.dataset.newsId=news.id;
    section.innerHTML='<div class="sb-news-engagement"><span id="sb-news-views">👁 Cargando visitas…</span>'+
      '<button type="button" id="sb-news-like" class="sb-news-like" disabled>❤️ Cargando reacciones…</button>'+
      '<p id="sb-news-action-status" role="status" aria-live="polite"></p></div>'+
      '<section class="sb-news-comments" aria-labelledby="sb-news-comments-heading">'+
      '<h2 id="sb-news-comments-heading">💬 Comentarios <small id="sb-news-comments-total"></small></h2>'+
      '<div id="sb-news-comments-list"><p>Cargando comentarios…</p></div>'+
      '<div id="sb-news-comment-form-wrap"></div><p id="sb-news-comments-status" role="status" aria-live="polite"></p></section>'+
      '<section class="sb-news-related" aria-labelledby="sb-news-related-heading"><h2 id="sb-news-related-heading">📰 Noticias relacionadas</h2>'+
      '<div id="sb-news-related-list" class="sb-news-related-list"><p>Buscando más noticias…</p></div></section>';
    footer.before(section);
    trackViews(news.id);
    loadRelated(news);
    let user=null;
    try{const result=await sb.auth.getUser();user=result.data?.user||null;}catch(error){console.error('Sesión de comentarios:',error);}
    if(!current(news.id))return;
    setupLike(news.id,user);
    setupCommentForm(news.id,user);
    loadComments(news.id,user);
  };
})();
