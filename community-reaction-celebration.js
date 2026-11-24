/* Celebración accesible, una sola vez, para insignias comunitarias recién desbloqueadas. */
(() => {
  'use strict';
  const RPC='claim_my_community_reaction_badge_celebration';
  const VALID=/^[a-z][a-z0-9_]{0,64}$/;
  const make=(tag,cls,label)=>{
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(label!==undefined) node.textContent=label;
    return node;
  };
  const client=()=>typeof sb!=='undefined'?sb:null;
  let busy=false;
  let showing=false;
  let lastUid='';
  let currentDialog=null;
  let lastCheck=0;
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function preferenceAllowsMotion(){
    const api=client();
    if(!api) return !reducedMotion();
    try {
      const {data,error}=await api.from('member_notification_preferences')
        .select('notification_animations_enabled').eq('user_id',lastUid).maybeSingle();
      if(error) throw error;
      return !reducedMotion() && data?.notification_animations_enabled!==false;
    } catch(error) {
      console.warn('Preferencias de celebración comunitaria:',error);
      return !reducedMotion();
    }
  }

  function renderCelebration(entry,motionEnabled=true,preview=false){
    if(showing || !document.body) return;
    showing=true;
    const emoji=String(entry?.emoji||'🏅').slice(0,8);
    const title=String(entry?.title||'Nueva insignia').slice(0,80);
    const overlay=make('div','sb-community-badge-celebration-backdrop');
    const dialog=make('section','sb-community-badge-celebration');
    if(!motionEnabled) overlay.classList.add('sb-community-badge-celebration-static');
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-label','Nueva insignia desbloqueada');
    const previousFocus=document.activeElement;
    const close=make('button','sb-community-badge-celebration-close','✕');
    close.type='button';
    close.setAttribute('aria-label','Cerrar celebración');
    const glow=make('div','sb-community-badge-celebration-medal',emoji);
    glow.setAttribute('aria-hidden','true');
    const heading=make('h2',null,preview?'🎊 Vista previa de celebración':'🎊 ¡Insignia desbloqueada!');
    const name=make('strong','sb-community-badge-celebration-name',title);
    const description=make('p',null,preview
      ? 'Así aparecerá una celebración al conseguir una insignia real.'
      : '¡Enhorabuena! Tus reacciones en la comunidad tienen recompensa.');
    const actions=make('div','sb-community-badge-celebration-actions');
    const view=make('a','gradient-btn mini','🏆 Ver mis logros');
    view.href='#/logros';
    const dismiss=make('button','outline-btn mini','Continuar');
    dismiss.type='button';
    actions.append(view,dismiss);
    dialog.append(close,glow,heading,name,description,actions);
    if(motionEnabled){
      const confetti=make('div','sb-community-badge-confetti');
      confetti.setAttribute('aria-hidden','true');
      const colors=['#e9b7ff','#ffcf79','#ff8ab6','#8dc7ff','#b1ffca'];
      for(let n=0;n<22;n++){
        const particle=make('span','sb-community-badge-confetti-piece');
        particle.style.left=(3+(n*37)%95)+'%';
        particle.style.backgroundColor=colors[n%colors.length];
        particle.style.animationDelay=(n%7*0.11)+'s';
        particle.style.animationDuration=(1.9+(n%6*0.19))+'s';
        confetti.append(particle);
      }
      overlay.append(confetti);
    }
    overlay.append(dialog);
    document.body.append(overlay);
    currentDialog=overlay;
    document.body.classList.add('sb-community-badge-celebration-open');
    const done=()=>{
      if(!showing||currentDialog!==overlay) return;
      showing=false;currentDialog=null;
      overlay.remove();
      document.body.classList.remove('sb-community-badge-celebration-open');
      document.removeEventListener('keydown',onKey,true);
      if(previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
      if(!preview) window.setTimeout(check,220);
    };
    const onKey=event=>{
      if(event.key==='Escape'){event.preventDefault();done();return;}
      if(event.key==='Tab'){
        const focusable=[close,view,dismiss];
        const index=focusable.indexOf(document.activeElement);
        if(event.shiftKey && (index===0 || index===-1)){event.preventDefault();dismiss.focus();}
        else if(!event.shiftKey && index===focusable.length-1){event.preventDefault();close.focus();}
      }
    };
    close.addEventListener('click',done);
    dismiss.addEventListener('click',done);
    view.addEventListener('click',done);
    overlay.addEventListener('click',event=>{if(event.target===overlay)done();});
    document.addEventListener('keydown',onKey,true);
    close.focus({preventScroll:true});
  }

  async function check(){
    if(busy||showing||!client()||document.visibilityState==='hidden')return;
    busy=true;
    lastCheck=Date.now();
    try{
      const {data,error}=await client().auth.getUser();
      if(error||!data?.user?.id)return;
      const uid=data.user.id;
      if(lastUid!==uid)lastUid=uid;
      const {data:notice,error:rpcError}=await client().rpc(RPC);
      if(rpcError)throw rpcError;
      const info=Array.isArray(notice)?notice[0]:notice;
      if(!info || !VALID.test(String(info.badge_key||'')))return;
      const {data:current}=await client().auth.getSession();
      if(current?.session?.user?.id!==uid)return;
      const enabled=await preferenceAllowsMotion();
      renderCelebration(info,enabled);
      window.dispatchEvent(new CustomEvent('sb-community-reaction-badge-unlocked',{
        detail:{badge_key:info.badge_key}
      }));
      try{
        if(typeof refreshNotificationBadge==='function')
          void refreshNotificationBadge(uid);
      }catch(e){console.warn('Contadores de avisos:',e);}
    }catch(error){
      console.warn('Celebración de insignia comunitaria:',error);
    }finally{
      busy=false;
    }
  }

  function addPreview(){
    if(location.hash.split('?')[0]!=='#/logros')return;
    const panel=document.getElementById('sb-community-reaction-logros');
    if(!panel || panel.querySelector('.sb-community-badge-celebration-preview'))return;
    const button=make('button','outline-btn mini sb-community-badge-celebration-preview','🎊 Probar celebración');
    button.type='button';
    button.title='Solo muestra la animación. No concede insignias ni genera notificaciones.';
    button.addEventListener('click',()=>renderCelebration(
      {emoji:'🌸',title:'Espíritu anime'},!reducedMotion(),true));
    panel.querySelector('.sb-community-reaction-reload')?.after(button);
    if(!button.isConnected)panel.append(button);
  }

  let pendingScan=false;
  function scheduleScan(){
    if(pendingScan)return;
    pendingScan=true;
    requestAnimationFrame(()=>{
      pendingScan=false;
      addPreview();
    });
  }
  function start(){
    new MutationObserver(scheduleScan).observe(document.getElementById('app')||document.body,{
      subtree:true,childList:true
    });
    addEventListener('hashchange',()=>{scheduleScan();void check();});
    addEventListener('focus',()=>{if(Date.now()-lastCheck>5000)void check();});
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')void check();
    });
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('.post-like-button,.sb-anime-reaction'))
        window.setTimeout(check,1300);
    },true);
    window.addEventListener('sb-community-reaction-badge-unlocked',()=>{
      const button=document.querySelector('#sb-community-reaction-logros .sb-community-reaction-reload');
      if(button)button.click();
      const detail=document.querySelector('.sb-community-reaction-account');
      if(detail?.open)detail.dispatchEvent(new Event('toggle'));
    });
    window.setInterval(()=>{if(!showing)void check();},16000);
    scheduleScan();
    window.setTimeout(check,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
