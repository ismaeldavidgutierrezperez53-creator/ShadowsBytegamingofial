/* Shadow Universe 5.0 — professions */
window.SBProfessions=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Specialization cooldown':'Puedes cambiar de especialización cada 24 horas.','Profession level insufficient':'Todavía no alcanzaste ese nivel.'};
const order=['miner','herbalist','smith','alchemist','tamer','enchanter','explorer','merchant'];
const colors=['#94a3b8','#4ade80','#fbbf24','#fb7185','#fb923c','#c084fc','#67e8f9','#60a5fa'];
const today=()=>new Date().toISOString().slice(0,10);
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','⚒️ Gremio de profesiones · Shadow Universe 5.0'),el('p','Desarrolla ocho profesiones mediante actividades del juego. Cada 100 XP de profesión aumenta un nivel, hasta el nivel 10 (900 XP). Especialízate en una para ganar +5 XP por actividad válida, dentro de su límite diario UTC. No se consume experiencia de cazador. Solo cuentan las actividades realizadas desde esta actualización.'));
const status=el('p','Cargando profesiones…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px';host.append(status,info,list);
let catalog=[],progress=[],settings=null,rewards=[],wallet=0,busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
const owned=id=>progress.find(x=>x.profession_id===id);
const level=id=>1+Math.floor((owned(id)?.xp||0)/100);
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e]=await Promise.all([sb.from('sb_profession_catalog').select('*'),sb.from('sb_member_professions').select('*').eq('user_id',user.id),sb.from('sb_profession_settings').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_profession_rewards').select('*').eq('user_id',user.id),sb.from('sb_gear_wallet').select('shards').eq('user_id',user.id).maybeSingle()]);
if(!host.isConnected)return;catalog=(check(a)||[]).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));progress=check(b)||[];settings=check(c);rewards=check(d)||[];wallet=check(e)?.shards||0;draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action,id,milestone=null){if(busy||loading)return;if(action==='specialize'&&!confirm('¿Elegir '+catalog.find(c=>c.id===id).name+' como especialización? Podrás cambiarla después de 24 horas.'))return;busy=true;try{const r=check(await sb.rpc('sb_profession_manage',{action,target_profession:id,milestone}));await load(action==='claim'?'¡Recompensa recibida! +'+r.shards+' fragmentos.':'Especialización actualizada.');}catch(e){report(e)}finally{busy=false}}
function draw(){
const spec=catalog.find(c=>c.id===settings?.profession_id),next=Date.parse(settings?.chosen_at||'')+86400000;
info.replaceChildren(el('h3','Mi progreso profesional'),el('p','💎 '+wallet+' fragmentos · '+progress.filter(x=>x.xp>0).length+'/8 profesiones iniciadas'),el('p','Especialización: '+(spec?spec.symbol+' '+spec.name:'Sin elegir')+(spec?' · +5 XP por actividad válida':'')),el('p',progress.filter(x=>x.xp>=900).length+'/8 profesiones dominadas'));
if(next>Date.now())info.append(el('small','Próximo cambio de especialización: '+new Date(next).toLocaleString('es-ES')));
if(progress.some(x=>x.xp>=200))info.append(el('p','🎖️ Profesional de la frontera'));if(progress.some(x=>x.xp>=900))info.append(el('p','🏆 Maestro de oficio'));if(catalog.length===8&&progress.filter(x=>x.xp>=900).length===8)info.append(el('p','👑 Gran maestro de profesiones'));
list.replaceChildren();for(const c of catalog){const r=owned(c.id),xp=r?.xp||0,lv=level(c.id),daily=r?.xp_day===today()?r.daily_xp:0,color=colors[order.indexOf(c.id)]||'#a855f7',selected=settings?.profession_id===c.id,card=el('article');card.style.cssText='padding:12px;border:1px solid '+color+';border-radius:14px;background:#211633;color:white;overflow-wrap:anywhere';
const icon=el('div',c.symbol);icon.style.cssText='font-size:40px;text-align:center';card.append(icon,el('h3',c.name+(selected?' · Especialista':'')),el('p',c.description),el('p','Nivel '+lv+'/10 · '+xp+'/900 XP'));
const p=el('progress');p.max=100;p.value=lv===10?100:xp%100;p.style.cssText='width:100%;accent-color:'+color;p.setAttribute('aria-label','Progreso al siguiente nivel');card.append(p,el('p','XP hoy: '+daily+'/'+c.daily_cap));
const b=btn(selected?'✓ Especialización activa':'Especializarme',()=>act('specialize',c.id));b.disabled=selected||next>Date.now();card.append(b,el('h4','Recompensas de nivel'));
for(const m of [3,5,10]){const done=rewards.some(x=>x.profession_id===c.id&&x.milestone===m),b=btn(done?'✓ Nivel '+m+' reclamado':'Nivel '+m+' · '+m+' 💎',()=>act('claim',c.id,m));b.disabled=done||lv<m;card.append(b)}list.append(card)}
}
host.append(btn('↻ Actualizar profesiones',()=>load()));await load();
}
return {mount};
})();