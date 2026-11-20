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
 const dashboard=document.querySelector('#admin-root .admin-dashboard');
 if(!dashboard||document.getElementById('poll-admin-panel'))return;
 const panel=document.createElement('section');
 panel.id='poll-admin-panel';
 panel.className='admin-panel poll-admin-panel';
 panel.innerHTML=[
  '<div class="poll-admin-header"><div><span class="poll-admin-kicker">COMUNIDAD · PARTICIPACIÓN</span><h2>📊 Encuestas</h2><p>Crea preguntas para tu comunidad y controla cuándo pueden votar.</p></div><a class="poll-admin-view" href="#/encuestas">Ver encuestas ↗</a></div>',
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
  publishing=true;publishButton.disabled=true;publishButton.textContent='Publicando…';
  showMessage('Guardando encuesta…');
  try{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||user?.app_metadata?.role!=='admin'){showMessage('Necesitas permisos de administrador para publicar.','error');return;}
   const {data:poll,error}=await sb.from('community_polls').insert({question,category:values.get('category'),status:'draft'}).select('id').single();
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
   const {data,error}=await sb.from('community_polls').select('id,question,category,status,created_at').order('created_at',{ascending:false}).limit(30);
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
    row.append(info,control);window.SBPollAdminInsights?.decorate(row,poll);listRoot.append(row);
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
