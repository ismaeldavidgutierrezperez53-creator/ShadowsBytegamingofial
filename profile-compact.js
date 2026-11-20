/* Shadows Byte Gaming V2 — vista compacta accesible de módulos. */
(()=>{
 'use strict';
 const KEY='sb-profile-compact-v1';
 const modules=[
  '.sb-showcase','.sbg-stats','.sba-timeline','.sbc-connections',
  '.sbr-goals','.sbs-challenges','.sbd-discovery','.sbaf-panel'
 ];
 let compact=false;
 try{compact=localStorage.getItem(KEY)==='yes'}catch(_){}
 const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
 const getSections=host=>modules.flatMap(sel=>[...host.querySelectorAll(sel)]).filter(x=>x.querySelector('h2'));
 const setCollapsed=(section,collapse)=>{
  section.classList.toggle('sb-collapse-closed',collapse);
  const btn=section.querySelector(':scope > .sb-collapse-toggle');
  if(btn){btn.textContent=collapse?'Mostrar contenido':'Ocultar contenido';btn.setAttribute('aria-expanded',String(!collapse))}
 };
 function mount(host){
  const nav=host.querySelector('.sb-nav-panel');
  if(!nav)return;
  let controller=nav.querySelector('.sb-compact-control');
  if(!controller){
   controller=make('div','sb-compact-control');
   const label=make('span','sb-compact-text','Organizar apartados');
   const toggle=make('button','sb-compact-button');
   toggle.type='button';
   const all=make('button','sb-compact-button sb-compact-open','Mostrar todo');
   all.type='button';
   toggle.onclick=()=>{
    compact=!compact;
    try{localStorage.setItem(KEY,compact?'yes':'no')}catch(_){}
    for(const section of document.querySelectorAll('#account-profile .sb-collapse-section,#public-member-profile .sb-collapse-section'))setCollapsed(section,compact);
    updateButtons();
   };
   all.onclick=()=>{
    compact=false;
    try{localStorage.setItem(KEY,'no')}catch(_){}
    for(const section of document.querySelectorAll('#account-profile .sb-collapse-section,#public-member-profile .sb-collapse-section'))setCollapsed(section,false);
    updateButtons();
   };
   controller.append(label,toggle,all);
   nav.append(controller);
  }
  const sections=getSections(host);
  for(const section of sections){
   if(section.classList.contains('sb-collapse-section'))continue;
   const h=section.querySelector('h2');
   if(!h)continue;
   section.classList.add('sb-collapse-section');
   const button=make('button','sb-collapse-toggle');
   button.type='button';
   button.addEventListener('click',()=>setCollapsed(section,!section.classList.contains('sb-collapse-closed')));
   h.after(button);
   section.addEventListener('sb:profile-expand',()=>setCollapsed(section,false));
   setCollapsed(section,compact);
  }
  updateButtons();
 }
 function updateButtons(){
  for(const control of document.querySelectorAll('.sb-compact-control')){
   const btn=control.querySelector('.sb-compact-button');
   if(btn){btn.textContent=compact?'Desactivar vista compacta':'Activar vista compacta';btn.setAttribute('aria-pressed',String(compact))}
  }
 }
 let pending=false;
 function scan(){
  pending=false;
  const account=document.getElementById('account-profile');
  if(account?.querySelector('.sb-nav-panel'))mount(account);
  const publicRoot=document.getElementById('public-member-profile');
  if(publicRoot?.querySelector('.sb-nav-panel'))mount(publicRoot);
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(scan)}}
 function init(){
  const root=document.getElementById('app');if(!root)return;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  addEventListener('hashchange',schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
