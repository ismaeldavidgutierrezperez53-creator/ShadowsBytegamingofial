/* Logros de participación por reaccionar a publicaciones comunitarias. */
(() => {
  'use strict';
  const CATALOG = 'member_community_reaction_badge_catalog';
  const EARNED = 'member_community_reaction_earned_posts';
  const BADGES = 'member_community_reaction_badges';
  const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const client = () => typeof sb !== 'undefined' ? sb : null;
  const make = (tag,cls,text) => {
    const element = document.createElement(tag);
    if(cls) element.className = cls;
    if(text!==undefined) element.textContent = text;
    return element;
  };
  const number = n => new Intl.NumberFormat('es-ES').format(Math.max(0,Number(n)||0));
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' :
      new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric'}).format(date);
  };
  async function fetchCatalog() {
    const {data,error} = await client().from(CATALOG)
      .select('badge_key,target_posts,emoji,title,description,sort_order')
      .order('sort_order',{ascending:true});
    if(error) throw error;
    return data||[];
  }
  function card(item,unlockedAt,own) {
    const unlocked=!!unlockedAt;
    const element=make('article','sb-community-reaction-badge'+(unlocked?' is-earned':' is-locked'));
    element.setAttribute('aria-label',item.title+(unlocked?' desbloqueada':' bloqueada'));
    const icon=make('span','sb-community-reaction-badge-emoji',item.emoji);
    icon.setAttribute('aria-hidden','true');
    const words=make('div','sb-community-reaction-badge-info');
    const title=make('strong','sb-community-reaction-badge-name',item.title);
    const description=make('span','sb-community-reaction-badge-description',item.description);
    words.append(title,description);
    const state=make('small','sb-community-reaction-badge-state',unlocked?'✓ Conseguida':('🔒 '+number(item.target_posts)+' publicaciones'));
    if(unlocked && unlockedAt!==true) {
      const day=formatDate(unlockedAt);
      if(day) state.title='Desbloqueada: '+day;
    }
    if(own || unlocked) element.append(icon,words,state);
    return element;
  }
  function createPanel(publicView) {
    const panel=make('section','sb-community-reaction-achievements'+(publicView?' sb-community-reaction-public':''));
    panel.setAttribute('aria-label','Insignias por reaccionar a publicaciones de la comunidad');
    const heading=make(publicView?'h3':'h2','sb-community-reaction-heading',
      publicView?'🏅 Insignias de reacciones':'🏅 Mis insignias de la comunidad');
    const description=make('p','sb-community-reaction-description',publicView
      ?'Distinciones por apoyar publicaciones de otros miembros.'
      :'Cada publicación de otro miembro cuenta una sola vez, aunque uses Me gusta y emoji anime. Tus propios posts no suman.');
    const progress=make('div','sb-community-reaction-progress');
    const list=make('div','sb-community-reaction-cards');
    const status=make('p','sb-community-reaction-status','Cargando insignias…');
    status.setAttribute('aria-live','polite');
    status.setAttribute('role','status');
    panel.append(heading,description,progress,list,status);
    return {panel,progress,list,status};
  }
  function renderProgress(holder,total,next) {
    holder.replaceChildren();
    const title=make('p','sb-community-reaction-progress-title',
      '💜 Publicaciones distintas a las que has reaccionado: '+number(total));
    holder.append(title);
    if(!next) {
      holder.append(make('p','sb-community-reaction-next','👑 ¡Has conseguido todas las insignias!'));
      return;
    }
    const remaining=Math.max(0,next.target_posts-total);
    holder.append(make('p','sb-community-reaction-next',
      'Siguiente: '+next.emoji+' '+next.title+' · faltan '+number(remaining)+' publicaciones'));
    const track=make('div','sb-community-reaction-progress-track');
    track.setAttribute('role','progressbar');
    track.setAttribute('aria-label','Progreso hacia '+next.title);
    track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax',String(next.target_posts));
    track.setAttribute('aria-valuenow',String(Math.min(total,next.target_posts)));
    const fill=make('div','sb-community-reaction-progress-fill');
    fill.style.width=Math.min(100,Math.round((total/next.target_posts)*100))+'%';
    track.append(fill);
    holder.append(track);
  }
  async function renderMine(ui,activeSessionCheck=true) {
    if(!ui.panel.isConnected) return;
    ui.status.textContent='Actualizando insignias…';
    try {
      const {data:auth,error:authError}=await client().auth.getUser();
      if(authError||!auth?.user?.id) throw Error('Necesitas iniciar sesión para ver tus logros.');
      const uid=auth.user.id;
      const [catalogResult,countResult,badgesResult]=await Promise.all([
        fetchCatalog(),
        client().from(EARNED).select('post_id',{count:'exact',head:true}).eq('user_id',uid),
        client().from(BADGES).select('badge_key,unlocked_at').eq('user_id',uid)
      ]);
      if(countResult.error)throw countResult.error;
      if(badgesResult.error)throw badgesResult.error;
      if(!ui.panel.isConnected) return;
      if(activeSessionCheck) {
        const {data:current}=await client().auth.getSession();
        if(current?.session?.user?.id!==uid) return;
      }
      const total=countResult.count??0;
      const catalog=catalogResult;
      const earned=new Map((badgesResult.data||[]).map(x=>[x.badge_key,x.unlocked_at]));
      const next=catalog.find(item=>total<item.target_posts);
      renderProgress(ui.progress,total,next);
      ui.list.replaceChildren();
      for(const item of catalog) ui.list.append(card(item,earned.get(item.badge_key),true));
      ui.status.textContent=number(earned.size)+' de '+number(catalog.length)+' insignias desbloqueadas.';
    } catch(error) {
      console.warn('Insignias de reacciones de comunidad:',error);
      if(ui.panel.isConnected)ui.status.textContent=error?.message?.includes('iniciar sesión')
        ? 'Inicia sesión para consultar tus insignias.'
        : 'No se pudieron cargar las insignias. Actualiza la página para reintentar.';
    }
  }
  async function renderPublic(ui,userId) {
    if(!ui.panel.isConnected) return;
    try {
      const [catalogResult,badgeResult]=await Promise.all([
        fetchCatalog(),
        client().from(BADGES).select('badge_key,unlocked_at').eq('user_id',userId)
      ]);
      if(badgeResult.error)throw badgeResult.error;
      if(!ui.panel.isConnected || ui.panel.dataset.owner!==userId)return;
      const owned=new Map((badgeResult.data||[]).map(row=>[row.badge_key,row.unlocked_at]));
      if(!owned.size) {ui.panel.remove();return;}
      ui.list.replaceChildren();
      for(const item of catalogResult)
        if(owned.has(item.badge_key))ui.list.append(card(item,owned.get(item.badge_key),false));
      ui.status.textContent=number(owned.size)+' insignias conseguidas.';
    } catch(error) {
      console.warn('Insignias en perfil público:',error);
      if(ui.panel.isConnected)ui.panel.remove();
    }
  }
  function mountOwn() {
    if(!client()) return;
    const route=location.hash.split('?')[0];
    if(route==='#/logros') {
      const anchor=document.getElementById('my-levels');
      if(!anchor||document.querySelector('#sb-community-reaction-logros'))return;
      const ui=createPanel(false);
      ui.panel.classList.add('section');
      ui.panel.id='sb-community-reaction-logros';
      anchor.after(ui.panel);
      const refresh=make('button','outline-btn mini sb-community-reaction-reload','↻ Actualizar insignias');
      refresh.type='button';
      ui.panel.insertBefore(refresh,ui.status);
      refresh.addEventListener('click',()=>void renderMine(ui));
      void renderMine(ui);
    }
    if(route==='#/cuenta') {
      const account=document.querySelector('#account-profile .profile-body');
      const link=account?.querySelector('a[href="#/logros"]');
      if(!account||!link||account.querySelector('.sb-community-reaction-account'))return;
      const detail=make('details','profile-panel sb-community-reaction-account');
      const summary=make('summary','sb-community-reaction-summary','🏅 Insignias por reaccionar a publicaciones');
      const ui=createPanel(false);
      ui.panel.querySelector('.sb-community-reaction-heading')?.remove();
      ui.panel.classList.add('sb-community-reaction-account-inner');
      detail.append(summary,ui.panel);
      link.closest('.profile-panel')?.after(detail);
      detail.addEventListener('toggle',()=>{if(detail.open)void renderMine(ui);});
    }
  }
  function mountPublic() {
    if(!client()||location.hash.split('?')[0]!=='#/perfil')return;
    const uid=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
    const body=document.querySelector('#public-member-profile .public-member-body');
    if(!ID_RE.test(uid||'')||!body)return;
    const existing=body.querySelector('.sb-community-reaction-public');
    if(existing) {
      if(existing.dataset.owner===uid)return;
      existing.remove();
    }
    const ui=createPanel(true);
    ui.panel.dataset.owner=uid;
    ui.progress.remove();
    body.append(ui.panel);
    void renderPublic(ui,uid);
  }
  let queued=false;
  function schedule() {
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;mountOwn();mountPublic();});
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {subtree:true,childList:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
