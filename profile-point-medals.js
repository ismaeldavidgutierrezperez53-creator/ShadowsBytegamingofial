/* Shadows Byte Gaming Official V2 — medallas de metas, decorativas y permanentes */
(() => {
  'use strict';
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const medals={
    bronze:{icon:'🥉',label:'Medalla de Bronce',className:'bronze',description:'Meta de 100 a 999 puntos'},
    silver:{icon:'🥈',label:'Medalla de Plata',className:'silver',description:'Meta de 1.000 a 4.999 puntos'},
    gold:{icon:'🥇',label:'Medalla de Oro',className:'gold',description:'Meta de 5.000 a 9.999 puntos'},
    diamond:{icon:'💎',label:'Medalla Diamante',className:'diamond',description:'Meta de 10.000 puntos o más'}
  };
  const toNumber=x=>Math.max(0,Number(x)||0).toLocaleString('es-ES');
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const dateLabel=raw=>{
    const d=new Date(raw);
    return Number.isFinite(d.getTime())
      ?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'';
  };
  const valid=x=>x&&Number.isSafeInteger(Number(x.goal_id))&&
    Number.isFinite(Number(x.target_points))&&Number(x.target_points)>=100&&
    medals[x.tier]&&typeof x.awarded_at==='string';

  function mount(root,isOwner){
    const identity=root.querySelector('.sbp-identity-card');
    if(!identity||root.querySelector('.sbpm-panel'))return;
    const heading=identity.querySelector('.sbp-identity-text h2');
    if(!heading)return;

    const strip=el('div','sbpm-identity-strip');
    strip.hidden=true;
    strip.setAttribute('aria-label','Medallas por metas completadas');
    heading.after(strip);

    const panel=el('section','profile-panel sbpm-panel');
    panel.setAttribute('aria-label','Medallas por metas completadas');
    const h2=el('h2','','🎖️ Medallero de metas');
    const intro=el('p','sbpm-intro',isOwner
      ?'Estas medallas decorativas se desbloquean al completar objetivos de puntos. Se mantienen aunque elijas una nueva meta.'
      :'Medallas decorativas obtenidas por este miembro al completar metas personales de puntos.');
    const toolbar=el('div','sbpm-toolbar');
    const refresh=el('button','outline-btn mini','↻ Actualizar medallas');
    refresh.type='button';
    if(isOwner)toolbar.append(refresh);
    const status=el('p','sbpm-status','Cargando medallas…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const summary=el('div','sbpm-summary');
    const historyTitle=el('h3','','🏅 Historial de medallas desbloqueadas');
    const history=el('div','sbpm-history');
    history.setAttribute('role','list');
    const note=el('p','sbpm-note',isOwner
      ?'No se conceden puntos extra. Al completar una meta, la medalla se guarda automáticamente en Supabase. Se muestran las 50 medallas más recientes.'
      :'Las medallas son reconocimientos visuales; no representan premios canjeables.');
    // Personalización exclusiva del propietario: la galería histórica no cambia.
    let editor=null,editorStatus=null,featuredList=null,availableList=null;
    if(isOwner){
      editor=el('section','sbpm-editor');
      editor.setAttribute('aria-label','Personalizar mi vitrina de medallas');
      editor.append(
        el('h3','','✨ Mi vitrina de medallas favoritas'),
        el('p','sbpm-editor-intro',
          'Destaca hasta 3 medallas que hayas ganado. Elige cuáles mostrar, cambia su orden o quítalas sin perder los logros.')
      );
      editorStatus=el('p','sbpm-editor-status','Cargando medallas favoritas…');
      editorStatus.setAttribute('role','status');
      editorStatus.setAttribute('aria-live','polite');
      featuredList=el('div','sbpm-featured-list');
      availableList=el('div','sbpm-available-list');
      editor.append(editorStatus,el('h4','','⭐ Destacadas en mi perfil'),featuredList,
        el('h4','','🏅 Medallas disponibles'),availableList);
    }
    panel.append(h2,intro,toolbar,status,summary);
    if(editor)panel.append(editor);
    panel.append(historyTitle,history,note);
    const anchor=isOwner
      ?(root.querySelector('.sbpg-panel')||root.querySelector('.sbrs-panel')||identity)
      :(root.querySelector('.sbgl-badges')||identity);
    anchor.after(panel);

    let last=0,busy=false,memberId=null,unlocked=[],selectedIds=[],selectedRecords=[];
    const active=()=>root.isConnected&&panel.isConnected&&
      location.hash.split('?')[0]===(isOwner?'#/cuenta':'#/perfil');

    function drawStrip(items){
      strip.replaceChildren();
      if(!items.length){
        strip.hidden=!isOwner;
        if(isOwner){
          strip.hidden=false;
          strip.append(el('small','sbpm-strip-caption','🎖️ Medallas favoritas'),
            el('small','sbpm-strip-empty','Todavía no has destacado ninguna medalla.'));
        }
        return;
      }
      strip.hidden=false;
      strip.append(el('small','sbpm-strip-caption','✨ Medallas favoritas'));
      const tray=el('div','sbpm-strip-tray');
      tray.setAttribute('role','list');
      for(const item of items.slice(0,3)){
        const tier=medals[item.tier];
        const chip=el('span','sbpm-strip-chip sbpm--'+tier.className,
          tier.icon+' '+toNumber(item.target_points)+' pts');
        chip.title=tier.label+' · Meta completada: '+toNumber(item.target_points)+' puntos';
        chip.setAttribute('role','listitem');
        tray.append(chip);
      }
      strip.append(tray);
    }

    function detailsFor(ids){
      const all=new Map([...unlocked,...selectedRecords].map(item=>[Number(item.goal_id),item]));
      return ids.map(id=>all.get(id)).filter(valid);
    }

    function drawEditor(){
      if(!isOwner||!editor||!active())return;
      featuredList.replaceChildren();
      availableList.replaceChildren();
      const highlighted=detailsFor(selectedIds);
      if(!selectedIds.length){
        featuredList.append(el('p','sbpm-editor-empty',
          'No has elegido medallas favoritas. Selecciona una medalla de la lista inferior.'));
      }
      highlighted.forEach((item,index)=>{
        const tier=medals[item.tier];
        const row=el('div','sbpm-featured-row sbpm--'+tier.className);
        row.append(el('strong','',tier.icon+' '+tier.label+' · '+toNumber(item.target_points)+' puntos'));
        const actions=el('div','sbpm-editor-actions');
        const up=el('button','outline-btn mini','↑ Subir');
        const down=el('button','outline-btn mini','↓ Bajar');
        const remove=el('button','outline-btn mini','Quitar');
        [up,down,remove].forEach(button=>{button.type='button';button.disabled=busy;});
        up.disabled=busy||index===0;
        down.disabled=busy||index===highlighted.length-1;
        up.setAttribute('aria-label','Subir '+tier.label+' de '+toNumber(item.target_points)+' puntos');
        down.setAttribute('aria-label','Bajar '+tier.label+' de '+toNumber(item.target_points)+' puntos');
        remove.setAttribute('aria-label','Quitar '+tier.label+' de la vitrina');
        up.addEventListener('click',()=>{
          if(busy||index===0)return;
          const next=selectedIds.slice();
          [next[index-1],next[index]]=[next[index],next[index-1]];
          save(next,'Orden de medallas guardado.');
        });
        down.addEventListener('click',()=>{
          if(busy||index===highlighted.length-1)return;
          const next=selectedIds.slice();
          [next[index],next[index+1]]=[next[index+1],next[index]];
          save(next,'Orden de medallas guardado.');
        });
        remove.addEventListener('click',()=>{
          if(!busy)save(selectedIds.filter(id=>id!==Number(item.goal_id)),
            'Medalla quitada de la vitrina; permanece en tu medallero.');
        });
        actions.append(up,down,remove);
        row.append(actions);
        featuredList.append(row);
      });
      const selected=new Set(selectedIds);
      const candidates=unlocked.filter(item=>!selected.has(Number(item.goal_id)));
      if(!candidates.length){
        availableList.append(el('p','sbpm-editor-empty',
          unlocked.length===0
            ?'Todavía no has completado ninguna meta. Completa una para desbloquear tu primera medalla.'
            :selectedIds.length>=unlocked.length
              ?'Todas tus medallas disponibles están destacadas.'
              :'No hay más medallas recientes para añadir.'));
      }else{
        for(const item of candidates){
          const tier=medals[item.tier];
          const row=el('div','sbpm-available-row sbpm--'+tier.className);
          row.append(el('span','',tier.icon+' '+tier.label+' · '+toNumber(item.target_points)+' puntos'));
          const add=el('button','gradient-btn mini','+ Añadir');
          add.type='button';
          add.disabled=busy||selectedIds.length>=3;
          add.setAttribute('aria-label','Destacar '+tier.label+' por '+toNumber(item.target_points)+' puntos');
          add.addEventListener('click',()=>{
            if(!busy&&selectedIds.length<3)
              save([...selectedIds,Number(item.goal_id)],'Medalla añadida a la vitrina.');
          });
          row.append(add);
          availableList.append(row);
        }
      }
      featuredList.append(el('small','sbpm-editor-limit',
        selectedIds.length+' de 3 medallas destacadas. La vitrina respeta la visibilidad y los bloqueos del perfil.'));
    }

    async function save(next,message){
      if(!isOwner||busy||!memberId||!active())return;
      if(!Array.isArray(next)||next.length>3||new Set(next).size!==next.length)return;
      busy=true;
      ++last;
      editorStatus.textContent='Guardando medallas favoritas…';
      drawEditor();
      try{
        const auth=await sb.auth.getUser();
        if(auth.error||auth.data?.user?.id!==memberId)
          throw Error('La sesión ha cambiado. Inicia sesión de nuevo.');
        const {data,error}=await sb.rpc('set_my_point_goal_showcase',{p_goal_ids:next});
        if(error||!data?.saved)throw error||Error('No se pudo confirmar el guardado.');
        if(!active())return;
        selectedIds=next.slice();
        selectedRecords=detailsFor(selectedIds);
        drawStrip(selectedRecords);
        window.dispatchEvent(new Event('sb:point-medal-showcase-updated'));
        editorStatus.textContent=message;
      }catch(error){
        if(active())editorStatus.textContent='No se pudieron guardar los cambios: '+
          String(error.message||'Error desconocido');
      }finally{
        busy=false;
        if(active())drawEditor();
      }
    }

    function draw(items){
      drawStrip(selectedRecords);
      panel.hidden=!isOwner&&items.length===0;
      if(panel.hidden)return;
      status.textContent=items.length
        ?toNumber(items.length)+(items.length===1?' medalla desbloqueada.':' medallas desbloqueadas.')
        :isOwner?'Todavía no has completado ninguna meta.':'';
      const counts={bronze:0,silver:0,gold:0,diamond:0};
      for(const item of items)counts[item.tier]++;
      summary.replaceChildren();
      for(const [key,tier] of Object.entries(medals)){
        const box=el('div','sbpm-summary-item sbpm--'+tier.className);
        box.append(
          el('span','sbpm-summary-icon',tier.icon),
          el('span','sbpm-summary-name',tier.label),
          el('strong','sbpm-summary-count',toNumber(counts[key]))
        );
        summary.append(box);
      }
      history.replaceChildren();
      if(!items.length){
        history.append(el('p','sbpm-empty',
          'Completa tu primera meta para desbloquear una medalla. Puedes crearla en «🏆 Mis metas de puntos».'));
        if(isOwner)drawEditor();
        return;
      }
      for(const item of items){
        const tier=medals[item.tier];
        const row=el('article','sbpm-medal-card sbpm--'+tier.className);
        row.setAttribute('role','listitem');
        row.append(el('div','sbpm-medal-icon',tier.icon));
        const details=el('div','sbpm-medal-details');
        details.append(
          el('strong','',tier.label),
          el('span','','🎯 Objetivo completado: '+toNumber(item.target_points)+' puntos'),
          el('small','','🏅 Desbloqueada el '+dateLabel(item.awarded_at))
        );
        row.append(details);
        history.append(row);
      }
      if(isOwner)drawEditor();
    }

    async function load(){
      if(busy)return;
      const ticket=++last;
      if(isOwner)refresh.disabled=true;
      status.textContent='Consultando medallas…';
      try{
        if(typeof sb==='undefined'||!sb?.auth||!sb?.rpc)throw Error('Supabase no disponible');
        let targetMember;
        if(isOwner){
          const session=await sb.auth.getUser();
          if(session.error||!session.data?.user?.id)throw Error('Inicia sesión');
          targetMember=session.data.user.id;
        }else{
          targetMember=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
          if(!uuid.test(String(targetMember)))throw Error('Perfil no disponible');
        }
        const [medalResponse,showcaseResponse]=await Promise.all([
          sb.rpc('get_member_point_goal_medals',{target_member:targetMember}),
          sb.rpc('get_member_point_goal_showcase',{target_member:targetMember})
        ]);
        if(ticket!==last||!active())return;
        if(medalResponse.error)throw medalResponse.error;
        if(showcaseResponse.error)throw showcaseResponse.error;
        if(!Array.isArray(medalResponse.data)||!Array.isArray(showcaseResponse.data))
          throw Error('Los datos de las medallas están incompletos.');
        memberId=targetMember;
        unlocked=medalResponse.data.filter(valid).slice(0,50);
        selectedRecords=showcaseResponse.data.filter(valid).slice(0,3);
        selectedIds=selectedRecords.map(item=>Number(item.goal_id));
        draw(unlocked);
        if(isOwner)editorStatus.textContent=selectedIds.length+' de 3 medallas destacadas. Puedes cambiar el orden o quitarlas.';
      }catch(error){
        if(ticket!==last||!active())return;
        status.textContent='No se pudieron cargar las medallas. '+(isOwner?'Pulsa ↻ Actualizar.':'');
        if(!isOwner){strip.hidden=true;panel.hidden=true;}
        console.debug('Medallero de metas:',error);
      }finally{
        if(isOwner&&ticket===last&&active())refresh.disabled=false;
      }
    }

    if(isOwner){
      refresh.addEventListener('click',load);
      window.addEventListener('sb:point-goal-updated',load);
      window.addEventListener('sb:point-goal-medal-unlocked',load);
      const app=document.getElementById('app');
      if(app){
        const observer=new MutationObserver(()=>{
          if(panel.isConnected)return;
          window.removeEventListener('sb:point-goal-updated',load);
          window.removeEventListener('sb:point-goal-medal-unlocked',load);
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
    const other=document.getElementById('public-member-profile');
    if(other?.querySelector('.sbp-identity-card'))mount(other,false);
  }
  function schedule(){
    if(queued)return;
    queued=true;requestAnimationFrame(scan);
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