import { PATTERNS, buildPoints, frameFor, footprint } from './model.mjs';
import { ADVERTISING,UART,TX,apiFromName,BoardTransport,BoardPlayer,quantize } from './baseline/protocol.mjs';
import { cornerFrame } from './baseline/effects.mjs';
import { connectionSupport } from './baseline/compatibility.mjs';

const $=id=>document.getElementById(id);
const support=connectionSupport({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,bluetooth:Boolean(navigator.bluetooth),secure:isSecureContext});
const canvases=[$('uniform'),$('sized')],contexts=canvases.map(c=>c.getContext('2d'));
let boards=[],board,points=[],time=3,lastTime=performance.now(),lastPaint=0,dirty=true;
let previewing=!matchMedia('(prefers-reduced-motion: reduce)').matches,cleared=false,lastSent=null,testFrame=null;
let device=null,transport=null,player=null,wakeLock=null,busy=false,stopping=null,action=0,started=0,frames=0;
const variant=()=>document.querySelector('input[name=variant]:checked').value;
const selectedSets=()=>[...$('sets').querySelectorAll('input:checked')].map(el=>Number(el.value));
const connected=()=>Boolean(device?.gatt?.connected&&transport&&!transport.closed);
const running=()=>Boolean(player?.running);
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function controls(){
  dirty=true;const live=connected(),playing=running();
  $('connect').disabled=!board||points.length<4||live||busy||!support.canConnect;
  $('connect').textContent=live?'Board connected':busy?'Working...':'Connect board';
  $('play').disabled=!live||playing||busy||points.length<4;
  $('play').textContent=`Play ${variant()} on board`;
  $('test').disabled=!live||playing||busy;
  $('stop').disabled=!board||Boolean(stopping)||(!live&&cleared);
  $('disconnect').hidden=!live;
  $('preview').disabled=playing||busy||!board;
  $('preview').textContent=previewing?'Pause preview':'Resume preview';
  $('restart').disabled=busy||!board;
  for(const id of ['size','protocol','pacing'])$(id).disabled=live||busy||!board;
  for(const el of $('sets').querySelectorAll('input'))el.disabled=live||busy;
  const pattern=PATTERNS.find(p=>p.id===$('pattern').value);
  $('variant-label').textContent=variant()==='adapted'?'Adapted pattern':'Original pattern';
  $('pattern-note').textContent=variant()==='adapted'?pattern.note:'A frozen copy of the current Rave Board animation. Only the two preview styles differ.';
}
function setBoard(){
  board=boards.find(b=>b.id===Number($('size').value));
  points=buildPoints(board,selectedSets());lastSent=null;testFrame=null;
  const bolts=points.filter(p=>p.kind==='bolt').length;
  $('hold-count').textContent=`${bolts} bolt-ons / ${points.length-bolts} screw-ons`;
  status(points.length?(support.canConnect?'Preview only. Connect and press Play when ready to test the wall.':'Preview only in this browser. Use Original and Adapted to compare.'):'Select at least one installed hold set.');
  controls();
}
function changed(restart=false){
  if(restart)time=$('pattern').value==='gravity'?3:0;
  testFrame=null;cleared=false;dirty=true;
  if(running()){player.refresh();status('Applying the latest pattern selection...');}
  else previewing=true;
  controls();
}
$('pattern').addEventListener('change',()=>changed(true));
for(const el of document.querySelectorAll('input[name=variant]'))el.addEventListener('change',()=>changed());
$('size').addEventListener('change',setBoard);
for(const el of $('sets').querySelectorAll('input'))el.addEventListener('change',setBoard);
for(const id of ['speed','brightness'])$(id).addEventListener('input',()=>{
  $(id+'-value').textContent=id==='speed'?Number($(id).value).toFixed(1)+'×':$(id).value+'%';
  dirty=true;if(running())player.refresh();
});
$('foot-size').addEventListener('input',()=>{$('foot-size-value').textContent=$('foot-size').value+'% of bolt-on';dirty=true;});
$('fps').addEventListener('change',()=>{if(running())player.refresh();});
$('preview').addEventListener('click',()=>{previewing=!previewing;cleared=false;testFrame=null;controls();});
$('restart').addEventListener('click',()=>{time=0;changed();});
const currentFrame=()=>frameFor(points,$('pattern').value,variant(),time,Number($('brightness').value)/100);

