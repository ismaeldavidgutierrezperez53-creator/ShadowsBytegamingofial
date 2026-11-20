/* Shadows Byte Gaming Official V2 — analítica agregada y panel de administración */
(() => {
  'use strict';

  const sbClient = () => typeof sb !== 'undefined' ? sb : null;
  const make = (tag, className, label) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  };
  const fmt = value => {
    const n = Number(value);
    return (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0).toLocaleString('es-ES');
  };
  const routeSection = () => {
    const path = (location.hash.slice(1) || '/').split('?')[0].replace(/\/+$/,'') || '/';
    const names = {
      '/':'inicio', '/anime':'anime', '/manga':'manga', '/manhwa':'manhwa',
      '/gaming':'gaming', '/noticias':'noticias', '/waifu-husbando':'waifu-husbando',
      '/pokedex':'pokedex', '/one-piece':'one-piece', '/comunidad':'comunidad',
      '/miembros':'miembros', '/cartelera':'cartelera', '/eventos':'eventos',
      '/encuestas':'encuestas', '/favoritos':'favoritos', '/logros':'logros',
      '/tienda':'tienda', '/regalos':'regalos', '/cuenta':'cuenta',
      '/mensajes':'mensajes', '/notificaciones':'notificaciones', '/perfil':'perfil',
      '/admin':'admin', '/contacto':'contacto', '/no-molestar':'no-molestar',
      '/auth':'auth', '/forgot-password':'recuperar-clave',
      '/reset-password':'recuperar-clave'
    };
    return names[path] || 'otras';
  };
  // No cookies, IPs, URL parameters, emails or browser identifiers are logged.
  // Respeta las señales de privacidad del navegador.
  const allowedToTrack = () => navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1';
  let lastRoute = '';
  let lastEventAt = 0;
  async function registerPageView() {
    if (!allowedToTrack()) return;
    const client = sbClient();
    if (!client) return;
    const section = routeSection();
    const now = Date.now();
    if (lastRoute === section && now - lastEventAt < 10000) return;
    lastRoute = section;
    lastEventAt = now;
    try {
      const { error } = await client.rpc('record_site_section_view', { p_section: section });
      if (error) console.debug('Registro de visitas no disponible:', error.message);
    } catch (error) {
      console.debug('No se pudo registrar una visita a sección:', error);
    }
  }

  const sectionTitles = {
    'inicio':'🏠 Inicio', 'anime':'🎌 Anime', 'manga':'📖 Manga',
    'manhwa':'📚 Manhwa', 'gaming':'🎮 Gaming', 'noticias':'📰 Noticias',
    'waifu-husbando':'💜 Waifu / Husbando', 'pokedex':'⚡ Pokédex',
    'one-piece':'🏴‍☠️ One Piece', 'comunidad':'💬 Comunidad',
    'miembros':'👥 Miembros', 'cartelera':'🎬 Cartelera',
    'eventos':'📆 Eventos', 'encuestas':'📊 Encuestas',
    'favoritos':'❤️ Favoritos', 'logros':'🏆 Logros',
    'tienda':'🛍️ Tienda', 'regalos':'🎁 Regalos',
    'cuenta':'👤 Mi cuenta', 'mensajes':'✉️ Mensajes',
    'notificaciones':'🔔 Notificaciones', 'perfil':'👤 Perfil público',
    'admin':'🛡️ Administración', 'contacto':'📩 Contacto',
    'no-molestar':'🌙 No molestar', 'auth':'🔑 Acceso',
    'recuperar-clave':'🔐 Recuperación', 'otras':'✨ Otras'
  };


  const dateLabel = date => {
    if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(date)))return '';
    return new Date(date+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC',day:'numeric',month:'short'});
  };
  const change = (current,previous) => {
    const a=Number(current)||0,b=Number(previous)||0;
    if(b===0)return a>0?'Sin referencia previa':'Sin cambios';
    const variation=(a-b)/b*100;
    return (variation>0?'+':'')+variation.toFixed(1).replace('.',',')+' %';
  };
  const buckets = (report,groupSize) => {
    const list=report.daily||[],items=[];
    for(let i=0;i<list.length;i+=groupSize) {
      const slice=list.slice(i,i+groupSize);
      const sum=key=>slice.reduce((a,x)=>a+(Number(x[key])||0),0);
      items.push({from:slice[0].day,to:slice[slice.length-1].day,views:sum('views'),registrations:sum('registrations')});
    }
    return items;
  };
  function createAdminPdf(data) {
    // PDF A4 autocontenido. No servicios de terceros ni dependencias externas.
    const W=595,H=842;
    const palette={dark:[0.065,0.058,0.14],violet:[0.43,0.20,0.70],bright:[0.73,0.46,0.94],
      light:[0.96,0.94,0.99],white:[1,1,1],ink:[0.14,0.12,0.24],muted:[0.41,0.39,0.52]};
    const rgb=c=>c.map(x=>x.toFixed(3)).join(' ');
    const encode=value=>String(value??'').replace(/[\r\n\t]/g,' ').replace(/[—–−]/g,'-')
      .replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...')
      .replace(/[^\u0020-\u00FF]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
    const contents=[];
    function page() {
      const ops=[];
      const rect=(x,y,w,h,c)=>ops.push(rgb(c)+' rg '+x.toFixed(2)+' '+(H-y-h).toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');
      const text=(value,x,y,size=10,bold=false,c=palette.ink)=>ops.push(
        rgb(c)+' rg BT /'+(bold?'F2':'F1')+' '+size+
        ' Tf 1 0 0 1 '+x.toFixed(2)+' '+(H-y).toFixed(2)+' Tm ('+encode(value)+') Tj ET'
      );
      const finish=()=>contents.push(ops.join('\n')+'\n');
      return {rect,text,finish};
    }
    const fmtInt=value=>fmt(value);
    const dateRange=dateLabel(data.from_day)+' - '+dateLabel(data.through_day);
    const total=Number(data.current_views)||0,prev=Number(data.previous_views)||0;
    const signups=Number(data.current_registrations)||0,previousSignups=Number(data.previous_registrations)||0;
    const groupSize=data.days===7?1:(data.days===30?5:10);
    const blocks=buckets(data,groupSize);

    const cover=page();
    cover.rect(0,0,W,122,palette.dark);cover.rect(0,0,8,122,palette.violet);
    cover.text('SHADOWS BYTE GAMING OFFICIAL V2',38,31,11,true,palette.bright);
    cover.text('ESTADISTICAS DE ADMINISTRACION',38,63,19,true,palette.white);
    cover.text(String(data.days)+' dias: '+dateRange,38,87,11,false,palette.white);
    cover.text('Informe privado  |  '+new Date().toLocaleDateString('es-ES'),38,105,10,false,palette.white);

    const tiles=[
      [38,155,'Visitas del periodo',fmtInt(total)],
      [303,155,'Variacion de visitas',change(total,prev)],
      [38,232,'Miembros activos',fmtInt(data.active_members)],
      [303,232,'Nuevos registros',fmtInt(signups)],
      [38,309,'Variacion de registros',change(signups,previousSignups)],
      [303,309,'Miembros registrados',fmtInt(data.registered_total)]
    ];
    for(const [x,y,label,value] of tiles){
      cover.rect(x,y,254,67,palette.light);cover.rect(x,y,4,67,palette.violet);
      cover.text(label,x+13,y+19,10,false,palette.muted);
      cover.text(value,x+13,y+47,value.length>19?12:19,true,palette.ink);
    }

    const renderBars=(title,key,startY,maxBarHeight)=>{
      cover.text(title,38,startY,12,true,palette.violet);
      const top=startY+24,bottom=top+maxBarHeight;
      cover.rect(38,bottom,519,1,palette.muted);
      const max=Math.max(1,...blocks.map(x=>Number(x[key])||0));
      const available=511,cell=available/Math.max(1,blocks.length),w=Math.min(41,cell*0.56);
      blocks.forEach((v,i)=>{
        const n=Number(v[key])||0;
        const height=n?Math.max(5,n/max*(maxBarHeight-27)):0;
        const x=42+i*cell+(cell-w)/2;
        if(height)cover.rect(x,bottom-height,w,height,i===blocks.length-1?palette.violet:palette.bright);
        cover.text(fmtInt(n),x,bottom-height-8,7,true,palette.ink);
        cover.text(dateLabel(v.from).split(' ')[0],x,bottom+12,8,false,palette.muted);
      });
    };
    renderBars('EVOLUCION DE VISITAS', 'views',412,112);
    renderBars('NUEVOS REGISTROS', 'registrations',580,105);
    cover.text('Comparacion con los '+data.days+' dias anteriores',38,741,10,true,palette.ink);
    cover.text('Visitas anteriores: '+fmtInt(prev)+' | Registros anteriores: '+fmtInt(previousSignups),38,760,10,false,palette.muted);
    cover.text('El historial de visitas comienza en la fecha de activacion del seguimiento.',38,783,9,false,palette.muted);
    cover.text('1 / 2',519,809,9,false,palette.muted);
    cover.finish();

    const detail=page();
    detail.rect(0,0,W,114,palette.dark);detail.rect(0,0,8,114,palette.violet);
    detail.text('SHADOWS BYTE GAMING OFFICIAL V2',38,30,10,true,palette.bright);
    detail.text('DETALLE Y CRECIMIENTO',38,65,21,true,palette.white);
    detail.text('Periodo de '+data.days+' dias: '+dateRange,38,90,11,false,palette.white);
    detail.text('TABLA DE EVOLUCION (BLOQUES DE '+groupSize+' DIAS)',38,144,12,true,palette.violet);
    detail.rect(38,158,519,30,palette.violet);
    const cols=[47,229,355];
    ['PERIODO','VISITAS','REGISTROS'].forEach((v,i)=>detail.text(v,cols[i],177,10,true,palette.white));
    const rowHeight=27;
    blocks.forEach((item,i)=>{
      const y=191+i*rowHeight;
      if(i%2===0)detail.rect(38,y,519,rowHeight,palette.light);
      detail.text(dateLabel(item.from)+' - '+dateLabel(item.to),cols[0],y+18,9,false,palette.ink);
      detail.text(fmtInt(item.views),cols[1],y+18,10,true,palette.violet);
      detail.text(fmtInt(item.registrations),cols[2],y+18,10,false,palette.ink);
    });
    const sectionTop=191+blocks.length*rowHeight+22;
    detail.text('SECCIONES MAS VISITADAS',38,sectionTop,12,true,palette.violet);
    const tops=(Array.isArray(data.top_sections)?data.top_sections:[]).slice(0,12);
    const availableHeight=777-sectionTop-26;
    const step=Math.min(24,Math.floor(availableHeight/Math.max(1,tops.length)));
    tops.forEach((entry,i)=>{
      const y=sectionTop+19+i*step;
      const name=(sectionTitles[entry.section]||entry.section||'Otras')
        .replace(/[^\u0020-\u00FF]/g,'').slice(0,40);
      detail.text((i+1)+'. '+name,43,y,9,false,palette.ink);
      detail.text(fmtInt(entry.views),488,y,10,true,palette.violet);
    });
    if(!tops.length)detail.text('Sin visitas registradas en este periodo.',43,sectionTop+26,10,false,palette.muted);
    detail.text('Estadisticas agregadas. Solo accesibles por administradores.',38,794,9,false,palette.muted);
    detail.text('2 / 2',519,809,9,false,palette.muted);
    detail.finish();

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
    let pdf='%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
    const offsets=[0];
    objects.forEach((value,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+value+'\nendobj\n';});
    const xref=pdf.length;
    pdf+='xref\n0 9\n0000000000 65535 f \n';
    for(let i=1;i<=8;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    pdf+='trailer\n<< /Root 1 0 R /Size 9 >>\nstartxref\n'+xref+'\n%%EOF\n';
    const bytes=new Uint8Array(pdf.length);
    for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
    return bytes;
  }

  function downloadReport(data) {
    const bytes=createAdminPdf(data);
    const blob=new Blob([bytes],{type:'application/pdf'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='ShadowsByte_Administracion_'+data.days+'dias_'+data.through_day+'.pdf';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

  function mountAdmin(dashboard) {
    if (!dashboard || dashboard.querySelector('.sb-site-analytics')) return;
    const panel=make('section','admin-panel sb-site-analytics');
    panel.setAttribute('aria-label','Estadísticas privadas de la web');
    const heading=make('div','sb-site-analytics-heading');
    const titles=make('div');
    titles.append(make('span','admin-kicker','ANALÍTICA DE LA WEB'),
      make('h2','','📊 Estadísticas para administradores'),
      make('p','','Visitas, miembros activos y registros, con filtros y comparaciones.'));
    const refresh=make('button','admin-secondary','↻ Actualizar estadísticas');
    refresh.type='button';
    heading.append(titles,refresh);
    panel.append(heading);

    const controls=make('div','sb-site-analytics-controls');
    const label=make('strong','','Período:');
    const selector=make('div','sb-site-analytics-periods');
    selector.setAttribute('role','group');
    selector.setAttribute('aria-label','Elegir período de estadísticas');
    const buttons=new Map();
    for(const days of [7,30,90]){
      const button=make('button','admin-secondary',days+' días');
      button.type='button';
      button.setAttribute('aria-pressed',String(days===30));
      selector.append(button);
      buttons.set(days,button);
    }
    const exportButton=make('button','gradient-btn mini sb-site-analytics-pdf','⬇ Descargar estadísticas PDF');
    exportButton.disabled=true;
    exportButton.type='button';
    controls.append(label,selector,exportButton);
    panel.append(controls);

    const status=make('p','sb-site-analytics-status','Cargando estadísticas…');
    status.setAttribute('role','status');
    panel.append(status);

    const metrics=make('div','sb-site-analytics-metrics');
    const fields=[
      ['current_views','Visitas del período','👁️'],
      ['views_change','Crecimiento de visitas','📈'],
      ['active_members','Miembros activos','🟢'],
      ['current_registrations','Nuevos registros','🆕'],
      ['registrations_change','Crecimiento de registros','📊'],
      ['registered_total','Miembros registrados','👥']
    ];
    const values=new Map();
    for(const [key,name,emoji] of fields){
      const tile=make('div','sb-site-analytics-tile');
      tile.append(make('span','sb-site-analytics-label',emoji+' '+name));
      const number=make('strong','','—');
      tile.append(number);metrics.append(tile);values.set(key,number);
    }
    panel.append(metrics);
    const compare=make('p','sb-site-analytics-comparison','Comparando períodos de la misma duración.');
    panel.append(compare);

    const charts=[
      {key:'views',title:'📈 Gráfico de visitas',description:'Vistas de página registradas por día',node:null},
      {key:'registrations',title:'🆕 Gráfico de nuevos registros',description:'Cuentas nuevas registradas por día',node:null}
    ];
    for(const config of charts){
      panel.append(make('h3','sb-site-analytics-graph-title',config.title));
      const scroll=make('div','sb-site-analytics-scroll');
      const chart=make('div','sb-site-analytics-bars');
      chart.setAttribute('role','list');
      chart.setAttribute('aria-label',config.description);
      config.node=chart;scroll.append(chart);panel.append(scroll);
    }
    const topTitle=make('h3','','🔥 Secciones más visitadas');
    const list=make('div','sb-site-analytics-top');
    list.setAttribute('role','list');
    panel.append(topTitle,list);
    panel.append(make('p','sb-site-analytics-disclaimer',
      'Cada visita es una vista de página, no una persona distinta. La actividad de miembros se calcula con cuentas que navegaron durante el período. Los datos de visitas empiezan con la activación del seguimiento, y los registros proceden de Supabase. El informe PDF se genera en tu navegador, sin subirlo a otro servicio.'));

    const overview=dashboard.querySelector('#admin-overview')?.closest('.admin-panel');
    if(overview)overview.after(panel);
    else dashboard.querySelector('.admin-welcome')?.after(panel);

    let revision=0;
    let currentDays=30;
    let dataForExport=null;
    const render=(data)=>{
      values.get('current_views').textContent=fmt(data.current_views);
      values.get('views_change').textContent=change(data.current_views,data.previous_views);
      values.get('active_members').textContent=fmt(data.active_members);
      values.get('current_registrations').textContent=fmt(data.current_registrations);
      values.get('registrations_change').textContent=change(data.current_registrations,data.previous_registrations);
      values.get('registered_total').textContent=fmt(data.registered_total);
      compare.textContent='Visitas: '+fmt(data.current_views)+' frente a '+fmt(data.previous_views)+
        ' · Registros: '+fmt(data.current_registrations)+' frente a '+fmt(data.previous_registrations)+
        ' · Miembros activos antes: '+fmt(data.previous_active_members)+
        '. Comparación con los '+data.days+' días anteriores.';
      for(const {key,node} of charts){
        node.replaceChildren();
        const days=data.daily;
        const max=Math.max(1,...days.map(x=>Number(x[key])||0));
        node.style.setProperty('--sb-analytics-days',String(data.days));
        for(const item of days){
          const date=String(item.day);
          const count=Math.max(0,Math.floor(Number(item[key])||0));
          const column=make('div','sb-site-analytics-column');
          column.setAttribute('role','listitem');
          column.setAttribute('aria-label',date+': '+fmt(count)+(key==='views'?' visitas':' registros'));
          column.title=column.getAttribute('aria-label');
          const track=make('span','sb-site-analytics-track');
          track.setAttribute('aria-hidden','true');
          const bar=make('span','sb-site-analytics-fill'+(key==='registrations'?' sb-site-analytics-signup-bar':''));
          bar.style.height=count?Math.max(7,Math.round(count/max*100))+'%':'0%';
          track.append(bar);
          column.append(make('strong','',fmt(count)),track,make('small','',date.slice(-2)));
          node.append(column);
        }
      }
      list.replaceChildren();
      if(!data.top_sections.length)list.append(make('p','sb-site-analytics-empty','Sin visitas registradas en este período.'));
      const max=Math.max(1,...data.top_sections.map(x=>Number(x.views)||0));
      for(const item of data.top_sections){
        const row=make('div','sb-site-analytics-section');
        row.setAttribute('role','listitem');
        const title=make('span','',sectionTitles[item.section]||'✨ Otra sección');
        const count=make('strong','',fmt(item.views));
        const track=make('span','sb-site-analytics-section-track');
        track.setAttribute('aria-hidden','true');
        const fill=make('span','sb-site-analytics-section-fill');
        fill.style.width=Math.max(0,Math.round((Number(item.views)||0)/max*100))+'%';
        track.append(fill);row.append(title,count,track);list.append(row);
      }
      status.textContent=(data.tracking_since
        ?'Visitas disponibles desde '+new Date(data.tracking_since+'T12:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC'})
        :'El seguimiento de visitas aún no tiene registros')+
        ' · Período: '+dateLabel(data.from_day)+' al '+dateLabel(data.through_day)+'.';
    };

    async function load(days=currentDays){
      currentDays=days;
      const ticket=++revision;
      dataForExport=null;
      exportButton.disabled=true;
      refresh.disabled=true;
      buttons.forEach((button,count)=>button.setAttribute('aria-pressed',String(count===days)));
      status.textContent='Cargando '+days+' días…';
      try{
        const client=sbClient();
        if(!client)throw Error('Supabase no disponible');
        const {data:{user},error:userError}=await client.auth.getUser();
        if(userError||!user||user.app_metadata?.role!=='admin')throw Error('Acceso exclusivo para administradores');
        const {data,error}=await client.rpc('get_site_admin_analytics_range',{p_days:days});
        if(!panel.isConnected||ticket!==revision)return;
        if(error)throw error;
        if(!data||data.days!==days||!Array.isArray(data.daily)||data.daily.length!==days||
          !Array.isArray(data.top_sections))throw Error('Datos inesperados');
        render(data);
        dataForExport=data;
        exportButton.disabled=false;
      }catch(error){
        if(!panel.isConnected||ticket!==revision)return;
        status.textContent='No se pudieron cargar las métricas: '+String(error.message||'error inesperado')+
          '. Pulsa Actualizar estadísticas para reintentarlo.';
      }finally{
        if(panel.isConnected&&ticket===revision)refresh.disabled=false;
      }
    }
    refresh.addEventListener('click',()=>load());
    buttons.forEach((button,days)=>button.addEventListener('click',()=>load(days)));
    exportButton.addEventListener('click',()=>{
      if(!dataForExport||exportButton.disabled||currentDays!==dataForExport.days)return;
      try{
        downloadReport(dataForExport);
        status.textContent='PDF de '+currentDays+' días descargado en este dispositivo.';
      }catch(error){
        console.warn('Error generando informe PDF de administración:',error);
        status.textContent='No se pudo generar el PDF. Inténtalo de nuevo.';
      }
    });
    load();
  }

  let scheduled = false;
  function scan() {
    scheduled=false;
    const dashboard=document.querySelector('#admin-root .admin-dashboard');
    if(dashboard) mountAdmin(dashboard);
  }
  function schedule() {
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(scan);
  }
  function init() {
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>{
      registerPageView();
      schedule();
    });
    registerPageView();
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
