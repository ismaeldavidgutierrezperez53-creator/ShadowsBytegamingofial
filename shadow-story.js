/* Shadow Universe 3.0 — original story campaign */
window.SBStory=(()=>{
'use strict';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const btn=(label,fn)=>{const b=el('button',label);b.className='outline-btn mini';b.type='button';b.onclick=fn;return b};
const check=r=>{if(r.error)throw r.error;return r.data};
const errors={'Account restricted':'Tu cuenta no puede participar.','Rank insufficient':'Necesitas más XP de cazador.','Previous chapter required':'Completa el capítulo anterior.','Choose a path':'Elige primero tu decisión.','Retry cooldown':'Espera 10 minutos desde tu derrota.','No power charges':'No quedan cargas de poder.'};
const bar=(label,hp,max,color)=>{const w=el('div'),p=el('progress');p.max=max;p.value=hp;p.style.cssText='width:100%;height:16px;accent-color:'+color;p.setAttribute('aria-label',label);w.append(el('p',label+' · '+hp+'/'+max+' PV'),p);return w};
async function mount(host,user){
if(!host?.isConnected)return;
host.replaceChildren(el('h2','📜 Crónicas del Eclipse · Modo historia'),el('p','Una campaña original de Shadow Universe. Descubre seis capítulos, toma decisiones y derrota a sus guardianes. Tu avance se guarda y cada capítulo concede sus recompensas una sola vez.'));
const status=el('p','Cargando crónicas…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const summary=el('section'),list=el('div'),detail=el('section');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px';detail.style.cssText='padding:14px;margin:12px 0;border:1px solid #a855f777;border-radius:14px';host.append(status,summary,list,detail);
let catalog=[],records=[],xp=0,selected=null,busy=false,loading=false;
const report=e=>{status.textContent=errors[e.message]||e.message||'Error de conexión'};
const record=n=>records.find(x=>x.chapter_no===n);
const locked=c=>xp<c.min_xp||c.chapter_no>1&&record(c.chapter_no-1)?.status!=='won';
async function load(message){
if(loading||!host.isConnected)return;loading=true;
try{const [a,b,c]=await Promise.all([sb.from('sb_story_chapters').select('*').order('chapter_no'),sb.from('sb_story_progress').select('*').eq('user_id',user.id),sb.rpc('community_member_xp',{target_member:user.id})]);if(!host.isConnected)return;catalog=check(a)||[];records=check(b)||[];xp=Number(check(c)||0);if(selected===null)selected=(catalog.find(c=>record(c.chapter_no)?.status!=='won'&&!locked(c))||catalog[0])?.chapter_no;draw();status.textContent=message||''}catch(e){report(e)}finally{loading=false}
}
async function act(c,r,action){
if(busy||loading)return;busy=true;try{const data=check(await sb.rpc('sb_story_action',{target_chapter:c.chapter_no,expected_version:r?.version??0,action}));records=records.filter(x=>x.chapter_no!==data.chapter_no);records.push(data);if(data.status==='won'){await load('¡Capítulo completado!');host.dispatchEvent(new CustomEvent('sb-craft-inventory-changed',{bubbles:true}))}else{draw();status.textContent=''}}catch(e){report(e)}finally{busy=false}
}
function draw(){
const won=records.filter(x=>x.status==='won');summary.replaceChildren(el('h3','Mi crónica'),el('p',won.length+'/'+catalog.length+' capítulos completados · '+xp+' XP de cazador'));
const progress=el('progress');progress.max=Math.max(1,catalog.length);progress.value=won.length;progress.style.width='100%';summary.append(progress);
if(won.length)summary.append(el('p','🎖️ Cronista de las Sombras'));if(won.length===catalog.length&&catalog.length)summary.append(el('p','👑 Héroe del Eclipse'));
list.replaceChildren();for(const c of catalog){const r=record(c.chapter_no),blocked=!r&&locked(c),b=btn(c.symbol+' '+c.chapter_no+'. '+c.title+' · '+(r?.status==='won'?'✅':blocked?'🔒':r?'En curso':'Disponible'),()=>{selected=c.chapter_no;draw()});b.style.cssText='white-space:normal;text-align:left;min-height:55px;'+(selected===c.chapter_no?'border-color:#c084fc;':'');b.setAttribute('aria-pressed',String(selected===c.chapter_no));list.append(b)}
const c=catalog.find(x=>x.chapter_no===selected);detail.replaceChildren();if(!c)return;const r=record(c.chapter_no);
detail.append(el('h3',c.symbol+' Capítulo '+c.chapter_no+' · '+c.title),el('p','Requisito: '+c.min_xp+' XP · Recompensa: '+c.reward_xp+' XP, '+c.reward_shards+' fragmentos y '+c.reward_essence+' esencias.'));
if(!r&&locked(c)){detail.append(el('p',c.chapter_no>1&&record(c.chapter_no-1)?.status!=='won'?'🔒 Completa el capítulo anterior.':'🔒 Necesitas más experiencia.'));return}
detail.append(el('strong',c.speaker),el('p',c.intro));
if(!r){detail.append(btn('Comenzar capítulo',()=>act(c,null,'start')));return}
if(r.status==='won'){detail.append(el('p','🏆 '+c.epilogue),el('p','Recompensa concedida: +'+r.xp+' XP · +'+r.shards+' fragmentos · +'+r.essence+' esencias.'),el('p','Decisión: '+(r.choice==='a'?c.choice_a:c.choice_b)));const next=catalog.find(x=>x.chapter_no===c.chapter_no+1);if(next)detail.append(btn('Ver capítulo siguiente',()=>{selected=next.chapter_no;draw()}));return}
if(r.status==='lost'){detail.append(el('p',r.last_event));const retry=btn('Reintentar capítulo',()=>act(c,r,'retry'));retry.disabled=Date.parse(r.finished_at)+600000>Date.now();detail.append(retry,el('small','Puedes actualizar el taller de historia para comprobar si ya terminó la espera.'));return}
if(r.status==='decision'){detail.append(el('h3','Elige tu camino'),btn(c.choice_a+' · +3 defensa',()=>act(c,r,'a')),btn(c.choice_b+' · -20 PV del jefe',()=>act(c,r,'b')));return}
detail.append(el('p',r.choice==='a'?c.branch_a:c.branch_b),el('h3','⚔️ '+c.boss_name),bar('Tu vida',r.player_hp,100,'#22c55e'),bar(c.boss_name,r.boss_hp,c.boss_hp,'#ef4444'),el('p','Turno '+r.turn_no+'/20 · Poderes '+r.power_left+'/2'),el('p',r.last_event));
const attack=btn('⚔️ Atacar ('+(30+r.attack_bonus)+' daño)',()=>act(c,r,'attack')),guard=btn('🛡️ Defender (+'+(15+r.heal_bonus)+' PV)',()=>act(c,r,'guard')),power=btn('🔮 Poder ('+(50+r.attack_bonus+r.magic_bonus)+' daño)',()=>act(c,r,'power'));power.disabled=r.power_left===0;detail.append(attack,guard,power);
}
host.append(btn('↻ Actualizar historia',()=>load()));await load();
}
return {mount};
})();