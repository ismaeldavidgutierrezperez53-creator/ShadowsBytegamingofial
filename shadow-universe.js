/* Shadow Universe V2 — guild directory and existing community XP. */
window.SBShadowUniverse=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,action)=>{const n=el('button',text,'gradient-btn mini');n.type='button';n.onclick=action;return n};
const rankRules=[[0,'E'],[100,'D'],[400,'C'],[900,'B'],[1600,'A'],[2500,'S'],[4900,'Monarca de las Sombras']];
const panel=()=>{const n=el('section',undefined,'profile-panel');n.style.cssText='padding:18px;margin:16px 0;border:1px solid #a855f777;border-radius:16px;overflow-wrap:anywhere';return n};
const checked=r=>{if(r.error)throw r.error;return r.data};
const ranks={member:'Miembro',veteran:'Veterano',captain:'Capitán'};
async function names(ids){if(!ids.length)return {};const r=await sb.from('profiles').select('id,display_name,username').in('id',[...new Set(ids)]);return Object.fromEntries((r.data||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));}
async function manage(card,g,user){
 const area=panel();card.append(area);area.append(el('h4','👥 Gestionar miembros'));
 const status=el('p');status.setAttribute('role','status');const list=el('div');area.append(status,list);
 async function load(){try{status.textContent='Cargando…';const members=checked(await sb.from('sb_shadow_guild_members').select('user_id,guild_rank').eq('guild_id',g.id).limit(100))||[];const labels=await names(members.map(m=>m.user_id));if(!area.isConnected)return;list.replaceChildren();status.textContent=members.length+' miembros (máximo 100 visibles).';for(const m of members){const row=el('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0';const label=el('span',labels[m.user_id]||'Miembro '+m.user_id.slice(0,8));const select=el('select');select.setAttribute('aria-label','Rango de '+label.textContent);for(const [key,title] of Object.entries(ranks)){const opt=el('option',title);opt.value=key;select.append(opt)}select.value=m.guild_rank;select.onchange=async()=>{select.disabled=true;try{checked(await sb.from('sb_shadow_guild_members').update({guild_rank:select.value}).eq('guild_id',g.id).eq('user_id',m.user_id).select('user_id').single());status.textContent='Rango actualizado.'}catch(e){status.textContent=e.message;select.value=m.guild_rank}finally{select.disabled=false}};const remove=button('Expulsar',async()=>{if(!confirm('¿Expulsar a este miembro? Podrá volver a solicitar acceso uniéndose de nuevo.'))return;remove.disabled=true;try{checked(await sb.from('sb_shadow_guild_members').delete().eq('guild_id',g.id).eq('user_id',m.user_id).select('user_id').single());await load()}catch(e){status.textContent=e.message;remove.disabled=false}});row.append(label,select,remove);list.append(row)}}catch(e){status.textContent=e.message}}
 area.append(button('Actualizar miembros',load));await load();
}
function chat(card,g,user){
 const area=panel();card.append(area);area.append(el('h4','💬 Chat privado de gremio'));
 const list=el('div');list.style.cssText='max-height:300px;overflow:auto';const status=el('p');status.setAttribute('role','status');
 const form=el('form');const input=el('textarea');input.required=true;input.maxLength=1000;input.rows=2;input.placeholder='Escribe un mensaje';input.setAttribute('aria-label','Mensaje de gremio');input.style.width='100%';const send=el('button','Enviar','gradient-btn mini');send.type='submit';form.append(input,send);
 async function load(){try{status.textContent='Cargando mensajes…';const messages=checked(await sb.from('sb_shadow_guild_messages').select('id,author_id,body,created_at').eq('guild_id',g.id).order('created_at',{ascending:false}).limit(50))||[];const labels=await names(messages.map(m=>m.author_id));if(!area.isConnected)return;list.replaceChildren();for(const m of messages.reverse()){const row=el('div');row.style.cssText='border-bottom:1px solid #ffffff22;padding:8px';row.append(el('strong',labels[m.author_id]||'Miembro'),el('small',' · '+new Date(m.created_at).toLocaleString('es-ES')),el('p',m.body));if(m.author_id===user.id||g.owner_id===user.id)row.append(button('Eliminar',async()=>{if(!confirm('¿Eliminar mensaje?'))return;try{checked(await sb.from('sb_shadow_guild_messages').delete().eq('id',m.id).select('id').single());await load()}catch(e){status.textContent=e.message}}));list.append(row)}if(!messages.length)list.append(el('p','Aún no hay mensajes.'));status.textContent='Últimos 50 mensajes. Pulsa Actualizar para recibir nuevos.';list.scrollTop=list.scrollHeight}catch(e){status.textContent=e.message}}
 form.onsubmit=async e=>{e.preventDefault();const body=input.value.trim();if(!body)return;send.disabled=true;try{checked(await sb.from('sb_shadow_guild_messages').insert({guild_id:g.id,body}));input.value='';await load()}catch(e){status.textContent=e.message}finally{send.disabled=false}};
 area.append(button('Actualizar chat',load),list,form,status);load();
}
async function mount(){
 const root=document.getElementById('sb-shadow-universe');if(!root)return;
 root.replaceChildren(el('p','Cargando Shadow Universe…'));
 try{
  const {data,error}=await sb.auth.getSession();if(error)throw error;if(!root.isConnected)return;
  const user=data.session?.user;
  if(!user){const a=el('a','Iniciar sesión','gradient-btn mini');a.href='#/auth';root.replaceChildren(el('p','Inicia sesión para acceder a tu rango y a los gremios.'),a);return}
  const [xpResult,guildResult,memberResult]=await Promise.all([
    sb.rpc('community_member_xp',{target_member:user.id}),
    sb.from('sb_shadow_guilds').select('id,owner_id,name,description,shield').order('name').limit(100),
    sb.from('sb_shadow_guild_members').select('guild_id,user_id,guild_rank').eq('user_id',user.id)
  ]);
  if(!root.isConnected)return;
  const guilds=checked(guildResult)||[], memberships=checked(memberResult)||[],joined=new Set(memberships.map(x=>x.guild_id));
  root.replaceChildren();
  const stats=panel();stats.append(el('h2','⚔️ Mi rango RPG'));
  if(xpResult.error||xpResult.data===null||!Number.isFinite(Number(xpResult.data))){stats.append(el('p','No se pudo consultar tu XP.'))}
  else{const xp=Math.max(0,Number(xpResult.data));const i=rankRules.reduce((idx,r,j)=>xp>=r[0]?j:idx,0);const next=rankRules[i+1];stats.append(el('h3','Rango '+rankRules[i][1]),el('p','Nivel '+(Math.floor(Math.sqrt(xp/100))+1)+' · '+xp+' XP de comunidad'));if(next){const bar=el('progress');bar.max=next[0]-rankRules[i][0];bar.value=xp-rankRules[i][0];bar.style.width='100%';stats.append(bar,el('p','Próximo rango: '+next[1]+' · faltan '+(next[0]-xp)+' XP'));}}
  const mission=el('a','📜 Misiones, recompensas y niveles','outline-btn mini');mission.href='#/logros';stats.append(mission);root.append(stats);
  const coop=panel();coop.id='sb-shadow-coop';root.append(coop);if(window.SBCoopDungeons){window.SBCoopDungeons.mount(coop,user)}else{coop.append(el('p','Actualiza la aplicación para acceder a las mazmorras multijugador.'))}
  const army=panel();army.id='sb-shadow-army';root.append(army);if(window.SBShadowArmy){window.SBShadowArmy.mount(army,user)}else{army.append(el('p','Actualiza la aplicación para acceder al ejército de sombras.'))}
  const classes=panel();classes.id='sb-shadow-classes';root.append(classes);if(window.SBRPGClasses){window.SBRPGClasses.mount(classes,user)}else{classes.append(el('p','Actualiza la aplicación para acceder a las clases RPG.'))}
  const world=panel();world.id='sb-shadow-world-map';root.append(world);if(window.SBWorldMap){window.SBWorldMap.mount(world,user)}else{world.append(el('p','Actualiza la aplicación para acceder al mapa.'))}
  const pvp=panel();pvp.id='sb-shadow-pvp';root.append(pvp);if(window.SBPvP){window.SBPvP.mount(pvp,user)}else{pvp.append(el('p','Actualiza la aplicación para acceder a la arena PvP.'))}
  const gear=panel();gear.id='sb-shadow-gear';root.append(gear);if(window.SBGear){window.SBGear.mount(gear,user)}else{gear.append(el('p','Actualiza la aplicación para acceder al equipamiento.'))}
  const skills=panel();skills.id='sb-shadow-skills';root.append(skills);if(window.SBSkills){window.SBSkills.mount(skills,user)}else{skills.append(el('p','Actualiza la aplicación para acceder a las habilidades.'))}
  const pets=panel();pets.id='sb-shadow-pets';root.append(pets);if(window.SBPets){window.SBPets.mount(pets,user)}else{pets.append(el('p','Actualiza la aplicación para acceder a las mascotas.'))}
  const wars=panel();wars.id='sb-shadow-wars';root.append(wars);if(window.SBGuildWars){window.SBGuildWars.mount(wars,user)}else{wars.append(el('p','Actualiza la aplicación para acceder a las guerras de gremios.'))}
  const dungeons=panel();dungeons.id='sb-shadow-dungeons';root.append(dungeons);if(window.SBDungeons){window.SBDungeons.mount(dungeons,user)}else{dungeons.append(el('p','Actualiza la aplicación para acceder a las mazmorras.'))}
  const arcade=panel();arcade.id='sb-shadow-arcade';root.append(arcade);if(window.SBArcade){window.SBArcade.mount(arcade,user)}else{arcade.append(el('p','Actualiza la aplicación para acceder a Shadow Arcade.'))}
  const bosses=panel();bosses.id='sb-shadow-bosses';root.append(bosses);if(window.SBWorldBosses){window.SBWorldBosses.mount(bosses,user)}else{bosses.append(el('p','Actualiza la aplicación para acceder a jefes mundiales.'))}
  const cards=panel();cards.id='sb-shadow-cards';root.append(cards);if(window.SBShadowCards){window.SBShadowCards.mount(cards,user)}else{cards.append(el('p','El álbum no se pudo cargar. Actualiza la aplicación.'))}
  const ownResult=await sb.from('sb_shadow_guilds').select('id,owner_id,name,description,shield').eq('owner_id',user.id).maybeSingle();const own=checked(ownResult);if(!root.isConnected)return;
  const editor=panel();editor.append(el('h2',own?'🛡️ Administrar mi gremio':'🛡️ Crear un gremio'));
  const form=el('form');const name=el('input');name.id='sb-shadow-name';name.required=true;name.minLength=3;name.maxLength=40;name.value=own?.name||'';name.placeholder='Nombre del gremio';name.style.cssText='display:block;width:100%;margin:8px 0';
  const nl=el('label','Nombre');nl.htmlFor=name.id;
  const desc=el('textarea');desc.id='sb-shadow-description';desc.maxLength=300;desc.rows=3;desc.value=own?.description||'';desc.style.cssText='display:block;width:100%;margin:8px 0';
  const dl=el('label','Descripción');dl.htmlFor=desc.id;
  const save=el('button',own?'Guardar cambios':'Crear gremio','gradient-btn');save.type='submit';const feedback=el('p');feedback.setAttribute('role','status');
  const sl=el('label','Escudo');sl.htmlFor='sb-shadow-shield';const shield=el('select');shield.id=sl.htmlFor;for(const symbol of ['🛡️','⚔️','🐉','🌙','🔥','💎','👑','🦅']){const option=el('option',symbol);option.value=symbol;shield.append(option)}shield.value=own?.shield||'🛡️';form.append(nl,name,dl,desc,sl,shield,save,feedback);editor.append(form);root.append(editor);
  form.onsubmit=async e=>{e.preventDefault();save.disabled=true;feedback.textContent='Guardando…';try{const payload={name:name.value.trim(),description:desc.value.trim(),shield:shield.value};if(payload.name.length<3)throw new Error('Escribe al menos 3 caracteres.');const r=own?await sb.from('sb_shadow_guilds').update(payload).eq('id',own.id).select('id').single():await sb.from('sb_shadow_guilds').insert(payload).select('id').single();checked(r);await mount()}catch(err){feedback.textContent=err.code==='23505'?'El nombre ya existe o ya tienes un gremio.':(err.message||'No se pudo guardar.');save.disabled=false}};
  const directory=panel();directory.id='sb-shadow-guilds';directory.append(el('h2','🏰 Gremios y clanes'),el('p','Puedes liderar un gremio y participar en otros. Directorio de hasta 100 gremios.'));root.append(directory);
  const filter=el('input');filter.type='search';filter.placeholder='Buscar gremios';filter.setAttribute('aria-label','Buscar gremios');filter.style.cssText='width:100%;margin:8px 0';directory.append(filter);
  const list=el('div');directory.append(list);
  const all=own&&!guilds.some(g=>g.id===own.id)?[own,...guilds]:guilds;
  function draw(){list.replaceChildren();const query=filter.value.trim().toLowerCase();const matches=all.filter(g=>(g.name+' '+g.description).toLowerCase().includes(query));if(!matches.length)list.append(el('p','No hay gremios que coincidan.'));for(const g of matches){const card=panel();const isOwner=g.owner_id===user.id;const isMember=joined.has(g.id);card.append(el('h3',(g.shield||'🛡️')+' '+g.name),el('p',g.description||'Sin descripción'),el('p',isOwner?'👑 Líder':isMember?'✅ '+(ranks[memberships.find(m=>m.guild_id===g.id)?.guild_rank]||'Miembro'):'Gremio abierto'));
    if(!isOwner){const msg=el('p');msg.setAttribute('role','status');const action=button(isMember?'Salir del gremio':'Unirme al gremio',async()=>{action.disabled=true;msg.textContent='Guardando…';try{if(isMember){const r=await sb.from('sb_shadow_guild_members').delete().eq('guild_id',g.id).eq('user_id',user.id).select('guild_id').single();checked(r)}else{checked(await sb.from('sb_shadow_guild_members').insert({guild_id:g.id}).select('guild_id').single())}await mount()}catch(err){msg.textContent=err.message||'No se pudo cambiar la afiliación.';action.disabled=false}});card.append(action,msg)}
    if(isOwner||isMember){const open=button('💬 Abrir chat',()=>{open.disabled=true;chat(card,g,user)});card.append(open)}if(isOwner){const open=button('👥 Gestionar miembros',()=>{open.disabled=true;manage(card,g,user)});card.append(open)}
    list.append(card);
  }}filter.oninput=draw;draw();
 }catch(err){if(root.isConnected){root.replaceChildren(el('p','No se pudo cargar Shadow Universe: '+(err.message||'Error de conexión')),button('Reintentar',mount))}}
}
return {mount};
})();