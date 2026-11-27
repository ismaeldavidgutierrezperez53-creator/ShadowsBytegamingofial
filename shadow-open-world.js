/* Shadow Universe 5.0 — open world frontier */
window.SBOpenWorld=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Zone locked':'No cumples los requisitos de esta zona.','Route unavailable':'Debes seguir una ruta conectada.','Zone explored today':'Ya realizaste una actividad en esta zona hoy.','Daily exploration limit':'Ya realizaste tres actividades hoy.','Leave refuge first':'Sal del refugio para explorar.'};
const mats={herb:'hierbas espirituales',ore:'minerales oscuros',essence:'esencias de sombras'};
const today=()=>new Date().toISOString().slice(0,10);
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🌍 Mundos abiertos · La Frontera Infinita'),el('p','Viaja libremente por las rutas conectadas, descubre territorios y elige recolectar o desafiar a sus guardianes. Tres actividades diarias UTC, máximo una por zona. Viajar y volver al refugio es gratis. Las expediciones del mapa original y las dimensiones siguen siendo independientes.'));
const status=el('p','Cargando frontera…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),map=el('div'),detail=el('section'),history=el('details');host.append(status,info,map,detail,history);
let zones=[],routes=[],state=null,discoveries=[],records=[],xp=0,tier=0,busy=false,loading=false;
const zone=id=>zones.find(z=>z.id===id),locked=z=>xp<z.min_xp||tier<z.min_ascension,visited=id=>discoveries.some(d=>d.zone_id===id);
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f,g]=await Promise.all([sb.from('sb_open_world_zones').select('*').order('min_xp'),sb.from('sb_open_world_routes').select('*'),sb.from('sb_open_world_state').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_open_world_discoveries').select('*').eq('user_id',user.id),sb.from('sb_open_world_encounters').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_ascension_trials').select('tier').eq('user_id',user.id).eq('status','won')]);if(!host.isConnected)return;
zones=check(a)||[];routes=check(b)||[];state=check(c);discoveries=check(d)||[];records=check(e)||[];xp=Number(check(f)||0);tier=Math.max(0,...(check(g)||[]).map(x=>x.tier));draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action,target_zone=null){if(busy||loading)return;if(action==='challenge'&&!confirm('¿Desafiar a '+zone(state.zone_id).enemy+'? Una derrota también consume la actividad de esta zona.'))return;busy=true;try{
const r=check(await sb.rpc('sb_open_world_action',{action,target_zone,expected_revision:state?.revision??0}));const e=r.encounter;await load(e?(e.success?'¡Actividad completada!':'Encuentro perdido.')+' +'+e.xp+' XP'+(e.quantity?' · '+e.quantity+' '+mats[e.material_id]:'')+(e.shards?' · '+e.shards+' fragmentos':''):r.applied===false?'Posición sincronizada.':'Ubicación actualizada.');if(e)host.dispatchEvent(new CustomEvent('sb-craft-inventory-changed',{bubbles:true}));
}catch(e){report(e)}finally{busy=false}}
function draw(){
const daily=records.filter(e=>e.day===today()),cur=zone(state?.zone_id||'hub');
info.replaceChildren(el('h3','Mi aventura'),el('p',xp+' XP · Ascensión '+tier+' · '+discoveries.length+'/'+zones.length+' zonas descubiertas'),el('p','Actividades de hoy: '+daily.length+'/3 · Ubicación: '+(cur?.name||'Refugio')));
if(discoveries.length>=2)info.append(el('p','🎖️ Explorador de la frontera'));if(discoveries.length===zones.length&&zones.length)info.append(el('p','👑 Cartógrafo del infinito'));
map.replaceChildren();detail.replaceChildren();
if(!state){detail.append(btn('Comenzar aventura',()=>act('start')));return}
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 400 260');svg.setAttribute('role','img');svg.setAttribute('aria-label','Mapa de rutas de la Frontera Infinita');svg.style.cssText='width:100%;max-height:320px;background:#171124;border-radius:14px';
const shape=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);return n};
const x=z=>20+z.map_x*3.55,y=z=>12+z.map_y*2.45;
for(const r of routes.filter(r=>r.from_zone<r.to_zone)){const a=zone(r.from_zone),b=zone(r.to_zone);if(a&&b)shape('line',{x1:x(a),y1:y(a),x2:x(b),y2:y(b),stroke:locked(a)||locked(b)?'#57485f':'#c084fc','stroke-width':2,'stroke-dasharray':'5 4'});}
for(const z of zones){const here=z.id===state.zone_id;shape('circle',{cx:x(z),cy:y(z),r:here?18:14,fill:here?'#6d28d9':locked(z)?'#302938':'#382449',stroke:here?'#fbbf24':visited(z)?'#4ade80':'#a855f7','stroke-width':2});shape('text',{x:x(z),y:y(z)+5,'font-size':15,'text-anchor':'middle'}).textContent=locked(z)?'🔒':z.symbol;}
map.append(svg);
const cards=el('div');cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:8px;margin-top:10px';
for(const z of zones){const here=z.id===state.zone_id,connected=routes.some(r=>r.from_zone===state.zone_id&&r.to_zone===z.id),blocked=locked(z),card=el('article');card.style.cssText='padding:10px;border-radius:12px;background:#211633;color:#fff;border:1px solid '+(here?'#fbbf24':visited(z)?'#4ade80':'#65566e');card.append(el('h3',z.symbol+' '+z.name),el('small',here?'📍 Estás aquí':blocked?'🔒 '+z.min_xp+' XP · Ascensión '+z.min_ascension:visited(z)?'✓ Descubierta':'Por descubrir'));
if(!here){const b=btn(blocked?'Bloqueada':connected?'Viajar':'Sin ruta directa',()=>act('travel',z.id));b.disabled=blocked||!connected;card.append(b)}cards.append(card)}
map.append(cards);
if(cur){detail.style.cssText='padding:14px;border:1px solid #a855f777;border-radius:14px;margin-top:12px';detail.append(el('h3',cur.symbol+' '+cur.name),el('p',cur.description));if(cur.id!=='hub'){detail.append(btn('↩ Volver al refugio',()=>act('return')));const done=daily.some(e=>e.zone_id===cur.id),disabled=done||daily.length>=3||locked(cur);detail.append(el('p',done?'✓ Actividad completada en esta zona hoy':daily.length>=3?'Límite diario alcanzado':'Elige una actividad:'));const gather=btn('⛏️ Recolectar · '+cur.gather_qty+' '+mats[cur.gather_material]+' / '+cur.reward_xp+' XP',()=>act('gather')),challenge=btn('⚔️ Desafiar '+cur.enemy,()=>act('challenge'));gather.disabled=disabled;challenge.disabled=disabled;detail.append(gather,challenge,el('small','Desafío: 35–95% de éxito según zona, equipamiento, clase y mascota. Victoria: '+(cur.reward_xp+15)+' XP, 1 esencia y '+(1+cur.min_ascension)+' fragmentos. Derrota: 5 XP.'))}else detail.append(el('p','Elige una ruta para comenzar.'))}
const open=history.open;history.replaceChildren(el('summary','📜 Diario de la frontera'));history.open=open;for(const e of records.slice(0,20))history.append(el('p',e.day+' · '+(zone(e.zone_id)?.name||e.zone_id)+' · '+(e.action==='gather'?'Recolección':e.success?'Victoria':'Derrota')+' · +'+e.xp+' XP'+(e.quantity?' · '+e.quantity+' '+mats[e.material_id]:'')+(e.shards?' · '+e.shards+' fragmentos':'')));if(!records.length)history.append(el('p','Todavía no hay encuentros.'));
}
host.append(btn('↻ Actualizar frontera',()=>load()));await load();
}
return {mount};
})();