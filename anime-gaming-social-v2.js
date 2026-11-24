/* Shadows Byte V2: anime recomendado entre miembros y retos gaming consentidos.
 * Nunca publica listas de anime ni sesiones gaming privadas. */
(() => {
 'use strict';
 const el=(tag,cls,txt)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(txt!==undefined)n.textContent=String(txt);
  return n;
 };
 const localDate=(offset=0)=>{
  const d=new Date();d.setDate(d.getDate()+offset);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 };
 const statusOf={pending:'🕒 Pendiente',accepted:'✅ Aceptado',declined:'⛔ Rechazado',cancelled:'🚫 Cancelado'};
 const safeErr=e=>e?.message||'Error de conexión';
 const ownHub=root=>root.isConnected&&document.getElementById('sb-anime-gaming-hub')===root;
 async function mount(){
  const root=document.getElementById('sb-anime-gaming-hub');
  const host=root?.querySelector('.sb-ag-extras');
  if(!root||!host||!ownHub(root)||typeof sb==='undefined'||!sb.auth
    ||root.querySelector('#sb-social-anime-recs'))return;
  const recPanel=el('section','sb-ag-panel sb-social-member-panel');
  recPanel.id='sb-social-anime-recs';
  const recTitle=el('h3','','🌸 Recomienda anime a otros miembros');
  const recInfo=el('p','','Envía recomendaciones a personas que sigues. Las listas privadas no se comparten.');
  const recForm=el('form','sb-social-form');
  const recFriendLabel=el('label','','Miembro que sigo');
  const recFriend=el('select');recFriend.required=true;
  recFriendLabel.append(recFriend);
  const animeLabel=el('label','','Título del anime');
  const animeInput=el('input');
  animeInput.required=true;animeInput.maxLength=120;
  animeInput.placeholder='Ej.: Naruto';animeInput.autocomplete='off';
  animeLabel.append(animeInput);
  const noteLabel=el('label','','Mensaje (opcional)');
  const note=el('textarea');
  note.maxLength=300;note.rows=2;note.placeholder='¿Por qué lo recomiendas?';
  noteLabel.append(note);
  const recSend=el('button','gradient-btn mini','📨 Enviar recomendación');
  recSend.type='submit';
  const recStatus=el('p','sb-social-feedback','Cargando recomendaciones…');
  recStatus.setAttribute('role','status');
  const recInbox=el('div','sb-social-inbox');
  recForm.append(recFriendLabel,animeLabel,noteLabel,recSend);
  recPanel.append(recTitle,recInfo,recForm,recStatus,recInbox);

  const gamePanel=el('section','sb-ag-panel sb-social-member-panel');
  gamePanel.id='sb-social-friend-challenges';
  const gameTitle=el('h3','','🎮 Retos gaming con amigos');
  const gameInfo=el('p','','Reta a un miembro que sigues. La otra persona debe aceptar; solo se comparten los minutos acumulados para ese reto.');
  const gameForm=el('form','sb-social-form');
  const gameFriendLabel=el('label','','Invitar a');
  const gameFriend=el('select');gameFriend.required=true;gameFriendLabel.append(gameFriend);
  const gameNameLabel=el('label','','Videojuego');
  const gameName=el('input');gameName.required=true;gameName.maxLength=120;
  gameName.setAttribute('list','sb-ag-known-games');
  gameName.placeholder='Ej.: Minecraft';gameNameLabel.append(gameName);
  const gameGrid=el('div','sb-social-form-grid');
  const hoursLabel=el('label','','Meta por persona (horas)');
  const hours=el('input');hours.type='number';hours.min='0.5';hours.max='40';hours.step='0.5';hours.value='3';hours.required=true;
  hoursLabel.append(hours);
  const durationLabel=el('label','','Duración (días)');
  const duration=el('input');duration.type='number';duration.min='1';duration.max='30';duration.step='1';duration.value='7';duration.required=true;
  durationLabel.append(duration);gameGrid.append(hoursLabel,durationLabel);
  const invite=el('button','gradient-btn mini','🎯 Enviar reto');
  invite.type='submit';
  const gameStatus=el('p','sb-social-feedback','Cargando retos…');
  gameStatus.setAttribute('role','status');
  const gameRefresh=el('button','outline-btn mini','↻ Actualizar retos y mi progreso');
  gameRefresh.type='button';
  const gameList=el('div','sb-social-inbox');
  gameForm.append(gameFriendLabel,gameNameLabel,gameGrid,invite);
  gamePanel.append(gameTitle,gameInfo,gameForm,gameRefresh,gameStatus,gameList);
  host.append(recPanel,gamePanel);
  const shortcuts=el('nav','sb-social-quick-nav');
  shortcuts.setAttribute('aria-label','Accesos rápidos de anime y retos');
  for(const [text,target] of [['🌸 Recomendar anime',recPanel],['🎮 Retos con amigos',gamePanel]]){
   const jump=el('button','outline-btn mini',text);
   jump.type='button';
   jump.onclick=()=>target.scrollIntoView({
    behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',
    block:'start'
   });
   shortcuts.append(jump);
  }
  root.querySelector('.sb-ag-suggest')?.after(shortcuts);

  let myUser=null,friends=[],names=new Map(),recLoading=false,gameLoading=false;
  const current=()=>myUser&&ownHub(root);
  const person=id=>id===myUser?.id?'Tú':names.get(id)||'Miembro';
  function fillFriends(){
   for(const select of [recFriend,gameFriend]){
    const old=select.value;select.replaceChildren();
    const hint=el('option','',friends.length?'Elige un miembro':'Sigue a un miembro para comenzar');
    hint.value='';select.append(hint);
    for(const row of friends){
     const option=el('option','',person(row.id));option.value=row.id;select.append(option);
    }
    if(friends.some(x=>x.id===old))select.value=old;
    select.disabled=!friends.length;
   }
   recSend.disabled=!friends.length;
   invite.disabled=!friends.length;
  }
  async function loadMembers(){
   const {data,error}=await sb.from('member_follows').select('following_id')
    .eq('follower_id',myUser.id).limit(100);
   if(error)throw error;
   const ids=[...new Set((data||[]).map(x=>x.following_id).filter(id=>id!==myUser.id))];
   if(!ids.length){friends=[];fillFriends();return;}
   const {data:profiles,error:profileError}=await sb.from('profiles')
    .select('id,display_name,username').in('id',ids).eq('is_public',true);
   if(profileError)throw profileError;
   friends=(profiles||[]).map(p=>({id:p.id,name:p.display_name||p.username||'Miembro'}))
    .sort((a,b)=>a.name.localeCompare(b.name,'es'));
   for(const p of friends)names.set(p.id,p.name);
   fillFriends();
  }
  async function fetchNames(ids){
   const unknown=[...new Set(ids)].filter(id=>id&&id!==myUser.id&&!names.has(id));
   if(!unknown.length)return;
   const {data}=await sb.from('profiles').select('id,display_name,username')
    .in('id',unknown).eq('is_public',true);
   for(const p of data||[])names.set(p.id,p.display_name||p.username||'Miembro');
  }
  async function loadRecs(){
   if(recLoading||!current())return;
   recLoading=true;recStatus.textContent='Cargando recomendaciones…';
   try{
    const {data,error}=await sb.from('sb_member_anime_recommendations')
     .select('id,sender_id,recipient_id,anime_title,message,created_at')
     .or('sender_id.eq.'+myUser.id+',recipient_id.eq.'+myUser.id)
     .order('created_at',{ascending:false}).limit(50);
    if(error)throw error;
    if(!current())return;
    await fetchNames((data||[]).flatMap(r=>[r.sender_id,r.recipient_id]));
    if(!current())return;
    recInbox.replaceChildren();
    recStatus.textContent=data?.length
     ?data.length+' recomendaciones enviadas o recibidas.'
     :'Todavía no hay recomendaciones. Puedes enviar la primera.';
    for(const rec of data||[]){
     const incoming=rec.recipient_id===myUser.id;
     const card=el('article','sb-social-card');
     card.append(el('strong','',rec.anime_title));
     card.append(el('small','',incoming?'📨 De '+person(rec.sender_id):'📤 Para '+person(rec.recipient_id)));
     if(rec.message)card.append(el('p','',rec.message));
     const actions=el('div','sb-social-card-actions');
     if(incoming){
      const add=el('button','outline-btn mini','➕ Añadir a mi lista');
      add.type='button';
      add.onclick=async()=>{
       add.disabled=true;
       try{
        const {data:{user},error:authError}=await sb.auth.getUser();
        if(authError||user?.id!==myUser.id)throw new Error('Tu sesión ha cambiado.');
        const {data:existing,error:readError}=await sb.from('member_anime_watchlist')
         .select('title').eq('user_id',myUser.id).limit(500);
        if(readError)throw readError;
        if((existing||[]).some(x=>x.title.trim().toLocaleLowerCase('es')===rec.anime_title.trim().toLocaleLowerCase('es')))
         throw new Error('Este anime ya está en tu lista.');
        const {error}=await sb.from('member_anime_watchlist')
         .insert({user_id:myUser.id,title:rec.anime_title,status:'pendiente',episodes_watched:0,notes:''});
        if(error)throw error;
        recStatus.textContent='✅ Anime añadido a tu lista.';
        if(typeof window.SBAnimeGamingHub?.mount==='function')void window.SBAnimeGamingHub.mount();
       }catch(e){recStatus.textContent='No se pudo añadir: '+safeErr(e);}
       finally{add.disabled=false;}
      };
      actions.append(add);
     }
     const remove=el('button','outline-btn mini','Eliminar recomendación');
     remove.type='button';remove.title='Se eliminará para ambas personas.';
     remove.onclick=async()=>{
      remove.disabled=true;
      try{
       const {data:{user},error:authError}=await sb.auth.getUser();
       if(authError||user?.id!==myUser.id)throw new Error('La sesión ha cambiado.');
       const {error}=await sb.from('sb_member_anime_recommendations').delete().eq('id',rec.id);
       if(error)throw error;
       recStatus.textContent='✅ Recomendación eliminada para ambas personas.';
       void loadRecs();
      }catch(e){recStatus.textContent='No se pudo eliminar: '+safeErr(e);remove.disabled=false;}
     };
     actions.append(remove);card.append(actions);recInbox.append(card);
    }
   }catch(e){if(current())recStatus.textContent='Error de recomendaciones: '+safeErr(e);}
   finally{recLoading=false;}
  }
  recForm.onsubmit=async event=>{
   event.preventDefault();
   const recipient=recFriend.value,title=animeInput.value.trim().replace(/\s+/g,' ');
   if(!friends.some(f=>f.id===recipient)||title.length<1||title.length>120)return;
   recSend.disabled=true;recStatus.textContent='Enviando recomendación…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||user?.id!==myUser.id)throw new Error('La sesión ha cambiado.');
    const {error}=await sb.from('sb_member_anime_recommendations').insert({
     sender_id:myUser.id,recipient_id:recipient,anime_title:title,message:note.value.trim()
    });
    if(error)throw error;
    animeInput.value='';note.value='';
    recStatus.textContent='✅ Recomendación enviada. Aparecerá en el centro del otro miembro.';
    await loadRecs();
   }catch(e){recStatus.textContent='No se pudo enviar: '+safeErr(e);}
   finally{recSend.disabled=!friends.length;}
  };

  async function loadChallenges(){
   if(gameLoading||!current())return;
   gameLoading=true;gameStatus.textContent='Cargando tus retos…';
   try{
    const {data,error}=await sb.from('sb_friend_gaming_challenges')
     .select('id,creator_id,invited_id,game_title,target_minutes,starts_on,ends_on,status,created_at')
     .or('creator_id.eq.'+myUser.id+',invited_id.eq.'+myUser.id)
     .order('created_at',{ascending:false}).limit(60);
    if(error)throw error;
    if(!current())return;
    const all=data||[];
    await fetchNames(all.flatMap(ch=>[ch.creator_id,ch.invited_id]));
    const accepted=all.filter(ch=>ch.status==='accepted');
    const syncs=await Promise.all(accepted.map(async ch=>{
     const r=await sb.rpc('sb_sync_friend_challenge_progress',{challenge_key:ch.id});
     return {id:ch.id,error:r.error};
    }));
    if(!current())return;
    const ids=accepted.map(ch=>ch.id);
    let progress=[];
    if(ids.length){
     const r=await sb.from('sb_friend_gaming_challenge_progress')
      .select('challenge_id,user_id,minutes_played,updated_at').in('challenge_id',ids).limit(120);
     if(r.error)throw r.error;
     progress=r.data||[];
    }
    gameList.replaceChildren();
    const errors=syncs.filter(r=>r.error);
    gameStatus.textContent=all.length
     ?all.length+' retos · '+accepted.length+' aceptados'+(errors.length?' · Algunos progresos no se actualizaron.':'')
     :'Todavía no tienes retos. Invita a alguien que sigas.';
    for(const challenge of all){
     const card=el('article','sb-social-card');
     card.append(el('strong','',challenge.game_title+' · '+statusOf[challenge.status]));
     const opponent=challenge.creator_id===myUser.id?challenge.invited_id:challenge.creator_id;
     card.append(el('small','',(challenge.creator_id===myUser.id?'Invitado: ':'Creador: ')+person(opponent)));
     card.append(el('small','','🎯 '+(challenge.target_minutes/60).toFixed(1)+' h por persona · '+challenge.starts_on+' → '+challenge.ends_on));
     if(challenge.status==='accepted'){
      const members=[challenge.creator_id,challenge.invited_id];
      for(const member of members){
       const row=progress.find(p=>p.challenge_id===challenge.id&&p.user_id===member);
       const minutes=row?.minutes_played||0;
       const wrapper=el('div','sb-social-progress-row');
       const copy=el('span','',person(member)+': '+(minutes/60).toFixed(1)+' / '+(challenge.target_minutes/60).toFixed(1)+' h'+(row?'':' · sin actualizar'));
       const bar=el('progress');bar.max=challenge.target_minutes;bar.value=Math.min(minutes,challenge.target_minutes);
       bar.setAttribute('aria-label','Progreso de '+person(member)+': '+minutes+' minutos');
       wrapper.append(copy,bar);card.append(wrapper);
      }
      if(new Date(challenge.ends_on+'T23:59:59').getTime()<Date.now())
       card.append(el('small','','📅 Reto terminado; el progreso es la última sincronización de cada jugador.'));
     }
     const actions=el('div','sb-social-card-actions');
     const statusButton=(label,next)=>{
      const button=el('button','outline-btn mini',label);button.type='button';
      button.onclick=async()=>{
       button.disabled=true;gameStatus.textContent='Actualizando reto…';
       try{
        const {data:{user},error:authError}=await sb.auth.getUser();
        if(authError||user?.id!==myUser.id)throw new Error('La sesión ha cambiado.');
        const {data:changed,error}=await sb.from('sb_friend_gaming_challenges')
         .update({status:next}).eq('id',challenge.id).select('status').single();
        if(error)throw error;
        if(changed.status!==next)throw new Error('No se pudo verificar el cambio.');
        gameStatus.textContent='✅ Reto actualizado.';
       }catch(e){gameStatus.textContent='No se pudo cambiar el estado: '+safeErr(e);}
       finally{button.disabled=false;gameLoading=false;void loadChallenges();}
      };
      actions.append(button);
     };
     if(challenge.status==='pending'&&challenge.invited_id===myUser.id){
      statusButton('✅ Aceptar','accepted');statusButton('⛔ Rechazar','declined');
     }
     if(['pending','accepted'].includes(challenge.status)&&challenge.creator_id===myUser.id)
      statusButton('Cancelar reto','cancelled');
     card.append(actions);gameList.append(card);
    }
   }catch(e){if(current())gameStatus.textContent='No se pudieron cargar los retos: '+safeErr(e);}
   finally{gameLoading=false;}
  }
  gameForm.onsubmit=async event=>{
   event.preventDefault();
   const recipient=gameFriend.value;
   const title=gameName.value.trim().replace(/\s+/g,' ');
   const target=Number(hours.value)*60;
   const days=Number(duration.value);
   if(!friends.some(f=>f.id===recipient)||title.length<1||title.length>120||
     !Number.isInteger(target)||target<30||target>2400||target%30!==0||
     !Number.isInteger(days)||days<1||days>30){
    gameStatus.textContent='Elige un miembro, un videojuego y una meta válida (0,5–40 h y 1–30 días).';return;
   }
   invite.disabled=true;gameStatus.textContent='Enviando invitación…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||user?.id!==myUser.id)throw new Error('La sesión ha cambiado.');
    const {error}=await sb.from('sb_friend_gaming_challenges').insert({
     creator_id:myUser.id,invited_id:recipient,game_title:title,
     target_minutes:target,starts_on:localDate(),ends_on:localDate(days-1)
    });
    if(error)throw error;
    gameName.value='';gameStatus.textContent='✅ Invitación creada. El otro miembro podrá aceptarla desde este centro.';
    await loadChallenges();
   }catch(e){gameStatus.textContent='No se pudo crear el reto: '+safeErr(e);}
   finally{invite.disabled=!friends.length;}
  };
  gameRefresh.onclick=()=>void loadChallenges();
  try{
   const {data:{user},error}=await sb.auth.getUser();
   if(error||!user)throw new Error('Inicia sesión para participar.');
   if(!ownHub(root))return;
   myUser=user;
   await loadMembers();
   await Promise.all([loadRecs(),loadChallenges()]);
  }catch(e){
   if(ownHub(root)){
    recStatus.textContent='No se pudo cargar: '+safeErr(e);
    gameStatus.textContent='No se pudo cargar: '+safeErr(e);
    recSend.disabled=true;invite.disabled=true;
   }
  }
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  const observer=new MutationObserver(()=>{void mount()});
  observer.observe(app,{subtree:true,childList:true});
  window.addEventListener('hashchange',()=>queueMicrotask(()=>void mount()));
  void mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();