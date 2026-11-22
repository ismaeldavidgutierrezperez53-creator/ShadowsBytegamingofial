/* Etiquetas personales por grupo. Las etiquetas nunca conceden permisos. */
(() => {
 'use strict';
 const COLORS = [['purple','💜 Violeta'],['blue','💙 Azul'],['pink','🩷 Rosa'],['green','💚 Verde'],['orange','🧡 Naranja'],['gold','💛 Dorado'],['slate','🩶 Gris']];
 const EMOJIS = [['','Sin emoji'],['🌸','🌸 Sakura'],['🎮','🎮 Gaming'],['🎧','🎧 Música'],['🔥','🔥 Fuego'],['⭐','⭐ Estrella'],['💜','💜 Corazón'],['🐉','🐉 Dragón'],['🌙','🌙 Luna'],['✨','✨ Brillos'],['⚡','⚡ Rayo'],['🎨','🎨 Arte'],['🕹️','🕹️ Arcade'],['📚','📚 Manga']];
 const STYLES = [['filled','Clásico'],['outline','Contorno'],['gradient','Degradado'],['glow','Neón']];
 const valid = (options, value, fallback) => options.some(item => item[0] === value) ? value : fallback;
 const normalize = row => ({
  label: String(row?.label || ''),
  color: valid(COLORS, row?.color, 'purple'),
  emoji: valid(EMOJIS, row?.emoji, ''),
  style: valid(STYLES, row?.style, 'filled')
 });
 const makeBadge = (row) => {
  const tagData = normalize(row);
  if (!tagData.label) return null;
  const tag = document.createElement('span');
  tag.className = 'sb-group-label-chip';
  tag.dataset.color = tagData.color;
  tag.dataset.style = tagData.style;
  tag.title = 'Etiqueta personal del grupo (no es un rol administrativo)';
  if (tagData.emoji) {
   const emoji = document.createElement('span');
   emoji.className = 'sb-group-label-emoji';
   emoji.textContent = tagData.emoji;
   emoji.setAttribute('aria-hidden','true');
   tag.append(emoji,document.createTextNode(' '));
  }
  tag.append(document.createTextNode(tagData.label));
  return tag;
 };
 window.sbGroupMemberTagBadge = makeBadge;
 window.sbBuildGroupMemberLabels = async ({sb,group,userId,members,thread}) => {
  const labels = new Map();
  const specialBadges = new Map();
  const userIds = (members || []).map(m=>m.user_id);
  const {data:profiles} = userIds.length
    ? await sb.from('profiles').select('id,display_name,username').in('id',userIds)
    : {data:[]};
  const names = new Map((profiles || []).map(p=>[p.id,p.display_name||p.username||'Miembro']));
  const panel = document.createElement('section');
  panel.className = 'sb-group-label-panel';
  const bar = document.createElement('div');
  bar.className = 'sb-group-label-bar';
  const edit = document.createElement('button');
  edit.type = 'button'; edit.className = 'outline-btn mini';
  const hint = document.createElement('small');
  hint.textContent = 'Elige el color, emoji y estilo de tu etiqueta. Solo se muestra en este grupo.';
  bar.append(edit,hint);
  const form = document.createElement('form');
  form.className = 'sb-group-label-form'; form.hidden = true;
  const title = document.createElement('label');
  title.textContent = 'Mi etiqueta de miembro';
  const input = document.createElement('input');
  input.type = 'text'; input.maxLength = 30;
  input.placeholder = 'Ej.: Otaku, Gamer, Fan de Pokémon';
  input.autocomplete = 'off';
  input.setAttribute('aria-label','Etiqueta personal del grupo');
  title.append(input);
  const counter = document.createElement('small');
  const selectors = document.createElement('div');
  selectors.className = 'sb-group-label-selectors';
  const makeSelect = (caption,options) => {
   const label = document.createElement('label');
   label.textContent = caption;
   const select = document.createElement('select');
   select.setAttribute('aria-label',caption+' de la etiqueta');
   for (const [value,name] of options) {
    const option = document.createElement('option');
    option.value = value; option.textContent = name; select.append(option);
   }
   label.append(select); selectors.append(label);
   return select;
  };
  const colorSelect = makeSelect('Color',COLORS);
  const emojiSelect = makeSelect('Emoji',EMOJIS);
  const styleSelect = makeSelect('Estilo',STYLES);
  const previewBox = document.createElement('div');
  previewBox.className = 'sb-group-label-preview';
  const previewLabel = document.createElement('small');
  previewLabel.textContent = 'Vista previa';
  const preview = document.createElement('div');
  previewBox.append(previewLabel,preview);
  const actions = document.createElement('div');
  actions.className = 'sb-group-label-actions';
  const save = document.createElement('button');
  save.type = 'submit'; save.className = 'gradient-btn mini'; save.textContent = 'Guardar etiqueta';
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'outline-btn mini'; remove.textContent = 'Quitar etiqueta';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'outline-btn mini'; cancel.textContent = 'Cancelar';
  actions.append(save,remove,cancel);
  form.append(title,counter,selectors,previewBox,actions);
  const status = document.createElement('p');
  status.className = 'sb-group-label-status';
  status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const details = document.createElement('details');
  details.className = 'sb-group-label-list';
  const summary = document.createElement('summary');
  summary.textContent = '👥 Ver etiquetas de los miembros';
  const list = document.createElement('ul');
  details.append(summary,list); panel.append(bar,form,status,details); thread.append(panel);
  const createBadge = id => {
   const personal = makeBadge(labels.get(id));
   const specials = specialBadges.get(id) || [];
   if (!personal && !specials.length) return null;
   const wrap = document.createElement('span');
   wrap.className = 'sb-group-tags-inline';
   if (personal) wrap.append(personal);
   for (const badge of specials) {
    const node = window.SBExclusiveMemberTags?.makeBadge(badge);
    if (node) wrap.append(node);
   }
   return wrap;
  };
  const currentFields = () => ({
   label: input.value.trim(),
   color: colorSelect.value,
   emoji: emojiSelect.value,
   style: styleSelect.value
  });
  const refreshPreview = () => {
   const formValues = currentFields();
   counter.textContent = input.value.length+'/30 caracteres';
   preview.replaceChildren();
   const badge = makeBadge(formValues);
   if (badge) preview.append(badge);
   else preview.textContent = 'Escribe una etiqueta para ver su diseño.';
  };
  const draw = () => {
   const own = labels.get(userId);
   edit.textContent = own?.label ? '🏷️ Personalizar mi etiqueta' : '🏷️ Añadir etiqueta de miembro';
   remove.disabled = !own?.label;
   list.replaceChildren();
   for (const member of members || []) {
    const line = document.createElement('li');
    const person = document.createElement('strong');
    person.textContent = member.user_id===userId ? 'Tú' : names.get(member.user_id) || 'Miembro';
    line.append(person);
    if (member.user_id===group.owner_id || member.role==='admin') {
     const role = document.createElement('small');
     role.className = 'sb-group-label-role';
     role.textContent = member.user_id===group.owner_id ? '👑 Propietario' : '👑 Administrador';
     line.append(role);
    }
    const badge = createBadge(member.user_id);
    if (badge) line.append(badge);
    list.append(line);
   }
  };
  const reload = async () => {
   const {data,error} = await sb.from('member_chat_group_labels')
    .select('user_id,label,color,emoji,style').eq('group_id',group.id);
   if (error) {
    status.textContent = 'No se pudieron cargar las etiquetas: '+error.message;
    return;
   }
   labels.clear();
   for (const row of data || []) labels.set(row.user_id, normalize(row));
   draw();
  };
  const reloadSpecial = async () => {
   if (!window.SBExclusiveMemberTags) return;
   try {
    const byUser = await window.SBExclusiveMemberTags.loadForUsers(userIds);
    specialBadges.clear();
    for (const [id,items] of byUser) specialBadges.set(id,items);
    draw();
   } catch (error) {
    console.warn('No se pudieron cargar distintivos exclusivos:',error);
   }
  };
  let saving = false;
  const setLabel = async requested => {
   if (saving) return;
   const next = normalize(requested);
   next.label = String(requested?.label || '').trim();
   if (next.label.length > 30 || /[\x00-\x1f\x7f]/.test(next.label) || /https?:\/\/|www\./i.test(next.label)) {
    status.textContent = 'Máximo 30 caracteres, sin enlaces ni saltos de línea.';
    return;
   }
   saving = true; save.disabled = true; remove.disabled = true;
   status.textContent = 'Guardando etiqueta…';
   try {
    let result;
    if (labels.has(userId)) {
     result = await sb.from('member_chat_group_labels')
      .update({...next,updated_at:new Date().toISOString()})
      .eq('group_id',group.id).eq('user_id',userId).select('user_id');
    } else if (next.label) {
     result = await sb.from('member_chat_group_labels')
      .insert({...next,group_id:group.id,user_id:userId}).select('user_id');
    } else {
     result = {data:[{user_id:userId}],error:null};
    }
    if (result.error || !result.data?.length) {
     status.textContent = 'No se pudo guardar la etiqueta: '+(result.error?.message || 'Comprueba tu sesión.');
     return;
    }
    labels.set(userId,next);
    await reload();
    status.textContent = next.label
     ? '✅ Etiqueta personalizada guardada en este grupo.'
     : '✅ Etiqueta quitada de este grupo.';
    form.hidden = true;
    panel.dispatchEvent(new CustomEvent('sb-group-label-changed'));
   } catch (error) {
    status.textContent = 'No se pudo guardar la etiqueta: '+(error.message || 'Error inesperado.');
   } finally {
    saving = false; save.disabled = false; draw();
   }
  };
  const openEditor = () => {
   const own = normalize(labels.get(userId));
   input.value = own.label; colorSelect.value = own.color;
   emojiSelect.value = own.emoji; styleSelect.value = own.style;
   form.hidden = false; status.textContent = ''; refreshPreview(); input.focus();
  };
  edit.addEventListener('click', () => form.hidden ? openEditor() : (form.hidden=true));
  input.addEventListener('input',refreshPreview);
  for (const picker of [colorSelect,emojiSelect,styleSelect]) picker.addEventListener('change',refreshPreview);
  form.addEventListener('submit', async event => {event.preventDefault();await setLabel(currentFields());});
  remove.addEventListener('click', () => setLabel({label:'',color:'purple',emoji:'',style:'filled'}));
  cancel.addEventListener('click', () => {form.hidden=true;status.textContent='';});
  await reload(); await reloadSpecial(); refreshPreview();
  return {createBadge,reload,reloadSpecial,panel};
 };
})();