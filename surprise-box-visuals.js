/* Cajas misteriosas: arte, rareza, animaciones y controles de imagen. */
(function(){
 'use strict';
 const RARITIES={
  common:{name:'Común',color:'#d4c7e6',icon:'⚪'},
  uncommon:{name:'Poco común',color:'#87eeae',icon:'🟢'},
  rare:{name:'Rara',color:'#87bfff',icon:'🔵'},
  epic:{name:'Épica',color:'#d3a3ff',icon:'🟣'},
  legendary:{name:'Legendaria',color:'#ffd475',icon:'🌟'}
 };
 const EFFECTS={sparkle:'Destellos',burst:'Explosión de estrellas',portal:'Portal mágico',cosmic:'Lluvia cósmica'};
 const EMOJI={bronze:'🥉',silver:'🥈',gold:'🥇',diamond:'💎'};
 const TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clean=(s)=>typeof s==='string'?s.trim():'';
 const validUrl=(s)=>/^https:\/\/[^\s]+$/i.test(clean(s));
 function normalized(box){
  const b=box||{};
  return {
   tier:clean(b.tier),
   name:clean(b.name)||'Caja misteriosa',
   image_url:validUrl(b.image_url)?clean(b.image_url):null,
   rarity:RARITIES[b.rarity]?b.rarity:'common',
   animation_style:EFFECTS[b.animation_style]?b.animation_style:'sparkle'
  };
 }
 function badge(box){
  const b=normalized(box),el=document.createElement('span');
  el.className='sb-box-rarity sb-box-rarity--'+b.rarity;
  el.textContent=RARITIES[b.rarity].icon+' '+RARITIES[b.rarity].name;
  return el;
 }
 function art(box){
  const b=normalized(box),root=document.createElement('div');
  root.className='sb-box-art sb-box-art--'+b.rarity;
  root.setAttribute('aria-label','Imagen de '+b.name);
  if(b.image_url){
   const img=document.createElement('img');
   img.loading='lazy';img.decoding='async';img.alt=b.name;img.src=b.image_url;
   img.addEventListener('error',()=>{root.replaceChildren();root.textContent=EMOJI[b.tier]||'🎁';root.classList.add('sb-box-art--fallback');});
   root.append(img);
  }else{
   root.textContent=EMOJI[b.tier]||'🎁';
   root.classList.add('sb-box-art--fallback');
  }
  return root;
 }
 function burst(stage,box){
  if(!stage||reduced())return;
  const b=normalized(box),type=b.animation_style;
  stage.classList.add('sb-box-reveal','sb-box-reveal--'+type);
  const number=type==='cosmic'?36:type==='burst'?30:18;
  const symbols=type==='cosmic'?['✦','✧','★','⋆']:type==='portal'?['✧','◇','✦']:type==='burst'?['★','✦','✷']:['✧','✦'];
  const layer=document.createElement('div');
  layer.className='sb-box-reveal__layer';layer.setAttribute('aria-hidden','true');
  stage.append(layer);
  if(type==='portal'){
   const ring=document.createElement('span');
   ring.className='sb-box-reveal__ring';
   layer.append(ring);
  }
  for(let i=0;i<number;i++){
   const particle=document.createElement('span');
   particle.className='sb-box-reveal__particle';
   particle.textContent=symbols[i%symbols.length];
   particle.style.setProperty('--i',String(i));
   particle.style.setProperty('--count',String(number));
   particle.style.setProperty('--size',String(13+i%5*4)+'px');
   if(type==='cosmic'){
    particle.style.left=(i*37%97)+'%';
    particle.style.top=(i*17%35-10)+'%';
   }
   layer.append(particle);
  }
  window.setTimeout(()=>{layer.remove();stage.classList.remove('sb-box-reveal','sb-box-reveal--'+type)},2600);
 }
 function enhanceCelebration(backdrop,box){
  if(!backdrop||!box)return;
  const panel=backdrop.querySelector('[role=none]')||backdrop.firstElementChild;
  if(!panel)return;
  panel.classList.add('sb-box-celebration');
  const picture=art(box);
  picture.classList.add('sb-box-art--celebration');
  const rank=badge(box);
  const head=panel.querySelector('h2');
  if(head){head.before(picture);head.after(rank);}
  burst(panel,box);
 }
 async function upload(file){
  if(!file)return null;
  if(!Object.prototype.hasOwnProperty.call(TYPES,file.type))throw Error('Usa una imagen JPG, PNG, WebP o GIF.');
  if(!file.size||file.size>5*1024*1024)throw Error('La imagen debe ocupar menos de 5 MB.');
  const path='surprise-boxes/'+crypto.randomUUID()+'.'+TYPES[file.type];
  const {error}=await sb.storage.from('editorial-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  const {data}=sb.storage.from('editorial-images').getPublicUrl(path);
  if(!data?.publicUrl||!validUrl(data.publicUrl))throw Error('No se pudo obtener la URL de la imagen.');
  return data.publicUrl;
 }
 function editor(initial,options={}){
  let saved=normalized(initial);
  const host=document.createElement('div');host.className='sb-box-editor';
  const title=document.createElement('strong');title.textContent='🖼️ Diseño de la caja';
  const layout=document.createElement('div');layout.className='sb-box-editor__layout';
  const visual=document.createElement('div');visual.className='sb-box-editor__preview';
  const inputs=document.createElement('div');inputs.className='sb-box-editor__fields';
  const makeLabel=(text,input)=>{
   const label=document.createElement('label');label.className='sb-box-editor__field';
   const span=document.createElement('span');span.textContent=text;
   label.append(span,input);return label;
  };
  const uploadInput=document.createElement('input');
  uploadInput.type='file';uploadInput.accept='image/jpeg,image/png,image/webp,image/gif';
  const urlInput=document.createElement('input');
  urlInput.type='url';urlInput.placeholder='https://... (opcional)';urlInput.maxLength=2048;
  urlInput.value=saved.image_url||'';
  const raritySelect=document.createElement('select');
  for(const [id,meta] of Object.entries(RARITIES)){
   const option=document.createElement('option');option.value=id;option.textContent=meta.icon+' '+meta.name;raritySelect.append(option);
  }
  const effectSelect=document.createElement('select');
  for(const [id,text] of Object.entries(EFFECTS)){
   const option=document.createElement('option');option.value=id;option.textContent=text;effectSelect.append(option);
  }
  raritySelect.value=saved.rarity;effectSelect.value=saved.animation_style;
  const note=document.createElement('small');
  note.textContent='JPG, PNG, WebP o GIF · máximo 5 MB. Puedes subir una imagen o pegar una URL HTTPS.';
  inputs.append(makeLabel('Subir imagen',uploadInput),makeLabel('O URL de imagen',urlInput),makeLabel('Nivel de rareza',raritySelect),makeLabel('Animación al abrir',effectSelect),note);
  layout.append(visual,inputs);host.append(title,layout);
  let objectUrl=null,hasChanges=false;
  function draw(){
   if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
   const file=uploadInput.files?.[0]||null;
   if(file&&TYPES[file.type])objectUrl=URL.createObjectURL(file);
   const displayed=Object.assign({},saved,{
    image_url:objectUrl||urlInput.value||null,
    rarity:raritySelect.value,animation_style:effectSelect.value
   });
   const thumb=art(displayed);
   // Temporary local blob preview is safe because it never reaches the database.
   if(objectUrl){const img=thumb.querySelector('img');if(img)img.src=objectUrl;
    else{thumb.replaceChildren();const image=document.createElement('img');image.src=objectUrl;image.alt='Vista previa de imagen';thumb.append(image);}}
   const label=badge(displayed);
   const effect=document.createElement('small');effect.textContent='✨ '+EFFECTS[displayed.animation_style];
   visual.replaceChildren(thumb,label,effect);
  }
  uploadInput.addEventListener('change',()=>{
   if(uploadInput.files?.[0]&&(!TYPES[uploadInput.files[0].type]||uploadInput.files[0].size>5*1024*1024)){
    alert('Selecciona JPG, PNG, WebP o GIF de hasta 5 MB.');uploadInput.value='';
   }
   hasChanges=true;draw();
  });
  urlInput.addEventListener('input',()=>{hasChanges=true;draw()});
  raritySelect.addEventListener('change',()=>{hasChanges=true;draw()});
  effectSelect.addEventListener('change',()=>{hasChanges=true;draw()});
  draw();
  function setEditable(enabled){
   for(const input of [uploadInput,urlInput,raritySelect,effectSelect])input.disabled=!enabled;
   host.classList.toggle('sb-box-editor--readonly',!enabled);
  }
  setEditable(options.editable!==false);
  function reset(value){
   saved=normalized(value);
   uploadInput.value='';urlInput.value=saved.image_url||'';
   raritySelect.value=saved.rarity;effectSelect.value=saved.animation_style;
   hasChanges=false;draw();
  }
  async function values(){
   const candidate=clean(urlInput.value);
   if(candidate&&!validUrl(candidate))throw Error('Introduce una URL HTTPS válida.');
   const file=uploadInput.files?.[0]||null;
   const url=file?await upload(file):candidate||null;
   return {image_url:url,rarity:raritySelect.value,animation_style:effectSelect.value};
  }
  return {element:host,values,reset,setEditable,get hasChanges(){return hasChanges;}};
 }
 window.sbSurpriseBoxVisuals={RARITIES,EFFECTS,normalized,badge,art,burst,enhanceCelebration,editor};
})();