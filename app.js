const app=document.querySelector('#app'); const $=s=>document.querySelector(s); document.querySelector('#year').textContent=new Date().getFullYear();
$('#menuToggle').onclick=()=>$('.topbar').classList.toggle('open');
const empty=t=>`<div class="empty">${t}</div>`;
const pages={
 '/regalos':()=>`<section class="page"><div class="page-hero"><h1>🎁 Buzón de regalos</h1><p>Consulta tus regalos recibidos, el historial de cajas abiertas y equipa tus recompensas.</p><a class="outline-btn mini" href="#/tienda">🏪 Ver tienda</a></div><section class="section" id="gift-mailbox">Cargando regalos…</section></section>`,
 '/tienda':()=>`<section class="page"><div class="page-hero"><h1>🏪 Tienda de recompensas</h1><p>Canjea tus puntos por artículos para tu perfil.</p></div><section class="section" id="reward-shop">Cargando tienda…</section></section>`,
 '/logros':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>🏆 Logros y niveles</h1><p class="description">Sube de nivel participando en Shadows Byte Gaming Official.</p><p class="description" style="font-size:.8rem;opacity:.7">Versión de logros: 2026-11-19 · revisión 4</p><a class="gradient-btn" href="#/tienda">🏪 Ir a la tienda de recompensas</a></div><section class="section" id="my-levels">Cargando nivel…</section><section class="section"><h2>Clasificación de miembros</h2><div id="level-ranking">Cargando clasificación…</div></section><section class="section"><h2>🎯 Misiones diarias y semanales</h2><div id="community-missions">Cargando misiones…</div></section><section class="section"><h2>🎁 Cofres de recompensas</h2><div id="reward-chests">Cargando cofres…</div></section><section class="section" id="inventario-recompensas"><h2>🎒 Inventario de recompensas</h2><div id="reward-inventory">Cargando inventario…</div></section><section class="section"><h2>🔥 Clasificación de rachas</h2><p>Rachas actuales, récords y medallas de los perfiles públicos.</p><div id="streak-ranking">Cargando clasificación…</div></section></section>`,
 '/encuestas':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>📊 Encuestas</h1><p class="description">Vota y descubre los resultados de nuestra comunidad.</p></div><section class="section" id="community-polls">Cargando encuestas…</section></section>`,
 '/favoritos':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">MI COLECCIÓN</div><h1>❤️ Mis favoritos</h1><p class="description">Tu colección personal de anime, manga, manhwa y videojuegos.</p></div><section class="section" id="my-favorites">Cargando favoritos…</section></section>`,
  '/':()=>`<section class="hero"><div class="hero-content"><div class="eyebrow">✧ OTAKU · ANIME · MANGA · GAMING</div><h1><strong>SHADOWS BYTE</strong><br>GAMING OFFICIAL</h1><p>Un punto de encuentro para amantes del anime, el manga, los videojuegos y la cultura japonesa. Comparte, descubre y sube de rango.</p><div class="hero-buttons" id="hero-account-actions"><a class="gradient-btn" href="#/auth?mode=signup">Únete gratis</a><a class="outline-btn" href="#/auth">Iniciar sesión</a></div></div></section><section class="section"><h2 class="section-title">Últimas noticias <a href="#/noticias">Ver todo →</a></h2><div id="live-news">Cargando noticias…</div></section><section class="section"><h2 class="section-title">Animes destacados <a href="#/anime">Ver todo →</a></h2>${empty('El catálogo de anime está en preparación')}</section><section class="section"><h2 class="section-title">Videojuegos destacados <a href="#/gaming">Ver todo →</a></h2>${empty('El catálogo de juegos está en preparación')}</section><section class="section"><h2 class="section-title">Miembros recientes <a href="#/miembros">Ver todo →</a></h2>${empty('Sé el primer miembro de la comunidad')}</section><section class="social"><h2>Conecta con nosotros</h2><p>Discord, Instagram, TikTok y YouTube.</p><div class="social-links"><span>Discord</span><span>Instagram</span><span>TikTok</span><span>YouTube</span></div></section>`,

  '/waifu-husbando':()=>`<section class="page fan-page"><div class="page-hero"><div class="eyebrow">ZONA OTAKU</div><h1>💜 Waifu / Husbando</h1><p class="description">Descubre personajes favoritos del anime. Busca por nombre o filtra por categoría.</p></div><div class="fan-controls"><input id="fan-search" aria-label="Buscar personaje" placeholder="Buscar personaje o anime…"><select id="fan-type" aria-label="Categoría"><option value="todos">Todos</option><option value="waifu">Waifu</option><option value="husbando">Husbando</option></select></div><div id="fan-results" class="fan-grid"></div></section>`,
  '/pokedex':()=>`<section class="page fan-page"><div class="page-hero"><div class="eyebrow">MUNDO POKÉMON</div><h1>⚡ Pokédex en Español</h1><p class="description">Consulta Pokémon por nombre en español o por número de la Pokédex Nacional. Datos e imágenes de PokéAPI.</p></div><form id="pokedex-form" class="fan-controls"><input id="pokemon-search" aria-label="Nombre o número de Pokémon" placeholder="Ej.: Pikachu, Charizard o 25" required><button class="gradient-btn" type="submit">Buscar Pokémon</button></form><div id="pokedex-result" aria-live="polite"></div><div class="fan-quick"><button data-pokemon="1">Bulbasaur</button><button data-pokemon="4">Charmander</button><button data-pokemon="7">Squirtle</button><button data-pokemon="25">Pikachu</button><button data-pokemon="133">Eevee</button></div></section>`,
  '/one-piece':()=>`<section class="page fan-page"><div class="page-hero"><div class="eyebrow">ESPECIAL ANIME</div><h1>🏴‍☠️ One Piece</h1><p class="description">¡Rumbo al Grand Line! Descubre la tripulación de Sombrero de Paja, sus personajes y las grandes sagas de la aventura.</p></div><h2>Tripulación de Sombrero de Paja</h2><div id="straw-hats" class="fan-grid"></div><h2>Sagas principales</h2><div id="onepiece-arcs" class="fan-grid"></div><p class="fan-note">Contenido introductorio sin spoilers importantes de la trama reciente.</p></section>`,
  '/anime':()=>`<section class="page fan-page"><div class="page-hero"><div class="eyebrow">ZONA OTAKU</div><h1>Anime, Manga y Manhwa</h1></div><div class="fan-quick"><a class="outline-btn" href="#/anime">Anime</a><a class="outline-btn" href="#/manga">Manga</a><a class="outline-btn" href="#/manhwa">Manhwa</a></div><div id="editorial-catalog"></div></section>`,
  '/manga':()=>simple('LECTURAS','Manga','Descubre títulos añadidos por administración','')+`<section class="section" id="editorial-catalog"></section>`,
  '/manhwa':()=>simple('LECTURAS','Manhwa','Descubre títulos añadidos por administración','')+`<section class="section" id="editorial-catalog"></section>`,
  '/gaming':()=>catalog('ZONA GAMING','Videojuegos',['Populares','Próximos lanzamientos'],'Buscar juegos','El catálogo de juegos está en preparación')+`<section class="section"><h2>Publicaciones gamer</h2>${empty('Aún no hay publicaciones gamer')}</section><section class="section"><h2>Noticias gaming</h2>${empty('Sin noticias gaming aún')}</section>`,
  '/comunidad':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>El muro de la comunidad</h1><p class="description">Descubre las publicaciones de los miembros y participa.</p><p><a class="outline-btn" href="#/miembros">Explorar miembros</a> <a class="outline-btn" href="#/notificaciones">🔔 Mis notificaciones</a></p></div><div id="community-feed" class="community-feed">Cargando publicaciones…</div></section>`,
  '/notificaciones':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">TU ACTIVIDAD</div><h1>🔔 Notificaciones</h1><p class="description">Encuestas nuevas, seguidores, me gusta y actividad de tu comunidad.</p></div><div id="member-notifications" class="community-feed">Cargando notificaciones…</div></section>`,
  '/noticias':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">NOTICIAS</div><h1>Últimas noticias</h1></div><div id="live-news">Cargando noticias…</div></section>`,
  '/eventos':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">EVENTOS</div><h1>Próximos eventos</h1><p class="description">Actividades y encuentros de Shadows Byte Gaming Official.</p></div><div id="live-events">Cargando eventos…</div></section>`,
  '/cartelera':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">CARTELERA</div><h1>Cartelera</h1></div><div id="live-billboard">Cargando cartelera…</div></section>`,
  '/cuenta':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">TU ESPACIO</div><h1>Mi cuenta</h1><p class="description">Personaliza tu perfil de Shadows Byte Gaming Official.</p><p><a class="gradient-btn mini" href="#/regalos">🎁 Mi buzón de regalos</a> <a class="gradient-btn mini" href="#/no-molestar">🌙 No molestar · 30 min, 1 h o 2 h</a></p></div><div id="account-profile" class="profile-shell">Cargando perfil…</div></section>`,
  '/no-molestar':()=>`<section class="page quiet-mode-page"><div class="page-hero"><div class="eyebrow">CONFIGURACIÓN PERSONAL</div><h1>🌙 No molestar</h1><p class="description">Silencia avisos durante 30 minutos, 1 hora, 2 horas o hasta desactivarlo. Las notificaciones se conservan.</p><a class="outline-btn mini" href="#/cuenta">← Volver a Mi cuenta</a></div><div id="quick-dnd-panel" class="profile-shell"><p>Cargando tus ajustes…</p></div></section>`,
  '/perfil':()=>`<section class="page"><div id="public-member-profile" class="public-member-shell"><div class="admin-empty">Cargando perfil público…</div></div></section>`,
  '/admin':()=>`<section class="page"><div class="page-hero"><h1>Administración</h1></div><div id="admin-root">Comprobando permisos…</div></section>`,
  '/mensajes':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>💬 Mensajes privados</h1><p class="description">Tus conversaciones con otros miembros.</p></div><div id="private-messages" class="private-messages">Cargando mensajes…</div></section>`,
  '/miembros':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>Miembros</h1><p class="description">Conoce a los miembros que han decidido mostrar su perfil públicamente.</p></div><div class="members-toolbar"><label>⌕ <input id="members-search" type="search" placeholder="Buscar nombre, anime o personaje" aria-label="Buscar miembros por nombre, anime o personaje"></label><a class="outline-btn" href="#/cuenta">Configurar mi perfil</a></div><div id="members-list" class="members-grid"><div class="admin-empty">Cargando miembros…</div></div></section>`,
  '/contacto':()=>`<section class="page"><div class="page-hero"><div class="eyebrow">CONTACTO</div><h1>Hablemos</h1></div><div class="contact-grid"><div><p class="description">¿Tienes una propuesta, noticia o idea para la comunidad? Escríbenos.</p><p class="notice">También puedes encontrarnos en Discord, Instagram, TikTok y YouTube.</p></div><form class="auth-card"><label>Nombre</label><input placeholder="Tu nombre"><label>Correo electrónico</label><input type="email" placeholder="tu@email.com"><label>Mensaje</label><textarea rows="5" placeholder="Cuéntanos..."></textarea><button type="button" class="gradient-btn">Enviar mensaje</button></form></div></section>`,
  '/forgot-password':()=>`<section class="page"><form class="auth-card" id="forgot-form"><h1>Recuperar contraseña</h1><p>Te enviaremos un enlace de recuperación.</p><label for="recovery-email">Correo electrónico</label><input id="recovery-email" name="email" type="email" autocomplete="email" required><button class="gradient-btn" type="submit">Enviar enlace</button><p id="recovery-message" role="status"></p></form></section>`,
  '/reset-password':()=>`<section class="page"><form class="auth-card" id="reset-form"><h1>Crear nueva contraseña</h1><p>Introduce una contraseña nueva para tu cuenta.</p><label for="new-password">Nueva contraseña</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required><button class="gradient-btn" type="submit">Guardar nueva contraseña</button><p id="reset-message" role="status"></p></form></section>`,
  '/auth':()=>`<section class="page"><form class="auth-card" id="auth-form"><div class="eyebrow">SHADOWS BYTE</div><h1 id="authTitle">Iniciar sesión</h1><p class="description">Accede para conectar con la comunidad.</p>${location.hash.includes("mode=signup") ? '<label for="signup-name">Nombre de usuario</label><input id="signup-name" name="signup_name" type="text" autocomplete="nickname" minlength="2" maxlength="60" required placeholder="¿Cómo quieres que te llamemos?">' : ""}<label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="Correo electrónico"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="Contraseña"><button class="gradient-btn" type="submit">Continuar</button><p id="auth-message" role="status"></p><div class="auth-resend"><p>¿No has recibido el correo de confirmación?</p><button type="button" class="outline-btn" id="resend-confirmation">Reenviar correo de confirmación</button><p id="resend-message" role="status" aria-live="polite"></p></div><p><a href="#/forgot-password">¿Olvidaste tu contraseña?</a></p><p><a href="#/auth?mode=signup">¿Aún no tienes cuenta? Regístrate</a></p></form></section>`
};
function catalog(tag,title,filters,placeholder,message){return `<section class="page"><div class="page-hero"><div class="eyebrow">${tag}</div><h1>${title}</h1></div><div class="pills">${filters.map(x=>`<button>${x}</button>`).join('')}</div><div class="filters"><label>Ordenar por título &nbsp;<input type="checkbox" checked> A → Z</label><label>⌕ <input placeholder="${placeholder}"></label></div>${empty(message)}</section>`}
function simple(tag,title,desc,message){return `<section class="page"><div class="page-hero"><div class="eyebrow">${tag}</div><h1>${title}</h1><p class="description">${desc}</p></div>${empty(message)}</section>`}

