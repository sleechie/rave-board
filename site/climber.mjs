export const CLIMBER={id:'climber',name:'Climber',note:'A green climber scales the wall, falls, and sets off a ground-up burst.',hue:125,category:'new'};
export const CLIMBER_DURATION=32;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const rgb=(color,v)=>color.map(c=>Math.round(clamp(c*v,0,255)));
const endX=.38*Math.sin(18*.43)-.08;

export function climberScene(time){
  const t=((time%CLIMBER_DURATION)+CLIMBER_DURATION)%CLIMBER_DURATION;
  const phase=t<18?'climb':t<20?'hang':t<22?'fall':t<28?'burst':'embers';
  const progress=clamp(t/18),stride=t*2.5;
  let x=.38*Math.sin(Math.min(t,18)*.43)-.08,y=-.52+.94*progress,angle=0;
  let left=Math.sin(stride),right=Math.sin(stride+Math.PI);
  if(phase==='hang'){left=.6;right=.6;y+=Math.sin(t*6)*.018;}
  if(phase==='fall'){
    const f=(t-20)/2;y=.42-1.7*f*f;x=endX+.10*Math.sin(f*6);angle=f*2.8;
    left=Math.sin(t*15);right=Math.cos(t*13);
  }
  const joints={hip:[0,0],shoulder:[0,.23],head:[0,.39],
    leftElbow:[-.15,.21+.07*left],leftHand:[-.26,.34+.15*left],
    rightElbow:[.15,.21+.07*right],rightHand:[.26,.34+.15*right],
    leftKnee:[-.12,-.13+.05*right],leftFoot:[-.22,-.29+.08*right],
    rightKnee:[.12,-.13+.05*left],rightFoot:[.22,-.29+.08*left]};
  const c=Math.cos(angle),s=Math.sin(angle);
  for(const [name,[px,py]] of Object.entries(joints))joints[name]=[x+px*c-py*s,y+px*s+py*c];
  return {phase,t,x,y,joints,age:Math.max(0,t-22)};
}
function distanceToSegment(x,y,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1));
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
const bones=[['hip','shoulder'],['shoulder','leftElbow'],['leftElbow','leftHand'],['shoulder','rightElbow'],['rightElbow','rightHand'],['hip','leftKnee'],['leftKnee','leftFoot'],['hip','rightKnee'],['rightKnee','rightFoot']];
const sparks=Array.from({length:30},(_,i)=>({vx:(hash(i+6)-.5)*1.1,vy:1.0+hash(i+19)*.7,delay:hash(i+61)*1.1}));
function sceneColor(p,scene,brightness,adapted){
  const x=p.u===undefined?p.x:p.u*2-1,y=p.v===undefined?p.y:1-p.v*2;
  const fine=adapted&&p.kind==='screw';
  if(scene.phase==='climb'||scene.phase==='hang'||scene.phase==='fall'){
    const j=scene.joints,width=Math.max(.06,1.05/(p.handColumns||p.textWidth||17))*(fine?.70:1);
    let distance=Math.abs(Math.hypot(x-j.head[0],y-j.head[1])-.09);
    for(const [a,b] of bones)distance=Math.min(distance,distanceToSegment(x,y,j[a],j[b]));
    const body=clamp((width-distance)/.025);
    if(body>0)return rgb(fine?[90,255,125]:[20,255,45],brightness*body);
    if(fine&&scene.phase!=='fall'){
      // Small holds outline the next reach and leave a moving trail beneath him.
      const trail=clamp(1-Math.abs(x-scene.x)/.26)*clamp((scene.y-y)/.25)*clamp(1-(scene.y-y)/.7);
      const twinkle=Math.max(0,Math.sin(scene.t*4+p.position*.9))**6;
      return rgb([0,255,100],brightness*trail*twinkle*.9);
    }
    return [0,0,0];
  }
  const age=scene.age,r=Math.hypot(x-endX,(y+1)*.95),front=age*.56;
  const wave=clamp(1-Math.abs(r-front)/(fine?.15:.24))*clamp(1-age/7);
  const flare=Math.exp(-((x-endX)**2+(y+1)**2)*8)*Math.max(0,1-age/1.4);
  let particle=0;
  for(let i=0;i<(fine?sparks.length:18);i++){
    const s=sparks[i],a=age-s.delay;if(a<0)continue;
    const sx=endX+s.vx*a,sy=-1+s.vy*a-.27*a*a;
    const d=Math.hypot(x-sx,y-sy);
    particle=Math.max(particle,clamp(1-d/(fine?.075:.10))*clamp(1-a/5));
  }
  const light=Math.max(wave,flare,particle),fade=1-smooth((scene.t-28)/3);
  const color=flare>wave&&flare>particle?[235,255,150]:particle>wave?(fine?[130,255,55]:[255,185,20]):[255,Math.round(180-100*clamp(age/5)),15];
  return rgb(color,brightness*light*fade);
}
export function climberColor(point,time,brightness=1,adapted=false){return sceneColor(point,climberScene(time),brightness,adapted);}
export function climberFrame(points,time,brightness=1,adapted=false){
  const scene=climberScene(time);
  return points.map(p=>({position:p.position,rgb:sceneColor(p,scene,brightness,adapted)}));
}