function drawCanvas(index,frame){
  const canvas=canvases[index],ctx=contexts[index],rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  const [left,right,bottom,top]=board.bounds,aspect=(right-left)/(top-bottom);
  const h=Math.min(rect.height-36,(rect.width-36)/aspect),w=h*aspect,ox=(rect.width-w)/2,oy=(rect.height-h)/2;
  const colors=new Map(frame.map(led=>[led.position,quantize(led.rgb,transport?.level||3)]));
  const dotRadius=Math.max(2.2,Math.min(6,w/75)),handRadius=w*2.7/(right-left);
  for(const p of points){
    const rgb=colors.get(p.position)||[0,0,0],lit=rgb.some(c=>c>0),color=`rgb(${rgb.join(',')})`,x=ox+p.u*w,y=oy+p.v*h;
    if(index===0){
      ctx.fillStyle=lit?color:'#201b2d';ctx.shadowColor=color;ctx.shadowBlur=lit?dotRadius*3.5:0;
      ctx.beginPath();ctx.arc(x,y,lit?dotRadius:dotRadius*.4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      if(lit){ctx.fillStyle='#ffffff80';ctx.beginPath();ctx.arc(x,y,dotRadius*.35,0,Math.PI*2);ctx.fill();}
    }else{
      const f=footprint(p,handRadius,Number($('foot-size').value)/100);
      ctx.fillStyle='#191c16';ctx.beginPath();ctx.arc(x,y,f.radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=lit?color:'#333a2c';ctx.lineWidth=lit?Math.max(.65,f.stroke):.65;ctx.shadowColor=color;ctx.shadowBlur=lit?f.glow:0;
      ctx.beginPath();ctx.arc(x,y,f.radius,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    }
  }
}
function render(now){
  const dt=Math.min((now-lastTime)/1000,.15);lastTime=now;
  if(previewing||running())time+=dt*Number($('speed').value);
  if(board&&(dirty||previewing&&!running()&&!cleared)&&now-lastPaint>33&&!document.hidden){
    const frame=cleared?[]:testFrame||running()&&lastSent||currentFrame();
    drawCanvas(0,frame);drawCanvas(1,frame);dirty=false;lastPaint=now;
  }
  requestAnimationFrame(render);
}
new ResizeObserver(()=>{dirty=true;}).observe($('uniform'));
requestAnimationFrame(render);
async function awake(){try{if(navigator.wakeLock)wakeLock=await navigator.wakeLock.request('screen');}catch{}}
function releaseAwake(){try{wakeLock?.release().catch(()=>{});}catch{}wakeLock=null;}
function lost(event){
  if(event?.target&&event.target!==device)return;
  action++;stopping=null;busy=false;previewing=false;player?.abandon();transport?.close();releaseAwake();
  status('Bluetooth disconnected. The last image may remain lit; reconnect here or with the Kilter app.',true);controls();
}
function failed(error){
  action++;stopping=null;busy=false;previewing=false;player?.abandon();transport?.close();
  if(device?.gatt?.connected)device.gatt.disconnect();releaseAwake();status(`${error.message} Reconnect to clear or replace any remaining lights.`,true);controls();
}
$('connect').addEventListener('click',async()=>{
  if(!support.canConnect)return;
  action++;busy=true;controls();status('Choose your Kilter Board. Connecting alone sends no lights.');
  let candidate;
  try{
    candidate=await navigator.bluetooth.requestDevice({filters:[{services:[ADVERTISING]},{namePrefix:'Kilter'},{namePrefix:'kilter'},{services:[UART]}],optionalServices:[UART]});
    const level=$('protocol').value==='auto'?apiFromName(candidate.name||''):Number($('protocol').value);
    const gatt=await candidate.gatt.connect(),service=await gatt.getPrimaryService(UART),characteristic=await service.getCharacteristic(TX);
    device=candidate;device.addEventListener('gattserverdisconnected',lost);
    const onError=error=>{if(device===candidate)failed(error);};
    transport=new BoardTransport(characteristic,level,onError,Number($('pacing').value));
    player=new BoardPlayer(transport,currentFrame,(frame,bytes)=>{
      if(device!==candidate)return;
      lastSent=frame;dirty=true;frames++;
      status(`Sending ${variant()} ${$('pattern').selectedOptions[0].textContent.toLowerCase()}. ${(frames/((performance.now()-started)/1000)).toFixed(1)} frames/sec, ${bytes} bytes/frame.`);
    },onError,()=>Number($('fps').value));
    status(`Connected to ${candidate.name||'board'}. Test corners, then choose which pattern version to play.`);
  }catch(error){candidate?.gatt?.disconnect();status(error.name==='NotFoundError'?'No board selected.':`Could not connect: ${error.message}`,true);}
  finally{busy=false;controls();}
});
$('test').addEventListener('click',async()=>{
  const request=++action;busy=true;controls();
  try{const frame=cornerFrame(points);const sent=await transport.send(frame);if(request!==action||sent===null)return;
    testFrame=frame;previewing=false;cleared=false;status('Top left pink, top right cyan, bottom left yellow, bottom right green. Clear and correct the size if those are misplaced.');
  }catch(error){if(request===action)failed(error);}finally{if(request===action){busy=false;controls();}}
});
$('play').addEventListener('click',()=>{
  action++;cleared=false;testFrame=null;lastSent=null;previewing=false;frames=0;started=performance.now();
  player.start();awake();controls();status(`Sending ${variant()} pattern...`);
});
function stop(){
  if(stopping)return stopping;
  previewing=false;cleared=true;testFrame=null;dirty=true;
  if(!connected()){status('Preview stopped.');controls();return Promise.resolve();}
  const request=++action;busy=true;status('Stopping and sending a clear command...');
  stopping=player.stop().then(()=>{if(request===action){lastSent=null;status('Clear command sent. You can switch versions or disconnect.');}})
    .catch(error=>{if(request===action)failed(error);}).finally(()=>{if(request===action){busy=false;stopping=null;releaseAwake();controls();}});
  controls();return stopping;
}
$('stop').addEventListener('click',stop);
$('disconnect').addEventListener('click',()=>{
  action++;stopping=null;busy=false;previewing=false;testFrame=null;player?.abandon();transport?.close();
  device?.removeEventListener('gattserverdisconnected',lost);device?.gatt?.disconnect();device=null;transport=null;player=null;releaseAwake();
  status('Disconnected immediately. The last picture may remain lit.');controls();
});
document.addEventListener('visibilitychange',()=>{dirty=true;if(document.hidden&&running())stop();});
window.addEventListener('pagehide',()=>{player?.abandon();device?.gatt?.disconnect();});
if(support.message){$('compatibility').hidden=false;const title=document.createElement('strong');title.textContent=support.title;$('compatibility').append(title,document.createTextNode(support.kind==='insecure'?'Open this experiment over HTTPS to connect.':support.message));}
if(!support.canConnect){for(const id of ['connect','test','play'])$(id).hidden=true;document.querySelector('.dock').classList.add('preview-only');}
try{
  const response=await fetch(new URL('./boards.json',import.meta.url));if(!response.ok)throw Error('Map download failed');
  boards=(await response.json()).boards;
  for(const b of boards)$('size').append(new Option(b.name,b.id));$('size').value='10';setBoard();
}catch(error){status(error.message,true);}
