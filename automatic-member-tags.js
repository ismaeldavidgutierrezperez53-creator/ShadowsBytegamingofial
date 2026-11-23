/* Desbloqueos automáticos de etiquetas por XP, retos y medallas.
   El cálculo y los permisos se verifican en el servidor de Supabase. */
(() => {
 'use strict';
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
 const isUUID=value=>typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
 const make=(tag,cls,txt)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=String(txt);
  return node;
 };
 const criterionLabel=(key,n)=>{
  const count=Math.max(0,Number(n)||0).toLocaleString('es-ES');
  if(key==='xp')return count+' XP de actividad';
  if(key==='claimed_challenges')return count+' retos reclamados';
  if(key==='completed_goals')return count+' metas de puntos completadas';
  return count+' logros';
 };
 const badge=(row)=>{
  const rendered=window.SBExclusiveMemberTags?.makeBadge?.({...row,source:'automatic'});
  return rendered||make('strong','',String(row.emoji||'🏆')+' '+String(row.label||'Recompensa'));
 };
 async function fetchProgress(userId){
  if(!isUUID(userId))return [];
  const {data,error}=await sb.rpc('get_member_auto_exclusive_progress',{target_members:[userId]});
  if(error)throw error;
  return (data||[]).filter(row=>row.member_id===userId);
 }
 const pendingProfiles=new WeakSet();
 async function mountOwnProgress(){
  if(location.hash.split('?')[0]!=='#/cuenta')return;
  const root=document.getElementById('account-profile');
  if(!root?.querySelector('.profile-grid')||root.querySelector('#sb-auto-member-tag-progress')||pendingProfiles.has(root))return;
  pendingProfiles.add(root);
  try{
   const {data,error}=await sb.auth.getSession();
   const id=data?.session?.user?.id;
   if(error||!id||!root.isConnected||location.hash.split('?')[0]!=='#/cuenta')return;
   if(root.querySelector('#sb-auto-member-tag-progress'))return;
   const panel=make('section','profile-panel sb-exclusive-goals-panel');
   panel.id='sb-auto-member-tag-progress';
   const heading=make('h3','','🏆 Mis etiquetas desbloqueables');
   const intro=make('p','', 'Sube de nivel con XP de actividad, reclama retos en la Tienda de recompensas y completa tus metas de puntos. Las etiquetas se consiguen automáticamente.');
   const status=make('p','sb-exclusive-goals-status','Consultando tus logros…');
   status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const header=make('div','sb-exclusive-goals-toolbar');
   const refresh=make('button','outline-btn mini','🔄 Actualizar progreso');
   refresh.type='button';
   const demo=make('button','outline-btn mini','✨ Probar celebración');
   demo.type='button';
   demo.setAttribute('aria-label','Ver demostración de celebración anime sin recibir una recompensa');
   demo.addEventListener('click',()=>window.sbPreviewAutoTagCelebration?.());
   header.append(refresh,demo);
   const list=make('div','sb-exclusive-goal-list');
   panel.append(heading,intro,header,status,list);
   const grid=root.querySelector('.profile-grid');
   if(grid)grid.before(panel);else root.append(panel);
   let inProgress=false;
   const load=async()=>{
    if(inProgress)return;
    inProgress=true;refresh.disabled=true;
    status.textContent='Comprobando puntos y logros…';
    try{
     const rows=await fetchProgress(id);
     if(!panel.isConnected)return;
     list.replaceChildren();
     const unlocked=rows.filter(row=>row.unlocked).length;
     if(!rows.length){status.textContent='No se encontraron etiquetas automáticas.';return;}
     for(const row of rows){
      const current=Math.max(0,Number(row.current_value)||0);
      const target=Math.max(1,Number(row.target_value)||1);
      const goal=make('article','sb-exclusive-goal'+(row.unlocked?' is-unlocked':' is-locked'));
      const top=make('div','sb-exclusive-goal-header');
      const name=badge(row);
      const state=make('small','',row.unlocked?'✅ Desbloqueada':'🔒 Bloqueada');
      top.append(name,state);
      const meter=make('progress','sb-exclusive-goal-meter');
      meter.max=target;meter.value=Math.min(current,target);
      meter.setAttribute('aria-label','Progreso de '+row.label);
      const summary=make('p','sb-exclusive-goal-count',
       criterionLabel(row.criterion,Math.min(current,target))+' / '+criterionLabel(row.criterion,target));
      goal.append(top,meter,summary);
      list.append(goal);
     }
     status.textContent='🏅 '+unlocked+' de '+rows.length+' etiquetas desbloqueadas automáticamente.';
    }catch(err){
     if(panel.isConnected)status.textContent='No se pudo consultar el progreso: '+(err.message||'Comprueba tu conexión.');
    }finally{inProgress=false;refresh.disabled=false;}
   };
   refresh.addEventListener('click',()=>void load());
   void load();
  }finally{pendingProfiles.delete(root);}
 }
 const pendingAdmins=new WeakSet();
 async function mountAdminSummary(){
  if(location.hash.split('?')[0]!=='#/admin')return;
  const panel=document.getElementById('sb-exclusive-tags-admin');
  if(!panel||panel.querySelector('.sb-exclusive-auto-summary')||pendingAdmins.has(panel))return;
  pendingAdmins.add(panel);
  try{
   const [{data:rules,error:ruleError},{data:catalog,error:catalogError}]=await Promise.all([
    sb.from('sb_exclusive_tag_auto_rules').select('tag_id,criterion,target_value').limit(150),
    sb.from('sb_exclusive_tag_catalog').select('id,label,emoji,color,animation').limit(150)
   ]);
   if(ruleError||catalogError||!panel.isConnected)return;
   const blockedIds=new Set((rules||[]).map(rule=>rule.tag_id));
   const select=panel.querySelector('select[aria-label="Etiqueta especial"]');
   if(select){
    const filterManual=()=>{
     for(const option of [...select.options]){
      if(blockedIds.has(option.value))option.remove();
     }
    };
    new MutationObserver(filterManual).observe(select,{childList:true});
    filterManual();
   }
   const defs=new Map((catalog||[]).map(tag=>[tag.id,tag]));
   const section=make('section','sb-exclusive-admin-section sb-exclusive-auto-summary');
   section.append(make('h3','','🎯 Etiquetas por nivel y logros'),
    make('p','','Estas etiquetas son exclusivas de desbloqueo automático. No pueden otorgarse desde el selector manual; Supabase valida los XP y los logros.'));
   const list=make('div','sb-exclusive-auto-rules');
   for(const rule of rules||[]){
    const tag=defs.get(rule.tag_id);
    if(!tag)continue;
    const entry=make('div','sb-exclusive-auto-rule');
    entry.append(badge(tag),make('small','','Requisito: '+criterionLabel(rule.criterion,rule.target_value)));
    list.append(entry);
   }
   section.append(list);
   const create=panel.querySelector('.sb-exclusive-admin-section');
   if(create)create.after(section);else panel.append(section);
  }finally{pendingAdmins.delete(panel);}
 }
 let queued=false;
 function schedule(){
  if(queued)return;
  queued=true;
  queueMicrotask(()=>{
   queued=false;
   void mountOwnProgress().catch(error=>console.warn('Progreso de etiquetas automáticas',error));
   void mountAdminSummary().catch(error=>console.warn('Catálogo de etiquetas automáticas',error));
  });
 }
 const app=document.getElementById('app');
 if(app){
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
})();