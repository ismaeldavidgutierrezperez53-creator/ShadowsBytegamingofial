/* Shadow Universe 4.0 — advanced talent tree */
window.SBTalents=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const branches=[['attack','⚔️ Ataque','#fb7185'],['defense','🛡️ Defensa','#60a5fa'],['magic','🔮 Magia','#c084fc'],['support','💚 Apoyo','#4ade80'],['class','👑 Especialización de clase','#fbbf24']];
const errors={'Account restricted':'Tu cuenta no puede participar.','Rank insufficient':'Necesitas más XP de cazador.','Not enough talent points':'No tienes suficientes puntos.','Prerequisite required':'Aprende primero el talento anterior.','Class required':'Debes elegir la clase correspondiente.','Reset cooldown':'Solo puedes restablecer los talentos cada 24 horas.','Talent revision changed':'Tu árbol cambió. Actualiza antes de continuar.'};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🌳 Árbol de talentos avanzado'),el('p','Consigue 1 punto de talento por cada 200 XP de cazador, hasta 24. Elige talentos pasivos en cuatro ramas y una especialización de clase. No gastas XP de cazador. Las bonificaciones se fijan al comenzar nuevas mazmorras individuales y dimensiones.'));
const status=el('p','Cargando talentos…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const info=el('section'),tree=el('div');tree.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px';host.append(status,info,tree);
let catalog=[],owned=[],settings=null,classes=[],cls=null,xp=0,busy=false,loading=false;
const learned=id=>owned.some(m=>m.talent_id===id),budget=()=>Math.min(24,Math.floor(Math.max(0,xp)/200)),spent=()=>catalog.filter(c=>learned(c.id)).reduce((s,c)=>s+c.cost,0);
const eligible=c=>xp>=c.min_xp&&(!c.class_id||c.class_id===cls);
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f]=await Promise.all([sb.from('sb_talent_catalog').select('*').order('min_xp'),sb.from('sb_member_talents').select('*').eq('user_id',user.id),sb.from('sb_talent_settings').select('*').eq('user_id',user.id).maybeSingle(),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_member_rpg_class').select('class_id').eq('user_id',user.id).maybeSingle(),sb.from('sb_rpg_classes').select('id,name')]);
if(!host.isConnected)return;catalog=check(a)||[];owned=check(b)||[];settings=check(c);xp=Number(check(d)||0);cls=check(e)?.class_id||null;classes=check(f)||[];draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
async function act(action,id=null){if(busy||loading)return;if(action==='reset'&&!confirm('¿Restablecer todos los talentos y recuperar tus puntos disponibles? Solo puedes hacerlo una vez cada 24 horas.'))return;busy=true;try{check(await sb.rpc('sb_talent_manage',{action,target_talent:id,expected_revision:settings?.revision??0}));await load(action==='reset'?'Talentos restablecidos.':'¡Talento aprendido!');}catch(e){if(e.message==='Talent revision changed')await load();report(e)}finally{busy=false}}
function draw(){
const used=spent(),total=budget(),remaining=Math.max(0,total-used),over=used>total,active=over?[]:catalog.filter(c=>learned(c.id)&&eligible(c));
const bonuses=['attack','defense','magic','heal'].map((key,i)=>Math.min([10,5,10,10][i],active.reduce((sum,c)=>sum+c[key],0)));
info.replaceChildren(el('h3','Mis puntos de talento'),el('p',remaining+' disponibles · '+used+' asignados · '+total+'/24 totales'),el('p',xp+' XP · Clase: '+(classes.find(c=>c.id===cls)?.name||'Sin clase')));
const p=el('progress');p.max=24;p.value=total;p.style.width='100%';info.append(p,el('p','Bonificaciones activas: ⚔️ +'+bonuses[0]+' ataque · 🛡️ +'+bonuses[1]+' defensa · 🔮 +'+bonuses[2]+' magia · 💚 +'+bonuses[3]+' curación'));
if(over)info.append(el('p','Tu XP ha bajado. Los talentos quedan suspendidos hasta recuperar los puntos necesarios o restablecer el árbol.'));
if(!cls)info.append(btn('Elegir clase RPG',()=>document.getElementById('sb-shadow-classes')?.scrollIntoView({behavior:'smooth'})));
const next=Date.parse(settings?.last_reset_at||'')+86400000,reset=btn('Restablecer talentos gratis',()=>act('reset'));reset.disabled=!owned.length||next>Date.now();info.append(reset);if(next>Date.now())info.append(el('small','Próximo restablecimiento: '+new Date(next).toLocaleString('es-ES')));
if(owned.length)info.append(el('p','🎖️ Aprendiz de talentos'));if(active.some(c=>c.class_id))info.append(el('p','👑 Maestro de clase'));
tree.replaceChildren();
for(const [branch,label,color] of branches){const column=el('section');column.style.cssText='padding:10px;border:1px solid '+color+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';column.append(el('h3',label));
const nodes=catalog.filter(c=>c.branch===branch);for(const [i,c] of nodes.entries()){const known=learned(c.id),pre=!c.prerequisite||learned(c.prerequisite),allowed=eligible(c),card=el('article');card.style.cssText='padding:10px;margin:6px 0;border:1px solid '+(known?color:'#65566e')+';border-radius:10px;background:#30213d';if(i&&branch!=='class')column.append(el('p','↓'));card.append(el('h4',c.symbol+' '+c.name),el('p',c.description),el('p',c.cost+' puntos · '+c.min_xp+' XP'));
const stats=[['attack','Ataque'],['defense','Defensa'],['magic','Magia'],['heal','Curación']].filter(([k])=>c[k]>0).map(([k,l])=>l+' +'+c[k]).join(' · ');card.append(el('p',stats));if(c.prerequisite)card.append(el('small','Requiere: '+(catalog.find(t=>t.id===c.prerequisite)?.name||c.prerequisite)));if(c.class_id)card.append(el('p','Clase: '+(classes.find(t=>t.id===c.class_id)?.name||c.class_id)));
const b=btn(known?(allowed&&!over?'✓ Aprendido':'Aprendido · Inactivo'):!allowed?'🔒 Requisitos':!pre?'🔒 Talento anterior':remaining<c.cost?'Sin puntos suficientes':'Aprender',()=>act('learn',c.id));b.disabled=known||!allowed||!pre||remaining<c.cost;card.append(b);column.append(card)}
tree.append(column)}
}
host.append(btn('↻ Actualizar talentos',()=>load()));await load();
}
return {mount};
})();