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
 #sb-shadow-ai .sai-quick{display:grid;gap:7px;max-height:320px;overflow:auto} #sb-shadow-ai .sai-quick button[aria-pressed="true"]{border-color:#c4b5fd;background:#4c3275} #sb-shadow-ai .sai-shell [hidden]{display:none!important}
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
 #sb-shadow-ai .sai-message-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:6px} #sb-shadow-ai .sai-copy[aria-pressed="true"]{color:#a7f3d0;font-weight:bold;text-decoration:underline} #sb-shadow-ai .sai-search{min-width:0;width:100%;box-sizing:border-box;padding:9px;border:1px solid #564375;border-radius:10px;background:#17142b;color:white;font:inherit;font-size:.85rem} #sb-shadow-ai .sai-copy{border:0;background:transparent;color:#d8c9ff;padding:6px 0 0;font-size:.75rem}
 #sb-shadow-ai .sai-studio{border:1px solid var(--sai-border);border-radius:14px;padding:12px;background:#17142b;min-width:0} #sb-shadow-ai .sai-studio summary{cursor:pointer;color:#e9d5ff;font-weight:bold} #sb-shadow-ai .sai-studio > :not(summary){margin-top:10px} #sb-shadow-ai .sai-studio img{display:block;max-width:100%;max-height:440px;object-fit:contain;border-radius:10px} #sb-shadow-ai .sai-studio input[type=file]{max-width:100%;font:inherit;font-size:.85rem} #sb-shadow-ai .sai-image-output p{white-space:pre-wrap;overflow-wrap:anywhere} #sb-shadow-ai .sai-form{display:grid;gap:9px;margin:0}
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
 state.setAttribute('role','status');heading.append(el('strong','Shadow AI 4.1'),el('small','Tu asistente de anime, gaming y comunidad'));
 header.append(el('div','✦','sai-avatar'),heading,state);
 const body=el('div',null,'sai-body'),main=el('div',null,'sai-main'),aside=el('aside',null,'sai-aside');
 shell.append(header,body);body.append(main,aside);root.append(style,shell);
 const chat=el('section',null,'sai-log');chat.setAttribute('role','log');chat.setAttribute('aria-live','polite');
 function add(who,text,route,record=true,existing=null){let message=existing;if(record){message={who,text:String(text).slice(0,5000),route:validRoutes.has(route)?route:null};messages.push(message);messages=messages.slice(-40);}const card=el('article',null,'sai-message');card.dataset.user=String(who==='Tú');card.append(el('strong',who),el('p',text));if(who!=='Tú'){const copy=el('button','Copiar respuesta','sai-copy');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='Copiado ✓';}catch(_){copy.textContent='No se pudo copiar';}};const actions=el('div',null,'sai-message-actions');actions.append(copy);
 if('speechSynthesis' in window&&'SpeechSynthesisUtterance' in window){const speak=el('button','🔊 Escuchar','sai-copy');speak.type='button';speak.onclick=()=>{if(speak.dataset.playing==='true'){window.speechSynthesis.cancel();speak.dataset.playing='false';speak.textContent='🔊 Escuchar';return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='es-ES';speak.dataset.playing='true';speak.textContent='■ Detener';u.onend=u.onerror=()=>{speak.dataset.playing='false';speak.textContent='🔊 Escuchar';};window.speechSynthesis.speak(u);};actions.append(speak);}
 if(message){const up=el('button','👍 Útil','sai-copy'),down=el('button','👎 No útil','sai-copy');for(const b of [up,down])b.type='button';function paint(){up.setAttribute('aria-pressed',String(message.rating===1));down.setAttribute('aria-pressed',String(message.rating===-1));}function rate(value){if(busy||historyBusy||!messages.includes(message))return;const old=message.rating;message.rating=old===value?0:value;paint();if(activeId)withHistory(async()=>{try{await persist();status.textContent='Valoración guardada.';}catch(e){message.rating=old;paint();throw e;}});else status.textContent='Valoración de este chat temporal.';}up.onclick=()=>rate(1);down.onclick=()=>rate(-1);paint();actions.append(up,down);}
 card.append(actions);}if(validRoutes.has(route)&&(!window.SBVisibility||window.SBVisibility.allowed(route))){const a=el('a','Abrir apartado','outline-btn mini');a.href='#'+route;card.append(a);}chat.append(card);while(chat.children.length>40)chat.firstElementChild.remove();chat.scrollTop=chat.scrollHeight;}
 const form=el('form',null,'sai-form');
 const input=el('textarea',null,'sai-input');input.rows=3;input.maxLength=1000;input.required=true;input.placeholder='Escribe tu pregunta a Shadow AI…';input.setAttribute('aria-label','Tu consulta');input.style.width='100%';
 const consent=el('input');consent.type='checkbox';consent.disabled=true;const label=el('label',null,'sai-consent');label.append(consent,document.createTextNode(' Usar IA generativa: enviar esta consulta a OpenAI. No incluyas datos personales.'));
 const info=el('p','Modo guía interna · sin envío a un proveedor de IA.','sai-note');const submit=el('button','Enviar ➜','sai-send');submit.type='submit';const quick=el('div',null,'sai-quick');const count=el('span','0 / 1000','sai-note');const composer=el('div',null,'sai-composer');const controls=el('div',null,'sai-controls');controls.append(count,submit);composer.append(input,controls);const refresh=el('button','Comprobar conexión','sai-action');refresh.type='button';const clear=el('button','Nueva conversación','sai-action');clear.type='button';function updateCount(){count.textContent=input.value.length+' / 1000';}input.addEventListener('input',updateCount);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy&&input.value.trim())form.requestSubmit();}});
 let busy=false,enabled=false,checking=false,historyBusy=false,activeId=null,activeTitle='',messages=[],revision=null;status.className='sai-note';
 const historyTitle=el('h3','Mis conversaciones'),historyNote=el('p','Chat temporal: no se guarda en Supabase.','sai-note'),historyList=el('div',null,'sai-quick'),saveChat=el('button','Guardar esta conversación','sai-action'),renameChat=el('button','Renombrar conversación','sai-action'),deleteChat=el('button','Eliminar conversación','sai-action');
 const search=el('input',null,'sai-search');search.type='search';search.placeholder='Buscar conversaciones…';search.setAttribute('aria-label','Buscar conversaciones por título');let savedRows=[];
 const retry=el('button','↻ Regenerar última respuesta','sai-action');retry.type='button';
 const mic=el('button','🎙️ Dictar','sai-action');mic.type='button';controls.insertBefore(mic,submit);
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;let recognition=null;
 if(!SpeechRecognition){mic.disabled=true;mic.title='Tu navegador no admite dictado por voz';}
 mic.onclick=()=>{if(!SpeechRecognition||busy||historyBusy)return;if(recognition){recognition.stop();return;}if(!confirm('¿Permitir el dictado? El navegador puede enviar el audio a su servicio de reconocimiento de voz. Revisa el texto antes de enviarlo.'))return;try{const r=new SpeechRecognition();recognition=r;r.lang='es-ES';r.interimResults=false;r.continuous=false;mic.textContent='■ Detener dictado';r.onresult=e=>{if(!root.isConnected)return;const transcript=Array.from(e.results).map(x=>x[0].transcript).join(' ');input.value=(input.value+' '+transcript).trim().slice(0,1000);updateCount();};r.onerror=()=>{status.textContent='No se pudo reconocer la voz. Comprueba los permisos del micrófono.';};r.onend=()=>{recognition=null;mic.textContent='🎙️ Dictar';};r.start();}catch(_){recognition=null;mic.textContent='🎙️ Dictar';status.textContent='El dictado no está disponible.';}};
 const observer=new MutationObserver(()=>{if(!root.isConnected||!shell.isConnected){try{recognition?.abort();}catch(_){}window.speechSynthesis?.cancel();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
 for(const b of [saveChat,renameChat,deleteChat])b.type='button';
 const welcome='¡Hola! Soy el asistente de SB V2. Puedo orientarte sobre anime, manga, videojuegos y las funciones de la comunidad.';
 function syncControls(){for(const b of [clear,saveChat,renameChat,deleteChat,...historyList.querySelectorAll('button')])b.disabled=busy||historyBusy;saveChat.hidden=!!activeId;renameChat.hidden=deleteChat.hidden=!activeId;submit.disabled=busy||historyBusy;retry.disabled=busy||historyBusy||!messages.some(m=>m.who==='Tú');mic.disabled=busy||historyBusy||!SpeechRecognition;historyNote.textContent=activeId?'Chat guardado · últimos 40 mensajes.':'Chat temporal · no se guarda en Supabase.';}
 async function listChats(){const {data,error}=await sb.from('sb_ai_conversations').select('id,title').eq('user_id',session.user.id).order('updated_at',{ascending:false}).limit(100);if(error){historyNote.textContent='No se pudo cargar el historial.';return;}savedRows=data||[];renderHistory();} function renderHistory(){historyList.replaceChildren();const filter=normal(search.value).trim();const rows=savedRows.filter(row=>normal(row.title).includes(filter));for(const row of rows){const b=el('button',row.title);b.type='button';b.setAttribute('aria-pressed',String(row.id===activeId));b.onclick=()=>openChat(row.id);historyList.append(b);}if(!rows.length)historyList.append(el('p',filter?'No hay resultados.':'No tienes conversaciones guardadas.','sai-note'));syncControls();}search.addEventListener('input',renderHistory);
 function renderChat(){chat.replaceChildren();add('Shadow AI',welcome,null,false);for(const m of messages)add(m.who,m.text,m.route,false,m);updateCount();}
 function newChat(){activeId=null;activeTitle='';messages=[];revision=null;input.value='';consent.checked=false;memory.checked=false;renderChat();syncControls();for(const b of historyList.querySelectorAll('button'))b.setAttribute('aria-pressed','false');input.focus();}
 async function withHistory(fn){if(busy||historyBusy)return;historyBusy=true;syncControls();try{await fn();}catch(_){status.textContent='No se pudo completar el cambio de historial. Inténtalo de nuevo.';}finally{historyBusy=false;syncControls();}}
 async function openChat(id){if(!activeId&&messages.length&&!confirm('¿Abrir otro chat y descartar la conversación temporal?'))return;await withHistory(async()=>{const {data,error}=await sb.from('sb_ai_conversations').select('id,title,messages,updated_at').eq('id',id).eq('user_id',session.user.id).single();if(error||!data)throw error||Error('No disponible');activeId=data.id;activeTitle=data.title;revision=data.updated_at;messages=(Array.isArray(data.messages)?data.messages:[]).filter(m=>m&&typeof m.who==='string'&&typeof m.text==='string').slice(-40).map(m=>({who:m.who.slice(0,50),text:m.text.slice(0,5000),route:validRoutes.has(m.route)?m.route:null,rating:m.rating===1?1:m.rating===-1?-1:0}));input.value='';consent.checked=false;memory.checked=false;renderChat();await listChats();});}
 async function persist(){if(!activeId)return;const old=revision;const now=new Date().toISOString();const {data,error}=await sb.from('sb_ai_conversations').update({messages,updated_at:now}).eq('id',activeId).eq('user_id',session.user.id).eq('updated_at',old).select('updated_at').maybeSingle();if(error||!data)throw error||Error('Conflicto de versión');revision=data.updated_at;}
 saveChat.onclick=()=>withHistory(async()=>{if(!confirm('¿Guardar esta conversación en tu cuenta de SB V2? Evita incluir datos personales.'))return;const title=(messages.find(m=>m.who==='Tú')?.text||'Nueva conversación').trim().slice(0,100)||'Nueva conversación';const {data,error}=await sb.from('sb_ai_conversations').insert({user_id:session.user.id,title,messages}).select('id,title,updated_at').single();if(error)throw error;activeId=data.id;activeTitle=data.title;revision=data.updated_at;await listChats();status.textContent='Conversación guardada.';});
 renameChat.onclick=()=>withHistory(async()=>{if(!activeId)return;const title=prompt('Nuevo nombre de la conversación:',activeTitle)?.trim().slice(0,100);if(!title)return;const {data,error}=await sb.from('sb_ai_conversations').update({title}).eq('id',activeId).eq('user_id',session.user.id).select('id').maybeSingle();if(error||!data)throw error||Error('No disponible');activeTitle=title;await listChats();});
 deleteChat.onclick=()=>withHistory(async()=>{if(!activeId||!confirm('¿Eliminar esta conversación guardada definitivamente?'))return;const {data,error}=await sb.from('sb_ai_conversations').delete().eq('id',activeId).eq('user_id',session.user.id).select('id').maybeSingle();if(error||!data)throw error||Error('No disponible');newChat();await listChats();status.textContent='Conversación eliminada.';});
 const memory=el('input');memory.type='checkbox';memory.checked=false;memory.disabled=true;const memoryLabel=el('label',null,'sai-consent');memoryLabel.append(memory,document.createTextNode(' Usar memoria de este chat: al activar la IA generativa, enviar también hasta 8 mensajes anteriores a OpenAI.'));
 function guide(question){
 const text=normal(question);const words=new Set(text.split(/\s+/));
 const ranked=(guides||[]).map(g=>({g,score:g.keywords.split(',').reduce((s,k)=>s+((words.has(normal(k))||words.has(normal(k)+'s')||words.has(normal(k)+'es'))?1:0),0)+(text.includes(normal(g.title))?5:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 if(!ranked.length){add('Shadow AI · Guía interna','No tengo una respuesta específica. Pregúntame sobre Anime, Manga, Gaming, Shadow Home, City, Arena, Academy, Universe, Reels o tu cuenta.');return;}
 for(const {g} of ranked.slice(0,2))add('Shadow AI · Guía interna',g.title+'\n'+g.answer,g.route);
 }
 async function streamAnswer(data){
  if(typeof data?.answer==='string'&&data.answer.trim()){add('Shadow AI · Generativa',data.answer);return true;}
  if(!data?.body?.getReader)return false;
  const card=el('article',null,'sai-message'),output=el('p','…');card.append(el('strong','Shadow AI · Generativa'),output);chat.append(card);
  const reader=data.body.getReader(),decoder=new TextDecoder();let pending='',answer='',finished=false,incomplete=false;
  try{
   while(!finished){
    const {done,value}=await reader.read();if(done)break;
    pending+=decoder.decode(value,{stream:true});
    let i;
    while((i=pending.indexOf('\n'))>=0){
     const line=pending.slice(0,i).trimEnd();pending=pending.slice(i+1);
     if(!line.startsWith('data:'))continue;
     let event;try{event=JSON.parse(line.slice(5))}catch(_){continue;}
     if(event.error){incomplete=true;finished=true;break;}
     if(typeof event.delta==='string'){answer=(answer+event.delta).slice(0,5000);output.textContent=answer;chat.scrollTop=chat.scrollHeight;}
     if(event.done){incomplete=!!event.incomplete;finished=true;break;}
    }
    if(pending.length>1000000)throw Error('Invalid stream');
   }
  }catch(_){incomplete=true;}finally{try{await reader.cancel();}catch(_){}card.remove();}
  if(!answer.trim())return false;
  add(incomplete||!finished?'Shadow AI · Respuesta incompleta':'Shadow AI · Generativa',answer);
  return true;
 }
 async function ask(question,regenerate=false){if(busy||historyBusy||!question.trim())return;const lastUser=messages.map(m=>m.who).lastIndexOf('Tú');const contextSource=regenerate&&lastUser>=0?messages.slice(0,lastUser):messages;const context=memory.checked?contextSource.filter(m=>m.who==='Tú'||m.who==='Shadow AI · Generativa'||m.who==='Shadow AI · Guía interna').slice(-8).map(m=>({role:m.who==='Tú'?'user':'assistant',content:m.text.slice(0,1200)})):[];busy=true;syncControls();submit.disabled=true;refresh.disabled=true;clear.disabled=true;submit.textContent='Consultando…';input.value='';updateCount();if(!regenerate)add('Tú',question);try{
 if(enabled&&consent.checked){consent.checked=false;status.textContent='Consultando IA generativa…';const {data,error}=await sb.functions.invoke('shadow-ai',{body:{question,consent:true,history:context,stream:true}});if(error||!await streamAnswer(data)){add('Shadow AI','La IA generativa no está disponible o has alcanzado el límite. Te muestro la guía interna.');guide(question);}}
 else guide(question);
 }catch(e){add('Shadow AI','No se pudo completar la consulta.');guide(question);}finally{let saved=true;try{await persist();}catch(_){saved=false;}busy=false;refresh.disabled=checking;submit.textContent='Enviar ➜';syncControls();status.textContent=saved?'Listo para tu siguiente pregunta.':'No se pudo guardar el chat (posible cambio en otro dispositivo). Conserva esta pantalla y copia lo necesario antes de salir.';input.focus();}}
 for(const [icon,text] of [['🎬','Recomiéndame anime'],['📚','Recomiéndame manga'],['🎮','Recomiéndame videojuegos'],['🏠','Shadow Home'],['🌆','Shadow City'],['⚔️','Shadow Arena'],['🎓','Shadow Academy'],['🌌','Shadow Universe'],['📱','Historias y Reels']]){const b=el('button',icon+' '+text);b.type='button';b.onclick=()=>{input.value=text;updateCount();input.focus();};quick.append(b);}
 form.append(composer,label,memoryLabel,info,el('p','Enter para enviar · Mayús + Enter para nueva línea.','sai-note'));form.onsubmit=e=>{e.preventDefault();ask(input.value.trim());};
 retry.onclick=()=>{if(busy||historyBusy)return;const last=[...messages].reverse().find(m=>m.who==='Tú');if(!last)return;if(!confirm('¿Generar otra respuesta a tu última pregunta? Se conservará la anterior. Si está activada la IA generativa, cuenta como una nueva consulta.'))return;if(enabled&&!consent.checked){input.value=last.text;updateCount();input.focus();status.textContent='Marca la casilla de IA generativa si deseas una respuesta nueva de OpenAI y pulsa Regenerar otra vez, o envía la pregunta.';return;}ask(last.text,true);};
 clear.onclick=()=>{if(!busy&&!historyBusy){if(activeId||!messages.length||confirm('¿Iniciar un chat nuevo y descartar este chat temporal?'))newChat();}};
 aside.append(historyTitle,historyNote,clear,saveChat,renameChat,deleteChat,search,historyList,retry,el('h3','Explora con Shadow AI'),el('p','Elige una sugerencia para empezar.','sai-note'),quick,refresh);
 const studio=el('details',null,'sai-studio'),studioTitle=el('summary','🖼️ Estudio de imágenes'),studioNote=el('p','Las imágenes se envían a OpenAI solo cuando lo confirmas. No se guardan en el historial de SB V2.','sai-note');
 const imageStatus=el('p','Comprobando disponibilidad…','sai-note');imageStatus.setAttribute('role','status');
 const picture=el('input');picture.type='file';picture.accept='image/jpeg,image/png,image/webp';picture.setAttribute('aria-label','Adjuntar imagen JPEG, PNG o WebP');
 const promptImage=el('textarea',null,'sai-input');promptImage.rows=3;promptImage.maxLength=1000;promptImage.placeholder='Describe la imagen que quieres crear o pregunta por la foto adjunta.';promptImage.setAttribute('aria-label','Consulta del estudio de imágenes');
 const visionBtn=el('button','📎 Analizar imagen','sai-action'),generateBtn=el('button','✨ Generar imagen','sai-send'),imageOutput=el('div',null,'sai-image-output'),preview=el('img');preview.alt='Vista previa de la imagen adjunta';preview.hidden=true;
 let visionAvailable=false,imagesAvailable=false,imageBusy=false,attached=null,readingImage=false;
 for(const b of [visionBtn,generateBtn])b.type='button';
 function imageControls(){visionBtn.disabled=imageBusy||readingImage||!visionAvailable||!attached;generateBtn.disabled=imageBusy||!imagesAvailable;picture.disabled=imageBusy;}
 picture.onchange=async()=>{attached=null;preview.hidden=true;preview.removeAttribute('src');const file=picture.files?.[0];if(!file){imageControls();return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){picture.value='';imageStatus.textContent='Selecciona una imagen JPEG, PNG o WebP de hasta 1 MB.';imageControls();return;}readingImage=true;imageControls();try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});if(picture.files?.[0]!==file)return;attached=data;preview.src=data;preview.hidden=false;imageStatus.textContent='Imagen preparada. Confirma antes de enviarla.';}catch(_){imageStatus.textContent='No se pudo leer la imagen.';}finally{readingImage=false;imageControls();}};
 async function imageRequest(mode){if(imageBusy||readingImage||!(mode==='vision'?visionAvailable&&attached:imagesAvailable))return;const question=promptImage.value.trim()||(mode==='vision'?'Describe esta imagen.':'');if(!question){imageStatus.textContent='Escribe una descripción para generar una imagen.';return;}if(!confirm(mode==='vision'?'¿Enviar esta foto y tu consulta a OpenAI? Evita fotos privadas o datos personales. Cuenta como una consulta.':'¿Generar una imagen con OpenAI? Puede tener un coste y consume una generación y una consulta de tu límite diario.'))return;
 imageBusy=true;imageControls();imageOutput.replaceChildren();imageStatus.textContent=mode==='vision'?'Analizando imagen…':'Generando imagen…';
 try{const {data,error}=await sb.functions.invoke('shadow-ai',{body:{mode,question,consent:true,...(mode==='vision'?{image:attached}:{})}});
 if(error){let detail;try{detail=await error.context?.json();}catch(_){}throw Error(detail?.error||'No se pudo completar la solicitud.');}
 if(mode==='vision'&&typeof data?.answer==='string'){imageOutput.append(el('p',data.answer));}
 else if(mode==='generate'&&typeof data?.image==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(data.image)&&data.image.length<=5000000){const img=el('img');img.alt='Imagen generada por Shadow AI';img.src='data:image/jpeg;base64,'+data.image;const download=el('a','Guardar imagen','outline-btn mini');download.href=img.src;download.download='shadow-ai-imagen.jpg';imageOutput.append(img,download);}
 else throw Error('No se recibió un resultado válido.');
 imageStatus.textContent='Solicitud completada.';
 }catch(e){imageStatus.textContent=e.message||'No se pudo completar la solicitud.';}finally{imageBusy=false;imageControls();}}
 visionBtn.onclick=()=>imageRequest('vision');generateBtn.onclick=()=>imageRequest('generate');
 const imageActions=el('div',null,'sai-controls');imageActions.append(visionBtn,generateBtn);studio.append(studioTitle,studioNote,promptImage,picture,preview,imageActions,imageStatus,imageOutput);imageControls();
 const admin=el('details',null,'sai-studio'),adminSummary=el('summary','⚙️ Administración de Shadow AI'),adminData=el('div'),adminRefresh=el('button','Actualizar estadísticas','sai-action');adminRefresh.type='button';admin.hidden=true;admin.append(adminSummary,adminData,adminRefresh);
 async function loadAdmin(){try{const {data,error}=await sb.rpc('sb_ai_admin_usage');if(error||!data||typeof data.requests!=='number'){admin.hidden=true;return;}admin.hidden=false;adminData.replaceChildren(el('p','Fecha UTC: '+data.day),el('p','Consultas reservadas: '+data.requests+' / '+data.limit),el('p','Generaciones reservadas: '+data.images+' / '+data.image_limit),el('p','Miembros con consultas: '+data.members),el('p','Incluye solicitudes fallidas tras reservar cuota. El coste real se consulta en OpenAI.','sai-note'));const a=el('a','Ver facturación y uso en OpenAI','outline-btn mini');a.href='https://platform.openai.com/usage';a.target='_blank';a.rel='noopener noreferrer';adminData.append(a);}catch(_){admin.hidden=true;}}
 adminRefresh.onclick=loadAdmin;loadAdmin();
 main.append(chat,form,status,studio,admin);
 add('Shadow AI',welcome,null,false);syncControls();listChats().catch(()=>{});
 status.textContent='Asistente disponible. Guarda el chat solo si lo deseas.';
 async function checkConnection(){if(checking||busy)return;checking=true;refresh.disabled=true;state.textContent='Comprobando conexión…';state.dataset.state='checking';try{const {data,error}=await sb.functions.invoke('shadow-ai',{body:{mode:'status'}});if(!root.isConnected)return;enabled=!error&&data?.enabled===true;visionAvailable=enabled&&data?.vision===true;imagesAvailable=enabled&&data?.images===true;}catch(_){enabled=false;visionAvailable=false;imagesAvailable=false;}finally{checking=false;imageStatus.textContent=enabled?'Análisis y generación sujetos a disponibilidad del modelo.':'Activa la IA generativa para usar el estudio.';imageControls();refresh.disabled=busy;consent.disabled=!enabled;memory.disabled=!enabled;if(!enabled){consent.checked=false;memory.checked=false;}state.dataset.state=enabled?'online':'offline';state.textContent=enabled?'● IA generativa disponible':'● Guía interna activa';info.textContent=enabled?'IA generativa opcional · 10 consultas por miembro y día, máximo 100 para la comunidad. Las respuestas pueden contener errores.':'IA generativa no disponible. Puedes usar la guía interna o volver a comprobar la conexión.';}}
 refresh.onclick=checkConnection;await checkConnection();
 }catch(e){status.textContent='No se pudo cargar Shadow AI: '+e.message;root.append(btn('Reintentar',mount));}
}
return {mount};
})();