/* Shadow City — SB V2 */
window.SBShadowCity=(()=>{
'use strict';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
const check=r=>{if(r.error)throw r.error;return r.data;};
const button=(title,handler)=>{const b=el('button',title,'gradient-btn mini');b.type='button';b.onclick=handler;return b;};
const fmt=n=>Number(n).toLocaleString('es-ES');
const utcDay=()=>new Date().toISOString().slice(0,10);
async function mount(){
 const root=document.getElementById('sb-shadow-city');if(!root)return;
 root.replaceChildren();const status=el('p','Cargando Shadow City…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);
 const panel=el('div');root.append(panel);
 try{
 const session=check(await sb.auth.getSession()).session;
 if(!root.isConnected)return;
 if(!session?.user){status.textContent='Inicia sesión para entrar en la ciudad.';const a=el('a','Iniciar sesión','gradient-btn');a.href='#/auth';panel.append(a);return;}
 const uid=session.user.id;let busy=false;
 async function act(action,district=null){
 if(busy)return;busy=true;for(const b of panel.querySelectorAll('button'))b.disabled=true;status.textContent='Procesando…';
 try{const result=check(await sb.rpc('sb_city_action',{p_action:action,p_district:district}));
 await load();if(root.isConnected)status.textContent=action==='claim'?'✅ Has recibido '+fmt(result.income)+' créditos.':action==='buy'?'✅ Propiedad adquirida.':action==='upgrade'?'✅ Edificio mejorado.':'✅ ¡Bienvenido a Shadow City!';
 }catch(e){if(root.isConnected){try{await load();}catch(_){}status.textContent='No se pudo completar: '+e.message;}}finally{busy=false;}
 }
 async function load(){
 const [a,d,p]=await Promise.all([sb.from('sb_city_accounts').select('credits,last_claim').eq('user_id',uid).maybeSingle(),sb.from('sb_city_districts').select('id,name,symbol,description,price,daily_bonus,sort_order').order('sort_order'),sb.from('sb_city_properties').select('district_id,level').eq('user_id',uid)]);
 const account=check(a),districts=check(d)||[],properties=check(p)||[];if(!root.isConnected)return;
 panel.replaceChildren();const owned=new Map(properties.map(x=>[x.district_id,x.level]));
 const banner=el('div');banner.style.cssText='border:1px solid #a855f780;border-radius:18px;padding:20px;margin:12px 0;background:linear-gradient(140deg,#271443,#111827);color:#fff';
 banner.append(el('h2','🌃 Tu ciudad, tu imperio'));
 if(!account){banner.append(el('p','Crea tu cuenta de ciudadano y recibe 300 créditos iniciales. Los créditos son virtuales, no se compran ni se convierten en dinero.'),button('🏙️ Entrar en Shadow City',()=>act('join')));}
 else{
 const income=100+districts.reduce((sum,d)=>sum+(owned.get(d.id)||0)*d.daily_bonus,0);
 banner.append(el('p','💳 '+fmt(account.credits)+' créditos de ciudad'),el('p','🏠 '+properties.length+' / '+districts.length+' propiedades · 💰 '+fmt(income)+' créditos diarios'));
 const claim=button(account.last_claim===utcDay()?'✅ Cobrado hoy':'🎁 Cobrar ingresos diarios',()=>act('claim'));claim.disabled=account.last_claim===utcDay();banner.append(claim,el('p','El cobro se reinicia cada día a las 00:00 UTC.'));
 }
 panel.append(banner,el('h2','🗺️ Explora los distritos'));
 const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px';
 const accents=['#a78bfa','#f472b6','#22d3ee','#fbbf24','#60a5fa','#c084fc'];
 for(const [i,d] of districts.entries()){
 const level=owned.get(d.id)||0;const card=el('article');card.style.cssText='padding:16px;border-radius:16px;border:1px solid '+accents[i%accents.length]+';background:linear-gradient(155deg,#291b40,#14101f);color:#fff;min-width:0;overflow-wrap:anywhere';
 card.append(el('h3',d.symbol+' '+d.name),el('p',d.description),el('p',level?'🏠 Tu propiedad · Nivel '+level+' / 5':'🔑 Propiedad disponible'),el('p','Ingresos: +'+fmt(d.daily_bonus*(level||1))+' créditos/día'));
 const progress=el('progress');progress.max=5;progress.value=level;progress.setAttribute('aria-label','Nivel de propiedad');progress.style.cssText='width:100%;accent-color:'+accents[i%accents.length];card.append(progress);
 if(account){const cost=level?d.price*(level+1):d.price;const b=button(level===5?'⭐ Nivel máximo':(level?'⬆️ Mejorar':'🏠 Comprar')+' · '+fmt(cost)+' créditos',()=>act(level?'upgrade':'buy',d.id));b.disabled=level===5||account.credits<cost;card.append(b);if(level<5&&account.credits<cost)card.append(el('small',' Créditos insuficientes'));}
 grid.append(card);
 }
 panel.append(grid);status.textContent='Explora y mejora tus propiedades. Los ingresos son virtuales.';
 }
 await load();
 }catch(e){status.textContent='No se pudo cargar Shadow City: '+e.message;panel.append(button('Reintentar',mount));}
}
return {mount};
})();