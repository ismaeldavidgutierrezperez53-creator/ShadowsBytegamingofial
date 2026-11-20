/* Shadows Byte V2 — conexiones gamer con visibilidad pública. */
(() => {
 'use strict';
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const safeImage=url=>typeof url==='string'&&/^https:\/\/[^\s]+$/i.test(url);
 function mount(host,own){
  if(host.querySelector('.sbc-connections'))return;
  const anchor=host.querySelector('.sba-timeline')||host.querySelector('.sbg-stats')||host.querySelector('.sbp-identity-card');
  if(!anchor)return;
  const panel=make('section','profile-panel sbc-connections');
  const title=make('h2','','👥 Conexiones gamer');
  const lead=make('p','sbc-muted','Descubre miembros con perfiles públicos.');
  const controls=make('div','sbc-controls');
  const tabs=make('div','sbc-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Tipo de conexión');
  const followers=make('button','sbc-tab is-selected','Seguidores');followers.type='button';
  const following=make('button','sbc-tab','Siguiendo');following.type='button';
  const refresh=make('button','sbc-refresh','↻ Actualizar');refresh.type='button';
  tabs.append(followers,following);controls.append(tabs,refresh);
  const message=make('p','sbc-muted','Consultando conexiones…');message.setAttribute('role','status');
  const results=make('div','sbc-grid');
  const directory=make('a','sbc-directory','🔎 Explorar miembros');directory.href='#/miembros';
  panel.append(title,lead,controls,message,results,directory);anchor.after(panel);
  let current='followers',lists={followers:[],following:[]};
  const draw=()=>{
   if(!panel.isConnected)return;
   followers.classList.toggle('is-selected',current==='followers');
   following.classList.toggle('is-selected',current==='following');
   followers.setAttribute('aria-pressed',String(current==='followers'));
   following.setAttribute('aria-pressed',String(current==='following'));
   results.replaceChildren();
   const users=lists[current];
   message.textContent=users.length?users.length+' miembros con perfil público':'No se encontraron miembros con perfil público en esta lista.';
   for(const person of users){
    const a=make('a','sbc-person');a.href='#/perfil?id='+encodeURIComponent(person.id);
    const avatar=make('span','sbc-avatar',String(person.display_name||person.username||'M').slice(0,1).toUpperCase());
    if(safeImage(person.avatar_url)){
     const img=make('img');img.src=person.avatar_url;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
     img.onerror=()=>avatar.replaceChildren(document.createTextNode('🎮'));avatar.replaceChildren(img);
    }
    const copy=make('span','sbc-copy');
    const name=make('strong','',person.display_name||person.username||'Miembro');
    const game=make('small','',person.favorite_anime?'🌸 '+person.favorite_anime:'🎮 Ver perfil gamer');
    copy.append(name,game);a.append(avatar,copy);results.append(a);
   }
  };
  async function load(){
   if(typeof sb==='undefined'||!sb.auth||!sb.from){message.textContent='No se pudo conectar con Supabase.';return}
   refresh.disabled=true;message.textContent='Actualizando conexiones…';
   try{
    const id=own?(await sb.auth.getUser()).data?.user?.id:new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!id||!validId.test(id)){message.textContent='Perfil no disponible.';return}
    if(!own){
     const checked=await sb.from('profiles').select('is_public').eq('id',id).maybeSingle();
     if(checked.error)throw checked.error;
     if(!checked.data?.is_public){panel.remove();return}
    }
    const [incoming,outgoing]=await Promise.all([
     sb.from('member_follows').select('follower_id').eq('following_id',id).limit(50),
     sb.from('member_follows').select('following_id').eq('follower_id',id).limit(50)
    ]);
    if(!panel.isConnected)return;
    if(incoming.error||outgoing.error){message.textContent='No se pudieron consultar las conexiones.';return}
    const ids=[...new Set([...(incoming.data||[]).map(x=>x.follower_id),...(outgoing.data||[]).map(x=>x.following_id)].filter(x=>validId.test(String(x))))];
    const profiles=ids.length?await sb.from('profiles')
     .select('id,display_name,username,avatar_url,favorite_anime,is_public')
     .in('id',ids).eq('is_public',true):{data:[],error:null};
    if(profiles.error)throw profiles.error;
    if(!panel.isConnected)return;
    const byId=new Map((profiles.data||[]).map(p=>[p.id,p]));
    lists.followers=(incoming.data||[]).map(x=>byId.get(x.follower_id)).filter(Boolean);
    lists.following=(outgoing.data||[]).map(x=>byId.get(x.following_id)).filter(Boolean);
    lead.textContent='Solo se muestran las personas que han hecho público su perfil. Puedes abrir sus tarjetas desde aquí.';
    draw();
   }catch(_){if(panel.isConnected)message.textContent='No se pudieron cargar las conexiones.'}
   finally{refresh.disabled=false}
  }
  followers.onclick=()=>{current='followers';draw()};
  following.onclick=()=>{current='following';draw()};
  refresh.onclick=load;
  load();
 }
 let queued=false;
 function scan(){
  queued=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sbp-identity-card'))mount(account,true);
  const publicRoot=document.getElementById('public-member-profile');
  if(publicRoot?.querySelector('.sbp-identity-card'))mount(publicRoot,false);
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan)}
 const init=()=>{const root=document.getElementById('app');if(!root)return;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
