/* Shadow Universe V1 — guild directory and existing community XP. */
window.SBShadowUniverse=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,action)=>{const n=el('button',text,'gradient-btn mini');n.type='button';n.onclick=action;return n};
const rankRules=[[0,'E'],[100,'D'],[400,'C'],[900,'B'],[1600,'A'],[2500,'S'],[4900,'Monarca de las Sombras']];
const panel=()=>{const n=el('section',undefined,'profile-panel');n.style.cssText='padding:18px;margin:16px 0;border:1px solid #a855f777;border-radius:16px;overflow-wrap:anywhere';return n};
const checked=r=>{if(r.error)throw r.error;return r.data};
async function mount(){
 const root=document.getElementById('sb-shadow-universe');if(!root)return;
 root.replaceChildren(el('p','Cargando Shadow Universe…'));
 try{
  const {data,error}=await sb.auth.getSession();if(error)throw error;if(!root.isConnected)return;
  const user=data.session?.user;
  if(!user){const a=el('a','Iniciar sesión','gradient-btn mini');a.href='#/auth';root.replaceChildren(el('p','Inicia sesión para acceder a tu rango y a los gremios.'),a);return}
  const [xpResult,guildResult,memberResult]=await Promise.all([
    sb.rpc('community_member_xp',{target_member:user.id}),
    sb.from('sb_shadow_guilds').select('id,owner_id,name,description').order('name').limit(100),
    sb.from('sb_shadow_guild_members').select('guild_id,user_id').eq('user_id',user.id)
  ]);
  if(!root.isConnected)return;
  const guilds=checked(guildResult)||[], memberships=checked(memberResult)||[],joined=new Set(memberships.map(x=>x.guild_id));
  root.replaceChildren();
  const stats=panel();stats.append(el('h2','⚔️ Mi rango RPG'));
  if(xpResult.error||xpResult.data===null||!Number.isFinite(Number(xpResult.data))){stats.append(el('p','No se pudo consultar tu XP.'))}
  else{const xp=Math.max(0,Number(xpResult.data));const i=rankRules.findLastIndex(r=>xp>=r[0]);const next=rankRules[i+1];stats.append(el('h3','Rango '+rankRules[i][1]),el('p','Nivel '+(Math.floor(Math.sqrt(xp/100))+1)+' · '+xp+' XP de comunidad'));if(next){const bar=el('progress');bar.max=next[0]-rankRules[i][0];bar.value=xp-rankRules[i][0];bar.style.width='100%';stats.append(bar,el('p','Próximo rango: '+next[1]+' · faltan '+(next[0]-xp)+' XP'));}}
  const mission=el('a','📜 Misiones, recompensas y niveles','outline-btn mini');mission.href='#/logros';stats.append(mission);root.append(stats);
  const ownResult=await sb.from('sb_shadow_guilds').select('id,owner_id,name,description').eq('owner_id',user.id).maybeSingle();const own=checked(ownResult);if(!root.isConnected)return;
  const editor=panel();editor.append(el('h2',own?'🛡️ Administrar mi gremio':'🛡️ Crear un gremio'));
  const form=el('form');const name=el('input');name.id='sb-shadow-name';name.required=true;name.minLength=3;name.maxLength=40;name.value=own?.name||'';name.placeholder='Nombre del gremio';name.style.cssText='display:block;width:100%;margin:8px 0';
  const nl=el('label','Nombre');nl.htmlFor=name.id;
  const desc=el('textarea');desc.id='sb-shadow-description';desc.maxLength=300;desc.rows=3;desc.value=own?.description||'';desc.style.cssText='display:block;width:100%;margin:8px 0';
  const dl=el('label','Descripción');dl.htmlFor=desc.id;
  const save=el('button',own?'Guardar cambios':'Crear gremio','gradient-btn');save.type='submit';const feedback=el('p');feedback.setAttribute('role','status');
  form.append(nl,name,dl,desc,save,feedback);editor.append(form);root.append(editor);
  form.onsubmit=async e=>{e.preventDefault();save.disabled=true;feedback.textContent='Guardando…';try{const payload={name:name.value.trim(),description:desc.value.trim()};if(payload.name.length<3)throw new Error('Escribe al menos 3 caracteres.');const r=own?await sb.from('sb_shadow_guilds').update(payload).eq('id',own.id).select('id').single():await sb.from('sb_shadow_guilds').insert(payload).select('id').single();checked(r);await mount()}catch(err){feedback.textContent=err.code==='23505'?'El nombre ya existe o ya tienes un gremio.':(err.message||'No se pudo guardar.');save.disabled=false}};
  const directory=panel();directory.append(el('h2','🏰 Gremios y clanes'),el('p','Puedes liderar un gremio y participar en otros. Directorio de hasta 100 gremios.'));root.append(directory);
  const filter=el('input');filter.type='search';filter.placeholder='Buscar gremios';filter.setAttribute('aria-label','Buscar gremios');filter.style.cssText='width:100%;margin:8px 0';directory.append(filter);
  const list=el('div');directory.append(list);
  const all=own&&!guilds.some(g=>g.id===own.id)?[own,...guilds]:guilds;
  function draw(){list.replaceChildren();const query=filter.value.trim().toLowerCase();const matches=all.filter(g=>(g.name+' '+g.description).toLowerCase().includes(query));if(!matches.length)list.append(el('p','No hay gremios que coincidan.'));for(const g of matches){const card=panel();const isOwner=g.owner_id===user.id;const isMember=joined.has(g.id);card.append(el('h3',g.name),el('p',g.description||'Sin descripción'),el('p',isOwner?'👑 Líder':isMember?'✅ Miembro':'Gremio abierto'));
    if(!isOwner){const msg=el('p');msg.setAttribute('role','status');const action=button(isMember?'Salir del gremio':'Unirme al gremio',async()=>{action.disabled=true;msg.textContent='Guardando…';try{if(isMember){const r=await sb.from('sb_shadow_guild_members').delete().eq('guild_id',g.id).eq('user_id',user.id).select('guild_id').single();checked(r)}else{checked(await sb.from('sb_shadow_guild_members').insert({guild_id:g.id}).select('guild_id').single())}await mount()}catch(err){msg.textContent=err.message||'No se pudo cambiar la afiliación.';action.disabled=false}});card.append(action,msg)}
    list.append(card);
  }}filter.oninput=draw;draw();
 }catch(err){if(root.isConnected){root.replaceChildren(el('p','No se pudo cargar Shadow Universe: '+(err.message||'Error de conexión')),button('Reintentar',mount))}}
}
return {mount};
})();