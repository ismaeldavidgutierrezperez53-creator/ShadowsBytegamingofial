/* Section visibility, not a replacement for server authorization. */
window.SBVisibility=(()=>{
 const keys=['news','anime_gaming','community','shop','moderation','reports','shop_admin','roles'];
 const labels=['Noticias','Anime y Gaming','Comunidad','Tienda de recompensas','Panel de moderación','Gestionar denuncias','Administrar tienda','Gestionar roles'];
 const routes={'/noticias':'news','/anime':'anime_gaming','/manga':'anime_gaming','/manhwa':'anime_gaming','/gaming':'anime_gaming','/anime-gaming':'anime_gaming','/calendario':'anime_gaming','/waifu-husbando':'anime_gaming','/pokedex':'anime_gaming','/one-piece':'anime_gaming','/comunidad':'community','/shadow-universe':'community','/canales':'community','/tienda':'shop'};
 let row=null,role='guest',rows=[],generation=0;
 async function refresh(){
  const n=++generation;
  const {data:{session}}=await sb.auth.getSession();
  let r='guest';
  if(session?.user){r='member';const {data}=await sb.from('site_staff_roles').select('role').eq('user_id',session.user.id).maybeSingle();if(['owner','admin'].includes(data?.role)&&session.user.app_metadata?.role==='admin')r='admin';else if(data?.role==='moderator'&&session.user.app_metadata?.role==='moderator')r='moderator';}
  const {data,error}=await sb.from('site_section_visibility').select('*');
  if(n!==generation)return;
  role=r;rows=error?[]:data||[];row=rows.find(x=>x.role===r)||null;
  sync();
 }
 function allowed(path){return !routes[path]||role==='guest'||(row&&row[routes[path]]===true)}
 function sync(){
  document.querySelectorAll('a[href^="#/"]').forEach(a=>{const p=a.getAttribute('href').slice(1).split('?')[0];if(routes[p])a.toggleAttribute('data-sb-visibility-hidden',!allowed(p));});
  if(role!=='guest'&&row){for(const [id,key] of [['admin-shop-root','shop_admin'],['sb-staff-panel','roles'],['admin-reports-list','reports'],['admin-moderation-list','moderation']]){const el=document.getElementById(id);if(el)el.toggleAttribute('data-sb-visibility-hidden',!row[key]);}}
 }
 async function mount(){
  const root=document.querySelector('#admin-root .admin-dashboard');if(!root||document.getElementById('sb-visibility-panel'))return;
  await refresh();if(role!=='admin'||!root.isConnected)return;
  const panel=document.createElement('section');panel.id='sb-visibility-panel';panel.className='admin-panel';panel.style.padding='20px';
  panel.innerHTML='<h2>🛡️ Control de permisos y visibilidad</h2><p>Selecciona qué apartados se muestran por cargo. No concede privilegios administrativos ni cambia los permisos de datos.</p><div style="overflow:auto"><table style="width:100%;min-width:390px;text-align:left"><thead><tr><th>Apartado</th><th>Miembro</th><th>Moderador</th><th>Admin</th></tr></thead><tbody></tbody></table></div><p role="status" aria-live="polite"></p><button type="button" class="gradient-btn mini">Guardar permisos</button>';
  const tbody=panel.querySelector('tbody'),status=panel.querySelector('[role=status]'),button=panel.querySelector('button');
  keys.forEach((key,i)=>{const tr=document.createElement('tr');const td=document.createElement('td');td.textContent=labels[i];tr.append(td);for(const r of ['member','moderator','admin']){const cell=document.createElement('td'),input=document.createElement('input');input.type='checkbox';input.dataset.role=r;input.dataset.key=key;input.checked=rows.find(x=>x.role===r)?.[key]===true;input.setAttribute('aria-label',labels[i]+' '+r);cell.append(input);tr.append(cell)}tbody.append(tr)});
  const preview=document.createElement('section');
  preview.style.cssText='margin:20px 0;padding:16px;border:1px solid #7864a666;border-radius:12px';
  preview.innerHTML='<button type="button" class="admin-secondary" aria-expanded="false">👁️ Vista previa por rol</button><div hidden style="margin-top:14px"><label>Ver como: <select aria-label="Rol de vista previa"><option value="member">Miembro</option><option value="moderator">Moderador</option><option value="admin">Administrador</option></select></label><p>Simulación de las casillas actuales, incluso antes de guardar. No cambia tu sesión ni concede permisos.</p><p data-preview-summary aria-live="polite"></p><div data-preview-list style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px"></div></div>';
  const toggle=preview.querySelector('button'),body=toggle.nextElementSibling,select=preview.querySelector('select'),list=preview.querySelector('[data-preview-list]'),summary=preview.querySelector('[data-preview-summary]');
  function drawPreview(){
   const r=select.value;let visible=0,hidden=0,restricted=0;list.replaceChildren();
   keys.forEach((key,i)=>{
    const enabled=panel.querySelector('input[data-role="'+r+'"][data-key="'+key+'"]').checked;
    const authorized=i<4||r==='admin'||(r==='moderator'&&i<6);
    const item=document.createElement('div');item.style.cssText='padding:10px;border:1px solid #7864a644;border-radius:8px';
    const title=document.createElement('strong');title.textContent=labels[i];const state=document.createElement('div');
    if(!enabled){hidden++;state.textContent='🚫 Oculto por configuración';}
    else if(!authorized){restricted++;state.textContent='🔒 Marcado, pero restringido por cargo';}
    else{visible++;state.textContent='✅ Visible';}
    item.append(title,state);list.append(item);
   });
   summary.textContent=visible+' visibles · '+hidden+' ocultos · '+restricted+' restringidos por cargo';
  }
  toggle.addEventListener('click',()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));if(!body.hidden)drawPreview();});
  select.addEventListener('change',drawPreview);
  tbody.addEventListener('change',()=>{if(!body.hidden)drawPreview();});
  panel.append(preview);
  root.prepend(panel);
  if(rows.length!==3){status.textContent='No se pudieron cargar los permisos.';button.disabled=true;return;}
  button.onclick=async()=>{button.disabled=true;status.textContent='Guardando…';try{for(const r of ['member','moderator','admin']){const values={};panel.querySelectorAll('input[data-role="'+r+'"]').forEach(el=>values[el.dataset.key]=el.checked);const {data,error}=await sb.from('site_section_visibility').update(values).eq('role',r).select('role').single();if(error||!data)throw error||new Error('Sin permiso');}await refresh();status.textContent='✅ Permisos guardados.';}catch(e){status.textContent='No se guardaron todos los cambios. Recarga para comprobarlos.';}finally{button.disabled=false;}};
 }
 const style=document.createElement('style');style.textContent='[data-sb-visibility-hidden]{display:none!important}';document.head.append(style);
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;sync()})}}).observe(document.body,{childList:true,subtree:true});
 return {refresh,allowed,mount,sync};
})();