/* SB V2 - Community reels */
window.SBReels=(()=>{
'use strict';
const categories={general:'General',anime:'Anime',gaming:'Gaming',manga:'Manga'};
const bucket='community-reels';
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=make('button',text,'outline-btn mini');b.type='button';b.onclick=fn;return b;};
const ok=r=>{if(r.error)throw r.error;return r.data;};
function field(name,node){const l=make('label',name);l.style.cssText='display:grid;gap:6px;margin:10px 0';l.append(node);return l;}
function durationOf(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const v=make('video');let done=false;const finish=(err,val)=>{if(done)return;done=true;clearTimeout(timer);v.removeAttribute('src');v.load();URL.revokeObjectURL(url);err?reject(err):resolve(val);};const timer=setTimeout(()=>finish(Error('No se pudo leer el vídeo.')),12000);v.preload='metadata';v.onloadedmetadata=()=>finish(null,v.duration);v.onerror=()=>finish(Error('Formato de vídeo no compatible con tu navegador.'));v.src=url;});}
async function mount(){
 const root=document.getElementById('sb-community-reels');if(!root)return;
 root.style.cssText='padding:18px;margin:16px 0;border:1px solid #a855f766;border-radius:18px';
 root.replaceChildren(make('h2','🎬 Shadow Reels'),make('p','Comparte tus momentos anime y gaming en vídeos cortos.'));
 const status=make('p','Cargando vídeos…');status.setAttribute('role','status');root.append(status);
 try{
 const user=ok(await sb.auth.getSession()).session?.user;if(!root.isConnected)return;
 if(!user){status.textContent='Inicia sesión para ver y publicar Reels.';const a=make('a','Iniciar sesión','gradient-btn mini');a.href='#/auth';root.append(a);return;}
 const staff=(await sb.from('site_staff_roles').select('role').eq('user_id',user.id).maybeSingle()).data?.role;
 const moderate=['owner','admin','moderator'].includes(staff);
 const controls=make('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center';
 const filter=make('select');filter.setAttribute('aria-label','Filtrar Reels');for(const [key,label] of [['all','Todos'],...Object.entries(categories)]){const o=make('option',label);o.value=key;filter.append(o);}
 const form=make('form');form.hidden=true;
 const file=make('input');file.type='file';file.accept='video/mp4,video/webm';file.required=true;file.style.maxWidth='100%';
 const caption=make('textarea');caption.maxLength=500;caption.rows=3;caption.placeholder='Describe tu vídeo';caption.style.width='100%';
 const cat=make('select');for(const [key,label] of Object.entries(categories)){const o=make('option',label);o.value=key;cat.append(o);}
 const preview=make('video');preview.controls=true;preview.playsInline=true;preview.preload='metadata';preview.hidden=true;preview.style.cssText='width:100%;max-height:260px;background:#100b1c;border-radius:12px';
 let previewUrl=null;function clearPreview(){preview.pause();preview.removeAttribute('src');preview.load();preview.hidden=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;}
 file.onchange=()=>{clearPreview();if(file.files[0]){previewUrl=URL.createObjectURL(file.files[0]);preview.src=previewUrl;preview.hidden=false;}};
 const submit=make('button','Publicar Reel','gradient-btn mini');submit.type='submit';
 const formStatus=make('p');formStatus.setAttribute('role','status');
 form.append(make('p','MP4 o WebM · máximo 20 MB · hasta 60 segundos. Publica solo vídeos que tengas derecho a compartir.'),field('Vídeo',file),preview,field('Descripción',caption),field('Categoría',cat),submit,formStatus);
 const viewer=make('section');viewer.style.cssText='margin:12px auto;max-width:430px';
 let rows=[],pos=0,version=0,names={},current=null;
 function clearVideo(){const old=viewer.querySelector('video');if(old){old.pause();old.removeAttribute('src');old.load();}}
 async function load(preferred){const token=++version;clearVideo();viewer.replaceChildren();status.textContent='Cargando Reels…';try{
 let q=sb.from('sb_community_reels').select('id,author_id,video_path,caption,category,duration_seconds,created_at').order('created_at',{ascending:false}).limit(50);if(filter.value!=='all')q=q.eq('category',filter.value);
 const data=ok(await q)||[];const ids=[...new Set(data.map(r=>r.author_id))];const profiles=ids.length?(await sb.from('profiles').select('id,display_name,username').in('id',ids)).data||[]:[];
 if(!root.isConnected||token!==version)return;rows=data;names=Object.fromEntries(profiles.map(p=>[p.id,p.display_name||p.username||'Miembro']));pos=Math.max(0,rows.findIndex(r=>r.id===preferred));status.textContent=rows.length?rows.length+' Reels recientes':'No hay vídeos en esta categoría. ¡Publica el primero!';if(rows.length)await show(pos);
 }catch(e){if(token===version)status.textContent='No se pudieron cargar los Reels: '+e.message;}}
 async function show(index){
 if(!rows[index])return;const token=++version;pos=index;const r=rows[index];current=r.id;clearVideo();viewer.replaceChildren(make('p','Preparando vídeo…'));
 try{
 const link=ok(await sb.storage.from(bucket).createSignedUrl(r.video_path,600));
 if(token!==version||!root.isConnected)return;
 viewer.replaceChildren();const header=make('h3',names[r.author_id]||'Miembro');const meta=make('p',categories[r.category]+' · '+Math.ceil(r.duration_seconds)+' s · '+new Date(r.created_at).toLocaleDateString('es-ES'));
 const video=make('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.style.cssText='display:block;width:100%;aspect-ratio:9/16;max-height:65vh;object-fit:contain;background:#100b1c;border-radius:16px';video.src=link.signedUrl;video.setAttribute('aria-label','Reel de '+header.textContent);
 const info=make('p',r.caption);info.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';const msg=make('p');msg.setAttribute('role','status');
 video.onerror=()=>{msg.textContent='No se pudo reproducir el vídeo. Pulsa Recargar vídeo.';};
 const bar=make('div');bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center';
 const prev=button('← Anterior',()=>show(pos-1)),next=button('Siguiente →',()=>show(pos+1));prev.disabled=pos===0;next.disabled=pos===rows.length-1;
 bar.append(prev,make('small',(pos+1)+' / '+rows.length),next,button('↻ Recargar vídeo',()=>show(pos)));
 const like=button('♡ Me gusta',async()=>{});like.disabled=true;bar.append(like);const count=make('span','');bar.append(count);
 viewer.append(header,meta,video,info,bar,msg);
 let liked=false;
 async function updateLikes(){const [mine,total]=await Promise.all([sb.from('sb_community_reel_likes').select('reel_id').eq('reel_id',r.id).eq('user_id',user.id).maybeSingle(),sb.from('sb_community_reel_likes').select('reel_id',{count:'exact',head:true}).eq('reel_id',r.id)]);liked=!!ok(mine);if(total.error)throw total.error;like.textContent=liked?'❤️ Me gusta':'♡ Me gusta';like.setAttribute('aria-pressed',String(liked));count.textContent=(total.count||0)+' me gusta';}
 like.onclick=async()=>{like.disabled=true;try{if(liked)ok(await sb.from('sb_community_reel_likes').delete().eq('reel_id',r.id).eq('user_id',user.id));else ok(await sb.from('sb_community_reel_likes').insert({reel_id:r.id}));await updateLikes();msg.textContent='';}catch(e){msg.textContent='No se pudo guardar la reacción: '+e.message;}finally{like.disabled=false;}};
 if(r.author_id===user.id||moderate){const del=button('Eliminar Reel',async()=>{if(!confirm('¿Eliminar este vídeo de la comunidad?'))return;del.disabled=true;try{ok(await sb.storage.from(bucket).remove([r.video_path]));ok(await sb.from('sb_community_reels').delete().eq('id',r.id).select('id').single());await load();}catch(e){msg.textContent='No se pudo eliminar: '+e.message;del.disabled=false;}});bar.append(del);}
 try{await updateLikes();like.disabled=false;}catch(e){msg.textContent='No se pudieron cargar los me gusta: '+e.message;}
 }catch(e){if(token===version){viewer.replaceChildren(make('p','No se pudo abrir el Reel: '+e.message),button('↻ Actualizar',()=>load()),button('Siguiente →',()=>show(pos+1)));}}
 }
 form.onsubmit=async e=>{e.preventDefault();const f=file.files[0];if(!f)return;if(!['video/mp4','video/webm'].includes(f.type)||f.size>20971520){formStatus.textContent='Elige un MP4 o WebM de hasta 20 MB.';return;}submit.disabled=true;formStatus.textContent='Comprobando vídeo…';let path=null,uploaded=false,published=false;
 try{const duration=await durationOf(f);if(!Number.isFinite(duration)||duration<=0||duration>60)throw Error('El vídeo debe durar entre 0 y 60 segundos.');
 path=user.id+'/'+crypto.randomUUID()+'.'+(f.type==='video/mp4'?'mp4':'webm');formStatus.textContent='Subiendo vídeo…';
 ok(await sb.storage.from(bucket).upload(path,f,{contentType:f.type,upsert:false,cacheControl:'60'}));uploaded=true;
 const r=ok(await sb.from('sb_community_reels').insert({video_path:path,caption:caption.value.trim(),category:cat.value,duration_seconds:Math.ceil(duration*100)/100}).select('id').single());published=true;
 clearPreview();form.reset();form.hidden=true;formStatus.textContent='';filter.value='all';await load(r.id);
 }catch(err){let cleanup='';if(uploaded&&!published){const res=await sb.storage.from(bucket).remove([path]);if(res.error)cleanup=' No se pudo limpiar la subida temporal.';}formStatus.textContent='No se pudo publicar: '+err.message+cleanup;}finally{submit.disabled=false;}};
 controls.append(button('➕ Crear Reel',()=>{form.hidden=!form.hidden;if(form.hidden)clearPreview();else file.focus();}),filter,button('↻ Actualizar',()=>load(current)));filter.onchange=()=>load();root.append(controls,form,viewer);
 const cleanupObserver=new MutationObserver(()=>{if(!root.isConnected){clearPreview();clearVideo();cleanupObserver.disconnect();}});cleanupObserver.observe(document.body,{childList:true,subtree:true});
 await load();
 }catch(e){status.textContent='No se pudieron iniciar los Reels: '+e.message;root.append(button('Reintentar',mount));}
}
return {mount};
})();