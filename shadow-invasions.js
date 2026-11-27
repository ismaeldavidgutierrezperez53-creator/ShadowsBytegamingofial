/* Shadow Universe 4.0 — community demon invasions */
window.SBInvasions=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const colors={scarlet:'#fb7185',abyss:'#c084fc',eclipse:'#fbbf24'};
const errors={'Admin required':'Solo propietario o administrador.','Weekly invasion already created':'Ya se creó una invasión esta semana UTC.','Invasion already active':'Todavía hay una invasión activa.','Invasion unavailable':'La invasión no está disponible.','Daily attack limit':'Ya realizaste cinco ataques hoy.','Attack cooldown':'Espera 60 segundos entre ataques.','Invasion not won':'Primero hay que vencer todas las oleadas.','Participation required':'Debes haber contribuido al combate.','Account restricted':'Tu cuenta no puede participar.'};
const today=()=>new Date().toISOString().slice(0,10);
const state=r=>r.status==='active'&&Date.parse(r.ends_at)<=Date.now()?'expired':r.status;
const labels={active:'Activa',won:'Victoria',canceled:'Cancelada',expired:'Finalizada sin victoria'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','👹 Invasiones demoníacas · Shadow Universe 4.0'),el('p','Defiende el universo junto a toda la comunidad. Derrotad tres oleadas antes de que cierre el portal. Cada cazador puede atacar cinco veces al día UTC, con 60 segundos de espera. Tras la victoria, los participantes reclaman su recompensa personal.'));
const status=el('p','Cargando invasiones…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const admin=el('section'),list=el('section'),detail=el('section'),ranking=el('details');host.append(status,admin,list,detail,ranking);
let catalog=[],events=[],contrib=[],rewards=[],staff=false,selected=null,busy=false,loading=false,rankRows=[];
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
const mine=id=>contrib.find(x=>x.invasion_id===id);
const claimed=id=>rewards.some(x=>x.invasion_id===id);
async function load(message){
if(loading||!host.isConnected)return;loading=true;
try{
const [a,b,c,d,e]=await Promise.all([sb.from('sb_invasion_catalog').select('*'),sb.from('sb_invasions').select('*').order('starts_at',{ascending:false}).limit(100),sb.from('sb_invasion_contributions').select('*').eq('user_id',user.id).limit(1000),sb.from('sb_invasion_rewards').select('*').eq('user_id',user.id).limit(1000),sb.from('site_staff_roles').select('role,expires_at').eq('user_id',user.id)]);
if(!host.isConnected)return;catalog=check(a)||[];events=check(b)||[];contrib=check(c)||[];rewards=check(d)||[];staff=!e.error&&(e.data||[]).some(x=>['owner','admin'].includes(x.role)&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()));if(!events.some(r=>r.id===selected))selected=(events.find(r=>state(r)==='active')||events[0])?.id;drawAdmin();await loadRank();draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function loadRank(){rankRows=selected?check(await sb.rpc('sb_invasion_ranking',{target_invasion:selected}))||[]:[]}
async function act(fn,message){if(busy||loading)return;busy=true;try{const data=check(await fn());await load(typeof message==='function'?message(data):message);host.dispatchEvent(new CustomEvent('sb-invasion-changed',{bubbles:true}))}catch(e){report(e)}finally{busy=false}}
function drawAdmin(){admin.replaceChildren();if(!staff)return;admin.append(el('h3','🛠️ Administración de invasiones'));const select=el('select');select.setAttribute('aria-label','Tipo de invasión');for(const c of catalog){const o=el('option',c.name+' · '+c.reward_xp+' XP');o.value=c.id;select.append(o)}admin.append(select,btn('Abrir portal de siete días',()=>{if(confirm('¿Crear la invasión comunitaria de esta semana?'))act(()=>sb.rpc('sb_invasion_admin',{action:'create',target_catalog:select.value}),'Invasión creada.')}));}
function draw(){
list.replaceChildren(el('h3','Portales y eventos'));for(const r of events){const c=catalog.find(x=>x.id===r.catalog_id);const b=btn((state(r)==='active'?'🔥 ':state(r)==='won'?'🏆 ':'')+(c?.name||r.catalog_id)+' · '+labels[state(r)],async()=>{if(busy||loading)return;selected=r.id;loading=true;try{await loadRank();draw()}catch(e){report(e)}finally{loading=false}});b.style.cssText='white-space:normal;margin:4px';b.setAttribute('aria-pressed',String(selected===r.id));list.append(b)}
detail.replaceChildren();const r=events.find(x=>x.id===selected),c=catalog.find(x=>x.id===r?.catalog_id);if(!r||!c){detail.append(el('p','No hay invasiones.'));return}
const m=mine(r.id),st=state(r),used=m?.attack_day===today()?m.daily_attacks:0,wait=Math.max(0,Math.ceil((Date.parse(m?.last_attack_at||0)+60000-Date.now())/1000))||0;
detail.style.cssText='padding:14px;margin:12px 0;border:1px solid '+colors[c.id]+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';
detail.append(el('h3','👹 '+c.name),el('p',c.description),el('p',labels[st]+' · Cierre: '+new Date(r.ends_at).toLocaleString('es-ES')));
for(let i=0;i<3;i++){const done=st==='won'||i+1<r.wave;detail.append(el('p',(done?'✅':i+1===r.wave?'⚔️':'🔒')+' Oleada '+(i+1)+' · '+c.wave_names[i]));if(i+1===r.wave&&!done){const p=el('progress');p.max=c.wave_hp[i];p.value=r.hp;p.style.cssText='width:100%;accent-color:#ef4444';p.setAttribute('aria-label',c.wave_names[i]);detail.append(p,el('small',r.hp+'/'+c.wave_hp[i]+' PV'))}}
detail.append(el('p','Tu contribución: '+(m?.damage||0)+' daño · '+(m?.attacks||0)+' ataques'),el('p','🎁 Victoria: +'+c.reward_xp+' XP · '+c.reward_shards+' fragmentos · '+c.reward_crystals+' cristales por participante.'));
if(st==='active'){const attack=btn(used>=5?'Límite diario alcanzado':wait?'Esperar '+wait+' s':'⚔️ Atacar oleada',()=>act(()=>sb.rpc('sb_invasion_attack',{target_invasion:r.id,expected_wave:r.wave,expected_attacks:m?.attacks||0}),d=>d.applied?'¡'+d.damage+' de daño!':'Estado sincronizado; vuelve a atacar.'));attack.disabled=used>=5||wait>0;detail.append(el('p','Ataques hoy: '+used+'/5'),attack);if(staff)detail.append(btn('Cancelar invasión',()=>{if(confirm('¿Cancelar la invasión? No se otorgarán recompensas.'))act(()=>sb.rpc('sb_invasion_admin',{action:'cancel',target_invasion:r.id}),'Invasión cancelada.')}))}
if(st==='won'){const b=btn(claimed(r.id)?'✅ Recompensa reclamada':'🎁 Reclamar recompensa',()=>act(()=>sb.rpc('sb_invasion_claim',{target_invasion:r.id}),'¡Recompensa recibida!'));b.disabled=claimed(r.id)||!m?.damage;detail.append(b);if(!m?.damage)detail.append(el('small','No participaste en esta invasión.'))}
if(rewards.length)detail.append(el('p','🎖️ Defensor del universo · '+rewards.length+' recompensas registradas'));
const open=ranking.open;ranking.replaceChildren(el('summary','🏆 Clasificación de daño · Top 30'));ranking.open=open;const ol=el('ol');for(const x of rankRows)ol.append(el('li',x.display_name+(x.is_me?' (tú)':'')+' · '+x.damage+' daño · '+x.attacks+' ataques'));ranking.append(rankRows.length?ol:el('p','Todavía no hay participantes.'));
}
host.append(btn('↻ Actualizar invasiones',()=>load()));await load();
const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return}if(!busy&&!loading&&!document.hidden&&!host.contains(document.activeElement))load()},15000);
}
return {mount};
})();