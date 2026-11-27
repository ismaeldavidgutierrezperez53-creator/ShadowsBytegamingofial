/* Shadow Universe 2.0 — companions and evolutions. */
window.SBPets=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const rarity={common:['Común','#94a3b8',0],rare:['Rara','#60a5fa',1],epic:['Épica','#c084fc',2],legendary:['Legendaria','#fbbf24',3]};
const errors={'Account restricted':'Tu cuenta no puede participar.','Already fed':'Ya alimentaste esta mascota hoy.','Already trained':'Ya entrenaste esta mascota hoy.','Pet unavailable':'Mascota no disponible.'};
const today=()=>new Date().toISOString().slice(0,10);
const week=()=>{const d=new Date();d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)};
const stage=x=>x>=240?2:x>=80?1:0;
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🐉 Mascotas evolutivas'),el('p','Abre un huevo gratuito cada semana (lunes UTC). Alimenta y entrena a tus compañeros una vez al día. Equipa una mascota para mejorar tus ataques en nuevas mazmorras.'));
 const status=el('p','Cargando mascotas…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const eggs=el('section'),stats=el('section'),list=el('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px';host.append(status,eggs,stats,list);
 let catalog=[],pets=[],egg=null,busy=false;
 const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
 async function load(message){
 const [a,b,c]=await Promise.all([sb.from('sb_pet_catalog').select('*').order('weight',{ascending:false}),sb.from('sb_member_pets').select('*').eq('user_id',user.id),sb.from('sb_pet_eggs').select('*').eq('user_id',user.id).eq('week_start',week()).maybeSingle()]);
 if(!host.isConnected)return;catalog=check(a)||[];pets=check(b)||[];egg=check(c);draw();status.textContent=message||'';
 }
 async function act(fn){if(busy)return;busy=true;try{const msg=await fn();await load(msg)}catch(e){report(e)}finally{busy=false}}
 function draw(){
 eggs.replaceChildren(el('h3','🥚 Huevo misterioso'),el('p','Una apertura gratuita por semana. Las especies repetidas dan +20 XP a esa mascota.'));
 const hatch=btn(egg?'✅ Huevo abierto esta semana':'🥚 Abrir huevo',()=>act(async()=>{const res=check(await sb.rpc('sb_pet_open'));const name=catalog.find(c=>c.id===res.egg.species_id)?.name||res.egg.species_id;return res.opened?(res.egg.duplicate?'Especie repetida: '+name+' · +20 XP de mascota':'¡Has adoptado a '+name+'!'):'Ya abriste tu huevo esta semana.'}));hatch.disabled=!!egg;eggs.append(hatch);
 if(egg)eggs.append(el('p','Última apertura: '+(catalog.find(c=>c.id===egg.species_id)?.name||egg.species_id)));
 const odds=el('details');odds.append(el('summary','Probabilidades de aparición'));for(const c of catalog)odds.append(el('p',c.symbol+' '+c.name+' · '+rarity[c.rarity][0]+' · '+c.weight+'%'));eggs.append(odds);
 stats.replaceChildren(el('h3','🐾 Mi colección'),el('p',pets.length+'/'+catalog.length+' especies adoptadas · '+pets.filter(p=>p.pet_xp>=240).length+' evoluciones finales'));
 if(pets.length)stats.append(el('p','🎖️ Primer compañero'));if(pets.length===catalog.length&&catalog.length)stats.append(el('p','👑 Maestro de mascotas'));
 list.replaceChildren();
 for(const c of catalog){const p=pets.find(x=>x.species_id===c.id),[label,color,extra]=rarity[c.rarity];const card=el('article');card.style.cssText='padding:14px;border:1px solid '+color+';border-radius:14px;background:linear-gradient(145deg,#251633,#15101e);color:#fff;overflow-wrap:anywhere';const icon=el('div',p?c.symbol:'🔒');icon.style.cssText='text-align:center;font-size:48px';card.append(icon,el('small',label));
 if(!p){card.append(el('h3',c.name),el('p','Por descubrir'));list.append(card);continue}
 const evo=stage(p.pet_xp),name=[c.name,c.evolution_one,c.evolution_two][evo],bonus=Math.min(10,[2,5,8][evo]+extra),level=1+Math.floor(p.pet_xp/40);
 card.append(el('h3',p.nickname||name),el('p',name+' · Nivel '+level+'/21'),el('p',['Cría','Evolución I','Evolución II'][evo]+' · '+p.pet_xp+' XP de mascota'),el('p',(p.active?'✅ Equipada · ':'')+'+'+bonus+' daño en mazmorras nuevas'));
 const bar=el('progress');bar.max=evo===0?80:evo===1?240:800;bar.value=p.pet_xp;bar.style.width='100%';card.append(bar,el('p',evo===0?'Próxima evolución: 80 XP':evo===1?'Próxima evolución: 240 XP':'Evolución final'));
 const action=(type,text,msg,disabled=false,new_name=null)=>{const b=btn(text,()=>act(async()=>{check(await sb.rpc('sb_pet_action',{target_pet:p.id,requested_action:type,new_name}));return msg}));b.disabled=disabled;card.append(b)};
 action('feed',p.fed_day===today()?'✓ Alimentada':'🍖 Alimentar (+15 XP)','Mascota alimentada.',p.fed_day===today()||p.pet_xp>=800);
 action('train',p.trained_day===today()?'✓ Entrenada':'⚔️ Entrenar (+25 XP)','Entrenamiento completado.',p.trained_day===today()||p.pet_xp>=800);
 action('equip',p.active?'✓ Equipada':'Equipar','Compañero equipado para nuevas expediciones.',p.active);
 const rename=el('input');rename.maxLength=30;rename.value=p.nickname||'';rename.placeholder='Apodo opcional';rename.setAttribute('aria-label','Apodo de '+name);rename.style.cssText='display:block;width:100%;margin:8px 0';card.append(rename,btn('Guardar apodo',()=>act(async()=>{check(await sb.rpc('sb_pet_action',{target_pet:p.id,requested_action:'rename',new_name:rename.value.trim()}));return 'Apodo guardado.'})));
 list.append(card);
 }
 }
 host.append(btn('↻ Actualizar mascotas',()=>act(async()=>'')));
 try{await load()}catch(e){report(e)}
}
return {mount};
})();