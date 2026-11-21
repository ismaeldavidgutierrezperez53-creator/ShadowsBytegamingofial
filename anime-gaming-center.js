/* Shadows Byte Gaming Official V2 — Centro Anime y Gaming.
   Personal tracking only. User-created text is rendered with textContent, never HTML. */
(() => {
  'use strict';
  let currentMount = 0;
  const fieldsAnime = 'id,title,status,episodes_watched,episodes_total,rating,notes,created_at,updated_at';
  const fieldsGame = 'id,game_title,played_on,minutes_played,notes,created_at';
  const labels = {pendiente:'📌 Pendiente',viendo:'▶️ Viendo',completado:'✅ Completado',pausado:'⏸️ Pausado'};
  const statuses = ['pendiente','viendo','completado','pausado'];
  const byId = (root, id) => root.querySelector('#' + id);
  const node = (tag, className, value) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (value !== undefined) result.textContent = String(value);
    return result;
  };
  const today = () => {
    const d = new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  };
  const friendlyError = error => (error && error.message ? error.message : 'No se pudo completar la operación. Revisa tu conexión.');
  function emptyStatus(root, title, description, allowRetry) {
    root.replaceChildren();
    const panel = node('section','sb-ag-panel');
    panel.append(node('h2','',title),node('p','',description));
    if (allowRetry) {
      const retry = node('button','gradient-btn mini','Reintentar');
      retry.type='button';
      retry.addEventListener('click',mount);
      panel.append(retry);
    }
    root.append(panel);
  }
  async function timeout(promise, time = 9000) {
    let handle;
    try {
      return await Promise.race([
        promise,
        new Promise((_,reject) => {handle=setTimeout(()=>reject(new Error('La conexión tardó demasiado.')),time);})
      ]);
    } finally {clearTimeout(handle);}
  }
  async function mount() {
    const root = document.getElementById('sb-anime-gaming-hub');
    if (!root) return;
    const myMount = ++currentMount;
    const active = () => myMount === currentMount && document.getElementById('sb-anime-gaming-hub') === root;
    emptyStatus(root,'Comprobando tu sesión…','Preparando tu espacio personal de anime y videojuegos.',false);
    if (typeof sb === 'undefined' || !sb.auth) {
      emptyStatus(root,'No se pudo iniciar el centro','Recarga la página o vuelve a intentarlo.',true);
      return;
    }
    let user;
    try {
      const {data,error} = await timeout(sb.auth.getSession());
      if (error) throw error;
      user = data?.session?.user || null;
    } catch(error) {
      if (active()) emptyStatus(root,'No se pudo comprobar tu sesión',friendlyError(error)+' Tus listas siguen guardadas. Reintenta cuando tengas conexión.',true);
      return;
    }
    if (!active()) return;
    if (!user) {
      root.innerHTML = '<section class="sb-ag-panel"><h2>Tu aventura empieza con tu cuenta</h2><p>Inicia sesión con tu cuenta actual para consultar tus animes y tus sesiones gaming. No hace falta registrarse otra vez.</p><a class="gradient-btn mini" href="#/auth">Iniciar sesión</a></section>';
      return;
    }
    const state = {root,user,anime:[],games:[],library:[],filter:'todas',busy:false,challengeGoal:3,rankVisible:false,rankRegistered:false,leaderboard:[]};
    drawShell(state);
    await loadData(state,active);
  }
  function drawShell(state) {
    const root = state.root;
    root.innerHTML = [
      '<div class="sb-ag-head"><p class="sb-ag-eyebrow">🌸 TU AVENTURA PERSONAL</p><h2>Centro Anime y Gaming</h2><p>Organiza lo que ves, registra tus partidas y descubre qué te apetece hacer hoy. Tus listas y sesiones son privadas; la clasificación solo muestra estadísticas si decides participar.</p></div>',
      '<div class="sb-ag-stats" id="sb-ag-stats" aria-live="polite"></div>',
      '<div class="sb-ag-suggest"><button type="button" class="outline-btn mini" id="sb-ag-suggest-anime">🎲 ¿Qué anime veo?</button><button type="button" class="outline-btn mini" id="sb-ag-suggest-game">🎮 ¿Qué juego hoy?</button><p id="sb-ag-tip" role="status" aria-live="polite">Tus sugerencias se basan en las listas que guardes.</p></div>',
      '<p class="sb-ag-feedback" id="sb-ag-load-message" role="status" aria-live="polite">Cargando tus registros…</p>',
      '<div class="sb-ag-columns">',
      '<section class="sb-ag-panel"><h3>🌸 Mi lista de anime</h3><p>Añade series, cambia su estado y lleva la cuenta de episodios.</p>',
      '<form id="sb-ag-anime-form" class="sb-ag-form">',
      '<label for="sb-ag-anime-title">Título del anime</label><input id="sb-ag-anime-title" maxlength="120" autocomplete="off" required placeholder="Ej.: One Piece">',
      '<div class="sb-ag-fields"><div><label for="sb-ag-anime-status">Estado</label><select id="sb-ag-anime-status"><option value="pendiente">Pendiente</option><option value="viendo">Viendo</option><option value="completado">Completado</option><option value="pausado">Pausado</option></select></div>',
      '<div><label for="sb-ag-anime-total">Total de episodios (opcional)</label><input type="number" id="sb-ag-anime-total" min="1" max="9999" step="1" placeholder="Ej.: 12"></div>',
      '<div><label for="sb-ag-anime-rating">Valoración (opcional)</label><select id="sb-ag-anime-rating"><option value="">Sin valorar</option><option value="1">★ 1</option><option value="2">★★ 2</option><option value="3">★★★ 3</option><option value="4">★★★★ 4</option><option value="5">★★★★★ 5</option></select></div></div>',
      '<label for="sb-ag-anime-notes">Notas (opcional)</label><textarea id="sb-ag-anime-notes" maxlength="500" rows="2" placeholder="¿Por qué quieres verlo?"></textarea>',
      '<button type="submit" class="gradient-btn">➕ Añadir anime</button><p id="sb-ag-anime-message" class="sb-ag-feedback" role="status"></p></form>',
      '<div class="sb-ag-list-tools"><label for="sb-ag-anime-filter">Mostrar:</label><select id="sb-ag-anime-filter"><option value="todas">Todas</option><option value="pendiente">Pendientes</option><option value="viendo">Viendo</option><option value="completado">Completadas</option><option value="pausado">Pausadas</option></select></div>',
      '<div id="sb-ag-anime-list" class="sb-ag-list"></div></section>',
      '<section class="sb-ag-panel"><h3>🎮 Diario gaming</h3><p>Apunta cuánto has jugado y conserva un historial de tus sesiones.</p>',
      '<form id="sb-ag-game-form" class="sb-ag-form">',
      '<label for="sb-ag-game-title">Videojuego</label><input id="sb-ag-game-title" list="sb-ag-known-games" maxlength="120" required placeholder="Ej.: Minecraft"><datalist id="sb-ag-known-games"></datalist>',
      '<div class="sb-ag-fields"><div><label for="sb-ag-game-date">Fecha</label><input id="sb-ag-game-date" type="date" required></div>',
      '<div><label for="sb-ag-game-minutes">Minutos jugados</label><input id="sb-ag-game-minutes" type="number" min="1" max="1440" step="1" required placeholder="60"></div></div>',
      '<label for="sb-ag-game-notes">Notas (opcional)</label><textarea id="sb-ag-game-notes" maxlength="500" rows="2" placeholder="Partida, misión, logro…"></textarea>',
      '<button type="submit" class="gradient-btn">➕ Guardar sesión</button><p id="sb-ag-game-message" class="sb-ag-feedback" role="status"></p></form>',
      '<div id="sb-ag-game-list" class="sb-ag-list"></div></section></div>',
      '<div class="sb-ag-extras">',
      '<section class="sb-ag-panel" aria-labelledby="sb-ag-challenge-heading"><h3 id="sb-ag-challenge-heading">🏁 Retos anime</h3><p>Elige cuántos animes quieres completar. El progreso se calcula desde tu lista personal.</p><div class="sb-ag-challenge-controls"><label for="sb-ag-challenge-goal">Mi meta de animes completados</label><input id="sb-ag-challenge-goal" type="number" min="1" max="50" step="1" value="3"><button type="button" class="outline-btn mini" id="sb-ag-challenge-save">Guardar reto</button></div><progress id="sb-ag-challenge-progress" max="3" value="0"></progress><p id="sb-ag-challenge-result" class="sb-ag-feedback" role="status" aria-live="polite">Preparando tu reto…</p></section>',
      '<section class="sb-ag-panel" aria-labelledby="sb-ag-achievements-heading"><h3 id="sb-ag-achievements-heading">🏅 Logros por completar series</h3><p>Desbloquea insignias de colección al marcar animes como completados. No se suman puntos ni se modifican tus recompensas actuales.</p><div id="sb-ag-badges" class="sb-ag-badges" aria-live="polite"></div></section>',
      '<section class="sb-ag-panel" aria-labelledby="sb-ag-ranking-heading"><h3 id="sb-ag-ranking-heading">🏆 Clasificación gaming</h3><p>Ranking por horas de juego registradas por cada miembro. Participar es voluntario: solo aparecen el nombre y los totales, nunca tus notas o partidas privadas.</p><label class="sb-ag-rank-toggle"><input type="checkbox" id="sb-ag-rank-visible"> Aparecer en la clasificación con mis totales</label><p id="sb-ag-rank-message" class="sb-ag-feedback" role="status" aria-live="polite">Cargando clasificación…</p><ol id="sb-ag-rank-list" class="sb-ag-rank-list"></ol></section>',
      '<section class="sb-ag-panel" aria-labelledby="sb-ag-rec-heading"><h3 id="sb-ag-rec-heading">💡 Recomendaciones personalizadas</h3><p>Ideas elaboradas a partir de tus animes y tu propia biblioteca de videojuegos, sin compartirlos con otros miembros.</p><div id="sb-ag-rec-anime" class="sb-ag-rec-item"></div><div id="sb-ag-rec-game" class="sb-ag-rec-item"></div><button type="button" class="outline-btn mini" id="sb-ag-rec-refresh">Actualizar sugerencias</button></section>',
      '</div>'
    ].join('');
    byId(root,'sb-ag-game-date').value=today();
    byId(root,'sb-ag-game-date').max=today();
    byId(root,'sb-ag-anime-form').addEventListener('submit',event => addAnime(state,event));
    byId(root,'sb-ag-game-form').addEventListener('submit',event => addGame(state,event));
    byId(root,'sb-ag-anime-filter').addEventListener('change',event => {state.filter=event.target.value;paintAnime(state);});
    byId(root,'sb-ag-suggest-anime').addEventListener('click',() => {byId(root,'sb-ag-tip').textContent = recommendation(state,'anime');});
    byId(root,'sb-ag-suggest-game').addEventListener('click',() => {byId(root,'sb-ag-tip').textContent = recommendation(state,'gaming');});
    byId(root,'sb-ag-challenge-save').addEventListener('click',() => saveChallenge(state));
    byId(root,'sb-ag-rank-visible').addEventListener('change',(event) => updateRankingOptIn(state,event.target.checked));
    byId(root,'sb-ag-rec-refresh').addEventListener('click',() => paintRecommendations(state));
  }
  async function loadData(state,active) {
    const {root,user} = state;
    const message=byId(root,'sb-ag-load-message');
    try {
      const [anime, games, library] = await timeout(Promise.all([
        sb.from('member_anime_watchlist').select(fieldsAnime).eq('user_id',user.id).order('updated_at',{ascending:false}).limit(200),
        sb.from('member_gaming_sessions').select(fieldsGame).eq('user_id',user.id).order('played_on',{ascending:false}).limit(200),
        sb.from('member_game_library').select('title,status').eq('user_id',user.id).limit(100)
      ]),13000);
      if(!active()) return;
      if (anime.error) throw anime.error;
      if (games.error) throw games.error;
      state.anime = anime.data || [];
      state.games = games.data || [];
      state.library = library.error ? [] : library.data || [];
      populateSuggestions(state);
      message.textContent='✅ Tus registros se han cargado. Los datos son privados.';
      byId(root,'sb-ag-anime-form').querySelector('button[type="submit"]').disabled=false;
      byId(root,'sb-ag-game-form').querySelector('button[type="submit"]').disabled=false;
      paintAll(state);
      void Promise.all([loadChallenge(state,active),loadRanking(state,active)]);
    } catch(error) {
      if(!active()) return;
      message.textContent='No se pudieron cargar las listas: '+friendlyError(error)+' ';
      const retry=node('button','outline-btn mini','Reintentar');
      retry.type='button';
      retry.addEventListener('click',()=>{message.textContent='Cargando…';loadData(state,active);});
      message.append(retry);
      byId(root,'sb-ag-anime-form').querySelector('button[type="submit"]').disabled=true;
      byId(root,'sb-ag-game-form').querySelector('button[type="submit"]').disabled=true;
    }
  }
  function populateSuggestions(state){
    const list=byId(state.root,'sb-ag-known-games');
    list.replaceChildren();
    const titles=[...new Set(state.library.map(g=>g.title).concat(state.games.map(g=>g.game_title)).filter(Boolean))].slice(0,100);
    for(const t of titles){const option=document.createElement('option');option.value=t;list.append(option);}
  }
  function paintAll(state){paintStats(state);paintAnime(state);paintGames(state);paintChallenge(state);paintAchievements(state);paintRecommendations(state);}
  function paintStats(state){
    const stats=byId(state.root,'sb-ag-stats');
    const minutes=state.games.reduce((sum,g)=>sum+g.minutes_played,0);
    const data=[
      ['🌸 Animes',state.anime.length],
      ['▶️ Viendo',state.anime.filter(a=>a.status==='viendo').length],
      ['✅ Completados',state.anime.filter(a=>a.status==='completado').length],
      ['🎮 Sesiones',state.games.length],
      ['⏱️ Horas jugadas',(minutes/60).toFixed(1)]
    ];
    stats.replaceChildren();
    for(const [label,value] of data){const card=node('div','sb-ag-stat');card.append(node('strong','',value),node('span','',label));stats.append(card);}
  }
  function appendMeta(parent,parts){
    parent.append(node('p','sb-ag-item-meta',parts.filter(Boolean).join(' · ')));
  }
  function paintAnime(state){
    const host=byId(state.root,'sb-ag-anime-list');
    host.replaceChildren();
    const data=state.anime.filter(x=>state.filter==='todas'||x.status===state.filter);
    if(!data.length){host.append(node('p','sb-ag-empty','No hay animes en este estado. Añade uno para empezar.'));return;}
    for(const anime of data){
      const card=node('article','sb-ag-item');
      const heading=node('h4','',anime.title);
      card.append(heading);
      appendMeta(card,[labels[anime.status]||anime.status, anime.episodes_watched+' / '+(anime.episodes_total??'—')+' episodios',anime.rating?'★ '+anime.rating+'/5':'']);
      if(anime.notes)card.append(node('p','sb-ag-note',anime.notes));
      const tools=node('div','sb-ag-item-actions');
      const select=node('select','');
      select.setAttribute('aria-label','Estado de '+anime.title);
      for(const status of statuses){const opt=document.createElement('option');opt.value=status;opt.textContent=labels[status];select.append(opt);}
      select.value=anime.status;
      select.addEventListener('change',()=>updateAnime(state,anime,{status:select.value},tools));
      tools.append(select);
      const less=node('button','outline-btn mini','− Episodio');less.type='button';
      less.disabled=anime.episodes_watched===0;
      less.addEventListener('click',()=>updateAnime(state,anime,{episodes_watched:anime.episodes_watched-1},tools));
      const more=node('button','outline-btn mini','+ Episodio');more.type='button';
      more.disabled=anime.episodes_total!==null && anime.episodes_watched>=anime.episodes_total;
      more.addEventListener('click',()=>updateAnime(state,anime,{episodes_watched:anime.episodes_watched+1},tools));
      const remove=node('button','sb-ag-danger','Eliminar');remove.type='button';
      remove.setAttribute('aria-label','Eliminar '+anime.title);
      remove.addEventListener('click',()=>deleteRow(state,'member_anime_watchlist',anime.id,anime.title,'anime',tools));
      tools.append(less,more,remove);
      card.append(tools);host.append(card);
    }
  }
  async function updateAnime(state,item,changes,tools){
    if(state.busy)return;
    state.busy=true;
    tools.querySelectorAll('button,select').forEach(el=>el.disabled=true);
    const payload={...changes,updated_at:new Date().toISOString()};
    try{
      const {data,error}=await sb.from('member_anime_watchlist').update(payload).eq('id',item.id).eq('user_id',state.user.id).select(fieldsAnime).single();
      if(error)throw error;
      Object.assign(item,data);
      paintAll(state);
      byId(state.root,'sb-ag-anime-message').textContent='Cambios guardados.';
    }catch(error){
      byId(state.root,'sb-ag-anime-message').textContent='No se pudo actualizar: '+friendlyError(error);
      paintAnime(state);
    }finally{state.busy=false;}
  }
  async function addAnime(state,event){
    event.preventDefault();
    if(state.busy)return;
    const root=state.root,form=event.currentTarget;
    const title=byId(root,'sb-ag-anime-title').value.trim().replace(/\s+/g,' ');
    const totalRaw=byId(root,'sb-ag-anime-total').value;
    const ratingRaw=byId(root,'sb-ag-anime-rating').value;
    const total=totalRaw ? Number(totalRaw) : null;
    const rating=ratingRaw ? Number(ratingRaw) : null;
    const message=byId(root,'sb-ag-anime-message');
    if(!title || title.length>120 || (total!==null && (!Number.isInteger(total)||total<1||total>9999))) {message.textContent='Comprueba el título y el total de episodios.';return;}
    if(state.anime.some(a=>a.title.trim().toLocaleLowerCase('es')===title.toLocaleLowerCase('es'))){message.textContent='Ese anime ya está en tu lista. Puedes actualizarlo en su tarjeta.';return;}
    const payload={user_id:state.user.id,title,status:byId(root,'sb-ag-anime-status').value,episodes_watched:0,episodes_total:total,rating,notes:byId(root,'sb-ag-anime-notes').value.trim()};
    const submit=form.querySelector('button[type="submit"]');
    state.busy=true;submit.disabled=true;message.textContent='Guardando anime…';
    try{
      const {data,error}=await sb.from('member_anime_watchlist').insert(payload).select(fieldsAnime).single();
      if(error)throw error;
      state.anime.unshift(data);form.reset();paintAll(state);message.textContent='✅ Anime añadido a tu lista.';
    }catch(error){message.textContent='No se pudo guardar: '+friendlyError(error);}
    finally{state.busy=false;submit.disabled=false;}
  }
  function paintGames(state){
    const host=byId(state.root,'sb-ag-game-list');
    host.replaceChildren();
    if(!state.games.length){host.append(node('p','sb-ag-empty','Todavía no hay sesiones. Guarda tu primera partida.'));return;}
    for(const game of state.games){
      const card=node('article','sb-ag-item');
      card.append(node('h4','',game.game_title));
      const hours=Math.floor(game.minutes_played/60);
      const mins=game.minutes_played%60;
      appendMeta(card,[game.played_on,(hours?hours+' h ':'')+mins+' min']);
      if(game.notes)card.append(node('p','sb-ag-note',game.notes));
      const tools=node('div','sb-ag-item-actions');
      const remove=node('button','sb-ag-danger','Eliminar sesión');remove.type='button';
      remove.setAttribute('aria-label','Eliminar sesión de '+game.game_title);
      remove.addEventListener('click',()=>deleteRow(state,'member_gaming_sessions',game.id,game.game_title,'game',tools));
      tools.append(remove);card.append(tools);host.append(card);
    }
  }
  async function addGame(state,event){
    event.preventDefault();
    if(state.busy)return;
    const root=state.root,form=event.currentTarget;
    const title=byId(root,'sb-ag-game-title').value.trim().replace(/\s+/g,' ');
    const date=byId(root,'sb-ag-game-date').value;
    const minutes=Number(byId(root,'sb-ag-game-minutes').value);
    const message=byId(root,'sb-ag-game-message');
    if(!title||title.length>120||!Number.isInteger(minutes)||minutes<1||minutes>1440||! /^\d{4}-\d{2}-\d{2}$/.test(date)||date>today()) {
      message.textContent='Introduce un videojuego, una fecha válida y entre 1 y 1440 minutos.';return;
    }
    const submit=form.querySelector('button[type="submit"]');
    state.busy=true;submit.disabled=true;message.textContent='Guardando sesión…';
    try {
      const {data,error}=await sb.from('member_gaming_sessions').insert({user_id:state.user.id,game_title:title,played_on:date,minutes_played:minutes,notes:byId(root,'sb-ag-game-notes').value.trim()}).select(fieldsGame).single();
      if(error)throw error;
      state.games.unshift(data);state.games.sort((a,b)=>b.played_on.localeCompare(a.played_on)||b.created_at.localeCompare(a.created_at));
      form.reset();byId(root,'sb-ag-game-date').value=today();populateSuggestions(state);paintAll(state);
      message.textContent='✅ Sesión gaming guardada.';
      void loadRanking(state,()=>document.getElementById('sb-anime-gaming-hub')===root);
    }catch(error){message.textContent='No se pudo guardar: '+friendlyError(error);}
    finally{state.busy=false;submit.disabled=false;}
  }
  async function deleteRow(state,table,id,title,kind,tools){
    if(state.busy||!window.confirm('¿Eliminar "'+title+'" de tus registros personales?'))return;
    state.busy=true;tools.querySelectorAll('button,select').forEach(el=>el.disabled=true);
    try{
      const {error}=await sb.from(table).delete().eq('id',id).eq('user_id',state.user.id);
      if(error)throw error;
      if(kind==='anime')state.anime=state.anime.filter(a=>a.id!==id);
      else state.games=state.games.filter(g=>g.id!==id);
      populateSuggestions(state);paintAll(state);
      if(kind==='game')void loadRanking(state,()=>document.getElementById('sb-anime-gaming-hub')===state.root);
      byId(state.root,kind==='anime'?'sb-ag-anime-message':'sb-ag-game-message').textContent='Registro eliminado.';
    }catch(error){
      byId(state.root,kind==='anime'?'sb-ag-anime-message':'sb-ag-game-message').textContent='No se pudo eliminar: '+friendlyError(error);
      paintAll(state);
    }finally{state.busy=false;}
  }

  /* New features. Badges and challenges are derived from stored, private anime statuses.
     The optional public leaderboard contains aggregate totals only, never session details. */
  function completedCount(state) {
    return state.anime.filter(a=>a.status==='completado').length;
  }
  function paintChallenge(state) {
    const root=state.root, count=completedCount(state), target=state.challengeGoal;
    const progress=byId(root,'sb-ag-challenge-progress');
    if(!progress)return;
    progress.max=target;
    progress.value=Math.min(count,target);
    progress.setAttribute('aria-label','Progreso del reto anime: '+count+' de '+target+' animes');
    byId(root,'sb-ag-challenge-result').textContent=count>=target
      ? '🎉 ¡Reto completado! Has marcado '+count+' animes como completados.'
      : '🌸 Progreso: '+count+' de '+target+' animes. Te faltan '+(target-count)+'.';
  }
  function paintAchievements(state) {
    const box=byId(state.root,'sb-ag-badges');
    if(!box)return;
    box.replaceChildren();
    const count=completedCount(state);
    const medals=[
      [1,'🌱 Primer anime'],
      [3,'🌸 Explorador otaku'],
      [5,'⚡ Coleccionista anime'],
      [10,'👑 Maestro del anime'],
      [20,'🌌 Leyenda otaku']
    ];
    for(const [target,label] of medals){
      const unlocked=count>=target;
      const badge=node('div','sb-ag-badge'+(unlocked?' unlocked':''));
      badge.append(node('strong','',unlocked?'🏅 '+label:'🔒 '+label));
      badge.append(node('small','',unlocked?'Desbloqueado':'Completa '+target+' animes ('+count+'/'+target+')'));
      box.append(badge);
    }
  }
  async function loadChallenge(state,active) {
    try{
      const {data,error}=await timeout(sb.from('member_anime_challenge_settings')
        .select('target_count').eq('user_id',state.user.id).maybeSingle(),10000);
      if(!active())return;
      if(error)throw error;
      state.challengeGoal=Number(data?.target_count)||3;
      byId(state.root,'sb-ag-challenge-goal').value=String(state.challengeGoal);
      paintChallenge(state);
    }catch(error) {
      if(active())byId(state.root,'sb-ag-challenge-result').textContent='No se pudo consultar tu reto: '+friendlyError(error);
    }
  }
  async function saveChallenge(state) {
    if(state.busy)return;
    const root=state.root, input=byId(root,'sb-ag-challenge-goal'),target=Number(input.value);
    if(!Number.isInteger(target)||target<1||target>50){
      byId(root,'sb-ag-challenge-result').textContent='Elige una meta entre 1 y 50 animes.';return;
    }
    const button=byId(root,'sb-ag-challenge-save');
    button.disabled=true;
    try{
      const {data,error}=await sb.from('member_anime_challenge_settings')
        .upsert({user_id:state.user.id,target_count:target,updated_at:new Date().toISOString()},{onConflict:'user_id'})
        .select('target_count').single();
      if(error)throw error;
      state.challengeGoal=data.target_count;paintChallenge(state);
    }catch(error){
      byId(root,'sb-ag-challenge-result').textContent='No se pudo guardar el reto: '+friendlyError(error);
    }finally{button.disabled=false;}
  }
  function recommendation(state,kind) {
    if(kind==='anime'){
      const watching=state.anime.filter(a=>a.status==='viendo')
        .sort((a,b)=>((a.episodes_total||9999)-a.episodes_watched)-((b.episodes_total||9999)-b.episodes_watched));
      if(watching.length){
        const a=watching[0];
        return '▶️ Continúa «'+a.title+'»: llevas '+a.episodes_watched
          +(a.episodes_total?' de '+a.episodes_total:'')+' episodios.';
      }
      const pending=state.anime.filter(a=>a.status==='pendiente')
        .sort((a,b)=>(b.rating||0)-(a.rating||0));
      if(pending.length)return '🌸 Puedes empezar «'+pending[0].title+'», que está en tu lista de pendientes.';
      return '🌸 Añade un anime pendiente o en curso para recibir sugerencias basadas en tu lista.';
    }
    const playing=state.library.filter(g=>g.status==='playing').map(g=>g.title);
    const recent=state.games[0]?.game_title||null;
    const different=playing.find(title=>title.toLocaleLowerCase('es')!==String(recent||'').toLocaleLowerCase('es'));
    if(different)return '🎮 Prueba una sesión de «'+different+'»: está en tu biblioteca como «Jugando».';
    if(recent)return '🎮 Puedes continuar «'+recent+'», tu videojuego registrado más recientemente.';
    const planned=state.library.find(g=>g.status==='wishlist');
    if(planned)return '🎮 ¿Te apetece probar «'+planned.title+'»? Lo tienes en tu lista de deseos.';
    return '🎮 Añade juegos a tu biblioteca o guarda una partida para recibir recomendaciones.';
  }
  function paintRecommendations(state) {
    const anime=byId(state.root,'sb-ag-rec-anime');
    const game=byId(state.root,'sb-ag-rec-game');
    if(anime)anime.textContent=recommendation(state,'anime');
    if(game)game.textContent=recommendation(state,'gaming');
  }
  async function loadRanking(state,active) {
    const root=state.root,message=byId(root,'sb-ag-rank-message');
    if(!message)return;
    message.textContent='Actualizando clasificación…';
    try {
      const [mine,top]=await timeout(Promise.all([
        sb.from('member_gaming_leaderboard').select('user_id,sessions_count,minutes_total,visible').eq('user_id',state.user.id).maybeSingle(),
        sb.from('member_gaming_leaderboard').select('user_id,sessions_count,minutes_total').eq('visible',true).gt('sessions_count',0).order('minutes_total',{ascending:false}).limit(15)
      ]),12000);
      if(!active())return;
      if(mine.error)throw mine.error;
      if(top.error)throw top.error;
      state.rankRegistered=!!mine.data;
      state.rankVisible=mine.data?.visible===true;
      state.leaderboard=top.data||[];
      const checkbox=byId(root,'sb-ag-rank-visible');
      checkbox.checked=state.rankVisible;
      checkbox.disabled=!state.rankRegistered;
      const ids=state.leaderboard.map(p=>p.user_id);
      let profiles=[];
      if(ids.length){
        const response=await timeout(sb.from('profiles').select('id,display_name,username').in('id',ids).eq('is_public',true),8000);
        if(!active())return;
        if(!response.error)profiles=response.data||[];
      }
      const names=new Map(profiles.map(p=>[p.id,p.display_name||p.username||'Miembro gamer']));
      const list=byId(root,'sb-ag-rank-list');list.replaceChildren();
      state.leaderboard.forEach((player,i)=>{
        const item=node('li','sb-ag-rank-entry');
        const name=player.user_id===state.user.id?'Tú':(names.get(player.user_id)||'Miembro gamer');
        item.append(node('strong','',name),node('span','',(Number(player.minutes_total)/60).toFixed(1)+' h · '+player.sessions_count+' sesiones'));
        list.append(item);
      });
      if(!state.leaderboard.length)list.append(node('li','sb-ag-empty','Todavía no hay participantes. Puedes ser el primero.'));
      message.textContent=state.rankRegistered
        ? (state.rankVisible?'✅ Participas voluntariamente en la clasificación.':'🔒 Tus estadísticas están ocultas. Activa la casilla para participar.')
        : 'Registra tu primera sesión gaming para activar la participación en el ranking.';
    }catch(error) {
      if(active())message.textContent='No se pudo cargar la clasificación: '+friendlyError(error);
    }
  }
  async function updateRankingOptIn(state,visible) {
    const root=state.root,input=byId(root,'sb-ag-rank-visible');
    input.disabled=true;
    const message=byId(root,'sb-ag-rank-message');
    message.textContent='Guardando preferencia…';
    try {
      const {data,error}=await sb.from('member_gaming_leaderboard')
        .update({visible}).eq('user_id',state.user.id).select('visible').single();
      if(error)throw error;
      state.rankVisible=data.visible;
      await loadRanking(state,()=>document.getElementById('sb-anime-gaming-hub')===root);
    }catch(error) {
      input.checked=state.rankVisible;
      message.textContent='No se pudo cambiar tu privacidad: '+friendlyError(error);
    }finally { input.disabled=!state.rankRegistered; }
  }
  window.SBAnimeGamingHub={mount};
  if(typeof sb!=='undefined' && sb.auth?.onAuthStateChange){
    sb.auth.onAuthStateChange(event=>{
      if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>{if(document.getElementById('sb-anime-gaming-hub'))mount();},0);
    });
  }
})();
