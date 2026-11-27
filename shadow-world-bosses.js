/* Shadow Universe — cooperative world bosses. All attacks and rewards are server-authoritative. */
window.SBWorldBosses=(()=>{
'use strict';
const difficulties={normal:['Normal','🟢',1200,100],hard:['Difícil','🟣',3000,200],legendary:['Legendario','🟡',6000,350]};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const fmt=n=>Number(n).toLocaleString('es-ES');
const stateOf=b=>b.canceled_at?'Cancelado':b.hp===0?'Derrotado':Date.parse(b.ends_at)<=Date.now()?'Expirado':Date.parse(b.starts_at)>Date.now()?'Próximo':'Activo';
const panel=()=>{const n=el('section');n.style.cssText='padding:14px;margin:12px 0;border:1px solid #a855f777;border-radius:14px;overflow-wrap:anywhere';return n};
const friendly=e=>({'Wait 60 seconds between attacks':'Espera 60 segundos entre ataques.','Daily limit reached':'Has alcanzado el límite de hoy.','Boss not active':'Este jefe ya no está activo.','Account restricted':'Tu cuenta no puede participar.','Admin required':'No tienes permisos de administración.'}[e.message]||e.message||'Error de conexión');
async function mount(host,user){
 if(!host||!host.isConnected)return;
 host.replaceChildren(el('h2','👹 Jefes mundiales'),el('p','Une fuerzas con los cazadores de Shadow Universe. La vida del jefe es compartida. Dispones de 5 ataques por jefe y día (UTC), con 60 segundos entre ataques.'));
 const status=el('p','Cargando jefes…');status.setAttribute('role','status');host.append(status);
 const toolbar=el('div'),adminArea=el('div'),list=el('div');host.append(toolbar,adminArea,list);
 let busy=false,version=0,refreshing=false,openRanks=new Set();
 toolbar.append(button('↻ Actualizar jefes',()=>load()));
 try{
 const role=check(await sb.from('site_staff_roles').select('role').eq('user_id',user.id).maybeSingle())?.role;
 const admin=['owner','admin'].includes(role);if(!host.isConnected)return;
 if(admin)toolbar.append(button('➕ Crear jefe mundial',()=>{adminArea.replaceChildren();const box=panel(),form=el('form'),name=el('input'),desc=el('textarea'),difficulty=el('select');name.required=true;name.minLength=3;name.maxLength=60;desc.maxLength=300;desc.rows=2;for(const [k,v] of Object.entries(difficulties)){const opt=el('option',v[0]+' · '+fmt(v[2])+' PV · '+v[3]+' XP');opt.value=k;difficulty.append(opt)}const field=(label,input)=>{const l=el('label',label);input.style.cssText='display:block;width:100%;margin:8px 0';l.append(input);return l};const save=el('button','Activar durante 7 días','gradient-btn mini');save.type='submit';const msg=el('p');msg.setAttribute('role','status');form.append(field('Nombre',name),field('Descripción',desc),field('Dificultad',difficulty),save,button('Cerrar',()=>adminArea.replaceChildren()),msg);box.append(el('h3','Administración de jefes'),form);adminArea.append(box);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{check(await sb.rpc('sb_boss_create',{boss_name:name.value.trim(),boss_description:desc.value.trim(),boss_difficulty:difficulty.value}));adminArea.replaceChildren();await load('Jefe creado correctamente.')}catch(e){msg.textContent=friendly(e);save.disabled=false}}}));
 async function load(message){
 if(refreshing){return}refreshing=true;const seq=++version;
 try{
 const [br,cr,rr]=await Promise.all([sb.from('sb_world_bosses').select('id,name,description,difficulty,max_hp,hp,reward_xp,starts_at,ends_at,defeated_at,canceled_at').order('starts_at',{ascending:false}).limit(50),sb.from('sb_world_boss_contributions').select('boss_id,damage,attacks,last_attack_at,attack_day,daily_attacks').eq('user_id',user.id),sb.from('sb_world_boss_rewards').select('boss_id,xp').eq('user_id',user.id)]);
 const bosses=check(br)||[],contrib=Object.fromEntries((check(cr)||[]).map(x=>[x.boss_id,x])),rewards=Object.fromEntries((check(rr)||[]).map(x=>[x.boss_id,x.xp]));
 if(!host.isConnected||seq!==version)return;
 status.textContent=message||'Vida y recompensas sincronizadas con el servidor.';
 list.replaceChildren();const total=Object.values(rewards).reduce((a,b)=>a+Number(b),0);list.append(el('p','🏆 XP por jefes: '+fmt(total)+' · Victorias con recompensa: '+Object.keys(rewards).length));
 if(total>0)list.append(el('p','🎖️ Cazador de jefes desbloqueado'));if(Object.keys(rewards).length>=5)list.append(el('p','👑 Leyenda de las incursiones desbloqueada'));
 const sorted=bosses.sort((a,b)=>Number(stateOf(b)==='Activo')-Number(stateOf(a)==='Activo'));
 for(const b of sorted){
 const c=contrib[b.id],state=stateOf(b),difficulty=difficulties[b.difficulty]||difficulties.normal,box=panel();box.style.background='linear-gradient(145deg,#21132f,#15111e)';
 const title=el('h3','👹 '+b.name);title.style.color='#f5d0fe';box.append(title,el('p',difficulty[1]+' '+difficulty[0]+' · '+state),el('p',b.description||'Incursión mundial'));
 const bar=el('progress');bar.max=b.max_hp;bar.value=b.hp;bar.style.cssText='width:100%;height:20px;accent-color:#ef4444';bar.setAttribute('aria-label','Vida del jefe');box.append(bar,el('p',fmt(b.hp)+' / '+fmt(b.max_hp)+' PV · '+Math.round(100*b.hp/b.max_hp)+'%'),el('p','Recompensa al derrotarlo: +'+b.reward_xp+' XP por participante'),el('small','Finaliza: '+new Date(b.ends_at).toLocaleString('es-ES')));
 const today=new Date().toISOString().slice(0,10),used=c?.attack_day===today?c.daily_attacks:0;const cooldown=c?Math.max(0,Math.ceil((Date.parse(c.last_attack_at)+60000-Date.now())/1000)):0;
 box.append(el('p','Tu daño: '+fmt(c?.damage||0)+' · Ataques hoy: '+used+'/5'));
 if(rewards[b.id])box.append(el('p','✅ Recompensa recibida: +'+rewards[b.id]+' XP'));
 const action=button(state==='Activo'?'⚔️ Atacar jefe':state,async()=>{if(busy)return;busy=true;action.disabled=true;try{const result=check(await sb.rpc('sb_boss_attack',{target_boss:b.id}));await load(result.defeated?'🎉 ¡Jefe derrotado! Recompensas entregadas automáticamente.':'⚔️ Has causado '+fmt(result.damage)+' de daño.')}catch(e){status.textContent=friendly(e);action.disabled=false}finally{busy=false}});
 action.disabled=state!=='Activo'||used>=5||cooldown>0;const countdown=el('small',cooldown>0?' · Espera '+cooldown+' s':'');box.append(action,countdown);
 if(state==='Activo'&&used<5&&cooldown>0){const timer=setInterval(()=>{if(!box.isConnected){clearInterval(timer);return}const left=Math.max(0,Math.ceil((Date.parse(c.last_attack_at)+60000-Date.now())/1000));countdown.textContent=left?' · Espera '+left+' s':'';if(!left){action.disabled=stateOf(b)!=='Activo';clearInterval(timer)}},1000)}
 const ranking=el('div');const rankBtn=button('🏆 Ranking de daño',async()=>{if(openRanks.has(b.id)){openRanks.delete(b.id);ranking.replaceChildren();return}openRanks.add(b.id);await showRank()});
 async function showRank(){ranking.replaceChildren(el('p','Cargando ranking…'));try{const rows=check(await sb.rpc('sb_boss_ranking',{target_boss:b.id}))||[];if(!openRanks.has(b.id)||!ranking.isConnected)return;ranking.replaceChildren();const ol=el('ol');for(const row of rows)ol.append(el('li',row.display_name+' · '+fmt(row.damage)+' de daño · '+row.attacks+' ataques'));ranking.append(rows.length?ol:el('p','Aún no hay participantes.'))}catch(e){ranking.textContent=friendly(e)}}
 box.append(rankBtn,ranking);if(admin&&state==='Activo')box.append(button('Cancelar incursión',async()=>{if(!confirm('¿Cancelar este jefe sin repartir XP?'))return;try{const ok=check(await sb.rpc('sb_boss_cancel',{target_boss:b.id}));await load(ok?'Incursión cancelada.':'La incursión ya no está activa.')}catch(e){status.textContent=friendly(e)}}));list.append(box);if(openRanks.has(b.id))showRank();
 }
 if(!bosses.length)list.append(el('p','Todavía no hay jefes mundiales.'));
 }catch(e){status.textContent='No se pudieron cargar los jefes: '+friendly(e)}finally{refreshing=false}
 }
 await load();
 const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return}if(!busy&&!document.hidden)load()},20000);
 }catch(e){status.textContent='No se pudo iniciar el apartado: '+friendly(e);toolbar.append(button('Reintentar',()=>mount(host,user)))}
}
return {mount};
})();