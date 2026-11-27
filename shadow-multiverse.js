/* Shadow Universe 6.0 — personal universes */
window.SBMultiverse=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const colors={eclipse:['#211033','#a855f7'],nebula:['#092e2c','#34d399'],solar:['#38240d','#fbbf24'],astral:['#102746','#60a5fa'],infinity:['#35203f','#f5d78e']};
const planetColors=['#60a5fa','#fb923c','#34d399','#22d3ee','#c084fc'];
const errors={'Account restricted':'Tu cuenta no puede participar.','Invalid name':'El nombre debe tener entre 3 y 40 caracteres.','Theme locked':'Descubre más planetas para desbloquear el estilo.','Rank insufficient':'Necesitas más XP o una ascensión superior.','Previous planet required':'Coloniza primero los planetas anteriores.','Not enough shards':'No tienes suficientes fragmentos.','Not enough crystals':'No tienes suficientes cristales dimensionales.','Not enough cosmic dust':'No tienes suficiente polvo cósmico.','Maximum level':'Nivel máximo alcanzado.'};
const today=()=>new Date().toISOString().slice(0,10);
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🌌 Shadow Universe 6.0 · La Era del Multiverso'),el('p','Funda tu propio universo privado, coloniza cinco planetas en orden y desarrolla su infraestructura hasta el nivel 3. Personaliza los nombres y el cielo de tu galaxia. Recoge polvo cósmico una vez al día UTC; los días no reclamados no se acumulan.'));
const status=el('p','Cargando universo…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),map=el('div'),style=el('section'),list=el('div'),history=el('details');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px';host.append(status,info,map,style,list,history);
let u=null,catalog=[],themes=[],planets=[],dust=0,shards=0,crystals=0,xp=0,tier=0,harvests=[],busy=false,loading=false;
const owned=id=>planets.find(p=>p.planet_id===id),available=c=>xp>=c.min_xp&&tier>=c.min_ascension,previous=c=>catalog.filter(p=>p.step<c.step).every(p=>owned(p.id)),production=()=>planets.reduce((n,p)=>n+p.level*(catalog.find(c=>c.id===p.planet_id)?.production||0),0);
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f,g,h,i,j]=await Promise.all([sb.from('sb_personal_universes').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_cosmic_planet_catalog').select('*').order('step'),sb.from('sb_cosmic_themes').select('*').order('min_planets'),sb.from('sb_universe_planets').select('*').eq('user_id',user.id),sb.from('sb_cosmic_wallet').select('dust').eq('user_id',user.id).maybeSingle(),sb.from('sb_gear_wallet').select('shards').eq('user_id',user.id).maybeSingle(),sb.from('sb_dimension_wallet').select('crystals').eq('user_id',user.id).maybeSingle(),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_ascension_trials').select('tier').eq('user_id',user.id).eq('status','won'),sb.from('sb_universe_harvests').select('*').eq('user_id',user.id).order('harvest_day',{ascending:false}).limit(30)]);
if(!host.isConnected)return;u=check(a);catalog=check(b)||[];themes=check(c)||[];planets=check(d)||[];dust=check(e)?.dust||0;shards=check(f)?.shards||0;crystals=check(g)?.crystals||0;xp=Number(check(h)||0);tier=Math.max(0,...(check(i)||[]).map(t=>t.tier));harvests=check(j)||[];draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action,target=null,new_name=null){if(busy||loading)return;busy=true;try{const r=check(await sb.rpc('sb_universe_manage',{action,target,new_name,expected_revision:u?.revision??0}));await load(r.applied===false?'Estado sincronizado.':action==='harvest'?'¡Cosecha cósmica! +'+r.harvest.dust+' polvo.':action==='create'?'¡Tu universo ha nacido!':'Universo actualizado.');host.dispatchEvent(new CustomEvent('sb-cosmic-changed',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function nameEditor(value,label,fn){const w=el('div'),i=el('input');i.value=value;i.maxLength=40;i.setAttribute('aria-label',label);const b=btn('Guardar nombre',()=>fn(i.value.trim()));w.append(i,b);return w}
function draw(){
info.replaceChildren();map.replaceChildren();style.replaceChildren();list.replaceChildren();history.replaceChildren();
if(!u){info.append(el('h3','Tu primer universo'),el('p','La fundación y el planeta inicial son gratuitos.'),btn('🌌 Fundar mi universo',()=>act('create')));return}
const claimed=harvests.some(h=>h.harvest_day===today()),theme=themes.find(t=>t.id===u.theme_id),palette=colors[u.theme_id]||colors.eclipse;
info.append(el('h3',u.name),el('p','✨ '+dust+' polvo cósmico · 💎 '+shards+' fragmentos · 💠 '+crystals+' cristales dimensionales'),el('p',planets.length+'/5 planetas · '+xp+' XP · Ascensión '+tier),el('p','Producción: '+production()+' polvo cósmico al día'),nameEditor(u.name,'Nombre del universo',n=>act('rename',null,n)));
const harvest=btn(claimed?'✓ Cosecha diaria realizada':'✨ Recoger '+production()+' polvo cósmico',()=>act('harvest'));harvest.disabled=claimed;info.append(harvest);
if(planets.length>=2)info.append(el('p','🎖️ Fundador estelar'));if(planets.length===5)info.append(el('p','👑 Creador de universos'));if(planets.length===5&&planets.every(p=>p.level===3))info.append(el('p','🌌 Arquitecto del multiverso'));
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 420 280');svg.setAttribute('role','img');svg.setAttribute('aria-label','Mapa de tu sistema planetario');svg.style.cssText='width:100%;max-height:340px;background:'+palette[0]+';border-radius:14px';
const shape=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);return n};
for(let i=0;i<70;i++)shape('circle',{cx:(i*73)%410+5,cy:(i*41)%270+5,r:i%7===0?1.8:.7,fill:palette[1],opacity:.5});
shape('circle',{cx:210,cy:140,r:28,fill:palette[1],opacity:.15});shape('circle',{cx:210,cy:140,r:14,fill:palette[1]});
for(const [i,c] of catalog.entries()){const p=owned(c.id),rx=45+i*28,ry=28+i*18,theta=i*1.7+.25,x=210+rx*Math.cos(theta),y=140+ry*Math.sin(theta);shape('ellipse',{cx:210,cy:140,rx,ry,fill:'none',stroke:palette[1],'stroke-width':.7,opacity:.4});shape('circle',{cx:x,cy:y,r:p?10+p.level*2:9,fill:p?planetColors[i]:'#493d58',stroke:p?'#fff':'#81728e','stroke-width':1});shape('text',{x,y:y+4,'font-size':12,'text-anchor':'middle'}).textContent=p?c.symbol:'🔒';shape('text',{x,y:y+25,'font-size':11,'text-anchor':'middle',fill:'#fff'}).textContent=String(c.step)}
map.append(svg,el('p','Estilo: '+(theme?.name||'Eclipse púrpura')));
style.append(el('h3','🎨 Apariencia del universo'));for(const t of themes){const b=btn(t.symbol+' '+t.name+(u.theme_id===t.id?' ✓':planets.length<t.min_planets?' 🔒':''),()=>act('theme',t.id));b.disabled=u.theme_id===t.id||planets.length<t.min_planets;b.title='Requiere '+t.min_planets+' planetas';style.append(b)}
for(const c of catalog){const p=owned(c.id),color=planetColors[c.step-1],card=el('article');card.style.cssText='padding:12px;border-radius:14px;border:1px solid '+color+';background:'+palette[0]+';color:white;overflow-wrap:anywhere';const icon=el('div',c.symbol);icon.style.cssText='font-size:44px;text-align:center';card.append(icon,el('h3',c.step+'. '+(p?.name||c.name)),el('p',c.description),el('p',c.min_xp+' XP · Ascensión '+c.min_ascension));
if(p){card.append(el('p','Infraestructura '+p.level+'/3 · '+p.level*c.production+' polvo/día'),nameEditor(p.name,'Nombre de '+c.name,n=>act('rename_planet',c.id,n)));const b=btn(p.level===3?'Nivel máximo':'Mejorar · '+3*p.level+' 💎 / '+2*p.level+' ✨',()=>{if(confirm('¿Mejorar este planeta?'))act('upgrade',c.id)});b.disabled=p.level===3||!available(c)||shards<3*p.level||dust<2*p.level;card.append(b)}
else{card.append(el('p','Coste: '+c.shard_cost+' 💎 · '+c.crystal_cost+' 💠 · '+c.dust_cost+' ✨'));const b=btn(!previous(c)?'🔒 Planeta anterior':!available(c)?'🔒 Requisitos':'Colonizar',()=>{if(confirm('¿Colonizar '+c.name+' por los recursos indicados?'))act('colonize',c.id)});b.disabled=!previous(c)||!available(c)||shards<c.shard_cost||crystals<c.crystal_cost||dust<c.dust_cost;card.append(b)}list.append(card)}
history.append(el('summary','📜 Últimas 30 cosechas'));for(const h of harvests)history.append(el('p',h.harvest_day+' · +'+h.dust+' polvo cósmico'));if(!harvests.length)history.append(el('p','Todavía no hay cosechas.'));
}
host.append(btn('↻ Actualizar universo',()=>load()));await load();
}
return {mount};
})();