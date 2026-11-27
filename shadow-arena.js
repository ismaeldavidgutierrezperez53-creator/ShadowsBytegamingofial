/* Shadow Arena — weekly community quiz competitions */
window.SBShadowArena=(()=>{
'use strict';
const cats={anime:'🌸 Anime',gaming:'🎮 Gaming',manga:'📚 Manga'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const ok=r=>{if(r.error)throw r.error;return r.data;};
const button=(title,handler)=>{const b=el('button',title,'gradient-btn mini');b.type='button';b.onclick=handler;return b;};
const medal=s=>s===50?'🥇 Oro':s>=40?'🥈 Plata':s>=30?'🥉 Bronce':'🎖️ Participación';
const date=s=>new Date(s+'T00:00:00Z').toLocaleDateString('es-ES',{timeZone:'UTC'});
async function mount(){
 const root=document.getElementById('sb-shadow-arena');if(!root)return;
 root.replaceChildren();const status=el('p','Cargando Shadow Arena…');status.setAttribute('role','status');root.append(status);
 const panel=el('div');root.append(panel);
 try{
 const user=ok(await sb.auth.getSession()).session?.user;if(!root.isConnected)return;
 if(!user){status.textContent='Inicia sesión para competir.';const a=el('a','Iniciar sesión','gradient-btn');a.href='#/auth';panel.append(a);return;}
 let category='anime',generation=0,busy=false,week=null;
 const selector=el('div');selector.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin:14px 0';
 const body=el('div');const tabs=[];
 for(const [id,title] of Object.entries(cats)){const b=button(title,()=>{if(busy)return;category=id;load();});tabs.push([id,b]);selector.append(b);}
 const refresh=button('↻ Actualizar',()=>{if(!busy)load();});selector.append(refresh);panel.append(selector,body);
 function selectTab(){for(const [id,b] of tabs){b.setAttribute('aria-pressed',String(category===id));b.disabled=busy;}}
 async function load(){
 const token=++generation,cat=category;selectTab();status.textContent='Cargando torneo…';body.replaceChildren();
 try{
 const w=ok(await sb.rpc('sb_arena_week'));if(!w)throw Error('Semana no disponible');
 const [q,r,m,h]=await Promise.all([
 sb.from('sb_arena_questions').select('number,question,options').eq('category',cat).order('number'),
 sb.from('sb_arena_results').select('user_id,score,completed_at').eq('category',cat).eq('week_start',w).order('score',{ascending:false}).order('completed_at').order('user_id').limit(100),
 sb.from('sb_arena_results').select('score').eq('user_id',user.id).eq('category',cat).eq('week_start',w).maybeSingle(),
 sb.from('sb_arena_results').select('category,score,week_start').eq('user_id',user.id).order('week_start',{ascending:false}).limit(30)]);
 const qs=ok(q)||[],ranking=ok(r)||[],mine=ok(m),history=ok(h)||[];
 const ids=[...new Set(ranking.map(x=>x.user_id))];const profiles=ids.length?ok(await sb.from('profiles').select('id,display_name,username').in('id',ids))||[]:[];
 if(!root.isConnected||token!==generation)return;week=w;
 const names=new Map(profiles.map(p=>[p.id,p.display_name||p.username||'Miembro']));
 const hero=el('section');hero.style.cssText='background:linear-gradient(145deg,#2f174c,#111827);color:#fff;border:1px solid #c084fc;border-radius:18px;padding:18px;margin-bottom:14px';
 hero.append(el('h2',cats[cat]+' · Torneo semanal'),el('p','Semana del '+date(w)+' · Reinicio cada lunes a las 00:00 UTC'),el('p','5 preguntas · 10 puntos por acierto · Un intento semanal por categoría.'));
 if(mine)hero.append(el('h3',medal(mine.score)+' · '+mine.score+' / 50 puntos'),el('p','Ya has participado. Puedes competir en otra categoría.'));
 else if(qs.length===5){
 const form=el('form');form.hidden=true;const selections=new Map();const count=el('p','0 / 5 respondidas');count.setAttribute('aria-live','polite');
 for(const item of qs){
 const group=el('fieldset');group.style.cssText='border:1px solid #a855f766;border-radius:12px;padding:12px;margin:12px 0;min-width:0';
 group.append(el('legend',item.number+'. '+item.question));
 item.options.forEach((option,i)=>{const label=el('label');label.style.cssText='display:flex;gap:8px;align-items:center;margin:8px 0;cursor:pointer;overflow-wrap:anywhere';const input=el('input');input.type='radio';input.name='arena-'+item.number;input.value=String(i+1);input.required=true;input.onchange=()=>{selections.set(item.number,i+1);count.textContent=selections.size+' / 5 respondidas';submit.disabled=selections.size!==5;};label.append(input,el('span',option));group.append(label);});
 form.append(group);
 }
 const submit=el('button','Enviar respuestas','gradient-btn');submit.type='submit';submit.disabled=true;
 form.append(count,submit);
 form.onsubmit=async e=>{e.preventDefault();if(busy||selections.size!==5||!confirm('¿Enviar tu intento semanal? No podrás repetirlo esta semana.'))return;busy=true;selectTab();submit.disabled=true;status.textContent='Calculando puntuación…';try{
 const result=ok(await sb.rpc('sb_arena_submit',{p_category:cat,p_week:w,p_answers:qs.map(x=>selections.get(x.number))}));busy=false;await load();if(root.isConnected)status.textContent='✅ '+medal(result.score)+' · '+result.score+' / 50 puntos';
 }catch(err){busy=false;selectTab();submit.disabled=false;status.textContent='No se pudo enviar: '+err.message;}};
 const start=button('⚔️ Comenzar reto',()=>{form.hidden=!form.hidden;start.textContent=form.hidden?'⚔️ Comenzar reto':'Ocultar preguntas';});hero.append(start,form);
 }else hero.append(el('p','El reto no está disponible.'));
 body.append(hero);
 const leaderboard=el('section');leaderboard.style.cssText='padding:16px;border:1px solid #a855f766;border-radius:16px;margin:14px 0';
 leaderboard.append(el('h2','🏆 Clasificación semanal'),el('p','Hasta 100 resultados visibles. Los empates comparten posición.'));
 if(!ranking.length)leaderboard.append(el('p','Todavía no hay participantes.'));
 let last=null,place=0;
 ranking.forEach((row,i)=>{if(row.score!==last){place=i+1;last=row.score;}const line=el('div');line.style.cssText='display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #a855f733;overflow-wrap:anywhere';line.append(el('span',(place===1?'🥇 ':place===2?'🥈 ':place===3?'🥉 ':'#'+place+' ')+(row.user_id===user.id?'Tú':names.get(row.user_id)||'Miembro')),el('strong',row.score+' pts'));leaderboard.append(line);});
 body.append(leaderboard);
 const past=el('details');past.style.cssText='padding:14px;border:1px solid #a855f766;border-radius:12px';past.append(el('summary','📜 Mi historial y medallas'));
 if(!history.length)past.append(el('p','Tus resultados aparecerán aquí.'));
 for(const row of history)past.append(el('p',date(row.week_start)+' · '+cats[row.category]+' · '+row.score+'/50 · '+medal(row.score)));
 body.append(past);status.textContent='Compite con otros miembros. Las medallas son virtuales y se calculan por puntuación.';
 }catch(e){if(token===generation)status.textContent='No se pudo cargar la Arena: '+e.message;}
 }
 await load();
 }catch(e){status.textContent='No se pudo iniciar Shadow Arena: '+e.message;panel.append(button('Reintentar',mount));}
}
return {mount};
})();