/* Shadow Universe 5.0 — temporal journeys */
window.SBTemporal=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const colors=['#fbbf24','#c084fc','#67e8f9','#fb7185','#a78bfa'];
const errors={'Account restricted':'Tu cuenta no puede participar.','Era locked':'No cumples los requisitos de esta época.','Expedition unavailable':'La expedición ya no está disponible.','Choose path first':'Elige una ruta primero.','No power charges':'No quedan cargas de poder.','Rewind already used':'Ya utilizaste el retroceso temporal.','Full health':'Ya tienes toda la vida.','Not enough time crystals':'Necesitas un cristal del tiempo.'};
const week=()=>{const d=new Date();d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)};
function bar(name,value,max,color){const w=el('div'),p=el('progress');p.max=max;p.value=value;p.style.cssText='width:100%;accent-color:'+color;p.setAttribute('aria-label',name);w.append(el('p',name+' · '+value+'/'+max+' PV'),p);return w}
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','⌛ Portales temporales · Shadow Universe 5.0'),el('p','Viaja a cinco épocas ficticias. Elige una ruta narrativa y derrota a su guardián en combate por turnos. Una expedición por época y semana UTC, desde el lunes. Tu equipo, mascota, clase, ascensión, habilidades y reliquia equipada se fijan al iniciar cada viaje.'));
const status=el('p','Cargando portales…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const info=el('section'),list=el('div'),detail=el('section'),history=el('details');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px';host.append(status,info,list,detail,history);
let eras=[],runs=[],wins=[],wallet=0,xp=0,tier=0,selected=null,busy=false,loading=false;
const own=id=>runs.find(r=>r.era_id===id),locked=c=>xp<c.min_xp||tier<c.min_ascension;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
async function load(message){if(loading||!host.isConnected)return;loading=true;try{
const [a,b,c,d,e,f,g]=await Promise.all([sb.from('sb_temporal_eras').select('*').order('min_xp'),sb.from('sb_temporal_runs').select('*').eq('user_id',user.id).eq('week_start',week()),sb.from('sb_temporal_wallet').select('crystals').eq('user_id',user.id).maybeSingle(),sb.rpc('community_member_xp',{target_member:user.id}),sb.from('sb_ascension_trials').select('tier').eq('user_id',user.id).eq('status','won'),sb.from('sb_temporal_runs').select('era_id,choice').eq('user_id',user.id).eq('status','won'),sb.from('sb_temporal_runs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30)]);
if(!host.isConnected)return;eras=check(a)||[];runs=check(b)||[];wallet=check(c)?.crystals||0;xp=Number(check(d)||0);tier=Math.max(0,...(check(e)||[]).map(x=>x.tier));wins=check(f)||[];records=check(g)||[];if(!eras.some(c=>c.id===selected))selected=eras[0]?.id;draw();status.textContent=message||'';
}catch(e){report(e)}finally{loading=false}}
let records=[];
async function act(action,c,r){if(busy||loading)return;if(action==='rewind'&&!confirm('¿Gastar un cristal del tiempo para recuperar hasta 40 PV sin represalia?'))return;busy=true;try{
const result=check(await (action==='start'?sb.rpc('sb_temporal_start',{target_era:c.id}):sb.rpc('sb_temporal_turn',{target_run:r.id,expected_version:r.version,action})));
await load(result.last_event);if(result.status==='won')host.dispatchEvent(new CustomEvent('sb-temporal-won',{bubbles:true}));
}catch(e){report(e)}finally{busy=false}}
function draw(){
const distinct=new Set(wins.map(r=>r.era_id)),both=eras.filter(c=>wins.some(r=>r.era_id===c.id&&r.choice==='a')&&wins.some(r=>r.era_id===c.id&&r.choice==='b')).length;
info.replaceChildren(el('h3','Mi crónica temporal'),el('p','⌛ '+wallet+' cristales del tiempo · '+xp+' XP · Ascensión '+tier),el('p',distinct.size+'/'+eras.length+' épocas conquistadas · '+both+'/'+eras.length+' épocas con ambos finales'));
if(distinct.size)info.append(el('p','🎖️ Viajero del tiempo'));if(eras.length&&distinct.size===eras.length)info.append(el('p','👑 Guardián del tiempo'));if(eras.length&&both===eras.length)info.append(el('p','🌌 Cronista de todas las realidades'));
list.replaceChildren();for(const [i,c] of eras.entries()){const r=own(c.id),color=colors[i%colors.length],card=el('article');card.style.cssText='padding:12px;border:1px solid '+color+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';
const icon=el('div',c.symbol);icon.style.cssText='font-size:42px;text-align:center';card.append(icon,el('h3',c.name),el('p',c.min_xp+' XP · Ascensión '+c.min_ascension),el('p','Jefe: '+c.boss),el('p','🎁 '+c.reward_xp+' XP · '+c.reward_shards+' fragmentos · '+c.reward_time+' cristales del tiempo'),el('p',r?({decision:'Decisión pendiente',active:'En combate',won:'✓ Victoria semanal',lost:'Derrota semanal'}[r.status]):locked(c)?'🔒 Bloqueada':'Disponible'));
const b=btn(selected===c.id?'Portal seleccionado':'Ver portal',()=>{selected=c.id;draw()});b.disabled=selected===c.id;card.append(b);list.append(card)}
detail.replaceChildren();const c=eras.find(c=>c.id===selected);if(c){const r=own(c.id);detail.style.cssText='padding:14px;border:1px solid #a855f7;border-radius:14px;margin:12px 0';detail.append(el('h3',c.symbol+' '+c.name),el('p',c.intro));
if(!r){const b=btn('⌛ Abrir portal',()=>act('start',c,null));b.disabled=locked(c);detail.append(b)}
else if(r.status==='decision'){detail.append(el('h4','Elige tu historia'),btn(c.choice_a+' · +3 defensa',()=>act('a',c,r)),btn(c.choice_b+' · -25 PV del jefe',()=>act('b',c,r)))}
else if(r.status==='active'){detail.append(el('h4','⚔️ '+c.boss),el('p','Ruta: '+(r.choice==='a'?c.choice_a:c.choice_b)),bar('Tu vida',r.player_hp,100,'#4ade80'),bar('Jefe',r.boss_hp,c.boss_hp,'#fb7185'),el('p','Poderes: '+r.power_left+'/2 · Turnos: '+(r.version-1)+'/25'),el('p',r.last_event),btn('Atacar · '+(35+r.attack)+' daño',()=>act('attack',c,r)),btn('Defender · +'+(20+r.heal)+' PV',()=>act('guard',c,r)));const p=btn('Poder · '+(60+r.attack+r.magic)+' daño',()=>act('power',c,r));p.disabled=!r.power_left;const b=btn(r.rewind_used?'Retroceso utilizado':'⌛ Retroceso · +40 PV / 1 cristal',()=>act('rewind',c,r));b.disabled=r.rewind_used||wallet<1||r.player_hp===100;detail.append(p,b)}
else detail.append(el('h4',r.status==='won'?'🏆 Línea temporal restaurada':'Expedición perdida'),el('p',r.last_event),el('p',r.status==='won'?'+'+r.xp+' XP · '+r.shards+' fragmentos · '+r.time_crystals+' cristales del tiempo':'Vuelve el próximo lunes UTC.'),el('p','Puedes elegir otra ruta la próxima semana.'))}
const open=history.open;history.replaceChildren(el('summary','📜 Diario de viajes · últimos 30'));history.open=open;for(const r of records){const c=eras.find(c=>c.id===r.era_id);history.append(el('p',r.week_start+' · '+(c?.name||r.era_id)+' · '+(r.status==='won'?'Victoria':r.status==='lost'?'Derrota':'Sin terminar')+(r.choice?' · Ruta '+r.choice.toUpperCase():'')))}
if(!records.length)history.append(el('p','Todavía no has viajado.'));
}
host.append(btn('↻ Actualizar portales',()=>load()));await load();
}
return {mount};
})();