/* Shadow AI — internal guide and optional generative assistant */
window.SBShadowAI=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b;};
const normal=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
const validRoutes=new Set(['/shadow-home','/shadow-city','/shadow-arena','/shadow-academy','/comunidad','/shadow-universe','/anime','/manga','/gaming','/cuenta','/tienda']);
async function mount(){
 const root=document.getElementById('sb-shadow-ai');if(!root)return;root.replaceChildren();
 const status=el('p','Cargando asistente…');status.setAttribute('role','status');root.append(status);
 try{
 const {data:{session},error}=await sb.auth.getSession();if(error)throw error;if(!root.isConnected)return;
 if(!session?.user){status.textContent='Inicia sesión para utilizar Shadow AI.';const a=el('a','Iniciar sesión','gradient-btn');a.href='#/auth';root.append(a);return;}
 const {data:guides,error:guideError}=await sb.from('sb_ai_guides').select('id,title,keywords,answer,route').order('id');if(guideError)throw guideError;if(!root.isConnected)return;
 const style=el('style');
 style.textContent=`
 #sb-shadow-ai .sai-shell{--sai-border:rgba(168,85,247,.34);color:#f4efff;background:linear-gradient(150deg,rgba(22,16,42,.97),rgba(11,12,28,.96));border:1px solid var(--sai-border);border-radius:24px;overflow:hidden;box-shadow:0 16px 50px #08051455;font-family:inherit}
 #sb-shadow-ai .sai-header{display:flex;align-items:center;gap:14px;padding:20px;border-bottom:1px solid var(--sai-border);flex-wrap:wrap}
 #sb-shadow-ai .sai-avatar{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(140deg,#2563eb,#9333ea);font-size:25px;flex:none}
 #sb-shadow-ai .sai-heading{flex:1;min-width:140px}
 #sb-shadow-ai .sai-heading strong{font-size:1.2rem;display:block;color:#fff}
 #sb-shadow-ai .sai-heading small,#sb-shadow-ai .sai-note{color:#c5b9df;font-size:.84rem;line-height:1.5}
 #sb-shadow-ai .sai-state{border:1px solid #70618d;border-radius:30px;padding:6px 11px;font-size:.8rem;color:#e3d9f8;background:#302541}
 #sb-shadow-ai .sai-state[data-state="online"]{border-color:#34d399;color:#a7f3d0;background:#063c32}
 #sb-shadow-ai .sai-body{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:0}
 #sb-shadow-ai .sai-main{min-width:0;padding:18px;display:grid;gap:14px}
 #sb-shadow-ai .sai-aside{padding:18px;background:#ffffff05;border-left:1px solid var(--sai-border);display:flex;flex-direction:column;gap:10px}
 #sb-shadow-ai .sai-aside h3{margin:0;font-size:1rem;color:#f4efff}
 #sb-shadow-ai .sai-quick{display:grid;gap:7px}
 #sb-shadow-ai .sai-shell button{cursor:pointer;font-family:inherit}
 #sb-shadow-ai .sai-shell button:disabled{opacity:.5;cursor:not-allowed}
 #sb-shadow-ai .sai-shell button:focus-visible,#sb-shadow-ai .sai-input:focus-visible{outline:2px solid #67e8f9;outline-offset:3px}
 #sb-shadow-ai .sai-quick button,#sb-shadow-ai .sai-action{background:#242039;border:1px solid #564375;color:#eee5ff;border-radius:11px;padding:9px 12px;text-align:left;font-size:.85rem;line-height:1.3}
 #sb-shadow-ai .sai-quick button:hover,#sb-shadow-ai .sai-action:hover{background:#3b2860;border-color:#a78bfa}
 #sb-shadow-ai .sai-log{display:flex;flex-direction:column;gap:13px;min-height:250px;max-height:50vh;overflow:auto;overscroll-behavior:contain;padding:12px 5px;scrollbar-color:#7152a6 transparent}
 #sb-shadow-ai .sai-message{max-width:90%;align-self:flex-start;border:1px solid #534574;border-radius:4px 17px 17px 17px;background:#25213c;padding:12px 15px;white-space:pre-wrap;overflow-wrap:anywhere}
 #sb-shadow-ai .sai-message[data-user="true"]{align-self:flex-end;background:#39245c;border-color:#7650ad;border-radius:17px 4px 17px 17px}
 #sb-shadow-ai .sai-message strong{color:#c4b5fd;font-size:.78rem;display:block;margin-bottom:6px}
 #sb-shadow-ai .sai-message p{color:#fff;line-height:1.55;margin:0}
 #sb-shadow-ai .sai-copy{border:0;background:transparent;color:#d8c9ff;padding:6px 0 0;font-size:.75rem}
 #sb-shadow-ai .sai-form{display:grid;gap:9px;margin:0}
 #sb-shadow-ai .sai-composer{border:1px solid #7050a4;background:#17142b;border-radius:16px;padding:12px;display:grid;gap:8px}
 #sb-shadow-ai .sai-input{width:100%;box-sizing:border-box;min-height:72px;max-height:220px;resize:vertical;background:transparent;color:#fff;border:0;font:inherit;line-height:1.5;padding:5px}
 #sb-shadow-ai .sai-input::placeholder{color:#b7abce}
 #sb-shadow-ai .sai-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
 #sb-shadow-ai .sai-send{border:0;border-radius:12px;background:linear-gradient(110deg,#2563eb,#7c3aed,#9333ea);color:white;font-weight:700;padding:10px 18px;min-height:42px}
 #sb-shadow-ai .sai-consent{display:flex;align-items:flex-start;gap:8px;color:#ded4f0;font-size:.84rem;line-height:1.4}
 #sb-shadow-ai .sai-consent input{accent-color:#a78bfa;flex:none;margin-top:3px}
 #sb-shadow-ai .sai-shell p.sai-note{margin:0}
 @media(max-width:720px){#sb-shadow-ai .sai-body{grid-template-columns:1fr}#sb-shadow-ai .sai-aside{grid-row:1;border-left:0;border-bottom:1px solid var(--sai-border);padding:12px}#sb-shadow-ai .sai-quick{display:flex;flex-wrap:wrap;gap:6px}#sb-shadow-ai .sai-quick button{padding:7px 9px}#sb-shadow-ai .sai-main{padding:12px}#sb-shadow-ai .sai-header{padding:14px}#sb-shadow-ai .sai-log{min-height:180px;max-height:42vh}#sb-shadow-ai .sai-message{max-width:96%}}
 `;
 const shell=el('section',null,'sai-shell'),header=el('header',null,'sai-header'),heading=el('div',null,'sai-heading'),state=el('span','Comprobando conexión…','sai-state');
 state.setAttribute('role','status');heading.append(el('strong','Shadow AI'),el('small','Tu asistente de anime, gaming y comunidad'));
 header.append(el('div','✦','sai-avatar'),heading,state);
 const body=el('div',null,'sai-body'),main=el('div',null,'sai-main'),aside=el('aside',null,'sai-aside');
 shell.append(header,body);body.append(main,aside);root.append(style,shell);
 const chat=el('section',null,'sai-log');chat.setAttribute('role','log');chat.setAttribute('aria-live','polite');
 function add(who,text,route){const card=el('article',null,'sai-message');card.dataset.user=String(who==='Tú');card.append(el('strong',who),el('p',text));if(who!=='Tú'){const copy=el('button','Copiar respuesta','sai-copy');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='Copiado ✓';}catch(_){copy.textContent='No se pudo copiar';}};card.append(copy);}if(validRoutes.has(route)&&(!window.SBVisibility||window.SBVisibility.allowed(route))){const a=el('a','Abrir apartado','outline-btn mini');a.href='#'+route;card.append(a);}chat.append(card);while(chat.children.length>40)chat.firstElementChild.remove();chat.scrollTop=chat.scrollHeight;}
 const form=el('form',null,'sai-form');
 const input=el('textarea',null,'sai-input');input.rows=3;input.maxLength=1000;input.required=true;input.placeholder='Escribe tu pregunta a Shadow AI…';input.setAttribute('aria-label','Tu consulta');input.style.width='100%';
 const consent=el('input');consent.type='checkbox';consent.disabled=true;const label=el('label',null,'sai-consent');label.append(consent,document.createTextNode(' Usar IA generativa: enviar esta consulta a OpenAI. No incluyas datos personales.'));
 const info=el('p','Modo guía interna · sin envío a un proveedor de IA.','sai-note');const submit=el('button','Enviar ➜','sai-send');submit.type='submit';const quick=el('div',null,'sai-quick');const count=el('span','0 / 1000','sai-note');const composer=el('div',null,'sai-composer');const controls=el('div',null,'sai-controls');controls.append(count,submit);composer.append(input,controls);const refresh=el('button','Comprobar conexión','sai-action');refresh.type='button';const clear=el('button','Nueva conversación','sai-action');clear.type='button';function updateCount(){count.textContent=input.value.length+' / 1000';}input.addEventListener('input',updateCount);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy&&input.value.trim())form.requestSubmit();}});
 let busy=false,enabled=false,checking=false;status.className='sai-note';
 function guide(question){
 const text=normal(question);const words=new Set(text.split(/\s+/));
 const ranked=(guides||[]).map(g=>({g,score:g.keywords.split(',').reduce((s,k)=>s+((words.has(normal(k))||words.has(normal(k)+'s')||words.has(normal(k)+'es'))?1:0),0)+(text.includes(normal(g.title))?5:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 if(!ranked.length){add('Shadow AI · Guía interna','No tengo una respuesta específica. Pregúntame sobre Anime, Manga, Gaming, Shadow Home, City, Arena, Academy, Universe, Reels o tu cuenta.');return;}
 for(const {g} of ranked.slice(0,2))add('Shadow AI · Guía interna',g.title+'\n'+g.answer,g.route);
 }
 async function ask(question){if(busy||!question.trim())return;busy=true;submit.disabled=true;refresh.disabled=true;clear.disabled=true;submit.textContent='Consultando…';input.value='';updateCount();add('Tú',question);try{
 if(enabled&&consent.checked){consent.checked=false;status.textContent='Consultando IA generativa…';const {data,error}=await sb.functions.invoke('shadow-ai',{body:{question,consent:true}});if(error||!data?.answer){add('Shadow AI','La IA generativa no está disponible o has alcanzado el límite. Te muestro la guía interna.');guide(question);}else add('Shadow AI · Generativa',data.answer);}
 else guide(question);
 }catch(e){add('Shadow AI','No se pudo completar la consulta.');guide(question);}finally{busy=false;submit.disabled=false;refresh.disabled=checking;clear.disabled=false;submit.textContent='Enviar ➜';status.textContent='Listo para tu siguiente pregunta.';input.focus();}}
 for(const [icon,text] of [['🎬','Recomiéndame anime'],['📚','Recomiéndame manga'],['🎮','Recomiéndame videojuegos'],['🏠','Shadow Home'],['🌆','Shadow City'],['⚔️','Shadow Arena'],['🎓','Shadow Academy'],['🌌','Shadow Universe'],['📱','Historias y Reels']]){const b=el('button',icon+' '+text);b.type='button';b.onclick=()=>{input.value=text;updateCount();input.focus();};quick.append(b);}
 form.append(composer,label,info,el('p','Enter para enviar · Mayús + Enter para nueva línea.','sai-note'));form.onsubmit=e=>{e.preventDefault();ask(input.value.trim());};
 clear.onclick=()=>{if(!busy){chat.replaceChildren();input.value='';consent.checked=false;updateCount();add('Shadow AI','¡Hola! ¿En qué puedo ayudarte?');input.focus();}};
 aside.append(el('h3','Explora con Shadow AI'),el('p','Elige una sugerencia para empezar.','sai-note'),quick,clear,refresh);
 main.append(chat,form,status);
 add('Shadow AI','¡Hola! Soy el asistente de SB V2. Puedo orientarte sobre anime, manga, videojuegos y las funciones de la comunidad.');
 status.textContent='Asistente disponible. No se guarda el historial en Supabase; se borra al salir de esta pantalla.';
 async function checkConnection(){if(checking||busy)return;checking=true;refresh.disabled=true;state.textContent='Comprobando conexión…';state.dataset.state='checking';try{const {data,error}=await sb.functions.invoke('shadow-ai',{body:{mode:'status'}});if(!root.isConnected)return;enabled=!error&&data?.enabled===true;}catch(_){enabled=false;}finally{checking=false;refresh.disabled=busy;consent.disabled=!enabled;if(!enabled)consent.checked=false;state.dataset.state=enabled?'online':'offline';state.textContent=enabled?'● IA generativa disponible':'● Guía interna activa';info.textContent=enabled?'IA generativa opcional · 10 consultas por miembro y día, máximo 100 para la comunidad. Las respuestas pueden contener errores.':'IA generativa no disponible. Puedes usar la guía interna o volver a comprobar la conexión.';}}
 refresh.onclick=checkConnection;await checkConnection();
 }catch(e){status.textContent='No se pudo cargar Shadow AI: '+e.message;root.append(btn('Reintentar',mount));}
}
return {mount};
})();