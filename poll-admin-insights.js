// Estadísticas de administración para las 30 encuestas más recientes.
// Utiliza el RPC existente community_poll_results; no consulta datos personales.
(function(){
 'use strict';
 const countCache=new Map();
 const pendingCounts=new Map();
 const panelState=new WeakMap();
 const intFormat=new Intl.NumberFormat('es-ES');
 function safeNumber(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:0;}
 function getCounts(pollId,refresh=false){
  if(!refresh&&countCache.has(pollId))return Promise.resolve(countCache.get(pollId));
  if(!refresh&&pendingCounts.has(pollId))return pendingCounts.get(pollId);
  const task=Promise.resolve(sb.rpc('community_poll_results',{target_poll:pollId})).then(({data,error})=>{
   if(error)throw new Error(error.message||'Error al consultar votos.');
   if(!Array.isArray(data))throw new Error('La respuesta de votos no tiene el formato esperado.');
   const counts=data.map(item=>({option_id:item.option_id,votes:safeNumber(item.votes)}));
   countCache.set(pollId,counts);
   return counts;
  }).finally(()=>{if(pendingCounts.get(pollId)===task)pendingCounts.delete(pollId);});
  pendingCounts.set(pollId,task);
  return task;
 }
 function totalVotes(rows){return rows.reduce((total,row)=>total+safeNumber(row.votes),0);}
 function mount(panel){
  if(!panel||panel.querySelector('#poll-admin-insights'))return;
  const section=document.createElement('section');
  section.id='poll-admin-insights';
  section.className='poll-admin-insights';
  section.setAttribute('aria-label','Estadísticas de participación en encuestas');
  section.innerHTML=[
   '<div class="poll-admin-insights-head"><div><h3>📈 Estadísticas de participación</h3><p>Resumen de las 30 encuestas más recientes.</p></div><button type="button" class="poll-insights-refresh">↻ Actualizar resultados</button></div>',
   '<div class="poll-insights-stats">',
    '<div class="poll-insights-stat"><span>Encuestas</span><strong data-insight="polls">—</strong></div>',
    '<div class="poll-insights-stat"><span>Abiertas</span><strong data-insight="open">—</strong></div>',
    '<div class="poll-insights-stat"><span>Cerradas</span><strong data-insight="closed">—</strong></div>',
    '<div class="poll-insights-stat"><span>Votos recibidos</span><strong data-insight="votes">—</strong></div>',
    '<div class="poll-insights-stat"><span>Media de votos</span><strong data-insight="average">—</strong></div>',
   '</div>',
   '<p class="poll-insights-note" role="status" aria-live="polite">Los votos se calculan para encuestas publicadas y cerradas; las encuestas en borrador no se incluyen en la media.</p>'
  ].join('');
  panel.querySelector('.poll-admin-header')?.after(section);
  panelState.set(panel,{polls:[],revision:0});
  section.querySelector('.poll-insights-refresh').addEventListener('click',()=>{
   countCache.clear();
   const state=panelState.get(panel);
   if(state)renderSummary(panel,state.polls);
  });
 }
 function setStat(root,key,value){
  const el=root.querySelector('[data-insight="'+key+'"]');
  if(el)el.textContent=value;
 }
 async function renderSummary(panel,polls){
  if(!panel||!panel.isConnected)return;
  mount(panel);
  const state=panelState.get(panel);
  if(!state)return;
  state.polls=polls;
  const revision=++state.revision;
  const section=panel.querySelector('#poll-admin-insights');
  if(!section)return;
  const note=section.querySelector('.poll-insights-note');
  const active=polls.filter(p=>p.status==='published'||p.status==='closed');
  setStat(section,'polls',intFormat.format(polls.length));
  setStat(section,'open',intFormat.format(polls.filter(p=>p.status==='published').length));
  setStat(section,'closed',intFormat.format(polls.filter(p=>p.status==='closed').length));
  setStat(section,'votes',active.length?'Calculando…':'0');
  setStat(section,'average',active.length?'Calculando…':'0');
  note.textContent='Cada voto cuenta como una participación, no como un usuario único. Se cuentan las encuestas publicadas y cerradas de las 30 más recientes.';
  if(!active.length)return;
  const totals=new Array(active.length);
  let cursor=0;let failed=0;
  async function worker(){
   while(cursor<active.length){
    const index=cursor++;
    try{totals[index]=totalVotes(await getCounts(active[index].id));}
    catch(error){failed++;totals[index]=null;}
   }
  }
  await Promise.all(Array.from({length:Math.min(4,active.length)},()=>worker()));
  if(!panel.isConnected||panelState.get(panel)?.revision!==revision)return;
  if(failed){
   setStat(section,'votes','No disponible');
   setStat(section,'average','No disponible');
   note.textContent='No se pudieron consultar los votos de '+failed+' encuesta(s). Actualiza para reintentar.';
   return;
  }
  const sum=totals.reduce((a,b)=>a+b,0);
  setStat(section,'votes',intFormat.format(sum));
  setStat(section,'average',new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(sum/active.length));
 }
 function renderCharts(target,poll,options,counts){
  target.replaceChildren();
  const votes=totalVotes(counts);
  const countByOption=new Map(counts.map(row=>[row.option_id,row.votes]));
  const summary=document.createElement('div');summary.className='poll-results-summary';
  const count=document.createElement('strong');count.textContent=intFormat.format(votes)+' voto'+(votes===1?'':'s');
  const hint=document.createElement('span');hint.textContent=options.length+' opciones · '+(poll.status==='closed'?'Votación cerrada':'Votación abierta');
  summary.append(count,hint);target.append(summary);
  if(!options.length){
   const empty=document.createElement('p');empty.className='poll-admin-empty';
   empty.textContent='Esta encuesta todavía no tiene opciones para mostrar.';target.append(empty);return;
  }
  const chart=document.createElement('div');chart.className='poll-results-chart';
  for(const option of options){
   const amount=countByOption.get(option.id)||0;
   const percentage=votes?100*amount/votes:0;
   const shown=Number(percentage.toFixed(1));
   const row=document.createElement('div');row.className='poll-results-chart-item';
   const heading=document.createElement('div');heading.className='poll-results-chart-label';
   const title=document.createElement('span');title.textContent=option.label;
   const number=document.createElement('strong');number.textContent=shown.toLocaleString('es-ES')+' % · '+intFormat.format(amount)+' votos';
   heading.append(title,number);
   const track=document.createElement('div');track.className='poll-results-chart-track';
   track.setAttribute('role','progressbar');
   track.setAttribute('aria-label',option.label);
   track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
   track.setAttribute('aria-valuenow',String(shown));
   track.setAttribute('aria-valuetext',shown.toLocaleString('es-ES')+' por ciento; '+amount+' votos');
   const bar=document.createElement('div');bar.className='poll-results-chart-fill';
   bar.style.width=percentage+'%';
   track.append(bar);row.append(heading,track);chart.append(row);
  }
  target.append(chart);
  const footer=document.createElement('p');footer.className='poll-results-footnote';
  footer.textContent=votes?'Porcentajes calculados sobre el total de votos de esta encuesta.':'Aún no hay votos. Las barras se llenarán cuando participen miembros.';
  target.append(footer);
 }
 function decorate(row,poll){
  if(!row||row.querySelector('.poll-results-toggle'))return;
  const control=row.querySelector('.poll-admin-item-control');
  if(!control)return;
  const button=document.createElement('button');
  button.type='button';button.className='poll-results-toggle';
  button.textContent='📊 Ver resultados';button.setAttribute('aria-expanded','false');
  const details=document.createElement('div');
  details.className='poll-results-details';details.hidden=true;
  details.id='poll-results-'+String(poll.id).replace(/[^a-zA-Z0-9_-]/g,'');
  button.setAttribute('aria-controls',details.id);
  control.append(button);row.append(details);
  let operation=0;
  button.addEventListener('click',async()=>{
   const open=button.getAttribute('aria-expanded')!=='true';
   const current=++operation;
   button.setAttribute('aria-expanded',String(open));
   button.textContent=open?'Ocultar resultados':'📊 Ver resultados';
   details.hidden=!open;
   if(!open)return;
   details.replaceChildren();
   const loading=document.createElement('p');loading.className='poll-admin-empty';loading.textContent='Cargando gráficos…';details.append(loading);
   if(poll.status==='draft'){
    details.textContent='Esta encuesta está en borrador. Las estadísticas se pueden consultar cuando esté publicada o cerrada.';return;
   }
   try{
    const [counts,optionsResponse]=await Promise.all([
     getCounts(poll.id,true),
     sb.from('community_poll_options').select('id,label').eq('poll_id',poll.id).order('sort_order',{ascending:true})
    ]);
    if(optionsResponse.error)throw new Error(optionsResponse.error.message);
    if(!row.isConnected||current!==operation||details.hidden)return;
    renderCharts(details,poll,optionsResponse.data||[],counts);
   }catch(error){
    if(!row.isConnected||current!==operation)return;
    details.textContent='No se pudieron cargar los resultados: '+(error?.message||'Error de conexión');
   }
  });
 }
 function statusChanged(panel,row,poll){
  countCache.delete(poll.id);
  const details=row?.querySelector('.poll-results-details');
  const button=row?.querySelector('.poll-results-toggle');
  if(details)details.hidden=true;
  if(button){button.setAttribute('aria-expanded','false');button.textContent='📊 Ver resultados';}
  const state=panelState.get(panel);
  if(state)renderSummary(panel,state.polls);
 }
 window.SBPollAdminInsights={mount,decorate,renderSummary,statusChanged};
})();
