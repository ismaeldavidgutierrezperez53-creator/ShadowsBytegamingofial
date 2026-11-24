/* Shadows Byte Gaming Official V2 — insignias permanentes por aperturas de cajas */
(()=>{
 'use strict';
 const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const el=(tag,classes,text)=>{
  const node=document.createElement(tag);
  if(classes)node.className=classes;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('es-ES');
 function mount(root,isOwn){
  const identity=root.querySelector('.sbp-identity-card');
  if(!identity||identity.querySelector('.sbb-identity-award'))return;
  const heading=identity.querySelector('.sbp-identity-text h2');
  if(!heading)return;
  const strip=el('div','sbb-identity-award');
  strip.setAttribute('aria-label','Insignia destacada de cajas misteriosas');
  strip.hidden=true;
  heading.after(strip);
  const panel=el('section','profile-panel sbb-awards');
  panel.setAttribute('aria-label','Logros por abrir cajas misteriosas');
  panel.hidden=true;
  const top=el('div','sbb-awards__heading');
  const title=el('h2',null,'🎖️ Insignias de cajas misteriosas');
  const explanation=el('p','sbb-awards__intro',
   'Consigue insignias permanentes al abrir 1, 5, 10, 25 y 50 cajas misteriosas. Se conceden automáticamente y no se pueden comprar.');
  top.append(title,explanation);
  const summary=el('div','sbb-awards__summary');
  const controls=el('div','sbb-awards__controls');
  const status=el('p','sbb-awards__status','Cargando insignias…');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const gallery=el('div','sbb-awards__gallery');
  const refresh=el('button','outline-btn mini sbb-awards__refresh','↻ Actualizar insignias');
  refresh.type='button';
  const visibility=el('button','outline-btn mini sbb-awards__visibility','');
  visibility.type='button';
  const automatic=el('button','outline-btn mini sbb-awards__automatic','🔄 Destacar automáticamente la más alta');
  automatic.type='button';
  if(isOwn){controls.append(refresh,visibility,automatic);}
  panel.append(top,summary,controls,status,gallery);
  identity.after(panel);

  let seq=0,busy=false,current=null,memberId=null;
  const active=()=>root.isConnected&&strip.isConnected&&
   location.hash.slice(1).split('?')[0]===(isOwn?'/cuenta':'/perfil');
  const clear=(target,message)=>{target.replaceChildren(el('p','sbb-awards__empty',message));};
  const formatDate=value=>{
   const date=new Date(value);
   return Number.isNaN(date.getTime())?'':date.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  };
  function drawIdentity(data){
   strip.replaceChildren();
   const unlocked=(data.badges||[]).filter(b=>b.unlocked);
   const featured=unlocked.find(b=>b.key===data.featured_key);
   if(!featured || (!isOwn&&!data.show_on_profile)){
    strip.hidden=true;return;
   }
   strip.hidden=false;
   const award=el('span','sbb-identity-award__chip',featured.icon+' '+featured.name);
   award.title='Insignia por abrir '+featured.goal+' cajas misteriosas';
   strip.append(award);
   if(isOwn&&!data.show_on_profile)strip.append(el('small','sbb-identity-award__private','Oculta a otros miembros'));
  }
  function draw(data){
   if(data.hidden){
    panel.hidden=true;strip.hidden=true;return;
   }
   const badges=Array.isArray(data.badges)?data.badges:[];
   const unlocked=badges.filter(b=>b.unlocked);
   panel.hidden=(!isOwn&&unlocked.length===0);
   if(panel.hidden){strip.hidden=true;return;}
   const opened=Math.max(0,Number(data.open_count)||0);
   const score=el('div','sbb-awards__stat');
   score.append(el('span',null,'🎁 Cajas abiertas'),el('strong',null,fmt(opened)));
   const awardCount=el('div','sbb-awards__stat');
   awardCount.append(el('span',null,'🏅 Insignias ganadas'),el('strong',null,fmt(unlocked.length)+' / 5'));
   summary.replaceChildren(score,awardCount);
   drawIdentity(data);
   gallery.replaceChildren();
   if(!isOwn&&unlocked.length===0){clear(gallery,'Este miembro todavía no ha ganado insignias.');return;}
   for(const badge of badges){
    const achieved=Boolean(badge.unlocked);
    const isFeatured=badge.key===data.featured_key;
    const card=el('article','sbb-awards__badge'+(achieved?' is-unlocked':' is-locked')+(isFeatured?' is-featured':''));
    const icon=el('span','sbb-awards__badge-icon',achieved?badge.icon:'🔒');
    icon.setAttribute('aria-hidden','true');
    const name=el('strong','sbb-awards__badge-name',badge.name);
    const goal=el('span','sbb-awards__badge-goal',
     achieved?'✓ Desbloqueada · '+fmt(badge.goal)+' cajas':'Abre '+fmt(badge.goal)+' cajas');
    card.append(icon,name,goal);
    if(achieved){
     if(badge.unlocked_at){
      const dateText=formatDate(badge.unlocked_at);
      if(dateText)card.append(el('small','sbb-awards__date','Conseguida: '+dateText));
     }
     if(isFeatured)card.append(el('span','sbb-awards__badge-featured','⭐ Destacada en el perfil'));
     if(isOwn&&!isFeatured){
      const pick=el('button','outline-btn mini sbb-awards__choose','⭐ Destacar');
      pick.type='button';pick.disabled=busy;
      pick.setAttribute('aria-label','Destacar insignia '+badge.name);
      pick.addEventListener('click',()=>save(badge.key,data.show_on_profile));
      card.append(pick);
     }
    }else if(isOwn){
     const progress=el('div','sbb-awards__progress');
     const bar=el('div','sbb-awards__progress-fill');
     bar.style.width=Math.max(0,Math.min(100,100*opened/Math.max(1,Number(badge.goal)||1)))+'%';
     progress.setAttribute('role','progressbar');
     progress.setAttribute('aria-valuemin','0');
     progress.setAttribute('aria-valuemax',String(badge.goal));
     progress.setAttribute('aria-valuenow',String(Math.min(opened,Number(badge.goal))));
     progress.setAttribute('aria-label','Progreso de '+badge.name);
     progress.append(bar);
     card.append(progress,el('small','sbb-awards__remaining',
      fmt(opened)+' / '+fmt(badge.goal)+' · faltan '+fmt(Math.max(0,badge.goal-opened))));
    }
    gallery.append(card);
   }
   if(isOwn){
    visibility.textContent=data.show_on_profile?'👁️ Visible en mi perfil público':'🙈 Oculta en mi perfil público';
    visibility.setAttribute('aria-pressed',String(data.show_on_profile));
    visibility.disabled=busy;
    refresh.disabled=busy;
    automatic.disabled=busy||unlocked.length===0;
    status.textContent=fmt(unlocked.length)+' de 5 insignias desbloqueadas. '+
      (data.show_on_profile?'Las insignias ganadas son visibles en tu perfil público.':'Has ocultado tus insignias a otros miembros.');
   }else{
    status.textContent=fmt(unlocked.length)+' insignia'+(unlocked.length===1?' conseguida.':'s conseguidas.');
   }
  }
  async function save(key,visible){
   if(!isOwn||busy||!memberId||!active())return;
   busy=true;refresh.disabled=true;visibility.disabled=true;automatic.disabled=true;
   status.textContent='Guardando insignia destacada…';
   delete status.dataset.type;
   try{
    const {data,error}=await sb.rpc('set_my_surprise_box_badge',{
     p_featured_badge:key,p_show_on_profile:visible
    });
    if(error)throw error;
    if(!data?.saved)throw new Error('No se confirmó el guardado.');
    await load();
    window.dispatchEvent(new Event('sb:surprise-box-badges-updated'));
   }catch(error){
    if(active()){
     status.textContent='No se pudieron guardar los cambios: '+(error.message||'Error desconocido');
     status.dataset.type='error';
    }
   }finally{
    busy=false;
    if(active()) {
     refresh.disabled=false;
     visibility.disabled=false;
     automatic.disabled=!(current?.badges||[]).some(b=>b.unlocked);
    }
   }
  }
  async function load(){
   const currentSeq=++seq;
   if(isOwn)status.textContent='Actualizando insignias…';
   try{
    if(typeof sb==='undefined'||!sb.rpc)throw new Error('Supabase no está disponible.');
    let id;
    if(isOwn){
     const result=await sb.auth.getUser();
     if(result.error||!result.data?.user?.id)throw new Error('Inicia sesión para ver tus insignias.');
     id=result.data.user.id;
    }else{
     id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
     if(!validId.test(String(id)))throw new Error('Perfil no disponible.');
    }
    memberId=id;
    const {data,error}=await sb.rpc('get_member_surprise_box_badges',{target_member:id});
    if(!active()||seq!==currentSeq)return;
    if(error)throw error;
    if(!data||!Array.isArray(data.badges))throw new Error('Datos de insignias no disponibles.');
    current=data;
    draw(data);
    delete status.dataset.type;
   }catch(error){
    if(!active()||seq!==currentSeq)return;
    if(isOwn){
     panel.hidden=false;clear(gallery,'No se pudieron cargar las insignias.');
     status.textContent=error.message||'Error al consultar tus logros.';
     status.dataset.type='error';
    }else {
     panel.hidden=true;strip.hidden=true;
    }
   }
  }
  if(isOwn){
   refresh.addEventListener('click',()=>{if(!busy)load()});
   visibility.addEventListener('click',()=>{if(current&&!busy)save(null,!current.show_on_profile)});
   automatic.addEventListener('click',()=>{if(current&&!busy)save(null,current.show_on_profile)});
   const sync=()=>{if(!busy&&active())load()};
   window.addEventListener('sb:surprise-box-opened',sync);
   window.addEventListener('sb:surprise-box-badges-updated',sync);
   const app=document.getElementById('app');
   if(app){
    const observer=new MutationObserver(()=>{
     if(root.isConnected&&strip.isConnected)return;
     window.removeEventListener('sb:surprise-box-opened',sync);
     window.removeEventListener('sb:surprise-box-badges-updated',sync);
     observer.disconnect();
    });
    observer.observe(app,{childList:true,subtree:true});
   }
  }
  load();
 }
 let queued=false;
 function scan(){
  queued=false;
  const own=document.getElementById('account-profile');
  if(own?.querySelector('.sbp-identity-card'))mount(own,true);
  const publicRoot=document.getElementById('public-member-profile');
  if(publicRoot?.querySelector('.sbp-identity-card'))mount(publicRoot,false);
 }
 function schedule(){
  if(queued)return;queued=true;requestAnimationFrame(scan);
 }
 function init(){
  const app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
