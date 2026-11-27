/* Shadow Universe Arcade — server-validated daily rounds and local memory practice. */
window.SBArcade=(()=>{
'use strict';
const games={anime:['🌸','Trivia Anime',25],gaming:['🎮','Trivia Gaming',25],guess:['🔎','Adivina el anime',25],rps:['✊','Piedra, papel o tijera',15],memory:['🧠','Memoria de personajes',0]};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b};
const checked=r=>{if(r.error)throw r.error;return r.data};
const fmt=n=>Number(n).toLocaleString('es-ES');
const friendly=e=>({'Account restricted':'Tu cuenta no puede participar.','Session unavailable':'La partida ha caducado. Inicia la de hoy.','Question bank unavailable':'No hay suficientes preguntas.'}[e.message]||e.message||'Error de conexión');
async function mount(host,user){
 if(!host?.isConnected)return;
 host.replaceChildren(el('h2','🕹️ Shadow Arcade'),el('p','Elige tu minijuego. Cada juego puntuable ofrece una partida diaria de cinco rondas (UTC). Puedes continuar una partida empezada. La memoria es práctica gratuita.'));
 const message=el('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const stats=el('section'),selection=el('div'),area=el('section');selection.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:10px';area.style.cssText='margin-top:16px;padding:14px;border:1px solid #a855f777;border-radius:15px;background:#211633';
 host.append(stats,selection,message,area);let revision=0,active=null;
 async function refreshStats(){
  try{const rows=[];for(let offset=0;;offset+=500){const page=checked(await sb.from('sb_arcade_results').select('game,play_day,score,xp').eq('user_id',user.id).order('play_day',{ascending:false}).order('game').range(offset,offset+499))||[];rows.push(...page);if(page.length<500)break}
  if(!host.isConnected)return;
  const today=new Date().toISOString().slice(0,10),daily=rows.filter(x=>x.play_day===today);
  stats.replaceChildren(el('h3','🏆 Mis estadísticas'),el('p',fmt(rows.reduce((s,x)=>s+Number(x.xp),0))+' XP obtenidos · '+fmt(rows.length)+' partidas completadas · Hoy: '+daily.length+'/4'));
  for(const key of ['anime','gaming','guess','rps']){const record=rows.filter(x=>x.game===key);stats.append(el('p',games[key][0]+' '+games[key][1]+' · Récord: '+(record.length?Math.max(...record.map(x=>x.score))+'/5':'—')+' · '+(daily.some(x=>x.game===key)?'Completado hoy':'Disponible')))}
  if(rows.length>=1)stats.append(el('p','🎖️ Insignia Arcade: primera partida'));if(rows.some(x=>x.score===5))stats.append(el('p','🏅 Partida perfecta'));if(rows.length>=20)stats.append(el('p','👑 Veterano Arcade'));
  }catch(e){stats.replaceChildren(el('p','No se pudieron cargar los récords: '+friendly(e)),btn('Reintentar estadísticas',refreshStats))}
 }
 for(const [key,[icon,title,max]] of Object.entries(games)){const b=btn('',()=>key==='memory'?memory():start(key));b.style.cssText='min-height:94px;display:grid;gap:6px;place-content:center;white-space:normal';const symbol=el('span',icon);symbol.style.fontSize='30px';b.append(symbol,el('strong',title),el('small',max?'Hasta '+max+' XP/día':'Práctica · sin XP'));selection.append(b)}
 function isCurrent(rev){return host.isConnected&&rev===revision}
 async function start(key){const rev=++revision;active=key;message.textContent='Preparando partida…';area.replaceChildren(el('h3',games[key][1]));try{const s=checked(await sb.rpc('sb_arcade_start',{requested_game:key}));if(!isCurrent(rev))return;message.textContent='';render(s,rev)}catch(e){if(isCurrent(rev))message.textContent=friendly(e)}}
 function render(s,rev){
  if(!isCurrent(rev))return;
  area.replaceChildren(el('h3',games[s.game][0]+' '+games[s.game][1]),el('p','Puntuación: '+s.score+'/5'));
  const progress=el('progress');progress.max=5;progress.value=s.round;progress.style.width='100%';area.append(progress);
  if(s.finished){area.append(el('h3','🏁 Partida completada'),el('p','+'+s.xp+' XP obtenidos. Vuelve mañana para una nueva partida.'),btn('Actualizar récords',refreshStats));refreshStats();return}
  area.append(el('p','Ronda '+(s.round+1)+' de 5'),el('h4',s.question));
  const choices=el('div');choices.style.cssText='display:grid;gap:8px';let sending=false;
  for(const [i,choice] of s.options.entries()){const b=btn((s.game==='rps'?['✊','✋','✌️'][i]+' ':'')+choice,async()=>{if(sending||!isCurrent(rev))return;sending=true;for(const n of choices.children)n.disabled=true;
   try{const result=checked(await sb.rpc('sb_arcade_answer',{session_key:s.id,expected_round:s.round,choice:i}));if(!isCurrent(rev))return;
   if(result.outcome){if(s.game==='rps')message.textContent=result.outcome+' · El rival eligió '+['Piedra','Papel','Tijera'][result.computer];else message.textContent=result.outcome+(result.outcome==='Incorrecta'?' · Respuesta: '+s.options[result.correct_index]:'');}else message.textContent='Partida sincronizada.';
   render(result,rev);
   }catch(e){if(isCurrent(rev)){message.textContent=friendly(e);for(const n of choices.children)n.disabled=false;sending=false}}
  });choices.append(b)}area.append(choices);
 }
 function memory(){
 const rev=++revision;active='memory';message.textContent='';area.replaceChildren(el('h3','🧠 Memoria de personajes'),el('p','Encuentra las seis parejas. El récord se guarda solo en este dispositivo, sin XP.'));
 const symbols=['👑 Jinwoo','🦊 Naruto','🐉 Goku','⚔️ Zoro','🌸 Sakura','🔵 Gojo'];const cards=[...symbols,...symbols];for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}
 const key='sb-arcade-memory-best:'+user.id;let best=null;try{const n=Number(localStorage.getItem(key));if(n>0)best=n}catch(e){}
 const status=el('p','Movimientos: 0 · Récord: '+(best??'—'));status.setAttribute('role','status');const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px';
 const buttons=[];const matched=new Set();let first=null,moves=0,locked=false;
 function hide(i){buttons[i].textContent='❔';buttons[i].setAttribute('aria-label','Carta '+(i+1)+' oculta')}
 function flip(i){if(!isCurrent(rev)||locked||matched.has(i)||first===i)return;buttons[i].textContent=cards[i];buttons[i].setAttribute('aria-label',cards[i]);if(first===null){first=i;return}const a=first;first=null;moves++;if(cards[a]===cards[i]){matched.add(a);matched.add(i);buttons[a].disabled=buttons[i].disabled=true;if(matched.size===cards.length){if(best===null||moves<best){best=moves;try{localStorage.setItem(key,String(best))}catch(e){}}status.textContent='🎉 ¡Todas las parejas! '+moves+' movimientos · Récord: '+best;return}}else{locked=true;setTimeout(()=>{if(!isCurrent(rev))return;hide(a);hide(i);locked=false},750)}status.textContent='Movimientos: '+moves+' · Parejas: '+matched.size/2+'/6 · Récord: '+(best??'—')}
 for(let i=0;i<cards.length;i++){const b=btn('❔',()=>flip(i));b.style.cssText='min-height:76px;font-size:16px;overflow-wrap:anywhere;white-space:normal';buttons.push(b);hide(i);grid.append(b)}area.append(status,grid,btn('Nueva partida',memory));
 }
 area.append(el('p','Selecciona un juego para comenzar.'));await refreshStats();
}
return {mount};
})();