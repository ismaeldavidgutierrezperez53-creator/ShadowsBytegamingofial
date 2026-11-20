// Edición, fechas de cierre y encuestas destacadas. Usa el RPC transaccional
// community_poll_edit, que protege las opciones de encuestas que ya tienen votos.
(function(){
 'use strict';
 const categories={anime:'Anime',manga:'Manga',gaming:'Gaming',personajes:'Personajes',otros:'Otros'};
 const formatLocalDate=iso=>{
  if(!iso)return '';
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return '';
  const pad=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
 };
 const displayDate=iso=>iso?new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso)):'Sin fecha';
 const isoFromInput=(value)=>{
  if(!value)return null;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now())throw new Error('Elige una fecha y hora de cierre futuras.');
  return date.toISOString();
 };
 function addCreateFields(panel){
  const form=panel.querySelector('#poll-admin-form');
  const fields=form?.querySelector('.poll-admin-fields');
  if(!form||!fields||form.querySelector('[name="closes_at"]'))return;
  const additional=document.createElement('div');
  additional.className='poll-admin-extras';
  additional.innerHTML=[
   '<div class="poll-admin-field"><label for="poll-create-close">⏰ Cierre automático (opcional)</label><input type="datetime-local" id="poll-create-close" name="closes_at" aria-describedby="poll-create-close-help"><small id="poll-create-close-help">La fecha y hora se interpretan en tu zona horaria. Se cerrará automáticamente.</small></div>',
   '<label class="poll-admin-featured"><input type="checkbox" name="featured" value="true"><span>⭐ Destacar esta encuesta en la comunidad</span></label>'
  ].join('');
  fields.append(additional);
 }
 function readCreate(form){
  const date=isoFromInput(form.elements.closes_at?.value||'');
  return {closes_at:date,featured:!!form.elements.featured?.checked};
 }
 async function decorate(row,poll,reload){
  const control=row.querySelector('.poll-admin-item-control');
  if(!control||control.querySelector('.poll-admin-edit'))return;
  const featuredLabel=document.createElement('span');featuredLabel.className='poll-admin-feature-label';
  const setFeatured=()=>{featuredLabel.textContent=poll.featured?'⭐ Destacada':'';featuredLabel.hidden=!poll.featured;};
  setFeatured();
  row.querySelector('.poll-admin-tags')?.append(featuredLabel);
  const when=document.createElement('span');when.className='poll-admin-deadline';
  const updateWhen=()=>{when.textContent=poll.closes_at?'⏰ Cierra: '+displayDate(poll.closes_at):'⏰ Sin cierre programado';};
  updateWhen();
  row.querySelector('.poll-admin-item-info')?.append(when);
  const button=document.createElement('button');
  button.className='poll-admin-edit';button.type='button';button.textContent='✏️ Editar encuesta';
  control.append(button);
  const box=document.createElement('div');box.className='poll-admin-editor';box.hidden=true;
  row.append(box);
  let busy=false;
  button.addEventListener('click',async()=>{
   if(busy)return;
   if(!box.hidden){box.hidden=true;button.setAttribute('aria-expanded','false');return;}
   box.hidden=false;button.setAttribute('aria-expanded','true');
   button.setAttribute('aria-controls','poll-edit-'+poll.id);
   box.id='poll-edit-'+poll.id;
   box.replaceChildren();
   const p=document.createElement('p');p.textContent='Preparando editor…';box.append(p);
   busy=true;
   try{
    const {data:options,error}=await sb.from('community_poll_options').select('id,label').eq('poll_id',poll.id).order('sort_order',{ascending:true});
    if(error)throw new Error(error.message);
    if(!row.isConnected||box.hidden)return;
    box.innerHTML=[
     '<h5>Editar encuesta</h5><form class="poll-admin-edit-form">',
      '<div class="poll-admin-field"><label>Pregunta<input name="question" type="text" minlength="5" maxlength="240" required></label></div>',
      '<div class="poll-admin-field"><label>Categoría<select name="category"></select></label></div>',
      '<div class="poll-admin-field"><label>Opciones (una por línea)<textarea name="options" rows="4" required></textarea></label><small>Si ya existen votos, las respuestas deben permanecer iguales para conservar los resultados.</small></div>',
      '<div class="poll-admin-field"><label>Fecha de cierre (opcional)<input name="closes_at" type="datetime-local"></label><small>Hora local de tu dispositivo. Déjalo vacío para que no haya cierre automático.</small></div>',
      '<label class="poll-admin-featured"><input name="featured" type="checkbox"><span>⭐ Destacar en la comunidad</span></label>',
      '<div class="poll-admin-edit-actions"><button type="submit" class="gradient-btn">Guardar cambios</button><button type="button" class="poll-admin-edit-cancel">Cancelar</button></div>',
      '<p class="poll-admin-edit-status" role="status" aria-live="polite"></p>',
     '</form>'
    ].join('');
    const form=box.querySelector('form');
    form.elements.question.value=poll.question;
    const select=form.elements.category;
    for(const [key,label] of Object.entries(categories)){const option=document.createElement('option');option.value=key;option.textContent=label;select.append(option);}
    select.value=poll.category||'otros';
    form.elements.options.value=(options||[]).map(x=>x.label).join('\n');
    form.elements.closes_at.value=formatLocalDate(poll.closes_at);
    form.elements.featured.checked=!!poll.featured;
    box.querySelector('.poll-admin-edit-cancel').onclick=()=>{box.hidden=true;button.setAttribute('aria-expanded','false');};
    form.addEventListener('submit',async event=>{
     event.preventDefault();if(busy)return;
     const notice=box.querySelector('.poll-admin-edit-status');
     const save=form.querySelector('button[type="submit"]');
     const labels=form.elements.options.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
     if(labels.length<2||labels.length>6){notice.textContent='Escribe entre 2 y 6 opciones.';return;}
     if(labels.some(v=>v.length>140)||new Set(labels.map(v=>v.toLocaleLowerCase('es'))).size!==labels.length){notice.textContent='Las opciones deben ser únicas y tener un máximo de 140 caracteres.';return;}
     let closesAt;
     try{closesAt=isoFromInput(form.elements.closes_at.value);}
     catch(error){notice.textContent=error.message;return;}
     busy=true;save.disabled=true;notice.textContent='Guardando…';
     try{
      const {error:saveError}=await sb.rpc('community_poll_edit',{
       p_poll_id:poll.id,
       p_question:form.elements.question.value.trim(),
       p_category:form.elements.category.value,
       p_options:labels,
       p_closes_at:closesAt,
       p_featured:form.elements.featured.checked
      });
      if(saveError)throw new Error(saveError.message);
      poll.question=form.elements.question.value.trim();
      poll.category=form.elements.category.value;
      poll.closes_at=closesAt;
      poll.featured=form.elements.featured.checked;
      row.querySelector('.poll-admin-item-info h4').textContent=poll.question;
      row.querySelector('.poll-admin-category').textContent=categories[poll.category];
      setFeatured();updateWhen();
      notice.textContent='Cambios guardados correctamente.';
      await reload();
     }catch(error){notice.textContent='No se pudo guardar: '+(error?.message||'Error de conexión');}
     finally{busy=false;save.disabled=false;}
    });
   }catch(error){box.textContent='No se pudo abrir el editor: '+(error?.message||'Error de conexión');}
   finally{busy=false;}
  });
 }
 window.SBPollAdminAdvanced={addCreateFields,readCreate,decorate};
})();
