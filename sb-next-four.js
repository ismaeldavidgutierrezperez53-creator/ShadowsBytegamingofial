/* Cuatro mejoras compatibles con los módulos existentes de Shadows Byte V2.
   Ajustes visuales y recientes se guardan localmente; no se modifican tablas ni RLS. */
(()=>{
 'use strict';
 const RECENTS_KEY='sb-main-recent-sections-v1';
 const AURA_KEY='sb-anime-card-aura-v1';
 const route=()=> (location.hash.slice(1)||'/').split('?')[0];
 const $=(root,query)=>root?.querySelector(query);
 const make=(tag,className,content)=>{
   const el=document.createElement(tag);
   if(className)el.className=className;
   if(content!==undefined)el.textContent=content;
   return el;
 };
 const nav=document.getElementById('nav');
 const allowed=new Map();
 nav?.querySelectorAll('.menu-column a[href^="#/"]').forEach(a=>{
   const path=a.getAttribute('href').slice(1);
   // No registrar rutas de cuenta, mensajería, notificaciones ni administración.
   if(!['/cuenta','/mensajes','/notificaciones','/admin','/no-molestar'].includes(path)){
     allowed.set(path,a.textContent.trim());
   }
 });
 let recent=[];
 try{
   const saved=JSON.parse(localStorage.getItem(RECENTS_KEY)||'[]');
   if(Array.isArray(saved))recent=saved.filter(x=>typeof x==='string'&&allowed.has(x)).slice(0,4);
 }catch(_){}
 function mountRecent(){
   const quick=$(nav,'.menu-quick-links');
   if(!quick)return;
   let wrapper=$(nav,'.sb-next-recents');
   if(!wrapper){
     wrapper=make('section','sb-next-recents');
     wrapper.setAttribute('aria-label','Secciones visitadas recientemente');
     wrapper.append(make('h3','','🕘 Visitados recientemente'));
     wrapper.append(make('div','sb-next-recent-links'));
     quick.after(wrapper);
   }
   const links=$(wrapper,'.sb-next-recent-links');
   if(!links)return;
   links.replaceChildren();
   wrapper.hidden=recent.length===0;
   for(const path of recent){
     const a=make('a','',allowed.get(path));
     a.href='#'+path;
     if(path===route())a.setAttribute('aria-current','page');
     links.append(a);
   }
 }
 function rememberRoute(){
   const path=route();
   if(allowed.has(path)){
     recent=[path,...recent.filter(x=>x!==path)].slice(0,4);
     try{localStorage.setItem(RECENTS_KEY,JSON.stringify(recent))}catch(_){}
   }
   mountRecent();
 }
 if(nav){
   addEventListener('hashchange',rememberRoute);
   rememberRoute();
 }

 let aura='off';
 try{if(localStorage.getItem(AURA_KEY)==='on')aura='on'}catch(_){}
 document.documentElement.dataset.sbAura=aura;
 function mountAura(){
   const panel=document.getElementById('sb-customize-panel');
   if(!panel||$(panel,'.sb-next-aura-setting'))return;
   const box=make('div','sb-next-aura-setting');
   const label=make('label','','🌌 Aura luminosa de tarjetas');
   const select=make('select');
   select.id='sb-next-aura';
   label.htmlFor=select.id;
   [['off','Desactivada'],['on','Activada · brillo violeta']].forEach(([value,label])=>{
     const option=make('option','',label);option.value=value;select.append(option);
   });
   select.value=aura;
   select.addEventListener('change',()=>{
     aura=select.value==='on'?'on':'off';
     document.documentElement.dataset.sbAura=aura;
     try{localStorage.setItem(AURA_KEY,aura)}catch(_){}
   });
   box.append(label,select,make('p','','Es decorativo y respeta el ajuste de reducir animaciones.'));
   const existing=$(panel,'.sb-energy-setting');
   if(existing)existing.after(box);else panel.append(box);
 }
 function mountBioCount(){
   const input=document.querySelector('#account-profile #profile-bio');
   if(!input||input.dataset.sbNextCount==='1')return;
   input.dataset.sbNextCount='1';
   const max=input.maxLength>0?input.maxLength:280;
   const counter=make('small','sb-next-bio-count');
   const id='sb-next-bio-counter';
   counter.id=id;
   // Mantener intactas otras descripciones del campo, si existen.
   input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+id).trim());
   const update=()=>{
     const n=Array.from(input.value).length;
     counter.textContent=n+' / '+max+' caracteres';
     counter.dataset.near=String(n>=max-35);
     counter.dataset.full=String(n>=max);
   };
   input.addEventListener('input',update);
   input.after(counter);
   update();
 }
 let sortObserver=null;
 let sortFeed=null;
 function mountSort(){
   const root=document.getElementById('community-feed');
   const feed=$(root,'.community-bookmark-feed');
   if(!feed)return;
   if(feed===sortFeed)return;
   sortObserver?.disconnect();
   sortFeed=feed;
   const toolbar=make('div','sb-next-sort');
   const label=make('label','','Ordenar publicaciones:');
   const select=make('select');
   select.id='sb-next-post-order';label.htmlFor=select.id;
   [['new','Más recientes primero'],['old','Más antiguas primero']].forEach(([val,txt])=>{
     const option=make('option','',txt);option.value=val;select.append(option);
   });
   toolbar.append(label,select);
   feed.before(toolbar);
   const dateValue=post=>{
     const text=$(post,'small')?.textContent||'';
     const m=text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
     if(!m)return Number.NaN;
     return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0)).getTime();
   };
   const apply=()=>{
     if(!feed.isConnected)return;
     const posts=[...feed.children].filter(el=>el.classList.contains('social-post'));
     if(posts.length<2)return;
     const sorted=posts.map((el,index)=>({el,index,time:dateValue(el)}))
       .sort((a,b)=>{
         if(Number.isFinite(a.time)&&Number.isFinite(b.time)&&a.time!==b.time){
           return select.value==='old'?a.time-b.time:b.time-a.time;
         }
         return a.index-b.index;
       }).map(x=>x.el);
     if(posts.every((el,i)=>el===sorted[i]))return;
     for(const post of sorted)feed.append(post);
   };
   select.addEventListener('change',apply);
   sortObserver=new MutationObserver(apply);
   sortObserver.observe(feed,{childList:true});
   apply();
 }
 let queued=false;
 function scan(){
   queued=false;
   mountAura();
   mountBioCount();
   if(sortFeed&&!sortFeed.isConnected){
     sortObserver?.disconnect();
     sortObserver=null;
     sortFeed=null;
   }
   mountSort();
 }
 function schedule(){
   if(queued)return;
   queued=true;
   requestAnimationFrame(scan);
 }
 function init(){
   const app=document.getElementById('app');
   if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
   const custom=document.getElementById('sb-customize-panel');
   if(custom)new MutationObserver(schedule).observe(custom,{childList:true,subtree:true});
   addEventListener('hashchange',schedule);
   schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
