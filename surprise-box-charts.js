/* Gráficas de cajas misteriosas: sin dependencias externas, accesibles y adaptables. */
(function(){
 'use strict';
 const SVG='http://www.w3.org/2000/svg';
 const asCount=x=>Math.max(0,Number(x)||0);
 const fmt=n=>asCount(n).toLocaleString('es-ES');
 const e=(tag,cls,txt)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=String(txt);
  return el;
 };
 const item=(title,icon)=>{
  const card=e('section','sb-box-chart');
  const heading=e('h4',null,icon+' '+title);
  const details=e('p','sb-box-chart__detail','Selecciona una barra para consultar sus datos.');
  details.setAttribute('aria-live','polite');
  card.append(heading);
  return {card,heading,details};
 };
 function mount({onBoxSelect}={}){
  const root=e('section','sb-box-charts');
  root.setAttribute('aria-label','Gráficas interactivas de cajas misteriosas');
  const title=e('h3',null,'📈 Gráficas interactivas');
  const intro=e('p','sb-box-charts__help','Selecciona una barra para consultar los valores. En cajas populares, al pulsar una caja se aplica su filtro al historial.');
  const grid=e('div','sb-box-charts__grid');
  const day=item('Aperturas por día','📅');
  day.card.classList.add('sb-box-chart--daily');
  const dayHead=e('div','sb-box-chart__header');
  const daySub=e('small','sb-box-chart__subtitle','');
  const toggle=e('div','sb-box-chart__toggle');
  const barMode=e('button',null,'▥ Barras');
  const lineMode=e('button',null,'⌁ Tendencia');
  for(const b of [barMode,lineMode]){b.type='button';toggle.append(b);}
  dayHead.append(daySub,toggle);
  const dailyView=e('div','sb-box-chart__daily-view');
  dailyView.setAttribute('role','group');
  dailyView.setAttribute('aria-label','Datos diarios de aperturas');
  day.card.append(dayHead,dailyView,day.details);
  const boxes=item('Cajas más populares','🎁');
  boxes.card.classList.add('sb-box-chart--rank');
  const boxNote=e('small','sb-box-chart__subtitle','Popularidad según cajas enviadas; pulsa una para filtrar.');
  const boxList=e('div','sb-box-chart__ranking');
  boxes.card.append(boxNote,boxList,boxes.details);
  const prizes=item('Premios más obtenidos','🏆');
  prizes.card.classList.add('sb-box-chart--rank');
  const prizeNote=e('small','sb-box-chart__subtitle','Solo cuentan los premios de cajas que ya se han abierto.');
  const prizeList=e('div','sb-box-chart__ranking');
  prizes.card.append(prizeNote,prizeList,prizes.details);
  grid.append(day.card,boxes.card,prizes.card);
  const foot=e('p','sb-box-charts__foot','Las gráficas de cajas y premios respetan los filtros de caja y periodo. El filtro «Estado» solo afecta al historial. Las aperturas diarias se agrupan por fecha de apertura en horario de España.');
  root.append(title,intro,grid,foot);
  let currentSummary={};
  let currentDaily=null;
  let mode='bars';
  const say=(el,msg)=>{el.textContent=msg;};
  const displayEmpty=(container,message)=>{
   container.replaceChildren(e('p','sb-box-chart__empty',message));
  };
  const dateText=s=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return String(s||'');
   const [year,month,day]=String(s).split('-').map(Number);
   return new Date(Date.UTC(year,month-1,day,12)).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  };
  function dailySeries(){
   const series=Array.isArray(currentDaily?.series)?currentDaily.series:[];
   return series.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(String(row.date)))
     .map(row=>({date:row.date,opened:asCount(row.opened)}));
  }
  function updateModes(){
   barMode.setAttribute('aria-pressed',String(mode==='bars'));
   lineMode.setAttribute('aria-pressed',String(mode==='line'));
   barMode.classList.toggle('is-active',mode==='bars');
   lineMode.classList.toggle('is-active',mode==='line');
  }
  function drawDaily(){
   const series=dailySeries();
   dailyView.replaceChildren();
   updateModes();
   if(!series.length){
    displayEmpty(dailyView,'Todavía no hay datos diarios disponibles.');
    daySub.textContent='';
    say(day.details,'No hay aperturas registradas para mostrar.');
    return;
   }
   const total=series.reduce((sum,row)=>sum+row.opened,0);
   daySub.textContent=dateText(series[0].date)+' – '+dateText(series[series.length-1].date)+' · '+fmt(total)+' aperturas';
   const detail=(point)=>say(day.details,dateText(point.date)+' · '+fmt(point.opened)+' '+(point.opened===1?'caja abierta':'cajas abiertas'));
   const max=Math.max(1,...series.map(row=>row.opened));
   if(mode==='bars'){
    const scroll=e('div','sb-box-chart__daily-scroll');
    const columns=e('div','sb-box-chart__columns');
    const width=series.length>30?18:series.length>7?25:48;
    columns.style.setProperty('--chart-day-width',width+'px');
    const axis=e('div','sb-box-chart__axis-labels');
    axis.append(e('span',null,'Máximo: '+fmt(max)),e('span',null,'0'));
    for(const point of series){
     const bar=e('button','sb-box-chart__day');
     bar.type='button';
     bar.setAttribute('aria-label',dateText(point.date)+': '+fmt(point.opened)+' aperturas');
     bar.title=dateText(point.date)+' · '+fmt(point.opened)+' aperturas';
     const fill=e('span','sb-box-chart__day-fill');
     fill.style.height=(point.opened?Math.max(5,100*point.opened/max):2)+'%';
     if(!point.opened)bar.classList.add('is-zero');
     const label=e('span','sb-box-chart__day-label',String(point.date).slice(8));
     bar.append(fill,label);
     bar.addEventListener('click',()=>detail(point));
     bar.addEventListener('focus',()=>detail(point));
     bar.addEventListener('pointerenter',()=>detail(point));
     columns.append(bar);
    }
    scroll.append(columns);
    dailyView.append(axis,scroll);
   }else{
    const W=880,H=230,left=36,right=12,top=20,bottom=30;
    const plotW=W-left-right,plotH=H-top-bottom;
    const svg=document.createElementNS(SVG,'svg');
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    svg.setAttribute('role','group');svg.setAttribute('aria-label','Tendencia diaria de aperturas, seleccionable por fecha');
    svg.classList.add('sb-box-chart__line');
    const add=(tag,attrs,parent=svg)=>{
     const el=document.createElementNS(SVG,tag);
     for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
     parent.append(el);return el;
    };
    for(let i=0;i<=4;i++){
     const y=top+i*plotH/4;
     add('line',{x1:left,x2:W-right,y1:y,y2:y,class:'sb-box-chart__gridline'});
     const tick=add('text',{x:left-7,y:y+4,'text-anchor':'end',class:'sb-box-chart__tick'});
     tick.textContent=fmt(Math.round(max*(4-i)/4));
    }
    const step=series.length>1?plotW/(series.length-1):0;
    const points=series.map((p,i)=>({
      ...p,
      x:left+step*i+(series.length===1?plotW/2:0),
      y:top+plotH-(p.opened/max)*plotH
    }));
    if(points.length){
     add('polyline',{points:points.map(p=>p.x+','+p.y).join(' '),class:'sb-box-chart__trend'});
     for(const point of points){
      const circle=add('circle',{cx:point.x,cy:point.y,r:series.length>30?4:6,
       tabindex:0,role:'button','aria-label':dateText(point.date)+': '+fmt(point.opened)+' aperturas',
       class:'sb-box-chart__point'});
      const hint=add('title',{},circle);hint.textContent=dateText(point.date)+' · '+fmt(point.opened);
      circle.addEventListener('pointerenter',()=>detail(point));
      circle.addEventListener('focus',()=>detail(point));
      circle.addEventListener('click',()=>detail(point));
      circle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();detail(point);}});
     }
     for(const point of [points[0],points[points.length-1]]){
      const label=add('text',{x:point.x,y:H-6,'text-anchor':point===points[0]?'start':'end',class:'sb-box-chart__tick'});
      label.textContent=String(point.date).slice(5);
     }
    }
    dailyView.append(svg);
   }
   if(total===0)say(day.details,'Todavía no hay aperturas en el periodo seleccionado. Puedes inspeccionar cada día.');
   else say(day.details,'Selecciona una fecha para conocer el número de aperturas.');
  }
  barMode.addEventListener('click',()=>{mode='bars';drawDaily()});
  lineMode.addEventListener('click',()=>{mode='line';drawDaily()});
  function renderRanking(container,details,entries,metric,max,handleSelect,emptyText){
   container.replaceChildren();
   if(!entries.length){displayEmpty(container,emptyText);say(details,'');return;}
   const maximum=Math.max(1,...entries.map(e=>asCount(e[metric])));
   for(const [index,entry] of entries.entries()){
    const count=asCount(entry[metric]);
    const label=entry.name||entry.tier||'Sin nombre';
    const row=e('button','sb-box-chart__rank-item');
    row.type='button';
    row.setAttribute('aria-label',(index+1)+'. '+label+': '+fmt(count));
    const top=e('span','sb-box-chart__rank-line');
    top.append(e('span','sb-box-chart__rank-name',(index+1)+'. '+label),
      e('strong','sb-box-chart__rank-value',fmt(count)));
    const track=e('span','sb-box-chart__rank-track');
    const fill=e('span','sb-box-chart__rank-fill');
    fill.style.width=(count/maximum*100)+'%';
    track.append(fill);row.append(top,track);
    const report=()=>say(details,handleSelect?label+': '+fmt(entry.sent)+' enviadas y '+fmt(entry.opened)+' abiertas. Pulsa para filtrar.':label+': '+fmt(count)+' aperturas ('+(currentSummary.opened? (count/asCount(currentSummary.opened)*100).toLocaleString('es-ES',{maximumFractionDigits:1}):0)+' % de las aperturas del periodo).');
    row.addEventListener('focus',report);
    row.addEventListener('pointerenter',report);
    row.addEventListener('click',()=>{
     report();
     if(handleSelect)handleSelect(entry.tier);
     else{
      for(const el of container.querySelectorAll('.sb-box-chart__rank-item'))el.classList.remove('is-selected');
      row.classList.add('is-selected');
     }
    });
    container.append(row);
   }
   say(details,handleSelect?'Pulsa en una caja para filtrar las estadísticas.':'Selecciona un premio para ver su proporción.');
  }
  function render(analytics,daily,context={}){
   currentSummary=analytics?.summary||{};
   currentDaily=daily;
   if(daily&&Array.isArray(daily.series))drawDaily();
   else {daySub.textContent='';displayEmpty(dailyView,'No se pudo cargar la gráfica de aperturas por día.');say(day.details,'Puedes seguir consultando las demás estadísticas.');}
   const boxesData=Array.isArray(analytics?.by_box)?analytics.by_box:[];
   const topBoxes=[...boxesData].sort((a,b)=>asCount(b.sent)-asCount(a.sent)).slice(0,8);
   renderRanking(boxList,boxes.details,topBoxes,'sent',null,(tier)=>{
    if(typeof onBoxSelect==='function')onBoxSelect(tier);
   },'Todavía no hay cajas enviadas.');
   const top=Array.isArray(analytics?.top_prizes)?analytics.top_prizes:[];
   renderRanking(prizeList,prizes.details,top,'opens',null,null,'Todavía no hay premios revelados.');
   const implicitRange=context.allTime?'La serie diaria muestra los últimos 30 días aunque el resumen esté en «Todo el historial».':'La serie diaria refleja el periodo seleccionado.';
   foot.textContent=implicitRange+' Las estadísticas por caja y premio usan el filtro de caja y periodo; el filtro «Estado» solo afecta a la tabla. Las fechas de apertura se agrupan en horario de España.';
  }
  function setLoading(){
   for(const target of [dailyView,boxList,prizeList])displayEmpty(target,'Cargando gráfica…');
   for(const target of [day.details,boxes.details,prizes.details])say(target,'');
  }
  function showError(message){
   for(const target of [dailyView,boxList,prizeList])displayEmpty(target,message||'No se pudieron cargar las gráficas.');
  }
  return {element:root,render,setLoading,showError};
 }
 window.SBSurpriseBoxCharts={mount};
})();
