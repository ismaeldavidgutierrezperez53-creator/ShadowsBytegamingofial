/* Shadow Universe 5.0 — Infinite Tower */
window.SBTower=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Floor unavailable':'Este piso no está disponible.','Daily record limit':'Ya superaste diez pisos nuevos hoy.','More hunter XP required':'Necesitas más XP de cazador para continuar.','No power charges':'No quedan cargas de poder.','Summit reached':'Has llegado al límite técnico de la torre.'};
const today=()=>new Date().toISOString().slice(0,10);
const enemy=f=>f%5===0?['Guardián de las sombras','Titán de cristal','Soberano del abismo','Custodio del infinito'][Math.floor((f/5-1)%4)]:['Centinela espectral','Bestia de obsidiana','Caballero del vacío','Espectro astral'][(f-1)%4];
function bar(name,value,max,color){const w=el('div'),p=el('progress');p.max=max;p.value=value;p.setAttribute('aria-label',name);p.style.cssText='width:100%;accent-color:'+color;w.append(el('p',name+' · '+value+'/'+max+' PV'),p);return w}
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','🗼 Torre Infinita · Shadow Universe 5.0'),el('p','Asciende piso a piso con combates individuales por turnos. Un jefe cada cinco pisos. Comienza un ascenso diario UTC desde tu último punto de control; al superar un jefe recuperas toda la vida al continuar. Otros pisos recuperan 25 PV. Puedes superar hasta diez pisos de récord por día. El equipo, mascota, clase, ascensión y habilidades seleccionadas se fijan al iniciar el ascenso.'));
const status=el('p','Cargando torre…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),scene=el('section'),combat=el('section'),ranking=el('details'),history=el('details');host.append(status,info,scene,combat,ranking,history);
let run=null,progress=null,rewards=[],monthly=null,rows=[],monthMode=false,xp=0,busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f]=await Promise.all([sb.from('sb_tower_runs').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_tower_progress').select('*').eq('user_id',user.id).maybeSingle(),sb.from('sb_tower_rewards').select('*').eq('user_id',user.id).order('floor_no',{ascending:false}).limit(30),sb.from('sb_tower_monthly').select('*').eq('user_id',user.id).eq('month_start',today().slice(0,7)+'-01').maybeSingle(),sb.rpc('sb_tower_ranking',{monthly:monthMode}),sb.rpc('community_member_xp',{target_member:user.id})]);
if(!host.isConnected)return;run=check(a);progress=check(b);rewards=check(c)||[];monthly=check(d);rows=check(e)||[];xp=Number(check(f)||0);draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
async function act(action){if(busy||loading)return;busy=true;try{const r=check(await sb.rpc('sb_tower_action',{action,expected_version:run?.version??0}));await load(r.applied?r.run?.last_event||'Actualizado.':'Estado sincronizado.');if(r.run?.status==='cleared'||r.run?.status==='summit')host.dispatchEvent(new CustomEvent('sb-tower-cleared',{bubbles:true}));}catch(e){report(e)}finally{busy=false}}
function draw(){
const best=progress?.best_floor||0,checkpoint=progress?.checkpoint||1,current=run?.run_day===today(),floor=current?run.floor_no:checkpoint,limit=10+Math.floor(xp/150),newToday=rewards.filter(x=>x.cleared_at?.slice(0,10)===today()).length;
info.replaceChildren(el('h3','Mi récord de ascenso'),el('p','🏆 Piso histórico '+best+' · Récord mensual '+(monthly?.best_floor||0)),el('p','🚩 Punto de control: '+checkpoint+' · Acceso por XP: hasta piso '+limit),el('p','Nuevos récords hoy: '+newToday+'/10'));
if(best>=5)info.append(el('p','🎖️ Escalador de sombras'));if(best>=25)info.append(el('p','🏆 Maestro de la torre'));if(best>=50)info.append(el('p','👑 Soberano de las alturas'));
scene.replaceChildren();scene.style.cssText='padding:12px;border-radius:14px;background:linear-gradient(#211633,#151022);color:#fff;text-align:center';
scene.append(el('h3','🗼 Piso '+floor));for(let f=Math.min(floor+3,100000);f>=Math.max(1,floor-2);f--){const tile=el('div',(f%5===0?'👹 ':'✦ ')+'Piso '+f+(f===floor?' · Aquí':f<=best?' · Superado':''));tile.style.cssText='padding:8px;margin:4px auto;max-width:280px;border:1px solid '+(f===floor?'#fbbf24':f%5===0?'#fb7185':'#65566e')+';border-radius:8px;background:'+(f===floor?'#4c1d95':'#30213d');scene.append(tile)}
combat.replaceChildren();combat.style.cssText='padding:14px;border:1px solid #a855f777;border-radius:14px;margin:10px 0';
if(!current){const b=btn('🚩 Iniciar ascenso desde piso '+checkpoint,()=>act('start'));b.disabled=checkpoint>limit;combat.append(b);if(b.disabled)combat.append(el('p','Necesitas más XP para alcanzar tu punto de control.'))}
else if(run.status==='active'){combat.append(el('h3',(floor%5===0?'👹 JEFE · ':'⚔️ ')+enemy(floor)),bar('Tu vida',run.player_hp,100,'#22c55e'),bar('Enemigo',run.enemy_hp,run.enemy_max_hp,'#ef4444'),el('p','Turno '+run.turn_no+'/25 · Poderes '+run.power_left+'/2'),el('p',run.last_event),btn('⚔️ Atacar · '+(35+run.attack)+' daño',()=>act('attack')),btn('🛡️ Defender · +'+(20+run.heal)+' PV',()=>act('guard')));const power=btn('🔮 Poder · '+(60+run.attack+run.magic)+' daño',()=>act('power'));power.disabled=!run.power_left;combat.append(power)}
else if(run.status==='cleared'){combat.append(el('h3','✅ Piso superado'),el('p',run.last_event));const b=btn('⬆️ Subir al piso '+(floor+1),()=>act('next'));b.disabled=newToday>=10||floor+1>limit;combat.append(b);if(b.disabled)combat.append(el('p',newToday>=10?'Límite diario de récords alcanzado. Regresa mañana UTC.':'Necesitas más XP de cazador para subir.'))}
else combat.append(el('h3',run.status==='summit'?'👑 Cumbre alcanzada':'Ascenso terminado'),el('p',run.last_event),el('p','Vuelve mañana UTC desde tu punto de control.'));
combat.append(el('small','Nuevos récords: +12 XP y 1 fragmento por piso; cada quinto piso +35 XP y 3 fragmentos; cada décimo piso añade 1 cristal. Los pisos repetidos no dan recursos.'));
const ro=ranking.open;ranking.replaceChildren(el('summary','🏆 Clasificación de la torre · Top 30'));ranking.open=ro;const modes=el('div');for(const [flag,name] of [[false,'Histórica'],[true,'Este mes']]){const b=btn(name,()=>{monthMode=flag;load()});b.disabled=monthMode===flag;modes.append(b)}ranking.append(modes);const ol=el('ol');for(const x of rows)ol.append(el('li',x.display_name+(x.is_me?' (tú)':'')+' · Piso '+x.best_floor));ranking.append(rows.length?ol:el('p','Sin récords todavía.'));
const ho=history.open;history.replaceChildren(el('summary','📜 Últimos 30 récords'));history.open=ho;for(const r of rewards)history.append(el('p','Piso '+r.floor_no+' · +'+r.xp+' XP · '+r.shards+' fragmentos'+(r.crystals?' · '+r.crystals+' cristales':'')));if(!rewards.length)history.append(el('p','Todavía no has superado pisos.'));
}
host.append(btn('↻ Actualizar torre',()=>load()));await load();
}
return {mount};
})();