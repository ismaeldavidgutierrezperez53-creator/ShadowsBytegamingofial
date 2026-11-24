/* Vitrinas públicas: medallas gaming y premios comunitarios verificados.
   La base de datos solo publica insignias, sin partidas, contrincantes ni datos privados. */
(()=>{
 'use strict';
 const make=(tag,cls,txt)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=String(txt);
  return el;
 };
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const prizes={
  1:'👑 Corona de la Comunidad',
  2:'🌟 Estrella de Plata',
  3:'🏅 Bronce Destacado'
 };
 const formatWeek=date=>{
  if(!date)return 'Sin fecha';
  const d=new Date(date+'T12:00:00Z');
  return Number.isNaN(d.getTime())?date:d.toLocaleDateString('es-ES',
   {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'});
 };
 const formatMonth=date=>{
  if(!date)return 'Mes desconocido';
  const d=new Date(date+'T12:00:00Z');
  return Number.isNaN(d.getTime())?date:d.toLocaleDateString('es-ES',
   {month:'long',year:'numeric',timeZone:'Europe/Madrid'});
 };
 function mount(){
  if(typeof sb==='undefined'||!sb.from||location.hash.split('?')[0]!=='#/perfil')return;
  const root=document.getElementById('public-member-profile');
  const body=root?.querySelector('.public-member-body');
  if(!root||!body||!body.isConnected||body.querySelector('#sb-public-achievement-showcases'))return;
  const profileId=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
  if(!uuid.test(profileId||''))return;

  const wrapper=make('section','sb-v6-public-achievement-showcases');
  wrapper.id='sb-public-achievement-showcases';
  wrapper.setAttribute('aria-label','Vitrinas de logros públicos');

  const medals=make('section','profile-panel sb-v6-profile-medals');
  const medalTitle=make('h2','','🎮 Medallas Gaming ganadas');
  const medalIntro=make('p','',
   'Distintivos de victorias y empates semanales confirmados, sin mostrar los datos de juego de otros miembros.');
  const medalStatus=make('p','sb-v6-showcase-status','Cargando medallas…');
  medalStatus.setAttribute('role','status');
  const medalGrid=make('div','sb-v6-showcase-grid');
  medals.append(medalTitle,medalIntro,medalStatus,medalGrid);

  const monthly=make('section','profile-panel sb-v6-profile-monthly-prizes');
  const monthlyTitle=make('h2','','🏆 Vitrina de premios mensuales');
  const monthlyIntro=make('p','',
   'Premios oficiales obtenidos por publicaciones populares de Comunidad al terminar cada mes.');
  const monthlyStatus=make('p','sb-v6-showcase-status','Cargando premios…');
  monthlyStatus.setAttribute('role','status');
  const prizeGrid=make('div','sb-v6-showcase-grid');
  monthly.append(monthlyTitle,monthlyIntro,monthlyStatus,prizeGrid);
  wrapper.append(medals,monthly);

  const gamerPanel=body.querySelector('.gamer-profile-panel');
  const earned=body.querySelector('.member-anime-badges');
  if(gamerPanel)gamerPanel.after(wrapper);
  else if(earned)earned.after(wrapper);
  else body.append(wrapper);

  const active=()=>wrapper.isConnected&&location.hash.split('?')[0]==='#/perfil'
   &&new URLSearchParams(location.hash.split('?')[1]||'').get('id')===profileId;
  async function load(){
   try{
    const [medalResponse,prizeResponse]=await Promise.all([
     sb.from('sb_profile_gaming_medals')
      .select('id,recipient_id,week_start,medal_kind,awarded_at')
      .eq('recipient_id',profileId).order('week_start',{ascending:false}).limit(100),
     sb.from('sb_monthly_community_post_prizes')
      .select('month_start,place,post_id,author_id,score,awarded_at')
      .eq('author_id',profileId).order('month_start',{ascending:false}).limit(100)
    ]);
    if(!active())return;
    medalGrid.replaceChildren();prizeGrid.replaceChildren();

    if(medalResponse.error){
     medalStatus.textContent='No se pudieron consultar las medallas: '+medalResponse.error.message;
    }else{
     const rows=medalResponse.data||[];
     const wins=rows.filter(x=>x.medal_kind==='champion').length;
     const ties=rows.filter(x=>x.medal_kind==='tie').length;
     medalStatus.textContent='🥇 '+wins+' victorias · 🤝 '+ties+' empates confirmados.';
     if(!rows.length)medalGrid.append(make('p','sb-v6-showcase-empty',
      'Este miembro todavía no tiene medallas Gaming confirmadas.'));
     for(const row of rows.slice(0,20)){
      const card=make('article','sb-v6-showcase-card');
      const label=row.medal_kind==='champion'?'🥇 Campeón semanal':'🤝 Empate semanal';
      card.append(make('strong','',label));
      card.append(make('span','','Semana del '+formatWeek(row.week_start)));
      medalGrid.append(card);
     }
     if(rows.length>20)medalGrid.append(make('p','sb-v6-showcase-more',
      'Se muestran las 20 medallas más recientes.'));
    }
    if(prizeResponse.error){
     monthlyStatus.textContent='No se pudieron consultar los premios: '+prizeResponse.error.message;
    }else{
     const awards=prizeResponse.data||[];
     monthlyStatus.textContent=awards.length+' premios mensuales oficiales.';
     if(!awards.length)prizeGrid.append(make('p','sb-v6-showcase-empty',
      'Este miembro todavía no ha recibido premios mensuales confirmados.'));
     for(const row of awards){
      const card=make('article','sb-v6-showcase-card sb-v6-prize-card');
      card.append(make('strong','',prizes[row.place]||'🏆 Premio mensual'));
      card.append(make('span','',formatMonth(row.month_start)+' · '+row.score+' puntos'));
      const link=make('a','outline-btn mini','Ver publicación premiada');
      link.href='#/comunidad?post='+encodeURIComponent(row.post_id);
      card.append(link);prizeGrid.append(card);
     }
    }
   }catch(err){
    if(!active())return;
    medalStatus.textContent='No se pudieron cargar las vitrinas.';
    monthlyStatus.textContent='Revisa la conexión e inténtalo de nuevo.';
   }
  }
  void load();
 }
 function start(){
  const app=document.getElementById('app');if(!app)return;
  let scheduled=false;
  const schedule=()=>{
   if(scheduled)return;scheduled=true;
   queueMicrotask(()=>{scheduled=false;mount();});
  };
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();