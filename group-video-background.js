/* Fondos anime con segmentación local de cámara (MediaPipe, carga bajo demanda).
   La webcam no se envía a Google; el motor puede enviar métricas técnicas. */
(function(){
 'use strict';
 const packageBase='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3';
 const modelUrl='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite';
 let libraryPromise=null;
 const getLibrary=()=>libraryPromise||(libraryPromise=import(packageBase+'/vision_bundle.mjs').catch(e=>{libraryPromise=null;throw e;}));
 function drawAnimeScene(ctx,theme,w,h,time){
  const sky=ctx.createLinearGradient(0,0,w,h);
  if(theme==='sakura'){sky.addColorStop(0,'#fda5df');sky.addColorStop(.6,'#b3a1ff');sky.addColorStop(1,'#f5c2ed');}
  else if(theme==='night'){sky.addColorStop(0,'#10143e');sky.addColorStop(.65,'#51449e');sky.addColorStop(1,'#9f6ac3');}
  else {sky.addColorStop(0,'#130b35');sky.addColorStop(.6,'#5f247f');sky.addColorStop(1,'#114f80');}
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.save();
  if(theme==='sakura'){
   ctx.fillStyle='#fff1cc';ctx.beginPath();ctx.arc(w*.77,h*.25,w*.075,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#77549a';ctx.beginPath();ctx.moveTo(0,h*.8);ctx.lineTo(w*.3,h*.45);ctx.lineTo(w*.65,h*.84);ctx.lineTo(w,h*.55);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
   ctx.fillStyle='#582f72';ctx.fillRect(w*.06,h*.72,w*.3,h*.21);ctx.beginPath();ctx.moveTo(w*.03,h*.72);ctx.lineTo(w*.21,h*.56);ctx.lineTo(w*.4,h*.72);ctx.fill();
   for(let i=0;i<32;i++){const x=(i*79+time*.015*(1+i%3))%w;const y=(i*43+time*.025)%h;ctx.fillStyle=i%2?'#ffdeef':'#fff5ff';ctx.beginPath();ctx.ellipse(x,y,4+i%3,2,0.7,0,Math.PI*2);ctx.fill();}
  }else if(theme==='night'){
   ctx.fillStyle='#f6e7ff';ctx.beginPath();ctx.arc(w*.77,h*.24,w*.085,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#302a69';ctx.beginPath();ctx.moveTo(0,h*.8);ctx.lineTo(w*.22,h*.49);ctx.lineTo(w*.48,h*.84);ctx.lineTo(w*.77,h*.44);ctx.lineTo(w,h*.74);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
   for(let i=0;i<47;i++){const x=(i*107+29)%w,y=(i*59+11)%(h*.72);ctx.fillStyle=i%3?'#d9d7ff':'#ffefb6';ctx.fillRect(x,y,1+i%2,1+i%2);}
  }else{
   for(let i=0;i<14;i++){const x=i*w/14;const height=h*(.2+(i*31%9)/18);ctx.fillStyle=i%2?'#221743':'#181332';ctx.fillRect(x,h-height,w/13,height);
    ctx.fillStyle=i%2?'#5be8ff':'#fb68ed';for(let j=0;j<4;j++)ctx.fillRect(x+w/50,h-height+15+j*22,w/45,9);}
   ctx.strokeStyle='#2cf4f0';ctx.lineWidth=2;for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(i*w/10,h);ctx.lineTo(w/2,h*.67);ctx.stroke();}
  }
  ctx.restore();
 }
 async function create(stream,theme,onFatal){
  if(!stream?.getVideoTracks().length||!HTMLCanvasElement.prototype.captureStream)throw Error('La cámara no admite fondos virtuales aquí.');
  const {FilesetResolver,ImageSegmenter}=await getLibrary();
  const vision=await FilesetResolver.forVisionTasks(packageBase+'/wasm');
  const segmenter=await ImageSegmenter.createFromOptions(vision,{
   baseOptions:{modelAssetPath:modelUrl,delegate:'CPU'},
   runningMode:'VIDEO',outputCategoryMask:true,outputConfidenceMasks:false
  });
  const source=document.createElement('video');
  source.muted=true;source.playsInline=true;source.autoplay=true;
  source.srcObject=new MediaStream([stream.getVideoTracks()[0]]);
  try{await source.play();}catch(e){segmenter.close();throw e;}
  const width=480,height=270;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  const maskCanvas=document.createElement('canvas'),maskCtx=maskCanvas.getContext('2d',{willReadFrequently:true});
  const personCanvas=document.createElement('canvas');personCanvas.width=width;personCanvas.height=height;
  const personCtx=personCanvas.getContext('2d');
  if(!ctx||!maskCtx||!personCtx){segmenter.close();throw Error('No se ha podido inicializar Canvas.');}
  let stopped=false,raf=0,lastVideoTime=-1,lastTick=0,failures=0;
  const output=canvas.captureStream(12),track=output.getVideoTracks()[0];
  const render=()=>{
   if(stopped)return;
   raf=requestAnimationFrame(render);
   const now=performance.now();
   if(source.readyState<2||source.currentTime===lastVideoTime||now-lastTick<80)return;
   lastTick=now;lastVideoTime=source.currentTime;
   let rendered=false;
   const finishFrame=result=>{
    if(stopped||rendered)return;
    rendered=true;
    drawAnimeScene(ctx,theme,width,height,now);
    const mask=result?.categoryMask;
    if(mask){
     if(maskCanvas.width!==mask.width||maskCanvas.height!==mask.height){maskCanvas.width=mask.width;maskCanvas.height=mask.height;}
     const data=mask.getAsUint8Array(),img=maskCtx.createImageData(mask.width,mask.height);
     for(let i=0;i<data.length;i++){const j=i*4;img.data[j]=255;img.data[j+1]=255;img.data[j+2]=255;img.data[j+3]=data[i]===1?255:0;}
     maskCtx.putImageData(img,0,0);
     personCtx.clearRect(0,0,width,height);personCtx.globalCompositeOperation='source-over';
     personCtx.drawImage(source,0,0,width,height);
     personCtx.globalCompositeOperation='destination-in';personCtx.drawImage(maskCanvas,0,0,width,height);
     personCtx.globalCompositeOperation='source-over';ctx.drawImage(personCanvas,0,0,width,height);
    }else ctx.drawImage(source,0,0,width,height);
    result?.close?.();
   };
   try{
    const returned=segmenter.segmentForVideo(source,now,finishFrame);
    if(!rendered&&returned?.categoryMask)finishFrame(returned);
    if(!rendered){drawAnimeScene(ctx,theme,width,height,now);ctx.drawImage(source,0,0,width,height);}
    failures=0;
   }catch(e){
    console.warn('Segmentación anime:',e);
    if(++failures>4){stopped=true;cancelAnimationFrame(raf);onFatal?.(e);}
   }
  };
  render();
  return {track,stop(){
   if(stopped)return;stopped=true;cancelAnimationFrame(raf);track.stop();source.pause();source.srcObject=null;segmenter.close();
  }};
 }
 window.ShadowsAnimeBackground={create};
})();
