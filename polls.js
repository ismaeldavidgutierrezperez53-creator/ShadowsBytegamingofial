// Encuestas públicas y gestión administrativa.
const pollEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function renderCommunityPolls(){
 const host=document.getElementById('community-polls');if(!host)return;
 const [{data:polls,error},{data:userResponse}]=await Promise.all([
  sb.from('community_polls').select('id,question,category,status,created_at,featured,closes_at')
    .in('status',['published','closed']).order('created_at',{ascending:false}).limit(30),
  sb.auth.getUser()
 ]);
 if(!host.isConnected)return;
 if(error){host.textContent='No se pudieron cargar las encuestas.';return;}
 if(!polls?.length){host.textContent='Todavía no hay encuestas publicadas.';return;}
 const user=userResponse?.user||null;
 const categoryNames={anime:'Anime',manga:'Manga',gaming:'Gaming',personajes:'Personajes',otros:'Otros'};
 // Retrieve votes and answer choices without reading any personal vote information.
 const entries=await Promise.all(polls.map(async poll=>{
  const [optionResult,countResult,mineResult]=await Promise.all([
   sb.from('community_poll_options').select('id,label').eq('poll_id',poll.id).order('sort_order'),
   sb.rpc('community_poll_results',{target_poll:poll.id}),
   user?sb.from('community_poll_votes').select('option_id').eq('poll_id',poll.id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null})
  ]);
  const counts=countResult.error?[]:countResult.data||[];
  const total=counts.reduce((sum,item)=>sum+Number(item.votes||0),0);
  return {poll,options:optionResult.data||[],counts,total,mine:mineResult.data||null,
          dataError:!!optionResult.error||!!countResult.error};
 }));
 if(!host.isConnected)return;
 entries.sort((a,b)=>Number(!!b.poll.featured)-Number(!!a.poll.featured)||
                         b.total-a.total||
                         new Date(b.poll.created_at).getTime()-new Date(a.poll.created_at).getTime());
 const popularIds=new Set(entries.filter(x=>!x.poll.featured&&x.total>0)
   .slice(0,3).map(x=>x.poll.id));
 host.replaceChildren();
 const heading=document.createElement('div');heading.className='poll-community-heading';
 const title=document.createElement('h2');title.textContent='🌟 Destacadas y populares';
 const info=document.createElement('p');info.textContent='Encuestas destacadas por la administración y las más votadas.';
 heading.append(title,info);host.append(heading);
 const grid=document.createElement('div');grid.className='poll-community-grid';host.append(grid);
 for(const entry of entries){
  const {poll,options,counts,total,mine,dataError}=entry;
  const expired=!!poll.closes_at&&new Date(poll.closes_at).getTime()<=Date.now();
  const closed=poll.status==='closed'||expired;
  const card=document.createElement('article');card.className='fan-card poll-community-card';
  card.dataset.featured=String(!!poll.featured);
  card.dataset.pollId=poll.id;
  card.id='poll-'+poll.id;
  card.tabIndex=-1;
  const tags=document.createElement('div');tags.className='poll-community-tags';
  const category=document.createElement('span');category.className='poll-community-tag';
  category.textContent=categoryNames[poll.category]||poll.category||'General';tags.append(category);
  if(poll.featured){
   const star=document.createElement('span');star.className='poll-community-tag';star.dataset.type='featured';
   star.textContent='⭐ Destacada';tags.append(star);
  }else if(popularIds.has(poll.id)){
   const hot=document.createElement('span');hot.className='poll-community-tag';hot.dataset.type='popular';
   hot.textContent='🔥 Popular';tags.append(hot);
  }
  const state=document.createElement('span');state.className='poll-community-tag';
  state.textContent=closed?'Cerrada':'Abierta';tags.append(state);
  card.append(tags);
  const question=document.createElement('h3');question.textContent=poll.question;card.append(question);
  const meta=document.createElement('p');meta.className='poll-community-meta';
  meta.textContent=closed?'Votación finalizada':mine?'Ya has participado en esta encuesta':'Elige una respuesta para participar';
  card.append(meta);
  const reward=document.createElement('p');reward.className='poll-community-reward';
  reward.textContent=mine?'✅ Has obtenido +15 puntos por participar':closed?'🎁 Los participantes han obtenido 15 puntos por su voto':'🎁 ¡Vota y gana 15 puntos de experiencia!';
  card.append(reward);
  if(dataError){
   const err=document.createElement('p');err.textContent='No se pudieron cargar todos los resultados.';
   card.append(err);
  }
  for(const option of options){
   const votes=Number(counts.find(x=>x.option_id===option.id)?.votes||0);
   const percentage=total?Math.round(votes*100/total):0;
   const button=document.createElement('button');button.type='button';
   button.className='poll-community-option';
   if(mine?.option_id===option.id)button.classList.add('is-selected');
   button.textContent=(mine?.option_id===option.id?'✓ ':'')+option.label+' · '+percentage+' % ('+votes+')';
   button.disabled=dataError||!user||!!mine||closed;
   button.onclick=async()=>{
    button.disabled=true;
    const {error:voteError}=await sb.from('community_poll_votes')
     .insert({poll_id:poll.id,option_id:option.id,user_id:user.id});
    if(voteError)alert('No se pudo votar: '+voteError.message);
    else {
     // Una vez votado, el recordatorio deja de aparecer como pendiente.
     await sb.from('member_notifications').update({is_read:true})
      .eq('recipient_id',user.id).eq('poll_id',poll.id).eq('kind','poll_reminder').eq('is_read',false);
    }
    await renderCommunityPolls();
   };
   card.append(button);
  }
  if(!user){
   const link=document.createElement('a');link.href='#/auth';
   link.className='poll-community-login';link.textContent='Inicia sesión para votar';card.append(link);
  }
  if(poll.closes_at){
   const date=document.createElement('p');date.className='poll-community-deadline';
   date.textContent='⏰ '+(closed?'Cierre: ':'Cierra: ')+new Intl.DateTimeFormat('es-ES',
    {dateStyle:'medium',timeStyle:'short'}).format(new Date(poll.closes_at));
   card.append(date);
  }
  const count=document.createElement('p');count.className='poll-community-tally';
  count.textContent=total+' voto'+(total===1?'':'s');card.append(count);
  grid.append(card);
 }
 const query=location.hash.split('?')[1]||'';
 const selectedPoll=new URLSearchParams(query).get('poll');
 if(selectedPoll&&/^[0-9a-f-]{36}$/i.test(selectedPoll)){
  const target=grid.querySelector('[data-poll-id="'+selectedPoll+'"]');
  if(target){
   target.classList.add('poll-community-target');
   requestAnimationFrame(()=>{
    if(!target.isConnected)return;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});
    target.focus({preventScroll:true});
   });
  }
 }
}
async function initPollAdmin(){
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard||document.getElementById('poll-admin-panel'))return;
 const panel=document.createElement('section');
 panel.id='poll-admin-panel';
 panel.className='admin-panel poll-admin-panel';
 panel.innerHTML=[
  '<div class="poll-admin-header"><div><span class="poll-admin-kicker">COMUNIDAD · PARTICIPACIÓN</span><h2>📊 Encuestas</h2><p>Crea preguntas para tu comunidad y controla cuándo pueden votar. Cada voto suma 15 puntos y quienes aún no hayan votado reciben un único recordatorio pasadas 24 horas.</p></div><a class="poll-admin-view" href="#/encuestas">Ver encuestas ↗</a></div>',
  '<div class="poll-admin-grid">',
   '<div class="poll-admin-box poll-admin-create">',
    '<div class="poll-admin-box-title"><span class="poll-admin-heading-icon" aria-hidden="true">✨</span><div><h3>Nueva encuesta</h3><p>Configura una pregunta y entre 2 y 6 opciones.</p></div></div>',
    '<form id="poll-admin-form">',
     '<div class="poll-admin-fields">',
      '<div class="poll-admin-field poll-admin-field-full"><label for="poll-admin-question">Pregunta de la encuesta</label><input id="poll-admin-question" name="question" type="text" required minlength="5" maxlength="240" placeholder="Ej.: ¿Cuál es tu anime favorito?" autocomplete="off"><small>Escribe una pregunta clara para los participantes.</small></div>',
      '<div class="poll-admin-field poll-admin-field-full"><label for="poll-admin-category">Categoría</label><select id="poll-admin-category" name="category"><option value="anime">🌸 Anime</option><option value="manga">📖 Manga</option><option value="gaming">🎮 Gaming</option><option value="personajes">⭐ Personajes</option><option value="otros">✨ Otros</option></select></div>',
      '<div class="poll-admin-field poll-admin-field-full"><div class="poll-admin-label-row"><label for="poll-admin-options">Opciones de respuesta</label><span id="poll-admin-options-count" aria-live="polite">0 / 6 opciones</span></div><textarea id="poll-admin-options" name="options" rows="5" required placeholder="One Piece&#10;Naruto&#10;Dragon Ball"></textarea><small>Escribe una opción por línea. Mínimo 2, máximo 6.</small></div>',
     '</div>',
     '<div class="poll-admin-preview" aria-label="Vista previa de las opciones"><strong>Vista previa</strong><div id="poll-admin-preview-list" class="poll-admin-preview-list"><span class="poll-admin-preview-empty">Las opciones aparecerán aquí.</span></div></div>',
     '<div class="poll-admin-actions"><button class="gradient-btn poll-admin-publish" type="submit">✨ Publicar encuesta</button><button class="poll-admin-clear" type="reset">Limpiar</button></div>',
     '<p id="poll-admin-status" class="poll-admin-status" role="status" aria-live="polite"></p>',
    '</form>',
   '</div>',
   '<div class="poll-admin-box poll-admin-manage">',
    '<div class="poll-admin-box-title"><span class="poll-admin-heading-icon" aria-hidden="true">🗳️</span><div><h3>Gestionar encuestas</h3><p>Cambia su visibilidad sin perder los votos.</p></div></div>',
    '<div class="poll-admin-list-head"><strong>Encuestas recientes</strong><span id="poll-admin-list-count">Cargando…</span></div>',
    '<div id="poll-admin-list" class="poll-admin-list" aria-live="polite"><p class="poll-admin-empty">Cargando encuestas…</p></div>',
    '<p class="poll-admin-help">Publicada: admite votos · Borrador: oculta · Cerrada: no admite más votos.</p>',
   '</div>',
  '</div>'
 ].join('');
 dashboard.append(panel);
 window.SBPollAdminAdvanced?.addCreateFields(panel);
 window.SBPollAdminInsights?.mount(panel);
 const form=panel.querySelector('#poll-admin-form');
 const status=panel.querySelector('#poll-admin-status');
 const optionsField=panel.querySelector('#poll-admin-options');
 const optionsCount=panel.querySelector('#poll-admin-options-count');
 const preview=panel.querySelector('#poll-admin-preview-list');
 const listRoot=panel.querySelector('#poll-admin-list');
 const listCount=panel.querySelector('#poll-admin-list-count');
 const publishButton=panel.querySelector('.poll-admin-publish');
 const statusLabels={draft:'Borrador',published:'Publicada',closed:'Cerrada'};
 const categoryLabels={anime:'Anime',manga:'Manga',gaming:'Gaming',personajes:'Personajes',otros:'Otros'};
 const getOptions=()=>optionsField.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
 const showMessage=(message,tone='info')=>{status.textContent=message;status.dataset.tone=tone;};
 const renderPreview=()=>{
  const options=getOptions();
  optionsCount.textContent=options.length+' / 6 opciones';
  optionsCount.dataset.invalid=String(options.length>6);
  preview.replaceChildren();
  if(!options.length){
   const empty=document.createElement('span');empty.className='poll-admin-preview-empty';empty.textContent='Las opciones aparecerán aquí.';preview.append(empty);return;
  }
  options.slice(0,6).forEach((label,index)=>{
   const chip=document.createElement('span');chip.className='poll-admin-preview-chip';
   chip.textContent=(index+1)+'. '+label;preview.append(chip);
  });
  if(options.length>6){
   const extra=document.createElement('span');extra.className='poll-admin-preview-overflow';extra.textContent='Sobran '+(options.length-6)+' opciones';preview.append(extra);
  }
 };
 optionsField.addEventListener('input',renderPreview);
 form.addEventListener('reset',()=>{setTimeout(renderPreview,0);showMessage('');});
 renderPreview();
 let publishing=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(publishing)return;
  const options=getOptions();
  if(options.length<2||options.length>6){showMessage('Debes escribir entre 2 y 6 opciones, una por línea.','error');optionsField.focus();return;}
  if(new Set(options.map(value=>value.toLocaleLowerCase('es'))).size!==options.length){showMessage('No repitas opciones de respuesta.','error');optionsField.focus();return;}
  const values=new FormData(form);
  const question=String(values.get('question')||'').trim();
  if(question.length<5){showMessage('La pregunta debe tener al menos 5 caracteres.','error');form.querySelector('#poll-admin-question').focus();return;}
  let advanced;
  try{advanced=window.SBPollAdminAdvanced?.readCreate(form)||{closes_at:null,featured:false};}
  catch(error){showMessage(error.message,'error');return;}
  publishing=true;publishButton.disabled=true;publishButton.textContent='Publicando…';
  showMessage('Guardando encuesta…');
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.app_metadata?.role!=='admin'){showMessage('Necesitas permisos de administrador para publicar.','error');return;}
   const {data:poll,error}=await sb.from('community_polls').insert({question,category:values.get('category'),status:'draft',...advanced}).select('id').single();
   if(error){showMessage('No se pudo crear la encuesta: '+error.message,'error');return;}
   const {error:optionError}=await sb.from('community_poll_options').insert(options.map((label,index)=>({poll_id:poll.id,label,sort_order:index})));
   if(optionError){showMessage('La encuesta quedó en borrador: '+optionError.message,'error');await loadPollAdminList();return;}
   const {error:publishError}=await sb.from('community_polls').update({status:'published'}).eq('id',poll.id);
   if(publishError){showMessage('La encuesta quedó en borrador: '+publishError.message,'error');}
   else {form.reset();showMessage('¡Encuesta publicada correctamente!','success');}
   await loadPollAdminList();
  }catch(error){showMessage('No se pudo completar la operación: '+(error?.message||'Error de conexión'),'error');}
  finally{publishing=false;publishButton.disabled=false;publishButton.textContent='✨ Publicar encuesta';}
 });
 async function loadPollAdminList(){
  listRoot.replaceChildren();
  const loading=document.createElement('p');loading.className='poll-admin-empty';loading.textContent='Cargando encuestas…';listRoot.append(loading);
  try{
   const {data,error}=await sb.from('community_polls').select('id,question,category,status,created_at,closes_at,featured').order('created_at',{ascending:false}).limit(30);
   if(!panel.isConnected)return;
   if(error){listRoot.textContent='No se pudieron cargar las encuestas: '+error.message;listCount.textContent='Sin datos';return;}
   const polls=data||[];
   listRoot.replaceChildren();
   listCount.textContent=polls.length+' mostradas';
   if(!polls.length){
    const empty=document.createElement('p');empty.className='poll-admin-empty';empty.textContent='Todavía no has creado encuestas.';listRoot.append(empty);window.SBPollAdminInsights?.renderSummary(panel,polls);return;
   }
   for(const poll of polls){
    const row=document.createElement('article');row.className='poll-admin-item';
    const info=document.createElement('div');info.className='poll-admin-item-info';
    const tags=document.createElement('div');tags.className='poll-admin-tags';
    const badge=document.createElement('span');badge.className='poll-admin-badge';badge.dataset.status=poll.status;badge.textContent=statusLabels[poll.status]||poll.status;
    const category=document.createElement('span');category.className='poll-admin-category';category.textContent=categoryLabels[poll.category]||poll.category||'General';
    tags.append(badge,category);
    const title=document.createElement('h4');title.textContent=poll.question;
    info.append(tags,title);
    const control=document.createElement('div');control.className='poll-admin-item-control';
    const label=document.createElement('label');label.textContent='Estado';label.htmlFor='poll-status-'+poll.id;
    const select=document.createElement('select');select.id='poll-status-'+poll.id;select.setAttribute('aria-label','Estado de '+poll.question);
    for(const value of ['draft','published','closed']){
     const option=document.createElement('option');option.value=value;option.textContent=statusLabels[value];select.append(option);
    }
    select.value=poll.status;
    select.addEventListener('change',async()=>{
     const requested=select.value;
     select.disabled=true;
     try{
      const {error}=await sb.from('community_polls').update({status:requested}).eq('id',poll.id);
      if(error){select.value=poll.status;showMessage('No se pudo cambiar el estado: '+error.message,'error');return;}
      poll.status=requested;badge.dataset.status=requested;badge.textContent=statusLabels[requested];
      window.SBPollAdminInsights?.statusChanged(panel,row,poll);
      showMessage('Estado de la encuesta actualizado.','success');
     }catch(error){select.value=poll.status;showMessage('Error al actualizar: '+(error?.message||'Conexión interrumpida'),'error');}
     finally{select.disabled=false;}
    });
    control.append(label,select);
    row.append(info,control);
    window.SBPollAdminInsights?.decorate(row,poll);
    window.SBPollAdminAdvanced?.decorate(row,poll,loadPollAdminList);
    listRoot.append(row);
   }
   window.SBPollAdminInsights?.renderSummary(panel,polls);
  }catch(error){
   listCount.textContent='Sin datos';
   listRoot.textContent='No se pudieron cargar las encuestas: '+(error?.message||'Error de conexión');
  }
 }
 loadPollAdminList();
}
const previousPollInitAdmin=typeof initAdmin==='function'?initAdmin:null;
if(previousPollInitAdmin){initAdmin=async function(...args){await previousPollInitAdmin.apply(this,args);await initPollAdmin()}}
