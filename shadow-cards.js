/* Shadow Universe — free anime cards, personal album and pack history. */
window.SBShadowCards=(()=>{
'use strict';
const rarities={common:['Común','#b8c5d8','50%'],rare:['Rara','#60a5fa','28%'],epic:['Épica','#c084fc','15%'],legendary:['Legendaria','#fbbf24','6%'],mythic:['Mítica','#fb7185','1%']};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const check=r=>{if(r.error)throw r.error;return r.data};
const button=(label,action)=>{const b=el('button',label,'gradient-btn mini');b.type='button';b.onclick=action;return b};
const grid=()=>{const g=el('div');g.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:12px;margin:12px 0';return g};
function card(c,count,reveal=false){
 const [label,color]=rarities[c.rarity]||rarities.common,owned=count>0;
 const tile=el('article');tile.style.cssText='position:relative;min-width:0;border:1px solid '+color+';border-radius:15px;background:linear-gradient(160deg,#211633,#100c1d);color:#fff;padding:13px;text-align:center;overflow-wrap:anywhere;'+(owned||reveal?'box-shadow:inset 0 0 18px '+color+'22;':'opacity:.65;');
 const rarity=el('small',label.toUpperCase());rarity.style.color=color;
 const icon=el('div',owned||reveal?c.symbol:'🔒');icon.style.cssText='font-size:44px;margin:12px 0;line-height:1.2';
 const title=el('strong',c.name);title.style.display='block';
 tile.append(rarity,icon,title,el('p',c.series),el('small',reveal?'Carta obtenida':owned?'×'+count+' en tu álbum':'Por descubrir'));return tile;
}
async function mount(host,user){
 if(!host||!host.isConnected)return;
 host.replaceChildren(el('h2','🃏 Cartas coleccionables anime'),el('p','Colección inaugural · 15 personajes · 5 rarezas. Abre un sobre gratis cada día y completa tu álbum. Las cartas son decorativas, sin valor monetario.'));
 const shell=el('div');host.append(shell);
 const msg=el('p','Cargando colección…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');shell.append(msg);
 try{
 const catalog=check(await sb.from('sb_shadow_cards').select('id,name,series,rarity,symbol').order('name'))||[];
 const packs=[];for(let offset=0;;offset+=500){const page=check(await sb.from('sb_shadow_card_packs').select('pack_day,card_1,card_2,card_3').eq('user_id',user.id).order('pack_day',{ascending:false}).range(offset,offset+499))||[];packs.push(...page);if(page.length<500)break;}
 if(!host.isConnected)return;
 const byId=Object.fromEntries(catalog.map(c=>[c.id,c]));const counts={};let lastPack=null;
 const rebuild=()=>{for(const id of Object.keys(counts))delete counts[id];for(const p of packs)for(const id of [p.card_1,p.card_2,p.card_3])counts[id]=(counts[id]||0)+1};
 rebuild();shell.replaceChildren();
 const openSection=el('section');openSection.style.cssText='padding:16px;border-radius:14px;background:linear-gradient(130deg,#3b1c60,#171027);border:1px solid #c084fc88;margin:12px 0';
 const packIcon=el('div','🎴');packIcon.style.cssText='font-size:56px;text-align:center';
 const availability=el('p');const open=button('Abrir sobre gratis',async()=>{open.disabled=true;msg.textContent='Abriendo sobre…';try{const result=check(await sb.rpc('sb_shadow_open_daily_cards'));if(!result?.pack)throw new Error('No se recibió el sobre.');const p=result.pack;const previous=packs.findIndex(x=>x.pack_day===p.pack_day);if(previous<0)packs.unshift(p);else packs[previous]=p;lastPack=p;rebuild();render();msg.textContent=result.opened?'🎉 ¡Has conseguido tres cartas!':'Este sobre ya se abrió hoy. Mostramos tus cartas.';}catch(e){msg.textContent='No se pudo abrir: '+(e.message||'Error de conexión');open.disabled=false}});
 const odds=el('details');odds.append(el('summary','Probabilidades por carta'));for(const [label,,prob] of Object.values(rarities))odds.append(el('p',label+' · '+prob));odds.append(el('small','Cada una de las tres cartas se sortea de forma independiente. Pueden salir duplicados.'));
 openSection.append(packIcon,el('h3','Sobre diario · 3 cartas'),availability,open,odds);
 const revealed=el('section');const stats=el('section');const badges=el('section');const album=el('section');const history=el('section');shell.append(openSection,msg,revealed,stats,badges,album,history);
 const controls=el('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
 const search=el('input');search.type='search';search.placeholder='Buscar personaje o anime';search.setAttribute('aria-label','Buscar carta');search.style.maxWidth='100%';
 const rarity=el('select');rarity.setAttribute('aria-label','Rareza');const all=el('option','Todas las rarezas');all.value='all';rarity.append(all);for(const [key,[label]] of Object.entries(rarities)){const opt=el('option',label);opt.value=key;rarity.append(opt)}
 const ownership=el('select');ownership.setAttribute('aria-label','Estado de colección');for(const [v,t] of [['all','Todas'],['owned','Conseguidas'],['missing','Por descubrir'],['duplicates','Duplicadas']]){const o=el('option',t);o.value=v;ownership.append(o)}
 controls.append(search,rarity,ownership);const tiles=grid();album.append(el('h3','📚 Mi álbum'),controls,tiles);
 const renderAlbum=()=>{tiles.replaceChildren();const q=search.value.trim().toLowerCase();const found=catalog.filter(c=>{const n=counts[c.id]||0;return (c.name+' '+c.series).toLowerCase().includes(q)&&(rarity.value==='all'||c.rarity===rarity.value)&&(ownership.value==='all'||ownership.value==='owned'&&n>0||ownership.value==='missing'&&n===0||ownership.value==='duplicates'&&n>1)});for(const c of found)tiles.append(card(c,counts[c.id]||0));if(!found.length)tiles.append(el('p','No hay cartas que coincidan.'));};
 search.oninput=renderAlbum;rarity.onchange=ownership.onchange=renderAlbum;
 function render(){
 const today=new Date().toISOString().slice(0,10);const current=packs.find(p=>p.pack_day===today);open.disabled=!!current;open.textContent=current?'✓ Sobre de hoy abierto':'Abrir sobre gratis';availability.textContent=current?'Vuelve mañana a partir de las 00:00 UTC.':'1 sobre gratuito por día (UTC).';
 const p=lastPack||current;revealed.replaceChildren();if(p){revealed.append(el('h3','✨ Cartas del sobre'));const g=grid();for(const id of [p.card_1,p.card_2,p.card_3])if(byId[id])g.append(card(byId[id],1,true));revealed.append(g);}
 const unique=catalog.filter(c=>counts[c.id]>0).length,total=Object.values(counts).reduce((a,b)=>a+b,0);stats.replaceChildren(el('h3','📊 Progreso de colección'),el('p',unique+' / '+catalog.length+' diferentes · '+total+' cartas · '+(total-unique)+' duplicadas · '+packs.length+' sobres abiertos'));const progress=el('progress');progress.max=Math.max(1,catalog.length);progress.value=unique;progress.style.width='100%';stats.append(progress);
 badges.replaceChildren(el('h3','🏆 Insignias de colección'));const achievements=[['🌱 Primer coleccionista',unique>=1],['⭐ Explorador otaku',unique>=5],['💎 Maestro coleccionista',unique>=10],['👑 Álbum completo',catalog.length>0&&unique===catalog.length],['🔥 Cazador mítico',catalog.some(c=>c.rarity==='mythic'&&counts[c.id]>0)]];for(const [label,done] of achievements)badges.append(el('p',(done?'✅ ':'🔒 ')+label));
 history.replaceChildren(el('h3','📜 Historial de sobres'));for(const pack of packs.slice(0,10))history.append(el('p',pack.pack_day+' · '+[pack.card_1,pack.card_2,pack.card_3].map(id=>byId[id]?.name||id).join(' · ')));if(!packs.length)history.append(el('p','Todavía no has abierto sobres.'));renderAlbum();
 }
 msg.textContent='';render();
 }catch(e){msg.textContent='No se pudo cargar el álbum: '+(e.message||'Error de conexión');shell.append(button('Reintentar',()=>mount(host,user)))}
}
return {mount};
})();