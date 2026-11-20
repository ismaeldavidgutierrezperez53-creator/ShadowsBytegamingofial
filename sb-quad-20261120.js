/* Shadows Byte V2: four small independent UI enhancements.
   No modification of Supabase permissions, profile data, or stored posts. */
(()=>{
  'use strict';
  const $=(root,selector)=>root?.querySelector(selector);
  const make=(tag,cls,text)=>{
    const element=document.createElement(tag);
    if(cls)element.className=cls;
    if(text!==undefined)element.textContent=text;
    return element;
  };
  /* Filter only menu sections. Account actions and page search stay intact. */
  function setupMenuSearch(){
    const nav=document.getElementById('nav');
    const heading=$(nav,'.menu-head');
    if(!nav||!heading||$(nav,'.sb-menu-filter'))return;
    const panel=make('div','sb-menu-filter');
    const label=make('label','','🔎 Buscar apartado del menú');
    const input=make('input');
    input.type='search';input.id='sb-menu-section-query';label.htmlFor=input.id;
    input.placeholder='Anime, noticias, mensajes…';
    input.setAttribute('autocomplete','off');
    const output=make('p','sb-menu-filter-output');
    output.setAttribute('aria-live','polite');
    panel.append(label,input,output);
    heading.after(panel);
    const columns=[...nav.querySelectorAll('.menu-links-grid .menu-column')];
    const normalize=text=>(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
    const update=()=>{
      const q=normalize(input.value.trim());
      let matches=0;
      for(const column of columns){
        let visible=0;
        for(const link of column.querySelectorAll('a[href]')){
          const match=!q||normalize(link.textContent).includes(q);
          link.hidden=!match;
          if(match){visible++;matches++;}
        }
        column.hidden=!!q&&visible===0;
      }
      nav.classList.toggle('sb-menu-searching',!!q);
      output.textContent=q?(matches?matches+' apartados encontrados':'Ningún apartado coincide con la búsqueda.'):'Escribe para encontrar una sección rápidamente.';
    };
    input.addEventListener('input',update);
    input.addEventListener('keydown',event=>{
      if(event.key!=='Enter')return;
      const first=nav.querySelector('.menu-column a[href]:not([hidden])');
      if(first&&input.value.trim()){event.preventDefault();first.click();}
    });
    nav.addEventListener('click',event=>{
      if(event.target.closest('a[href]')){input.value='';update();}
    });
    const toggle=document.getElementById('menuToggle');
    if(toggle){
      new MutationObserver(()=>{
        if(toggle.getAttribute('aria-expanded')==='false'&&input.value){
          input.value='';update();
        }
      }).observe(toggle,{attributes:true,attributeFilter:['aria-expanded']});
    }
    update();
  }

  /* Indicate edits without autosaving or changing server-side save flow. */
  let trackedForm=null;
  function setupProfileUnsaved(){
    const form=document.querySelector('#account-profile #profile-form');
    if(!form||form===trackedForm||!$(form,'#profile-bio'))return;
    trackedForm=form;
    const status=$(form,'#profile-message');
    const submit=$(form,'button[type=submit]');
    if(!status||!submit)return;
    const indicator=make('p','sb-profile-unsaved');
    indicator.setAttribute('role','status');
    indicator.setAttribute('aria-live','polite');
    submit.before(indicator);
    const fingerprint=()=>JSON.stringify([...form.querySelectorAll('input,textarea,select')]
      .filter(node=>!node.disabled)
      .map(node=>[node.id||node.name||'',node.type==='checkbox'||node.type==='radio'?node.checked:node.value]));
    let committed=fingerprint();
    let pendingSave=null;
    const render=()=>{
      const changed=fingerprint()!==committed;
      const saving=status.textContent.trim()==='Guardando…';
      indicator.dataset.dirty=String(changed);
      indicator.dataset.saving=String(saving);
      indicator.textContent=saving?'⏳ Guardando los cambios del perfil…':
        changed?'⚠ Tienes cambios sin guardar. Pulsa «Guardar cambios».':
        '✓ No hay cambios pendientes en tu perfil.';
    };
    form.addEventListener('input',render);
    form.addEventListener('change',render);
    form.addEventListener('submit',()=>{
      pendingSave=fingerprint();
      queueMicrotask(render);
    });
    new MutationObserver(()=>{
      const message=status.textContent.trim();
      if(message.startsWith('Perfil público guardado.')||message.startsWith('Perfil guardado como privado.')){
        if(pendingSave!==null)committed=pendingSave;
        pendingSave=null;
      }else if(message!=='Guardando…'&&message){
        pendingSave=null;
      }
      render();
    }).observe(status,{childList:true,characterData:true,subtree:true});
    render();
  }

  /* Show full text on request, preserving original content and search matching. */
  let currentFeed=null,feedObserver=null;
  function enhanceFeed(){
    const feed=document.querySelector('#community-feed .community-bookmark-feed');
    if(!feed)return;
    if(feed!==currentFeed){
      feedObserver?.disconnect();
      currentFeed=feed;
      feedObserver=new MutationObserver(enhanceFeed);
      feedObserver.observe(feed,{childList:true});
    }
    for(const article of feed.querySelectorAll('.social-post')){
      const body=$(article,'.social-post-body');
      if(!body||body.dataset.sbExpandable==='1'||body.textContent.length<=310)continue;
      body.dataset.sbExpandable='1';
      body.classList.add('sb-post-collapsed');
      const button=make('button','sb-post-more','Leer publicación completa');
      button.type='button';button.setAttribute('aria-expanded','false');
      button.addEventListener('click',()=>{
        const expanded=button.getAttribute('aria-expanded')==='true';
        body.classList.toggle('sb-post-collapsed',expanded);
        button.setAttribute('aria-expanded',String(!expanded));
        button.textContent=expanded?'Leer publicación completa':'Mostrar menos';
      });
      body.after(button);
    }
  }

  /* Optional reading-friendly typography stored only on this device. */
  const readingKey='sb-reading-mode-v1';
  let reading='off';
  try{if(localStorage.getItem(readingKey)==='on')reading='on'}catch(_){}
  document.documentElement.dataset.sbReading=reading;
  function setupReadingMode(){
    const panel=document.getElementById('sb-customize-panel');
    if(!panel||$(panel,'.sb-reading-setting'))return;
    const wrapper=make('div','sb-reading-setting');
    const label=make('label','','📖 Modo lectura');
    const select=make('select');
    select.id='sb-reading-choice';label.htmlFor=select.id;
    for(const [value,text] of [['off','Normal · diseño anime'],['on','Lectura cómoda · texto más claro']]){
      const option=make('option','',text);
      option.value=value;select.append(option);
    }
    select.value=reading;
    select.addEventListener('change',()=>{
      reading=select.value==='on'?'on':'off';
      document.documentElement.dataset.sbReading=reading;
      try{localStorage.setItem(readingKey,reading)}catch(_){}
    });
    wrapper.append(label,select,make('p','','Aumenta la comodidad del texto y reduce los elementos decorativos sin cambiar tu tema.'));
    const existing=$(panel,'.sb-next-aura-setting');
    if(existing)existing.after(wrapper);else panel.append(wrapper);
  }

  let queued=false;
  function scan(){
    queued=false;
    setupMenuSearch();
    setupProfileUnsaved();
    if(currentFeed&&!currentFeed.isConnected){
      feedObserver?.disconnect();
      currentFeed=null;
      feedObserver=null;
    }
    enhanceFeed();
    setupReadingMode();
  }
  function queueScan(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(scan);
  }
  function init(){
    const app=document.getElementById('app');
    if(app)new MutationObserver(queueScan).observe(app,{subtree:true,childList:true});
    const panel=document.getElementById('sb-customize-panel');
    if(panel)new MutationObserver(queueScan).observe(panel,{subtree:true,childList:true});
    window.addEventListener('hashchange',queueScan);
    queueScan();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
