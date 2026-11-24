/* Escaparate de cinco insignias favoritas de reacciones a la comunidad. */
(() => {
  'use strict';
  const MAX=5;
  const FRAMES=[['anime','🌸 Anime'],['neon','💜 Neón'],['gold','👑 Dorado']];
  const frame=value=>FRAMES.some(([key])=>key===value)?value:'anime';
  const DEFAULT_COLORS={
    anime:{primary:'#f6a4dd',glow:'#ff82c5'},
    neon:{primary:'#61dfff',glow:'#bc52fa'},
    gold:{primary:'#ffda83',glow:'#ffc048'}
  };
  const isHex=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
  const defaultColors=style=>DEFAULT_COLORS[frame(style)];
  const readColors=(row)=>{
    if(!row)return null;
    const main=isHex(row.frame_primary_color)?row.frame_primary_color:null;
    const glow=isHex(row.frame_glow_color)?row.frame_glow_color:null;
    return main||glow?{primary:main,glow:glow}:null;
  };
  function paintColors(node,chosen,style,force=false){
    const palette=defaultColors(style);
    const custom=Boolean(chosen||force);
    node.classList.toggle('sb-community-fav-custom-colors',custom);
    if(custom){
      const primary=isHex(chosen?.primary)?chosen.primary:palette.primary;
      const glow=isHex(chosen?.glow)?chosen.glow:palette.glow;
      node.style.setProperty('--sb-fav-main',primary);
      node.style.setProperty('--sb-fav-glow',glow);
    }else{
      node.style.removeProperty('--sb-fav-main');
      node.style.removeProperty('--sb-fav-glow');
    }
  }
  function newColorField(label,value){
    const wrap=el('label','sb-community-fav-color-field');
    wrap.append(el('span','sb-community-fav-color-caption',label));
    const input=el('input','sb-community-fav-color-input');
    input.type='color';input.value=value;
    input.setAttribute('aria-label',label);
    wrap.append(input);
    return {wrap,input};
  }
  async function allowsAnimation(viewerId){
    if(!viewerId)return true;
    try{
      const {data,error}=await api().from('member_notification_preferences')
        .select('notification_animations_enabled').eq('user_id',viewerId).maybeSingle();
      if(error)throw error;
      return data?.notification_animations_enabled!==false;
    }catch(error){
      console.warn('Preferencia de animaciones para insignias:',error);
      return true;
    }
  }
  const TABLE='member_community_reaction_badge_showcase';
  const BADGES='member_community_reaction_badges';
  const CATALOG='member_community_reaction_badge_catalog';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const api=()=>typeof sb!=='undefined'?sb:null;
  const el=(tag,cls,content)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=content;
    return node;
  };
  const integer=n=>Math.max(0,Number(n)||0);
  const visible=route=>location.hash.split('?')[0]===route;
  const sameSession=async id=>{
    const {data}=await api().auth.getSession();
    return data?.session?.user?.id===id;
  };

  function drawStrip(strip,selected,catalog,own,styles,colors,animationsEnabled=true){
    strip.replaceChildren();
    strip.classList.toggle('sb-community-fav-animations-off',!animationsEnabled);
    const badges=selected.map(key=>({key,info:catalog.get(key)}))
      .filter(item=>Boolean(item.info)).slice(0,MAX);
    if(!badges.length){
      strip.hidden=!own;
      if(own)strip.append(el('small','sb-community-fav-strip-empty',
        '🎖️ Sin insignias de comunidad destacadas'));
      return;
    }
    strip.hidden=false;
    strip.append(el('small','sb-community-fav-strip-label',
      '🎖️ Insignias favoritas de la comunidad'));
    const tray=el('div','sb-community-fav-strip-tray');
    tray.setAttribute('role','list');
    for(const {key,info:badge} of badges){
      const frameStyle=frame(styles.get(key));
      const chip=el('span','sb-community-fav-strip-chip sb-community-fav-style-'+frameStyle,
        badge.emoji+' '+badge.title);
      chip.setAttribute('role','listitem');
      chip.title=badge.title+' · Marco '+(FRAMES.find(([value])=>value===frameStyle)?.[1]||'Anime');
      paintColors(chip,colors.get(key),frameStyle);
      tray.append(chip);
    }
    strip.append(tray);
  }

  function buildEditor(own){
    const panel=own==='cuenta'
      ?el('details','sb-community-fav-editor sb-community-fav-editor-account')
      :el('section','sb-community-fav-editor section');
    if(own==='cuenta'){
      panel.append(el('summary','sb-community-fav-editor-heading',
        '🎖️ Escaparate de insignias favoritas (hasta 5)'));
    }else{
      panel.id='sb-community-fav-editor-logros';
      panel.append(el('h2','sb-community-fav-editor-heading',
        '🎖️ Escaparate de insignias favoritas'));
    }
    const intro=el('p','sb-community-fav-editor-intro',
      'Elige hasta 5 insignias de la comunidad. Personaliza el marco y los colores principal y de brillo de cada una; ordénalas para mostrarlas en tu perfil público. Quitarlas no elimina tus logros.');
    const status=el('p','sb-community-fav-editor-status',
      own==='cuenta'?'Abre el apartado para gestionar tus insignias.':'Cargando insignias…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');

    // Vista previa siempre disponible: antes no había selector si no se destacaban insignias.
    const preview=el('div','sb-community-fav-style-preview');
    const previewHeading=el('strong','sb-community-fav-preview-heading',
      '✨ Prueba los tres marcos antes de destacar');
    const previewControl=el('label','sb-community-fav-frame-label sb-community-fav-preview-label');
    previewControl.append(el('span',null,'✨ Marco'));
    const previewSelect=el('select','sb-community-fav-frame-select sb-community-fav-preview-select');
    previewSelect.setAttribute('aria-label','Probar estilos de marcos para insignias');
    for(const [value,label] of FRAMES){
      const option=el('option',null,label);
      option.value=value;
      previewSelect.append(option);
    }
    previewControl.append(previewSelect);
    const previewSwatch=el('span','sb-community-fav-strip-chip sb-community-fav-style-anime','🌸 Marco Anime');
    previewSwatch.setAttribute('aria-live','polite');
    const previewPalette=el('div','sb-community-fav-color-controls');
    const previewMain=newColorField('🎨 Color principal',DEFAULT_COLORS.anime.primary);
    const previewGlow=newColorField('✨ Color de brillo',DEFAULT_COLORS.anime.glow);
    previewPalette.append(previewMain.wrap,previewGlow.wrap);
    function refreshPreview(resetPalette=false){
      const style=frame(previewSelect.value);
      const item=FRAMES.find(([key])=>key===style);
      const defaults=defaultColors(style);
      if(resetPalette){
        previewMain.input.value=defaults.primary;
        previewGlow.input.value=defaults.glow;
      }
      previewSwatch.className='sb-community-fav-strip-chip sb-community-fav-style-'+style;
      previewSwatch.textContent=(item?.[1]||'🌸 Anime')+' · Vista previa';
      paintColors(previewSwatch,{primary:previewMain.input.value,glow:previewGlow.input.value},style,true);
    }
    previewSelect.addEventListener('change',()=>refreshPreview(true));
    previewMain.input.addEventListener('input',()=>refreshPreview());
    previewGlow.input.addEventListener('input',()=>refreshPreview());
    refreshPreview();
    const previewHint=el('p','sb-community-fav-preview-hint',
      'Prueba los colores aquí sin guardar cambios. Para conservarlos, selecciona los colores de una insignia desbloqueada y pulsa «+ Destacar».');
    preview.append(previewHeading,previewControl,previewPalette,previewSwatch,previewHint);
    const selectedTitle=el('h3','sb-community-fav-subtitle','Mis insignias destacadas');
    const selectedBox=el('div','sb-community-fav-selected');
    const availableTitle=el('h3','sb-community-fav-subtitle','Insignias desbloqueadas disponibles');
    const availableBox=el('div','sb-community-fav-available');
    const buttons=el('div','sb-community-fav-editor-actions');
    const reload=el('button','outline-btn mini sb-community-fav-reload','↻ Actualizar escaparate');
    reload.type='button';
    const publicLink=el('a','outline-btn mini','👤 Ver mi perfil público');
    publicLink.href='#/cuenta';
    buttons.append(reload,publicLink);
    panel.append(intro,preview,status,selectedTitle,selectedBox,availableTitle,availableBox,buttons);
    return {panel,status,selectedBox,availableBox,reload,selectedTitle,availableTitle,publicLink};
  }

  function mountOwn(route){
    const isAccount=route==='#/cuenta';
    const anchor=isAccount
      ?document.querySelector('#account-profile .sb-community-reaction-account')
      :document.getElementById('sb-community-reaction-logros');
    if(!anchor)return;
    const parent=isAccount
      ?document.querySelector('#account-profile .profile-body')
      :anchor.parentElement;
    if(!parent)return;
    const existing=parent.querySelector(isAccount
      ?'.sb-community-fav-editor-account'
      :'#sb-community-fav-editor-logros');
    if(existing)return;

    const ui=buildEditor(isAccount?'cuenta':'logros');
    anchor.after(ui.panel);
    let busy=false,loaded=false,ownerId='',lastLoaded=0;
    let catalog=new Map(),unlocked=[],selected=[],seq=0;
    let frames=new Map(),colors=new Map(),animationsEnabled=true;
    const active=()=>ui.panel.isConnected && visible(route);
    const selection=()=>new Set(selected);

    function draw(){
      if(!active())return;
      const selectedSet=selection();
      const disabled=busy;
      ui.panel.classList.toggle('sb-community-fav-animations-off',!animationsEnabled);
      ui.selectedTitle.textContent='Mis insignias destacadas ('+selected.length+'/'+MAX+')';
      ui.selectedBox.replaceChildren();
      ui.availableBox.replaceChildren();

      if(!selected.length)ui.selectedBox.append(el('p','sb-community-fav-empty',
        'Aún no has destacado insignias. Prueba los marcos de arriba y después destaca una de las disponibles.'));
      selected.forEach((key,index)=>{
        const item=catalog.get(key);
        if(!item)return;
        const row=el('div','sb-community-fav-row');
        const icon=el('span','sb-community-fav-row-emoji sb-community-fav-style-'+frame(frames.get(key)),item.emoji);
        icon.setAttribute('aria-hidden','true');
        paintColors(icon,colors.get(key),frame(frames.get(key)));
        const text=el('strong','sb-community-fav-row-title',item.title);
        const rank=el('span','sb-community-fav-row-rank',String(index+1)+'/'+MAX);
        const controls=el('div','sb-community-fav-row-controls');
        const up=el('button','outline-btn mini','↑ Subir');
        const down=el('button','outline-btn mini','↓ Bajar');
        const remove=el('button','outline-btn mini sb-community-fav-remove','Quitar');
        for(const btn of [up,down,remove])btn.type='button';
        up.disabled=disabled||index===0;
        down.disabled=disabled||index===selected.length-1;
        remove.disabled=disabled;
        up.setAttribute('aria-label','Subir '+item.title);
        down.setAttribute('aria-label','Bajar '+item.title);
        remove.setAttribute('aria-label','Quitar '+item.title+' del escaparate');
        up.addEventListener('click',()=>{
          const next=selected.slice();
          [next[index-1],next[index]]=[next[index],next[index-1]];
          void save(next,'Orden actualizado.');
        });
        down.addEventListener('click',()=>{
          const next=selected.slice();
          [next[index+1],next[index]]=[next[index],next[index+1]];
          void save(next,'Orden actualizado.');
        });
        remove.addEventListener('click',()=>{
          void save(selected.filter(k=>k!==key),'Insignia quitada. El logro sigue desbloqueado.');
        });
        const frameLabel=el('label','sb-community-fav-frame-label');
        frameLabel.append(el('span',null,'✨ Marco'));
        const select=el('select','sb-community-fav-frame-select');
        select.setAttribute('aria-label','Marco animado de '+item.title);
        select.disabled=busy;
        for(const [value,label] of FRAMES){
          const option=el('option',null,label);
          option.value=value;
          select.append(option);
        }
        select.value=frame(frames.get(key));
        select.addEventListener('change',()=>void saveFrame(key,select.value));
        frameLabel.append(select);
        const palette=el('div','sb-community-fav-color-controls');
        const current=colors.get(key);
        const base=defaultColors(frame(frames.get(key)));
        const main=newColorField('🎨 Principal',current?.primary||base.primary);
        const glow=newColorField('✨ Brillo',current?.glow||base.glow);
        const apply=el('button','outline-btn mini sb-community-fav-save-colors','Guardar colores');
        apply.type='button';
        apply.disabled=busy;
        const reset=el('button','outline-btn mini sb-community-fav-reset-colors','Restablecer');
        reset.type='button';
        reset.disabled=busy;
        palette.append(main.wrap,glow.wrap,apply,reset);
        const repaint=()=>paintColors(icon,{primary:main.input.value,glow:glow.input.value},frame(select.value),true);
        main.input.addEventListener('input',repaint);
        glow.input.addEventListener('input',repaint);
        select.addEventListener('change',()=>{
          const baseColors=defaultColors(frame(select.value));
          if(!colors.get(key)){
            main.input.value=baseColors.primary;
            glow.input.value=baseColors.glow;
          }
          repaint();
        });
        apply.addEventListener('click',()=>void saveColors(key,main.input.value,glow.input.value));
        reset.addEventListener('click',()=>void saveColors(key,null,null));
        controls.append(up,down,remove);
        row.append(rank,icon,text,frameLabel,palette,controls);
        ui.selectedBox.append(row);
      });

      const options=unlocked.filter(key=>catalog.has(key)&&!selectedSet.has(key));
      if(!options.length){
        ui.availableBox.append(el('p','sb-community-fav-empty',
          unlocked.length===0
            ?'Todavía no has desbloqueado insignias de reacciones. Reacciona a publicaciones de otros miembros para ganar la primera.'
            :'Ya has seleccionado todas tus insignias desbloqueadas.'));
      }
      for(const key of options){
        const item=catalog.get(key);
        const row=el('div','sb-community-fav-row');
        const icon=el('span','sb-community-fav-row-emoji sb-community-fav-style-anime',item.emoji);
        icon.setAttribute('aria-hidden','true');
        const text=el('span','sb-community-fav-row-title',item.title);
        const frameLabel=el('label','sb-community-fav-frame-label sb-community-fav-available-frame');
        frameLabel.append(el('span',null,'✨ Marco'));
        const frameSelect=el('select','sb-community-fav-frame-select');
        frameSelect.setAttribute('aria-label','Elegir marco antes de destacar '+item.title);
        frameSelect.disabled=busy||selected.length>=MAX;
        for(const [value,label] of FRAMES){
          const option=el('option',null,label);
          option.value=value;
          frameSelect.append(option);
        }
        const palette=el('div','sb-community-fav-color-controls');
        const main=newColorField('🎨 Principal',DEFAULT_COLORS.anime.primary);
        const glow=newColorField('✨ Brillo',DEFAULT_COLORS.anime.glow);
        palette.append(main.wrap,glow.wrap);
        const repaint=()=>{
          const style=frame(frameSelect.value);
          icon.className='sb-community-fav-row-emoji sb-community-fav-style-'+style;
          paintColors(icon,{primary:main.input.value,glow:glow.input.value},style,true);
        };
        frameSelect.addEventListener('change',()=>{
          const defaults=defaultColors(frame(frameSelect.value));
          main.input.value=defaults.primary;
          glow.input.value=defaults.glow;
          repaint();
        });
        main.input.addEventListener('input',repaint);
        glow.input.addEventListener('input',repaint);
        frameLabel.append(frameSelect);
        const add=el('button','gradient-btn mini','+ Destacar');
        add.type='button';
        add.disabled=busy||selected.length>=MAX;
        add.setAttribute('aria-label','Destacar '+item.title);
        add.addEventListener('click',()=>{
          void save([...selected,key],'Insignia destacada correctamente.',{
            key,style:frame(frameSelect.value),primary:main.input.value,glow:glow.input.value
          });
        });
        row.append(icon,text,frameLabel,palette,add);
        ui.availableBox.append(row);
      }
    }

    async function load(){
      if(!active() || busy)return;
      const ticket=++seq;
      ui.reload.disabled=true;
      ui.status.textContent='Cargando tus insignias…';
      try{
        const {data:auth,error:authError}=await api().auth.getUser();
        if(authError||!auth?.user?.id)throw Error('Inicia sesión para gestionar tus insignias.');
        const uid=auth.user.id;
        const [catRes,ownedRes,selectedRes,motion]=await Promise.all([
          api().from(CATALOG).select('badge_key,emoji,title,target_posts').order('sort_order'),
          api().from(BADGES).select('badge_key').eq('user_id',uid),
          api().from(TABLE).select('badge_key,position,frame_style,frame_primary_color,frame_glow_color').eq('user_id',uid).order('position'),
          allowsAnimation(uid)
        ]);
        if([catRes,ownedRes,selectedRes].some(r=>r.error))
          throw [catRes,ownedRes,selectedRes].find(r=>r.error).error;
        if(!active()||ticket!==seq || !(await sameSession(uid)))return;
        ownerId=uid;
        ui.publicLink.href='#/perfil?id='+encodeURIComponent(uid);
        catalog=new Map((catRes.data||[]).map(item=>[item.badge_key,item]));
        unlocked=(ownedRes.data||[]).map(item=>item.badge_key).filter(k=>catalog.has(k));
        const valid=new Set(unlocked);
        selected=(selectedRes.data||[]).map(item=>item.badge_key)
          .filter(k=>valid.has(k)).slice(0,MAX);
        frames=new Map((selectedRes.data||[]).map(item=>[item.badge_key,frame(item.frame_style)]));
        colors=new Map((selectedRes.data||[]).map(item=>[item.badge_key,readColors(item)]));
        animationsEnabled=motion;
        loaded=true;
        lastLoaded=Date.now();
        draw();
        ui.status.textContent=selected.length+' de '+MAX+' plazas ocupadas · '+
          unlocked.length+' insignias desbloqueadas disponibles.';
      }catch(error){
        console.warn('Escaparate de reacciones comunitarias:',error);
        if(active()&&ticket===seq){
          ui.status.textContent=String(error?.message||'Error al cargar el escaparate.');
        }
      }finally{
        if(active()&&ticket===seq)ui.reload.disabled=false;
      }
    }

    async function save(next,message,newFrame){
      if(!active()||!loaded||busy||!ownerId)return;
      if(next.length>MAX||new Set(next).size!==next.length
          ||next.some(key=>!unlocked.includes(key)))return;
      busy=true;
      ui.reload.disabled=true;
      ui.status.textContent='Guardando escaparate…';
      draw();
      try{
        const {data:auth,error:authError}=await api().auth.getUser();
        if(authError||auth?.user?.id!==ownerId)throw Error('Sesión cambiada. Recarga tu perfil.');
        const {data,error}=await api().rpc('set_my_community_reaction_showcase',{
          p_badge_keys:next
        });
        if(error)throw error;
        if(data!==true)throw Error('Supabase no confirmó el guardado.');
        if(!active())return;
        selected=next.slice();
        frames=new Map([...frames].filter(([key])=>selected.includes(key)));
        colors=new Map([...colors].filter(([key])=>selected.includes(key)));
        for(const key of selected)if(!frames.has(key))frames.set(key,'anime');
        let styleWarning='';
        if(newFrame && selected.includes(newFrame.key)){
          const {data:savedStyle,error:styleError}=await api().rpc(
            'set_my_community_reaction_badge_frame',{
              p_badge_key:newFrame.key,p_frame_style:frame(newFrame.style)
            });
          if(styleError || savedStyle!==true){
            styleWarning=' La insignia se destacó, pero el marco no se guardó. Puedes elegirlo desde «Mis insignias destacadas».';
          }else{
            frames.set(newFrame.key,frame(newFrame.style));
          }
          if(isHex(newFrame.primary)&&isHex(newFrame.glow)){
            const {data:colorSaved,error:colorError}=await api().rpc(
              'set_my_community_reaction_badge_colors',{
                p_badge_key:newFrame.key,
                p_primary_color:newFrame.primary,
                p_glow_color:newFrame.glow
              });
            if(colorError||colorSaved!==true){
              styleWarning+=' Los colores no se guardaron; puedes volver a intentarlo.';
            }else{
              colors.set(newFrame.key,{primary:newFrame.primary,glow:newFrame.glow});
            }
          }
        }
        if(!active())return;
        ui.status.textContent=message+styleWarning;
        window.dispatchEvent(new Event('sb-community-reaction-showcase-updated'));
      }catch(error){
        console.warn('Guardado de escaparate comunitario:',error);
        if(active())ui.status.textContent='No se pudieron guardar los cambios: '+
          String(error?.message||'Error desconocido');
      }finally{
        busy=false;
        if(active()){ui.reload.disabled=false;draw();}
      }
    }

    async function saveColors(key,primary,glow){
      if(!active()||!loaded||busy||!ownerId||!selected.includes(key))return;
      if((primary!==null&&!isHex(primary))||(glow!==null&&!isHex(glow)))return;
      busy=true;
      ui.reload.disabled=true;
      ui.status.textContent='Guardando colores del marco…';
      draw();
      try{
        const {data:auth,error:authError}=await api().auth.getUser();
        if(authError||auth?.user?.id!==ownerId)throw Error('Sesión cambiada. Recarga tu perfil.');
        const {data,error}=await api().rpc('set_my_community_reaction_badge_colors',{
          p_badge_key:key,p_primary_color:primary,p_glow_color:glow
        });
        if(error)throw error;
        if(data!==true)throw Error('No se confirmó el cambio de colores.');
        if(!active())return;
        colors.set(key,primary||glow?{primary,glow}:null);
        ui.status.textContent=primary||glow?'🎨 Colores guardados correctamente.':'🎨 Colores originales restaurados.';
        window.dispatchEvent(new Event('sb-community-reaction-showcase-updated'));
      }catch(error){
        console.warn('Colores del marco de insignia:',error);
        if(active())ui.status.textContent='No se pudieron guardar los colores: '+
          String(error?.message||'Error desconocido');
      }finally{
        busy=false;
        if(active()){ui.reload.disabled=false;draw();}
      }
    }

    async function saveFrame(key,chosen){
      const style=frame(chosen);
      if(!active()||!loaded||busy||!ownerId||!selected.includes(key))return;
      busy=true;
      ui.reload.disabled=true;
      ui.status.textContent='Guardando marco de insignia…';
      draw();
      try{
        const {data:auth,error:authError}=await api().auth.getUser();
        if(authError||auth?.user?.id!==ownerId)
          throw Error('Sesión cambiada. Recarga el perfil.');
        const {data,error}=await api().rpc('set_my_community_reaction_badge_frame',{
          p_badge_key:key,p_frame_style:style
        });
        if(error)throw error;
        if(data!==true)throw Error('No se confirmó el cambio de marco.');
        if(!active())return;
        frames.set(key,style);
        ui.status.textContent='✨ Marco '+(FRAMES.find(([value])=>value===style)?.[1]||'Anime')+
          ' aplicado a '+(catalog.get(key)?.title||'insignia')+'.';
        window.dispatchEvent(new Event('sb-community-reaction-showcase-updated'));
      }catch(error){
        console.warn('Marco de insignia:',error);
        if(active())ui.status.textContent='No se pudo guardar el marco: '+
          String(error?.message||'Error desconocido');
      }finally{
        busy=false;
        if(active()){ui.reload.disabled=false;draw();}
      }
    }

    ui.reload.addEventListener('click',()=>void load());
    if(isAccount){
      ui.panel.addEventListener('toggle',()=>{
        if(ui.panel.open && (!loaded||Date.now()-lastLoaded>20000))void load();
      });
    }else void load();
    window.addEventListener('sb-community-reaction-badge-unlocked',()=>{
      if(active() && (!isAccount||ui.panel.open))void load();
      else loaded=false;
    });
    window.addEventListener('focus',()=>{
      if(active() && loaded && (!isAccount||ui.panel.open)
          && Date.now()-lastLoaded>30000)void load();
    });
    window.addEventListener('sb-community-reaction-frame-gallery-applied',()=>{
      if(active() && (!isAccount||ui.panel.open))void load();
    });
  }

  function mountStrip(route){
    const own=route==='#/cuenta';
    const root=document.getElementById(own?'account-profile':'public-member-profile');
    if(!root)return;
    const identity=root.querySelector('.sbp-identity-card');
    const heading=identity?.querySelector('.sbp-identity-text h2');
    if(!identity||!heading)return;
    let strip=identity.querySelector('.sb-community-fav-identity-strip');
    const id=own?null:new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    if(!own && !UUID.test(String(id||'')))return;
    if(strip){
      if(own||strip.dataset.member===id)return;
      strip.remove();
    }
    strip=el('div','sb-community-fav-identity-strip');
    strip.hidden=true;
    strip.setAttribute('aria-label','Escaparate de insignias favoritas de la comunidad');
    if(!own)strip.dataset.member=id;
    const gamerStrip=identity.querySelector('.sbv-identity-showcase');
    if(gamerStrip)gamerStrip.after(strip);
    else heading.after(strip);

    const active=()=>strip.isConnected&&visible(route) &&
      (own||new URLSearchParams(location.hash.split('?')[1]||'').get('id')===id);
    let seq=0;
    async function load(){
      const ticket=++seq;
      try{
        const resultId=own
          ?(await api().auth.getUser()).data?.user?.id
          :id;
        if(!UUID.test(String(resultId||'')))return;
        const [catalogResult,showcaseResult,viewerResult]=await Promise.all([
          api().from(CATALOG).select('badge_key,title,emoji'),
          api().from(TABLE).select('badge_key,position,frame_style,frame_primary_color,frame_glow_color').eq('user_id',resultId).order('position'),
          api().auth.getUser()
        ]);
        if(catalogResult.error||showcaseResult.error)
          throw catalogResult.error||showcaseResult.error;
        if(!active()||ticket!==seq)return;
        if(own && !(await sameSession(resultId)))return;
        const catalog=new Map((catalogResult.data||[]).map(item=>[item.badge_key,item]));
        const selected=(showcaseResult.data||[]).map(item=>item.badge_key);
        const styles=new Map((showcaseResult.data||[]).map(item=>[item.badge_key,frame(item.frame_style)]));
        const customColors=new Map((showcaseResult.data||[]).map(item=>[item.badge_key,readColors(item)]));
        const motion=await allowsAnimation(viewerResult.data?.user?.id);
        if(!active()||ticket!==seq)return;
        drawStrip(strip,selected,catalog,own,styles,customColors,motion);
      }catch(error){
        console.warn('Insignias favoritas en perfil:',error);
        if(active())strip.hidden=!own;
      }
    }
    window.addEventListener('sb-community-reaction-showcase-updated',()=>{
      if(active())void load();
    });
    window.addEventListener('focus',()=>{
      if(active())void load();
    });
    void load();
  }

  let scheduled=false;
  function scan(){
    if(visible('#/cuenta')){
      mountOwn('#/cuenta');
      mountStrip('#/cuenta');
    }
    if(visible('#/logros'))mountOwn('#/logros');
    if(visible('#/perfil'))mountStrip('#/perfil');
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;scan();});
  }
  function init(){
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{
      childList:true,subtree:true
    });
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
