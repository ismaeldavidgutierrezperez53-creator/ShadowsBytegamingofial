/* Shadow AI — internal guide and optional generative assistant */
window.SBShadowAI=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const btn=(text,fn)=>{const b=el('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b;};
const normal=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
const validRoutes=new Set(['/shadow-city','/shadow-arena','/shadow-academy','/comunidad','/shadow-universe','/anime','/manga','/gaming','/cuenta','/tienda']);
async function mount(){
 const root=document.getElementById('sb-shadow-ai');if(!root)return;root.replaceChildren();
 const status=el('p','Cargando asistente…');status.setAttribute('role','status');root.append(status);
 try{
 const {data:{session},error}=await sb.auth.getSession();if(error)throw error;if(!root.isConnected)return;
 if(!session?.user){status.textContent='Inicia sesión para utilizar Shadow AI.';const a=el('a','Iniciar sesión','gradient-btn');a.href='#/auth';root.append(a);return;}
 const {data:guides,error:guideError}=await sb.from('sb_ai_guides').select('id,title,keywords,answer,route').order('id');if(guideError)throw guideError;if(!root.isConnected)return;
 const chat=el('section');chat.style.cssText='padding:16px;border:1px solid #a855f766;border-radius:16px;background:#181327;color:#fff;max-height:55vh;overflow:auto;display:grid;gap:12px';chat.setAttribute('role','log');chat.setAttribute('aria-live','polite');
 function add(who,text,route){const card=el('article');card.style.cssText='padding:12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;background:'+(who==='Tú'?'#34204b':'#24223c');card.append(el('strong',who),el('p',text));if(validRoutes.has(route)&&(!window.SBVisibility||window.SBVisibility.allowed(route))){const a=el('a','Abrir apartado','outline-btn mini');a.href='#'+route;card.append(a);}chat.append(card);while(chat.children.length>40)chat.firstElementChild.remove();chat.scrollTop=chat.scrollHeight;}
 const form=el('form');form.style.cssText='margin:12px 0;display:grid;gap:8px';
 const input=el('textarea');input.rows=3;input.maxLength=1000;input.required=true;input.placeholder='¿Qué anime me recomiendas?';input.setAttribute('aria-label','Tu consulta');input.style.width='100%';
 const consent=el('input');consent.type='checkbox';consent.disabled=true;const label=el('label');label.append(consent,document.createTextNode(' Usar IA generativa: enviar esta consulta a OpenAI. No incluyas datos personales.'));
 const info=el('p','Modo guía interna · sin envío a un proveedor de IA.');const submit=el('button','Enviar consulta','gradient-btn');submit.type='submit';const quick=el('div');quick.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:10px 0';
 let busy=false,enabled=false;
 function guide(question){
 const text=normal(question);const words=new Set(text.split(/\s+/));
 const ranked=(guides||[]).map(g=>({g,score:g.keywords.split(',').reduce((s,k)=>s+(words.has(normal(k))?1:0),0)+(text.includes(normal(g.title))?5:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 if(!ranked.length){add('Shadow AI · Guía interna','No tengo una respuesta específica. Pregúntame sobre Anime, Manga, Gaming, Shadow City, Arena, Academy, Universe, Reels o tu cuenta.');return;}
 for(const {g} of ranked.slice(0,2))add('Shadow AI · Guía interna',g.title+'\n'+g.answer,g.route);
 }
 async function ask(question){if(busy||!question.trim())return;busy=true;submit.disabled=true;input.value='';add('Tú',question);try{
 if(enabled&&consent.checked){consent.checked=false;status.textContent='Consultando IA generativa…';const {data,error}=await sb.functions.invoke('shadow-ai',{body:{question,consent:true}});if(error||!data?.answer){add('Shadow AI','La IA generativa no está disponible o has alcanzado el límite. Te muestro la guía interna.');guide(question);}else add('Shadow AI · Generativa',data.answer);}
 else guide(question);
 }catch(e){add('Shadow AI','No se pudo completar la consulta.');guide(question);}finally{busy=false;submit.disabled=false;status.textContent='Listo para tu siguiente pregunta.';}}
 for(const text of ['Recomiéndame anime','Recomiéndame manga','Recomiéndame videojuegos','Shadow City','Shadow Arena','Shadow Academy','Shadow Universe','Historias y Reels'])quick.append(btn(text,()=>{input.value=text;input.focus();}));
 form.append(info,label,input,submit);form.onsubmit=e=>{e.preventDefault();ask(input.value.trim());};
 root.append(quick,chat,form,btn('Limpiar conversación',()=>{if(!busy){chat.replaceChildren();add('Shadow AI','¡Hola! ¿En qué puedo ayudarte?');}}));
 add('Shadow AI','¡Hola! Soy el asistente de SB V2. Puedo orientarte sobre anime, manga, videojuegos y las funciones de la comunidad.');
 status.textContent='Asistente disponible. No se guarda el historial en Supabase; se borra al salir de esta pantalla.';
 try{const {data,error}=await sb.functions.invoke('shadow-ai',{body:{mode:'status'}});if(!root.isConnected)return;if(!error&&data?.enabled===true){enabled=true;consent.disabled=false;info.textContent='IA generativa opcional · 10 consultas por miembro y día, máximo 100 para la comunidad. Las respuestas pueden contener errores.';}else info.textContent='Modo guía interna · IA generativa no configurada o no disponible.';}catch(_){info.textContent='Modo guía interna · IA generativa no disponible.';}
 }catch(e){status.textContent='No se pudo cargar Shadow AI: '+e.message;root.append(btn('Reintentar',mount));}
}
return {mount};
})();