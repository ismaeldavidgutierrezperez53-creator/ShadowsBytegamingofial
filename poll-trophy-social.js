// Vitrinas con compra segura de la tienda y reacciones a trofeos públicos.
(function(){
'use strict';
const choices=[
 {id:'classic',name:'Clásica Neón',icon:'✨',caption:'Vitrina inicial gratuita'},
 {id:'museum_sakura',name:'Jardín Sakura',icon:'🌸',caption:'Pétalos de anime y aura rosada'},
 {id:'museum_cosmos',name:'Santuario Cósmico',icon:'🌌',caption:'Estrellas y cometas brillantes'},
 {id:'museum_dragon',name:'Trono del Dragón',icon:'🐉',caption:'Rayos dorados y fuego mágico'}
];
const paid=choices.filter(x=>x.id!=='classic').map(x=>x.id);
const create=(tag,cl,text)=>{
 const n=document.createElement(tag);
 if(cl)n.className=cl;
 if(text!==undefined)n.textContent=text;
 return n;
};
const format=new Intl.NumberFormat('es-ES');
const styleName=id=>choices.find(x=>x.id===id)?.name||'Clásica Neón';
const effectsText=enabled=>enabled?'✨ Efectos activados':'⏸️ Efectos pausados';
function applyTheme(root,style,effects){
 if(!root?.isConnected)return;
 root.dataset.museumStyle=choices.some(x=>x.id===style)?style:'classic';
 root.dataset.effects=effects?'on':'off';
}
async function getSettings(memberId){
 const {data,error}=await sb.from('member_poll_museum_settings')
  .select('showcase_style,effects_enabled').eq('user_id',memberId).maybeSingle();
 if(error)throw error;
 return data||{showcase_style:'classic',effects_enabled:true};
}
async function mountStyles(root,memberId,{own=false}={}){
 if(!root||!memberId)return;
 const existing=root.querySelector('.poll-museum-shop');
 existing?.remove();
 const panel=create('section','poll-museum-shop');
 panel.setAttribute('aria-label','Vitrinas desbloqueables con puntos');
 const title=create('div','poll-museum-shop-heading');
 title.append(create('h3',null,'🎨 Vitrinas anime desbloqueables'));
 const state=create('p','poll-museum-shop-state','Cargando estilos…');
 state.setAttribute('role','status');
 title.append(state);panel.append(title);
 const grid=create('div','poll-museum-shop-grid');
 panel.append(grid);
 const body=root.querySelector('.poll-museum-body');
 if(body)root.insertBefore(panel,body);
 else root.append(panel);
 let busy=false;
 let previewTimer=null;
 async function draw(){
  if(!panel.isConnected)return;
  try{
   const settings=await getSettings(memberId);
   if(!panel.isConnected)return;
   root.dataset.previewStyle='';
   applyTheme(root,settings.showcase_style,settings.effects_enabled!==false);
   if(!own){
    grid.replaceChildren();
    state.textContent='Vitrina equipada: '+styleName(settings.showcase_style);
    panel.classList.add('is-public');
    return;
   }
   const [{data:{user}},store,purchases,balanceResult]=await Promise.all([
    sb.auth.getUser(),
    sb.from('reward_shop_items').select('id,name,price,active').in('id',paid),
    sb.from('member_shop_purchases').select('item_id').eq('user_id',memberId).in('item_id',paid),
    sb.rpc('reward_shop_balance')
   ]);
   if(!panel.isConnected)return;
   if(user?.id!==memberId){grid.replaceChildren();state.textContent='Inicia sesión para gestionar tus vitrinas.';return;}
   if(store.error||purchases.error||balanceResult.error)throw store.error||purchases.error||balanceResult.error;
   const balance=Math.max(0,Number(balanceResult.data)||0);
   const catalog=new Map((store.data||[]).map(x=>[x.id,x]));
   const owns=new Set((purchases.data||[]).map(x=>x.item_id));
   grid.replaceChildren();
   state.textContent='🪙 Saldo actual: '+format.format(balance)+' puntos · Vitrina equipada: '+styleName(settings.showcase_style);
   for(const item of choices){
    const product=catalog.get(item.id);
    if(item.id!=='classic'&&(!product||!product.active))continue;
    const unlocked=item.id==='classic'||owns.has(item.id);
    const active=settings.showcase_style===item.id;
    const card=create('article','poll-museum-shop-item');
    card.dataset.option=item.id;
    if(active)card.classList.add('is-active');
    card.append(create('span','poll-museum-shop-icon',item.icon));
    card.append(create('strong','poll-museum-shop-name',item.name));
    card.append(create('span','poll-museum-shop-caption',item.caption));
    card.append(create('span','poll-museum-shop-cost',item.id==='classic'?'Gratis':unlocked?'✅ Desbloqueada':format.format(product.price)+' puntos'));
    const button=create('button','poll-museum-shop-button',
     active?'✓ Equipada':unlocked?'✨ Equipar':'🔓 Desbloquear');
    button.type='button';
    button.disabled=active;
    button.onclick=async()=>{
     if(busy)return;
     const actionText=!unlocked?'Desbloquear '+item.name+' por '+product.price+' puntos. Esta compra no se reembolsa. ¿Continuar?':null;
     if(actionText&&!window.confirm(actionText))return;
     busy=true;button.disabled=true;
     if(previewTimer!==null){clearTimeout(previewTimer);previewTimer=null;}
     root.dataset.previewStyle='';
     state.textContent='Guardando cambios…';
     try{
      if(!unlocked){
       // Uses the existing transaction/points lock and unique shop purchase.
       const {error}=await sb.rpc('buy_reward_shop_item',{requested_item:item.id});
       if(error)throw error;
      }
      const {error}=await sb.rpc('set_my_poll_museum_style',{
       p_style:item.id,p_effects:settings.effects_enabled!==false
      });
      if(error)throw error;
      await draw();
     }catch(error){
      state.textContent=(String(error?.message||'').includes('Insufficient points')?
       'No tienes suficientes puntos para esta vitrina.':'No se pudo completar la operación. Comprueba tu saldo y vuelve a intentarlo.');
      console.warn('Desbloquear vitrina anime:',error);
     }finally{busy=false;button.disabled=false;}
    };
    card.append(button);
    const tryButton=create('button','poll-museum-shop-try','👁️ Probar efecto');
    tryButton.type='button';
    tryButton.onclick=()=>{
     if(busy)return;
     if(previewTimer!==null)clearTimeout(previewTimer);
     root.dataset.previewStyle='yes';
     applyTheme(root,item.id,true);
     const sample=root.querySelector('.poll-museum-preview-wrap');
     if(sample&&!sample.children.length){
      root.querySelector('.poll-museum-preview-button')?.click();
     }
     state.textContent='👁️ Vista previa de '+item.name+'. No se gastarán puntos.';
     previewTimer=setTimeout(()=>{
      previewTimer=null;
      if(root.dataset.previewStyle!=='yes'||!root.isConnected)return;
      root.dataset.previewStyle='';
      applyTheme(root,settings.showcase_style,settings.effects_enabled!==false);
      state.textContent='Vista previa finalizada · Vitrina equipada: '+styleName(settings.showcase_style);
     },9000);
    };
    card.append(tryButton);
    grid.append(card);
   }
   const controls=create('div','poll-museum-shop-controls');
   const toggle=create('button','poll-museum-motion-button',
     settings.effects_enabled===false?'✨ Activar efectos':'⏸ Pausar efectos');
   toggle.type='button';
   toggle.setAttribute('aria-pressed',String(settings.effects_enabled!==false));
   toggle.onclick=async()=>{
    if(busy)return;
    busy=true;toggle.disabled=true;
    const {error}=await sb.rpc('set_my_poll_museum_style',{
     p_style:settings.showcase_style,
     p_effects:settings.effects_enabled===false
    });
    if(error){state.textContent='No se pudieron actualizar los efectos.';toggle.disabled=false;busy=false;return;}
    await draw();busy=false;
   };
   const refresh=create('button','poll-museum-balance-button','↻ Actualizar puntos');
   refresh.type='button';refresh.onclick=()=>draw();
   controls.append(toggle,refresh);grid.append(controls);
  }catch(error){
   if(panel.isConnected)state.textContent='No se pudieron consultar las vitrinas de la tienda.';
   console.warn('Estilos del museo:',error);
  }
 }
 draw();
}
const likeEpoch=new WeakMap();
async function mountLikes(root,memberId,{own=false,profile}={}){
 if(!root?.isConnected)return;
 const epoch=(likeEpoch.get(root)||0)+1;
 likeEpoch.set(root,epoch);
 try{
  const [{data:{user}},countsResult]=await Promise.all([
   sb.auth.getUser(),
   sb.from('member_poll_trophy_like_counts')
    .select('month_start,likes_count').eq('trophy_owner_id',memberId)
  ]);
  if(!root.isConnected||likeEpoch.get(root)!==epoch)return;
  if(countsResult.error)throw countsResult.error;
  let likedMonths=[];
  if(user?.id){
   const {data,error}=await sb.from('member_poll_trophy_likes')
    .select('month_start').eq('trophy_owner_id',memberId).eq('liker_id',user.id);
   if(error)throw error;
   likedMonths=(data||[]).map(x=>x.month_start);
  }
  if(!root.isConnected||likeEpoch.get(root)!==epoch)return;
  const likes=new Set(likedMonths);
  const count=new Map((countsResult.data||[]).map(r=>[r.month_start,Number(r.likes_count)||0]));
  for(const card of root.querySelectorAll('.poll-museum-card[data-trophy-month]')){
   card.querySelector('.poll-museum-like-row')?.remove();
   const month=card.dataset.trophyMonth;
   const row=create('div','poll-museum-like-row');
   const score=create('span','poll-museum-like-count','❤️ '+format.format(count.get(month)||0)+' Me gusta');
   row.append(score);
   if(!own&&profile?.is_public===true){
    if(user?.id&&user.id!==memberId){
     const voted=likes.has(month);
     const button=create('button','poll-museum-like-button',voted?'❤️ Te gusta':'🤍 Me gusta');
     button.type='button';
     button.setAttribute('aria-pressed',String(voted));
     const info=create('span','poll-museum-like-feedback','');
     info.setAttribute('role','status');
     button.onclick=async()=>{
      button.disabled=true;info.textContent='Guardando voto…';
      const action=likes.has(month)?
       sb.from('member_poll_trophy_likes').delete().eq('trophy_owner_id',memberId)
        .eq('month_start',month).eq('liker_id',user.id):
       sb.from('member_poll_trophy_likes').insert({
        month_start:month,trophy_owner_id:memberId,liker_id:user.id
       });
      const {error}=await action;
      if(error){
       info.textContent='No se pudo actualizar tu Me gusta.';
       button.disabled=false;return;
      }
      await mountLikes(root,memberId,{own,profile});
     };
     row.append(button,info);
    }else if(!user){
     const login=create('a','poll-museum-like-login','Inicia sesión para dar Me gusta');
     login.href='#/auth';row.append(login);
    }
   }
   card.append(row);
  }
 }catch(error){
  console.warn('Me gusta del museo:',error);
 }
}
window.SBPollTrophySocial={mountStyles,mountLikes,applyTheme};
})();
