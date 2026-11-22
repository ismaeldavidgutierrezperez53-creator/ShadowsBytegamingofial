/* Etiquetas personales por grupo. No conceden permisos administrativos. */
(() => {
 'use strict';
 window.sbBuildGroupMemberLabels = async ({sb,group,userId,members,thread}) => {
  const labels = new Map(), users = (members||[]).map(m=>m.user_id);
  const {data:profiles} = users.length ? await sb.from('profiles').select('id,display_name,username').in('id',users) : {data:[]};
  const names = new Map((profiles||[]).map(p=>[p.id,p.display_name||p.username||'Miembro']));
  const panel = document.createElement('section'); panel.className='sb-group-label-panel';
  const bar = document.createElement('div'); bar.className='sb-group-label-bar';
  const edit=document.createElement('button'); edit.type='button';edit.className='outline-btn mini';
  const hint=document.createElement('small');hint.textContent='Tu etiqueta es diferente en cada grupo y aparece con tus mensajes.';
  bar.append(edit,hint);
  const form=document.createElement('form');form.className='sb-group-label-form';form.hidden=true;
  const title=document.createElement('label');title.textContent='Mi etiqueta de miembro';
  const input=document.createElement('input');input.type='text';input.maxLength=30;input.placeholder='Ej.: Gamer, Otaku, Fan de Pokémon';input.autocomplete='off';input.setAttribute('aria-label','Etiqueta personal del grupo');title.append(input);
  const counter=document.createElement('small'),preview=document.createElement('small');
  const actions=document.createElement('div');actions.className='sb-group-label-actions';
  const save=document.createElement('button');save.type='submit';save.className='gradient-btn mini';save.textContent='Guardar etiqueta';
  const remove=document.createElement('button');remove.type='button';remove.className='outline-btn mini';remove.textContent='Quitar etiqueta';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='outline-btn mini';cancel.textContent='Cancelar';
  actions.append(save,remove,cancel);form.append(title,counter,preview,actions);
  const status=document.createElement('p');status.className='sb-group-label-status';status.setAttribute('role','status');
  const details=document.createElement('details');details.className='sb-group-label-list';
  const summary=document.createElement('summary');summary.textContent='👥 Ver etiquetas de los miembros';
  const list=document.createElement('ul');details.append(summary,list);panel.append(bar,form,status,details);thread.append(panel);
  const createBadge=id=>{
   const value=labels.get(id);if(!value)return null;
   const tag=document.createElement('span');tag.className='sb-group-label-chip';tag.textContent=value;
   tag.title='Etiqueta personal, no es un rol de administración';return tag;
  };
  const previewLabel=()=>{
   const value=input.value.trim();
   counter.textContent=input.value.length+'/30 caracteres';
   preview.textContent=value?'Vista previa: '+value:'Escribe tu etiqueta para verla aquí.';
  };
  const draw=()=>{
   const own=labels.get(userId)||'';edit.textContent=own?'🏷️ Editar mi etiqueta':'🏷️ Añadir etiqueta de miembro';
   remove.disabled=!own;list.replaceChildren();
   for(const member of members||[]){
    const line=document.createElement('li'),person=document.createElement('strong');
    person.textContent=member.user_id===userId?'Tú':names.get(member.user_id)||'Miembro';line.append(person);
    if(member.user_id===group.owner_id||member.role==='admin'){
     const role=document.createElement('small');role.className='sb-group-label-role';
     role.textContent=member.user_id===group.owner_id?'👑 Propietario':'👑 Administrador';line.append(role);
    }
    const tag=createBadge(member.user_id);if(tag)line.append(tag);list.append(line);
   }
  };
  const reload=async()=>{
   const {data,error}=await sb.from('member_chat_group_labels').select('user_id,label').eq('group_id',group.id);
   if(error){status.textContent='No se pudieron cargar las etiquetas: '+error.message;return;}
   labels.clear();for(const row of data||[])labels.set(row.user_id,row.label||'');draw();
  };
  const setLabel=async value=>{
   const next=String(value||'').trim();
   if(next.length>30||/[\x00-\x1f\x7f]/.test(next)||/https?:\/\/|www\./i.test(next)){
    status.textContent='Máximo 30 caracteres y sin enlaces.';return;
   }
   save.disabled=true;remove.disabled=true;status.textContent='Guardando etiqueta…';
   let result;
   if(labels.has(userId))result=await sb.from('member_chat_group_labels')
    .update({label:next,updated_at:new Date().toISOString()}).eq('group_id',group.id).eq('user_id',userId).select('user_id');
   else if(next)result=await sb.from('member_chat_group_labels')
    .insert({group_id:group.id,user_id:userId,label:next}).select('user_id');
   else result={data:[{user_id:userId}],error:null};
   save.disabled=false;
   if(result.error||!result.data?.length){
    status.textContent='No se pudo guardar la etiqueta: '+(result.error?.message||'Comprueba tu sesión.');draw();return;
   }
   labels.set(userId,next);await reload();
   status.textContent=next?'✅ Etiqueta guardada en este grupo.':'✅ Etiqueta quitada de este grupo.';
   form.hidden=true;panel.dispatchEvent(new CustomEvent('sb-group-label-changed'));
  };
  edit.addEventListener('click',()=>{
   form.hidden=!form.hidden;if(!form.hidden){input.value=labels.get(userId)||'';status.textContent='';previewLabel();input.focus();}
  });
  input.addEventListener('input',previewLabel);
  form.addEventListener('submit',async event=>{event.preventDefault();await setLabel(input.value);});
  remove.addEventListener('click',()=>setLabel(''));
  cancel.addEventListener('click',()=>{form.hidden=true;status.textContent='';});
  await reload();previewLabel();return {createBadge,reload,panel};
 };
})();