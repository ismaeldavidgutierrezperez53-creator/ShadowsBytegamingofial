/* Escaparate gamer: selección basada en valoraciones, sin cambiar permisos ni tablas. */
(() => {
 'use strict';
 const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
 const https=url=>typeof url==='string'&&/^https:\/\/[^\s]+$/i.test(url);
 function showGames(host,own){
  if(host.querySelector('.sb-showcase'))return;
  const anchor=host.querySelector('.sbp-identity-card');if(!anchor)return;
  const panel=make('section','profile-panel sb-showcase');
  const h=make('h2','','🎖️ Escaparate gamer');
  const intro=make('p','sb-showcase-intro','Tus juegos destacados, ordenados por valoración.');
  const grid=make('div','sb-showcase-grid');
  grid.setAttribute('aria-live','polite');
  const message=make('p','sb-showcase-message','Cargando videojuegos…');
  panel.append(h,intro,message,grid);anchor.after(panel);
  if(typeof sb==='undefined' || !sb.auth || !sb.from){message.textContent='La conexión de videojuegos no está disponible.';return}
  async function load(){
   try{
    const {data:auth,error:authError}=await sb.auth.getUser();
    if(authError)throw authError;
    const id=own?auth?.user?.id:new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!id){message.textContent=own?'Inicia sesión para ver tus videojuegos.':'Perfil no disponible.';return}
    if(!own){
     const check=await sb.from('profiles').select('is_public,game_library_public').eq('id',id).maybeSingle();
     if(check.error)throw check.error;
     if(!check.data?.is_public||!check.data?.game_library_public){panel.remove();return}
    }
    const {data,error}=await sb.from('member_game_library')
     .select('title,status,platform,cover_url,rating,review')
     .eq('user_id',id).order('created_at',{ascending:false}).limit(200);
    if(error)throw error;
    if(!panel.isConnected)return;
    const games=(data||[]).slice().sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0)).slice(0,3);
    message.textContent=games.length?'Tus favoritos de la colección'.replace('Tus',own?'Tus':'Juegos'):'Todavía no hay videojuegos en el escaparate.';
    intro.textContent=own?'Vista privada de los juegos mejor valorados de tu biblioteca.':'Selección de la biblioteca que este miembro decidió compartir.';
    grid.replaceChildren();
    for(const game of games){
     const card=make('article','sb-showcase-game');
     const art=make('div','sb-showcase-art');
     if(https(game.cover_url)){
      const image=make('img');image.src=game.cover_url;image.loading='lazy';image.alt='Portada de '+game.title;image.referrerPolicy='no-referrer';image.onerror=()=>art.replaceChildren(document.createTextNode('🎮'));art.append(image)
     }else art.textContent='🎮';
     const body=make('div','sb-showcase-body');
     body.append(make('h3','',game.title||'Videojuego'));
     const meta=make('p','',[(game.platform||''),({playing:'🎮 Jugando',completed:'🏆 Terminado',wishlist:'⭐ Pendiente'}[game.status]||'')].filter(Boolean).join(' · '));body.append(meta);
     const stars=Number(game.rating);
     if(Number.isInteger(stars)&&stars>=1&&stars<=5)body.append(make('span','sb-showcase-stars','★'.repeat(stars)+'☆'.repeat(5-stars)));
     if(game.review)body.append(make('p','sb-showcase-review',game.review.slice(0,160)+(game.review.length>160?'…':'')));
     card.append(art,body);grid.append(card);
    }
    const button=make('button','sbp-action',own?'🎮 Ir a Mi biblioteca':'🎮 Ver biblioteca completa');
    button.type='button';
    button.addEventListener('click',()=>{
     const dest=host.querySelector(own?'#game-library':'.public-game-library');
     if(dest)dest.scrollIntoView({behavior:'smooth',block:'start'});
    });
    if(games.length)panel.append(button);
   }catch(e){if(panel.isConnected)message.textContent='No se pudieron cargar los juegos del escaparate.'}
  }
  load();
 }
 let queued=false;
 function scan(){
  queued=false;
  const own=document.getElementById('account-profile');if(own?.querySelector('.sbp-identity-card'))showGames(own,true);
  const publicRoot=document.getElementById('public-member-profile');if(publicRoot?.querySelector('.sbp-identity-card'))showGames(publicRoot,false);
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan)}
 const init=()=>{const root=document.getElementById('app');if(!root)return;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
