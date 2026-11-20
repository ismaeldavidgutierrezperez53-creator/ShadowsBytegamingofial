/* Shadows Byte V2 — descubre miembros afines, usando únicamente perfiles públicos. */
(()=>{
 'use strict';
 const node=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
 const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es');
 const games=value=>new Set(String(value||'').split(/[,;\n]/).map(normal).filter(Boolean).slice(0,30));
 const validImage=value=>typeof value==='string'&&/^https:\/\/[^\s]+$/i.test(value);
 function mount(root){
  if(root.querySelector('.sbd-discovery'))return;
  // Anclar directamente al perfil de cuenta: no depender de las tarjetas adicionales.
  const anchor=root.querySelector('.sbp-dashboard')||root.querySelector('.profile-identity')||root.querySelector('.profile-body');
  if(!anchor || !root.querySelector('#profile-form'))return;
  const panel=node('section','profile-panel sbd-discovery');
  panel.setAttribute('aria-label','Descubre miembros afines');
  const header=node('h2','','🧭 Descubre miembros afines');
  const caption=node('p','sbd-muted','Encuentra miembros que comparten tus animes, personajes y videojuegos favoritos.');
  const status=node('p','sbd-muted','Buscando perfiles afines…');status.setAttribute('role','status');
  const results=node('div','sbd-results');
  const toolbar=node('div','sbd-toolbar');
  const explore=node('a','sbd-link','👥 Ver todos los miembros');explore.href='#/miembros';
  const refresh=node('button','sbd-link','↻ Actualizar sugerencias');refresh.type='button';
  toolbar.append(explore,refresh);
  panel.append(header,caption,status,results,toolbar);anchor.after(panel);
  async function load(){
   if(typeof sb==='undefined'||!sb.auth||!sb.from){status.textContent='La conexión no está disponible.';return}
   refresh.disabled=true;status.textContent='Buscando miembros afines…';
   try{
    const {data:auth,error:authError}=await sb.auth.getUser();
    if(authError)throw authError;
    const userId=auth?.user?.id;
    if(!userId){status.textContent='Inicia sesión para encontrar miembros afines.';return}
    const [myResult,publicResult]=await Promise.all([
      sb.from('profiles').select('favorite_anime,favorite_anime_character,favorite_games').eq('id',userId).maybeSingle(),
      sb.from('profiles').select('id,display_name,username,avatar_url,favorite_anime,favorite_anime_character,favorite_games,gaming_status').eq('is_public',true).neq('id',userId).limit(100)
    ]);
    if(!panel.isConnected)return;
    if(myResult.error||publicResult.error)throw(myResult.error||publicResult.error);
    const mine=myResult.data||{},myGames=games(mine.favorite_games);
    const ranked=(publicResult.data||[]).map(p=>{
      const common=[];
      if(normal(mine.favorite_anime)&&normal(mine.favorite_anime)===normal(p.favorite_anime))common.push('🌸 Anime: '+p.favorite_anime);
      if(normal(mine.favorite_anime_character)&&normal(mine.favorite_anime_character)===normal(p.favorite_anime_character))common.push('⭐ Personaje: '+p.favorite_anime_character);
      const matched=new Set();
      for(const g of String(p.favorite_games||'').split(/[,;\n/]/).map(x=>x.trim()).filter(Boolean)){
        if(myGames.has(normal(g))&&!matched.has(normal(g))){matched.add(normal(g));common.push('🎮 '+g)}
      }
      return {...p,common,score:common.length};
    }).sort((a,b)=>b.score-a.score||String(a.display_name||a.username||'').localeCompare(String(b.display_name||b.username||''),'es')).slice(0,6);
    results.replaceChildren();
    if(!ranked.length){status.textContent='Todavía no hay otros perfiles públicos.';return}
    const matches=ranked.filter(p=>p.score>0).length;
    status.textContent=matches?matches+' perfiles con gustos en común entre las sugerencias.':'Aún no hay coincidencias; estos son algunos miembros públicos.';
    ranked.forEach(p=>{
      const card=node('article','sbd-member');
      const head=node('div','sbd-member-top');
      const avatar=node('div','sbd-avatar',(p.display_name||p.username||'M').slice(0,1).toUpperCase());
      if(validImage(p.avatar_url)){
       const img=node('img');img.src=p.avatar_url;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>avatar.replaceChildren(document.createTextNode('🎮'));avatar.replaceChildren(img);
      }
      const detail=node('div','sbd-member-heading');
      detail.append(node('strong','',p.display_name||p.username||'Miembro'),node('span','',p.score?p.score+' coincidencia'+(p.score===1?'':'s'):'Descubre su perfil'));
      head.append(avatar,detail);card.append(head);
      const chips=node('div','sbd-tags');
      p.common.slice(0,3).forEach(text=>chips.append(node('span','sbd-tag',text)));
      if(!p.common.length)chips.append(node('span','sbd-tag','✨ Nuevo miembro por conocer'));
      card.append(chips);
      const link=node('a','sbd-link','Ver perfil');link.href='#/perfil?id='+encodeURIComponent(p.id);card.append(link);
      results.append(card);
    });
   }catch(_){if(panel.isConnected)status.textContent='No se pudieron cargar las recomendaciones.'}
   finally{refresh.disabled=false}
  }
  refresh.onclick=load;load();
 }
 let pending=false;
 function scan(){pending=false;const root=document.getElementById('account-profile');if(root?.querySelector('#profile-form'))mount(root)}
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(scan)}
 function init(){const app=document.getElementById('app');if(!app)return;new MutationObserver(schedule).observe(app,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
