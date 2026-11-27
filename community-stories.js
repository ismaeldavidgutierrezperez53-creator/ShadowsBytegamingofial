/* SB V2 — temporary community stories. */
window.SBStories=(()=>{
'use strict';
const themes={violet:['Violeta','linear-gradient(145deg,#4c1d95,#180f35)'],blue:['Azul','linear-gradient(145deg,#164e63,#0b1736)'],rose:['Rosa','linear-gradient(145deg,#9d174d,#3b1038)'],night:['Noche','linear-gradient(145deg,#334155,#090b18)']};
const reactions=['❤️','🔥','😂','😍','😮','👏'];
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const btn=(text,fn)=>{const n=el('button',text,'outline-btn mini');n.type='button';n.onclick=fn;return n};
const check=r=>{if(r.error)throw r.error;return r.data};
const label=(text,input)=>{const l=el('label',text);l.append(input);l.style.cssText='display:block;margin:8px 0';return l};
const nameOf=(names,id)=>names[id]?.name||'Miembro';
const timeLeft=expires=>{const mins=Math.max(0,Math.ceil((new Date(expires).getTime()-Date.now())/60000));return !mins?'Caducada':mins>=60?Math.floor(mins/60)+' h '+(mins%60)+' min':mins+' min';};
const clock=expires=>{const n=el('small','⏳ '+timeLeft(expires));n.dataset.storyExpiry=expires;return n;};
async function profiles(ids){if(!ids.length)return {};const {data}=await sb.from('profiles').select('id,display_name,username,avatar_url').in('id',[...new Set(ids)]);return Object.fromEntries((data||[]).map(p=>[p.id,{name:p.display_name||p.username||'Miembro',avatar:p.avatar_url}]));}
async function compress(file){
 if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Elige una imagen JPG, PNG o WebP de hasta 10 MB.');
 const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');let size=900;
 for(let i=0;i<5;i++){const scale=Math.min(1,size/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#161126';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.76-i*.07);if(data.length<=350000)return data;size=Math.floor(size*.75);}
 throw Error('No se pudo comprimir la imagen. Prueba una imagen más pequeña.');}finally{URL.revokeObjectURL(url)}
}
async function mount(){
 const root=document.getElementById('sb-community-stories');if(!root)return;
 root.style.cssText='padding:18px;margin:16px 0;border:1px solid #a855f766;border-radius:18px';
 root.replaceChildren(el('h2','📸 Historias de 24 horas'),el('p','Comparte tu momento anime o gamer con los miembros. Caduca 24 horas después de publicarlo.'));
 const status=el('p','Cargando historias…');status.setAttribute('role','status');root.append(status);
 try{
 const user=check(await sb.auth.getSession()).session?.user;if(!root.isConnected)return;
 if(!user){const a=el('a','Iniciar sesión','gradient-btn mini');a.href='#/auth';status.textContent='Entra con tu cuenta para publicar y ver historias.';root.append(a);return}
 const staff=(await sb.from('site_staff_roles').select('role').eq('user_id',user.id).maybeSingle()).data?.role;
 const canModerate=['owner','admin','moderator'].includes(staff);
 const toolbar=el('div');toolbar.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
 const composer=el('form');composer.hidden=true;composer.style.margin='12px 0';const text=el('textarea');text.rows=3;text.maxLength=500;text.placeholder='¿Qué estás viendo o jugando?';text.style.cssText='display:block;width:100%';const file=el('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.style.cssText='display:block;max-width:100%';
 const theme=el('select');for(const [key,[name]] of Object.entries(themes)){const option=el('option',name);option.value=key;theme.append(option)}
 const preview=el('div');preview.style.cssText='padding:14px;min-height:70px;border-radius:12px;color:white;overflow-wrap:anywhere;white-space:pre-wrap';const drawPreview=()=>{preview.style.background=themes[theme.value][1];preview.textContent=text.value||'Vista previa de texto'};text.oninput=theme.onchange=drawPreview;drawPreview();
 const publish=el('button','Publicar historia','gradient-btn mini');publish.type='submit';const composeStatus=el('p');composeStatus.setAttribute('role','status');
 composer.append(label('Texto (opcional)',text),label('Imagen (opcional)',file),label('Fondo ',theme),preview,publish,composeStatus);
 const strip=el('div');strip.style.cssText='display:flex;gap:12px;overflow-x:auto;padding:12px 0';
 const viewer=el('section');viewer.hidden=true;viewer.style.cssText='margin:12px 0;border:1px solid #a855f777;padding:12px;border-radius:14px';
 let items=[],names={},activeId=null,timer=null,loadVersion=0;let viewed=new Set();
 const close=()=>{activeId=null;clearTimeout(timer);viewer.hidden=true;viewer.replaceChildren()};
 const refresh=async()=>{try{status.textContent='Cargando…';const version=++loadVersion;const rows=check(await sb.from('sb_community_stories').select('id,author_id,body,theme,created_at,expires_at').order('created_at',{ascending:false}).limit(100))||[];const ids=rows.map(s=>s.id);const views=ids.length?check(await sb.from('sb_community_story_views').select('story_id').eq('viewer_id',user.id).in('story_id',ids))||[]:[];const ns=await profiles(rows.map(s=>s.author_id));if(!root.isConnected||version!==loadVersion)return;items=rows;names=ns;viewed=new Set(views.map(v=>v.story_id));if(activeId&&!items.some(s=>s.id===activeId))close();drawStrip();status.textContent=items.length?items.length+' historias activas (hasta 100 recientes).':'Aún no hay historias. ¡Publica la primera!'}catch(e){status.textContent='No se pudieron cargar las historias: '+e.message}};
 function drawStrip(){strip.replaceChildren();for(const story of items){const b=btn('',()=>show(story.id));b.style.cssText='flex:0 0 105px;display:grid;justify-items:center;gap:6px;white-space:normal;overflow-wrap:anywhere';const ring=el('span',story.author_id===user.id?'👤':'✨');ring.style.cssText='display:grid;place-items:center;width:58px;height:58px;border-radius:50%;font-size:27px;background:'+themes[story.theme][1]+';border:3px solid '+(viewed.has(story.id)?'#94a3b8':'#d946ef');const avatar=names[story.author_id]?.avatar;if(typeof avatar==='string'&&/^https:\/\//i.test(avatar)){const img=el('img');img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';img.onerror=()=>{img.remove();ring.textContent=story.author_id===user.id?'👤':'✨'};ring.replaceChildren(img);img.src=avatar;}b.append(ring,el('span',story.author_id===user.id?'Tu historia':nameOf(names,story.author_id)),el('small',viewed.has(story.id)?'Vista':'Nueva'),clock(story.expires_at));strip.append(b)}}
 async function show(id){
 clearTimeout(timer);activeId=id;viewer.hidden=false;viewer.replaceChildren(el('p','Cargando historia…'));
 try{const story=check(await sb.from('sb_community_stories').select('id,author_id,body,image_data,theme,expires_at').eq('id',id).maybeSingle());if(activeId!==id||!root.isConnected)return;if(!story){close();await refresh();return}
 const own=story.author_id===user.id;
 if(!own&&!viewed.has(id)){const result=await sb.from('sb_community_story_views').insert({story_id:id});if(!result.error||result.error.code==='23505'){viewed.add(id);drawStrip()}}
 if(activeId!==id||!root.isConnected)return;
 viewer.replaceChildren();const heading=el('h3',own?'Tu historia':nameOf(names,story.author_id));const actions=el('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';const pos=items.findIndex(s=>s.id===id);actions.append(btn('Cerrar',close));if(pos>0)actions.append(btn('← Anterior',()=>show(items[pos-1].id)));if(pos>=0&&pos<items.length-1)actions.append(btn('Siguiente →',()=>show(items[pos+1].id)));
 const expires=el('p','Disponible hasta '+new Date(story.expires_at).toLocaleString('es-ES'));
 const content=el('div');content.style.cssText='max-width:520px;margin:12px auto;min-height:200px;padding:16px;border-radius:15px;background:'+themes[story.theme][1]+';color:#fff;display:grid;align-content:center;gap:12px;overflow-wrap:anywhere;text-align:center';
 if(story.image_data&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(story.image_data)){const img=el('img');img.src=story.image_data;img.alt='Imagen de la historia';img.style.cssText='display:block;width:100%;max-height:65vh;object-fit:contain;border-radius:10px';content.append(img)}if(story.body){const p=el('p',story.body);p.style.whiteSpace='pre-wrap';content.append(p)}
 const progress=el('progress');progress.max=86400000;progress.dataset.storyProgress=story.expires_at;progress.value=Math.max(0,Math.min(progress.max,new Date(story.expires_at).getTime()-Date.now()));progress.style.cssText='width:100%;accent-color:#c084fc';progress.setAttribute('aria-label','Tiempo restante de la historia');viewer.append(heading,actions,expires,clock(story.expires_at),progress,content);
 const feedback=el('p');feedback.setAttribute('role','status');
 if(!own){const {data:mine}=await sb.from('sb_community_story_views').select('reaction').eq('story_id',id).eq('viewer_id',user.id).maybeSingle();if(activeId!==id)return;let selected=mine?.reaction||null;const bar=el('div');bar.style.cssText='display:flex;flex-wrap:wrap;gap:8px';const buttons=[];for(const emoji of reactions){const b=btn(emoji,async()=>{b.disabled=true;try{const next=selected===emoji?null:emoji;const result=await sb.from('sb_community_story_views').update({reaction:next}).eq('story_id',id).eq('viewer_id',user.id).select('story_id').single();check(result);selected=next;for(const [v,n] of buttons)n.setAttribute('aria-pressed',String(v===selected));feedback.textContent=selected?'Reacción enviada '+selected:'Reacción retirada';}catch(e){feedback.textContent='No se pudo reaccionar: '+e.message}finally{b.disabled=false}});b.setAttribute('aria-label','Reaccionar '+emoji);b.setAttribute('aria-pressed',String(emoji===selected));buttons.push([emoji,b]);bar.append(b)}viewer.append(bar)}
 if(own){viewer.append(btn('👁️ Ver visualizaciones',async()=>{try{const rows=check(await sb.from('sb_community_story_views').select('viewer_id,viewed_at,reaction').eq('story_id',id).order('viewed_at',{ascending:false}).limit(100))||[];const ns=await profiles(rows.map(v=>v.viewer_id));if(activeId!==id)return;feedback.replaceChildren(el('strong',rows.length+' visualizaciones (hasta 100 recientes)'));for(const row of rows)feedback.append(el('p',nameOf(ns,row.viewer_id)+' · '+new Date(row.viewed_at).toLocaleString('es-ES')+(row.reaction?' · '+row.reaction:'')));}catch(e){feedback.textContent=e.message}}))}
 if(own||canModerate)viewer.append(btn('Eliminar historia',async()=>{if(!confirm('¿Eliminar esta historia?'))return;try{check(await sb.from('sb_community_stories').delete().eq('id',id).select('id').single());close();await refresh()}catch(e){feedback.textContent=e.message}}));
 viewer.append(feedback);timer=setTimeout(()=>{if(activeId===id){close();refresh()}},Math.max(0,new Date(story.expires_at).getTime()-Date.now()));
 }catch(e){if(activeId===id)viewer.replaceChildren(el('p','No se pudo abrir: '+e.message),btn('Cerrar',close))}
 }
 composer.onsubmit=async e=>{e.preventDefault();if(!text.value.trim()&&!file.files?.[0]){composeStatus.textContent='Añade texto o una imagen.';return}publish.disabled=true;composeStatus.textContent='Publicando…';try{const image_data=await compress(file.files?.[0]);check(await sb.from('sb_community_stories').insert({body:text.value.trim(),image_data,theme:theme.value}));composer.reset();drawPreview();composer.hidden=true;composeStatus.textContent='';await refresh();if(items.length)status.textContent='✅ Historia publicada.'}catch(e){composeStatus.textContent='No se pudo publicar: '+e.message}finally{publish.disabled=false}};
 toolbar.append(btn('➕ Crear historia',()=>{composer.hidden=!composer.hidden;if(!composer.hidden)text.focus()}),btn('↻ Actualizar historias',refresh));root.append(toolbar,composer,strip,viewer);await refresh();
 const interval=setInterval(()=>{if(!root.isConnected){clearInterval(interval);clearTimeout(timer);return}const now=Date.now();for(const node of root.querySelectorAll('[data-story-expiry]'))node.textContent='⏳ '+timeLeft(node.dataset.storyExpiry);for(const node of root.querySelectorAll('[data-story-progress]'))node.value=Math.max(0,Math.min(node.max,new Date(node.dataset.storyProgress).getTime()-now));const valid=items.filter(x=>new Date(x.expires_at).getTime()>now);if(valid.length!==items.length){items=valid;if(activeId&&!valid.some(s=>s.id===activeId))close();drawStrip()}},15000);
 }catch(e){status.textContent='No se pudieron cargar las historias: '+e.message;root.append(btn('Reintentar',mount))}
}
return {mount};
})();