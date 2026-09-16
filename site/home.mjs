import { colorAt, mapPoints, makeFrame } from './effects.mjs?v=5';
const boardCanvas=document.getElementById('home-board'), context=boardCanvas.getContext('2d');
const toggle=document.getElementById('home-motion');
let moving=!matchMedia('(prefers-reduced-motion: reduce)').matches, points=[], time=5, last=performance.now(), lastPaint=0, dirty=true;
function updateToggle(){toggle.textContent=moving?'Pause preview':'Play preview';toggle.setAttribute('aria-pressed',String(moving));}
updateToggle();toggle.addEventListener('click',()=>{moving=!moving;dirty=true;updateToggle();});
for(const canvas of document.querySelectorAll('[data-taste]')){
  canvas.width=360;canvas.height=150;const ctx=canvas.getContext('2d');
  for(let y=0;y<150;y+=7)for(let x=0;x<360;x+=7){const rgb=colorAt(canvas.dataset.taste,(x/360-.5)*2,(.5-y/150)*1.5,5,1);ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.beginPath();ctx.arc(x+3,y+3,2.3,0,Math.PI*2);ctx.fill();}
}
try{const response=await fetch('/boards.json');if(!response.ok)throw Error();const data=await response.json();points=mapPoints(data.boards.find(b=>b.id===10),[1,20]);}catch{toggle.disabled=true;toggle.textContent='Preview unavailable';}
function draw(now){
  const dt=Math.min((now-last)/1000,.1);last=now;
  if(moving&&!document.hidden)time+=dt*1.2;
  const rect=boardCanvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
  if(boardCanvas.width!==Math.round(rect.width*dpr)||boardCanvas.height!==Math.round(rect.height*dpr)){boardCanvas.width=Math.round(rect.width*dpr);boardCanvas.height=Math.round(rect.height*dpr);dirty=true;}
  if(points.length&&!document.hidden&&(dirty||moving)&&now-lastPaint>40){
    dirty=false;lastPaint=now;const w=rect.width,h=rect.height;
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
    const height=Math.min(h-36,(w-36)*156/144),width=height*144/156,ox=(w-width)/2,oy=(h-height)/2;
    const frame=makeFrame(points,'vortex',time,1),radius=Math.max(2,width/80);
    frame.forEach((led,i)=>{const p=points[i],color=`rgb(${led.rgb.join(',')})`;context.fillStyle=color;context.shadowColor=color;context.shadowBlur=radius*3;context.beginPath();context.arc(ox+p.u*width,oy+p.v*height,radius,0,Math.PI*2);context.fill();});context.shadowBlur=0;
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
