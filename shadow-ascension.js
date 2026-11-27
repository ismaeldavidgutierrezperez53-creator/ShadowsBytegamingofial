/* Shadow Universe 3.0 — awakening and ascension */
window.SBAscension=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(text,fn)=>{const b=el('button',text);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Requirements insufficient':'Todavía no cumples los requisitos.','Previous trial required':'Completa la prueba anterior.','Choose class':'Elige primero una clase RPG.','Retry cooldown':'Espera 10 minutos desde tu derrota.','No power charges':'No quedan cargas de poder.'};
const titles={warrior:['Guerrero del Eclipse','Guerrero imperial','Guerrero eterno'],guardian:['Guardián del Eclipse','Guardián imperial','Guardián eterno'],mage:['Hechicero del Eclipse','Hechicero imperial','Hechicero eterno'],healer:['Sanador del Eclipse','Sanador imperial','Sanador eterno'],assassin:['Asesino del Eclipse','Asesino imperial','Asesino eterno']};
const colors=['#c084fc','#fbbf24','#fb7185'],icons=['⚡','👑','🌌'];
function bar(label,hp,max,color){const w=el('div'),p=el('progress');p.max=max;p.value=hp;p.style.cssText='width:100%;height:16px;accent-color:'+color;p.setAttribute('aria-label',label);w.append(el('p',label+' · '+hp+'/'+max+' PV'),p);return w}
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','⚡ Despertar y ascensión'),el('p','Supera las tres pruebas del Eclipse y despierta tu poder. La ascensión es permanente para tu cuenta, sin perder XP ni equipamiento. Los títulos de clase cambian con tu clase activa.'));
const status=el('p','Cargando ascensiones…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),list=el('div'),detail=el('section');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px';detail.style.cssText='padding:14px;margin:12px 0;border:1px solid #a855f777;border-radius:14px';host.append(status,info,list,detail);
let catalog=[],records=[],xp=0,story=0,dungeons=0,coop=0,cls=null,selected=null,busy=false,loading=false;
const record=n=>records.find(x=>x.tier===n),tier=()=>Math.max(0,...records.filter(x=>x.status==='won').map(x=>x.tier));
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
function requirements(c){return [['XP de cazador',xp,c.min_xp],['Capítulos completados',story,c.story_wins],['Victorias individuales',dungeons,c.dungeon_wins],['Victorias cooperativas con participación',coop,c.coop_wins]].filter(x=>x[2]>0)}
function ready(c){return !!cls&&tier()===c.tier-1&&requirements(c).every(x=>x[1]>=x[2])}
async function load(message){
if(loading||!host.isConnected)return;loading=true;
try{const [a,b,c,d,e,f,g]=await Promise.all([sb.from('sb_ascension_catalog').select('*').order('tier'),sb.from('sb_ascension_trials').select('*').eq('user_id',user.id),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_story_progress').select('chapter_no',{count:'exact',head:true}).eq('user_id',user.id).eq('status','won'),sb.from('sb_dungeon_runs').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('status','won'),sb.from('sb_coop_members').select('room_id,sb_coop_rooms!inner(status)',{count:'exact',head:true}).eq('user_id',user.id).gt('actions',0).eq('sb_coop_rooms.status','won'),sb.from('sb_member_rpg_class').select('class_id').eq('user_id',user.id).maybeSingle()]);
if(!host.isConnected)return;catalog=check(a)||[];records=check(b)||[];xp=Number(check(c)||0);check(d);check(e);check(f);story=d.count||0;dungeons=e.count||0;coop=f.count||0;cls=check(g)?.class_id||null;if(selected===null)selected=Math.min(3,tier()+1);draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
async function act(c,r,action){if(busy||loading)return;busy=true;try{const data=check(await sb.rpc('sb_ascension_action',{target_tier:c.tier,expected_version:r?.version??0,action}));records=records.filter(x=>x.tier!==data.tier);records.push(data);draw();status.textContent=data.status==='won'?'¡Ascensión conseguida! +'+data.shards+' fragmentos.':'';if(data.status==='won')host.dispatchEvent(new CustomEvent('sb-ascension-changed',{bubbles:true}))}catch(e){report(e)}finally{busy=false}}
function draw(){
const t=tier(),current=catalog.find(c=>c.tier===t);info.replaceChildren(el('h3',current?icons[t-1]+' '+current.title:'Cazador sin despertar'),el('p','Ascensión '+t+'/3 · '+xp+' XP de cazador'));
if(t){info.append(el('p','Transformación: '+(titles[cls]?.[t-1]||current.title)),el('p','⚔️ +'+(2*t)+' ataque · 🛡️ '+t+' reducción de daño en nuevas mazmorras, historia, cooperativo y PvP (adaptados a sus reglas).'),el('p','⚡ Técnica del Eclipse: '+(60+10*t)+' daño base, una vez por nueva mazmorra individual.'))}
if(!cls)info.append(btn('Elegir clase RPG',()=>document.getElementById('sb-shadow-classes')?.scrollIntoView({behavior:'smooth'})));
list.replaceChildren();for(const c of catalog){const r=record(c.tier),card=el('article');card.style.cssText='padding:12px;border:1px solid '+colors[c.tier-1]+';border-radius:14px;background:#211633;color:#fff';card.append(el('h3',icons[c.tier-1]+' '+c.title),el('p',r?.status==='won'?'✅ Superada':r?.status==='active'?'En curso':ready(c)?'Disponible':'🔒 Bloqueada'));for(const [label,n,max] of requirements(c))card.append(el('p',(n>=max?'✓ ':'')+label+': '+Math.min(n,max)+'/'+max));card.append(btn('Ver prueba',()=>{selected=c.tier;draw()}));list.append(card)}
detail.replaceChildren();const c=catalog.find(x=>x.tier===selected);if(!c)return;const r=record(c.tier);detail.append(el('h3',icons[c.tier-1]+' Prueba: '+c.boss),el('p','Recompensa: '+c.title+' · +'+c.shards+' fragmentos.'));
if(!r){const b=btn(ready(c)?'Comenzar prueba':'Requisitos pendientes',()=>act(c,null,'start'));b.disabled=!ready(c);detail.append(b);return}
if(r.status==='won'){detail.append(el('p','🏆 Prueba superada. Bonificación permanente desbloqueada.'));return}
if(r.status==='lost'){const b=btn('Reintentar',()=>act(c,r,'retry'));b.disabled=Date.parse(r.finished_at)+600000>Date.now()||!ready(c);detail.append(el('p',r.last_event),b);return}
detail.append(bar('Tu vida',r.player_hp,100,'#22c55e'),bar(c.boss,r.boss_hp,c.boss_hp,'#ef4444'),el('p','Turno '+r.turn_no+'/25 · Poderes '+r.power_left+'/2'),el('p',r.last_event));
const power=btn('🔮 Poder ('+(60+r.attack+r.magic)+' daño)',()=>act(c,r,'power'));power.disabled=!r.power_left;detail.append(btn('⚔️ Atacar ('+(35+r.attack)+' daño)',()=>act(c,r,'attack')),btn('🛡️ Defender (+'+(20+r.heal)+' PV)',()=>act(c,r,'guard')),power);
}
host.append(btn('↻ Actualizar ascensión',()=>load()));await load();
}
return {mount};
})();