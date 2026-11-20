/* Shadows Byte V2 — insignias permanentes por clics en enlaces */
(() => {
  'use strict';
  const tiers=[
    {key:'link_promising_10',icon:'🥉',label:'Enlace Prometedor',goal:10},
    {key:'link_creator_50',icon:'🥈',label:'Creador Destacado',goal:50},
    {key:'link_star_100',icon:'🥇',label:'Estrella Gamer',goal:100},
    {key:'link_legend_500',icon:'💎',label:'Leyenda de la Comunidad',goal:500}
  ];
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const el=(tag,cls,value)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(value!==undefined)n.textContent=value;
    return n;
  };
  const fmt=x=>Math.max(0,Math.floor(Number(x)||0)).toLocaleString('es-ES');
  const dateLabel=x=>{
    const dt=new Date(x);
    return x&&Number.isFinite(dt.getTime())
      ?dt.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}):'';
  };

  function mount(root,own){
    if(root.querySelector('.sbgl-badges'))return;
    const identity=root.querySelector('.sbp-identity-card');
    if(!identity)return;
    const panel=el('section','profile-panel sbgl-badges');
    panel.setAttribute('aria-label','Logros por popularidad de enlaces gamer');
    const heading=el('h2','','🏆 Logros por enlaces gamer');
    const lead=el('p','sbgl-badges-intro',own
      ?'Desbloquea logros permanentes al alcanzar 10, 50, 100 y 500 clics en tus enlaces públicos.'
      :'Insignias ganadas por los clics registrados en los enlaces de este miembro.');
    const refresh=el('button','outline-btn mini','↻ Actualizar logros');
    refresh.type='button';
    const status=el('p','sbgl-badges-status','Cargando logros…');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const grid=el('div','sbgl-badges-grid');
    grid.setAttribute('role','list');
    panel.append(heading,lead);
    if(own)panel.append(refresh);
    panel.append(status,grid,el('p','sbgl-badges-note',own
      ?'Solo se concede una insignia de cada tipo. Las conseguidas se conservan aunque borres enlaces. Los clics no son personas únicas.'
      :'Los clics registrados no representan visitantes únicos.'));
    const anchor=own
      ?(root.querySelector('.sbgl-link-analytics')||root.querySelector('.sbgl-links')||identity)
      :(root.querySelector('.sbgl-links')||identity);
    anchor.after(panel);
    let latest=0;
    const active=()=>panel.isConnected&&location.hash.slice(1).split('?')[0]===(own?'/cuenta':'/perfil');

    function draw(data){
      const earned=new Map((data.badges||[])
        .filter(x=>x&&typeof x.key==='string').map(x=>[x.key,x]));
      const awarded=tiers.filter(x=>earned.has(x.key)).length;
      if(!own&&awarded===0){panel.hidden=true;return;}
      panel.hidden=false;
      const clicks=own?Math.max(0,Number(data.total_clicks)||0):0;
      grid.replaceChildren();
      for(const tier of tiers){
        const unlocked=earned.get(tier.key);
        if(!own&&!unlocked)continue;
        const card=el('article','sbgl-badge-card'+(unlocked?' is-unlocked':' is-locked'));
        card.setAttribute('role','listitem');
        card.append(el('span','sbgl-badge-icon',tier.icon));
        const body=el('div','sbgl-badge-content');
        body.append(el('h3','',tier.label));
        body.append(el('p','sbgl-badge-tier',fmt(tier.goal)+' clics'));
        const remaining=Math.max(0,tier.goal-clicks);
        body.append(el('p','sbgl-badge-state',unlocked
          ?'✓ Desbloqueado'+(dateLabel(unlocked.unlocked_at)?' · '+dateLabel(unlocked.unlocked_at):'')
          :'🔒 Bloqueado · '+fmt(remaining)+' clics restantes'));
        if(own){
          const progress=unlocked?tier.goal:Math.min(tier.goal,clicks);
          const bar=el('div','sbgl-badge-track');
          bar.setAttribute('role','progressbar');
          bar.setAttribute('aria-label','Progreso de '+tier.label);
          bar.setAttribute('aria-valuemin','0');
          bar.setAttribute('aria-valuemax',String(tier.goal));
          bar.setAttribute('aria-valuenow',String(progress));
          const fill=el('span','sbgl-badge-fill');
          fill.style.width=Math.round(progress/tier.goal*100)+'%';
          bar.append(fill);
          body.append(bar);
        }
        card.append(body);
        grid.append(card);
      }
      if(own){
        const next=tiers.find(x=>!earned.has(x.key));
        status.textContent=fmt(awarded)+' de 4 logros · '+fmt(clicks)+' clics registrados.'+
          (next?' Próximo: '+next.label+' a los '+fmt(next.goal)+' clics.':' ¡Todos desbloqueados!');
      }else{
        status.textContent=fmt(awarded)+(awarded===1?' insignia conseguida.':' insignias conseguidas.');
      }
    }
    async function load(){
      const ticket=++latest;
      refresh.disabled=true;
      status.textContent='Actualizando logros…';
      try{
        if(typeof sb==='undefined'||!sb.rpc)throw Error('Supabase no disponible');
        let id=null;
        if(own){
          const res=await sb.auth.getUser();
          if(res.error||!res.data?.user?.id)throw Error('Inicia sesión');
          id=res.data.user.id;
        }else{
          id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
          if(!uuid.test(String(id)))throw Error('Perfil no disponible');
        }
        const {data,error}=await sb.rpc('get_member_gamer_link_badges',{target_member:id});
        if(!active()||ticket!==latest)return;
        if(error)throw error;
        if(!data||!Array.isArray(data.badges))throw Error('Datos inesperados');
        draw(data);
      }catch(error){
        if(active()&&ticket===latest){
          status.textContent='No se pudieron cargar los logros. Actualiza para reintentarlo.';
          console.debug('Logros de enlaces gamer:',error);
        }
      }finally{
        if(active()&&ticket===latest)refresh.disabled=false;
      }
    }
    if(own){
      refresh.addEventListener('click',load);
      window.addEventListener('sb:gamer-links-updated',load);
      const app=document.getElementById('app');
      if(app){
        const observer=new MutationObserver(()=>{
          if(panel.isConnected)return;
          window.removeEventListener('sb:gamer-links-updated',load);
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
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan);}
  function init(){
    const root=document.getElementById('app');
    if(!root)return;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
