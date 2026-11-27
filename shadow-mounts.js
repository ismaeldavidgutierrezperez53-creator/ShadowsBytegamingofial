/* Shadow Universe 3.0 — mounts and exploration bonuses. */
window.SBMounts=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const rarity={common:['Común','#94a3b8'],rare:['Rara','#60a5fa'],epic:['Épica','#c084fc'],legendary:['Legendaria','#fbbf24'],mythic:['Mítica','#fb7185']};
const errors={'Account restricted':'Tu cuenta no puede participar.','Unknown mount':'Montura no disponible.','Rank insufficient':'Todavía no tienes el rango requerido.','Mount not owned':'Primero desbloquea esta montura.','Already trained':'Ya entrenaste esta montura hoy.','Maximum level':'Nivel máximo alcanzado.'};
const today=()=>new Date().toISOString().slice(0,10);
function effects(c,m){const x=m?.mount_xp||0,stage=x>=300?2:x>=100?1:0;return {stage,name:[c.name,c.evolution_one,c.evolution_two][stage],bonus:c.bonus_xp+stage*2,chance:20+c.treasure_bonus+stage*5}}
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🐲 Monturas legendarias'),el('p','Desbloquea monturas gratuitamente según tu rango. Equipa una para obtener más XP y tesoros en el mapa. Entrenamiento diario: +25 XP de montura. Explorar con ella: +15 XP de montura.'));
 const status=el('p','Cargando monturas…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const info=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px';host.append(status,info,list);
 let catalog=[],owned=[],xp=0,busy=false,loading=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){if(loading||!host.isConnected)return;loading=true;try{const [a,b,c]=await Promise.all([sb.from('sb_mount_catalog').select('*').order('min_xp'),sb.from('sb_member_mounts').select('*').eq('user_id',user.id),sb.rpc('community_member_xp',{target_member:user.id})]);if(!host.isConnected)return;catalog=check(a)||[];owned=check(b)||[];xp=Number(check(c)||0);draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
 async function act(id,action){if(busy||loading)return;busy=true;try{check(await sb.rpc('sb_mount_manage',{target_mount:id,action}));await load(({unlock:'¡Montura desbloqueada!',equip:'Montura equipada.',unequip:'Montura retirada.',train:'¡Entrenamiento completado!'})[action]);host.dispatchEvent(new CustomEvent('sb-mount-changed',{bubbles:true}))}catch(e){report(e)}finally{busy=false}}
 function draw(){
 const active=owned.find(x=>x.equipped),c=catalog.find(x=>x.id===active?.mount_id);
 info.replaceChildren(el('h3','Mi establo'),el('p',owned.length+'/'+catalog.length+' monturas desbloqueadas · '+xp+' XP de cazador'));
 if(c){const f=effects(c,active);info.append(el('p',xp>=c.min_xp?'🐾 Montura activa: '+f.name+' · +'+f.bonus+' XP de exploración · '+f.chance+'% tesoro':'Montura equipada sin bonificación: rango insuficiente.'),btn('Desequipar',()=>act(c.id,'unequip')))}else info.append(el('p','Sin montura equipada.'));
 if(owned.length)info.append(el('p','🎖️ Jinete de las Sombras'));if(owned.some(m=>m.mount_xp>=300))info.append(el('p','🐉 Jinete legendario'));if(catalog.length&&owned.length===catalog.length)info.append(el('p','👑 Maestro de monturas'));
 list.replaceChildren();
 for(const c of catalog){const m=owned.find(x=>x.mount_id===c.id),f=effects(c,m),[label,color]=rarity[c.rarity],locked=xp<c.min_xp;
 const card=el('article');card.style.cssText='padding:14px;border:1px solid '+color+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';const icon=el('div',m?c.symbol:'🔒');icon.style.cssText='font-size:42px;text-align:center';card.append(icon,el('small',label+' · Rango '+c.rank_required),el('h3',f.name),el('p',c.min_xp+' XP de cazador requeridos'),el('p','+'+f.bonus+' XP por exploración · '+f.chance+'% tesoro'));
 card.append(el('small',c.name+' → '+c.evolution_one+' (100 XP) → '+c.evolution_two+' (300 XP)'));
 if(!m){const b=btn(locked?'🔒 Rango insuficiente':'Desbloquear gratis',()=>act(c.id,'unlock'));b.disabled=locked;card.append(b)}
 else{card.append(el('p','Nivel '+(1+Math.floor(m.mount_xp/40))+'/11 · '+m.mount_xp+' XP de montura'+(m.equipped?' · ✅ Equipada':'')));const p=el('progress');p.max=400;p.value=m.mount_xp;p.style.width='100%';card.append(p);const train=btn(m.trained_day===today()?'✓ Entrenada hoy':'Entrenar (+25 XP)',()=>act(c.id,'train'));train.disabled=m.trained_day===today()||m.mount_xp>=400;const equip=btn(m.equipped?'Desequipar':'Equipar',()=>act(c.id,m.equipped?'unequip':'equip'));equip.disabled=!m.equipped&&locked;card.append(train,equip)}
 list.append(card)}
 }
 host.append(btn('↻ Actualizar establo',()=>load()));host.parentElement?.addEventListener('sb-world-explored',()=>{if(host.isConnected)load()});await load();
}
return {mount};
})();