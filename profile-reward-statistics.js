/* Shadows Byte Gaming Official V2 — estadísticas privadas de recompensas */
(() => {
'use strict';
const fmt=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Number(n)||0);
const pos=n=>Math.max(0,Math.round(Number(n)||0));
const node=(tag,cls,txt)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(txt!==undefined)x.textContent=txt;return x;
};
const badgeLabels=[
 ['link_promising_10','🥉 Enlace Prometedor'],
 ['link_creator_50','🥈 Creador Destacado'],
 ['link_star_100','🥇 Estrella Gamer'],
 ['link_legend_500','💎 Leyenda de la Comunidad']
];
const csvLine=fields=>fields.map(v=>{
 let x=String(v??'');if(/^[=+@]/.test(x))x="'"+x;
 return '"'+x.replaceAll('"','""')+'"';
}).join(';');
const formatDay=raw=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(raw)))return '';
 const p=raw.split('-');return p[2]+'/'+p[1];
};
function mount(host){
 if(host.querySelector('.sbrs-panel'))return;
 const anchor=host.querySelector('.sb-reward-history')||
  host.querySelector('.sbv-editor')||host.querySelector('.sbp-identity-card');
 if(!anchor)return;
 const panel=node('section','profile-panel sbrs-panel');
 panel.id='my-reward-stats';
 panel.setAttribute('aria-label','Estadísticas privadas de puntos y recompensas');
 const title=node('h2','','📊 Estadísticas de puntos y recompensas');
 const intro=node('p','sbrs-intro',
  'Consulta tus puntos ganados y gastados por días, insignias y gastos de la tienda.');
 const toolbar=node('div','sbrs-toolbar');
 const range=node('div','sbrs-ranges');
 range.setAttribute('role','group');range.setAttribute('aria-label','Periodo de estadísticas');
 const selectors=new Map();
 let days=30, stats=null,request=0;
 for(const n of [7,30,90]){
  const button=node('button','outline-btn mini',n+' días');
  button.type='button';button.setAttribute('aria-pressed',String(days===n));
  button.addEventListener('click',()=>{
   if(n===days)return;
   days=n;selectors.forEach((b,k)=>b.setAttribute('aria-pressed',String(k===n)));
   load();
  });
  selectors.set(n,button);range.append(button);
 }
 const refresh=node('button','outline-btn mini','↻ Actualizar estadísticas');
 refresh.type='button';
 const exportBtn=node('button','gradient-btn mini','📥 Descargar estadísticas CSV');
 exportBtn.type='button';exportBtn.disabled=true;
 const goalsButton=node('button','outline-btn mini sbrs-goals-link','🏆 Mis metas de puntos');
 goalsButton.type='button';
 goalsButton.addEventListener('click',()=>{
  const goals=document.querySelector('#account-profile .sbpg-panel');
  if(goals){
   window.dispatchEvent(new Event('sb:open-point-goals'));
   goals.scrollIntoView({behavior:'smooth',block:'start'});
  }
 });
 toolbar.append(range,refresh,exportBtn,goalsButton);
 const status=node('p','sbrs-status','Cargando estadísticas…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const totals=node('div','sbrs-totals'),totalEls={};
 for(const [key,label] of [
  ['earned','📈 Ganados'],['spent','📉 Gastados'],
  ['net','⚖️ Neto del periodo'],['badge_points','🏆 Por insignias'],
  ['shop_spent','🛍️ Gastados en tienda'],['current_balance','💰 Saldo disponible']
 ]){
  const card=node('div','sbrs-total');
  card.append(node('span','',label));
  const value=node('strong','','—');totalEls[key]=value;card.append(value);
  totals.append(card);
 }
 const chartTitle=node('h3','','📊 Ganados y gastados por día');
 const legend=node('div','sbrs-legend');
 legend.append(node('span','sbrs-legend-earned','Ganados'),
  node('span','sbrs-legend-spent','Gastados'));
 const empty=node('p','sbrs-empty','');empty.hidden=true;
 const chart=node('div','sbrs-chart');chart.setAttribute('role','group');
 chart.setAttribute('aria-label','Gráfico diario de puntos ganados y gastados');
 const details=node('div','sbrs-details');
 const badges=node('section','sbrs-detail');
 badges.append(node('h3','','🏆 Insignias en el periodo'));
 const badgeList=node('div','sbrs-badges');badges.append(badgeList);
 const shop=node('section','sbrs-detail');
 shop.append(node('h3','','🛍️ Gastos en tienda'));
 const shopList=node('div','sbrs-shop');shop.append(shopList);
 details.append(badges,shop);
 const note=node('p','sbrs-note',
  'Se usan días naturales de España. Las cifras reflejan registros actuales y pueden cambiar si se elimina actividad. El saldo disponible es el de la tienda hoy, no el saldo histórico del periodo.');
 panel.append(title,intro,toolbar,status,totals,chartTitle,legend,empty,chart,details,note);
 anchor.after(panel);

 const active=()=>panel.isConnected&&location.hash.split('?')[0]==='#/cuenta';
 function paintChart(data){
  chart.replaceChildren();
  const max=Math.max(1,...data.daily.map(x=>Math.max(pos(x.earned),pos(x.spent))));
  const axis=node('div','sbrs-axis');
  for(const v of [max,Math.round(max/2),0])axis.append(node('span','',fmt(v)));
  const scroller=node('div','sbrs-scroll');
  scroller.tabIndex=0;
  scroller.setAttribute('aria-label','Desplázate horizontalmente para explorar todos los días');
  const plot=node('div','sbrs-plot');
  plot.dataset.days=String(days);
  let withActivity=0;
  data.daily.forEach((r,i)=>{
   const gained=pos(r.earned),spent=pos(r.spent);
   if(gained+spent)withActivity++;
   const group=node('div','sbrs-day');
   group.title=r.date+': '+fmt(gained)+' ganados, '+fmt(spent)+' gastados';
   const bars=node('div','sbrs-bars');
   const first=node('span','sbrs-bar sbrs-bar-earned');
   const second=node('span','sbrs-bar sbrs-bar-spent');
   first.style.height=gained/max*100+'%';
   second.style.height=spent/max*100+'%';
   bars.append(first,second);
   const label=(days===7||i===0||i===data.daily.length-1||
     i%(days===30?5:15)===0)?formatDay(r.date):'';
   group.append(bars,node('small','sbrs-day-label',label));
   plot.append(group);
  });
  scroller.append(plot);chart.append(axis,scroller);
  empty.hidden=withActivity!==0;
  empty.textContent='Todavía no hay movimientos en este periodo.';
 }
 function paintDetails(data){
  badgeList.replaceChildren();shopList.replaceChildren();
  const found=new Map(data.badge_breakdown.map(x=>[x.badge_key,x]));
  for(const [key,label] of badgeLabels){
   const row=node('div','sbrs-detail-row');
   row.append(node('span','',label),node('strong','',
    '+'+fmt(pos(found.get(key)?.points))+' puntos'));
   badgeList.append(row);
  }
  for(const [label,value] of [
   ['Puntos gastados',fmt(pos(data.shop_spent))],
   ['Compras realizadas',fmt(pos(data.purchase_count))],
   ['Regalos enviados',fmt(pos(data.gifts_sent_count))],
   ['Insignias premiadas',fmt(pos(data.badge_count))]
  ]){
   const row=node('div','sbrs-detail-row');
   row.append(node('span','',label),node('strong','',value));
   shopList.append(row);
  }
 }
 function draw(data){
  stats=data;
  for(const k of ['earned','spent','net','badge_points','shop_spent','current_balance'])
   totalEls[k].textContent=fmt(data[k])+' puntos';
  totalEls.net.dataset.negative=String(Number(data.net)<0);
  paintChart(data);paintDetails(data);
  status.textContent='Periodo: '+formatDay(data.start_date)+' – '+
   formatDay(data.end_date)+' · '+fmt(data.movement_count)+' movimientos.';
  exportBtn.disabled=false;
 }
 async function load(){
  const ticket=++request,period=days;
  refresh.disabled=true;exportBtn.disabled=true;stats=null;
  status.textContent='Consultando '+period+' días…';
  try{
   if(typeof sb==='undefined'||!sb.rpc||!sb.auth)throw Error('Supabase no disponible');
   const auth=await sb.auth.getUser();
   if(auth.error||!auth.data?.user?.id)throw Error('Inicia sesión');
   const {data,error}=await sb.rpc('get_my_reward_statistics',{p_days:period});
   if(ticket!==request||!active())return;
   if(error)throw error;
   if(!data||data.period_days!==period||
    !Array.isArray(data.daily)||data.daily.length!==period||
    !Array.isArray(data.badge_breakdown)||
    !['earned','spent','net','badge_points','shop_spent','current_balance']
     .every(k=>Number.isFinite(Number(data[k]))))throw Error('Datos incompletos');
   draw(data);
  }catch(e){
   if(ticket===request&&active())
    status.textContent='No se pudieron cargar las estadísticas: '+
      String(e.message||'Error desconocido')+'. Pulsa ↻ Actualizar.';
  }finally{if(ticket===request&&active())refresh.disabled=false}
 }
 function downloadCsv(){
  if(!stats||stats.period_days!==days||!active())return;
  const d=stats,rows=[
   ['Estadísticas de puntos y recompensas','Shadows Byte Gaming Official V2'],
   ['Periodo (días)',days],['Desde',d.start_date],['Hasta',d.end_date],
   ['Zona horaria',d.timezone],['Saldo actual',d.current_balance],
   ['Ganados en periodo',d.earned],['Gastados en periodo',d.spent],
   ['Neto del periodo',d.net],['Premios por insignias',d.badge_points],
   ['Gastos en tienda',d.shop_spent],['Compras',d.purchase_count],
   ['Regalos enviados',d.gifts_sent_count],[],
   ['Fecha','Ganados','Gastados','Neto','Puntos de insignias','Gasto en tienda','Movimientos'],
   ...d.daily.map(r=>[r.date,pos(r.earned),pos(r.spent),Number(r.net)||0,
     pos(r.badge_points),pos(r.shop_spent),pos(r.movement_count)]),
   ['TOTAL',pos(d.earned),pos(d.spent),Number(d.net)||0,
     pos(d.badge_points),pos(d.shop_spent),pos(d.movement_count)]
  ];
  const csv='\ufeff'+rows.map(csvLine).join('\r\n')+'\r\n';
  const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=href;
  a.download='shadows-byte-estadisticas-'+days+'-dias-'+d.end_date+'.csv';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
 }
 refresh.addEventListener('click',load);
 exportBtn.addEventListener('click',downloadCsv);
 const open=()=>{if(active()){load();panel.scrollIntoView({behavior:'smooth',block:'start'});}};
 window.addEventListener('sb:open-reward-stats',open);
 const app=document.getElementById('app');
 if(app){
  const observer=new MutationObserver(()=>{
   if(panel.isConnected)return;
   window.removeEventListener('sb:open-reward-stats',open);observer.disconnect();
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
function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan);}
function start(){
 const app=document.getElementById('app');if(!app)return;
 new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
 window.addEventListener('hashchange',schedule);
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();