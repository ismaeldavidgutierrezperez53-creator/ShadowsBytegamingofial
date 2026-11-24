/* Historial real de victorias y empates de retos aceptados compartidos. */
(() => {
 'use strict';
 const make=(tag,cls,value)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=String(value);
  return el;
 };
 const localDate=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),
  String(date.getDate()).padStart(2,'0')].join('-');
 function previousWeek(){
  const monday=new Date();monday.setHours(12,0,0,0);
  monday.setDate(monday.getDate()-((monday.getDay()+6)%7)-7);
  const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);
  return {start:localDate(monday),end:localDate(sunday)};
 }
 function mount(){
  const root=document.getElementById('sb-anime-gaming-hub');
  if(!root||!root.isConnected||typeof sb==='undefined'||!sb.auth
     ||root.querySelector('#sb-gaming-medal-history'))return;
  const holder=root.querySelector('.sb-ag-extras');if(!holder)return;
  const panel=make('section','sb-ag-panel sb-v5-medal-history');
  panel.id='sb-gaming-medal-history';
  const title=make('h3','','📜 Historial de medallas y victorias');
  const info=make('p','',
   'Consulta los logros de las personas que participan en tus retos aceptados. Solo se muestran resultados de semanas terminadas y sincronizadas por ambos jugadores.');
  const controls=make('div','sb-v5-history-controls');
  const filterLabel=make('label','','Mostrar');
  const filter=make('select');
  for(const [value,label] of [['all','Todas las medallas'],['mine','Mis victorias'],['ties','Empates']]){
   const option=make('option','',label);option.value=value;filter.append(option);
  }
  filterLabel.append(filter);
  const refresh=make('button','outline-btn mini','↻ Actualizar historial');
  refresh.type='button';controls.append(filterLabel,refresh);
  const status=make('p','sb-v3-feedback','Preparando historial…');status.setAttribute('role','status');
  const totalsHeading=make('h4','','🏆 Victorias por miembro');
  const totals=make('div','sb-v5-member-medals');
  const listHeading=make('h4','','📅 Resultados anteriores');
  const list=make('div','sb-v5-medal-list');
  panel.append(title,info,controls,status,totalsHeading,totals,listHeading,list);
  const ranking=root.querySelector('#sb-weekly-friend-ranking');
  if(ranking)ranking.after(panel);
  else holder.append(panel);
  let me=null,medals=[],names=new Map(),loading=false;
  const active=()=>panel.isConnected&&root.isConnected;
  const nameOf=id=>id===me?.id?'Tú':names.get(id)||'Miembro';
  function paint(){
   if(!active())return;
   totals.replaceChildren();list.replaceChildren();
   const grouped=new Map();
   for(const row of medals){
    for(const id of [row.creator_id,row.invited_id]){
     if(!grouped.has(id))grouped.set(id,{id,wins:0,ties:0});
     const record=grouped.get(id);
     if(row.winner_id===id)record.wins++;
     if(row.is_tie)record.ties++;
    }
   }
   const ranked=[...grouped.values()].sort((a,b)=>b.wins-a.wins||b.ties-a.ties);
   if(!ranked.length){
    totals.append(make('p','sb-v3-empty',
     'Todavía no hay medallas guardadas. Al cerrar una semana, los dos amigos deben actualizar su progreso.'));
   }else{
    for(const item of ranked){
     const row=make('div','sb-v5-member-medal-row');
     row.append(make('strong','',nameOf(item.id)));
     row.append(make('span','','🥇 '+item.wins+' victorias · 🤝 '+item.ties+' empates'));
     totals.append(row);
    }
   }
   const shown=medals.filter(m=>filter.value==='all'
    ||filter.value==='mine'&&m.winner_id===me?.id
    ||filter.value==='ties'&&m.is_tie);
   if(!shown.length){
    list.append(make('p','sb-v3-empty',
     medals.length?'No hay medallas que coincidan con el filtro.':'No hay resultados confirmados para mostrar.'));
    return;
   }
   for(const medal of shown.slice(0,80)){
    const card=make('article','sb-v5-medal-entry');
    const heading=make('strong','',medal.is_tie?'🤝 Empate confirmado':'🥇 Victoria de '+nameOf(medal.winner_id));
    const game=make('b','',medal.game_title||'Reto Gaming');
    const week=make('small','','Semana del '+medal.week_start);
    const score=make('span','',
     nameOf(medal.creator_id)+': '+(Number(medal.creator_minutes)/60).toFixed(1)+' h · '+
     nameOf(medal.invited_id)+': '+(Number(medal.invited_minutes)/60).toFixed(1)+' h');
    card.append(heading,game,week,score);
    list.append(card);
   }
  }
  async function load(){
   if(!me||!active()||loading)return;
   loading=true;refresh.disabled=true;status.textContent='Consultando medallas…';
   try{
    const {data:challenges,error:challengesError}=await sb.from('sb_friend_gaming_challenges')
     .select('id,game_title,creator_id,invited_id,starts_on,ends_on')
     .eq('status','accepted')
     .or('creator_id.eq.'+me.id+',invited_id.eq.'+me.id)
     .order('created_at',{ascending:false}).limit(80);
    if(challengesError)throw challengesError;
    const last=previousWeek();
    const lastWeekChallenges=(challenges||[]).filter(c=>
     c.starts_on<=last.end&&c.ends_on>=last.start).slice(0,30);
    // La base de datos calcula exclusivamente las sesiones del usuario conectado.
    await Promise.all(lastWeekChallenges.map(ch=>
     sb.rpc('sb_sync_friend_previous_week_progress',{challenge_key:ch.id}).catch(()=>null)));
    if(!active())return;
    const {data,error}=await sb.from('sb_friend_weekly_medal_history')
     .select('challenge_id,week_start,creator_id,invited_id,winner_id,is_tie,creator_minutes,invited_minutes,awarded_at')
     .or('creator_id.eq.'+me.id+',invited_id.eq.'+me.id)
     .order('week_start',{ascending:false}).limit(180);
    if(error)throw error;
    if(!active())return;
    const known=new Map((challenges||[]).map(ch=>[ch.id,ch.game_title]));
    medals=(data||[]).map(x=>({...x,game_title:known.get(x.challenge_id)||'Reto Gaming'}));
    const ids=[...new Set(medals.flatMap(x=>[x.creator_id,x.invited_id]))];
    names=new Map();
    if(ids.length){
     const {data:profiles,error:profileError}=await sb.from('profiles')
      .select('id,display_name,username').in('id',ids).eq('is_public',true);
     if(profileError)throw profileError;
     names=new Map((profiles||[]).map(x=>[x.id,x.display_name||x.username||'Miembro']));
    }
    paint();status.textContent=medals.length+' resultados confirmados en tu historial compartido.';
   }catch(err){
    if(active())status.textContent='No se pudo cargar el historial: '+(err?.message||'Error');
   }finally{loading=false;refresh.disabled=false;}
  }
  filter.onchange=paint;refresh.onclick=()=>void load();
  (async()=>{
   try{
    const {data:{user},error}=await sb.auth.getUser();
    if(error||!user)throw error||new Error('Inicia sesión');
    if(!active())return;
    me=user;await load();
   }catch(err){
    if(active()){status.textContent='Inicia sesión para consultar el historial.';refresh.disabled=true;}
   }
  })();
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  new MutationObserver(mount).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();