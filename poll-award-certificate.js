// Certificados PNG de encuestas. Los reales se verifican en Supabase al descargar.
// El PNG es un reconocimiento gráfico, no un documento firmado digitalmente.
(function(){
'use strict';
const prizes={
 1:{title:'REY DE ENCUESTAS',color:'#f6cf79',accent:'#e5a33a',roman:'I',points:100},
 2:{title:'VOZ DE PLATA',color:'#b9e8ff',accent:'#6faedb',roman:'II',points:50},
 3:{title:'VOZ DE BRONCE',color:'#ffc2a7',accent:'#ce765b',roman:'III',points:25}
};
const styles={sakura:'#ef9ed3',neon:'#5dd9fb',stellar:'#ae9cff',lunar:'#d8e6ff'};
const fmt=new Intl.NumberFormat('es-ES');
const isUUID=id=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id||'');
const isMonth=m=>/^\d{4}-(0[1-9]|1[0-2])-01$/.test(m||'');
const monthLabel=month=>new Intl.DateTimeFormat('es-ES',{
 month:'long',year:'numeric',timeZone:'Europe/Madrid'
}).format(new Date(month+'T12:00:00Z'));
function roundPath(ctx,x,y,w,h,r){
 const a=Math.min(r,w/2,h/2);
 ctx.beginPath();ctx.moveTo(x+a,y);ctx.lineTo(x+w-a,y);
 ctx.quadraticCurveTo(x+w,y,x+w,y+a);ctx.lineTo(x+w,y+h-a);
 ctx.quadraticCurveTo(x+w,y+h,x+w-a,y+h);ctx.lineTo(x+a,y+h);
 ctx.quadraticCurveTo(x,y+h,x,y+h-a);ctx.lineTo(x,y+a);
 ctx.quadraticCurveTo(x,y,x+a,y);ctx.closePath();
}
function fitText(ctx,text,maxWidth,size,weight='800'){
 let fs=size;
 do{
  ctx.font=weight+' '+fs+'px Rajdhani,Arial,sans-serif';
  if(ctx.measureText(text).width<=maxWidth)break;
  fs-=2;
 }while(fs>26);
 return fs;
}
function drawOrnaments(ctx,w,h,accent){
 for(let i=0;i<44;i++){
  const x=(131+i*139)%w,y=(81+i*103)%h;
  const r=3+(i%5);
  ctx.save();
  ctx.translate(x,y);ctx.rotate((i*39)*Math.PI/180);
  ctx.fillStyle=accent;ctx.globalAlpha=.07+.03*(i%4);
  ctx.beginPath();ctx.ellipse(0,0,r*2.5,r*.75,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
}
function draw(record,{displayName,animeStyle,preview,isPublic}){
 const item=prizes[Number(record?.position)];
 if(!item||!isMonth(record.month_start))throw Error('Premio no válido para certificado');
 const w=1600,h=1000;
 const canvas=document.createElement('canvas');
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas no disponible');
 const style=styles[animeStyle]||styles.sakura;
 const bg=ctx.createLinearGradient(0,0,w,h);
 bg.addColorStop(0,'#17142c');bg.addColorStop(.45,'#141e3d');bg.addColorStop(1,'#301b48');
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const halo=ctx.createRadialGradient(w*.5,h*.21,35,w*.5,h*.3,660);
 halo.addColorStop(0,item.accent+'55');halo.addColorStop(.55,style+'22');halo.addColorStop(1,'#11112200');
 ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
 drawOrnaments(ctx,w,h,style);
 // Floral anime-inspired corner flourishes, never reliant on external images.
 ctx.strokeStyle=item.color;ctx.globalAlpha=.48;ctx.lineWidth=7;
 roundPath(ctx,45,42,w-90,h-84,33);ctx.stroke();
 ctx.strokeStyle=style;ctx.globalAlpha=.23;ctx.lineWidth=2;
 roundPath(ctx,62,60,w-124,h-120,26);ctx.stroke();
 ctx.globalAlpha=1;
 const corner=(x,y,flipX,flipY)=>{
  ctx.save();ctx.translate(x,y);ctx.scale(flipX,flipY);
  for(let i=0;i<5;i++){
   ctx.beginPath();ctx.ellipse(0,0,40,12,i*Math.PI/5,0,Math.PI*2);
   ctx.fillStyle=style;ctx.globalAlpha=.35;ctx.fill();
  }
  ctx.restore();ctx.globalAlpha=1;
 };
 corner(95,98,1,1);corner(w-95,98,-1,1);corner(95,h-98,1,-1);corner(w-95,h-98,-1,-1);
 // Medal with concentric rings.
 const cx=w/2,cy=255;
 ctx.beginPath();ctx.arc(cx,cy,99,0,Math.PI*2);
 ctx.fillStyle='#100d25';ctx.fill();ctx.strokeStyle=item.accent;ctx.lineWidth=10;ctx.stroke();
 ctx.beginPath();ctx.arc(cx,cy,84,0,Math.PI*2);
 ctx.strokeStyle=item.color;ctx.lineWidth=2;ctx.stroke();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=item.color;
 ctx.font='900 95px Rajdhani,Arial,sans-serif';ctx.fillText(item.roman,cx,cy+2);
 ctx.textBaseline='alphabetic';
 ctx.fillStyle='#b3d9f3';ctx.font='800 22px Rajdhani,Arial,sans-serif';
 ctx.fillText('SHADOWS BYTE GAMING OFFICIAL V2',cx,117);
 ctx.fillStyle='#e8d6ff';ctx.font='900 25px Rajdhani,Arial,sans-serif';
 ctx.fillText('RECONOCIMIENTO OFICIAL DE ENCUESTAS',cx,400);
 ctx.fillStyle='#ffffff';
 ctx.font='900 60px Rajdhani,Arial,sans-serif';ctx.fillText('CERTIFICADO DE GANADOR',cx,471);
 ctx.fillStyle='#c9d4ee';ctx.font='500 24px Arial,sans-serif';
 ctx.fillText('Otorgado a',cx,533);
 const name=String(displayName||'Miembro').slice(0,85);
 fitText(ctx,name,1300,70,'900');
 ctx.fillStyle=item.color;ctx.fillText(name,cx,623);
 ctx.strokeStyle=style;ctx.globalAlpha=.6;ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(330,652);ctx.lineTo(1270,652);ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle='#ffffff';ctx.font='900 41px Rajdhani,Arial,sans-serif';
 ctx.fillText(String(record.badge||item.title).toUpperCase(),cx,711);
 ctx.fillStyle='#e3def4';ctx.font='600 27px Arial,sans-serif';
 ctx.fillText('Temporada de '+monthLabel(record.month_start),cx,763);
 ctx.fillStyle='#bde8fa';ctx.font='800 28px Rajdhani,Arial,sans-serif';
 ctx.fillText('PUESTO '+record.position+'   ·   '+fmt.format(Number(record.votes_count)||0)+' VOTOS   ·   +'+fmt.format(Number(record.points)||0)+' PUNTOS',cx,820);
 ctx.fillStyle='#c6bcd9';ctx.font='500 18px Arial,sans-serif';
 ctx.fillText(preview?'Muestra de diseño · No acredita ningún premio':'Creado a partir del resultado registrado de la temporada',cx,901);
 ctx.fillStyle='#94b6c8';ctx.font='500 16px Arial,sans-serif';
 ctx.fillText(isPublic?'Consulta el trofeo en el perfil público de la comunidad':'Documento personal · Sin enlace público de perfil',cx,929);
 if(preview){
  ctx.save();ctx.translate(cx,h/2);ctx.rotate(-.33);
  ctx.fillStyle='rgba(245,245,255,.19)';
  ctx.font='900 105px Rajdhani,Arial,sans-serif';
  ctx.fillText('MUESTRA · NO OFICIAL',0,0);ctx.restore();
 }
 return canvas;
}
async function save(canvas,filename){
 const blob=await new Promise((resolve,reject)=>{
  if(!canvas.toBlob){reject(new Error('Exportación PNG no disponible'));return;}
  canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo generar el PNG')),'image/png');
 });
 const url=URL.createObjectURL(blob);
 try{
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
}
async function downloadOfficial({memberId,month,feedback}){
 const say=s=>{if(feedback?.isConnected)feedback.textContent=s;};
 if(!isUUID(memberId)||!isMonth(month)){say('Datos de premio no válidos.');return;}
 try{
  const {data:{user},error:authError}=await sb.auth.getUser();
  if(authError||user?.id!==memberId){say('Solo el ganador puede descargar su certificado.');return;}
  say('Preparando certificado PNG…');
  const [awardResponse,profileResponse]=await Promise.all([
   sb.from('community_poll_season_results')
    .select('month_start,position,points,badge,votes_count')
    .eq('user_id',memberId).eq('month_start',month).lte('position',3).gt('points',0).maybeSingle(),
   sb.from('profiles').select('display_name,username,is_public,anime_card_style').eq('id',memberId).maybeSingle()
  ]);
  if(awardResponse.error)throw awardResponse.error;
  const award=awardResponse.data,profile=profileResponse.data;
  if(!award||!prizes[Number(award.position)]){
   say('No hay un premio oficial adjudicado para esa temporada.');return;
  }
  if(profileResponse.error)throw profileResponse.error;
  const canvas=draw(award,{
   displayName:profile?.display_name||profile?.username||user.user_metadata?.display_name||'Miembro',
   animeStyle:profile?.anime_card_style,
   isPublic:profile?.is_public===true,preview:false
  });
  await save(canvas,'ShadowsByte-Certificado-'+month.slice(0,7)+'-Puesto-'+award.position+'.png');
  say('✅ Certificado PNG generado y descarga iniciada.');
 }catch(error){
  console.warn('Certificado mensual:',error);
  say('No se pudo crear el PNG. Prueba con un navegador actualizado.');
 }
}
async function downloadPreview(feedback){
 const say=s=>{if(feedback?.isConnected)feedback.textContent=s;};
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 const y=parts.find(p=>p.type==='year')?.value,m=parts.find(p=>p.type==='month')?.value;
 try{
  say('Preparando muestra PNG…');
  const canvas=draw({month_start:y+'-'+m+'-01',position:1,points:100,votes_count:20,badge:'Rey de Encuestas'},
   {displayName:'Participante de ejemplo',animeStyle:'sakura',preview:true,isPublic:false});
  await save(canvas,'ShadowsByte-MUESTRA-Certificado-No-Oficial.png');
  say('✅ Muestra PNG descargada (NO OFICIAL).');
 }catch(error){say('No se pudo generar la muestra PNG en este navegador.');console.warn(error);}
}
window.SBPollAwardCertificate={downloadOfficial,downloadPreview,draw};
})();
