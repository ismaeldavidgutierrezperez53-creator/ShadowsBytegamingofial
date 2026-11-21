/* Shadows Byte V2: mejoras progresivas de perfiles, sin modificar RLS ni datos existentes. */
(() => {
 'use strict';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 const link=(text,href)=>{const n=el('a','sbp-action',text);n.href=href;return n};
 const profileUrl=id=>location.origin+location.pathname+'#/perfil?id='+encodeURIComponent(id);
 const formatCount=value=>Number.isFinite(Number(value))?String(value):'—';
 const safeClient=()=>typeof sb!=='undefined'&&sb&&sb.auth&&sb.from;
 function statusNote(root,message){const p=el('p','sbp-note',message);p.setAttribute('role','status');root.append(p);return p}
 async function enhanceAccount(root){
  if(!root.querySelector('#profile-form') || root.querySelector('.sbp-dashboard'))return;
  const body=root.querySelector('.profile-body');if(!body)return;
  const panel=el('section','profile-panel sbp-dashboard');
  panel.setAttribute('aria-label','Mi centro de perfil');
  const heading=el('h2','','✨ Mi centro de perfil');
  const intro=el('p','sbp-muted','Completa tu identidad gamer y decide qué pueden ver los demás miembros.');
  const meter=el('progress','sbp-meter');meter.max=100;meter.value=0;meter.setAttribute('aria-label','Porcentaje de perfil completado');
  const completion=el('p','sbp-completion','Revisando tu perfil…');
  const quick=el('div','sbp-actions');
  const jump=(label,selector)=>{const button=el('button','sbp-action',label);button.type='button';button.onclick=()=>root.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'});return button};
  quick.append(jump('🎨 Personalizar perfil','#profile-form'),link('🏆 Mis logros','#/logros'),jump('🎮 Mis videojuegos','#game-library'),jump('👥 Seguidores','#account-follows'));
  const actions=el('div','sbp-actions');
  const publicLink=link('👁️ Ver perfil público','#/miembros');
  const copy=el('button','sbp-action','🔗 Copiar enlace');copy.type='button';
  const note=statusNote(panel,'');
  actions.append(publicLink,copy);
  const stats=el('div','sbp-stats');stats.setAttribute('aria-label','Resumen de actividad');
  panel.prepend(heading,intro,meter,completion,quick,actions,stats);
  const identity=root.querySelector('.profile-identity');if(identity)identity.after(panel);else body.prepend(panel);
  const form=root.querySelector('#profile-form');
  const field=id=>root.querySelector('#'+id);
  function update(){
   if(!panel.isConnected)return;
   const fields=[
    ['Nombre',!!form.elements.display_name?.value.trim()],
    ['Avatar',!!form.elements.avatar_url?.value.trim()],
    ['Presentación',!!field('profile-bio')?.value.trim()],
    ['Portada',!!field('profile-cover-url')?.value.trim()],
    ['Anime favorito',!!field('profile-favorite-anime')?.value.trim()],
    ['Personaje favorito',!!field('profile-favorite-character')?.value.trim()],
    ['Juegos favoritos',!!field('profile-favorite-games')?.value.trim()],
    ['Estado gaming',!!field('profile-gaming-message')?.value.trim()]
   ];
   const done=fields.filter(x=>x[1]).length,pct=Math.round(done/fields.length*100);
   meter.value=pct;completion.textContent='Perfil completado: '+pct+'% · '+done+' de '+fields.length+' apartados';
   const next=fields.find(x=>!x[1]);intro.textContent=next?'Siguiente sugerencia: completa «'+next[0]+'».':'¡Todos los apartados recomendados están completos!';
   const publicMode=!!field('profile-public')?.checked;
   publicLink.setAttribute('aria-disabled',publicMode?'false':'true');
   publicLink.title=publicMode?'Ver el perfil compartido':'Activa «Mostrar mi perfil en Miembros» y guarda los cambios';
  }
  form.addEventListener('input',update);form.addEventListener('change',update);update();
  if(!safeClient())return;
  try{
   const auth=await sb.auth.getUser(),id=auth.data?.user?.id;
   if(!id||!panel.isConnected)return;
   publicLink.href=profileUrl(id);
   const share=async()=>{
    const res=await sb.from('profiles').select('is_public').eq('id',id).maybeSingle();
    if(res.error){note.textContent='No se pudo comprobar la visibilidad del perfil.';return false}
    if(!res.data?.is_public){note.textContent='Para compartirlo, haz público tu perfil y guarda los cambios.';return false}
    return true;
   };
   copy.onclick=async()=>{if(!(await share()))return;try{await navigator.clipboard.writeText(profileUrl(id));note.textContent='Enlace del perfil copiado.'}catch(_){note.textContent='Puedes copiar este enlace: '+profileUrl(id)}};
   publicLink.addEventListener('click',async event=>{event.preventDefault();if(await share())location.href=profileUrl(id)});
   const specs=[
    ['🎮','Videojuegos',sb.from('member_game_library').select('id',{count:'exact',head:true}).eq('user_id',id)],
    ['👥','Seguidores',sb.from('member_follows').select('follower_id',{count:'exact',head:true}).eq('following_id',id)],
    ['📝','Publicaciones',sb.from('member_posts').select('id',{count:'exact',head:true}).eq('author_id',id)]
   ];
   const results=await Promise.all([...specs.map(x=>x[2]),sb.rpc('community_member_xp',{target_member:id})]);
   if(!stats.isConnected)return;
   specs.forEach((spec,i)=>{const card=el('div','sbp-stat');card.append(el('strong','',results[i].error?'—':formatCount(results[i].count)),el('span','',spec[0]+' '+spec[1]));stats.append(card)});
   const xp=results[3];const xpCard=el('div','sbp-stat');xpCard.append(el('strong','',xp.error?'—':formatCount(xp.data)),el('span','','🏆 XP'));stats.append(xpCard);
  }catch(_){note.textContent='No se pudo cargar el resumen. El resto del perfil sigue disponible.'}
 }
 function enhancePublic(root){
  const body=root.querySelector('.public-member-body');
  if(!body)return;
  if(root.querySelector('.sbp-public-tools')){attachPublicLibraryFilter(body);return}
  const qs=new URLSearchParams((location.hash.split('?')[1]||''));
  const id=qs.get('id');if(!id)return;
  const panel=el('section','profile-panel sbp-public-tools');
  panel.append(el('h2','','✨ Explora este perfil'),el('p','sbp-muted','Descubre su colección, sus logros y su comunidad.'));
  const actions=el('div','sbp-actions');
  const share=el('button','sbp-action','🔗 Compartir perfil');share.type='button';
  const note=statusNote(panel,'');
  share.onclick=async()=>{
   const url=profileUrl(id);
   try{if(navigator.share)await navigator.share({title:'Perfil de Shadows Byte Gaming',url});
   else {await navigator.clipboard.writeText(url);note.textContent='Enlace copiado.';}}
   catch(e){if(e?.name!=='AbortError')note.textContent='Enlace del perfil: '+url}
  };
  actions.append(share,link('👥 Más miembros','#/miembros'));
  const nav=el('nav','sbp-section-nav');nav.setAttribute('aria-label','Secciones de este perfil');
  const targets=[
   ['🎮 Biblioteca','.public-game-library'],
   ['🏆 Logros','.member-achievements'],
   ['📊 Estadísticas','.member-profile-stats'],
   ['💬 Comunidad','.member-social']
  ];
  targets.forEach(([label,selector])=>{const a=el('button','sbp-action',label);a.type='button';a.onclick=()=>{const dest=body.querySelector(selector);if(dest){dest.dispatchEvent(new Event('sb:profile-expand'));dest.scrollIntoView({behavior:'auto',block:'start'});}else note.textContent='Esta sección no está disponible en este perfil.'};nav.append(a)});
  panel.append(actions,nav);
  const title=body.querySelector('h1');if(title)title.after(panel);else body.prepend(panel);
  attachPublicLibraryFilter(body);
 }
 function attachPublicLibraryFilter(body){
  const library=body.querySelector('.public-game-library');
  if(!library || library.dataset.sbpFilter==='1')return;
  const libraryHeading=library.querySelector('h2');if(!libraryHeading || !library.querySelector('.public-game-library-grid'))return;
  library.dataset.sbpFilter='1';
  const search=el('input','sbp-library-search');search.type='search';search.placeholder='Buscar un videojuego o plataforma…';search.setAttribute('aria-label','Buscar en biblioteca compartida');
  const filter=el('select','sbp-library-filter');filter.setAttribute('aria-label','Filtrar por estado');
  [['all','Todos'],['playing','Jugando'],['completed','Terminados'],['wishlist','Quiero jugar']].forEach(([v,label])=>{const opt=el('option','',label);opt.value=v;filter.append(opt)});
  const controls=el('div','sbp-library-controls');controls.append(search,filter);
  libraryHeading.after(controls);
  const refresh=()=>{
   const groups=[...library.querySelectorAll('.public-game-library-group')];
   let visible=0;
   groups.forEach((group,i)=>{
    const state=['playing','completed','wishlist'][i];
    const showGroup=filter.value==='all'||state===filter.value;let count=0;
    group.querySelectorAll('.public-game-library-item').forEach(card=>{
     const title=card.querySelector('strong')?.textContent||'';
     const platform=card.querySelector('small')?.textContent||'';
     const show=showGroup&&(title+' '+platform).toLocaleLowerCase('es').includes(search.value.trim().toLocaleLowerCase('es'));
     card.hidden=!show;if(show)count++;
    });group.hidden=!count;visible+=count;
   });
   countLabel.textContent=visible+' videojuegos encontrados';
  };
  const countLabel=el('p','sbp-muted');controls.after(countLabel);
  search.addEventListener('input',refresh);filter.addEventListener('change',refresh);refresh();
 }

 function addIdentityCard(host,own){
  if(host.querySelector('.sbp-identity-card'))return;
  const anchor=own?host.querySelector('.sbp-dashboard'):host.querySelector('.sbp-public-tools');
  if(!anchor)return;
  const card=el('section','profile-panel sbp-identity-card');
  card.setAttribute('aria-label',own?'Vista previa de identidad gamer':'Identidad gamer pública');
  const top=el('div','sbp-identity-top');
  const avatar=el('div','sbp-identity-avatar','🎮');
  const detail=el('div','sbp-identity-text');
  const eyebrow=el('small','','SHADOWS BYTE · GAMER CARD');
  const heading=el('h2','','Mi identidad gamer');
  const status=el('p','sbp-identity-status','🎮 Disponible');
  const exclusiveRank=el('p','sbp-identity-rank');
  const motto=el('p','sbp-identity-motto');
  detail.append(eyebrow,heading,exclusiveRank,status,motto);top.append(avatar,detail);
  const details=el('div','sbp-identity-tags');
  const info=el('p','sbp-muted',own?'Vista previa. Guarda los cambios para que otros vean tu tarjeta cuando tu perfil sea público.':'Información compartida por este miembro.');
  card.append(top,details,info);anchor.after(card);
  const form=own?host.querySelector('#profile-form'):null;
  const get=id=>host.querySelector('#'+id)?.value?.trim()||'';
  const render=()=>{
   if(!card.isConnected)return;
   const name=own?(form?.elements.display_name?.value?.trim()||'Miembro'):(host.querySelector('.public-member-body > h1')?.textContent?.trim()||'Miembro');
   const anime=own?get('profile-favorite-anime'):host.querySelector('.public-anime-identity .profile-anime-tags')?.textContent||'';
   const games=own?get('profile-favorite-games'):host.querySelector('.gamer-favorite-games')?.textContent||'';
   const message=own?get('profile-gaming-message'):host.querySelector('.member-gaming-status')?.textContent||'';
   const state=own?get('profile-gaming-status'):'';
   const statusNames={disponible:'🟢 Disponible',jugando:'🎮 Jugando',buscando_grupo:'👥 Buscando grupo',ausente:'🌙 Ausente'};
   heading.textContent=name;
   const rankMap={recruit:'🎮 Recluta Byte',explorer:'🌟 Explorador Otaku',guardian:'⚔️ Guardián Gamer',legend:'👑 Leyenda Byte'};
   exclusiveRank.textContent=own?(rankMap[get('profile-title')]||''):(host.querySelector('.sb-public-rank-title:not([hidden])')?.textContent||'');
   exclusiveRank.hidden=!exclusiveRank.textContent;
   motto.textContent=own?get('profile-card-motto'):(host.dataset.sbCardMotto||'');
   motto.hidden=!motto.textContent;
   card.dataset.layout=own?(get('profile-card-layout')||'classic'):(host.dataset.sbCardLayout||'classic');
   status.textContent=own?(statusNames[state]||statusNames.disponible)+(message?' · '+message:''):(message||'🎮 Miembro de la comunidad');
   const src=own?form?.elements.avatar_url?.value?.trim():host.querySelector('.public-member-avatar video,.public-member-avatar img')?.getAttribute('src');
   avatar.replaceChildren();
   if(src&&/^https:\/\//i.test(src)){
    const isVideo=(()=>{try{return /\.(mp4|webm)$/i.test(new URL(src).pathname)}catch(_){return false}})();
    const media=el(isVideo?'video':'img');
    media.src=src;
    if(isVideo){
     media.muted=true;media.defaultMuted=true;media.autoplay=true;media.loop=true;media.playsInline=true;media.preload='metadata';
     media.setAttribute('aria-label','Vídeo de perfil');
    }else{media.alt='';media.referrerPolicy='no-referrer'}
    media.onerror=()=>avatar.replaceChildren(document.createTextNode('🎮'));
    avatar.append(media);
   }else avatar.textContent=name.slice(0,1).toUpperCase();
   details.replaceChildren();
   const chips=[];
   if(anime)chips.push(['🌸 Anime',anime.replace(/^.*?Anime favorito:\s*/i,'').slice(0,120)]);
   if(games)chips.push(['🎮 Juegos',games.slice(0,130)]);
   const badge=own?get('profile-featured-badge'):host.querySelector('.profile-featured-badge:not([hidden])')?.textContent||'';
   if(badge && !own)chips.push(['🏅 Insignia',badge]);
   for(const [label,value] of chips){const chip=el('span','sbp-identity-chip',label+': '+value);details.append(chip)}
   if(!chips.length)details.append(el('span','sbp-identity-chip','✨ Personaliza tu aventura gamer'));
   card.dataset.theme=own?(get('profile-theme')||'violet'):(host.querySelector('.public-member-cover')?.dataset.theme||'violet');
   if(own)info.textContent=host.querySelector('#profile-public')?.checked?'Vista previa de tu tarjeta pública. Guarda los cambios para publicarla.':'Vista previa privada: activa «Mostrar mi perfil en Miembros» si deseas compartirla.';
  };
  if(form){form.addEventListener('input',render);form.addEventListener('change',render);render();}
  else {
   render();
   host.addEventListener('sb:profile-rank-update',render);
   const badge=host.querySelector('.profile-featured-badge');
   if(badge)new MutationObserver(()=>{if(card.isConnected)render()}).observe(badge,{childList:true,attributes:true,attributeFilter:['hidden']});
  }
 }

 let queued=false;
 function scan(){
  queued=false;
  const account=document.getElementById('account-profile');
  if(account&&account.querySelector('#profile-form')){enhanceAccount(account);addIdentityCard(account,true)}
  const publicRoot=document.getElementById('public-member-profile');
  if(publicRoot&&publicRoot.querySelector('.public-member-body')){enhancePublic(publicRoot);addIdentityCard(publicRoot,false)}
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan)}
 const run=()=>{const root=document.getElementById('app');if(!root)return;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});addEventListener('hashchange',schedule);schedule()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
