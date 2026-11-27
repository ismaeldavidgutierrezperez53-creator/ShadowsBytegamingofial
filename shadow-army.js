/* Shadow Universe 3.0 — shadow soldiers and formation. */
window.SBShadowArmy=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const rarity={common:['Común','#94a3b8'],rare:['Rara','#60a5fa'],epic:['Épica','#c084fc'],legendary:['Legendaria','#fbbf24']};
const names={crypt:'Cripta de las Sombras',forest:'Bosque Maldito',citadel:'Ciudadela del Monarca'};
const labels=['','Comandante','Soldado I','Soldado II'];
const errors={'Account restricted':'Tu cuenta no puede participar.','Soldier not owned':'No posees este soldado.','Already trained':'Ya entrenaste este soldado hoy.','Maximum level':'Nivel máximo alcanzado.'};
const today=()=>new Date().toISOString().slice(0,10);
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🌑 Ejército de Sombras'),el('p','Conquista mazmorras para extraer una sombra automáticamente. Las sombras repetidas conceden +20 XP de soldado. Entrena cada soldado una vez al día (UTC) y elige una formación de tres. La formación queda fijada al iniciar una nueva expedición.'));
 const status=el('p','Cargando ejército…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const formation=el('section'),list=el('div'),history=el('details');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,195px),1fr));gap:10px';host.append(status,formation,list,history);
 let catalog=[],army=[],extractions=[],busy=false,loading=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){if(loading||!host.isConnected)return;loading=true;try{const [a,b,c]=await Promise.all([sb.from('sb_shadow_soldiers').select('*').order('weight',{ascending:false}),sb.from('sb_shadow_army').select('*').eq('user_id',user.id),sb.from('sb_shadow_extractions').select('*').eq('user_id',user.id).order('extracted_at',{ascending:false}).limit(20)]);if(!host.isConnected)return;catalog=check(a)||[];army=check(b)||[];extractions=check(c)||[];draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}}
 async function act(id,action,slot=null){if(busy||loading)return;busy=true;try{check(await sb.rpc('sb_army_manage',{target_soldier:id,requested_action:action,requested_slot:slot}));await load(action==='train'?'Entrenamiento completado.':action==='equip'?'Formación actualizada.':'Soldado retirado de la formación.')}catch(e){report(e)}finally{busy=false}}
 function draw(){
 const equipped=army.filter(s=>s.slot!==null);let atk=0,def=0;
 formation.replaceChildren(el('h3','⚔️ Mi formación'),el('p',army.length+'/'+catalog.length+' sombras reclutadas · '+equipped.length+'/3 en formación'));
 for(const slot of [1,2,3]){const s=equipped.find(x=>x.slot===slot),c=catalog.find(x=>x.id===s?.soldier_id);const row=el('div');row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px;border:1px solid #a855f766;border-radius:10px;margin:6px 0';row.append(el('strong',labels[slot]+': '+(c?c.symbol+' '+c.name:'Vacío')));if(c){atk+=c.attack+Math.floor(s.soldier_xp/120)+(slot===1?1:0);def+=c.defense;row.append(btn('Retirar',()=>act(c.id,'unequip')))}formation.append(row)}
 formation.append(el('p','🌑 Invocación: '+(equipped.length?45+Math.min(10,atk)+' daño base (más otras bonificaciones)':'No disponible')+' · Protección: '+Math.min(4,def)+' de reducción de daño'));
 formation.append(el('small','Una invocación por expedición. El comandante aporta +1 de daño a la invocación. Cada 120 XP de soldado aporta +1 más. Máximo +10 daño de formación y 4 defensa.'));
 if(army.length)formation.append(el('p','🎖️ Invocador de Sombras'));if(army.length===catalog.length&&catalog.length)formation.append(el('p','👑 Señor del Ejército'));
 list.replaceChildren();for(const c of catalog){const s=army.find(x=>x.soldier_id===c.id),[label,color]=rarity[c.rarity];const card=el('article');card.style.cssText='padding:12px;border:1px solid '+color+';border-radius:14px;background:#211633;color:#fff;overflow-wrap:anywhere';const icon=el('div',s?c.symbol:'🔒');icon.style.cssText='font-size:40px;text-align:center';card.append(icon,el('small',label),el('h3',c.name),el('p',names[c.dungeon_id]+' · '+c.weight+'% de extracción'),el('p','Ataque '+c.attack+' · Defensa '+c.defense));
 if(!s){card.append(el('p','Por extraer'));list.append(card);continue}
 card.append(el('p','Nivel '+(1+Math.floor(s.soldier_xp/40))+'/10 · '+s.soldier_xp+' XP'+(s.slot?' · '+labels[s.slot]:'')));const bar=el('progress');bar.max=360;bar.value=s.soldier_xp;bar.style.width='100%';card.append(bar);
 const train=btn(s.trained_day===today()?'✓ Entrenado hoy':'Entrenar (+20 XP)',()=>act(c.id,'train'));train.disabled=s.trained_day===today()||s.soldier_xp>=360;card.append(train);
 for(const slot of [1,2,3]){const b=btn('Asignar '+labels[slot],()=>act(c.id,'equip',slot));b.disabled=s.slot===slot;card.append(b)}list.append(card)}
 history.replaceChildren(el('summary','📜 Últimas extracciones'));for(const e of extractions){const c=catalog.find(x=>x.id===e.soldier_id);history.append(el('p',new Date(e.extracted_at).toLocaleString('es-ES')+' · '+(c?.name||e.soldier_id)+(e.duplicate?' · Repetida (+20 XP)':' · Nueva sombra')))}if(!extractions.length)history.append(el('p','Todavía no has extraído sombras.'));
 }
 host.append(btn('↻ Actualizar ejército',()=>load()));await load();
}
return {mount};
})();