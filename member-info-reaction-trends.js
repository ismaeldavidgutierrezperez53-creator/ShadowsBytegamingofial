/* Gráficas privadas de evolución de reacciones recibidas en Mi Info. */
(() => {
  'use strict';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const create = (tag,cls,text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svgElement = (tag,attributes={},value) => {
    const node = document.createElementNS(SVG_NS,tag);
    for (const [name,val] of Object.entries(attributes)) node.setAttribute(name,String(val));
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const amount = value => Math.max(0,Number(value)||0);
  const countText = value => new Intl.NumberFormat('es-ES').format(amount(value));
  const date = value => new Date(String(value)+'T12:00:00');
  const dayLabel = value => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short'}).format(date(value));
  const monthLabel = value => new Intl.DateTimeFormat('es-ES',{month:'short'}).format(date(value)).replace('.','');
  const fullMonth = value => new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(date(value));

  function mount() {
    if (location.hash.split('?')[0] !== '#/cuenta' || typeof sb === 'undefined') return;
    const stats = document.querySelector('#account-profile .sb-info-stats');
    if (!stats || stats.querySelector('.sb-info-trends')) return;

    const root = create('section','sb-info-trends');
    root.setAttribute('aria-label','Gráficas de evolución de las reacciones recibidas');
    const title = create('h4','sb-info-trends-title','📈 Evolución de reacciones');
    const explanation = create('p','sb-info-trends-explanation',
      'Reacciones nuevas recibidas de otros miembros. Los cambios de emoji y tus propias reacciones no cuentan.');
    const dailyPanel = create('div','sb-info-trend-panel');
    const dailyTitle = create('h5','sb-info-trend-heading','📅 Por día · últimos 30 días');
    const dailyScroller = create('div','sb-info-trend-scroll');
    dailyScroller.setAttribute('tabindex','0');
    dailyScroller.setAttribute('aria-label','Gráfica diaria; desplázate horizontalmente para ver todos los días');
    const dailyChart = create('div','sb-info-trend-daily');
    dailyScroller.append(dailyChart);
    const dailyCaption = create('p','sb-info-trend-caption','');
    dailyPanel.append(dailyTitle,dailyScroller,dailyCaption);

    const monthlyPanel = create('div','sb-info-trend-panel');
    const monthlyTitle = create('h5','sb-info-trend-heading','🗓️ Por mes · últimos 12 meses');
    const monthlyScroller = create('div','sb-info-trend-scroll');
    monthlyScroller.setAttribute('tabindex','0');
    monthlyScroller.setAttribute('aria-label','Gráfica mensual; desplázate horizontalmente para ver todos los meses');
    const monthlyChart = create('div','sb-info-trend-monthly');
    monthlyScroller.append(monthlyChart);
    const monthlyCaption = create('p','sb-info-trend-caption','');
    monthlyPanel.append(monthlyTitle,monthlyScroller,monthlyCaption);

    const values = create('details','sb-info-trend-values');
    const valuesSummary = create('summary',null,'Ver cifras exactas por fecha');
    const valuesContents = create('div','sb-info-trend-value-columns');
    values.append(valuesSummary,valuesContents);

    const status = create('p','sb-info-trends-status','Cargando gráficas…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    root.append(title,explanation,dailyPanel,monthlyPanel,values,status);
    stats.querySelector('.sb-info-stats-status')?.before(root);
    if (!root.isConnected) stats.append(root);

    function makeDaily(rows) {
      dailyChart.replaceChildren();
      const peak = Math.max(1,...rows.map(row=>amount(row.reactions)));
      rows.forEach((row,index)=>{
        const item = create('div','sb-info-trend-day');
        const column = create('div','sb-info-trend-day-column');
        const bar = create('div','sb-info-trend-day-bar');
        const current = amount(row.reactions);
        bar.style.height = current ? Math.max(8,Math.round(current/peak*120))+'px' : '3px';
        if (!current) bar.classList.add('sb-info-trend-empty');
        bar.title = dayLabel(row.period_start)+': '+countText(current)+' reacciones nuevas';
        column.append(bar);
        const label = create('span','sb-info-trend-day-label',
          index%5===0 || index===rows.length-1
            ? new Intl.DateTimeFormat('es-ES',{day:'numeric'}).format(date(row.period_start))
            : '');
        item.append(column,label);
        dailyChart.append(item);
      });
      dailyChart.setAttribute('role','img');
      dailyChart.setAttribute('aria-label',
        'Gráfica de '+rows.length+' días. Total: '+countText(rows.reduce((sum,row)=>sum+amount(row.reactions),0))+' reacciones nuevas.');
      dailyCaption.textContent = 'Últimos 30 días: '+countText(rows.reduce((sum,row)=>sum+amount(row.reactions),0))+
        ' reacciones recibidas. Las barras muestran cada día.';
    }

    function makeMonthly(rows) {
      monthlyChart.replaceChildren();
      const width=760,height=242,left=43,right=22,top=19,bottom=57;
      const chartWidth=width-left-right,chartHeight=height-top-bottom;
      const max = Math.max(1,...rows.map(row=>amount(row.reactions)));
      const x=index=>left + (rows.length<=1 ? chartWidth/2 : index*chartWidth/(rows.length-1));
      const y=value=>top+chartHeight - (amount(value)/max)*chartHeight;
      const svg=svgElement('svg',{viewBox:'0 0 '+width+' '+height,role:'img',
        'aria-label':'Evolución mensual de reacciones recibidas en los últimos 12 meses'});
      const ticks=max===1?[0,1]:[0,Math.ceil(max/2),max];
      [...new Set(ticks)].forEach(tick=>{
        const yy=y(tick);
        svg.append(svgElement('line',{x1:left,y1:yy,x2:width-right,y2:yy,
          stroke:'currentColor','stroke-opacity':'.2','stroke-dasharray':'4 4'}));
        svg.append(svgElement('text',{x:left-10,y:yy+4,'text-anchor':'end',
          fill:'currentColor','font-size':'12'},countText(tick)));
      });
      const points=rows.map((row,index)=>[x(index),y(row.reactions)]);
      if (points.length) {
        const d=points.map(([px,py],index)=>(index?'L':'M')+px.toFixed(2)+' '+py.toFixed(2)).join(' ');
        const path=svgElement('path',{d,stroke:'#d7a1ff','stroke-width':'3.5',
          fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
        svg.append(path);
      }
      for (let index=0;index<rows.length;index++) {
        const row=rows[index],xx=x(index),yy=y(row.reactions);
        const dot=svgElement('circle',{cx:xx,cy:yy,r:5.5,fill:'#e5b9ff',
          stroke:'#38205c','stroke-width':2});
        dot.append(svgElement('title',{},fullMonth(row.period_start)+': '+countText(row.reactions)+' reacciones nuevas'));
        svg.append(dot);
        svg.append(svgElement('text',{x:xx,y:height-27,'text-anchor':'middle',
          fill:'currentColor','font-size':12},monthLabel(row.period_start)));
      }
      monthlyChart.append(svg);
      monthlyCaption.textContent = 'Últimos 12 meses: '+countText(rows.reduce((sum,row)=>sum+amount(row.reactions),0))+
        ' reacciones recibidas. Cada punto representa un mes.';
    }

    function makeDataList(daily,monthly) {
      valuesContents.replaceChildren();
      for (const [heading,rows,label] of [
        ['Por día',daily,row=>dayLabel(row.period_start)],
        ['Por mes',monthly,row=>fullMonth(row.period_start)]
      ]) {
        const section=create('div','sb-info-trend-values-section');
        section.append(create('h6',null,heading));
        const list=create('ul','sb-info-trend-values-list');
        for (const row of rows) {
          const item=create('li');
          item.append(create('span',null,label(row)),create('strong',null,countText(row.reactions)));
          list.append(item);
        }
        section.append(list);
        valuesContents.append(section);
      }
    }

    let busy=false,lastLoaded=0;
    async function load() {
      if (busy || !root.isConnected) return;
      busy=true;
      status.textContent='Actualizando gráficas…';
      try {
        const {data:auth,error:authError}=await sb.auth.getUser();
        if (authError || !auth?.user) throw Error('Inicia sesión para ver las gráficas.');
        const {data,error}=await sb.rpc('get_my_info_reaction_evolution');
        if (error) throw error;
        if (!root.isConnected) return;
        const daily=(data||[]).filter(row=>row.period_type==='daily').sort((a,b)=>a.period_start.localeCompare(b.period_start));
        const monthly=(data||[]).filter(row=>row.period_type==='monthly').sort((a,b)=>a.period_start.localeCompare(b.period_start));
        if (daily.length!==30 || monthly.length!==12) throw Error('Serie de fechas incompleta');
        makeDaily(daily);
        makeMonthly(monthly);
        makeDataList(daily,monthly);
        lastLoaded=Date.now();
        const count=daily.reduce((total,row)=>total+amount(row.reactions),0);
        status.textContent=count===0
          ? 'Todavía no has recibido reacciones nuevas de otros miembros durante los últimos 30 días.'
          : '✅ Gráficas actualizadas.';
      } catch (error) {
        console.warn('Gráficas de Mi Info:',error);
        if (root.isConnected) status.textContent=error?.message?.includes('Inicia sesión')
          ? 'Inicia sesión para consultar las gráficas.'
          : 'No se pudieron cargar las gráficas. Pulsa «Actualizar» para reintentar.';
      } finally {
        busy=false;
      }
    }
    // Compartir el botón de actualización existente con el panel de estadísticas.
    stats.querySelector('.sb-info-stats-reload')?.addEventListener('click',()=>void load());
    window.addEventListener('focus',()=>{
      if (root.isConnected && Date.now()-lastLoaded>30000) void load();
    });
    void load();
  }

  let scheduled=false;
  function schedule() {
    if (scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;mount();});
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
