/* Shadow Universe 3.0 — RPG class selection. */
window.SBRPGClasses=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const colors={warrior:'#fbbf24',guardian:'#60a5fa',mage:'#c084fc',healer:'#4ade80',assassin:'#fb7185'};
const errors={'Account restricted':'Tu cuenta no puede cambiar de clase.','Unknown class':'Clase no disponible.','Class cooldown':'Debes esperar 24 horas entre cambios de clase.'};
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','👑 Clases RPG · Shadow Universe 3.0'),el('p','Elige una clase gratuitamente desde cualquier rango. Cada clase aporta bonificaciones diferentes en mazmorras y duelos PvP. Puedes cambiarla transcurridas 24 horas.'));
 const status=el('p','Cargando clases…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const info=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px';host.append(status,info,list);
 let classes=[],active=null,busy=false,loading=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){if(loading||!host.isConnected)return;loading=true;try{const [a,b]=await Promise.all([sb.from('sb_rpg_classes').select('*').order('name'),sb.from('sb_member_rpg_class').select('*').eq('user_id',user.id).maybeSingle()]);if(!host.isConnected)return;classes=check(a)||[];active=check(b);draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
 function draw(){
 const c=classes.find(x=>x.id===active?.class_id),next=active?Date.parse(active.chosen_at)+86400000:0,locked=next>Date.now();
 info.replaceChildren(el('h3',c?'Clase actual: '+c.symbol+' '+c.name:'Todavía no has elegido una clase'),el('p',locked?'Próximo cambio: '+new Date(next).toLocaleString('es-ES'):'Puedes elegir una clase ahora.'));
 if(c)info.append(el('p','🎖️ Identidad del cazador'));
 info.append(el('small','La clase queda fijada al entrar en una mazmorra. En PvP se usa la clase de ambos miembros al aceptar el duelo. Las bonificaciones no reemplazan tu equipo ni tus mascotas.'));
 list.replaceChildren();
 for(const x of classes){const selected=x.id===active?.class_id,card=el('article');card.style.cssText='padding:14px;border:1px solid '+(colors[x.id]||'#c084fc')+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';const icon=el('div',x.symbol);icon.style.cssText='text-align:center;font-size:42px';card.append(icon,el('h3',x.name),el('p',x.description));
 if(x.attack_bonus)card.append(el('p','⚔️ +'+x.attack_bonus+' daño por ataque'));
 if(x.defense_bonus)card.append(el('p','🛡️ '+x.defense_bonus+' de reducción de daño'));
 if(x.magic_bonus)card.append(el('p','🔮 +'+x.magic_bonus+' daño en poderes y magia ofensiva'));
 if(x.heal_bonus)card.append(el('p','💚 +'+x.heal_bonus+' PV en acciones de curación'));
 const pick=btn(selected?'✅ Clase activa':locked?'🔒 Cambio en espera':'Elegir '+x.name,async()=>{if(busy||loading)return;if(!confirm('¿Elegir la clase '+x.name+'? Podrás cambiar de clase transcurridas 24 horas.'))return;busy=true;pick.disabled=true;try{check(await sb.rpc('sb_class_choose',{target_class:x.id}));await load('¡Clase '+x.name+' seleccionada!')}catch(e){report(e);pick.disabled=false}finally{busy=false}});pick.disabled=selected||locked;card.append(pick);list.append(card)}
 }
 host.append(btn('↻ Actualizar clases',()=>load()));await load();
}
return {mount};
})();