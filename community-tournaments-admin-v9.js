/* Shadows Byte Gaming Official V2 — administración de torneos V9.
 * El inicio y las victorias se registran únicamente con RPC de administrador. */
(function(){
 if(typeof adminInitRewardShop!=='function'||typeof sb==='undefined')return;
 const original=adminInitRewardShop;
 const ui=(tag,cls,label)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(label!==undefined)n.textContent=String(label);
  return n;
 };
 const field=(caption,control)=>{
  const label=ui('label','community-tournament-admin-v9-field');
  label.append(ui('span','',caption),control);return label;
 };
 const input=(type,placeholder='')=>{
  const n=document.createElement('input');n.type=type;n.placeholder=placeholder;return n;
 };
 const select=(opts=[])=>{
  const node=document.createElement('select');
  for(const [value,label] of opts){const x=document.createElement('option');x.value=value;x.textContent=label;node.append(x)}
  return node;
 };
 const toLocal=value=>{
  if(!value)return '';
  const d=new Date(value);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 };
 const fromLocal=value=>value?new Date(value).toISOString():null;
 const time=iso=>iso?new Date(iso).toLocaleString('es-ES',{
  year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'
 }):'Por definir';
 const statusText=(element,value,error=false)=>{
  element.textContent=value;element.dataset.error=error?'yes':'no';
 };
 const fetchRpc=async(name,args)=>{
  const {data,error}=await sb.rpc(name,args);
  if(error)throw new Error(error.message);
  return data;
 };
 const init=async()=>{
  const host=document.querySelector('#admin-shop-root .sb-shop-admin');
  if(!host||host.querySelector('.community-tournament-admin-v9'))return;
  const section=ui('section','sb-shop-admin__section community-tournament-admin-v9');
  section.append(ui('h3','','⚔️ Torneos Anime y Gaming — Administración'),
   ui('p','community-tournament-admin-v9-help',
    'Crea torneos de cuatro plazas, organiza las semifinales y confirma el ganador de cada enfrentamiento. Los resultados y los premios se calculan en Supabase. No se modifican después de confirmarlos.'));
  const editor=ui('div','community-tournament-admin-v9-editor');
  editor.append(ui('h4','','📅 Programar torneo'));
  const form=document.createElement('form');form.className='community-tournament-admin-v9-form';
  const chooser=select([['','＋ Nuevo torneo']]);
  const key=input('text','copa_anime_2027');key.required=true;key.pattern='[a-z0-9_-]{4,60}';
  const kind=select([['anime','⚔️ Anime'],['gaming','🎮 Gaming']]);
  const title=input('text','Copa Anime');title.required=true;title.minLength=3;title.maxLength=100;
  const emoji=input('text','⚔️');emoji.required=true;emoji.value='⚔️';emoji.maxLength=12;
  const description=document.createElement('textarea');description.rows=3;description.maxLength=700;
  description.placeholder='Juego, reglas, cómo disputar los combates…';
  const starts=input('datetime-local');starts.required=true;
  const ends=input('datetime-local');ends.required=true;
  const published=input('checkbox');
  const publishLabel=ui('label','community-tournament-admin-v9-publish');
  publishLabel.append(published,ui('span','','Publicado · aceptar inscripciones'));
  const buttons=ui('div','community-tournament-admin-v9-form-actions');
  const save=ui('button','gradient-btn','💾 Guardar torneo');save.type='submit';
  const newBtn=ui('button','outline-btn','＋ Crear otro');newBtn.type='button';
  buttons.append(save,newBtn);
  const result=ui('p','community-tournament-admin-v9-status');result.setAttribute('role','status');
  form.append(field('Seleccionar torneo',chooser),field('ID único',key),
   field('Categoría',kind),field('Nombre del torneo',title),
   field('Icono',emoji),field('Descripción y reglas',description),
   field('Inicio',starts),field('Finalización',ends),
   publishLabel,buttons,result);
  editor.append(form);section.append(editor);
  const list=ui('div','community-tournament-admin-v9-list');
  section.append(ui('h4','','🥊 Gestión de enfrentamientos'),list);
  const old=host.querySelector('.shop-season-competition-admin-v8')||host.querySelector('.shop-season-admin-v7');
  if(old)old.insertAdjacentElement('afterend',section);else host.append(section);
  let tournaments=[];
  const resetForm=()=>{
   chooser.value='';key.value='';key.readOnly=false;kind.value='anime';title.value='';
   emoji.value='⚔️';description.value='';starts.value='';ends.value='';
   published.checked=false;result.textContent='';
  };
  const loadForm=()=>{
   const t=tournaments.find(x=>x.tournament_id===chooser.value);
   if(!t){resetForm();return}
   key.value=t.tournament_id;key.readOnly=true;kind.value=t.kind;
   title.value=t.title;description.value=t.description||'';
   emoji.value=t.emoji||'🏆';starts.value=toLocal(t.starts_at);
   ends.value=toLocal(t.ends_at);published.checked=!!t.published;
   result.textContent='Editando: '+t.title;
  };
  chooser.onchange=loadForm;
  newBtn.onclick=()=>{resetForm();key.focus()};
  const refresh=async(selected='')=>{
   tournaments=await fetchRpc('admin_list_community_tournaments');
   chooser.replaceChildren();
   for(const [id,label] of [['','＋ Nuevo torneo'],...(tournaments||[]).map(x=>[x.tournament_id,x.title])]){
    const option=document.createElement('option');option.value=id;option.textContent=label;chooser.append(option);
   }
   if(selected){chooser.value=selected;loadForm()}
   else resetForm();
   await renderCards();
  };
  const renderCards=async()=>{
   if(!list.isConnected)return;
   list.replaceChildren();
   if(!(tournaments||[]).length){list.append(ui('p','','Todavía no se han creado torneos.'));return}
   for(const t of tournaments){
    const card=ui('article','community-tournament-admin-v9-card');
    const head=ui('div','community-tournament-admin-v9-card-head');
    const text=ui('div','');
    text.append(ui('strong','',(t.emoji||'🏆')+' '+t.title),
     ui('span','',t.published?'● Publicado':'◷ Borrador'));
    head.append(text,ui('strong','','👥 '+t.participant_count+' / 4'));
    card.append(head,ui('p','community-tournament-admin-v9-dates',
     'Inicio: '+time(t.starts_at)+' · Fin: '+time(t.ends_at)));
    const actions=ui('div','community-tournament-admin-v9-actions');
    const edit=ui('button','outline-btn mini','Editar');edit.type='button';
    edit.onclick=()=>{chooser.value=t.tournament_id;loadForm();editor.scrollIntoView({block:'start',behavior:'smooth'})};
    actions.append(edit);
    const canStart=t.published&&!t.started_at&&!t.finished_at&&
     Number(t.participant_count)===4&&Date.now()>=Date.parse(t.starts_at)&&Date.now()<=Date.parse(t.ends_at);
    const startBtn=ui('button','gradient-btn mini',t.finished_at?'✓ Torneo terminado':t.started_at?'✓ Cuadro iniciado':
     canStart?'⚔️ Iniciar semifinales':'⏳ Falta fecha o participantes');
    startBtn.type='button';startBtn.disabled=!canStart;
    const message=ui('p','community-tournament-admin-v9-status');message.setAttribute('role','status');
    startBtn.onclick=async()=>{
     if(startBtn.disabled)return;
     if(!confirm('¿Iniciar ahora el cuadro de '+t.title+'? Los cuatro participantes quedarán emparejados.'))return;
     startBtn.disabled=true;message.textContent='Generando enfrentamientos…';
     try{
      const ok=await fetchRpc('admin_start_community_tournament',{p_id:t.tournament_id});
      statusText(message,ok?'✓ Semifinales creadas correctamente.':'Este torneo ya había comenzado.');
      await refresh(t.tournament_id);
     }catch(err){statusText(message,err.message,true);startBtn.disabled=false}
    };
    actions.append(startBtn);card.append(actions,message);
    if(t.started_at){
     const matches=await sb.rpc('get_community_tournament_matches',{p_id:t.tournament_id});
     const wrap=ui('div','community-tournament-admin-v9-matches');
     if(matches.error){wrap.append(ui('p','community-tournament-admin-v9-error',matches.error.message))}
     else for(const match of matches.data||[]){
      const box=ui('div','community-tournament-admin-v9-match');
      const label=match.stage==='semi'?'Semifinal '+match.match_no:match.stage==='bronze'?'Tercer puesto':'Gran final';
      box.append(ui('strong','',label),
       ui('p','',match.player1_label+' ⚔️ '+match.player2_label));
      if(match.winner_id){
       box.append(ui('span','community-tournament-admin-v9-confirmed','✓ Ganador: '+match.winner_label));
      }else{
       const resultActions=ui('div','community-tournament-admin-v9-result-buttons');
       for(const [id,name] of [[match.player1_id,match.player1_label],[match.player2_id,match.player2_label]]){
        const win=ui('button','outline-btn mini','🏅 Ganó '+name);
        win.type='button';
        win.onclick=async()=>{
         if(!confirm('¿Confirmar que «'+name+'» ganó '+label+'? El resultado no se puede cambiar.'))return;
         for(const child of resultActions.querySelectorAll('button'))child.disabled=true;
         message.textContent='Registrando vencedor…';
         try{
          await fetchRpc('admin_report_community_tournament_result',{p_match_id:match.match_id,p_winner_id:id});
          await refresh(t.tournament_id);
         }catch(err){
          statusText(message,err.message,true);
          for(const child of resultActions.querySelectorAll('button'))child.disabled=false;
         }
        };
        resultActions.append(win);
       }
       box.append(resultActions);
      }
      wrap.append(box);
     }
     card.append(wrap);
    }
    if(t.finished_at){
     const {data:finalRanking}=await sb.rpc('get_community_tournament_ranking',{p_id:t.tournament_id});
     const podium=ui('div','community-tournament-admin-v9-podium');
     for(const item of (finalRanking||[]).filter(x=>x.award_points)){
      podium.append(ui('p','',['','🥇','🥈','🥉'][Number(item.place_no)]+
       ' '+item.display_label+' · +'+item.award_points+' puntos'));
     }
     card.append(podium);
    }
    list.append(card);
   }
  };
  form.onsubmit=async ev=>{
   ev.preventDefault();
   if(!starts.value||!ends.value){statusText(result,'Completa las fechas.',true);return}
   if(Date.parse(starts.value)>=Date.parse(ends.value)){
    statusText(result,'La fecha final debe ser posterior al inicio.',true);return
   }
   const payload={
    p_id:key.value.trim(),p_kind:kind.value,p_title:title.value.trim(),
    p_description:description.value.trim(),p_emoji:emoji.value.trim(),
    p_starts_at:fromLocal(starts.value),p_ends_at:fromLocal(ends.value),
    p_published:published.checked
   };
   save.disabled=true;result.textContent='Guardando torneo…';
   try{
    await fetchRpc('admin_save_community_tournament',payload);
    await refresh(payload.p_id);
    statusText(result,'✓ Torneo guardado en Supabase.');
   }catch(err){statusText(result,err.message,true)}
   finally{save.disabled=false}
  };
  try{await refresh()}catch(err){list.append(ui('p','community-tournament-admin-v9-error','No se pudieron cargar los torneos: '+(err?.message||String(err))))}
 };
 adminInitRewardShop=async function(){
  await original();
  await init();
 };
})();