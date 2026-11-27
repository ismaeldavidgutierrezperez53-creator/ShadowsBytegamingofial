/* Shadow Home — city credits, furniture and visits */
window.SBShadowHome=(()=>{
'use strict';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const ok=r=>{if(r.error)throw r.error;return r.data;};
const button=(text,fn)=>{const b=el('button',text,'gradient-btn mini');b.type='button';b.onclick=fn;return b;};
const rooms={living:'🛋️ Salón',gaming:'🎮 Sala gaming',bedroom:'🛏️ Dormitorio'};
const themes={violet:['Violeta','#3b245b','#171224'],sakura:['Sakura','#66314e','#2b182d'],neon:['Neón','#164b58','#10182b'],night:['Noche','#26374d','#101625']};
const fmt=n=>Number(n).toLocaleString('es-ES');
async function mount(){
 const root=document.getElementById('sb-shadow-home');if(!root)return;
 root.replaceChildren();const status=el('p','Cargando Shadow Home…');status.setAttribute('role','status');root.append(status);
 const panel=el('div');root.append(panel);
 try{
 const user=ok(await sb.auth.getSession()).session?.user;if(!root.isConnected)return;
 if(!user){status.textContent='Inicia sesión para entrar en Shadow Home.';const a=el('a','Iniciar sesión','gradient-btn');a.href='#/auth';panel.append(a);return;}
 let busy=false,room='all',visitId=null,generation=0;
 async function act(action,value=null){if(busy)return;busy=true;for(const b of panel.querySelectorAll('button,select'))b.disabled=true;status.textContent='Guardando…';
 try{ok(await sb.rpc('sb_home_action',{p_action:action,p_value:value}));await load();if(root.isConnected)status.textContent=action==='buy'?'✅ Mueble comprado. Puedes colocarlo desde tu inventario.':action==='create'?'✅ ¡Bienvenido a tu casa!':'✅ Cambios guardados.';}
 catch(e){try{await load();}catch(_){}if(root.isConnected)status.textContent='No se pudo completar: '+e.message;}finally{busy=false;}}
 function roomView(h,items,catalog){const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px;margin:12px 0';const colors=themes[h.theme]||themes.violet;
 for(const [key,name] of Object.entries(rooms)){const card=el('article');card.style.cssText='padding:16px;border:1px solid #c084fc77;border-radius:14px;background:linear-gradient(160deg,'+colors[1]+','+colors[2]+');color:#fff';card.append(el('h3',name));
 const scene=el('div');scene.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;min-height:125px;padding:12px;border-radius:12px;background:#ffffff10;border-bottom:5px solid #ffffff33';const equipped=items.filter(i=>i.equipped).map(i=>catalog.find(c=>c.id===i.item_id)).filter(c=>c&&c.room===key);
 for(const c of equipped){const object=el('div');object.style.cssText='display:grid;justify-items:center;gap:4px;text-align:center;min-width:65px';const icon=el('span',c.symbol);icon.style.fontSize='38px';object.append(icon,el('small',c.label));scene.append(object);}
 if(!equipped.length)scene.append(el('p','Habitación vacía'));card.append(scene);grid.append(card);}
 return grid;}
 async function load(){const token=++generation;const [a,h,c,i,v]=await Promise.all([
 sb.from('sb_city_accounts').select('credits').eq('user_id',user.id).maybeSingle(),
 sb.from('sb_home_houses').select('user_id,theme,is_public').eq('user_id',user.id).maybeSingle(),
 sb.from('sb_home_catalog').select('id,room,slot,label,symbol,price,sort_order').order('sort_order'),
 sb.from('sb_home_inventory').select('item_id,equipped').eq('user_id',user.id),
 sb.from('sb_home_houses').select('user_id,theme').eq('is_public',true).neq('user_id',user.id).order('created_at',{ascending:false}).limit(50)]);
 const account=ok(a),house=ok(h),catalog=ok(c)||[],inventory=ok(i)||[],visits=ok(v)||[];
 if(!root.isConnected||token!==generation)return;
 const owned=new Map(inventory.map(x=>[x.item_id,x]));
 panel.replaceChildren();
 const hero=el('section');hero.style.cssText='padding:18px;border:1px solid #a855f777;border-radius:16px;background:linear-gradient(145deg,#302048,#171327);color:#fff';
 hero.append(el('h2','🏠 Mi casa virtual'));
 if(!account){hero.append(el('p','Regístrate primero como ciudadano de Shadow City para obtener tus créditos.'));const link=el('a','Ir a Shadow City','gradient-btn mini');link.href='#/shadow-city';hero.append(link);}
 else{hero.append(el('p','💳 '+fmt(account.credits)+' créditos de Shadow City'));
 if(!house)hero.append(el('p','Crea tu casa gratis con un sofá y una cama de bienvenida.'),button('Crear mi casa',()=>act('create')));
 else{hero.append(el('p',house.is_public?'🌐 Visible para miembros (si tu perfil es público)':'🔒 Casa privada'));
 const theme=el('select');theme.setAttribute('aria-label','Tema de la casa');for(const [id,t] of Object.entries(themes)){const opt=el('option',t[0]);opt.value=id;theme.append(opt);}theme.value=house.theme;theme.onchange=()=>act('theme',theme.value);
 const label=el('label','Tema: ');label.append(theme);hero.append(label,button(house.is_public?'Hacer privada':'Permitir visitas de miembros',()=>act('visibility',house.is_public?'private':'public')));}
 }
 panel.append(hero);
 if(house){panel.append(roomView(house,inventory,catalog),el('h2','🛒 Tienda e inventario'));
 const select=el('select');select.setAttribute('aria-label','Filtrar muebles por habitación');for(const [id,label] of [['all','Todas las habitaciones'],...Object.entries(rooms)]){const opt=el('option',label);opt.value=id;select.append(opt);}select.value=room;select.onchange=()=>{room=select.value;load().catch(e=>status.textContent=e.message);};panel.append(select);
 const grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,205px),1fr));gap:10px;margin:12px 0';
 for(const item of catalog.filter(x=>room==='all'||x.room===room)){const row=owned.get(item.id),card=el('article');card.style.cssText='padding:14px;border-radius:12px;border:1px solid #a855f755';card.append(el('h3',item.symbol+' '+item.label),el('p',rooms[item.room]),el('p',row?(row.equipped?'✅ Colocado':'En inventario'):fmt(item.price)+' créditos'));
 const b=button(row?(row.equipped?'Retirar':'Colocar'):'Comprar',()=>{if(!row&&!confirm('¿Comprar '+item.label+' por '+item.price+' créditos virtuales?'))return;act(row?(row.equipped?'remove':'equip'):'buy',item.id);});b.disabled=!row&&(!account||account.credits<item.price);card.append(b);grid.append(card);}
 panel.append(grid,el('p','Cada habitación tiene espacios fijos. Colocar un mueble sustituye al anterior en ese mismo espacio, sin perderlo del inventario.'));}
 const section=el('section');section.style.cssText='border:1px solid #a855f766;border-radius:16px;padding:16px;margin:16px 0';
 section.append(el('h2','🌐 Visitar otras casas'),el('p','Hasta 50 casas recientes con visitas activadas.'));
 const ids=visits.map(x=>x.user_id);const names=ids.length?ok(await sb.from('profiles').select('id,display_name,username').in('id',ids))||[]:[];
 if(!root.isConnected||token!==generation)return;const nameMap=new Map(names.map(x=>[x.id,x.display_name||x.username||'Miembro']));
 for(const h of visits){const b=button('🏠 '+(nameMap.get(h.user_id)||'Miembro'),()=>{if(busy)return;visitId=h.user_id;load().catch(e=>status.textContent=e.message);});section.append(b);}
 if(!visits.length)section.append(el('p','Todavía no hay casas públicas disponibles.'));
 if(visitId){const target=visits.find(x=>x.user_id===visitId);
 if(target){const [fresh,items]=await Promise.all([sb.from('sb_home_houses').select('user_id,theme,is_public').eq('user_id',visitId).eq('is_public',true).maybeSingle(),sb.from('sb_home_inventory').select('item_id,equipped').eq('user_id',visitId).eq('equipped',true)]);const current=ok(fresh),equipped=ok(items)||[];
 if(!root.isConnected||token!==generation)return;if(current){section.append(el('h3','Casa de '+(nameMap.get(visitId)||'Miembro')),roomView(current,equipped,catalog));}else section.append(el('p','Esta casa ya no está disponible.'));}
 else section.append(el('p','Esta casa ya no está disponible.'));
 section.append(button('Cerrar visita',()=>{visitId=null;load().catch(e=>status.textContent=e.message);}));}
 panel.append(section,button('↻ Actualizar',()=>{if(!busy)load().catch(e=>status.textContent=e.message);}));
 status.textContent='Personaliza tu casa a tu gusto. Los muebles y créditos son virtuales.';
 }
 await load();
 }catch(e){status.textContent='No se pudo cargar Shadow Home: '+e.message;panel.append(button('Reintentar',mount));}
}
return {mount};
})();