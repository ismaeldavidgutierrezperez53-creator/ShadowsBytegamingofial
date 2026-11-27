/* Shadow Academy — learning and virtual diplomas */
window.SBShadowAcademy=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const ok=r=>{if(r.error)throw r.error;return r.data;};
const button=(text,fn)=>{const b=el('button',text,'gradient-btn mini');b.type='button';b.onclick=fn;return b;};
const date=s=>new Date(s).toLocaleDateString('es-ES');
const rank=n=>['Aprendiz','Estudiante','Especialista','Maestro de Shadow Academy'][Math.min(n,3)];
async function mount(){
 const root=document.getElementById('sb-shadow-academy');if(!root)return;
 root.replaceChildren();const status=el('p','Cargando academia…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);
 const panel=el('div');root.append(panel);
 try{
 const user=ok(await sb.auth.getSession()).session?.user;if(!root.isConnected)return;
 if(!user){status.textContent='Inicia sesión para estudiar.';const a=el('a','Iniciar sesión','gradient-btn');a.href='#/auth';panel.append(a);return;}
 let busy=false,selected=null,generation=0;
 async function act(action,id,lesson=null,answers=null){
 if(busy)return;busy=true;for(const b of panel.querySelectorAll('button'))b.disabled=true;status.textContent='Guardando progreso…';
 try{const result=ok(await sb.rpc('sb_academy_action',{p_action:action,p_course:id,p_lesson:lesson,p_answers:answers}));await load();if(root.isConnected)status.textContent=action==='exam'?(result.passed_at?'🎓 ¡Examen aprobado! Diploma conseguido. ':'Sigue practicando. ')+result.score+'/100':action==='enroll'?'✅ Inscripción realizada.':'✅ Lección completada.';}
 catch(e){try{await load();}catch(_){}if(root.isConnected)status.textContent='No se pudo completar: '+e.message;}finally{busy=false;}
 }
 async function load(){
 const token=++generation;
 const [c,p]=await Promise.all([sb.from('sb_academy_courses').select('id,symbol,title,description,sort_order,lessons').order('sort_order'),sb.from('sb_academy_progress').select('course_id,lesson_count,attempts,best_score,last_attempt,passed_at,diploma_id').eq('user_id',user.id)]);
 const courses=ok(c)||[],progress=ok(p)||[];if(!root.isConnected||token!==generation)return;
 const byId=new Map(progress.map(x=>[x.course_id,x]));const passed=progress.filter(x=>x.passed_at).length;
 panel.replaceChildren();
 const header=el('section');header.style.cssText='padding:20px;border:1px solid #a78bfa;border-radius:18px;background:linear-gradient(145deg,#332052,#131827);color:#fff;margin:12px 0';
 header.append(el('h2','🎓 '+rank(passed)),el('p',passed+' / '+courses.length+' diplomas · '+progress.reduce((s,x)=>s+x.lesson_count,0)+' / '+courses.length*3+' lecciones'));
 const bar=el('progress');bar.max=Math.max(courses.length,1);bar.value=passed;bar.setAttribute('aria-label','Cursos aprobados');bar.style.cssText='width:100%;accent-color:#c084fc';header.append(bar);panel.append(header);
 const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px';
 for(const course of courses){const row=byId.get(course.id);const card=el('article');card.style.cssText='padding:16px;border:1px solid #a855f777;border-radius:14px;background:linear-gradient(145deg,#291942,#181326);color:#fff';
 card.append(el('h3',course.symbol+' '+course.title),el('p',course.description),el('p',row?.passed_at?'🎓 Aprobado · '+row.best_score+'/100':row?'📖 '+row.lesson_count+'/3 lecciones':'Curso disponible'));
 card.append(button(row?'Abrir curso':'Inscribirme',()=>{if(busy)return;selected=course.id;if(!row)act('enroll',course.id);else load().catch(e=>status.textContent=e.message);}));grid.append(card);}
 panel.append(el('h2','📚 Catálogo de cursos'),grid);
 const current=courses.find(c=>c.id===selected);const row=byId.get(selected);
 if(current&&row){
 const detail=el('section');detail.style.cssText='margin-top:18px;padding:16px;border:1px solid #a855f777;border-radius:16px;overflow-wrap:anywhere';detail.append(el('h2',current.symbol+' '+current.title));
 for(const [i,lesson] of current.lessons.entries()){
 const box=el('details');box.style.cssText='padding:12px;border:1px solid #a855f744;border-radius:10px;margin:8px 0';
 box.append(el('summary',(i<row.lesson_count?'✅ ':'📖 ')+'Lección '+(i+1)),el('p',lesson));if(i===row.lesson_count){box.open=true;box.append(button('Marcar como completada',()=>act('lesson',current.id,i+1)));}else if(i>row.lesson_count){box.replaceChildren(el('summary','🔒 Lección '+(i+1)),el('p','Completa la lección anterior.'));}detail.append(box);
 }
 if(row.passed_at){
 const diploma=el('section');diploma.style.cssText='padding:20px;text-align:center;border:2px solid #eab308;border-radius:16px;background:#211a30;color:#fff;margin-top:15px';
 diploma.append(el('h2','🏅 Diploma virtual'),el('p','Shadow Byte Gaming Official V2'),el('h3',current.title),el('p','Nota: '+row.best_score+'/100 · '+date(row.passed_at)),el('small','Identificador: '+row.diploma_id),el('p','Reconocimiento interno de la comunidad, sin acreditación oficial.'));
 diploma.append(button('Descargar diploma TXT',async()=>{const profile=await sb.from('profiles').select('display_name,username').eq('id',user.id).maybeSingle();if(profile.error){status.textContent='No se pudo descargar: '+profile.error.message;return;}const name=profile.data?.display_name||profile.data?.username||'Miembro';const text=['SHADOW ACADEMY — DIPLOMA VIRTUAL','Miembro: '+name,'Curso: '+current.title,'Nota: '+row.best_score+'/100','Fecha: '+date(row.passed_at),'ID: '+row.diploma_id,'Reconocimiento interno sin acreditación oficial.'].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='shadow-academy-'+current.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 detail.append(diploma);
 }else if(row.lesson_count===3){
 detail.append(el('h3','📝 Examen final'),el('p','5 preguntas · 80/100 para aprobar · 5 minutos entre intentos. Mejor nota: '+row.best_score+'/100 · Intentos: '+row.attempts));
 const start=button('Comenzar examen',async()=>{
 if(busy)return;start.disabled=true;
 try{const qs=ok(await sb.from('sb_academy_questions').select('number,question,options').eq('course_id',current.id).order('number'))||[];
 if(!root.isConnected||token!==generation)return;if(qs.length!==5)throw Error('Examen no disponible');
 const form=el('form'),selectedAnswers=new Map();const count=el('p','0 / 5 respondidas');const submit=el('button','Entregar examen','gradient-btn');submit.type='submit';submit.disabled=true;
 for(const q of qs){const field=el('fieldset');field.style.cssText='padding:12px;margin:10px 0;border:1px solid #a855f766;border-radius:12px;min-width:0';field.append(el('legend',q.number+'. '+q.question));q.options.forEach((v,i)=>{const label=el('label');label.style.cssText='display:flex;align-items:center;gap:8px;margin:8px 0';const input=el('input');input.type='radio';input.name='academy-'+q.number;input.value=String(i+1);input.required=true;input.onchange=()=>{selectedAnswers.set(q.number,i+1);count.textContent=selectedAnswers.size+' / 5 respondidas';submit.disabled=selectedAnswers.size!==5;};label.append(input,el('span',v));field.append(label);});form.append(field);}
 form.append(count,submit);form.onsubmit=e=>{e.preventDefault();if(selectedAnswers.size===5&&confirm('¿Entregar tu examen?'))act('exam',current.id,null,qs.map(q=>selectedAnswers.get(q.number)));};start.replaceWith(form);
 }catch(e){status.textContent='No se pudo abrir el examen: '+e.message;start.disabled=false;}});
 detail.append(start);
 }
 panel.append(detail);
 }
 status.textContent='Aprende a tu ritmo y consigue tus diplomas virtuales.';
 }
 await load();
 }catch(e){status.textContent='No se pudo iniciar Shadow Academy: '+e.message;panel.append(button('Reintentar',mount));}
}
return {mount};
})();