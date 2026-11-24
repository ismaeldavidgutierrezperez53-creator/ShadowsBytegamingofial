/* Efectos anime elegidos por cada miembro para el nombre con etiqueta principal. */
(() => {
 'use strict';
 if (typeof sb==='undefined') return;
 const EFFECTS=[
  ['classic','✨ Brillo clásico','Destello suave del color de tu etiqueta'],
  ['fire','🔥 Fuego','Llamas y resplandor cálido'],
  ['lightning','⚡ Rayos','Destellos eléctricos azules'],
  ['stars','🌟 Estrellas','Brillo dorado y estrellas'],
  ['hearts','💜 Corazones','Corazones y brillo rosa-violeta'],
  ['legendary','👑 Aura legendaria','Aura dorada y violeta con corona'],
  ['none','🌙 Sin animación','Nombre sin brillo ni destellos']
 ];
 const VALID=new Set(EFFECTS.map(x=>x[0]));
 const COLORS=new Set(['purple','blue','pink','green','orange','gold','slate']);
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const make=(tag,cls='',value)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=String(value);
  return el;
 };
 let mounting=false,queued=false;
 async function mount(){
  if(location.hash.split('?')[0]!=='#/cuenta'||mounting)return;
  const primary=document.getElementById('sb-primary-tag-picker');
  if(!primary||primary.querySelector('#sb-member-name-effects'))return;
  mounting=true;
  try{
   const {data,error}=await sb.auth.getSession();
   const userId=data?.session?.user?.id;
   if(error||!UUID.test(userId||'')||!primary.isConnected||location.hash.split('?')[0]!=='#/cuenta')return;
   if(primary.querySelector('#sb-member-name-effects'))return;
   const panel=make('section','sb-name-effect-editor');
   panel.id='sb-member-name-effects';
   panel.append(make('h4','','✨ Efecto anime de mi nombre'),
    make('p','sb-name-effect-intro',
     'Personaliza el efecto que acompaña a tu etiqueta principal. Se muestra junto a tu nombre en el perfil, las publicaciones y los comentarios.'));
   const status=make('p','sb-name-effect-status','Consultando tu elección…');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const preview=make('div','sb-name-effect-preview');
   preview.setAttribute('aria-label','Vista previa del efecto en el nombre');
   const title=document.querySelector('#account-profile .profile-identity-copy h2');
   const textNode=Array.from(title?.childNodes||[]).find(node=>node.nodeType===3&&node.textContent.trim());
   const activeName=title?.querySelector(':scope > .sb-primary-name-aura')?.textContent;
   const name=(activeName||textNode?.textContent||'Tu nombre anime').trim().slice(0,60);
   const sample=make('strong','sb-primary-name-aura',name);
   sample.dataset.effect='classic';sample.dataset.color='purple';
   preview.append(sample);
   const options=make('div','sb-name-effect-options');
   options.setAttribute('role','group');options.setAttribute('aria-label','Elegir efecto anime');
   const toolbar=make('div','sb-name-effect-toolbar');
   const save=make('button','gradient-btn mini','💾 Guardar efecto');
   save.type='button';
   const refresh=make('button','outline-btn mini','↻ Actualizar');
   refresh.type='button';
   toolbar.append(save,refresh);
   panel.append(status,preview,options,toolbar,
    make('small','sb-name-effect-note',
      'Los efectos no otorgan permisos ni puntos. Si desactivas las animaciones en el dispositivo, se muestra una versión estática.'));
   primary.append(panel);
   if(!panel.isConnected)return;

   let selected='classic',saved='classic',hasPrimary=false,busy=false,activeColor='purple';
   const buttons=new Map();
   const say=(msg,isError=false)=>{
    status.textContent=msg;status.dataset.error=isError?'true':'false';
   };
   function draw(){
    sample.dataset.effect=VALID.has(selected)?selected:'classic';
    sample.dataset.color=COLORS.has(activeColor)?activeColor:'purple';
    preview.dataset.effect=sample.dataset.effect;
    for(const [effect,button] of buttons){
     const chosen=selected===effect;
     button.classList.toggle('is-selected',chosen);
     button.setAttribute('aria-pressed',String(chosen));
     button.disabled=busy||!hasPrimary;
    }
    save.disabled=busy||!hasPrimary||selected===saved;
    refresh.disabled=busy;
    preview.classList.toggle('is-disabled',!hasPrimary);
   }
   for(const [effect,label,description] of EFFECTS){
    const button=make('button','sb-name-effect-choice');
    button.type='button';
    button.dataset.effect=effect;
    button.append(make('strong','',label),make('small','',description));
    button.addEventListener('click',()=>{
     if(!hasPrimary||busy)return;
     selected=effect;
     draw();
     say(selected===saved?'Efecto actualmente guardado.':'Vista previa lista. Pulsa «Guardar efecto» para aplicarlo.');
    });
    options.append(button);buttons.set(effect,button);
   }
   async function load(){
    if(busy||!panel.isConnected)return;
    busy=true;draw();say('Cargando etiquetas y efecto guardado…');
    try{
     const [primaryResult,effectResult]=await Promise.all([
      sb.rpc('sb_get_member_primary_featured_tags',{p_members:[userId]}),
      sb.from('sb_member_name_effects').select('effect').eq('user_id',userId).maybeSingle()
     ]);
     if(primaryResult.error||effectResult.error)throw primaryResult.error||effectResult.error;
     if(!panel.isConnected||location.hash.split('?')[0]!=='#/cuenta')return;
     const primaryTag=primaryResult.data?.[0];
     hasPrimary=!!primaryTag;
     activeColor=primaryTag?.color||'purple';
     saved=VALID.has(effectResult.data?.effect)?effectResult.data.effect:'classic';
     selected=saved;
     say(hasPrimary?'Selecciona un efecto y guárdalo para usarlo en tu nombre.':
      'Primero elige y guarda una etiqueta principal en este mismo apartado.');
    }catch(error){
     hasPrimary=false;
     say('No se pudieron consultar los efectos: '+(error?.message||'Comprueba la conexión.'),true);
    }finally{busy=false;draw();}
   }
   save.addEventListener('click',async()=>{
    if(busy||!hasPrimary||selected===saved)return;
    const selection=selected;
    busy=true;draw();say('Guardando el efecto anime…');
    try{
     const {error}=await sb.from('sb_member_name_effects').upsert({
      user_id:userId,effect:selection,updated_at:new Date().toISOString()
     },{onConflict:'user_id'});
     if(error)throw error;
     saved=selection;
     window.dispatchEvent(new CustomEvent('sb-name-effect-changed',{detail:{userId,effect:selection}}));
     say('✅ Efecto guardado. También se mostrará en tu perfil público y publicaciones.');
    }catch(error){
     say('No se pudo guardar el efecto: '+(error?.message||'Error de conexión.'),true);
    }finally{busy=false;draw();}
   });
   refresh.addEventListener('click',()=>void load());
   const recheck=()=>{
    if(panel.isConnected)void load();
    else {
     window.removeEventListener('sb-primary-tag-changed',recheck);
     window.removeEventListener('sb-featured-tags-saved',recheck);
    }
   };
   window.addEventListener('sb-primary-tag-changed',recheck);
   window.addEventListener('sb-featured-tags-saved',recheck);
   void load();
  }catch(error){console.warn('Efectos de nombre anime:',error)}
  finally{mounting=false;}
 }
 function schedule(){
  if(queued)return;
  queued=true;
  setTimeout(()=>{queued=false;void mount();},80);
 }
 const app=document.getElementById('app');
 if(!app)return;
 new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
 window.addEventListener('hashchange',schedule);
 schedule();
})();