/* Shadows Byte Gaming V2: medallas sociales visuales, sin conceder XP ni premios. */
(()=>{
 'use strict';
 const uid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const challenges=[
  {icon:'📝',title:'Primera publicación',type:'posts',target:1},
  {icon:'✍️',title:'Creador de contenido',type:'posts',target:5},
  {icon:'📣',title:'Voz de la comunidad',type:'posts',target:20},
  {icon:'🤝',title:'Primer seguidor',type:'followers',target:1},
  {icon:'⭐',title:'Perfil popular',type:'followers',target:5},
  {icon:'👑',title:'Referente de la comunidad',type:'followers',target:10}
 ];
 function mount(host,own){
  if(host.querySelector('.sbs-challenges'))return;
  const anchor=host.querySelector('.sbr-goals')||host.querySelector('.sbc-connections')||host.querySelector('.sba-timeline')||host.querySelector('.sbp-identity-card');
  if(!anchor)return;
  const panel=el('section','profile-panel sbs-challenges');
  panel.setAttribute('aria-label','Retos sociales');
  const title=el('h2','','🌟 Retos sociales');
  const about=el('p','sbs-muted','Medallas visuales por publicaciones y seguidores. No otorgan XP ni premios.');
  const status=el('p','sbs-muted','Comprobando retos sociales…');status.setAttribute('role','status');
  const grid=el('div','sbs-grid');
  const action=el('a','sbs-link','📝 Ir a la comunidad');action.href='#/comunidad';
  panel.append(title,about,status,grid,action);anchor.after(panel);
  async function load(){
   if(typeof sb==='undefined'||!sb.auth||!sb.from){status.textContent='No se pudo conectar con Supabase.';return}
   try{
    const id=own?(await sb.auth.getUser()).data?.user?.id:new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!id||!uid.test(id)){status.textContent='Perfil no disponible.';return}
    const profile=await sb.from('profiles').select('is_public').eq('id',id).maybeSingle();
    if(profile.error)throw profile.error;
    // No mostramos métricas de publicaciones de cuentas privadas.
    if(!profile.data?.is_public){status.textContent=own?'Activa tu perfil público para ver los retos sociales basados en publicaciones y seguidores.':'Este perfil no es público.';return}
    const [posts,followers]=await Promise.all([
     sb.from('member_posts').select('id',{count:'exact',head:true}).eq('author_id',id),
     sb.from('member_follows').select('follower_id',{count:'exact',head:true}).eq('following_id',id)
    ]);
    if(!panel.isConnected)return;
    if(posts.error||followers.error){status.textContent='No se pudieron comprobar los contadores sociales.';return}
    const totals={posts:posts.count||0,followers:followers.count||0};
    const complete=challenges.filter(c=>totals[c.type]>=c.target).length;
    status.textContent=complete+' de '+challenges.length+' retos completados · '+totals.posts+' publicaciones · '+totals.followers+' seguidores';
    grid.replaceChildren();
    for(const c of challenges){
     const amount=Math.min(totals[c.type],c.target),done=amount===c.target;
     const item=el('article','sbs-card'+(done?' is-earned':''));
     const header=el('div','sbs-card-heading');
     header.append(el('span','sbs-emoji',c.icon),el('strong','',c.title));
     const note=el('p','',done?'✓ Medalla desbloqueada':'🔒 En progreso');
     const meter=el('progress','sbs-meter');meter.max=c.target;meter.value=amount;meter.setAttribute('aria-label',c.title+': '+amount+' de '+c.target);
     item.append(header,note,meter,el('small','',amount+' / '+c.target));grid.append(item);
    }
   }catch(_){if(panel.isConnected)status.textContent='No se pudieron cargar los retos sociales.'}
  }
  load();
 }
 let queued=false;
 function scan(){
  queued=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sbp-identity-card'))mount(account,true);
  const profile=document.getElementById('public-member-profile');
  if(profile?.querySelector('.sbp-identity-card'))mount(profile,false);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(scan)}}
 function init(){const app=document.getElementById('app');if(!app)return;new MutationObserver(schedule).observe(app,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
