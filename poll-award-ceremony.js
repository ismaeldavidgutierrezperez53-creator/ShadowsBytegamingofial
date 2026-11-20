// Ceremonia personal para ganadores confirmados. Vista previa sin premios.
(function(){
'use strict';
const ranks={
 1:{icon:'🥇',theme:'gold',name:'Rey de Encuestas',points:100,phrase:'¡Una leyenda ocupa el trono!',effect:'Coronas y luces doradas'},
 2:{icon:'🥈',theme:'silver',name:'Voz de Plata',points:50,phrase:'¡Tu voz ilumina la comunidad!',effect:'Estrellas de plata y luz lunar'},
 3:{icon:'🥉',theme:'bronze',name:'Voz de Bronce',points:25,phrase:'¡Tu esfuerzo deja huella!',effect:'Chispas y pétalos de bronce'}
};
const fmt=new Intl.NumberFormat('es-ES');
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
const monthName=month=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(month+'T12:00:00Z'));
const validUser=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id||'');
const validMonth=month=>/^\d{4}-(0[1-9]|1[0-2])-01$/.test(month||'');
const trophyLink=(id,month)=>{const u=new URL(location.href);u.hash='/perfil?id='+encodeURIComponent(id)+'&trofeo='+encodeURIComponent(month);return u.toString();};
const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
let dialogState=null;
function close(){
 if(!dialogState)return;
 const state=dialogState;dialogState=null;
 document.removeEventListener('keydown',state.keydown,true);
 state.overlay.remove();document.body.classList.remove('poll-ceremony-open');
 if(state.previous?.isConnected)state.previous.focus({preventScroll:true});
}
function decorate(panel,theme){
 if(reduceMotion())return;
 const layer=el('div','poll-ceremony-particles');layer.setAttribute('aria-hidden','true');
 for(let i=0;i<33;i++){
  const particle=el('span','poll-ceremony-particle',theme==='gold'?'✦':theme==='silver'?'❄':'✿');
  particle.style.setProperty('--left',String((i*43+11)%100)+'%');
  particle.style.setProperty('--delay',String((i*13%29)/10)+'s');
  particle.style.setProperty('--duration',String(2.4+(i*19%18)/10)+'s');
  particle.style.setProperty('--drift',String((i%2?1:-1)*(30+i*11%100))+'px');
  layer.append(particle);
 }
 panel.append(layer);
}
function shareTrophy({memberId,record,displayName,feedback}){
 const rank=ranks[Number(record?.position)];
 if(!rank||!validUser(memberId)||!validMonth(record?.month_start))return;
 const url=trophyLink(memberId,record.month_start);
 const message=(displayName||'Un miembro')+' ha ganado '+rank.name+' en '+monthName(record.month_start)+' de Shadows Byte Gaming Official. 🏆';
 const report=txt=>{if(feedback?.isConnected)feedback.textContent=txt;};
 if(typeof navigator.share==='function'){
  navigator.share({title:'🏆 Trofeo mensual de encuestas',text:message,url})
   .then(()=>report('✅ Trofeo compartido.'))
   .catch(e=>{if(e?.name!=='AbortError')report('No se pudo compartir. Intenta copiar el enlace.');});
 }else if(navigator.clipboard?.writeText){
  navigator.clipboard.writeText(message+'\n'+url).then(()=>report('✅ Texto y enlace copiados.'))
   .catch(()=>report('No se pudo copiar. Abre el perfil para compartir su enlace.'));
 }else{
  const input=el('textarea');input.value=message+'\n'+url;
  input.style.position='fixed';input.style.left='-9999px';document.body.append(input);input.select();
  let ok=false;try{ok=document.execCommand('copy');}catch(_){}
  input.remove();report(ok?'✅ Texto y enlace copiados.':'Copia el enlace desde la barra de direcciones.');
 }
}
function show(record,id,displayName,isPublic,demo=false){
 const rank=ranks[Number(record.position)];if(!rank)return;
 close();
 const previous=document.activeElement;
 const overlay=el('div','poll-ceremony-overlay');
 const panel=el('section','poll-ceremony-panel poll-ceremony-'+rank.theme);
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','poll-ceremony-heading');
 panel.tabIndex=-1;
 const dismiss=el('button','poll-ceremony-close','✕');
 dismiss.type='button';dismiss.setAttribute('aria-label','Cerrar ceremonia');dismiss.onclick=close;
 panel.append(dismiss);
 panel.append(el('span','poll-ceremony-kicker',demo?'VISTA PREVIA · SIN PREMIO':'PREMIO OFICIAL · SHADOWS BYTE GAMING'));
 panel.append(el('span','poll-ceremony-icon',rank.icon));
 const title=el('h2','poll-ceremony-heading','🎉 ¡Felicidades, '+(displayName||'campeón')+'!');
 title.id='poll-ceremony-heading';panel.append(title);
 panel.append(el('p','poll-ceremony-phrase',rank.phrase));
 panel.append(el('strong','poll-ceremony-badge',rank.name));
 panel.append(el('span','poll-ceremony-month','Temporada de '+monthName(record.month_start)));
 panel.append(el('p','poll-ceremony-votes',demo?'Efecto: '+rank.effect:fmt.format(Number(record.votes_count)||0)+' votos · Puesto '+record.position));
 panel.append(el('strong','poll-ceremony-points',demo?'Premio previsto: +'+rank.points+' puntos':'+'+fmt.format(Number(record.points)||0)+' puntos obtenidos'));
 decorate(panel,rank.theme);
 if(demo){
  const group=el('div','poll-ceremony-rank-choices');
  group.append(el('p',null,'Prueba los efectos de cada puesto:'));
  for(const [n,style] of Object.entries(ranks)){
   const btn=el('button','poll-ceremony-rank-choice',style.icon+' '+style.name);
   btn.type='button';btn.setAttribute('aria-pressed',String(Number(n)===Number(record.position)));
   btn.onclick=()=>show({...record,position:Number(n)},null,'participante',false,true);
   group.append(btn);
  }
  panel.append(group);
  panel.append(el('p','poll-ceremony-disclaimer','Esta vista previa no genera puntos, trofeos ni notificaciones.'));
 }
 const actions=el('div','poll-ceremony-actions');
 if(!demo&&isPublic){
  const go=el('a','poll-ceremony-link','🏆 Ver mi trofeo en el perfil');
  go.href=trophyLink(id,record.month_start);go.onclick=close;
  const share=el('button','poll-ceremony-share','🔗 Compartir mi trofeo');
  share.type='button';
  const status=el('span','poll-ceremony-feedback','');status.setAttribute('role','status');
  share.onclick=()=>shareTrophy({memberId:id,record,displayName,feedback:status});
  actions.append(go,share,status);
 }else if(!demo){
  actions.append(el('p','poll-ceremony-private','Tu trofeo está conseguido, pero tu perfil es privado. Puedes hacerlo público desde Mi cuenta para compartir el enlace.'));
  const go=el('a','poll-ceremony-link','👤 Ir a Mi cuenta');go.href='#/cuenta';go.onclick=close;actions.append(go);
 }
 const done=el('button','poll-ceremony-done','Cerrar ceremonia');
 done.type='button';done.onclick=close;actions.append(done);panel.append(actions);overlay.append(panel);
 const keydown=e=>{
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key!=='Tab')return;
  const items=[...panel.querySelectorAll('button:not([disabled]),a[href]')].filter(x=>x.getClientRects().length);
  if(!items.length)return;
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus();}
  else if(!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus();}
 };
 overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close();});
 document.body.append(overlay);document.body.classList.add('poll-ceremony-open');
 dialogState={overlay,previous,keydown};document.addEventListener('keydown',keydown,true);
 dismiss.focus();
}
async function getOfficial(id,month){
 if(!validUser(id)||!validMonth(month))return null;
 const {data,error}=await sb.from('community_poll_season_results')
  .select('month_start,position,points,badge,votes_count')
  .eq('user_id',id).eq('month_start',month).lte('position',3).gt('points',0).maybeSingle();
 if(error)throw error;
 return data&&ranks[Number(data.position)]?data:null;
}
async function getProfile(id){
 const {data,error}=await sb.from('profiles').select('display_name,username,is_public').eq('id',id).maybeSingle();
 if(error)throw error;return data||null;
}
async function openForWinner(id,month,feedback){
 if(!validUser(id)||!validMonth(month))return;
 try{
  const {data:{user},error}=await sb.auth.getUser();
  if(error||user?.id!==id){if(feedback?.isConnected)feedback.textContent='Solo el ganador puede abrir su ceremonia.';return;}
  const [award,profile]=await Promise.all([getOfficial(id,month),getProfile(id)]);
  if(!award){if(feedback?.isConnected)feedback.textContent='Este trofeo todavía no se ha adjudicado.';return;}
  show(award,id,profile?.display_name||profile?.username||user.user_metadata?.display_name||'campeón',profile?.is_public===true);
 }catch(error){
  if(feedback?.isConnected)feedback.textContent='No se pudo abrir la ceremonia.';
  console.warn('Ceremonia personal:',error);
 }
}
const requested=new Set();
async function maybeCelebrate(id){
 if(!validUser(id)||requested.has(id))return;
 requested.add(id);
 try{
  const {data:{user}}=await sb.auth.getUser();
  if(user?.id!==id)return;
  const {data,error}=await sb.from('community_poll_season_results')
   .select('month_start,position,points,badge,votes_count')
   .eq('user_id',id).lte('position',3).gt('points',0)
   .order('month_start',{ascending:false}).limit(12);
  if(error||!data?.length)return;
  const item=data.find(r=>{
   const key='sb-poll-personal-ceremony:'+id+':'+r.month_start;
   try{return localStorage.getItem(key)!=='seen';}
   catch(_){return !requested.has(key);}
  });
  if(!item)return;
  const key='sb-poll-personal-ceremony:'+id+':'+item.month_start;
  const profile=await getProfile(id);
  if(document.querySelector('.poll-ceremony-overlay'))return;
  try{localStorage.setItem(key,'seen');}catch(_){requested.add(key);}
  show(item,id,profile?.display_name||profile?.username||user.user_metadata?.display_name||'campeón',profile?.is_public===true);
 }catch(error){console.warn('Ceremonia automática:',error);}
 finally{requested.delete(id);}
}
function preview(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',month:'2-digit',year:'numeric'}).formatToParts(new Date());
 const year=parts.find(p=>p.type==='year')?.value,month=parts.find(p=>p.type==='month')?.value;
 show({month_start:year+'-'+month+'-01',position:1,points:0,votes_count:0},null,'participante',false,true);
}
window.SBPollAwardCeremony={openForWinner,shareTrophy,maybeCelebrate,preview,trophyLink};
})();
