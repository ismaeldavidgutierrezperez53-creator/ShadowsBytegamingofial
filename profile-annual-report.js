/* Shadows Byte Gaming Official V2 - Estadísticas anuales privadas con PDF local */
(() => {
  'use strict';

  const make = (tag, klass, content) => {
    const element = document.createElement(tag);
    if (klass) element.className = klass;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const number = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const formatted = value => number(value).toLocaleString('es-ES');
  const safeMonth = month => /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(String(month));
  const monthLabel = month => {
    if (!safeMonth(month)) return 'Mes desconocido';
    return new Date(month + '-15T12:00:00Z')
      .toLocaleDateString('es-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .replace('.', '');
  };
  const shortMonth = month => monthLabel(month).split(' ')[0];
  const change = (nowValue, prevValue) => {
    const now = number(nowValue);
    const prev = number(prevValue);
    if (!prev) return now ? 'Nuevo' : '—';
    const n = (now - prev) / prev * 100;
    return (n > 0 ? '+' : '') + n.toFixed(1).replace('.', ',') + ' %';
  };
  const days = info => Array.isArray(info?.months) ? info.months : [];

  // PDF en dos páginas A4 sin dependencias ni servicios externos.
  function createAnnualPdf(report) {
    const W = 595, H = 842;
    const dark = [0.07, 0.07, 0.16], purple = [0.41, 0.20, 0.68];
    const soft = [0.95, 0.94, 0.985], white = [1, 1, 1];
    const ink = [0.15, 0.14, 0.24], muted = [0.43, 0.41, 0.52];
    const line = [0.85, 0.82, 0.91];
    const rgb = c => c.map(x => x.toFixed(3)).join(' ');
    const latin = value => String(value ?? '').replace(/[–—−]/g, '-')
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/…/g, '...').replace(/[\r\n\t]/g, ' ')
      .replace(/[^\u0020-\u00FF]/g, '?');
    const escaped = value => latin(value).replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const contents = [];
    function page() {
      const ops = [];
      const rect = (x, y, w, h, c) => ops.push(rgb(c) + ' rg ' +
        x.toFixed(2) + ' ' + (H-y-h).toFixed(2) + ' ' +
        w.toFixed(2) + ' ' + h.toFixed(2) + ' re f');
      const txt = (value, x, y, size=10, bold=false, c=ink) => ops.push(
        rgb(c) + ' rg BT /' + (bold?'F2':'F1') + ' ' + size +
        ' Tf 1 0 0 1 ' + x.toFixed(2) + ' ' + (H-y).toFixed(2) +
        ' Tm (' + escaped(value) + ') Tj ET'
      );
      const rule = (x1, y1, x2, y2) => ops.push(rgb(line) +
        ' RG 1 w ' + x1 + ' ' + (H-y1) + ' m ' + x2 + ' ' + (H-y2) + ' l S');
      return {rect,txt,rule,finish(){contents.push(ops.join('\n')+'\n');}};
    }

    const months = days(report);
    const latest = months[11] || {visits:0};
    const prior = months[10] || {visits:0};
    const period = monthLabel(report.from_month) + ' - ' + monthLabel(months[11]?.month);
    const generated = new Date().toLocaleDateString('es-ES');
    const p1 = page();
    p1.rect(0,0,W,119,dark);p1.rect(0,0,8,119,purple);
    p1.txt('SHADOWS BYTE GAMING OFFICIAL V2',38,31,11,true,[0.82,0.69,1]);
    p1.txt('INFORME ANUAL DE VISITAS',38,65,21,true,white);
    p1.txt('Últimos 12 meses: '+period,38,91,11,false,white);
    p1.txt('Generado: '+generated,38,106,9,false,white);

    p1.txt('RESUMEN DE LOS ÚLTIMOS 12 MESES',38,148,12,true,purple);
    const tiles=[
      [38,166,'Visitas registradas',formatted(report.total_visits)],
      [303,166,'Visitantes únicos',formatted(report.unique_visitors)],
      [38,248,'Meses con actividad',formatted(report.months_with_visits)+' / 12'],
      [303,248,'Mes más activo',number(report.peak_visits)
        ? monthLabel(report.peak_month)+' · '+formatted(report.peak_visits)
        : 'Sin actividad']
    ];
    for(const [x,y,label,value] of tiles) {
      p1.rect(x,y,254,72,soft);p1.rect(x,y,4,72,purple);
      p1.txt(label,x+15,y+22,10,false,muted);
      p1.txt(value,x+15,y+52,value.length>19?12:19,true,ink);
    }
    p1.txt('VISITAS POR MES',38,361,12,true,purple);
    const chartLeft=40, chartTop=389, chartBottom=590, chartWidth=515;
    p1.rule(chartLeft,chartBottom,chartLeft+chartWidth,chartBottom);
    const max=Math.max(1,...months.map(m=>number(m.visits)));
    const barW=29, gap=(chartWidth-12*barW)/11;
    months.forEach((m,i)=>{
      const x=chartLeft+i*(barW+gap);
      const n=number(m.visits);
      const height=n?Math.max(6,n/max*171):0;
      if(n)p1.rect(x,chartBottom-height,barW,height,i===11?purple:[0.58,0.40,0.78]);
      p1.txt(formatted(n),x+2,chartBottom-height-7,8,true,ink);
      p1.txt(shortMonth(m.month).slice(0,3),x+2,chartBottom+16,8,false,muted);
    });
    p1.txt('MES MÁS RECIENTE FRENTE AL ANTERIOR',38,645,11,true,purple);
    p1.txt(monthLabel(latest.month)+': '+formatted(latest.visits)+' visitas',38,670,12,true,ink);
    p1.txt(monthLabel(prior.month)+': '+formatted(prior.visits)+' visitas',38,692,11,false,muted);
    p1.txt('Variación: '+change(latest.visits,prior.visits),315,675,12,true,ink);
    p1.rule(38,741,557,741);
    p1.txt('Datos registrados con historial de visitas activo y consentimiento mutuo.',38,766,9,false,muted);
    p1.txt('El mes actual es parcial. No se infieren visitas anteriores al registro.',38,783,9,false,muted);
    p1.txt('Informe privado generado en este navegador',38,811,9,false,muted);
    p1.txt('1 / 2',519,811,9,false,muted);
    p1.finish();

    const p2=page();
    p2.rect(0,0,W,112,dark);p2.rect(0,0,8,112,purple);
    p2.txt('SHADOWS BYTE GAMING OFFICIAL V2',38,30,10,true,[0.82,0.69,1]);
    p2.txt('COMPARACIÓN MES A MES',38,64,20,true,white);
    p2.txt(period,38,90,11,false,white);
    p2.txt('Visitas y visitantes del período anual',38,144,11,false,muted);
    p2.rect(38,164,519,32,purple);
    const col=[48,200,304,411];
    ['MES','VISITAS','VISITANTES','VS. ANTERIOR'].forEach((v,i)=>p2.txt(v,col[i],185,10,true,white));
    months.forEach((m,i)=>{
      const y=199+i*39;
      if(i%2===0)p2.rect(38,y,519,39,soft);
      p2.txt(monthLabel(m.month),col[0],y+25,11,i===11,ink);
      p2.txt(formatted(m.visits),col[1],y+25,11,true,purple);
      p2.txt(formatted(m.visitors),col[2],y+25,11,false,ink);
      p2.txt(i?change(m.visits,months[i-1].visits):'Sin referencia',col[3],y+25,10,false,muted);
    });
    p2.rule(38,691,557,691);
    p2.txt('TOTAL ANUAL: '+formatted(report.total_visits)+' VISITAS',38,721,13,true,purple);
    p2.txt('Personas distintas en el período: '+formatted(report.unique_visitors),38,745,10,true,ink);
    p2.txt('Una persona puede contar en varios meses, pero solo una vez en el total anual.',38,770,9,false,muted);
    p2.txt('Cada mes compara visitas con el mes inmediatamente anterior; el primero no tiene referencia.',38,785,9,false,muted);
    p2.txt('2 / 2',519,811,9,false,muted);
    p2.finish();

    const objects=[
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [5 0 R 6 0 R] /Count 2 >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 7 0 R >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 8 0 R >>',
      '<< /Length '+contents[0].length+' >>\nstream\n'+contents[0]+'endstream',
      '<< /Length '+contents[1].length+' >>\nstream\n'+contents[1]+'endstream'
    ];
    let data='%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
    const offsets=[0];
    objects.forEach((obj,i)=>{
      offsets.push(data.length);
      data+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';
    });
    const xref=data.length;
    data+='xref\n0 9\n0000000000 65535 f \n';
    for(let i=1;i<=8;i++)data+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    data+='trailer\n<< /Root 1 0 R /Size 9 >>\nstartxref\n'+xref+'\n%%EOF\n';
    const bytes=new Uint8Array(data.length);
    for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i)&255;
    return bytes;
  }

  function downloadAnnualPdf(report) {
    const blob=new Blob([createAnnualPdf(report)],{type:'application/pdf'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download='ShadowsByte_Informe_Anual_'+String(report.from_month)+'_'+
      String(report.through_day).slice(0,7)+'.pdf';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

  function mount(statsPanel) {
    if(!statsPanel || statsPanel.querySelector('.sb-views-annual-report') || typeof sb==='undefined')return;
    const card=make('section','sb-views-annual-report');
    card.setAttribute('aria-label','Estadísticas anuales de visitas al perfil');
    card.append(make('h3','','📊 Estadísticas anuales de visitas'));
    const introduction=make('p','sb-views-annual-intro',
      'Evolución de los últimos 12 meses, comparación entre meses e informe anual privado en PDF.');
    card.append(introduction);
    const toolbar=make('div','sb-views-annual-toolbar');
    const refresh=make('button','outline-btn mini','↻ Actualizar año');
    refresh.type='button';
    const pdf=make('button','gradient-btn mini','⬇ Descargar informe anual PDF');
    pdf.type='button';
    pdf.disabled=true;
    toolbar.append(refresh,pdf);
    card.append(toolbar);
    const status=make('p','sb-views-annual-status','Cargando estadísticas anuales…');
    status.setAttribute('role','status');
    card.append(status);
    const metrics=make('div','sb-views-annual-metrics');
    const summaries=[
      ['total_visits','Visitas del período'],
      ['unique_visitors','Visitantes distintos'],
      ['months_with_visits','Meses con actividad'],
      ['peak','Mes de mayor actividad']
    ];
    const values=new Map();
    for(const [key,title] of summaries){
      const item=make('div','sb-views-annual-metric');
      item.append(make('small','',title));
      const value=make('strong','','—');
      values.set(key,value);item.append(value);metrics.append(item);
    }
    card.append(metrics);
    card.append(make('h4','','📈 Visitas por mes'));
    const scroll=make('div','sb-views-annual-scroll');
    const chart=make('div','sb-views-annual-bars');
    chart.setAttribute('role','list');
    chart.setAttribute('aria-label','Gráfico de visitas de los últimos 12 meses');
    scroll.append(chart);card.append(scroll);
    card.append(make('h4','','Comparación entre meses'));
    const tableWrap=make('div','sb-views-annual-table-scroll');
    const table=make('table','sb-views-annual-table');
    const header=make('thead');
    const headRow=make('tr');
    for(const name of ['Mes','Visitas','Visitantes','Cambio vs. anterior'])headRow.append(make('th','',name));
    header.append(headRow);
    const body=make('tbody');table.append(header,body);tableWrap.append(table);
    card.append(tableWrap);
    card.append(make('p','sb-views-annual-footnote',
      'Incluye el mes en curso, que todavía está incompleto. Solo contabiliza visitas registradas con el historial activado por ambas personas. Los PDF se generan en tu navegador, sin enviarlos a servicios externos.'));
    statsPanel.append(card);

    let activeReport=null;
    let requestId=0;
    const historyToggle=statsPanel.closest('.sb-profile-views')?.querySelector('.sb-views-toggle input');
    const reset=message=>{
      activeReport=null;
      pdf.disabled=true;
      chart.replaceChildren();
      body.replaceChildren();
      for(const value of values.values())value.textContent='—';
      status.textContent=message;
    };

    const render=report=>{
      const list=days(report);
      const max=Math.max(1,...list.map(x=>number(x.visits)));
      metrics.hidden=false;scroll.hidden=false;tableWrap.hidden=false;
      values.get('total_visits').textContent=formatted(report.total_visits);
      values.get('unique_visitors').textContent=formatted(report.unique_visitors);
      values.get('months_with_visits').textContent=formatted(report.months_with_visits)+' / 12';
      values.get('peak').textContent=number(report.peak_visits)
        ?monthLabel(report.peak_month)+' · '+formatted(report.peak_visits):'Sin visitas';
      chart.replaceChildren();body.replaceChildren();
      list.forEach((item,i)=>{
        const month=String(item.month);
        const amount=number(item.visits);
        const visitors=number(item.visitors);
        const holder=make('div','sb-views-annual-month');
        holder.setAttribute('role','listitem');
        holder.setAttribute('aria-label',monthLabel(month)+': '+formatted(amount)+
          ' visitas, '+formatted(visitors)+' visitantes');
        holder.title=holder.getAttribute('aria-label');
        const count=make('strong','',formatted(amount));
        const track=make('span','sb-views-annual-track');
        track.setAttribute('aria-hidden','true');
        const bar=make('span','sb-views-annual-fill');
        bar.style.height=amount?Math.max(7,Math.round(amount/max*100))+'%':'0%';
        if(i===11)bar.classList.add('is-latest');
        track.append(bar);
        holder.append(count,track,make('small','',shortMonth(month)));
        chart.append(holder);

        const row=make('tr');
        const comparison=i?change(amount,list[i-1].visits):'Sin referencia';
        for(const text of [monthLabel(month),formatted(amount),formatted(visitors),comparison])
          row.append(make('td','',text));
        body.append(row);
      });
      const first=list[0]?.month,last=list[11]?.month;
      status.textContent='Período: '+monthLabel(first)+' – '+monthLabel(last)+
        '. Informe generado con el historial disponible.';
    };
    async function load(){
      const ticket=++requestId;
      reset('Cargando estadísticas anuales…');
      refresh.disabled=true;
      try {
        const {data,error}=await sb.rpc('get_profile_annual_visits');
        if(!card.isConnected||ticket!==requestId)return;
        if(error)throw error;
        if(!data||data.enabled!==true){
          reset('Activa el historial de visitas para consultar y descargar el informe anual.');
          return;
        }
        const list=days(data);
        if(data.kind!=='rolling_12_months'||list.length!==12||
          list.some(item=>!safeMonth(item.month))||
          !safeMonth(data.from_month)||list[0].month!==data.from_month)throw Error('Datos anuales inesperados');
        activeReport=data;
        render(data);
        pdf.disabled=false;
      }catch(err){
        if(!card.isConnected||ticket!==requestId)return;
        reset('No se pudieron cargar las estadísticas anuales. Pulsa Actualizar año para reintentarlo.');
        console.warn('Error al consultar estadísticas anuales:',err);
      }finally{
        if(card.isConnected&&ticket===requestId)refresh.disabled=false;
      }
    }
    refresh.addEventListener('click',load);
    pdf.addEventListener('click',()=>{
      if(!activeReport||activeReport.enabled!==true||pdf.disabled||historyToggle&&!historyToggle.checked)return;
      try{
        downloadAnnualPdf(activeReport);
        status.textContent='Informe anual PDF descargado en este dispositivo.';
      }catch(err){
        status.textContent='No se pudo generar el PDF anual. Inténtalo otra vez.';
        console.warn('Error al crear PDF anual:',err);
      }
    });
    if(historyToggle)historyToggle.addEventListener('change',()=>{
      requestId++;
      reset('Pulsa Actualizar año después de cambiar la privacidad del historial.');
    });
    load();
  }

  let pending=false;
  function scan(){
    pending=false;
    const account=document.getElementById('account-profile');
    const stats=account?.querySelector('.sb-views-stats-panel');
    if(stats)mount(stats);
  }
  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(scan);
  }
  function init(){
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
