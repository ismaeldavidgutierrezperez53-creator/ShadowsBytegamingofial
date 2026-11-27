/* Shadow Universe 3.0 — cooperative dungeon rooms. */
window.SBCoopDungeons=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Necesitas un perfil público y una cuenta habilitada.','Already in room':'Ya estás en una sala activa.','Daily attempt used':'Ya iniciaste una expedición cooperativa hoy.','Rank insufficient':'No tienes el rango requerido.','Invalid invitation':'Código incorrecto o sala caducada.','Room full':'La sala ya tiene cuatro jugadores.','Room unavailable':'Sala no disponible.','Team unavailable':'Algún integrante ya no cumple los requisitos o hay un bloqueo entre jugadores.','Need 2 to 4 players':'Necesitas entre dos y cuatro integrantes.','Wait for team':'Espera a que los demás actúen.','Summon unavailable':'No puedes invocar otra vez.'};
const states={lobby:'En espera',active:'En combate',won:'Victoria',lost:'Derrota',canceled:'Cancelada'};
const day=()=>new Date().toISOString().slice(0,10);
const classes={warrior:'Guerrero',guardian:'Guardián',mage:'Hechicero',healer:'Sanador',assassin:'Asesino'};
const friendly=e=>errors[e.message]||e.message||'Error de conexión';
function bar(label,value,max,color){const w=el('div');w.append(el('p',label+' · '+value+'/'+max+' PV'));const p=el('progress');p.max=Math.max(1,max);p.value=value;p.style.cssText='width:100%;height:18px;accent-color:'+color;p.setAttribute('aria-label',label);w.append(p);return w}
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🏰 Mazmorras multijugador'),el('p','Forma un equipo de 2–4 cazadores mediante un código privado. Una expedición iniciada por día UTC; las salas y los combates caducan a las 24 horas. Necesitas un perfil público.'));
 const status=el('p','Cargando…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const controls=el('section'),battle=el('section'),history=el('details'),rank=el('details');host.append(status,controls,battle,history,rank);
 let catalog=[],records=[],xp=0,active=null,busy=false,loading=false,selected='',codeDraft='';
 const report=e=>{status.textContent=friendly(e)};
 async function load(message,full=true){
 if(loading||!host.isConnected)return;loading=true;
 try{
 if(full){const [a,b,c]=await Promise.all([sb.from('sb_coop_catalog').select('*').order('min_xp'),sb.from('sb_coop_members').select('*,sb_coop_rooms(*)').eq('user_id',user.id).order('joined_at',{ascending:false}).limit(100),sb.rpc('community_member_xp',{target_member:user.id})]);catalog=check(a)||[];records=check(b)||[];xp=Number(check(c)||0)}
 const current=records.find(m=>['lobby','active'].includes(m.sb_coop_rooms?.status)&&Date.parse(m.sb_coop_rooms.expires_at)>Date.now());
 if(current){const state=check(await sb.rpc('sb_coop_state',{target_room:current.room_id}));active=['lobby','active'].includes(state.room.status)&&Date.parse(state.room.expires_at)>Date.now()?state:null;if(!active&& !full){loading=false;return load(message,true)}}
 else active=null;
 if(!host.isConnected)return;draw();if(full)await drawRank();status.textContent=message||'';
 }catch(e){report(e)}finally{loading=false}
 }
 async function action(fn,message){if(busy||loading)return;busy=true;try{await fn();await load(message,true)}catch(e){report(e)}finally{busy=false}}
 function lobby(actionName,dungeon=null,room=null,code=null){return checkRpc('sb_coop_lobby',{action:actionName,target_dungeon:dungeon,target_room:room,invite_code:code})}
 async function checkRpc(name,args){return check(await sb.rpc(name,args))}
 function draw(){
 controls.replaceChildren();battle.replaceChildren();const used=records.some(m=>m.play_day===day());
 if(!active){
 controls.append(el('h3','Crear o unirse a una sala'),el('p',used?'Ya utilizaste tu expedición de hoy.':'🟢 Expedición diaria disponible · '+xp+' XP'));
 const select=el('select');select.setAttribute('aria-label','Mazmorra cooperativa');for(const d of catalog){const o=el('option',d.name+' · Rango '+d.rank_required+' · '+d.reward_xp+' XP');o.value=d.id;o.disabled=xp<d.min_xp;select.append(o)}if(catalog.some(d=>d.id===selected&&xp>=d.min_xp))select.value=selected;select.onchange=()=>{selected=select.value};
 const create=btn('Crear sala privada',()=>action(()=>lobby('create',select.value),'Sala creada. Comparte el código.'));create.disabled=used||!catalog.some(d=>xp>=d.min_xp);controls.append(select,create);
 const input=el('input');input.placeholder='Código de invitación';input.setAttribute('aria-label','Código de invitación');input.maxLength=36;input.value=codeDraft;input.oninput=()=>{codeDraft=input.value};
 const join=btn('Unirme a sala',()=>{const c=input.value.trim();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)){status.textContent='Introduce un código de invitación válido.';return}action(async()=>{await lobby('join',null,null,c);codeDraft=''},'Te has unido al equipo.')});join.disabled=used;controls.append(input,join);
 }else{
 const {room:r,members,code}=active,d=catalog.find(x=>x.id===r.dungeon_id),own=members.find(m=>m.user_id===user.id),leader=r.owner_id===user.id;
 battle.append(el('h3',d?.name||'Mazmorra'),el('p',states[r.status]+' · '+members.length+'/4 cazadores · Caduca '+new Date(r.expires_at).toLocaleString('es-ES')));
 if(r.status==='lobby'){
 if(leader&&code){const codeInput=el('input');codeInput.value=code;codeInput.readOnly=true;codeInput.setAttribute('aria-label','Código privado');battle.append(el('p','Envía este código a tus compañeros.'),codeInput,btn('Copiar código',async()=>{try{await navigator.clipboard.writeText(code);status.textContent='Código copiado.'}catch{codeInput.select();status.textContent='Selecciona y copia el código.'}}));}
 if(leader){const start=btn('Comenzar combate',()=>{if(confirm('¿Iniciar la expedición diaria de todo el equipo?'))action(()=>lobby('start',null,r.id),'¡Comienza el combate!')});start.disabled=members.length<2;battle.append(start)}
 battle.append(btn(leader?'Cancelar sala':'Salir de sala',()=>{if(confirm('¿Salir de esta sala?'))action(()=>lobby('leave',null,r.id),'Sala abandonada.')}));
 }else{
 battle.append(el('h3',d?.boss||'Jefe'),bar('Jefe',r.boss_hp,r.boss_max_hp,'#ef4444'),bar('Vida del equipo',r.team_hp,r.team_max_hp,'#22c55e'),el('p','Ronda '+r.round_no+'/12 · '+r.last_event));
 const ready=own&&own.last_round<r.round_no;
 battle.append(el('p',ready?'🟢 Es tu turno.':'⌛ Esperando a tus compañeros.'));
 const buttons=el('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
 for(const [move,label] of [['attack','⚔️ Atacar'],['magic','🔮 Magia'],['heal','💚 Curar equipo'],['guard','🛡️ Defender'],['summon','🌑 Invocar sombras']]){const b=btn(label,()=>action(()=>checkRpc('sb_coop_turn',{target_room:r.id,expected_version:r.version,move}),'Estado sincronizado.'));b.disabled=!ready||move==='summon'&&(!own?.army||own.army_used);buttons.append(b)}battle.append(buttons);
 if(leader)battle.append(btn('Cancelar expedición',()=>{if(confirm('¿Cancelar? La expedición diaria ya se ha consumido.'))action(()=>lobby('cancel',null,r.id),'Expedición cancelada.')}));
 }
 const roster=el('div');roster.append(el('h3','👥 Cazadores'));for(const m of members){roster.append(el('p',(m.user_id===r.owner_id?'👑 ':'')+m.display_name+(m.class_id?' · '+(classes[m.class_id]||m.class_id):'')+(r.status==='active'?' · '+(m.last_round===r.round_no?'✓ Turno realizado':'Turno pendiente')+' · '+m.damage+' daño':'')))}battle.append(roster)
 }
 const wasOpen=history.open;history.replaceChildren(el('summary','📜 Mis expediciones'));history.open=wasOpen;
 for(const m of records){const r=m.sb_coop_rooms;if(!r)continue;const d=catalog.find(x=>x.id===r.dungeon_id);if(['lobby','active'].includes(r.status)&&Date.parse(r.expires_at)>Date.now())continue;history.append(el('p',(d?.name||r.dungeon_id)+' · '+(['lobby','active'].includes(r.status)?'Caducada':states[r.status])+' · '+m.damage+' daño · +'+m.xp+' XP · +'+m.shards+' fragmentos'))}
 if(records.some(m=>m.xp>0))history.append(el('p','🎖️ Cazador cooperativo'));if(!records.length)history.append(el('p','Todavía no hay expediciones.'));
 }
 async function drawRank(){try{const rows=check(await sb.rpc('sb_coop_ranking'))||[];const wasOpen=rank.open;rank.replaceChildren(el('summary','🏆 Mejores equipos · clasificación anónima'));rank.open=wasOpen;const ol=el('ol');for(const x of rows)ol.append(el('li',x.dungeon_name+' · '+x.team_size+' cazadores · '+x.rounds+' rondas'));rank.append(rows.length?ol:el('p','Aún no hay victorias registradas.'))}catch(e){rank.replaceChildren(el('summary','🏆 Clasificación'),el('p',friendly(e)))}}
 host.append(btn('↻ Actualizar cooperativo',()=>load()));await load();
 const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return}if(!busy&&!loading&&!document.hidden)load(undefined,!active)},8000);
}
return {mount};
})();