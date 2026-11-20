/* Shadows Byte V2 — efectos, biografía, animación y buscador del muro.
   No altera puntos, recompensas, permisos de Supabase ni publicaciones. */
(() => {
  'use strict';
  const ENERGY_KEY='sb-anime-energy-v1';
  const html=document.documentElement;
  const options=['soft','normal','intense'];
  let energy='normal';
  try{
    const saved=localStorage.getItem(ENERGY_KEY);
    if(options.includes(saved))energy=saved;
  }catch(_){}
  html.dataset.sbEnergy=energy;

  function make(tag,className,text){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function attachEnergyControl(){
    const panel=document.querySelector('#sb-customize-panel');
    if(!panel||panel.querySelector('.sb-energy-setting'))return;
    const box=make('div','sb-energy-setting');
    const label=make('label','','✨ Intensidad de los efectos anime');
    label.htmlFor='sb-energy-choice';
    const select=make('select');
    select.id='sb-energy-choice';
    for(const [value,name] of [['soft','Suave · menos brillo'],['normal','Normal · equilibrado'],['intense','Intenso · más neón']]){
      const opt=make('option','',name);opt.value=value;select.append(opt);
    }
    select.value=energy;
    const hint=make('p','','Ajuste visual de este navegador. Respeta «Animaciones: Desactivadas».');
    select.addEventListener('change',()=>{
      energy=options.includes(select.value)?select.value:'normal';
      html.dataset.sbEnergy=energy;
      try{localStorage.setItem(ENERGY_KEY,energy)}catch(_){}
    });
    box.append(label,select,hint);
    const title=panel.querySelector('h2');
    if(title)title.after(box);else panel.prepend(box);
  }

  const bioTemplates={
    otaku:form=>{
      const anime=form.querySelector('#profile-favorite-anime')?.value.trim()||'mis series favoritas';
      const character=form.querySelector('#profile-favorite-character')?.value.trim()||'los personajes inolvidables';
      return '🌸 Fan del anime: me encanta '+anime+' y disfruto hablando de '+character+'. ¡Compartamos recomendaciones!';
    },
    gamer:form=>{
      const games=form.querySelector('#profile-favorite-games')?.value.trim().split(',')[0].trim()||'los videojuegos';
      return '🎮 Gamer en Shadows Byte. Disfruto de '+games+', descubrir nuevos mundos y conocer compañeros de juego. ¡Nos vemos en la comunidad!';
    },
    mixed:form=>'✨ Bienvenidos a mi rincón otaku y gamer. Me gustan el anime, el manga y los videojuegos. Aquí comparto mis favoritos y descubro nuevas aventuras.'
  };
  function attachProfileTemplates(){
    const form=document.querySelector('#account-profile #profile-form');
    const bio=form?.querySelector('#profile-bio');
    if(!form||!bio||form.querySelector('.sb-bio-templates'))return;
    const section=make('section','sb-bio-templates');
    section.setAttribute('aria-label','Plantillas para mi presentación');
    section.append(make('h4','','🎴 Plantillas rápidas para tu presentación'));
    section.append(make('p','','Elige una idea, edítala como quieras y después pulsa «Guardar cambios» en tu perfil.'));
    const actions=make('div','sb-bio-template-actions');
    const status=make('small');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    for(const [type,label] of [['otaku','🌸 Otaku'],['gamer','🎮 Gamer'],['mixed','✨ Mixto']]){
      const button=make('button','',label);button.type='button';
      button.addEventListener('click',()=>{
        if(bio.value.trim()&&!confirm('¿Sustituir la presentación que has escrito? Puedes cancelar para conservarla.'))return;
        const next=bioTemplates[type](form).slice(0,280);
        bio.value=next;
        bio.dispatchEvent(new Event('input',{bubbles:true}));
        bio.dispatchEvent(new Event('change',{bubbles:true}));
        status.textContent='✓ Presentación preparada. Revisa el texto y pulsa Guardar cambios.';
        bio.focus();
      });
      actions.append(button);
    }
    section.append(actions,status);bio.after(section);
  }

  let observer=null;
  function attachCommunityFilters(){
    const root=document.querySelector('#community-feed');
    const feed=root?.querySelector('.community-bookmark-feed');
    if(!root||!feed||root.querySelector('.sb-community-filters'))return;
    const box=make('div','sb-community-filters');
    const input=make('input');input.type='search';input.placeholder='Buscar autor o publicación…';
    input.setAttribute('aria-label','Buscar en las publicaciones cargadas');
    const imageLabel=make('label','sb-community-filter-images');
    const imageOnly=make('input');imageOnly.type='checkbox';
    imageLabel.append(imageOnly,document.createTextNode(' Solo imágenes'));
    const clear=make('button','','Limpiar');clear.type='button';
    const count=make('p','sb-community-filter-count');
    count.setAttribute('role','status');count.setAttribute('aria-live','polite');
    const empty=make('p','sb-community-no-results');
    empty.textContent='No hay publicaciones que coincidan con estos filtros.';
    empty.hidden=true;
    box.append(input,imageLabel,clear,count);
    feed.before(box);feed.after(empty);
    const filter=()=>{
      if(!feed.isConnected)return;
      const term=input.value.trim().toLocaleLowerCase('es');
      let total=0,visible=0;
      for(const post of feed.querySelectorAll('.social-post')){
        total++;
        const content=(post.querySelector('.feed-author')?.textContent||'')+' '+(post.querySelector('.social-post-body')?.textContent||'');
        const matches=content.toLocaleLowerCase('es').includes(term)&&(!imageOnly.checked||!!post.querySelector('.social-post-image'));
        post.hidden=!matches;
        if(matches)visible++;
      }
      count.textContent=total?visible+' de '+total+' publicaciones cargadas':'No hay publicaciones cargadas para filtrar.';
      empty.hidden=visible>0||total===0;
    };
    input.addEventListener('input',filter);
    imageOnly.addEventListener('change',filter);
    clear.addEventListener('click',()=>{input.value='';imageOnly.checked=false;filter();input.focus();});
    observer?.disconnect();
    observer=new MutationObserver(filter);
    observer.observe(feed,{childList:true});
    filter();
  }

  let scheduled=false;
  function scan(){
    scheduled=false;
    attachEnergyControl();
    attachProfileTemplates();
    attachCommunityFilters();
    if(observer&&!document.querySelector('#community-feed .sb-community-filters')){
      observer.disconnect();observer=null;
    }
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(scan);
  }
  function init(){
    const app=document.getElementById('app');
    if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    const customize=document.getElementById('sb-customize-panel');
    if(customize)new MutationObserver(schedule).observe(customize,{childList:true,subtree:true});
    addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
