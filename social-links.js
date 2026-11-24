// Redes sociales administradas manualmente desde Supabase.
const SOCIAL_PLATFORMS=['YouTube','Discord','Instagram','TikTok','Facebook','Twitch','X (Twitter)'];
const SOCIAL_ICONS={Discord:'M19.7 5.4a18 18 0 0 0-4.4-1.4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.4C1.5 9.5.7 13.5 1.1 17.5a18 18 0 0 0 5.4 2.7l1.2-1.9-1.7-.8.4-.3a15 15 0 0 0 11.2 0l.4.3-1.7.8 1.2 1.9a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.5-3.2-12.1zM8.5 15.2c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2zm7 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2z',Instagram:'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z',TikTok:'M14 2h4c0 3 2 5 5 5v4a9 9 0 0 1-5-1.5V16a7 7 0 1 1-7-7v4a3 3 0 1 0 3 3z',YouTube:'M23 7a3 3 0 0 0-2-2c-2-.5-16-.5-18 0a3 3 0 0 0-2 2c-.5 2-.5 8 0 10a3 3 0 0 0 2 2c2 .5 16 .5 18 0a3 3 0 0 0 2-2c.5-2 .5-8 0-10zM10 8l6 4-6 4z'};
const SOCIAL_COLORS={Discord:'#8b91ff',Instagram:'#ff82bf',TikTok:'#70eee4',YouTube:'#ff7373',Twitch:'#c3a0ff','X (Twitter)':'#e2e8f0',Facebook:'#82b6ff'};
Object.assign(SOCIAL_ICONS,{Twitch:'M2 2h20v14l-6 6h-5l-4 4v-4H2V2zm3 3v14h5v3l3-3h5l2-3V5H5zm6 3h2v6h-2zm5 0h2v6h-2z','X (Twitter)':'M3 2h5l5 7 6-7h3l-8 9 8 11h-5l-6-8-7 8H1l9-10L3 2zm3 2 12 16h1L7 4H6z',Facebook:'M14 22v-9h3l1-4h-4V7c0-1 1-2 2-2h2V1h-4c-4 0-6 2-6 6v2H5v4h3v9z'});
const SOCIAL_ACTIONS={YouTube:'Suscríbete',Discord:'Únete a nuestro Discord',Instagram:'Síguenos',TikTok:'Síguenos',Twitch:'Síguenos en directo','X (Twitter)':'Síguenos',Facebook:'Síguenos'};
const SOCIAL_DESCRIPTIONS={YouTube:'Vídeos, novedades y contenido gaming',Discord:'Conversa y juega con la comunidad',Instagram:'Fotos, historias y novedades',TikTok:'Clips anime y gaming',Twitch:'Directos y partidas en vivo','X (Twitter)':'Noticias y actualizaciones',Facebook:'Publicaciones de la comunidad'};
function enhanceSocialDirectory(host){
 if(host.id!=='sb-social-directory')return;
 for(const a of host.querySelectorAll('a[data-social-platform]')){
  if(a.classList.contains('sb-social-card'))continue;
  const platform=a.dataset.socialPlatform;
  a.classList.add('sb-social-card');
  a.setAttribute('aria-label',SOCIAL_ACTIONS[platform]+' — '+platform+' (nueva pestaña)');
  for(const node of [...a.childNodes])if(node.nodeType===3)node.remove();
  const title=document.createElement('strong');title.textContent=platform;
  const desc=document.createElement('span');desc.className='sb-social-description';desc.textContent=SOCIAL_DESCRIPTIONS[platform];
  const action=document.createElement('span');action.className='sb-social-action';action.textContent=SOCIAL_ACTIONS[platform]+' ↗';
  a.append(title,desc,action);
 }
}
const socialDirectoryStyle=document.createElement('style');
socialDirectoryStyle.textContent=`
#sb-social-directory{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))!important;gap:16px!important}
#sb-social-directory .sb-social-card{box-sizing:border-box;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:12px;min-width:0;min-height:190px;padding:20px;border:1px solid var(--social-accent);border-radius:18px;background:linear-gradient(145deg,#21182f,#100e19);color:#f7f2ff;text-decoration:none;transition:transform .2s,box-shadow .2s}
#sb-social-directory .sb-social-card svg{width:32px;height:32px;flex:none;color:var(--social-accent)}
#sb-social-directory .sb-social-card strong{font-size:1.2rem;color:var(--social-accent)}
#sb-social-directory .sb-social-description{font-size:.9rem;line-height:1.45;color:#ded6e9;white-space:normal}
#sb-social-directory .sb-social-action{display:block;margin-top:auto;width:100%;box-sizing:border-box;text-align:center;background:var(--social-accent);color:#100e19;border-radius:10px;padding:11px 8px;font-weight:700;white-space:normal}
@media(hover:hover){#sb-social-directory .sb-social-card:hover{transform:translateY(-4px);box-shadow:0 6px 22px color-mix(in srgb,var(--social-accent) 28%,transparent)}}
#sb-social-directory .sb-social-card:focus-visible{outline:3px solid #fff;outline-offset:3px}
@media(prefers-reduced-motion:reduce){#sb-social-directory .sb-social-card{transition:none;transform:none!important}}
@media(max-width:540px){#sb-social-directory{grid-template-columns:1fr!important;gap:12px!important}#sb-social-directory .sb-social-card{min-height:0;padding:16px}}
`;document.head.append(socialDirectoryStyle);

