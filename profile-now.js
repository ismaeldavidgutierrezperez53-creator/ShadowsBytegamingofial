// Mi momento anime y gaming — sección personal y pública con privacidad explícita.
(function(){
'use strict';
const moods={
 relax:{icon:'🍵',name:'Modo tranquilo'},
 hype:{icon:'🔥',name:'Modo épico'},
 focus:{icon:'🎯',name:'En modo concentración'},
 cozy:{icon:'🌙',name:'Modo acogedor'},
 adventure:{icon:'⚔️',name:'Buscando aventuras'}
};
const fields=[
 {key:'watching_anime',icon:'🎬',label:'Anime que estoy viendo',hint:'Ej.: Frieren, One Piece…'},
 {key:'reading_manga',icon:'📚',label:'Manga o manhwa que estoy leyendo',hint:'Ej.: Solo Leveling…'},
 {key:'playing_game',icon:'🎮',label:'Videojuego al que estoy jugando',hint:'Ej.: Pokémon…'}
];
const create=(tag,cls,value)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=value;
 return node;
};
const sanitize=value=>String(value||'').trim().slice(0,90);
function display(parent,data,{preview=false,own=false}={}){
 parent.replaceChildren();
 const filled=fields.filter(f=>sanitize(data[f.key]));
 const mood=moods[data.mood]||moods.relax;
 const info=create('div','profile-now-mood',mood.icon+' '+mood.name);
 parent.append(info);
 const grid=create('div','profile-now-grid');
 for(const f of filled){
  const item=create('article','profile-now-tile');
  item.append(create('span','profile-now-icon',f.icon));
  const detail=create('div','profile-now-tile-detail');
  detail.append(create('strong','profile-now-tile-heading',f.label));
  detail.append(create('p','profile-now-tile-value',sanitize(data[f.key])));
  item.append(detail);grid.append(item);
 }
 if(!filled.length){
  parent.append(create('p','profile-now-empty',own?'Escribe un anime, un manga o un juego para completar tu tarjeta.':'Este miembro todavía no ha añadido títulos.'));
 }else parent.append(grid);
 if(preview){
  parent.append(create('p','profile-now-preview-note','👁️ VISTA PREVIA LOCAL · No se publica ni se guarda hasta pulsar «Guardar».'));
 }
}
function mount(host,memberId,{own=false}={}){
 if(!host||!memberId)return;
 host.querySelector('.profile-now-panel')?.remove();
 const root=create('section','profile-panel profile-now-panel');
 root.dataset.memberId=memberId;
 root.setAttribute('aria-label','Mi momento anime y gaming');
 const header=create('div','profile-now-header');
 const title=create('div');
 title.append(create('span','profile-now-kicker','SHADOWS BYTE · MI MOMENTO ACTUAL'));
 title.append(create('h2',null,'🎬 Mi momento anime y gaming'));
 title.append(create('p','profile-now-description',
   own?'Comparte lo que estás disfrutando. Tú eliges si otros miembros pueden verlo.':
   'Lo que este miembro está disfrutando ahora.'));
 header.append(title);root.append(header);
 const status=create('p','profile-now-status','Cargando tarjeta…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 if(own){
  const form=create('form','profile-now-form');
  const inputs=new Map();
  for(const f of fields){
   const label=create('label','profile-now-field');
   label.append(create('span',null,f.icon+' '+f.label));
   const input=create('input','profile-now-input');
   input.type='text';input.maxLength=90;input.autocomplete='off';
   input.placeholder=f.hint;input.name=f.key;
   label.append(input);inputs.set(f.key,input);form.append(label);
  }
  const moodLabel=create('label','profile-now-field');
  moodLabel.append(create('span',null,'🌟 Mi estado de ánimo'));
  const moodSelect=create('select','profile-now-input');
  moodSelect.name='mood';
  for(const [id,mood] of Object.entries(moods)){
   const option=document.createElement('option');
   option.value=id;option.textContent=mood.icon+' '+mood.name;
   moodSelect.append(option);
  }
  moodLabel.append(moodSelect);
  form.append(moodLabel);
  const visibility=create('label','profile-now-visibility');
  const publicCheck=create('input');
  publicCheck.type='checkbox';publicCheck.name='share_public';
  const publicCopy=create('span',null,'🌐 Mostrar esta tarjeta a otros miembros');
  visibility.append(publicCheck,publicCopy);form.append(visibility);
  form.append(create('p','profile-now-privacy',
   '🔒 Está oculta por defecto. Para mostrarla, activa esta opción y asegúrate de que tu perfil es público. No incluye tu correo ni datos privados.'));
  const actions=create('div','profile-now-actions');
  const save=create('button','profile-now-save','💾 Guardar mi momento');
  save.type='submit';
  const previewButton=create('button','profile-now-preview','👁️ Vista previa');
  previewButton.type='button';
  const share=create('button','profile-now-share','🔗 Copiar enlace de mi perfil');
  share.type='button';
  actions.append(save,previewButton,share);form.append(actions);
  const previewContent=create('div','profile-now-preview-content');previewContent.hidden=true;
  const readForm=()=>({
   watching_anime:sanitize(inputs.get('watching_anime').value),
   reading_manga:sanitize(inputs.get('reading_manga').value),
   playing_game:sanitize(inputs.get('playing_game').value),
   mood:moods[moodSelect.value]?moodSelect.value:'relax',
   share_public:publicCheck.checked
  });
  const updatePreview=()=>{
   if(!previewContent.hidden)display(previewContent,readForm(),{preview:true,own:true});
  };
  previewButton.onclick=()=>{
   previewContent.hidden=!previewContent.hidden;
   previewButton.textContent=previewContent.hidden?'👁️ Vista previa':'✕ Ocultar vista previa';
   updatePreview();
  };
  form.addEventListener('input',updatePreview);
  form.addEventListener('change',updatePreview);
  share.onclick=async()=>{
   const link=location.origin+location.pathname+'#/perfil?id='+encodeURIComponent(memberId);
   try{
    if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
    await navigator.clipboard.writeText(link);
    status.textContent='🔗 Enlace copiado. Tu tarjeta solo será visible si está compartida y tu perfil es público.';
   }catch(_){
    status.textContent='No se pudo copiar automáticamente. Este es tu enlace de perfil: '+link;
   }
  };
  let busy=false;
  form.onsubmit=async event=>{
   event.preventDefault();if(busy)return;
   busy=true;save.disabled=true;status.textContent='Guardando tu momento…';
   try{
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||user?.id!==memberId)throw Error('auth');
    const payload={user_id:memberId,...readForm(),updated_at:new Date().toISOString()};
    const {error}=await sb.from('member_profile_now').upsert(payload,{onConflict:'user_id'});
    if(error)throw error;
    status.textContent=payload.share_public?
      '✅ Guardado. Se mostrará a otros miembros si tu perfil es público.':
      '✅ Guardado de forma privada. Solo tú puedes verlo.';
   }catch(error){
    console.warn('Mi momento anime y gaming:',error);
    status.textContent='No se pudieron guardar los cambios. Comprueba que hayas iniciado sesión e inténtalo otra vez.';
   }finally{busy=false;save.disabled=false;}
  };
  root.append(form,previewContent,status);
  host.append(root);
  (async()=>{
   try{
    const {data,error}=await sb.from('member_profile_now').select('watching_anime,reading_manga,playing_game,mood,share_public').eq('user_id',memberId).maybeSingle();
    if(!root.isConnected)return;
    if(error)throw error;
    for(const f of fields)inputs.get(f.key).value=sanitize(data?.[f.key]);
    moodSelect.value=moods[data?.mood]?data.mood:'relax';
    publicCheck.checked=data?.share_public===true;
    status.textContent='🔒 Puedes guardar tu tarjeta sin hacerla pública.';
   }catch(error){
    if(root.isConnected)status.textContent='No se pudo cargar tu tarjeta. Puedes volver a abrir Mi cuenta.';
    console.warn('Mi momento anime:',error);
   }
  })();
 }else{
  const content=create('div','profile-now-public');
  root.append(content,status);
  (async()=>{
   try{
    const {data,error}=await sb.from('member_profile_now')
     .select('watching_anime,reading_manga,playing_game,mood,share_public')
     .eq('user_id',memberId).maybeSingle();
    if(!root.isConnected)return;
    if(error)throw error;
    if(!data?.share_public||!fields.some(f=>sanitize(data[f.key]))){
     root.remove();return;
    }
    display(content,data);
    status.remove();
   }catch(error){
    if(root.isConnected)root.remove();
    console.warn('Tarjeta pública de momento anime:',error);
   }
  })();
  host.append(root);
 }
}
window.SBProfileNow={mount};
})();