import { mapPoints, makeFrame as originalFrame, hsv, gravityPhase } from './baseline/effects.mjs';
import { letterPixel } from './baseline/lettering.mjs';

export const PATTERNS = [
  { id:'gravity', name:'Gravity lettering', note:'Bolt-ons form the letters. Screw-ons add twinkles outside the text.' },
  { id:'rain', name:'Green rain', note:'Large holds carry the heads and tails. Small holds add scattered trailing droplets.' },
  { id:'vortex', name:'Rainbow spiral', note:'The large holds carry the spiral; small holds add a quieter shifted-color layer.' },
];
const fract=x=>x-Math.floor(x);
const hash=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
const scale=(rgb,v)=>rgb.map(c=>Math.max(0,Math.min(255,Math.round(c*v))));

export function buildPoints(board, setIds=[1,20]) {
  if(board.family!=='Original') throw Error('This experiment is only for Kilter Original layouts.');
  const rows=new Map(board.points.map(p=>[p[0],p]));
  const hands=board.points.filter(p=>p[3]===1);
  const xs=[...new Set(hands.map(p=>p[1]))].sort((a,b)=>a-b);
  const ys=[...new Set(hands.map(p=>p[2]))].sort((a,b)=>b-a);
  const dx=xs[1]-xs[0]||8,dy=ys[0]-ys[1]||8;
  return mapPoints(board,setIds).map(p=>{
    const row=rows.get(p.position);
    if(![1,20].includes(row[3])) throw Error('Unknown hold set in Original layout.');
    return {...p,setId:row[3],kind:row[3]===1?'bolt':'screw',
      handColumn:(row[1]-xs[0])/dx,handRow:(ys[0]-row[2])/dy,
      handColumns:xs.length,handRows:ys.length};
  });
}

// This ratio affects drawing only. It never appears in the Bluetooth frame.
export function footprint(point, handRadius, footRatio=.45) {
  const ratio=Math.max(.2,Math.min(.8,Number(footRatio)||.45));
  const radius=handRadius*(point.kind==='screw'?ratio:1);
  return {radius,stroke:radius*.28,glow:radius*.85};
}

function glyph(message,p,time,{top=0,tall=false,fixed=false}={}) {
  const columns=p.handColumns,rows=p.handRows;
  const start=columns*.78;
  const span=message.length*6-1;
  const duration=tall?20:12;
  const offset=fixed?0:start-(start+span+1)*time/duration;
  return letterPixel(message,{
    textX:p.handColumn,textY:tall?Math.floor(p.handRow/2):p.handRow-top,
    textWidth:columns,textHeight:tall?Math.ceil(rows/2):7,
  },(columns-offset)/4);
}

function adaptedGravity(p,time,brightness) {
  const phase=gravityPhase(time);
  if(p.kind==='screw') {
    const inMargin=phase.mode==='scroll' ? p.v<.09||p.v>.91 : p.v>.44&&p.v<.56;
    const shimmer=Math.max(0,Math.sin(time*1.6+hash(p.position)*Math.PI*2))**8;
    return inMargin&&hash(p.position+7)>.65 ? scale([90,170,255],brightness*shimmer*.75) : [0,0,0];
  }
  let pixel,yellow=false;
  if(phase.mode==='scroll') {
    pixel=glyph('GRAVITY LAB',p,phase.time,{tall:true});
    yellow=Boolean(pixel&&pixel.character>=8);
  } else {
    pixel=glyph('GRAVITY',p,phase.time,{top:1});
    if(!pixel) {pixel=glyph('LAB',p,phase.time,{top:Math.max(8,p.handRows-8),fixed:p.handColumns>=17});yellow=Boolean(pixel);}
  }
  if(!pixel) return [0,0,0];
  const rgb=yellow ? pixel.row<2?[245,255,145]:[225,250,35] : pixel.row<2?[225,245,255]:[90,170,255];
  const pulse=phase.mode==='stacked'&&yellow ? .85+.15*(.5+.5*Math.sin(phase.time*2)) : 1;
  return scale(rgb,brightness*pulse);
}

function adaptedRain(p,time,brightness) {
  const column=Math.max(0,Math.min(p.handColumns-1,Math.round(p.handColumn)));
  if(hash(column+61)<.26) return [0,0,0];
  const speed=2.5+hash(column+8)*2;
  const head=Math.floor((time*speed+hash(column+17)*(p.handRows+6))%(p.handRows+6))-1;
  const behind=head-p.handRow;
  if(p.kind==='bolt') {
    if(behind<0||behind>5) return [0,0,0];
    return scale(behind===0?[140,255,150]:[0,255,35],brightness*(behind===0?1:(1-behind/6)**1.3));
  }
  if(behind<1||behind>5.5||hash(p.position+73)<.58) return [0,0,0];
  return scale([0,220,100],brightness*(1-behind/6)*.6);
}

export function frameFor(points,pattern,variant,time,brightness=1) {
  if(!PATTERNS.some(p=>p.id===pattern)) throw Error('Unknown experiment pattern');
  if(!['original','adapted'].includes(variant)) throw Error('Unknown pattern version');
  if(variant==='original') return originalFrame(points,pattern,time,brightness);
  if(pattern==='vortex') {
    const baseline=originalFrame(points,'vortex',time,brightness);
    return baseline.map((led,i)=>points[i].kind==='bolt'?led:{position:led.position,rgb:hsv(Math.atan2(points[i].y,points[i].x)/(Math.PI*2)*2+Math.hypot(points[i].x,points[i].y)*1.15-time*.10+.08,.95,brightness*.5)});
  }
  return points.map(p=>({position:p.position,rgb:pattern==='gravity'?adaptedGravity(p,time,brightness):adaptedRain(p,time,brightness)}));
}
