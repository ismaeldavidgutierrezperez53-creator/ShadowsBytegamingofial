/* Shadows Byte V2 — cronología de actividad con controles de visibilidad. */
(() => {
 'use strict';
 const create=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n};
 const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}):''};
 function mount(host,isOwn){
  if(host.querySelector('.sba-timeline'))return;
  const anchor=host.querySelector('.sbg-stats')||host.querySelector('.sb-showcase')||host.querySelector('.sbp-identity-card');
  if(!anchor)return;
  const panel=create('section','profile-panel sba-timeline');
  const title=create('h2','','🕒 Actividad reciente');
  const info=create('p','sba-intro',isOwn?'Consulta tus últimas actividades registradas.':'Publicaciones y videojuegos que este miembro ha decidido compartir.');
  const controls=create('div','sba-controls');
  const type=create('select','sba-select');type.setAttribute('aria-label','Filtrar actividad');
  [['all','Toda la actividad'],['post','Publicaciones'],['game','Videojuegos']].forEach(([value,label])=>{const o=create('option','',label);o.value=value;type.append(o)});
  const refresh=create('button','sba-refresh','↻ Actualizar');refresh.type='button';
  controls.append(type,refresh);
  const status=create('p','sba-status','Cargando…');status.setAttribute('role','status');
  const list=create('div','sba-items');
  panel.append(title,info,controls,status,list);anchor.after(panel);
  let entries=[];
  const draw=()=>{
   if(!panel.isConnected)return;
   list.replaceChildren();
   const shown=entries.filter(e=>type.value==='all'||e.kind===type.value);
   if(!shown.length){status.textContent=entries.length?'No hay actividad de esta categoría.':'Todavía no hay actividad para mostrar.';return}
   status.textContent=shown.length+' actividades recientes';
   for(const e of shown){
    const item=create('article','sba-item');
    const avatar=create('span','sba-event-icon',e.kind==='post'?'📝':'🎮');avatar.setAttribute('aria-hidden','true');
    const inner=create('div','sba-item-body');
    inner.append(create('strong','',e.title));
    const body=create('p','',e.body);inner.append(body);
    inner.append(create('small','',date(e.created_at)));
    item.append(avatar,inner);list.append(item);
   }
  };
  const load=async()=>{
   if(typeof sb==='undefined'||!sb.from||!sb.auth){status.textContent='No se pudo conectar con Supabase.';return}
   refresh.disabled=true;status.textContent='Cargando…';
   try{
    const id=isOwn?(await sb.auth.getUser()).data?.user?.id:new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!id||!validUuid.test(id)){status.textContent='Perfil no disponible.';return}
    const {data:profile,error:profileError}=await sb.from('profiles').select('is_public,game_library_public').eq('id',id).maybeSingle();
    if(profileError)throw profileError;
    if(!isOwn&&!profile?.is_public){panel.remove();return}
    // Las publicaciones solo se consultan cuando el perfil es público.
    const postsRequest=profile?.is_public?sb.from('member_posts').select('content,created_at').eq('author_id',id).order('created_at',{ascending:false}).limit(12):Promise.resolve({data:[],error:null});
    const gamesRequest=(isOwn||(profile?.is_public&&profile?.game_library_public))?sb.from('member_game_library').select('title,status,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(12):Promise.resolve({data:[],error:null});
    const [posts,games]=await Promise.all([postsRequest,gamesRequest]);
    if(!panel.isConnected)return;
    entries=[];
    if(!posts.error)for(const post of posts.data||[])entries.push({kind:'post',title:'Nueva publicación',body:String(post.content||'Publicación sin texto').slice(0,220),created_at:post.created_at});
    if(!games.error)for(const game of games.data||[]){
     const label={playing:'jugando',completed:'terminado',wishlist:'pendiente'}[game.status]||'en la biblioteca';
     entries.push({kind:'game',title:'Videojuego añadido',body:(game.title||'Videojuego')+' · '+label,created_at:game.created_at});
    }
    entries.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));entries=entries.slice(0,15);
    if(posts.error||games.error)info.textContent='Parte de la actividad no está disponible. Se respetan las opciones de privacidad.';
    draw();
   }catch(_){if(panel.isConnected)status.textContent='No se pudo cargar la actividad.'}
   finally{refresh.disabled=false}
  };
  type.addEventListener('change',draw);refresh.addEventListener('click',load);load();
 }
 let pending=false;
 function scan(){
  pending=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sbp-identity-card'))mount(account,true);
  const member=document.getElementById('public-member-profile');
  if(member?.querySelector('.sbp-identity-card'))mount(member,false);
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(scan)}
 const run=()=>{const app=document.getElementById('app');if(!app)return;new MutationObserver(schedule).observe(app,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
