/* SB V2 live anime and gaming calendar. */
window.SBReleaseCalendar=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const checked=r=>{if(r.error)throw r.error;return r.data};
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dayOffset=n=>{const d=new Date();d.setDate(d.getDate()+n);return dateKey(d)};
const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const key=x=>x.source+':'+x.external_id;
const names={anilist:'🌸 Anime · AniList',steam:'🎮 Gaming · Steam'};
function safeSource(x){return x.source==='anilist'?'https://anilist.co/anime/'+x.external_id:'https://store.steampowered.com/app/'+x.external_id+'/'}
function makeLink(text,url){const a=el('a',text,'outline-btn mini');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
async function mount(){
 const root=document.getElementById('sb-release-calendar');if(!root)return;
 root.replaceChildren(el('p','Consulta horarios de anime de los próximos 14 días y una selección de próximos juegos de Steam. Horarios de anime en tu zona horaria; Steam muestra la fecha anunciada, no una hora de lanzamiento.'));
 const status=el('p','Consultando fuentes…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const controls=el('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0';
 const search=el('input');search.type='search';search.placeholder='Buscar título';search.setAttribute('aria-label','Buscar título');search.style.maxWidth='100%';
 function select(label,choices){const n=el('select');n.setAttribute('aria-label',label);for(const [v,t] of choices){const o=el('option',t);o.value=v;n.append(o)}return n}
 const category=select('Categoría',[['all','Todo'],['anilist','Anime'],['premiere','Estrenos anime (episodio 1)'],['steam','Gaming (Steam)']]);
 const period=select('Fecha',[['all','Todas las fechas disponibles'],['today','Hoy'],['7','Próximos 7 días'],['14','Próximos 14 días'],['30','Próximos 30 días'],['unknown','Sin fecha exacta']]);
 const saved=el('label',' Solo favoritos');const cb=el('input');cb.type='checkbox';saved.prepend(cb);
 const refresh=btn('↻ Actualizar',load);controls.append(search,category,period,saved,refresh);
 const links=el('div');links.style.cssText='display:flex;flex-wrap:wrap;gap:8px';links.append(makeLink('AniList · consultar fuente','https://anilist.co/search/anime'),makeLink('Steam · todos los próximos lanzamientos','https://store.steampowered.com/search/?filter=comingsoon'));
 const list=el('div');root.append(controls,status,links,list);
 let user=null,favorites=new Set(),data=null,busy=false,favoritesReady=false;
 try{user=checked(await sb.auth.getSession()).session?.user||null;if(user){const rows=checked(await sb.from('sb_release_favorites').select('source,external_id').eq('user_id',user.id))||[];favorites=new Set(rows.map(key));favoritesReady=true}}catch(e){status.textContent='No se pudieron cargar los favoritos.'}
 if(!user||!favoritesReady){cb.disabled=true;saved.title=user?'Favoritos no disponibles':'Inicia sesión para guardar favoritos'}
 const localDay=x=>x.at?dateKey(new Date(x.at)):x.date;
 const dateSort=x=>x.at||x.date||'9999';
 const card=x=>{const n=el('article');n.style.cssText='padding:12px;border:1px solid #a855f755;border-radius:12px;min-width:0;overflow-wrap:anywhere;background:#211633;color:#fff';
 n.append(el('small',names[x.source]),el('h3',x.title));const detail=x.source==='anilist'?(x.episode===1?'✨ Estreno · Episodio 1':'Episodio '+(x.episode||'—'))+(x.at?' · '+new Date(x.at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):''):(x.date?'Lanzamiento anunciado · PC':'Fecha anunciada: '+(x.date_label||'Por confirmar'));n.append(el('p',detail),makeLink('Ver ficha',safeSource(x)));
 if(user&&favoritesReady){const f=btn(favorites.has(key(x))?'★ Guardado':'☆ Guardar título',async()=>{f.disabled=true;try{if(favorites.has(key(x))){checked(await sb.from('sb_release_favorites').delete().eq('user_id',user.id).eq('source',x.source).eq('external_id',x.external_id));favorites.delete(key(x))}else{const result=await sb.from('sb_release_favorites').insert({source:x.source,external_id:x.external_id});if(result.error&&result.error.code!=='23505')throw result.error;favorites.add(key(x))}draw()}catch(e){status.textContent='No se pudo guardar: '+e.message;f.disabled=false}});f.setAttribute('aria-pressed',String(favorites.has(key(x))));n.append(f)}return n};
 function draw(){
 if(!data)return;list.replaceChildren();const today=dayOffset(0),q=search.value.trim().toLowerCase();
 const rows=Object.values(data.sources||{}).flatMap(s=>s.items||[]).filter(x=>['anilist','steam'].includes(x.source)&&/^\d{1,12}$/.test(x.external_id)).filter(x=>{const d=localDay(x),p=period.value,c=category.value;if(q&&!x.title.toLowerCase().includes(q))return false;if(cb.checked&&!favorites.has(key(x)))return false;if(c==='premiere'&&!(x.source==='anilist'&&x.episode===1))return false;if(c!=='all'&&c!=='premiere'&&x.source!==c)return false;if(p==='today')return d===today;if(p==='unknown')return !d;if(p!=='all')return !!d&&d>=today&&d<=dayOffset(Number(p)-1);return !d||d>=today}).sort((a,b)=>dateSort(a).localeCompare(dateSort(b)));
 list.append(el('p',rows.length+' resultados'));
 if(!rows.length){list.append(el('p','No hay resultados en los datos disponibles. Cambia los filtros o consulta la fuente.'));return}
 const groups=new Map();for(const x of rows){const d=localDay(x)||'unknown';if(!groups.has(d))groups.set(d,[]);groups.get(d).push(x)}
 for(const [d,items] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){const section=el('section');section.style.margin='18px 0';section.append(el('h2',d==='unknown'?'📌 Fecha exacta por confirmar':dateLabel(d)));const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px';for(const x of items)grid.append(card(x));section.append(grid);list.append(section)}
 }
 async function load(){
 if(busy||!root.isConnected)return;busy=true;refresh.disabled=true;status.textContent='Consultando AniList y Steam…';
 try{const payload=checked(await sb.functions.invoke('sb-release-calendar',{body:{}}));if(!payload?.sources)throw Error('Respuesta del calendario inválida');if(!root.isConnected)return;data=payload;const parts=Object.entries(names).map(([id,name])=>{const x=data.sources[id];return name+': '+(!x?.ok?'no disponible':(x.items?.length||0)+' resultados'+(x.partial?' (parcial)':''))});status.textContent=parts.join(' · ')+' · Consulta: '+new Date(data.updated_at).toLocaleString('es-ES')+'. Las fechas pueden cambiar.';draw()}
 catch(e){status.textContent='No se pudo actualizar el calendario: '+(e.message||'Error de conexión')+(data?' · Mostrando la última consulta de esta sesión.':' · Usa los enlaces de las fuentes.')}
 finally{busy=false;refresh.disabled=false}
 }
 search.oninput=category.onchange=period.onchange=cb.onchange=draw;
 await load();const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);return}if(!document.hidden)load()},15*60000);
}
return {mount};
})();