const fanCharacters=[
 {name:'Rem',anime:'Re:Zero',type:'waifu',symbol:'💙'},
 {name:'Asuna Yuuki',anime:'Sword Art Online',type:'waifu',symbol:'⚔️'},
 {name:'Mikasa Ackerman',anime:'Attack on Titan',type:'waifu',symbol:'🧣'},
 {name:'Hinata Hyuga',anime:'Naruto',type:'waifu',symbol:'🌸'},
 {name:'Gojo Satoru',anime:'Jujutsu Kaisen',type:'husbando',symbol:'✨'},
 {name:'Levi Ackerman',anime:'Attack on Titan',type:'husbando',symbol:'🗡️'},
 {name:'Roronoa Zoro',anime:'One Piece',type:'husbando',symbol:'⚔️'},
 {name:'Kakashi Hatake',anime:'Naruto',type:'husbando',symbol:'🥷'}
];
const strawHats=[['Monkey D. Luffy','Capitán','👒'],['Roronoa Zoro','Espadachín','⚔️'],['Nami','Navegante','🧭'],['Usopp','Francotirador','🎯'],['Sanji','Cocinero','🍳'],['Tony Tony Chopper','Médico','🩺'],['Nico Robin','Arqueóloga','📚'],['Franky','Carpintero','🔧'],['Brook','Músico','🎻'],['Jinbe','Timonel','🌊']];
const onePieceSagas=['East Blue','Arabasta','Skypiea','Water 7 / Enies Lobby','Thriller Bark','Guerra de Marineford','Isla Gyojin','Dressrosa','Whole Cake Island','País de Wano','Saga Final'];
function renderFanCharacters(){
 const host=document.getElementById('fan-results');if(!host)return;
 const q=(document.getElementById('fan-search').value||'').toLocaleLowerCase('es').trim();
 const type=document.getElementById('fan-type').value;
 const matches=fanCharacters.filter(x=>(type==='todos'||x.type===type)&& (x.name+' '+x.anime).toLocaleLowerCase('es').includes(q));
 host.innerHTML=matches.map(x=>`<article class="fan-card"><div class="fan-symbol">${x.symbol}</div><span class="fan-tag">${x.type}</span><h3>${x.name}</h3><p>${x.anime}</p></article>`).join('')||'<p>No se encontraron personajes.</p>';
}
const pokemonEs={'bulbasaur':1,'ivysaur':2,'venusaur':3,'charmander':4,'charmeleon':5,'charizard':6,'squirtle':7,'wartortle':8,'blastoise':9,'pikachu':25,'raichu':26,'eevee':133,'eevee':133,'mewtwo':150,'mew':151,'lucario':448,'greninja':658};
const typeEs={normal:'Normal',fire:'Fuego',water:'Agua',electric:'Eléctrico',grass:'Planta',ice:'Hielo',fighting:'Lucha',poison:'Veneno',ground:'Tierra',flying:'Volador',psychic:'Psíquico',bug:'Bicho',rock:'Roca',ghost:'Fantasma',dragon:'Dragón',dark:'Siniestro',steel:'Acero',fairy:'Hada'};
const statEs={hp:'PS',attack:'Ataque',defense:'Defensa','special-attack':'Ataque especial','special-defense':'Defensa especial',speed:'Velocidad'};
async function searchPokemon(term){
 const host=document.getElementById('pokedex-result');if(!host)return;
 const query=String(term).trim().toLocaleLowerCase('es');if(!/^[a-z0-9 -]{1,60}$/.test(query)){host.textContent='Introduce un nombre o número válido.';return}
 host.textContent='Buscando Pokémon…';
 try{
  const id=pokemonEs[query]||query.replace(/ +/g,'-');
  const res=await fetch('https://pokeapi.co/api/v2/pokemon/'+encodeURIComponent(id));
  if(!res.ok)throw new Error('No encontrado');
  const p=await res.json();
  const speciesRes=await fetch(p.species.url);
  const species=speciesRes.ok?await speciesRes.json():null;
  const name=species?.names?.find(n=>n.language.name==='es')?.name||p.name;
  const description=species?.flavor_text_entries?.find(x=>x.language.name==='es')?.flavor_text.replace(/[\\n\\f\\r]/g,' ')||'';
  const image=p.sprites.other?.['official-artwork']?.front_default||p.sprites.front_default;
  host.replaceChildren();
  const card=document.createElement('article');card.className='pokemon-card';
  const picture=document.createElement('img');picture.src=image;picture.alt='Imagen de '+name;picture.loading='lazy';card.append(picture);
  const info=document.createElement('div');const title=document.createElement('h2');title.textContent='#'+String(p.id).padStart(4,'0')+' · '+name;info.append(title);
  const types=document.createElement('p');types.textContent='Tipo: '+p.types.map(t=>typeEs[t.type.name]||t.type.name).join(' / ');info.append(types);
  if(description){const d=document.createElement('p');d.textContent=description;info.append(d)}
  const stats=document.createElement('div');stats.className='pokemon-stats';p.stats.forEach(s=>{const line=document.createElement('div');line.textContent=(statEs[s.stat.name]||s.stat.name)+': '+s.base_stat;stats.append(line)});info.append(stats);card.append(info);host.append(card);
 }catch(e){host.textContent='No se encontró ese Pokémon o no se pudo conectar con PokéAPI. Prueba con otro nombre o número.'}
}
function setupFanPage(path){
 if(path==='/waifu-husbando'){
  document.getElementById('fan-search')?.addEventListener('input',renderFanCharacters);
  document.getElementById('fan-type')?.addEventListener('change',renderFanCharacters);renderFanCharacters();
 }
 if(path==='/pokedex'){
  document.getElementById('pokedex-form')?.addEventListener('submit',e=>{e.preventDefault();searchPokemon(document.getElementById('pokemon-search').value)});
  document.querySelectorAll('[data-pokemon]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('pokemon-search').value=b.textContent;searchPokemon(b.dataset.pokemon)}));
 }
 if(path==='/one-piece'){
  document.getElementById('straw-hats').innerHTML=strawHats.map(x=>`<article class="fan-card"><div class="fan-symbol">${x[2]}</div><h3>${x[0]}</h3><p>${x[1]}</p></article>`).join('');
  document.getElementById('onepiece-arcs').innerHTML=onePieceSagas.map((x,i)=>`<article class="fan-card"><span class="fan-tag">Saga ${i+1}</span><h3>${x}</h3></article>`).join('');
 }
}

const catalogSections={anime:'anime',manga:'manga',manhwa:'manhwa',gaming:'gaming','waifu-husbando':'waifu-husbando',pokedex:'pokedex','one-piece':'one-piece'};
async function loadEditorialCatalog(category,containerId){
 const host=document.getElementById(containerId);if(!host)return;
 const {data,error}=await sb.from('site_catalog').select('id,title,description,image_url,extra_info').eq('category',category).eq('status','published').order('created_at',{ascending:false}).limit(100);
 if(!host.isConnected)return;
 if(error){host.textContent='No se pudo cargar el catálogo.';return}
 if(!data?.length){host.innerHTML='<div class="empty">Aún no hay fichas publicadas por administración.</div>';return}
 host.replaceChildren();
 const grid=document.createElement('div');grid.className='fan-grid';
 data.forEach(item=>{const card=document.createElement('article');card.className='fan-card';
  if(item.image_url&&/^https:\/\//i.test(item.image_url)){const img=document.createElement('img');img.src=item.image_url;img.alt=item.title;img.loading='lazy';img.style.cssText='width:100%;height:180px;object-fit:cover;border-radius:10px';img.onerror=()=>img.remove();card.append(img)}
  const title=document.createElement('h3');title.textContent=item.title;card.append(title);
  for(const value of [item.description,item.extra_info])if(value){const para=document.createElement('p');para.textContent=value;para.style.marginTop='8px';card.append(para)}
  const favorite=document.createElement('button');favorite.type='button';favorite.className='outline-btn';favorite.style.cssText='margin-top:12px;cursor:pointer';favorite.textContent='♡ Guardar favorito';favorite.setAttribute('aria-label','Guardar '+item.title+' en favoritos');favorite.dataset.favoriteId=item.id;favorite.onclick=()=>toggleCatalogFavorite(item.id,favorite);card.append(favorite);
  grid.append(card)});host.append(grid);syncCatalogFavoriteButtons();
}
async function syncCatalogFavoriteButtons(){
 const buttons=[...document.querySelectorAll('[data-favorite-id]')];if(!buttons.length)return;
 const {data:{user}}=await sb.auth.getUser();if(!user)return;
 const {data,error}=await sb.from('member_catalog_favorites').select('catalog_id').eq('user_id',user.id);
 if(error)return;const saved=new Set((data||[]).map(x=>x.catalog_id));
 buttons.forEach(b=>{const active=saved.has(b.dataset.favoriteId);b.textContent=active?'♥ En favoritos':'♡ Guardar favorito';b.setAttribute('aria-pressed',String(active))});
}
async function toggleCatalogFavorite(id,button){
 const {data:{user}}=await sb.auth.getUser();if(!user){location.hash='#/auth';return}
 button.disabled=true;
 const active=button.getAttribute('aria-pressed')==='true';
 const request=active?sb.from('member_catalog_favorites').delete().eq('user_id',user.id).eq('catalog_id',id):sb.from('member_catalog_favorites').insert({user_id:user.id,catalog_id:id});
 const {error}=await request;button.disabled=false;
 if(error){alert('No se pudo actualizar favoritos: '+error.message);return}
 await syncCatalogFavoriteButtons();
}
async function loadMyFavorites(){
 const host=document.getElementById('my-favorites');if(!host)return;
 const {data:{user}}=await sb.auth.getUser();if(!host.isConnected)return;
 if(!user){host.innerHTML='<p>Inicia sesión para guardar tus favoritos.</p><a class="gradient-btn" href="#/auth">Iniciar sesión</a>';return}
 const {data:rows,error}=await sb.from('member_catalog_favorites').select('catalog_id').eq('user_id',user.id).order('created_at',{ascending:false});
 if(error){host.textContent='No se pudieron cargar los favoritos.';return}
 if(!rows?.length){host.textContent='Todavía no tienes favoritos. Explora Anime, Manga, Manhwa o Gaming y pulsa ♡ Guardar favorito.';return}
 const {data:items,error:catalogError}=await sb.from('site_catalog').select('id,title,category,image_url').in('id',rows.map(x=>x.catalog_id)).eq('status','published');
 if(catalogError){host.textContent='No se pudieron cargar las fichas.';return}
 host.replaceChildren();const grid=document.createElement('div');grid.className='fan-grid';
 for(const item of items||[]){const card=document.createElement('article');card.className='fan-card';if(item.image_url&&item.image_url.startsWith('https://')){const img=document.createElement('img');img.src=item.image_url;img.alt='';img.loading='lazy';img.style.cssText='width:100%;height:160px;object-fit:cover;border-radius:10px';card.append(img)}const h=document.createElement('h3');h.textContent=item.title;card.append(h);const p=document.createElement('p');p.textContent=item.category;card.append(p);const b=document.createElement('button');b.className='outline-btn';b.style.marginTop='12px';b.textContent='♥ Quitar favorito';b.onclick=async()=>{b.disabled=true;const {error:e}=await sb.from('member_catalog_favorites').delete().eq('user_id',user.id).eq('catalog_id',item.id);if(e){alert(e.message);b.disabled=false}else loadMyFavorites()};card.append(b);grid.append(card)}host.append(grid);
}
function renderAchievementSection(name,id){
 const host=document.getElementById(id);
 if(!host)return;
 const labels={
  'my-levels':'tu nivel y tus XP',
  'level-ranking':'la clasificación de miembros',
  'streak-ranking':'la clasificación de rachas',
  'community-missions':'las misiones de la comunidad',
  'reward-chests':'los cofres de recompensas',
  'reward-inventory':'el inventario de recompensas'
 };
 const label=labels[id]||'este apartado';
 const fail=error=>{
  console.error('Logros y niveles: '+name,error);
  if(!host.isConnected)return;
  host.replaceChildren();
  const message=document.createElement('p');
  message.setAttribute('role','alert');
  message.textContent='No se pudo cargar '+label+'.';
  const diagnostic=document.createElement('p');
  diagnostic.style.cssText='font-size:.9rem;overflow-wrap:anywhere;opacity:.85';
  const detail=error instanceof Error?error.message:String(error?.message||error||'Error desconocido');
  diagnostic.textContent='Detalle técnico: '+detail;
  const retry=document.createElement('button');
  retry.type='button';retry.className='outline-btn mini';retry.textContent='↻ Reintentar';
  retry.onclick=()=>{host.textContent='Cargando '+label+'…';renderAchievementSection(name,id)};
  host.append(message,diagnostic,retry);
 };
 try{
  const task=window[name];
  if(typeof task!=='function'){
   const error=new Error('El archivo levels.js no se ha cargado correctamente. Prueba a recargar la página con Ctrl + F5.');
   fail(error);
   return;
  }
  Promise.resolve(task()).catch(fail);
 }catch(error){fail(error)}
}
function render(){let raw=location.hash.slice(1)||'/';let path=raw.split('?')[0];app.innerHTML=(pages[path]||pages['/'])();if(raw.includes('mode=signup'))$('#authTitle')&&( $('#authTitle').textContent='Crear cuenta');if(path==='/cuenta')loadAccountProfile();if(path==='/no-molestar')loadQuickDndPage();if(path==='/favoritos')loadMyFavorites();if(path==='/encuestas')renderCommunityPolls();if(path==='/tienda')renderRewardShop();if(path==='/regalos')renderGiftMailbox();if(path==='/logros'){for(const [name,id] of [['renderMyLevels','my-levels'],['renderLevelRanking','level-ranking'],['renderStreakRanking','streak-ranking'],['renderCommunityMissions','community-missions'],['renderRewardChests','reward-chests'],['renderRewardInventory','reward-inventory']])renderAchievementSection(name,id)}if(path==='/miembros')loadMembers();if(path==='/mensajes')loadPrivateMessages();if(path==='/comunidad')loadCommunityFeed();if(path==='/notificaciones')loadMemberNotifications();if(path==='/perfil')loadPublicMemberProfile();if(path==='/auth')document.getElementById('auth-form')?.addEventListener('submit',submitAuth);if(path==='/auth')document.getElementById('resend-confirmation')?.addEventListener('click',resendConfirmationEmail);if(path==='/forgot-password')document.getElementById('forgot-form')?.addEventListener('submit',requestPasswordReset);if(path==='/reset-password')document.getElementById('reset-form')?.addEventListener('submit',saveNewPassword);loadDynamicContent(path);setupFanPage(path);if(catalogSections[path.slice(1)]){const cat=catalogSections[path.slice(1)];if(!document.getElementById('editorial-catalog')){const section=document.createElement('section');section.className='section';section.id='editorial-catalog';section.innerHTML='<h2>Contenido publicado por administración</h2>';app.append(section)}loadEditorialCatalog(cat,'editorial-catalog')}refreshAccountActions();window.scrollTo(0,0);$('.topbar').classList.remove('open')}
window.addEventListener('hashchange',render);
// Wait for levels.js, polls.js and other page modules before first render.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
else render();