function decorateSocialLinks(host){
 for(const a of host.querySelectorAll('a')){
  const platform=a.textContent.trim();if(!SOCIAL_PLATFORMS.includes(platform)||a.dataset.socialPlatform)continue;
  a.dataset.socialPlatform=platform;a.style.setProperty('--social-accent',SOCIAL_COLORS[platform]||'#eabf49');
  const path=SOCIAL_ICONS[platform];
  if(path){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);p.setAttribute('fill','currentColor');p.setAttribute('fill-rule','evenodd');svg.append(p);a.prepend(svg);}
  const record=()=>{if(typeof sb!=='undefined')sb.from('site_social_clicks').insert({platform}).then(({error})=>{if(error)console.warn('Social click:',error.message);},()=>{});};
  a.addEventListener('click',record);a.addEventListener('auxclick',e=>{if(e.button===1)record();});
 }
}
async function appendSocialHistory(host,request,ranking,period){
 const panel=document.createElement('section');panel.style.cssText='margin-top:24px;min-width:0';host.append(panel);
 const heading=document.createElement('h3');heading.textContent='📈 Evolución de clics';panel.append(heading);
 const note=document.createElement('p');note.textContent='Clics por fecha UTC. Últimos 30 días como máximo; el día actual está incompleto.';panel.append(note);
 const status=document.createElement('p');status.textContent='Cargando historial…';panel.append(status);
 const exportButton=document.createElement('button');exportButton.type='button';exportButton.className='gradient-btn';exportButton.textContent='📥 Exportar ranking CSV';panel.append(exportButton);
 function downloadCsv(name,rows){
  const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 exportButton.onclick=()=>downloadCsv('ranking-redes-'+period+'.csv',[['Red social','Clics','Periodo'],...ranking.map(x=>[x.platform,x.count,period])]);
 try{
 const now=new Date(),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 const length=period==='day'?2:period==='week'?8:30;
 const cutoff=({day:1,week:7,month:30}[period]||30)*86400000;
 const dates=Array.from({length},(_,i)=>today-(length-1-i)*86400000);
 const rows=[];
 for(let i=0;i<dates.length;i+=5){
  if(host.dataset.request!==request||!host.isConnected)return;
  const part=await Promise.all(dates.slice(i,i+5).map(async start=>{
   const lower=Math.max(start,now.getTime()-cutoff);
   const upper=Math.min(start+86400000,now.getTime());
   if(upper<=lower)return {date:new Date(start).toISOString().slice(0,10),count:0};
   const result=await sb.from('site_social_clicks').select('id',{count:'exact',head:true}).in('platform',SOCIAL_PLATFORMS).gte('created_at',new Date(lower).toISOString()).lt('created_at',new Date(upper).toISOString());
   if(result.error)throw result.error;
   return {date:new Date(start).toISOString().slice(0,10),count:result.count||0};
  }));rows.push(...part);
 }
 if(host.dataset.request!==request||!host.isConnected)return;
 status.remove();
 const max=Math.max(1,...rows.map(x=>x.count));
 const chart=document.createElement('div');chart.setAttribute('role','img');chart.setAttribute('aria-label','Gráfico de clics diarios. Valores disponibles en el historial inferior.');chart.style.cssText='display:flex;align-items:flex-end;gap:4px;height:140px;padding:10px 0;border-bottom:1px solid #ffffff40';
 rows.forEach(x=>{const bar=document.createElement('div');bar.style.cssText='flex:1;min-width:0;border-radius:5px 5px 0 0;background:#a78bfa';bar.style.height=(x.count?Math.max(3,x.count/max*100):0)+'%';bar.title=x.date+': '+x.count+' clics';chart.append(bar);});
 panel.append(chart);const axis=document.createElement('p');axis.style.cssText='display:flex;justify-content:space-between;font-size:.8rem';axis.textContent=rows[0].date+' — '+rows[rows.length-1].date;panel.append(axis);
 const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='📅 Ver historial por fechas';details.append(summary);
 [...rows].reverse().forEach(x=>{const row=document.createElement('div');row.className='social-stat-row';const label=document.createElement('span');label.textContent=x.date;const value=document.createElement('strong');value.textContent=x.count+' clics';row.append(label,value);details.append(row);});panel.append(details);
 const daily=document.createElement('button');daily.type='button';daily.className='outline-btn';daily.textContent='📥 Exportar historial CSV';daily.onclick=()=>downloadCsv('historial-redes-'+period+'.csv',[['Fecha UTC','Clics'],...rows.map(x=>[x.date,x.count])]);panel.append(daily);
 }catch(e){if(host.dataset.request===request)status.textContent='No se pudo cargar el historial. Actualiza las estadísticas.';}
}
async function shareSocialDirectory(button){
 const url=new URL(location.href);url.hash='/redes-sociales';url.search='';
 const data={title:'Shadows Byte Gaming Official',text:'Descubre nuestras redes sociales oficiales',url:url.href};
 try{if(navigator.share){await navigator.share(data);return;}if(navigator.clipboard){await navigator.clipboard.writeText(url.href);button.textContent='✓ Enlace copiado';return;}}catch(e){if(e.name==='AbortError')return;}
 const field=document.createElement('input');field.readOnly=true;field.value=url.href;field.setAttribute('aria-label','Enlace para compartir');button.after(field);field.select();
}
document.addEventListener('click',e=>{const button=e.target.closest('#sb-share-social-directory');if(button)void shareSocialDirectory(button);});

async function loadSocialStats(section){
 const host=section.querySelector('.social-click-stats');if(!host)return;
 const request=String(Number(host.dataset.request||0)+1);host.dataset.request=request;
 const period=section.querySelector('#sb-social-period')?.value||'all';
 host.textContent='Cargando estadísticas…';
 try{
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(host.dataset.request!==request)return;
 if(authError||user?.app_metadata?.role!=='admin'){host.textContent='Estadísticas disponibles solo para administradores.';return;}
 const days={day:1,week:7,month:30}[period];
 const since=days?new Date(Date.now()-days*86400000).toISOString():null;
 const results=await Promise.all(SOCIAL_PLATFORMS.map(platform=>{
 let query=sb.from('site_social_clicks').select('id',{count:'exact',head:true}).eq('platform',platform);
 if(since)query=query.gte('created_at',since);
 return query;
 }));
 if(host.dataset.request!==request)return;
 if(results.some(x=>x.error))throw Error('No se pudieron consultar los clics.');
 const ranking=SOCIAL_PLATFORMS.map((platform,i)=>({platform,count:results[i].count||0})).sort((a,b)=>b.count-a.count);
 const sum=ranking.reduce((a,b)=>a+b.count,0);
 host.replaceChildren();
 const total=document.createElement('strong');total.textContent='Total de clics: '+sum.toLocaleString('es-ES');host.append(total);
 const leader=document.createElement('p');leader.textContent=sum?'🏆 Más visitadas: '+ranking.filter(x=>x.count===ranking[0].count).map(x=>x.platform).join(', '):'Todavía no hay clics en este periodo.';host.append(leader);
 ranking.forEach(({platform,count},i)=>{
 const row=document.createElement('div');row.style.cssText='padding:10px 0;border-bottom:1px solid #ffffff20';
 const line=document.createElement('div');line.className='social-stat-row';
 const label=document.createElement('span');label.textContent=(count?ranking.findIndex(x=>x.count===count)+1+'. ':'— ')+platform;
 const number=document.createElement('strong');number.textContent=count.toLocaleString('es-ES')+' · '+(sum?Math.round(count/sum*100):0)+'%';if(count>0&&count===ranking[0].count){const badge=document.createElement('span');badge.textContent=' 🏆 Red más popular';badge.style.cssText='font-size:.75rem;color:#fbbf24';label.append(badge);}line.append(label,number);
 const track=document.createElement('div');track.style.cssText='height:7px;background:#ffffff18;border-radius:8px;overflow:hidden;margin-top:6px';
 const bar=document.createElement('div');bar.style.cssText='height:100%;border-radius:8px';bar.style.width=(sum?count/sum*100:0)+'%';bar.style.background=SOCIAL_COLORS[platform];track.append(bar);row.append(line,track);host.append(row);
 });
 void appendSocialHistory(host,request,ranking,period);
 }catch(e){if(host.dataset.request===request)host.textContent='No se pudieron cargar las estadísticas. Pulsa Actualizar estadísticas.';}
}
async function loadSiteSocialLinks(){
 const hosts=[...document.querySelectorAll('.social-links')];if(!hosts.length)return;hosts.forEach(decorateSocialLinks);if(typeof sb==='undefined'){for(const host of hosts)if(host.id==='sb-social-directory')host.textContent='Conexión no disponible. Recarga la página.';return;}
 let data,error;try{({data,error}=await sb.from('site_social_links').select('platform,url').abortSignal(AbortSignal.timeout(10000)));}catch(e){error=e;}
 if(error){for(const host of hosts)if(host.id==='sb-social-directory')host.textContent='No se pudieron cargar las redes sociales. Vuelve a intentarlo.';return;}
 for(const host of hosts){if(!host.isConnected)continue;
 host.replaceChildren();
 for(const platform of SOCIAL_PLATFORMS){
  const item=data?.find(row=>row.platform===platform);
  if(!item||!/^https:\/\/[^\s]+$/i.test(item.url))continue;
  const a=document.createElement('a');a.href=item.url;a.textContent=platform;a.target='_blank';a.rel='noopener noreferrer';host.append(a);
 }
 decorateSocialLinks(host);enhanceSocialDirectory(host);
 if(!host.children.length)host.textContent='Próximamente publicaremos nuestras redes sociales.';
 }
}
async function initSocialAdmin(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard||document.getElementById('social-admin-panel'))return;
 const section=document.createElement('section');section.className='admin-panel';section.id='social-admin-panel';
 section.innerHTML='<div class="admin-panel-heading"><div><span class="admin-kicker">CONFIGURACIÓN</span><h2>Redes sociales</h2><p>Pega manualmente los enlaces. Deja un campo vacío para ocultar esa red en la web.</p></div></div><form id="social-admin-form"><div class="admin-fields" id="social-admin-fields"></div><div class="admin-form-actions"><button class="gradient-btn" type="submit">Guardar redes sociales</button></div><p id="social-admin-message" role="status" aria-live="polite"></p></form>';
 dashboard.append(section);
 const stats=document.createElement('div');stats.className='social-stats-panel';stats.innerHTML='<h3>Estadísticas de redes sociales</h3><p>Contador de clics por red social (incluye el nuevo directorio). No representa seguidores ni visitas confirmadas.</p><label for="sb-social-period">Periodo de estadísticas</label><select id="sb-social-period" style="display:block;max-width:100%;margin:8px 0 16px"><option value="all">Historial completo</option><option value="day">Últimas 24 horas</option><option value="week">Últimos 7 días</option><option value="month">Últimos 30 días</option></select><div class="social-click-stats" aria-live="polite"></div><button type="button" class="gradient-btn">Actualizar estadísticas</button>';section.append(stats);stats.querySelector('button').onclick=()=>loadSocialStats(section);stats.querySelector('#sb-social-period').onchange=()=>loadSocialStats(section);loadSocialStats(section);
 const fields=section.querySelector('#social-admin-fields');
 for(const platform of SOCIAL_PLATFORMS){
  const wrap=document.createElement('div');wrap.className='admin-field';
  const label=document.createElement('label');label.textContent=platform;
  const input=document.createElement('input');input.type='url';input.placeholder='https://...';input.dataset.platform=platform;input.setAttribute('aria-label','Enlace de '+platform);
  label.append(input);wrap.append(label);fields.append(wrap);
 }
 const msg=section.querySelector('#social-admin-message');
 const {data,error}=await sb.from('site_social_links').select('platform,url');
 if(error){msg.textContent='No se pudieron cargar los enlaces: '+error.message;return;}
 for(const input of fields.querySelectorAll('input'))input.value=data?.find(row=>row.platform===input.dataset.platform)?.url||'';
 section.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const button=section.querySelector('button[type=submit]');button.disabled=true;msg.textContent='Guardando…';
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.app_metadata?.role!=='admin')throw Error('Solo el administrador puede guardar enlaces.');
   for(const input of fields.querySelectorAll('input')){
    const platform=input.dataset.platform,url=input.value.trim();
    if(url&&!/^https:\/\/[^\s]+$/i.test(url))throw Error('El enlace de '+platform+' debe empezar por https://');
    const result=url?await sb.from('site_social_links').upsert({platform,url,updated_at:new Date().toISOString()}):await sb.from('site_social_links').delete().eq('platform',platform);
    if(result.error)throw result.error;
   }
   msg.textContent='Redes sociales guardadas correctamente.';
   await loadSiteSocialLinks();
  }catch(error){msg.textContent='Error al guardar: '+error.message}
  finally{button.disabled=false}
 };
}
pages['/redes-sociales']=()=>`<section class="page"><div class="page-hero"><div class="eyebrow">COMUNIDAD</div><h1>🌐 Redes sociales</h1><p>Sigue a Shadows Byte Gaming Official en nuestras redes oficiales.</p><button id="sb-share-social-directory" class="outline-btn" type="button">📲 Compartir redes sociales</button></div><section class="section"><div id="sb-social-directory" class="social-links" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:14px" aria-live="polite">Cargando redes sociales…</div><p>Los enlaces se abren en una nueva pestaña.</p></section></section>`;
const previousSocialRender=render;
render=async function(...args){const result=await previousSocialRender.apply(this,args);await loadSiteSocialLinks();return result;};
const previousSocialInitAdmin=initAdmin;
initAdmin=async function(...args){const result=await previousSocialInitAdmin.apply(this,args);await initSocialAdmin();return result;};

// El router original conserva su listener de hashchange; observar el montaje real.
const socialDirectoryObserver=new MutationObserver(()=>{
 const host=document.getElementById('sb-social-directory');
 if(host&&!host.dataset.socialLoaded){host.dataset.socialLoaded='1';void loadSiteSocialLinks();}
});
socialDirectoryObserver.observe(app,{childList:true,subtree:true});
// Refrescar la vista inicial tras registrar las extensiones.
render();
