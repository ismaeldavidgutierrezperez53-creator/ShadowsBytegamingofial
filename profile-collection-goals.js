/* Shadows Byte Gaming V2 — desafíos visuales por colección, sin otorgar XP ni premios. */
(()=>{
 'use strict';
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const goals=[
  {icon:'🎮',name:'Primer videojuego',key:'total',target:1},
  {icon:'📚',name:'Coleccionista gamer',key:'total',target:10},
  {icon:'🏆',name:'Primer juego terminado',key:'completed',target:1},
  {icon:'🥇',name:'Maestro de aventuras',key:'completed',target:5},
  {icon:'👑',name:'Leyenda de la biblioteca',key:'completed',target:10},
  {icon:'✍️',name:'Crítico gamer',key:'reviews',target:3}
 ];
 function mount(host,own){
  if(host.querySelector('.sbr-goals'))return;
  const anchor=host.querySelector('.sbc-connections')||host.querySelector('.sba-timeline')||host.querySelector('.sbg-stats')||host.querySelector('.sbp-identity-card');
  if(!anchor)return;
  const section=node('section','profile-panel sbr-goals');
  section.setAttribute('aria-label',own?'Mis retos de colección':'Retos gamer de biblioteca');
  const h=node('h2','','🏅 Retos de colección');
  const description=node('p','sbr-muted',own?'Se desbloquean visualmente con tus juegos; no conceden puntos ni recompensas.':'Insignias de colección calculadas a partir de juegos compartidos.');
  const status=node('p','sbr-muted','Cargando retos…');status.setAttribute('role','status');
  const grid=node('div','sbr-grid');
  section.append(h,description,status,grid);anchor.after(section);
  async function load(){
   try{
    if(typeof sb==='undefined'||!sb.auth||!sb.from)throw Error('cliente no disponible');
    const user=own?(await sb.auth.getUser()).data?.user?.id:new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!user||!isUuid.test(user)){status.textContent='Perfil no disponible.';return}
    const profile=await sb.from('profiles').select('is_public,game_library_public').eq('id',user).maybeSingle();
    if(profile.error)throw profile.error;
    if(!own&&(!profile.data?.is_public||!profile.data?.game_library_public)){section.remove();return}
    const res=await sb.from('member_game_library').select('status,review').eq('user_id',user).limit(1000);
    if(res.error)throw res.error;
    if(!section.isConnected)return;
    const rows=res.data||[];
    const progress={total:rows.length,completed:rows.filter(g=>g.status==='completed').length,reviews:rows.filter(g=>String(g.review||'').trim().length>0).length};
    const earned=goals.filter(g=>progress[g.key]>=g.target).length;
    status.textContent=earned+' de '+goals.length+' retos completados'+(rows.length===1000?' · se han consultado hasta 1000 videojuegos':'');
    grid.replaceChildren();
    goals.forEach(g=>{
     const current=Math.min(progress[g.key],g.target),done=current===g.target;
     const card=node('article','sbr-goal'+(done?' is-earned':''));
     const top=node('div','sbr-goal-top');
     const icon=node('span','sbr-icon',g.icon);
     const title=node('strong','',g.name);
     const state=node('span','sbr-state',done?'✓ Completado':'🔒 En progreso');
     top.append(icon,title);card.append(top,state);
     const meter=node('progress','sbr-meter');meter.max=g.target;meter.value=current;meter.setAttribute('aria-label',g.name+': '+current+' de '+g.target);
     card.append(meter,node('small','',current+' / '+g.target));grid.append(card);
    });
   }catch(e){if(section.isConnected)status.textContent='No se pudieron cargar los retos gamer.'}
  }
  load();
 }
 let queued=false;
 function scan(){
  queued=false;
  const own=document.getElementById('account-profile');
  if(own?.querySelector('.sbp-identity-card'))mount(own,true);
  const profile=document.getElementById('public-member-profile');
  if(profile?.querySelector('.sbp-identity-card'))mount(profile,false);
 }
 function queue(){if(!queued){queued=true;requestAnimationFrame(scan)}}
 function init(){const root=document.getElementById('app');if(!root)return;new MutationObserver(queue).observe(root,{childList:true,subtree:true});addEventListener('hashchange',queue);queue()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
