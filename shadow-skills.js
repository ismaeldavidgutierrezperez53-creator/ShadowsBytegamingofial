/* Shadow Universe 2.0 — skill tree and dungeon loadouts. */
window.SBSkills=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Rank insufficient':'Necesitas alcanzar el rango requerido.','Prerequisite missing':'Aprende primero la habilidad anterior.','Skill not learned':'Primero debes aprender la habilidad.','Account restricted':'Tu cuenta no puede realizar esta acción.'};
const branches=[['magic','🔮 Rama de magia','#c084fc'],['heal','💚 Rama de curación','#4ade80'],['shield','🛡️ Rama de protección','#60a5fa']];
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🔮 Árbol de habilidades'),el('p','Aprende habilidades con tu experiencia de comunidad, sin gastar XP ni puntos. Equipa hasta dos para tus nuevas mazmorras. Cada habilidad equipada se puede usar una vez por expedición.'));
 const status=el('p','Cargando habilidades…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const slots=el('section'),tree=el('div');tree.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px';host.append(status,slots,tree);
 let catalog=[],learned=[],xp=0,busy=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){
 const [a,b,c]=await Promise.all([sb.from('sb_skill_catalog').select('*').order('min_xp'),sb.from('sb_member_skills').select('*').eq('user_id',user.id),sb.rpc('community_member_xp',{target_member:user.id})]);
 if(!host.isConnected)return;catalog=check(a)||[];learned=check(b)||[];xp=Number(check(c)||0);draw();status.textContent=message||'';
 }
 async function act(id,action,slot=null){if(busy)return;busy=true;try{check(await sb.rpc('sb_skill_manage',{target_skill:id,requested_action:action,requested_slot:slot}));await load(action==='learn'?'¡Habilidad aprendida!':action==='equip'?'Habilidad equipada.':'Habilidad desequipada.')}catch(e){report(e)}finally{busy=false}}
 function draw(){
 slots.replaceChildren(el('h3','🎯 Mi configuración'),el('p',xp.toLocaleString('es-ES')+' XP · '+learned.length+'/'+catalog.length+' habilidades aprendidas'));
 for(const slot of [1,2]){const item=learned.find(x=>x.slot===slot),skill=catalog.find(x=>x.id===item?.skill_id);const row=el('div');row.style.cssText='padding:10px;margin:6px 0;border:1px solid #a855f766;border-radius:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center';row.append(el('strong','Ranura '+slot+': '+(skill?skill.symbol+' '+skill.name:'Vacía')));if(skill)row.append(btn('Desequipar',()=>act(skill.id,'unequip')));slots.append(row)}
 if(learned.length)slots.append(el('p','🎖️ Aprendiz de las Sombras'));if(catalog.length&&learned.length===catalog.length)slots.append(el('p','👑 Maestro de las habilidades'));
 tree.replaceChildren();for(const [branch,title,color] of branches){const column=el('section');column.append(el('h3',title));const list=catalog.filter(x=>x.branch===branch);for(const [i,s] of list.entries()){if(i){const arrow=el('p','↓');arrow.style.textAlign='center';column.append(arrow)}const item=learned.find(x=>x.skill_id===s.id),pre=catalog.find(x=>x.id===s.prerequisite),missing=!!s.prerequisite&&!learned.some(x=>x.skill_id===s.prerequisite),locked=xp<s.min_xp;const box=el('article');box.style.cssText='padding:13px;border:1px solid '+color+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';box.append(el('h3',s.symbol+' '+s.name),el('p','Rango '+s.rank_required+' · '+s.min_xp+' XP'),el('p',s.description));if(pre)box.append(el('small','Requiere '+pre.name));box.append(el('p',item?(item.slot?'✅ Equipada en ranura '+item.slot:'✅ Aprendida'):locked?'🔒 Rango insuficiente':missing?'🔒 Aprende la anterior':'🟢 Disponible'));if(!item){const b=btn('Aprender',()=>act(s.id,'learn'));b.disabled=locked||missing;box.append(b)}else for(const slot of [1,2]){const b=btn('Equipar en '+slot,()=>act(s.id,'equip',slot));b.disabled=locked||item.slot===slot;box.append(b)}column.append(box)}tree.append(column)}
 }
 host.append(btn('↻ Actualizar habilidades',async()=>{if(!busy){busy=true;try{await load()}catch(e){report(e)}finally{busy=false}}}));
 try{await load()}catch(e){report(e)}
}
return {mount};
})();