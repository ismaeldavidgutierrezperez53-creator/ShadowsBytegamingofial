/* Shadow Universe 6.0 — El despertar del multiverso */
window.SBAwakening=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const ok=r=>{if(r.error)throw r.error;return r.data;};
const button=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b;};
const shortcuts=[['🌀 Portales dimensionales','sb-shadow-dimensions'],['🌌 Mi universo y planetas','sb-shadow-multiverse'],['🐉 Criaturas cósmicas','sb-shadow-cosmic-creatures'],['🐎 Monturas','sb-shadow-mounts'],['🗺️ Mapa y mundos abiertos','sb-shadow-open-world'],['🔮 Despertares divinos','sb-shadow-ascension'],['⚔️ Mazmorras cooperativas','sb-shadow-coop'],['🔥 Invasiones','sb-shadow-invasions'],['🛡️ Panteón','sb-shadow-pantheon'],['🗺️ Exploración del mundo','sb-shadow-world-map']];
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren();
 const header=el('section');header.style.cssText='padding:18px;border:1px solid #c084fc;border-radius:16px;background:radial-gradient(ellipse at 80% 15%,#4c2470,#10172e 70%);color:white';
 header.append(el('h2','🌌 Shadow Universe 6.0 — El despertar del multiverso'),el('p','Funda tu universo, descubre reinos y consigue gemas para encantar tus expediciones.'));
 const nav=el('div');nav.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:12px';
 for(const [title,id] of shortcuts){nav.append(button(title,()=>{const target=document.getElementById(id);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}}));}
 header.append(nav);host.append(header);
 const status=el('p','Cargando reinos…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const body=el('div');host.append(status,body);let busy=false,loading=false;
 async function act(action,target){if(busy||loading)return;busy=true;status.textContent='Procesando…';for(const b of body.querySelectorAll('button'))b.disabled=true;
 try{const result=ok(await sb.rpc('sb_awakening_action',{p_action:action,p_target:target}));await load();if(host.isConnected)status.textContent=action==='explore'?'✨ Expedición completada: +'+result.amount+' gemas.':'🔮 Encantamiento mejorado: −'+result.amount+' gemas.';}
 catch(e){await load();if(host.isConnected)status.textContent='No se pudo completar: '+e.message;}finally{busy=false;}}
 async function load(){if(loading||!host.isConnected)return;loading=true;
 try{
 const today=ok(await sb.rpc('sb_awakening_today'));
 const [r,e,w,m,x,p,u]=await Promise.all([
 sb.from('sb_awakening_realms').select('*').order('sort_order'),
 sb.from('sb_awakening_enchants').select('*'),
 sb.from('sb_awakening_wallet').select('gems').eq('user_id',user.id).maybeSingle(),
 sb.from('sb_awakening_member_enchants').select('enchant_id,level').eq('user_id',user.id),
 sb.from('sb_awakening_expeditions').select('realm_id,day,gems').eq('user_id',user.id).order('day',{ascending:false}).limit(30),
 sb.from('sb_universe_planets').select('planet_id').eq('user_id',user.id),
 sb.from('sb_personal_universes').select('user_id').eq('user_id',user.id).maybeSingle()]);
 const realms=ok(r)||[],enchants=ok(e)||[],wallet=ok(w),levels=new Map((ok(m)||[]).map(a=>[a.enchant_id,a.level])),history=ok(x)||[],planets=(ok(p)||[]).length,universe=ok(u);
 if(!host.isConnected)return;body.replaceChildren();
 const balance=wallet?.gems||0;
 const summary=el('section');summary.style.cssText='padding:16px;border:1px solid #a855f766;border-radius:14px;margin:12px 0';
 summary.append(el('h3','💎 Gemas del multiverso: '+balance),el('p','🪐 '+planets+' planetas colonizados · '+realms.filter(a=>planets>=a.min_planets).length+'/'+realms.length+' reinos desbloqueados'),el('p','Una expedición por reino al día (UTC). Cada nivel de encantamiento añade una gema a la recompensa de su reino.'));
 if(!universe)summary.append(button('🌌 Fundar mi universo',()=>document.getElementById('sb-shadow-multiverse')?.scrollIntoView({behavior:'smooth'})));
 body.append(summary,el('h3','🗺️ Mapa de los reinos'));
 const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px';
 for(const [i,realm] of realms.entries()){
 const unlocked=!!universe&&planets>=realm.min_planets,claimed=history.some(h=>h.realm_id===realm.id&&h.day===today),enchant=enchants.find(e=>e.realm_id===realm.id),level=levels.get(enchant?.id)||0;
 const card=el('article');card.style.cssText='padding:16px;border:1px solid '+['#a78bfa','#22d3ee','#fbbf24'][i%3]+';border-radius:14px;background:linear-gradient(145deg,#292044,#12182c);color:white;overflow-wrap:anywhere';
 const icon=el('div',realm.symbol);icon.style.cssText='font-size:42px;text-align:center';card.append(icon,el('h3',realm.name),el('p',realm.description),el('p',unlocked?'🔓 Desbloqueado':'🔒 Requiere '+realm.min_planets+' planeta(s)'),el('p','Recompensa: '+(realm.reward_gems+level)+' gemas por expedición'));
 const explore=button(claimed?'✅ Explorado hoy':'🌀 Explorar reino',()=>act('explore',realm.id));explore.disabled=!unlocked||claimed;card.append(explore);
 if(enchant){const price=enchant.base_cost*(level+1);card.append(el('h4',enchant.symbol+' '+enchant.name),el('p','Nivel '+level+'/3 · +'+level+' gemas por expedición'));const progress=el('progress');progress.max=3;progress.value=level;progress.setAttribute('aria-label','Nivel del encantamiento');progress.style.width='100%';card.append(progress);const upgrade=button(level===3?'⭐ Nivel máximo':(level?'Mejorar':'Desbloquear')+' · '+price+' gemas',()=>{if(confirm('¿Usar '+price+' gemas para este encantamiento?'))act('enchant',enchant.id);});upgrade.disabled=!unlocked||level===3||balance<price;card.append(upgrade);}
 grid.append(card);
 }
 body.append(grid);
 const log=el('details');log.style.cssText='margin:14px 0;padding:12px;border:1px solid #a855f766;border-radius:12px';log.append(el('summary','📜 Últimas 30 expediciones'));if(!history.length)log.append(el('p','Todavía no tienes expediciones.'));
 for(const h of history)log.append(el('p',h.day+' · '+(realms.find(r=>r.id===h.realm_id)?.name||h.realm_id)+' · +'+h.gems+' gemas'));body.append(log,button('↻ Actualizar progreso',load));status.textContent='Tu progreso se guarda en Supabase. Las gemas y encantamientos son exclusivos de estas expediciones.';
 }catch(e){status.textContent='No se pudo cargar el multiverso: '+e.message;}finally{loading=false;}}
 host.append(button('Actualizar multiverso',load));await load();
}
return {mount};
})();