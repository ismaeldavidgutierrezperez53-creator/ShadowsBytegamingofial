// Museo anime de trofeos mensuales. Muestra solo premios adjudicados.
(function(){
'use strict';
const medals={
 1:{icon:'🥇',name:'Rey de Encuestas',color:'gold'},
 2:{icon:'🥈',name:'Voz de Plata',color:'silver'},
 3:{icon:'🥉',name:'Voz de Bronce',color:'bronze'}
};
const monthName=value=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(value+'T12:00:00Z'));
const format=new Intl.NumberFormat('es-ES');
const create=(tag,className,value)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(value!==undefined)node.textContent=value;
 return node;
};
const safeTheme=value=>['sakura','neon','stellar','lunar'].includes(value)?value:'sakura';
const loaders=new WeakMap();
const byMonth=rows=>new Map((rows||[]).map(row=>[row.month_start,row]));
async function loadSelected(memberId){
 const {data,error}=await sb.from('member_poll_trophy_museum')
   .select('month_start,is_featured,added_at')
   .eq('user_id',memberId)
   .order('is_featured',{ascending:false})
   .order('added_at',{ascending:false});
 if(error)throw error;
 return data||[];
}
async function applyAction(memberId,month,action,feedback){
 const announce=message=>{if(feedback?.isConnected)feedback.textContent=message;};
 try{
  announce('Guardando cambios en tu vitrina…');
  const {data:{user},error:sessionError}=await sb.auth.getUser();
  if(sessionError||!user||user.id!==memberId){
   announce('Inicia sesión en tu cuenta para modificar la vitrina.');return false;
  }
  const {error}=await sb.rpc('set_my_poll_trophy_museum',{p_month:month,p_action:action});
  if(error)throw error;
  const rows=await loadSelected(memberId);
  window.dispatchEvent(new CustomEvent('sb-poll-museum-updated',{
   detail:{memberId,items:rows}
  }));
  const labels={
   save:'💖 Trofeo guardado en tu vitrina.',
   feature:'👑 Trofeo destacado en tu perfil.',
   unfeature:'El trofeo ya no está destacado.',
   remove:'Trofeo retirado de la vitrina.'
  };
  announce(labels[action]||'Vitrina actualizada.');
  return true;
 }catch(error){
  console.warn('Museo de trofeos:',error);
  announce('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.');
  return false;
 }
}
function reflectControls(memberId,rows){
 const pref=byMonth(rows);
 for(const controls of document.querySelectorAll('.poll-museum-controls')){
  if(controls.dataset.memberId!==memberId)continue;
  const item=pref.get(controls.dataset.month);
  const saved=!!item,featured=item?.is_featured===true;
  const favorite=controls.querySelector('[data-museum-control=favorite]');
  const highlight=controls.querySelector('[data-museum-control=featured]');
  if(!favorite||!highlight)continue;
  favorite.textContent=saved?'💔 Quitar de vitrina':'💖 Guardar en vitrina';
  favorite.setAttribute('aria-pressed',String(saved));
  highlight.textContent=featured?'👑 Quitar destacado':'✨ Destacar trofeo';
  highlight.setAttribute('aria-pressed',String(featured));
 }
}
function attachControls(card,{memberId,month,own,pref}={}){
 if(!own||!memberId||!month||!card)return;
 card.querySelector('.poll-museum-controls')?.remove();
 const controls=create('div','poll-museum-controls');
 controls.dataset.memberId=memberId;
 controls.dataset.month=month;
 const favorite=create('button',null);
 favorite.type='button';favorite.dataset.museumControl='favorite';
 const featured=create('button',null);
 featured.type='button';featured.dataset.museumControl='featured';
 const status=create('span','poll-museum-control-status','');
 status.setAttribute('role','status');
 const click=async(action)=>{
  favorite.disabled=true;featured.disabled=true;
  await applyAction(memberId,month,action,status);
  favorite.disabled=false;featured.disabled=false;
 };
 favorite.onclick=()=>click(favorite.getAttribute('aria-pressed')==='true'?'remove':'save');
 featured.onclick=()=>click(featured.getAttribute('aria-pressed')==='true'?'unfeature':'feature');
 controls.append(favorite,featured,status);
 card.append(controls);
 reflectControlsForOne(controls,pref||null);
}
function reflectControlsForOne(controls,pref){
 const favorite=controls.querySelector('[data-museum-control=favorite]');
 const featured=controls.querySelector('[data-museum-control=featured]');
 const saved=!!pref,pinned=pref?.is_featured===true;
 favorite.textContent=saved?'💔 Quitar de vitrina':'💖 Guardar en vitrina';
 favorite.setAttribute('aria-pressed',String(saved));
 featured.textContent=pinned?'👑 Quitar destacado':'✨ Destacar trofeo';
 featured.setAttribute('aria-pressed',String(pinned));
}
function awardCard(award,memberId,profile,{featured=false,own=false}={}){
 const rank=medals[Number(award.position)];
 if(!rank)return null;
 const card=create('article','poll-museum-card poll-museum-'+rank.color);
 card.dataset.trophyMonth=award.month_start;
 card.dataset.animeTheme=safeTheme(profile?.anime_card_style);
 if(featured)card.classList.add('is-featured');
 const ornament=create('span','poll-museum-sparkles','✦ ✧ ✦');
 ornament.setAttribute('aria-hidden','true');
 const medal=create('span','poll-museum-medal',rank.icon);
 medal.setAttribute('aria-hidden','true');
 card.append(ornament,medal);
 if(featured)card.append(create('strong','poll-museum-featured-label','👑 TROFEO DESTACADO'));
 card.append(create('h4','poll-museum-award-title',award.badge||rank.name));
 card.append(create('span','poll-museum-award-month',monthName(award.month_start)));
 card.append(create('p','poll-museum-award-stats',
  format.format(Number(award.votes_count)||0)+' votos · +'+format.format(Number(award.points)||0)+' puntos'));
 if(profile?.favorite_anime){
  card.append(create('span','poll-museum-anime-preference','🌸 '+String(profile.favorite_anime).slice(0,70)));
 }
 if(profile?.is_public===true){
  const link=create('a','poll-museum-trophy-link','Ver trofeo en el perfil');
  link.href='#/perfil?id='+encodeURIComponent(memberId)+'&trofeo='+encodeURIComponent(award.month_start);
  card.append(link);
 }
 if(own){
  const actions=create('div','poll-museum-card-actions');
  const feedback=create('span','poll-museum-control-status','');
  feedback.setAttribute('role','status');
  const unpin=create('button',null,featured?'👑 Quitar destacado':'✨ Destacar');
  unpin.type='button';
  unpin.onclick=async()=>{
   unpin.disabled=true;remove.disabled=true;
   await applyAction(memberId,award.month_start,featured?'unfeature':'feature',feedback);
   unpin.disabled=false;remove.disabled=false;
  };
  const remove=create('button',null,'💔 Quitar de vitrina');
  remove.type='button';
  remove.onclick=async()=>{
   remove.disabled=true;unpin.disabled=true;
   await applyAction(memberId,award.month_start,'remove',feedback);
   remove.disabled=false;unpin.disabled=false;
  };
  actions.append(unpin,remove,feedback);card.append(actions);
 }
 return card;
}
function previewCards(target){
 target.replaceChildren();
 const info=create('p','poll-museum-preview-note','VISTA PREVIA · Estos trofeos son ejemplos y no están adjudicados.');
 target.append(info);
 const grid=create('div','poll-museum-grid poll-museum-grid-preview');
 for(const pos of [1,2,3]){
  const r=medals[pos];
  const card=create('div','poll-museum-card poll-museum-'+r.color);
  card.dataset.animeTheme='neon';
  card.append(create('span','poll-museum-medal',r.icon));
  card.append(create('strong','poll-museum-award-title',r.name));
  card.append(create('span','poll-museum-preview-stamp','EJEMPLO · NO OFICIAL'));
  card.append(create('span','poll-museum-like-count','❤️ 0 Me gusta · Vista previa'));
  grid.append(card);
 }
 target.append(grid);
}
function mount(host,memberId,{own=false}={}){
 if(!host||!memberId)return;
 const existing=[...host.querySelectorAll(':scope > .poll-trophy-museum')];
 existing.forEach(x=>x.remove());
 const root=create('section','profile-panel poll-trophy-museum');
 root.dataset.memberId=memberId;
 root.dataset.own=String(own);
 root.dataset.animeTheme='sakura';
 root.setAttribute('aria-label','Museo anime de trofeos');
 const heading=create('div','poll-museum-heading');
 const text=create('div');
 text.append(create('span','poll-museum-eyebrow','SHADOWS BYTE · VITRINA DE CAMPEONES'));
 text.append(create('h2',null,'🏛️ Museo de trofeos anime'));
 text.append(create('p',null,'Tus trofeos favoritos, un premio destacado y una vitrina con efectos neón.'));
 heading.append(text);root.append(heading);
 const body=create('div','poll-museum-body');
 const status=create('p','poll-museum-status','Cargando vitrina…');
 status.setAttribute('role','status');
 root.append(body,status);
 host.append(root);
 window.SBPollTrophySocial?.mountStyles(root,memberId,{own});
 let epoch=0;
 async function refresh(){
  const rev=++epoch;
  try{
   const [p,a,profileResult]=await Promise.all([
    loadSelected(memberId),
    sb.from('community_poll_season_results')
      .select('month_start,position,points,badge,votes_count')
      .eq('user_id',memberId).lte('position',3).gt('points',0)
      .order('month_start',{ascending:false}).limit(200),
    sb.from('profiles')
      .select('id,is_public,display_name,username,anime_card_style,favorite_anime')
      .eq('id',memberId).maybeSingle()
   ]);
   if(!root.isConnected||rev!==epoch)return;
   if(a.error||profileResult.error)throw a.error||profileResult.error;
   const profile=profileResult.data;
   if(!own&&profile?.is_public!==true){root.remove();return;}
   root.dataset.animeTheme=safeTheme(profile?.anime_card_style);
   const awardMap=byMonth(a.data||[]);
   const favorites=p.filter(item=>awardMap.has(item.month_start));
   body.replaceChildren();
   if(!favorites.length){
    if(!own){root.remove();return;}
    body.append(create('p','poll-museum-empty','Aún no tienes trofeos en tu vitrina. Cuando ganes uno, podrás marcarlo como favorito y destacarlo desde la galería de trofeos.'));
    const preview=create('button','poll-museum-preview-button','✨ Probar vitrina neón');
    preview.type='button';
    const sample=create('div','poll-museum-preview-wrap');
    preview.onclick=()=>{
     if(sample.children.length){sample.replaceChildren();preview.textContent='✨ Probar vitrina neón';}
     else{previewCards(sample);preview.textContent='Ocultar vista previa';}
    };
    body.append(preview,sample);
    status.textContent='No se han seleccionado trofeos oficiales.';
    return;
   }
   const featured=favorites.find(p=>p.is_featured===true);
   if(featured){
    const hero=create('div','poll-museum-hero');
    hero.append(create('span','poll-museum-hero-label','🌟 VITRINA DESTACADA'));
    const card=awardCard(awardMap.get(featured.month_start),memberId,profile,{featured:true,own});
    if(card)hero.append(card);
    body.append(hero);
   }else if(own){
    body.append(create('p','poll-museum-hint','✨ Elige un trofeo favorito y pulsa «Destacar» para colocarlo en la vitrina principal.'));
   }
   const favoritesSection=create('div','poll-museum-favorites');
   favoritesSection.append(create('h3',null,'💖 Mis trofeos favoritos ('+favorites.length+')'));
   const grid=create('div','poll-museum-grid');
   const other=favorites.filter(item=>!featured||item.month_start!==featured.month_start);
   for(const selection of other){
    const record=awardMap.get(selection.month_start);
    const card=awardCard(record,memberId,profile,{own});
    if(card)grid.append(card);
   }
   if(other.length===0)grid.append(create('p','poll-museum-all-featured','Tu trofeo destacado ya está en la vitrina principal.'));
   favoritesSection.append(grid);body.append(favoritesSection);
   status.textContent='Vitrina actualizada · '+favorites.length+' trofeo'+(favorites.length===1?'':'s')+' favorito'+(favorites.length===1?'':'s')+'.';
   window.SBPollTrophySocial?.mountLikes(root,memberId,{own,profile});
  }catch(error){
   if(!root.isConnected||rev!==epoch)return;
   body.replaceChildren();
   status.textContent='No se pudo cargar el museo de trofeos. Comprueba tu conexión.';
   console.warn('Museo de trofeos:',error);
  }
 }
 loaders.set(root,refresh);
 refresh();
}
window.addEventListener('sb-poll-museum-updated',event=>{
 const memberId=event.detail?.memberId;
 if(!memberId)return;
 reflectControls(memberId,event.detail?.items||[]);
 for(const root of document.querySelectorAll('.poll-trophy-museum')){
  if(root.dataset.memberId!==memberId)continue;
  loaders.get(root)?.();
 }
});
window.SBPollTrophyMuseum={mount,attachControls,loadSelected,applyAction};
})();
