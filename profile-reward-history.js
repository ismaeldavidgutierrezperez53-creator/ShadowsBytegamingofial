/* Shadows Byte Gaming Official V2 — historial privado de puntos y recompensas */
(() => {
  'use strict';

  const badgeNames={
    link_promising_10:'🥉 Enlace Prometedor',
    link_creator_50:'🥈 Creador Destacado',
    link_star_100:'🥇 Estrella Gamer',
    link_legend_500:'💎 Leyenda de la Comunidad'
  };
  const types={
    badge:{category:'badge',icon:'🏆',name:'Insignia desbloqueada',desc:'Premio por enlaces gamer'},
    welcome:{category:'reward',icon:'🎉',name:'Recompensa de bienvenida',desc:'Bonificación por unirse'},
    level:{category:'reward',icon:'🌟',name:'Premio por subir de nivel',desc:'Progresión de la comunidad'},
    monthly_box:{category:'reward',icon:'📦',name:'Premio mensual de cajas',desc:'Ranking de cajas misteriosas'},
    daily:{category:'reward',icon:'📅',name:'Recompensa diaria',desc:'XP y bonificación diaria'},
    mission:{category:'reward',icon:'🎯',name:'Misión completada',desc:'Recompensas de misiones'},
    chest:{category:'reward',icon:'🎁',name:'Cofre de recompensas',desc:'Premio de cofre'},
    gift_milestone:{category:'reward',icon:'🎊',name:'Hito de cajas abiertas',desc:'Bonificación por cajas recibidas'},
    post:{category:'activity',icon:'📝',name:'Publicación en la comunidad',desc:'Puntos por publicación'},
    comment:{category:'activity',icon:'💬',name:'Comentario en la comunidad',desc:'Puntos por comentario'},
    like:{category:'activity',icon:'❤️',name:'Me gusta',desc:'Puntos por interacción'},
    favorite:{category:'activity',icon:'⭐',name:'Favorito del catálogo',desc:'Puntos por favorito'},
    poll:{category:'activity',icon:'🗳️',name:'Voto en encuesta',desc:'Puntos por participación'},
    shop_purchase:{category:'spend',icon:'🛒',name:'Compra en la tienda',desc:'Puntos utilizados'},
    gift_sent:{category:'spend',icon:'🎁',name:'Regalo enviado',desc:'Puntos utilizados'}
  };
  const filters=[
    {key:'all',label:'Todos'},
    {key:'badge',label:'🏆 Insignias'},
    {key:'reward',label:'🎁 Premios'},
    {key:'activity',label:'🎮 Actividad'},
    {key:'spend',label:'🛍️ Gastos'}
  ];
  const formatter=new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
  const number=x=>formatter.format(Math.max(0,Number(x)||0));
  const money=x=>formatter.format(Math.abs(Number(x)||0));
  const make=(tag,cls,value)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=value;
    return el;
  };
  const dateLabel=raw=>{
    const d=new Date(raw);
    return Number.isFinite(d.getTime())
      ?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})
      :'Fecha no disponible';
  };
  const dateTime=raw=>{
    const d=new Date(raw);
    return Number.isFinite(d.getTime())?d.getTime():0;
  };
  function identify(item){
    const spec=types[item.kind]||{category:'other',icon:'✨',name:'Movimiento',desc:'Puntos de la comunidad'};
    let name=spec.name;
    if(item.kind==='badge')name=badgeNames[item.ref]||spec.name;
    else if(item.kind==='level' && /^\d+$/.test(String(item.ref||'')))
      name='🌟 Recompensa por nivel '+item.ref;
    else if(item.kind==='shop_purchase'&&item.detail)
      name='🛒 '+String(item.detail).slice(0,110);
    else if(item.kind==='gift_sent'&&item.detail)
      name='🎁 Regalo: '+String(item.detail).slice(0,110);
    return {...spec,name};
  }

  function mount(host){
    if(host.querySelector('.sb-reward-history'))return;
    const anchor=host.querySelector('.sbv-editor')||host.querySelector('.sbp-identity-card');
    if(!anchor)return;
    const panel=make('section','profile-panel sb-reward-history');
    panel.id='my-rewards-history';
    panel.setAttribute('aria-label','Historial privado de puntos y recompensas');
    const heading=make('h2','','💰 Mi historial de puntos y recompensas');
    const description=make('p','sbrh-description',
      'Consulta los premios por insignias, puntos de la comunidad y gastos de la tienda. Tus movimientos solo los puedes consultar tú.');
    const toolbar=make('div','sbrh-toolbar');
    const reload=make('button','outline-btn mini sbrh-refresh','↻ Actualizar historial');
    reload.type='button';
    const search=make('input','sbrh-search');
    search.type='search';
    search.placeholder='Buscar recompensa o movimiento…';
    search.maxLength=100;
    search.setAttribute('aria-label','Buscar en el historial de puntos');
    const statsButton=make('button','outline-btn mini sbrh-stats-link','📊 Ver estadísticas');
    statsButton.type='button';
    statsButton.addEventListener('click',()=>{
      const chart=host.querySelector('.sbrs-panel');
      if(chart){
        window.dispatchEvent(new Event('sb:open-reward-stats'));
        chart.scrollIntoView({behavior:'smooth',block:'start'});
      }else{
        feedback.textContent='Las estadísticas todavía no se han cargado. Recarga la página.';
      }
    });
    toolbar.append(reload,search,statsButton);

    const feedback=make('p','sbrh-feedback','Consultando movimientos…');
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');

    const totals=make('div','sbrh-totals');
    const tile=(icon,label)=>{
      const box=make('div','sbrh-tile');
      const title=make('span','',icon+' '+label);
      const value=make('strong','','—');
      box.append(title,value);
      totals.append(box);
      return value;
    };
    const balance=tile('💰','Saldo disponible en la tienda');
    const badgePoints=tile('🏆','Puntos por insignias');
    const credits=tile('📈','Puntos ganados, registros actuales');
    const spending=tile('🛍️','Puntos gastados');

    const controls=make('div','sbrh-controls');
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Filtrar movimientos por tipo');
    const filterBtns=new Map();
    for(const filter of filters){
      const button=make('button','outline-btn mini',filter.label);
      button.type='button';
      button.setAttribute('aria-pressed',String(filter.key==='all'));
      button.addEventListener('click',()=>{
        currentFilter=filter.key;
        filterBtns.forEach((btn,key)=>{
          btn.setAttribute('aria-pressed',String(key===currentFilter));
        });
        renderEntries();
      });
      filterBtns.set(filter.key,button);
      controls.append(button);
    }

    const subheading=make('h3','','📜 Movimientos registrados');
    const shown=make('p','sbrh-shown','');
    const entries=make('div','sbrh-entries');
    entries.setAttribute('role','list');
    const note=make('p','sbrh-note',
      'El saldo actual procede de la tienda. El saldo mostrado en cada movimiento es una reconstrucción a partir de registros que todavía existen y puede cambiar si se eliminan publicaciones u otras actividades. No es un extracto histórico inmutable. Se muestran hasta 200 movimientos recientes; los totales incluyen todos los registros disponibles.');
    panel.append(heading,description,toolbar,feedback,totals,controls,subheading,shown,entries,note);
    anchor.after(panel);

    let response=null;
    let currentFilter='all';
    let request=0;
    const active=()=>panel.isConnected&&location.hash.split('?')[0]==='#/cuenta';

    function renderEntries(){
      if(!active()||!response)return;
      const query=search.value.trim().toLocaleLowerCase('es');
      const items=response.items.filter(item=>{
        const type=identify(item);
        const matchesType=currentFilter==='all'||type.category===currentFilter;
        if(!matchesType)return false;
        return !query||(
          type.name+' '+type.desc+' '+String(item.detail||'')+' '+
          (badgeNames[item.ref]||'')
        ).toLocaleLowerCase('es').includes(query);
      });
      shown.textContent=items.length+' de '+number(response.total_movements)+
        ' movimientos registrados'+(response.total_movements>response.items.length
          ?' · '+number(response.items.length)+' movimientos recientes disponibles para filtrar':'')+'.';
      entries.replaceChildren();
      if(!items.length){
        entries.append(make('p','sbrh-empty',response.total_movements===0
          ?'Todavía no tienes movimientos de puntos. Cuando consigas una insignia o una recompensa, aparecerá aquí.'
          :'No hay movimientos que coincidan con estos filtros.'));
        return;
      }
      for(const item of items){
        const type=identify(item);
        const amount=Number(item.points)||0;
        const row=make('article','sbrh-entry');
        row.setAttribute('role','listitem');
        row.dataset.kind=type.category;
        const icon=make('span','sbrh-entry-icon',type.icon);
        icon.setAttribute('aria-hidden','true');
        const body=make('div','sbrh-entry-body');
        body.append(make('strong','sbrh-entry-name',type.name));
        body.append(make('span','sbrh-entry-description',
          dateLabel(item.happened_at)+' · '+type.desc));
        const change=make('div','sbrh-entry-values');
        const delta=make('strong','sbrh-entry-amount '+(amount>=0?'is-positive':'is-negative'),
          (amount>=0?'+':'−')+money(amount)+' puntos');
        const balanceText=make('small','',
          'Saldo reconstruido: '+number(item.reconstructed_balance));
        change.append(delta,balanceText);
        row.append(icon,body,change);
        entries.append(row);
      }
    }

    function draw(data){
      response=data;
      balance.textContent=number(data.current_balance);
      badgePoints.textContent=number(data.badge_points)+' · '+number(data.badge_awards)+' insignias';
      credits.textContent=number(data.earned);
      spending.textContent=number(data.spent);
      renderEntries();
      feedback.textContent=data.total_movements
        ?'Historial actualizado con '+number(data.total_movements)+' movimientos.'
        :'Historial actualizado. Todavía no hay movimientos.';
    }

    async function load(){
      const ticket=++request;
      reload.disabled=true;
      feedback.textContent='Actualizando historial…';
      try{
        if(typeof sb==='undefined'||!sb.rpc)throw Error('Supabase no disponible');
        const {data:userData,error:authError}=await sb.auth.getUser();
        if(authError||!userData?.user?.id)throw Error('Inicia sesión para ver tus puntos.');
        const {data,error}=await sb.rpc('get_my_rewards_history',{p_limit:200});
        if(ticket!==request||!active())return;
        if(error)throw error;
        if(!data||!Array.isArray(data.items)||
          !['current_balance','badge_points','earned','spent','total_movements']
            .every(k=>Number.isFinite(Number(data[k])))){
          throw Error('Datos de historial incompletos');
        }
        draw(data);
      }catch(error){
        if(ticket===request&&active()){
          feedback.textContent='No se pudo cargar el historial: '+
            String(error.message||'Error desconocido')+
            '. Pulsa ↻ Actualizar historial para reintentarlo.';
        }
      }finally{
        if(ticket===request&&active())reload.disabled=false;
      }
    }

    const openEvent=()=>{if(active()){load();panel.scrollIntoView({behavior:'smooth',block:'start'});}};
    reload.addEventListener('click',load);
    search.addEventListener('input',renderEntries);
    window.addEventListener('sb:open-reward-history',openEvent);
    const app=document.getElementById('app');
    if(app){
      const observer=new MutationObserver(()=>{
        if(panel.isConnected)return;
        window.removeEventListener('sb:open-reward-history',openEvent);
        observer.disconnect();
      });
      observer.observe(app,{childList:true,subtree:true});
    }
    load();
  }

  let queued=false;
  function scan(){
    queued=false;
    const account=document.getElementById('account-profile');
    if(account?.querySelector('.sbp-identity-card'))mount(account);
  }
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(scan);
  }
  function start(){
    const app=document.getElementById('app');
    if(!app)return;
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
