/* Ranking privado de los miembros que más reaccionan a Mi Info. */
(() => {
  'use strict';
  const MAX_MEMBERS = 10;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const number = value => new Intl.NumberFormat('es-ES').format(Math.max(0, Number(value) || 0));
  const date = value => {
    const d = new Date(value);
    return Number.isFinite(d.getTime())
      ? new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(d)
      : '';
  };
  const safeHttps = value => typeof value === 'string'
    && /^https:\/\/[^\s"'<>]+$/i.test(value) ? value : '';
  const videoUrl = value => /\.(?:mp4|webm|ogg)(?:[?#]|$)/i.test(value);

  function mount() {
    if (location.hash.split('?')[0] !== '#/cuenta' || typeof sb === 'undefined') return;
    const stats = document.querySelector('#account-profile .sb-info-stats');
    if (!stats || stats.querySelector('.sb-info-reaction-ranking')) return;

    const details = create('details','sb-info-reaction-ranking');
    const summary = create('summary','sb-info-rank-summary','🏆 Ranking de miembros que más reaccionan');
    const description = create('p','sb-info-rank-help',
      'Privado: solo tú ves esta clasificación. Cuenta cada reacción nueva, no los cambios de emoji ni tus propias reacciones.');
    const list = create('ol','sb-info-rank-list');
    list.setAttribute('aria-label','Miembros ordenados por reacciones recibidas');
    const status = create('p','sb-info-rank-status','Abre el ranking para consultar los resultados.');
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const refresh = create('button','outline-btn mini sb-info-rank-refresh','↻ Actualizar ranking');
    refresh.type = 'button';
    details.append(summary,description,status,list,refresh);
    const existingStatus = stats.querySelector('.sb-info-stats-status');
    if (existingStatus) existingStatus.before(details);
    else stats.append(details);

    let loading = false;
    let loaded = false;
    let ownerId = '';
    let lastLoaded = 0;

    const buildAvatar = (member,name) => {
      const circle = create('span','sb-info-rank-avatar',name.charAt(0).toLocaleUpperCase('es-ES') || '👤');
      circle.setAttribute('aria-hidden','true');
      const url = safeHttps(member?.avatar_url);
      if (!url) return circle;
      if (videoUrl(url)) {
        const video = create('video','sb-info-rank-avatar-media');
        video.src=url;
        video.muted=true;
        video.autoplay=true;
        video.loop=true;
        video.playsInline=true;
        video.preload='none';
        video.setAttribute('aria-hidden','true');
        video.addEventListener('error',()=>video.remove(),{once:true});
        circle.append(video);
      } else {
        const img = create('img','sb-info-rank-avatar-media');
        img.src=url;
        img.alt='';
        img.loading='lazy';
        img.decoding='async';
        img.referrerPolicy='no-referrer';
        img.addEventListener('error',()=>img.remove(),{once:true});
        circle.append(img);
      }
      return circle;
    };

    async function load() {
      if (loading || !details.open || !details.isConnected) return;
      loading=true;
      refresh.disabled=true;
      status.textContent='Cargando ranking…';
      try {
        const {data:auth,error:authError}=await sb.auth.getUser();
        if (authError || !auth?.user?.id) throw Error('Inicia sesión para consultar tu ranking.');
        if (ownerId !== auth.user.id) {
          loaded=false;
          ownerId=auth.user.id;
          list.replaceChildren();
        }
        const {data,error}=await sb.rpc('get_my_info_reaction_ranking',{p_limit:MAX_MEMBERS});
        if (error) throw error;
        if (!details.isConnected || location.hash.split('?')[0]!=='#/cuenta') return;
        const rows=(data||[]).filter(row=>UUID.test(row.reactor_id||'') && row.reactor_id!==ownerId);
        const ids=[...new Set(rows.map(row=>row.reactor_id))];
        let publicProfiles=new Map();
        let profileError=false;
        if (ids.length) {
          const {data:profiles,error:memberError}=await sb.from('profiles')
            .select('id,display_name,username,avatar_url')
            .in('id',ids).eq('is_public',true);
          if (memberError) {
            profileError=true;
            console.warn('Ranking de Info: perfiles públicos',memberError);
          }
          publicProfiles=new Map((profiles||[]).map(member=>[member.id,member]));
        }
        if (!details.isConnected || location.hash.split('?')[0]!=='#/cuenta') return;
        list.replaceChildren();
        for (let index=0;index<rows.length;index++) {
          const row=rows[index];
          const member=publicProfiles.get(row.reactor_id);
          const name=member
            ? String(member.display_name||member.username||'Miembro').trim().slice(0,65)||'Miembro'
            : 'Miembro con perfil privado';
          const item=create('li','sb-info-rank-item');
          const place=create('span','sb-info-rank-place',
            ['🥇','🥈','🥉'][index] || String(index+1)+'.');
          place.setAttribute('aria-label','Puesto '+(index+1));
          const avatar=buildAvatar(member,name);
          const info=create('div','sb-info-rank-member');
          if (member) {
            const link=create('a','sb-info-rank-name',name);
            link.href='#/perfil?id='+encodeURIComponent(row.reactor_id);
            info.append(link);
          } else info.append(create('strong','sb-info-rank-name',name));
          const last=date(row.last_reacted_at);
          if (last) info.append(create('small','sb-info-rank-last','Última reacción: '+last));
          const count=create('span','sb-info-rank-count',
            number(row.reactions)+(Number(row.reactions)===1?' reacción':' reacciones'));
          item.append(place,avatar,info,count);
          list.append(item);
        }
        loaded=true;
        lastLoaded=Date.now();
        status.textContent = !rows.length
          ? 'Todavía no has recibido reacciones de otros miembros.'
          : 'Clasificación de '+rows.length+' miembros'+(profileError?' (algunos nombres no están disponibles).':'.');
      } catch (error) {
        console.warn('Ranking de reacciones recibidas:',error);
        if (details.isConnected) status.textContent=error?.message?.includes('Inicia sesión')
          ? 'Inicia sesión para consultar tu ranking.'
          : 'No se pudo cargar el ranking. Pulsa «Actualizar ranking» para reintentarlo.';
      } finally {
        loading=false;
        if (details.isConnected) refresh.disabled=false;
      }
    }

    details.addEventListener('toggle',()=>{
      if (details.open && (!loaded || Date.now()-lastLoaded>20000)) void load();
    });
    refresh.addEventListener('click',()=>void load());
    stats.querySelector('.sb-info-stats-reload')?.addEventListener('click',()=>{
      if (details.open) void load();
      else loaded=false;
    });
    window.addEventListener('focus',()=>{
      if (details.isConnected && details.open && Date.now()-lastLoaded>30000) void load();
    });
  }

  let scheduled=false;
  function schedule() {
    if (scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;mount();});
  }
  function start() {
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,
      {childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
