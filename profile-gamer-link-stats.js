/* Shadows Byte Gaming Official V2 — estadísticas privadas de enlaces gamer */
(() => {
 'use strict';
 const platforms={
  twitch:'🟣 Twitch',youtube:'▶️ YouTube',steam:'🎮 Steam',
  discord:'💬 Discord',tiktok:'🎵 TikTok',instagram:'📸 Instagram',
  github:'🧑‍💻 GitHub',kick:'🟢 Kick',x:'✖️ X / Twitter'
 };
 const make=(tag,klass,value)=>{
  const node=document.createElement(tag);
  if(klass)node.className=klass;
  if(value!==undefined)node.textContent=value;
  return node;
 };
 const number=value=>Math.max(0,Number(value)||0).toLocaleString('es-ES');
 const dayLabel=value=>{
  const day=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return '';
  return new Date(day+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC',day:'numeric',month:'short'});
 };
 const growth=(current,previous)=>{
  const a=Number(current)||0,b=Number(previous)||0;
  if(b===0)return a>0?'Sin referencia previa':'Sin cambios';
  const diff=((a-b)/b)*100;
  return (diff>0?'+':'')+diff.toFixed(1).replace('.',',')+' %';
 };

 function mount(host){
  if(host.querySelector('.sbgl-link-analytics'))return;
  const linksPanel=host.querySelector('.sbgl-links');
  if(!linksPanel)return;
  const panel=make('section','profile-panel sbgl-link-analytics');
  panel.setAttribute('aria-label','Estadísticas privadas de los enlaces gamer');
  panel.append(make('h2','','📊 Estadísticas de enlaces gamer'));
  panel.append(make('p','sbgl-stats-help',
   'Consulta los clics registrados de tus enlaces públicos, sin identificar a los visitantes.'));
  const toolbar=make('div','sbgl-stats-toolbar');
  const periods=make('div','sbgl-stats-periods');
  periods.setAttribute('role','group');
  periods.setAttribute('aria-label','Período de las estadísticas de enlaces');
  const buttons=new Map();
  for(const count of [7,30]){
    const button=make('button','outline-btn mini',count+' días');
    button.type='button';
    button.setAttribute('aria-pressed',String(count===7));
    buttons.set(count,button);
    periods.append(button);
  }
  const refresh=make('button','outline-btn mini','↻ Actualizar');
  refresh.type='button';
  toolbar.append(periods,refresh);
  panel.append(toolbar);
  const message=make('p','sbgl-stats-message','Cargando estadísticas…');
  message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  panel.append(message);

  const summary=make('div','sbgl-stats-summary');
  const currentTile=make('div','sbgl-stats-tile');
  currentTile.append(make('span','','👆 Clics del período'));
  const currentValue=make('strong','','—');currentTile.append(currentValue);
  const lifetimeTile=make('div','sbgl-stats-tile');
  lifetimeTile.append(make('span','','📈 Clics registrados en total'));
  const lifetimeValue=make('strong','','—');lifetimeTile.append(lifetimeValue);
  const growthTile=make('div','sbgl-stats-tile');
  growthTile.append(make('span','','📅 Frente al período anterior'));
  const growthValue=make('strong','','—');growthTile.append(growthValue);
  summary.append(currentTile,lifetimeTile,growthTile);panel.append(summary);

  panel.append(make('h3','','📈 Evolución diaria de clics'));
  const scroll=make('div','sbgl-stats-chart-scroll');
  const chart=make('div','sbgl-stats-chart');
  chart.setAttribute('role','list');
  chart.setAttribute('aria-label','Clics diarios por enlaces gamer');
  scroll.append(chart);panel.append(scroll);

  panel.append(make('h3','','🏆 Ranking de enlaces más pulsados'));
  const ranking=make('div','sbgl-stats-ranking');
  ranking.setAttribute('role','list');
  panel.append(ranking);
  panel.append(make('p','sbgl-stats-note',
    'Los datos empiezan a contabilizarse desde la activación de esta función. No se guardan nombres, IP, ni identidades de los visitantes. No se contabilizan tus propios clics. Las cifras pueden variar por bloqueadores, conexiones o clics repetidos; no representan personas únicas. Al eliminar un enlace se elimina también su historial de clics.'));
  linksPanel.after(panel);

  let currentDays=7;
  let request=0;
  const valid=()=>panel.isConnected&&location.hash.split('?')[0]==='#/cuenta';
  function draw(data){
    currentValue.textContent=number(data.clicks);
    lifetimeValue.textContent=number(data.total_clicks);
    growthValue.textContent=growth(data.clicks,data.previous_clicks);
    message.textContent='Período del '+dayLabel(data.from_day)+' al '+dayLabel(data.through_day)+
      ' · Período anterior: '+number(data.previous_clicks)+' clics.';

    const daily=data.daily;
    chart.replaceChildren();
    chart.style.setProperty('--sbgl-analytics-days',String(currentDays));
    const peak=Math.max(1,...daily.map(item=>Number(item.clicks)||0));
    for(const item of daily){
      const value=Math.max(0,Number(item.clicks)||0);
      const column=make('div','sbgl-stats-bar-column');
      column.setAttribute('role','listitem');
      column.setAttribute('aria-label',item.day+': '+number(value)+' clics');
      column.title=item.day+': '+number(value)+' clics';
      const track=make('span','sbgl-stats-bar-track');
      track.setAttribute('aria-hidden','true');
      const bar=make('span','sbgl-stats-bar-fill');
      bar.style.height=value?Math.max(6,Math.round(value/peak*100))+'%':'0%';
      track.append(bar);
      column.append(make('strong','',number(value)),track,make('small','',String(item.day).slice(-2)));
      chart.append(column);
    }
    ranking.replaceChildren();
    const links=data.links||[];
    if(!links.length)ranking.append(make('p','sbgl-stats-empty',
      'Todavía no tienes enlaces configurados. Añade el primero en «Mis enlaces gamer».'));
    const max=Math.max(1,...links.map(item=>Number(item.clicks)||0));
    for(const [index,item] of links.entries()){
      const row=make('div','sbgl-stats-rank-row');
      row.setAttribute('role','listitem');
      const title=make('div','sbgl-stats-rank-title');
      title.append(make('span','sbgl-stats-rank-number',String(index+1)));
      title.append(make('strong','',platforms[item.platform]||'🎮 Plataforma'));
      if(item.is_featured===true)title.append(make('span','sbgl-stats-favorite','⭐ Favorito'));
      if(item.is_public!==true)title.append(make('span','sbgl-stats-hidden','Oculto'));
      const count=make('span','sbgl-stats-rank-count',
        number(item.clicks)+' clics · '+number(item.total_clicks)+' en total');
      const track=make('span','sbgl-stats-rank-track');
      const bar=make('span','sbgl-stats-rank-fill');
      bar.style.width=Math.round((Number(item.clicks)||0)/max*100)+'%';
      track.setAttribute('aria-hidden','true');
      track.append(bar);
      row.append(title,count,track);ranking.append(row);
    }
  }
  async function load(days=currentDays){
    currentDays=days;
    const ticket=++request;
    buttons.forEach((button,count)=>{
      button.setAttribute('aria-pressed',String(count===days));
      button.disabled=true;
    });
    refresh.disabled=true;
    message.textContent='Cargando estadísticas de '+days+' días…';
    try{
      if(typeof sb==='undefined'||!sb.rpc)throw Error('Supabase no disponible');
      const {data:{user},error:authError}=await sb.auth.getUser();
      if(authError||!user)throw Error('Inicia sesión para consultar tus estadísticas.');
      const {data,error}=await sb.rpc('get_my_profile_link_click_stats',{p_days:days});
      if(!valid()||ticket!==request)return;
      if(error)throw error;
      if(!data||data.days!==days||!Array.isArray(data.daily)||data.daily.length!==days||!Array.isArray(data.links))
        throw Error('La respuesta de estadísticas no tiene el formato esperado.');
      draw(data);
    }catch(error){
      if(valid()&&ticket===request)message.textContent='No se pudieron cargar las estadísticas: '+
        String(error.message||'Error desconocido')+'. Pulsa Actualizar para reintentarlo.';
    }finally{
      if(valid()&&ticket===request){
        refresh.disabled=false;
        buttons.forEach(button=>{button.disabled=false;});
      }
    }
  }
  buttons.forEach((button,days)=>button.addEventListener('click',()=>load(days)));
  refresh.addEventListener('click',()=>load());
  const onLinksUpdated=()=>{if(valid())load();};
  window.addEventListener('sb:gamer-links-updated',onLinksUpdated);
  // The entire account DOM is replaced on navigation. Remove the refresh subscription.
  const cleanup=new MutationObserver(()=>{
    if(!panel.isConnected){
      window.removeEventListener('sb:gamer-links-updated',onLinksUpdated);
      cleanup.disconnect();
    }
  });
  cleanup.observe(host.parentElement||host,{childList:true,subtree:true});
  load();
 }
 let scheduled=false;
 function scan(){
   scheduled=false;
   const account=document.getElementById('account-profile');
   if(account?.querySelector('.sbgl-links'))mount(account);
 }
 function schedule(){
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(scan);
 }
 function init(){
   const root=document.getElementById('app');
   if(!root)return;
   new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
   window.addEventListener('hashchange',schedule);
   schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
