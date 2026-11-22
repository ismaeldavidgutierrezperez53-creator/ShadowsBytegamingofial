/* Distintivos exclusivos de Shadows Byte, otorgados por administración y sin poderes de moderación. */
(() => {
 'use strict';
 const COLORS=[['purple','💜 Violeta'],['blue','💙 Azul'],['pink','🩷 Rosa'],['green','💚 Verde'],['orange','🧡 Naranja'],['gold','💛 Dorado'],['slate','🩶 Gris']];
 const EMOJIS=['👑','⭐','🛡️','💜','🌸','🎮','🏆','🔥','🐉','✨','💎','🎨','🎧'];
 const ANIMATIONS=[
  ['none','Sin animación'],['shine','✨ Brillo en movimiento'],
  ['neon','💡 Neón brillante'],['pulse','💓 Pulso suave'],
  ['float','🌠 Flotante'],['sparkle','🌟 Destellos anime']
 ];
 const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
 const memberMap=new Map();
 let catalog=[];
 const make=(tag,className='',text='')=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text)node.textContent=text;
  return node;
 };
 const createBadge=badge=>{
  if(!badge?.label)return null;
  const el=make('span','sb-exclusive-tag',''+(badge.emoji||'⭐')+' '+badge.label);
  el.dataset.color=COLORS.some(item=>item[0]===badge.color)?badge.color:'purple';
  el.dataset.animation=ANIMATIONS.some(item=>item[0]===badge.animation)?badge.animation:'none';
  el.title='Distintivo exclusivo otorgado por administración. No concede permisos.';
  el.setAttribute('aria-label',el.textContent+'; distintivo otorgado por administración, sin permisos especiales');
  return el;
 };
 const loadForUsers=async ids=>{
  const valid=[...new Set((ids||[]).filter(x=>uuid.test(x)))].slice(0,100);
  const byUser=new Map(valid.map(id=>[id,[]]));
  if(!valid.length)return byUser;
  const [rows,defs]=await Promise.all([
   sb.from('sb_exclusive_tag_assignments').select('user_id,tag_id').in('user_id',valid).limit(500),
   sb.from('sb_exclusive_tag_catalog').select('id,label,emoji,color,animation').limit(150)
  ]);
  if(rows.error||defs.error)throw rows.error||defs.error;
  const tags=new Map((defs.data||[]).map(item=>[item.id,item]));
  for(const row of rows.data||[]){
   const badge=tags.get(row.tag_id);
   if(badge && byUser.has(row.user_id))byUser.get(row.user_id).push(badge);
  }
  return byUser;
 };
 window.SBExclusiveMemberTags={makeBadge:createBadge,loadForUsers};

 // Perfiles: solo enseñar los distintivos obtenidos del servidor.
 const scanned=new WeakSet();
 let pending=false;
 async function addProfileBadges(anchor,userId,own){
  if(!anchor.isConnected||!uuid.test(userId))return;
  const result=await loadForUsers([userId]);
  if(!anchor.isConnected)return;
  const badges=result.get(userId)||[];
  if(!badges.length)return;
  const wrap=make('div','sb-exclusive-profile-tags');
  const heading=make('strong','',own?'🏅 Mis distintivos especiales':'🏅 Distintivos especiales');
  const note=make('small','','Otorgados por la administración · No modifican los permisos');
  const tags=make('div','sb-exclusive-profile-tag-list');
  for(const badge of badges){const node=createBadge(badge);if(node)tags.append(node);}
  wrap.append(heading,note,tags);
  if(own)anchor.append(wrap);
  else{
   const name=anchor.querySelector(':scope > h1');
   if(name)name.after(wrap);else anchor.prepend(wrap);
  }
 }
 async function profileScan(){
  const route=location.hash.split('?')[0];
  if(route==='#/perfil'){
   const anchor=document.querySelector('#public-member-profile .public-member-body');
   const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
   if(anchor && uuid.test(id||'') && !scanned.has(anchor)){
    scanned.add(anchor);
    try{await addProfileBadges(anchor,id,false);}catch(e){console.warn('Distintivos en perfil',e);}
   }
  }else if(route==='#/cuenta'){
   const anchor=document.querySelector('#account-profile .profile-identity-copy');
   if(anchor && !scanned.has(anchor)){
    scanned.add(anchor);
    try{
     const {data}=await sb.auth.getSession();
     const id=data?.session?.user?.id;
     if(id)await addProfileBadges(anchor,id,true);
    }catch(e){console.warn('Distintivos en cuenta',e);}
   }
  }
 }
 // Administración: muestra un panel exclusivamente al personal con cargo actual.
 let mounting=false;
 async function mountAdmin(){
  if(location.hash.split('?')[0]!=='#/admin')return;
  const dashboard=document.querySelector('#admin-root .admin-dashboard');
  if(!dashboard||dashboard.querySelector('#sb-exclusive-tags-admin')||mounting)return;
  mounting=true;
  try {
   const {data:auth}=await sb.auth.getSession();
   const current=auth?.session?.user?.id;
   if(!current)return;
   const {data:staff,error}=await sb.from('site_staff_roles').select('role').eq('user_id',current).maybeSingle();
   if(error||!['owner','admin'].includes(staff?.role)||!dashboard.isConnected)return;
   const panel=make('section','admin-panel sb-exclusive-admin');
   panel.id='sb-exclusive-tags-admin';
   const heading=make('div','sb-exclusive-admin-heading');
   heading.append(make('h2','','🏅 Etiquetas especiales y exclusivas'),
    make('p','','Crea distintivos y asígnalos a miembros. Estos distintivos no otorgan permisos ni cambian los cargos.'));
   const notice=make('p','sb-exclusive-admin-status');
   notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
   const setStatus=(message,error=false)=>{notice.textContent=message;notice.dataset.error=String(error);};
   const createSection=make('section','sb-exclusive-admin-section');
   createSection.append(make('h3','','Crear una etiqueta exclusiva'));
   const createForm=make('form','sb-exclusive-create-form');
   const name=make('input');name.type='text';name.maxLength=30;name.required=true;name.placeholder='Ej.: Maestro Otaku';name.setAttribute('aria-label','Nombre de etiqueta exclusiva');
   const emoji=make('select');emoji.setAttribute('aria-label','Emoji de la etiqueta');
   for(const icon of EMOJIS)emoji.add(new Option(icon,icon));
   const color=make('select');color.setAttribute('aria-label','Color de la etiqueta');
   for(const [key,title]of COLORS)color.add(new Option(title,key));
   const animation=make('select');
   animation.setAttribute('aria-label','Animación de la nueva etiqueta');
   for(const [value,title] of ANIMATIONS)animation.add(new Option(title,value));
   const create=make('button','gradient-btn mini','➕ Crear etiqueta');create.type='submit';
   const preview=make('div','sb-exclusive-animation-preview');
   const redrawPreview=()=>{
    preview.replaceChildren();
    const badge=createBadge({label:name.value.trim()||'Mi etiqueta anime',emoji:emoji.value,color:color.value,animation:animation.value});
    if(badge)preview.append(badge);
   };
   for(const control of [name,emoji,color,animation]){
    control.addEventListener('input',redrawPreview);
    control.addEventListener('change',redrawPreview);
   }
   createForm.append(name,emoji,color,animation,create);
   createSection.append(createForm,make('h4','','Vista previa de la animación'),preview);
   redrawPreview();
   const manageSection=make('section','sb-exclusive-admin-section');
   manageSection.append(make('h3','','Asignar etiquetas a un miembro'));
   const search=make('input');search.type='search';search.placeholder='Buscar miembro por nombre o usuario';search.setAttribute('aria-label','Buscar miembro');
   const chooseMember=make('select');chooseMember.setAttribute('aria-label','Seleccionar miembro');chooseMember.add(new Option('Selecciona un miembro',''));
   const chooseTag=make('select');chooseTag.setAttribute('aria-label','Etiqueta especial');chooseTag.add(new Option('Selecciona una etiqueta',''));
   const grant=make('button','gradient-btn mini','🏷️ Asignar etiqueta');grant.type='button';
   const grantRow=make('div','sb-exclusive-grant-row');
   grantRow.append(chooseMember,chooseTag,grant);
   const selected=make('div','sb-exclusive-current');
   const definitions=make('div','sb-exclusive-definitions');
   manageSection.append(search,grantRow,make('h4','','Etiquetas asignadas al miembro'),selected,make('h4','','Catálogo de etiquetas'),definitions);
   panel.append(heading,createSection,manageSection,notice);
   const staffPanel=dashboard.querySelector('#sb-staff-panel');
   if(staffPanel)staffPanel.after(panel);
   else (dashboard.querySelector('.admin-welcome')||dashboard.firstElementChild)?.after(panel);
   if(!panel.isConnected)return;
   const {data:members,error:membersError}=await sb.from('profiles')
    .select('id,display_name,username').eq('is_public',true).order('created_at',{ascending:false}).limit(1000);
   if(membersError)throw membersError;
   const people=members||[];
   function drawMemberChoices(){
    const query=search.value.trim().toLocaleLowerCase('es');
    const prior=chooseMember.value;
    chooseMember.replaceChildren(new Option('Selecciona un miembro',''));
    const filtered=people.filter(person=>
     [person.display_name,person.username].some(value=>String(value||'').toLocaleLowerCase('es').includes(query))
    ).slice(0,100);
    for(const person of filtered)chooseMember.add(new Option(person.display_name||person.username||'Miembro',person.id));
    if(filtered.some(person=>person.id===prior))chooseMember.value=prior;
   }
   async function loadCatalog(){
    const {data,error}=await sb.from('sb_exclusive_tag_catalog')
     .select('id,label,emoji,color,is_system,animation').order('created_at',{ascending:true}).limit(150);
    if(error)throw error;
    catalog=data||[];
    const previous=chooseTag.value;
    chooseTag.replaceChildren(new Option('Selecciona una etiqueta',''));
    definitions.replaceChildren();
    for(const badge of catalog){
     chooseTag.add(new Option((badge.emoji||'⭐')+' '+badge.label,badge.id));
     const line=make('div','sb-exclusive-catalog-item');
     const view=createBadge(badge);
     line.append(view);
     const animateSelect=make('select','sb-exclusive-animation-select');
     animateSelect.setAttribute('aria-label','Animación de '+badge.label);
     for(const [value,title] of ANIMATIONS)animateSelect.add(new Option(title,value));
     animateSelect.value=badge.animation||'none';
     const saveEffect=make('button','outline-btn mini','Guardar efecto');
     saveEffect.type='button';saveEffect.disabled=true;
     animateSelect.addEventListener('change',()=>{
      if(view)view.dataset.animation=animateSelect.value;
      saveEffect.disabled=animateSelect.value===(badge.animation||'none');
     });
     saveEffect.addEventListener('click',async()=>{
      const next=animateSelect.value;
      if(!ANIMATIONS.some(([value])=>value===next))return;
      saveEffect.disabled=true;animateSelect.disabled=true;
      const {data,error}=await sb.from('sb_exclusive_tag_catalog')
       .update({animation:next}).eq('id',badge.id).select('id');
      animateSelect.disabled=false;
      if(error||!data?.length){
       setStatus('No se pudo guardar la animación: '+(error?.message||'Sin permisos de edición'),true);
       saveEffect.disabled=false;return;
      }
      setStatus('✅ Animación guardada para '+badge.label+'.');
      await loadCatalog();await loadCurrent();
     });
     const animationTools=make('div','sb-exclusive-animation-tools');
     animationTools.append(animateSelect,saveEffect);
     line.append(animationTools);
     if(!badge.is_system){
      const del=make('button','outline-btn mini','Eliminar etiqueta');
      del.type='button';del.addEventListener('click',async()=>{
       if(!confirm('¿Eliminar '+badge.label+' del catálogo? Se retirará a todos los miembros que la tengan.'))return;
       del.disabled=true;
       const {error}=await sb.from('sb_exclusive_tag_catalog').delete().eq('id',badge.id).eq('is_system',false);
       if(error){setStatus('No se pudo eliminar: '+error.message,true);del.disabled=false;return;}
       setStatus('Etiqueta eliminada del catálogo.');
       await loadCatalog();await loadCurrent();
      });
      line.append(del);
     }else line.append(make('small','','Etiqueta predeterminada'));
     definitions.append(line);
    }
    if(catalog.some(x=>x.id===previous))chooseTag.value=previous;
   }
   async function loadCurrent(){
    selected.replaceChildren();
    const id=chooseMember.value;
    if(!id){selected.textContent='Selecciona un miembro para ver sus distintivos.';return;}
    const {data,error}=await sb.from('sb_exclusive_tag_assignments')
     .select('tag_id,user_id').eq('user_id',id).limit(100);
    if(error){setStatus('No se pudieron leer sus etiquetas: '+error.message,true);return;}
    if(!data?.length){selected.textContent='Este miembro todavía no tiene etiquetas especiales.';return;}
    const badges=new Map(catalog.map(item=>[item.id,item]));
    for(const row of data){
     const badge=badges.get(row.tag_id);
     if(!badge)continue;
     const line=make('div','sb-exclusive-catalog-item');
     line.append(createBadge(badge));
     const revoke=make('button','outline-btn mini','Retirar');
     revoke.addEventListener('click',async()=>{
      if(!confirm('¿Retirar '+badge.label+' a este miembro?'))return;
      revoke.disabled=true;
      const {error}=await sb.from('sb_exclusive_tag_assignments').delete()
       .eq('user_id',id).eq('tag_id',row.tag_id);
      if(error){setStatus('No se pudo retirar: '+error.message,true);revoke.disabled=false;return;}
      setStatus('Etiqueta retirada correctamente.');await loadCurrent();
     });
     line.append(revoke);selected.append(line);
    }
   }
   search.addEventListener('input',()=>{drawMemberChoices();void loadCurrent();});
   chooseMember.addEventListener('change',()=>void loadCurrent());
   createForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const label=name.value.trim();
    if(label.length<2||label.length>30){setStatus('La etiqueta debe tener entre 2 y 30 caracteres.',true);return;}
    create.disabled=true;
    const {error}=await sb.from('sb_exclusive_tag_catalog').insert({
     label,emoji:emoji.value,color:color.value,animation:animation.value,is_system:false,created_by:current
    });
    create.disabled=false;
    if(error){setStatus('No se pudo crear: '+error.message,true);return;}
    name.value='';redrawPreview();setStatus('✅ Etiqueta exclusiva animada creada. Ahora puedes asignarla.');
    await loadCatalog();
   });
   grant.addEventListener('click',async()=>{
    const id=chooseMember.value,tagId=chooseTag.value;
    if(!id||!tagId){setStatus('Selecciona primero un miembro y una etiqueta.',true);return;}
    grant.disabled=true;
    const {error}=await sb.from('sb_exclusive_tag_assignments').insert({user_id:id,tag_id:tagId,granted_by:current});
    grant.disabled=false;
    if(error){setStatus(error.code==='23505'?'Ese miembro ya tiene la etiqueta.':'No se pudo asignar: '+error.message,true);return;}
    setStatus('✅ Etiqueta exclusiva asignada.');
    await loadCurrent();
   });
   drawMemberChoices();
   await loadCatalog();await loadCurrent();
   setStatus('Distintivos listos. Solo la administración puede asignarlos y retirarlos.');
  }catch(error){
   console.warn('No se pudo abrir el panel de distintivos',error);
   const status=document.querySelector('#sb-exclusive-tags-admin .sb-exclusive-admin-status');
   if(status){status.textContent='No se pudieron cargar los distintivos: '+(error.message||'Error inesperado');status.dataset.error='true';}
  }finally{mounting=false;}
 }
 function schedule(){
  if(pending)return;pending=true;
  queueMicrotask(()=>{pending=false;void profileScan();void mountAdmin();});
 }
 const root=document.getElementById('app');
 if(root){
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
})();