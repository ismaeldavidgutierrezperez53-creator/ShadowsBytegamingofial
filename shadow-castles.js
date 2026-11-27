/* Shadow Universe 4.0 — personal castles */
window.SBCastles=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const buildings=[['throne','👑','Sala del trono','Determina el nivel máximo de los edificios.'],['tower','🔮','Torre de magia','Produce esencias de sombras.'],['sanctuary','🐲','Santuario de criaturas','Produce hierbas espirituales.'],['mine','⛏️','Mina de cristal','Produce fragmentos de forja.'],['walls','🛡️','Murallas','Reduce el daño de nuevas expediciones individuales y dimensionales.']];
const palettes={shadow:['#211633','#a855f7'],moon:['#182d42','#93c5fd'],flame:['#481f21','#fb923c'],astral:['#20204e','#67e8f9'],divine:['#453526','#fbbf24']};
const errors={'Account restricted':'Tu cuenta no puede participar.','Invalid castle name':'Usa un nombre de 3 a 40 caracteres.','Decoration locked':'Decoración bloqueada.','Rank insufficient':'Necesitas más XP de cazador.','Throne level required':'Mejora primero la sala del trono.','Not enough shards':'No tienes suficientes fragmentos.','Not enough crystals':'No tienes suficientes cristales.','Build production first':'Construye primero un edificio de producción.','Maximum level':'Nivel máximo alcanzado.'};
const today=()=>new Date().toISOString().slice(0,10);
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🏰 Mi castillo · Shadow Universe 4.0'),el('p','Funda gratis tu castillo personal. Mejora sus cinco edificios, cambia su nombre y su decoración. Recoge recursos una vez al día UTC; las cosechas no se acumulan si no las reclamas.'));
const status=el('p','Cargando castillo…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),preview=el('section'),list=el('div'),decor=el('section'),history=el('details');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,205px),1fr));gap:10px';host.append(status,info,preview,list,decor,history);
let castle=null,styles=[],harvests=[],xp=0,shards=0,crystals=0,busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f]=await Promise.all([sb.from('sb_castles').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_castle_decor').select('*').order('min_level'),sb.from('sb_castle_harvests').select('*').eq('user_id',user.id).order('harvest_day',{ascending:false}).limit(30),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_gear_wallet').select('shards').eq('user_id',user.id).maybeSingle(),sb.from('sb_dimension_wallet').select('crystals').eq('user_id',user.id).maybeSingle()]);
if(!host.isConnected)return;castle=check(a);styles=check(b)||[];harvests=check(c)||[];xp=Number(check(d)||0);shards=Number(check(e)?.shards||0);crystals=Number(check(f)?.crystals||0);draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
async function act(action,target=null,expected_level=null){if(busy||loading)return;busy=true;try{const r=check(await (action==='harvest'?sb.rpc('sb_castle_harvest'):sb.rpc('sb_castle_manage',{action,target,expected_level})));await load(action==='harvest'?'Recogida registrada: +'+r.shards+' fragmentos, +'+r.herbs+' hierbas, +'+r.essences+' esencias.':'Castillo actualizado.');host.dispatchEvent(new CustomEvent('sb-craft-inventory-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function draw(){
info.replaceChildren(el('p','💎 '+shards+' fragmentos · 💠 '+crystals+' cristales · '+xp+' XP'));
preview.replaceChildren();list.replaceChildren();decor.replaceChildren();history.replaceChildren();
if(!castle){info.append(btn('🏰 Fundar castillo gratis',()=>act('create')));return}
const [bg,accent]=palettes[castle.decor_id]||palettes.shadow,style=styles.find(s=>s.id===castle.decor_id);
preview.style.cssText='background:'+bg+';color:white;border:1px solid '+accent+';border-radius:16px;padding:16px;text-align:center;margin:10px 0';
const title=el('h3',castle.name+' · Nivel '+castle.throne+'/5'),sky=el('div',(style?.symbol||'🌑')+' ✦ '+(style?.symbol||'🌑'));sky.style.cssText='font-size:28px;color:'+accent;
const scene=el('div','🏰');scene.style.cssText='font-size:84px;line-height:1.2;filter:drop-shadow(0 0 12px '+accent+')';
preview.append(sky,scene,title,el('p','Estilo: '+(style?.name||'Sombras')));
const mini=el('div');mini.style.cssText='display:flex;justify-content:center;flex-wrap:wrap;gap:10px';for(const [key,icon,name] of buildings){const tile=el('div',icon+' '+castle[key]+'/5');tile.title=name;mini.append(tile)}preview.append(mini);
const nameInput=el('input');nameInput.value=castle.name;nameInput.maxLength=40;nameInput.setAttribute('aria-label','Nombre del castillo');preview.append(nameInput,btn('Guardar nombre',()=>act('rename',nameInput.value)));
const already=harvests.some(h=>h.harvest_day===today());info.append(el('h3','Producción diaria'),el('p','💎 '+castle.mine+' fragmentos · 🌿 '+2*castle.sanctuary+' hierbas · 🔮 '+castle.tower+' esencias'),el('p','🛡️ Protección: '+Math.floor((castle.walls+1)/2)+' de reducción de daño'));
const claim=btn(already?'✓ Recursos recogidos hoy':'Recoger recursos',()=>act('harvest'));claim.disabled=already||castle.mine+castle.sanctuary+castle.tower===0;info.append(claim);
info.append(el('p','🎖️ Señor del castillo'));if(castle.throne===5)info.append(el('p','👑 Monarca constructor'));if(buildings.every(([k])=>castle[k]===5))info.append(el('p','🏆 Fortaleza perfecta'));
for(const [k,icon,name,description] of buildings){const lv=castle[k],isThrone=k==='throne',cost=(isThrone?5:3)*(lv+1),cc=isThrone&&lv>=3?lv-2:0,req=isThrone?([0,100,400,1600,4900][lv]||0):0;
const card=el('article');card.style.cssText='padding:14px;border:1px solid '+accent+';border-radius:14px;background:'+bg+';color:white;overflow-wrap:anywhere';card.append(el('h3',icon+' '+name),el('p',lv===0?'Sin construir':'Nivel '+lv+'/5'),el('p',description));
const p=el('progress');p.max=5;p.value=lv;p.style.width='100%';card.append(p);
if(lv<5){const b=btn((lv===0?'Construir':'Mejorar')+' · '+cost+' 💎'+(cc?' / '+cc+' 💠':''),()=>{if(confirm('¿'+(lv===0?'Construir ':'Mejorar ')+name+' por '+cost+' fragmentos'+(cc?' y '+cc+' cristales':'')+'?'))act('upgrade',k,lv)});b.disabled=shards<cost||crystals<cc||xp<req||!isThrone&&lv>=castle.throne;card.append(b);if(req)card.append(el('small','Requiere '+req+' XP.'));if(!isThrone&&lv>=castle.throne)card.append(el('small','Mejora primero el trono.'))}else card.append(el('p','Nivel máximo'));list.append(card)}
decor.append(el('h3','🎨 Decoraciones'));for(const s of styles){const b=btn(s.symbol+' '+s.name+(castle.decor_id===s.id?' · Activa':' · Nivel '+s.min_level),()=>act('decorate',s.id));b.disabled=castle.throne<s.min_level||castle.decor_id===s.id;decor.append(b)}
history.append(el('summary','📜 Últimas recogidas'));for(const h of harvests)history.append(el('p',h.harvest_day+' · '+h.shards+' fragmentos · '+h.herbs+' hierbas · '+h.essences+' esencias'));if(!harvests.length)history.append(el('p','Todavía no has recogido recursos.'));
}
host.append(btn('↻ Actualizar castillo',()=>load()));await load();
}
return {mount};
})();