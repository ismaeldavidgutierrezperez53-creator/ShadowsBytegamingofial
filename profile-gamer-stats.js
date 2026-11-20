/* Shadows Byte V2 — estadísticas gamer, sin nuevas tablas ni permisos. */
(() => {
 'use strict';
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 function addStats(root,owner){
  if(root.querySelector('.sbg-stats'))return;
  const anchor=root.querySelector('.sb-showcase')||root.querySelector('.sbp-identity-card');
  if(!anchor)return;
  const card=el('section','profile-panel sbg-stats');
  card.setAttribute('aria-label',owner?'Mis estadísticas gamer':'Estadísticas gamer públicas');
  const heading=el('h2','','📊 Estadísticas gamer');
  const description=el('p','sbg-muted',owner?'Tu progreso y distribución de videojuegos.':'Resumen de progreso del miembro.');
  const status=el('p','sbg-muted','Cargando estadísticas…');status.setAttribute('role','status');
  const achievements=el('div','sbg-xp');
  const games=el('div','sbg-games');
  card.append(heading,description,status,achievements,games);anchor.after(card);
  async function render(){
   try{
    if(typeof sb==='undefined'||!sb.auth||!sb.from)return void(status.textContent='No se puede conectar con Supabase.');
    let id;
    if(owner){
     const {data,error}=await sb.auth.getUser();if(error)throw error;
     id=data?.user?.id;
    }else id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!id||!uuid.test(id))return void(status.textContent='No se ha encontrado el perfil.');
    const check=await sb.from('profiles').select('is_public,game_library_public').eq('id',id).maybeSingle();
    if(check.error)throw check.error;
    if(!owner&&!check.data?.is_public){card.remove();return}
    const xpRequest=sb.rpc('community_member_xp',{target_member:id});
    const shareLibrary=owner||(check.data?.game_library_public===true);
    const libraryRequest=shareLibrary?sb.from('member_game_library').select('status,rating').eq('user_id',id).limit(1000):Promise.resolve({data:[],error:null});
    const [xpResponse,libraryResponse]=await Promise.all([xpRequest,libraryRequest]);
    if(!card.isConnected)return;
    achievements.replaceChildren();games.replaceChildren();
    if(xpResponse.error||xpResponse.data===null){
     achievements.append(el('p','sbg-muted','El progreso de XP no está disponible.'));
    }else{
     const xp=Math.max(0,Number(xpResponse.data)||0);
     const level=Math.floor(Math.sqrt(xp/100))+1;
     const floor=100*(level-1)*(level-1),next=100*level*level;
     const title=el('strong','sbg-xp-label','🏆 Nivel '+level+' · '+xp+' XP');
     const progress=el('progress','sbg-progress');progress.max=next-floor;progress.value=Math.min(next-floor,Math.max(0,xp-floor));
     progress.setAttribute('aria-label','Experiencia hacia el nivel '+(level+1));
     const nextText=el('p','sbg-muted',Math.max(0,next-xp)+' XP para el siguiente nivel');
     achievements.append(title,progress,nextText);
    }
    if(!shareLibrary){
     games.append(el('p','sbg-muted','La biblioteca de videojuegos es privada.'));
     status.textContent='Progreso cargado.';
     return;
    }
    if(libraryResponse.error){
     games.append(el('p','sbg-muted','No se pudieron consultar los videojuegos.'));
     status.textContent='Progreso cargado parcialmente.';
     return;
    }
    const rows=libraryResponse.data||[];
    const counts={playing:0,completed:0,wishlist:0};
    let totalStars=0,rated=0;
    rows.forEach(game=>{
     if(Object.prototype.hasOwnProperty.call(counts,game.status))counts[game.status]++;
     const rating=Number(game.rating);
     if(game.rating!==null&&game.rating!==undefined&&Number.isInteger(rating)&&rating>=1&&rating<=5){totalStars+=rating;rated++}
    });
    const number=el('div','sbg-numbers');
    [['🎮 Total',rows.length],['🏆 Terminados',counts.completed],['⭐ Valoración media',rated?(totalStars/rated).toFixed(1)+' / 5':'Sin valorar']].forEach(([label,value])=>{
     const item=el('div','sbg-number');item.append(el('strong','',String(value)),el('span','',label));number.append(item);
    });games.append(number);
    const bars=el('div','sbg-bars');
    [['🎮 Jugando',counts.playing,'playing'],['🏆 Terminados',counts.completed,'completed'],['⭐ Pendientes',counts.wishlist,'wishlist']].forEach(([label,count,key])=>{
     const line=el('div','sbg-bar-row');
     const text=el('span','',label+' · '+count);
     const track=el('div','sbg-bar-track');const fill=el('div','sbg-bar-fill');
     fill.dataset.status=key;fill.style.width=(rows.length?Math.round(count/rows.length*100):0)+'%';
     track.append(fill);line.append(text,track);bars.append(line);
    });games.append(bars);
    status.textContent=rows.length>=1000?'Mostrando los primeros 1000 videojuegos.':'Resumen actualizado de la biblioteca.';
   }catch(_){if(card.isConnected)status.textContent='No se pudieron cargar las estadísticas.'}
  }
  render();
 }
 let queued=false;
 function scan(){
  queued=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sbp-identity-card'))addStats(account,true);
  const member=document.getElementById('public-member-profile');
  if(member?.querySelector('.sbp-identity-card'))addStats(member,false);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(scan)}}
 const init=()=>{
  const root=document.getElementById('app');if(!root)return;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);schedule();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
