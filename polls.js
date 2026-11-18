// Encuestas públicas y gestión administrativa.
const pollEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function renderCommunityPolls(){
 const host=document.getElementById('community-polls');if(!host)return;
 const [{data:polls,error},{data:{user}}]=await Promise.all([sb.from('community_polls').select('id,question,category,status,created_at').in('status',['published','closed']).order('created_at',{ascending:false}).limit(30),sb.auth.getUser()]);
 if(!host.isConnected)return;
 if(error){host.textContent='No se pudieron cargar las encuestas.';return}
 if(!polls?.length){host.textContent='Todavía no hay encuestas publicadas.';return}
 host.replaceChildren();
 for(const poll of polls){
  const card=document.createElement('article');card.className='fan-card';card.style.marginBottom='18px';
  const title=document.createElement('h3');title.textContent=poll.question;card.append(title);
  const sub=document.createElement('p');sub.textContent=poll.category+' · '+(poll.status==='closed'?'Cerrada':'Abierta');card.append(sub);
  const [{data:options},{data:counts},{data:mine}]=await Promise.all([
   sb.from('community_poll_options').select('id,label').eq('poll_id',poll.id).order('sort_order'),
   sb.rpc('community_poll_results',{target_poll:poll.id}),
   user?sb.from('community_poll_votes').select('option_id').eq('poll_id',poll.id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null})
  ]);
  if(!host.isConnected)return;
  const total=(counts||[]).reduce((sum,x)=>sum+Number(x.votes),0);
  for(const option of options||[]){
   const votes=Number((counts||[]).find(x=>x.option_id===option.id)?.votes||0);
   const row=document.createElement('div');row.style.cssText='margin:12px 0';
   const button=document.createElement('button');button.type='button';button.className='outline-btn';button.style.cssText='width:100%;text-align:left;cursor:pointer';button.textContent=(mine?.option_id===option.id?'✓ ':'')+option.label+' — '+(total?Math.round(votes*100/total):0)+'% ('+votes+')';
   button.disabled=!user||!!mine||poll.status!=='published';button.onclick=async()=>{button.disabled=true;const {error:e}=await sb.from('community_poll_votes').insert({poll_id:poll.id,option_id:option.id,user_id:user.id});if(e)alert('No se pudo votar: '+e.message);await renderCommunityPolls()};row.append(button);card.append(row);
  }
  if(!user){const a=document.createElement('a');a.href='#/auth';a.textContent='Inicia sesión para votar';card.append(a)}
  const count=document.createElement('p');count.textContent=total+' votos';card.append(count);host.append(card);
 }
}
async function initPollAdmin(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');if(!dashboard||document.getElementById('poll-admin-panel'))return;
 const panel=document.createElement('section');panel.id='poll-admin-panel';panel.className='admin-panel';
 panel.innerHTML='<h2>📊 Encuestas</h2><p>Crea una encuesta con 2 a 6 opciones, una por línea.</p><form id="poll-admin-form"><div class="admin-fields"><label>Pregunta<input name="question" required maxlength="240" minlength="5" placeholder="¿Cuál es tu anime favorito?"></label><label>Categoría<select name="category"><option value="anime">Anime</option><option value="manga">Manga</option><option value="gaming">Gaming</option><option value="personajes">Personajes</option><option value="otros">Otros</option></select></label><label>Opciones<textarea name="options" rows="5" required placeholder="Opción 1&#10;Opción 2"></textarea></label></div><button class="gradient-btn" type="submit">Publicar encuesta</button><p id="poll-admin-status" role="status"></p></form><div id="poll-admin-list"></div>';dashboard.append(panel);
 const form=panel.querySelector('form'),status=panel.querySelector('#poll-admin-status');
 form.onsubmit=async event=>{event.preventDefault();const {data:{user}}=await sb.auth.getUser();if(user?.app_metadata?.role!=='admin')return;const values=new FormData(form),options=String(values.get('options')).split('\n').map(s=>s.trim()).filter(Boolean);if(options.length<2||options.length>6){status.textContent='Escribe entre 2 y 6 opciones.';return}const question=String(values.get('question')).trim();if(question.length<5){status.textContent='La pregunta es demasiado corta.';return}const {data:poll,error}=await sb.from('community_polls').insert({question,category:values.get('category'),status:'draft'}).select('id').single();if(error){status.textContent=error.message;return}const {error:optionError}=await sb.from('community_poll_options').insert(options.map((label,i)=>({poll_id:poll.id,label,sort_order:i})));if(optionError){status.textContent='Encuesta en borrador: '+optionError.message;return}const {error:publishError}=await sb.from('community_polls').update({status:'published'}).eq('id',poll.id);status.textContent=publishError?'No se pudo publicar: '+publishError.message:'Encuesta publicada correctamente.';if(!publishError)form.reset();loadPollAdminList()};
 async function loadPollAdminList(){const root=panel.querySelector('#poll-admin-list');const {data}=await sb.from('community_polls').select('id,question,status').order('created_at',{ascending:false}).limit(30);root.replaceChildren();for(const poll of data||[]){const row=document.createElement('div');row.style.cssText='padding:12px 0;border-bottom:1px solid #ffffff22';const name=document.createElement('span');name.textContent=poll.question+' · '+poll.status+' ';row.append(name);const select=document.createElement('select');for(const value of ['draft','published','closed']){const opt=document.createElement('option');opt.value=value;opt.textContent=value;select.append(opt)}select.value=poll.status;select.onchange=async()=>{const {error}=await sb.from('community_polls').update({status:select.value}).eq('id',poll.id);if(error)alert(error.message);loadPollAdminList()};row.append(select);root.append(row)}}loadPollAdminList();
}
const previousPollInitAdmin=typeof initAdmin==='function'?initAdmin:null;
if(previousPollInitAdmin){initAdmin=async function(...args){await previousPollInitAdmin.apply(this,args);await initPollAdmin()}}
