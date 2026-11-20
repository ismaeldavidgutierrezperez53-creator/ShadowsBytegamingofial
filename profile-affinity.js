/* Shadows Byte V2 — Afinidad gamer: coincidencias entre gustos, solo para el visitante. */
(()=>{
 'use strict';
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es');
 const splitGames=s=>String(s||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).slice(0,30);
 function mount(root){
  if(root.querySelector('.sbaf-panel'))return;
  const body=root.querySelector('.public-member-body');
  const anchor=body?.querySelector('.sbp-identity-card');
  if(!anchor)return;
  const panel=el('section','profile-panel sbaf-panel');
  panel.setAttribute('aria-label','Afinidad gamer');
  const head=el('h2','','💜 Afinidad gamer');
  const info=el('p','sbaf-sub','Descubre qué gustos compartís, sin mostrar los datos privados de tu cuenta.');
  const status=el('p','sbaf-status','Comparando gustos…');status.setAttribute('role','status');
  const chips=el('div','sbaf-chips');
  const actions=el('div','sbaf-actions');
  panel.append(head,info,status,chips,actions);
  // Mantener Afinidad delante de Escaparate, aunque los módulos carguen en distinto orden.
  const showcase=body.querySelector('.sb-showcase');
  if(showcase)showcase.before(panel);else anchor.after(panel);
  async function load(){
   if(typeof sb==='undefined'||!sb.auth||!sb.from){status.textContent='No se pudo conectar con los perfiles.';return}
   const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
   if(!id||!uuid.test(id)){panel.remove();return}
   try{
    const {data:auth,error:authError}=await sb.auth.getUser();
    if(authError)throw authError;
    const viewerId=auth?.user?.id;
    if(!viewerId){
     status.textContent='Inicia sesión para descubrir tus gustos en común.';
     const button=el('a','sbaf-action','Iniciar sesión');button.href='#/auth';actions.append(button);return;
    }
    if(viewerId===id){panel.remove();return}
    const [visitor,member]=await Promise.all([
      sb.from('profiles').select('favorite_anime,favorite_anime_character,favorite_games').eq('id',viewerId).maybeSingle(),
      sb.from('profiles').select('is_public,display_name,favorite_anime,favorite_anime_character,favorite_games').eq('id',id).eq('is_public',true).maybeSingle()
    ]);
    if(!panel.isConnected)return;
    if(visitor.error||member.error)throw(visitor.error||member.error);
    if(!member.data){panel.remove();return}
    const mine=visitor.data||{},theirs=member.data;
    const common=[];
    if(mine.favorite_anime&&norm(mine.favorite_anime)===norm(theirs.favorite_anime))common.push(['🌸 Anime favorito',theirs.favorite_anime]);
    if(mine.favorite_anime_character&&norm(mine.favorite_anime_character)===norm(theirs.favorite_anime_character))common.push(['⭐ Personaje favorito',theirs.favorite_anime_character]);
    const myGames=new Set(splitGames(mine.favorite_games).map(norm));
    for(const name of splitGames(theirs.favorite_games)){
      if(myGames.has(norm(name))&&!common.some(x=>x[0]==='🎮 Videojuego'&&norm(x[1])===norm(name)))common.push(['🎮 Videojuego',name]);
    }
    chips.replaceChildren();
    if(common.length){
     status.textContent='¡Tenéis '+common.length+' '+(common.length===1?'gusto en común!':'gustos en común!');
     for(const [label,value] of common){const chip=el('span','sbaf-chip',label+': '+value);chips.append(chip)}
    }else{
     status.textContent='Todavía no hay gustos favoritos coincidentes.';
     info.textContent='Completa tus animes, personajes y juegos favoritos en Mi cuenta para descubrir coincidencias.';
    }
    const message=el('a','sbaf-action','💬 Enviar mensaje');message.href='#/mensajes?id='+encodeURIComponent(id);
    const edit=el('a','sbaf-action','✨ Editar mis favoritos');edit.href='#/cuenta';
    actions.append(message,edit);
   }catch(_){if(panel.isConnected)status.textContent='No se pudo calcular la afinidad gamer.'}
  }
  load();
 }
 let queued=false;
 // Los paneles se insertan de forma asíncrona: corregir únicamente cuando
 // el orden real cambie, para evitar saltos de scroll y bucles del observer.
 function stabilizeOrder(root){
  const body=root.querySelector('.public-member-body');
  const anchor=body?.querySelector('.sbp-identity-card');
  const affinity=body?.querySelector('.sbaf-panel');
  if(!anchor||!affinity)return;
  if(anchor.nextElementSibling!==affinity)anchor.after(affinity);
  const showcase=body.querySelector('.sb-showcase');
  if(showcase&&affinity.nextElementSibling!==showcase)affinity.after(showcase);
 }
 function scan(){
  queued=false;
  const root=document.getElementById('public-member-profile');
  if(root?.querySelector('.sbp-identity-card')){mount(root);stabilizeOrder(root)}
 }
 const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(scan)};
 const init=()=>{const app=document.getElementById('app');if(!app)return;new MutationObserver(schedule).observe(app,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
