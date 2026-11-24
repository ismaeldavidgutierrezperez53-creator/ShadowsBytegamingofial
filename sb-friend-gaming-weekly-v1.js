/* Clasificación semanal solo de retos que el usuario comparte y han sido aceptados. */
(() => {
 'use strict';
 const node=(tag,klass,value)=>{
  const e=document.createElement(tag);if(klass)e.className=klass;
  if(value!==undefined)e.textContent=String(value);return e;
 };
 function localISO(date){
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 }
 function currentWeek(){
  const d=new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()-((d.getDay()+6)%7));
  const monday=new Date(d),sunday=new Date(d);
  sunday.setDate(sunday.getDate()+6);
  return {monday:localISO(monday),sunday:localISO(sunday)};
 }
 const errorMessage=err=>err?.message||'Error inesperado';
 function mount(){
  const root=document.getElementById('sb-anime-gaming-hub');
  const holder=root?.querySelector('.sb-ag-extras');
  if(!root||!holder||typeof sb==='undefined'||!sb.auth
    ||root.querySelector('#sb-weekly-friend-ranking'))return;
  const panel=node('section','sb-ag-panel sb-v3-week-panel');
  panel.id='sb-weekly-friend-ranking';
  const title=node('h3','','🏆 Clasificación semanal de retos entre amigos');
  const info=node('p','','Participan únicamente los retos que habéis aceptado y que coinciden con esta semana. Cada miembro comparte solo su progreso agregado al abrir o actualizar su centro.');
  const week=node('p','sb-v3-week-dates','');
  const refresh=node('button','outline-btn mini','🔄 Actualizar clasificación');
  refresh.type='button';
  const feedback=node('p','sb-v3-feedback','Preparando clasificación…');
  feedback.setAttribute('role','status');
  const list=node('div','sb-v3-week-list');
  const note=node('small','sb-v3-muted',
   'Puntos: hasta 100 por participante y reto, según minutos jugados esta semana respecto de la meta. No se muestran partidas ni notas privadas. Si un amigo aún no actualiza, su total puede ser antiguo.');
  panel.append(title,info,week,refresh,feedback,list,note);
  const existing=root.querySelector('#sb-social-friend-challenges');
  if(existing)existing.after(panel);else holder.append(panel);
  let me=null,loading=false;
  const isCurrent=()=>panel.isConnected&&root.isConnected;
  const load=async()=>{
   if(loading||!me||!isCurrent())return;
   loading=true;refresh.disabled=true;feedback.textContent='Calculando la clasificación de esta semana…';
   const {monday,sunday}=currentWeek();
   week.textContent='📅 Semana del '+monday+' al '+sunday;
   try{
    const {data:challenges,error}=await sb.from('sb_friend_gaming_challenges')
     .select('id,creator_id,invited_id,game_title,target_minutes,starts_on,ends_on')
     .eq('status','accepted')
     .or('creator_id.eq.'+me.id+',invited_id.eq.'+me.id)
     .lte('starts_on',sunday).gte('ends_on',monday)
     .order('created_at',{ascending:false}).limit(40);
    if(error)throw error;
    if(!isCurrent())return;
    list.replaceChildren();
    if(!challenges?.length){
     feedback.textContent='Todavía no tienes retos aceptados que coincidan con esta semana.';
     list.append(node('p','sb-v3-empty','Invita a un amigo a un reto, pídele que lo acepte y registra partidas del videojuego elegido.'));
     return;
    }
    // La sincronización recalcula solo las sesiones del propio usuario, en Supabase.
    const synced=await Promise.all(challenges.map(ch=>
     sb.rpc('sb_sync_friend_gaming_weekly_progress',{challenge_key:ch.id})
      .then(({error})=>({id:ch.id,error}))
      .catch(error=>({id:ch.id,error}))
    ));
    if(!isCurrent())return;
    const {data:progress,error:progressError}=await sb.from('sb_friend_gaming_weekly_progress')
     .select('challenge_id,user_id,minutes_played,updated_at')
     .eq('week_start',monday)
     .in('challenge_id',challenges.map(ch=>ch.id)).limit(100);
    if(progressError)throw progressError;
    const ids=[...new Set(challenges.flatMap(ch=>[ch.creator_id,ch.invited_id]))];
    const {data:profiles,error:profileError}=await sb.from('profiles')
     .select('id,display_name,username').in('id',ids).eq('is_public',true);
    if(profileError)throw profileError;
    const names=new Map((profiles||[]).map(x=>[x.id,x.display_name||x.username||'Miembro']));
    names.set(me.id,'Tú');
    const rows=new Map(ids.map(id=>[id,{id,points:0,played:0,challenges:0,completed:0,pending:0}]));
    for(const ch of challenges){
     for(const id of [ch.creator_id,ch.invited_id]){
      const r=rows.get(id);
      if(!r)continue;
      const entry=(progress||[]).find(x=>x.challenge_id===ch.id&&x.user_id===id);
      const minutes=Number(entry?.minutes_played)||0;
      const fraction=Math.min(1,minutes/Math.max(1,ch.target_minutes));
      r.points+=Math.round(fraction*100);
      r.played+=minutes;
      r.challenges++;
      if(fraction>=1)r.completed++;
      if(!entry)r.pending++;
     }
    }
    const ranked=[...rows.values()].filter(r=>r.challenges>0)
     .sort((a,b)=>b.points-a.points||b.completed-a.completed||a.id.localeCompare(b.id));
    const failed=synced.filter(x=>x.error).length;
    feedback.textContent=ranked.length+' participantes · '+challenges.length+
     ' retos aceptados'+(failed?' · '+failed+' progresos propios no pudieron actualizarse.':'');
    for(let i=0;i<ranked.length;i++){
     const r=ranked[i];
     const card=node('article','sb-v3-week-card'+(r.id===me.id?' sb-v3-me':''));
     const name=node('strong','',''+(i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':'')+
       (i+1)+'. '+(names.get(r.id)||'Miembro'));
     const points=node('b','',''+r.points+' puntos');
     const meta=node('small','','🎯 '+r.completed+' / '+r.challenges+
       ' metas de reto alcanzadas · ⏱️ '+(r.played/60).toFixed(1)+' h sumadas por reto'+
       (r.pending?' · '+r.pending+' progresos sin sincronizar':''));
     const bar=node('progress');
     bar.max=Math.max(100,r.challenges*100);
     bar.value=r.points;
     bar.setAttribute('aria-label','Progreso de '+(names.get(r.id)||'Miembro')+': '+r.points+' puntos');
     card.append(name,points,meta,bar);
     list.append(card);
    }
   }catch(err){
    if(isCurrent())feedback.textContent='No se pudo cargar la clasificación: '+errorMessage(err);
   }finally{loading=false;refresh.disabled=false;}
  };
  refresh.onclick=()=>void load();
  (async()=>{
   try{
    const {data:{user},error}=await sb.auth.getUser();
    if(error||!user)throw error||new Error('Debes iniciar sesión.');
    if(!isCurrent())return;
    me=user;void load();
   }catch(e){if(isCurrent()){feedback.textContent='Inicia sesión para ver tus retos.';refresh.disabled=true;}}
  })();
 }
 function start(){
  const app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(mount).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>queueMicrotask(mount));
  mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();