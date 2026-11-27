/* Shadow Universe 2.0 — interactive fictional world map and daily exploration. */
window.SBWorldMap=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede explorar.','Rank insufficient':'Todavía no tienes el rango necesario.','Unknown region':'Región no disponible.'};
const colors={haven:'#86efac',cryptlands:'#cbd5e1',spirit:'#67e8f9',forestlands:'#4ade80',arcane:'#c084fc',monarch:'#fbbf24',abyss:'#fb7185',throne:'#e9d5ff'};
const destinations={guilds:'Gremios',pets:'Mascotas',skills:'Árbol de habilidades',gear:'Equipamiento',bosses:'Jefes mundiales',dungeons:'Mazmorras',pvp:'Arena PvP',cards:'Cartas'};
const paths=[['haven','cryptlands'],['haven','spirit'],['cryptlands','forestlands'],['spirit','forestlands'],['spirit','throne'],['forestlands','arcane'],['forestlands','monarch'],['arcane','abyss'],['abyss','throne'],['monarch','arcane']];
const today=()=>new Date().toISOString().slice(0,10);
function svg(tag,attrs,parent){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent?.append(n);return n}
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🌍 Mapa de Shadow Universe'),el('p','Recorre ocho regiones del mundo RPG. Elige una exploración diaria gratuita (UTC), consigue XP y fragmentos y descubre nuevas puertas según tu rango.'));
 const status=el('p','Cargando mapa…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const stats=el('section'),map=el('div'),regionList=el('div'),detail=el('section'),history=el('details');
 map.style.cssText='position:relative;isolation:isolate;width:100%;aspect-ratio:1.45;min-height:260px;border:1px solid #a855f788;border-radius:18px;overflow:hidden;background:radial-gradient(ellipse at 20% 65%,#173c3a 0%,transparent 48%),radial-gradient(ellipse at 72% 26%,#38224e 0%,transparent 55%),#10192b;color:#fff';
 regionList.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr));gap:8px;margin:12px 0';
 detail.style.cssText='padding:14px;border:1px solid #a855f777;border-radius:14px;margin:10px 0';
 host.append(status,stats,map,regionList,detail,history);
 let regions=[],records=[],xp=0,selected='haven',busy=false,loading=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){
 if(loading||!host.isConnected)return;loading=true;
 try{const [a,b,c]=await Promise.all([sb.from('sb_world_regions').select('*').order('min_xp'),sb.from('sb_world_explorations').select('*').eq('user_id',user.id).order('explore_day',{ascending:false}).limit(100),sb.rpc('community_member_xp',{target_member:user.id})]);if(!host.isConnected)return;regions=check(a)||[];records=check(b)||[];xp=Number(check(c)||0);draw();status.textContent=message||'';}catch(e){report(e)}finally{loading=false}
 }
 function draw(){
 const completed=records.find(x=>x.explore_day===today()),visited=new Set(records.map(r=>r.region_id)),unlocked=regions.filter(r=>xp>=r.min_xp).length;
 stats.replaceChildren(el('p','⚡ '+xp.toLocaleString('es-ES')+' XP · '+unlocked+'/'+regions.length+' regiones desbloqueadas · '+visited.size+' visitadas en los últimos 100 registros'),el('p',completed?'✅ Exploración diaria completada':'🟢 Exploración diaria disponible'));
 if(visited.size)stats.append(el('p','🎖️ Viajero de las Sombras'));if(records.some(r=>r.treasure))stats.append(el('p','💎 Buscador de tesoros'));if(visited.size===regions.length&&regions.length)stats.append(el('p','👑 Explorador del universo'));
 map.replaceChildren();
 const art=svg('svg',{viewBox:'0 0 1000 690',preserveAspectRatio:'none','aria-hidden':'true'},map);art.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
 svg('path',{d:'M 0 400 Q 160 220 290 310 T 520 360 T 780 150 T 1000 230 L 1000 690 L 0 690 Z',fill:'#254139',opacity:'.40'},art);
 svg('path',{d:'M 0 100 Q 160 20 340 110 T 620 80 T 1000 120 L 1000 0 L 0 0 Z',fill:'#735187',opacity:'.22'},art);
 svg('path',{d:'M 80 620 Q 260 470 360 510 T 540 620 T 900 440',stroke:'#3e8fa5','stroke-width':18,opacity:'.20',fill:'none'},art);
 for(const [a,b] of paths){const ra=regions.find(x=>x.id===a),rb=regions.find(x=>x.id===b);if(ra&&rb)svg('line',{x1:ra.map_x*10,y1:ra.map_y*6.9,x2:rb.map_x*10,y2:rb.map_y*6.9,stroke:'#c4b5fd','stroke-width':3,'stroke-dasharray':'10 9',opacity:'.65'},art)}
 for(const r of regions){const locked=xp<r.min_xp,b=btn((locked?'🔒':r.symbol)+' '+r.rank_required,()=>choose(r.id));b.title=r.name;b.setAttribute('aria-label',r.name+' · '+(locked?'Bloqueada':'Disponible'));b.setAttribute('aria-pressed',String(selected===r.id));b.style.cssText='position:absolute;left:'+r.map_x+'%;top:'+r.map_y+'%;transform:translate(-50%,-50%);min-height:40px;padding:6px 8px;white-space:nowrap;font-size:clamp(11px,2vw,15px);background:#161b30;border:2px solid '+(colors[r.id]||'#c084fc')+';border-radius:12px;color:#fff;box-shadow:'+(selected===r.id?'0 0 0 3px #ffffffaa,0 0 15px #c084fc':'0 3px 10px #0008')+';opacity:'+(locked?'.7':'1');map.append(b)}
 regionList.replaceChildren();for(const r of regions){const locked=xp<r.min_xp,b=btn((locked?'🔒':r.symbol)+' '+r.name+' · '+r.rank_required,()=>choose(r.id));b.setAttribute('aria-pressed',String(selected===r.id));b.style.cssText='white-space:normal;text-align:left;min-height:48px;'+(selected===r.id?'border-color:#c084fc;':'');regionList.append(b)}
 drawDetail();history.replaceChildren(el('summary','📜 Diario de exploración'));for(const r of records.slice(0,20)){const reg=regions.find(x=>x.id===r.region_id);history.append(el('p',r.explore_day+' · '+(reg?.name||r.region_id)+' · +'+r.xp+' XP · +'+r.shards+' fragmentos'+(r.treasure?' · 💎 Tesoro':'')))}if(!records.length)history.append(el('p','Todavía no has explorado.'));
 }
 function choose(id){selected=id;draw()}
 function drawDetail(){
 const r=regions.find(x=>x.id===selected)||regions[0];if(!r)return;const locked=xp<r.min_xp,completed=records.find(x=>x.explore_day===today());
 detail.replaceChildren(el('h3',r.symbol+' '+r.name),el('p','Rango '+r.rank_required+' · '+r.min_xp.toLocaleString('es-ES')+' XP requeridos'),el('p',r.description),el('p','Recompensa: +'+r.base_xp+' XP y +'+r.base_shards+' fragmentos. 20% de probabilidad de tesoro (+10 XP y +2 fragmentos).'));
 const explore=btn(locked?'🔒 Región bloqueada':completed?'✓ Exploración de hoy realizada':'🧭 Explorar región',async()=>{if(busy||loading)return;if(!confirm('¿Usar tu exploración diaria en '+r.name+'?'))return;busy=true;explore.disabled=true;try{const result=check(await sb.rpc('sb_world_explore',{target_region:r.id}));const e=result.result;await load(result.explored?(e.treasure?'💎 ¡Tesoro encontrado! ':'¡Exploración completada! ')+'+'+e.xp+' XP y +'+e.shards+' fragmentos.':'Ya realizaste tu exploración de hoy.');host.dispatchEvent(new CustomEvent('sb-world-explored',{bubbles:true}));}catch(e){report(e);explore.disabled=false}finally{busy=false}});explore.disabled=locked||!!completed;detail.append(explore);
 if(locked){detail.append(el('p','Te faltan '+(r.min_xp-xp)+' XP para desbloquear esta región.'));return}
 const jump=btn(r.dungeon_id?'🚪 Ir a puerta dimensional':'Ir a '+destinations[r.destination],()=>{const target=document.getElementById(r.dungeon_id?'sb-dungeon-door-'+r.dungeon_id:'sb-shadow-'+r.destination);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}else status.textContent='El destino aún se está cargando. Actualiza la sección e inténtalo de nuevo.'});detail.append(jump);
 }
 host.append(btn('↻ Actualizar mapa',()=>load()));await load();
}
return {mount};
})();