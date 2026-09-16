import { EFFECTS,TOUR,mapPoints,makeFrame as originalFrame,hsv,gravityPhase } from './baseline/effects.mjs';
import { CLIMBER,climberFrame } from './climber.mjs';
import { letterPixel,cleanMessage,textDuration } from './baseline/lettering.mjs';

const NOTES={
  gravity:'Large holds form the letters; screw-ons add colored edges, highlights, and surrounding twinkles.',
  rain:'Large holds carry rain heads and tails; screw-ons carry their own bright droplets and connecting trails.',
  lasers:'Broad beams sweep the bolt-ons while thin, bright laser trails thread through the screw-ons.',
  warp:'Large holds carry star heads; screw-ons add a denser field of fast stars and fine trails.',
  fireworks:'Bolt-ons form the expanding bursts; screw-ons carry the smaller sparks and afterglow.',
  marquee:'Large holds form the message; screw-ons stitch color and moving highlights around the letter strokes.',
  vortex:'A broad spiral on the bolt-ons with a tighter, counter-moving spiral on the screw-ons.',
  plasma:'Broad color fields on the bolt-ons, with bright moving filaments across the screw-ons.',
  kaleido:'Large holds form sixfold petals; screw-ons trace finer mirrored spokes and rings.',
  tunnel:'Large holds form the wide tunnel rings; screw-ons add fast moving beads between them.',
  aurora:'Broad curtains on the bolt-ons, with narrower bright ribbons on the screw-ons.',
  liquid:'Large color pools on the bolt-ons, with moving contour lines through the screw-ons.',
};
export const PATTERNS=[
  CLIMBER,
  ...EFFECTS.map(effect=>({id:effect.id,name:effect.name,note:NOTES[effect.id]})),
  {id:'tour',name:'Cycle effects',note:'Cycles through the adapted patterns, including each design’s screw-on details.'},
];
const TAU=Math.PI*2;
const fract=x=>x-Math.floor(x);
const hash=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
const scale=(rgb,v)=>rgb.map(c=>Math.max(0,Math.min(255,Math.round(c*v))));
const STARS=Array.from({length:58},(_,i)=>{
  const angle=hash(i+1)*TAU;return {cos:Math.cos(angle),sin:Math.sin(angle),phase:hash(i+41),hue:hash(i+82)};
});

export function buildPoints(board,setIds=[1,20]) {
  if(board.family!=='Original')throw Error('This experiment is only for Kilter Original layouts.');
  const rows=new Map(board.points.map(p=>[p[0],p]));
  const hands=board.points.filter(p=>p[3]===1);
  const xs=[...new Set(hands.map(p=>p[1]))].sort((a,b)=>a-b);
  const ys=[...new Set(hands.map(p=>p[2]))].sort((a,b)=>b-a);
  const dx=xs[1]-xs[0]||8,dy=ys[0]-ys[1]||8;
  return mapPoints(board,setIds).map(p=>{
    const row=rows.get(p.position);
    if(![1,20].includes(row[3]))throw Error('Unknown hold set in Original layout.');
    return {...p,setId:row[3],kind:row[3]===1?'bolt':'screw',handColumn:(row[1]-xs[0])/dx,
      handRow:(ys[0]-row[2])/dy,handColumns:xs.length,handRows:ys.length};
  });
}

// Drawing-only estimate; it never scales or removes colors in a board frame.
export function footprint(point,handRadius,footRatio=.45) {
  const ratio=Math.max(.2,Math.min(.8,Number(footRatio)||.45));
  const radius=handRadius*(point.kind==='screw'?ratio:1);
  return {radius,stroke:radius*.28,glow:radius*.85};
}

function glyph(message,p,time,{top=0,tall=false,fixed=false,duration=tall?20:12}={}) {
  const columns=p.handColumns,rows=p.handRows,start=columns*.78,span=message.length*6-1;
  const offset=fixed?0:start-(start+span+1)*time/duration;
  return letterPixel(message,{
    textX:p.handColumn,textY:tall?Math.floor(p.handRow/2):p.handRow-top,
    textWidth:columns,textHeight:tall?Math.ceil(rows/2):7,
  },(columns-offset)/4);
}

function textSample(p,time,pattern,message) {
  if(pattern==='marquee') {
    const duration=textDuration(message,p.handColumns);
    const pixel=glyph(message,p,time%duration,{tall:true,duration});
    return pixel?{pixel,color:hsv(pixel.character*.09+time*.035,.88,1),pulse:1}:null;
  }
  const phase=gravityPhase(time);let pixel,yellow=false;
  if(phase.mode==='scroll') {
    pixel=glyph('GRAVITY LAB',p,phase.time,{tall:true});yellow=Boolean(pixel&&pixel.character>=8);
  } else {
    pixel=glyph('GRAVITY',p,phase.time,{top:1});
    if(!pixel){pixel=glyph('LAB',p,phase.time,{top:Math.max(8,p.handRows-8),fixed:p.handColumns>=17});yellow=Boolean(pixel);}
  }
  if(!pixel)return null;
  return {pixel,color:yellow?(pixel.row<2?[245,255,145]:[225,250,35]):(pixel.row<2?[225,245,255]:[90,170,255]),
    pulse:phase.mode==='stacked'&&yellow ? .85+.15*(.5+.5*Math.sin(phase.time*2)) : 1};
}

function adaptedText(p,time,brightness,pattern,message) {
  if(p.kind==='bolt') {
    const sample=textSample(p,time,pattern,message);
    return sample?scale(sample.color,brightness*sample.pulse):[0,0,0];
  }
  // Screw-ons sit between the main grid points. Sample nearby letter strokes
  // to create a colored stitch/edge, including inside the text's height range.
  const samples=[];
  for(const [dx,dy] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]) {
    const sample=textSample({...p,handColumn:Math.round(p.handColumn+dx),handRow:Math.round(p.handRow+dy)},time,pattern,message);
    if(sample)samples.push(sample);
  }
  if(samples.length) {
    const sample=samples[0],highlight=.5+.5*Math.sin(time*2.4-p.handColumn*.65+p.handRow*.3);
    const color=sample.color.map((c,i)=>Math.round(c*(.75+.25*highlight)+(i===2?255:230)*(.15*(1-highlight))));
    return scale(color,brightness*(samples.length<4?.75+.25*highlight:.6+.25*highlight));
  }
  const twinkle=Math.max(0,Math.sin(time*1.7+hash(p.position+31)*TAU))**14;
  return twinkle>.35?scale(pattern==='gravity'?[110,205,255]:hsv(hash(p.position),.65,1),brightness*twinkle):[0,0,0];
}

function adaptedRain(p,time,brightness) {
  const column=Math.max(0,Math.min(p.handColumns-1,Math.round(p.handColumn)));
  const speed=2.5+hash(column+8)*2;
  const head=Math.floor((time*speed+hash(column+17)*(p.handRows+6))%(p.handRows+6))-1;
  const behind=head-p.handRow;
  if(p.kind==='bolt') {
    if(hash(column+61)<.26||behind<0||behind>5)return [0,0,0];
    return scale(behind===0?[140,255,150]:[0,255,35],brightness*(behind===0?1:(1-behind/6)**1.3));
  }
  const stream=Math.floor(p.handColumn*2),fineHead=(time*(4.2+hash(stream+37)*2.1)+hash(stream+91)*(p.handRows+4))%(p.handRows+4)-1;
  const distance=fineHead-p.handRow;
  const drop=distance>=-.3&&distance<3?Math.max(0,1-Math.max(0,distance)/3):0;
  const connection=behind>=.5&&behind<=4?.65*(1-behind/5):0;
  const light=Math.max(drop,connection);
  return light>0?scale(drop>.8?[165,255,210]:[0,255,90],brightness*light):[0,0,0];
}

function adaptedLasers(p,time,brightness) {
  let best=0,color=[0,0,0];
  const fine=p.kind==='screw';
  for(let i=0;i<5;i++) {
    const angle=time*(.18+i*.02)+i*1.3;
    const shifted=fine?angle+.06*Math.sin(time+i):angle;
    const distance=Math.abs(p.x*Math.cos(shifted)+p.y*Math.sin(shifted)-Math.sin(time*.35+i)*.35);
    const width=fine?.065:.13;
    const light=Math.max(0,1-distance/width)**(fine?.55:1);
    if(light>best){best=light;color=hsv(i/5+time*.025+(fine?.12:0),fine?.78:.96,brightness*light);}
  }
  return color;
}

function adaptedWarp(p,time,brightness) {
  const fine=p.kind==='screw';let best=0,color=[0,0,0];
  const stars=fine?STARS:STARS.slice(0,22);
  for(const star of stars) {
    const phase=fract(time*(fine?.23:.16)+star.phase),radius=.03+phase*phase*1.8;
    const dx=p.x-star.cos*radius,dy=p.y-star.sin*radius;
    const along=dx*star.cos+dy*star.sin,across=Math.abs(dx*star.sin-dy*star.cos);
    const width=fine?.025+phase*.045:.065+phase*.06,length=fine?.12+phase*.3:.07+phase*.11;
    const light=along<width&&along>-length?Math.max(0,1-across/width)*Math.max(0,1+Math.min(0,along)/length):0;
    if(light>best){best=light;color=hsv(star.hue+time*.02,fine?.7:.9,brightness*Math.min(1,light*(fine?1.5:1.15)));}
  }
  return color;
}

function adaptedFireworks(p,time,brightness) {
  const fine=p.kind==='screw';let best=0,color=[0,0,0];
  for(let i=0;i<4;i++) {
    const cycle=time*.22+i*.31,age=fract(cycle),seed=Math.floor(cycle)*13+i;
    const dx=p.x-(hash(seed+10)-.5)*1.35,dy=p.y-(hash(seed+31)-.5)*1.25+age*age*.22;
    const radius=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    const ring=Math.max(0,1-Math.abs(radius-age*.9)/(fine?.095:.14));
    const spokes=.25+.75*Math.max(0,Math.cos(angle*(fine?14:7)+seed));
    const tail=fine?Math.max(0,1-Math.abs(radius-age*.68)/.075)*Math.max(0,Math.cos(angle*11-seed)):0;
    const light=Math.max(ring*spokes,tail*.8)*(1-age*.7);
    if(light>best){best=light;color=hsv(hash(seed)+(fine?.08:0),fine?.8:.95,brightness*Math.min(1,light*1.5));}
  }
  return color;
}

function adaptedField(p,pattern,time,brightness) {
  const {x,y}=p,fine=p.kind==='screw',r=Math.hypot(x,y),a=Math.atan2(y,x);
  let h=0,v=1;
  switch(pattern) {
    case 'vortex':
      h=fine?a/TAU*3-r*1.55+time*.14+.08:a/TAU*2+r*1.15-time*.10;
      v=fine?.55+.45*Math.sin(a*6-r*13+time*1.3)**2:.75+.25*Math.sin(a*3-r*7+time*.9)**2;
      break;
    case 'plasma': {
      const field=Math.sin(x*3+time*.5)+Math.sin(y*3.2-time*.45)+Math.sin((x+y)*2.1+time*.3);
      h=field*.2+time*.035+(fine?.15:0);
      v=fine?.30+.70*(1-Math.abs(Math.sin(field*3.5-time*.4)))**3:.8+.2*Math.sin(field)**2;
      break;
    }
    case 'kaleido': {
      const fold=Math.cos(a*6+Math.sin(time*.13));
      h=fold*.3+r*.75+time*.04+(fine?.14:0);
      v=fine?.4+.6*Math.cos(a*12+r*11-time*.8)**6:.7+.3*Math.sin(fold*3+r*5-time*.6)**2;
      break;
    }
    case 'tunnel':
      h=r*(fine?2.8:1.5)-time*(fine?.26:.16)+a/TAU*.35;
      v=fine?.35+.65*Math.cos(r*18-time*2.4+a*.4)**8:.6+.4*(.5+.5*Math.cos(r*9-time*1.4));
      break;
    case 'aurora': {
      const wave=Math.sin(x*2.6+time*.4)*.35+Math.sin(x*5-time*.2)*.12;
      h=y*.6+wave+time*.04+(fine?.1:0);
      v=fine?.35+.65*Math.cos((y+wave)*9+time*.7)**6:.75+.25*Math.cos((y+wave)*3.5)**2;
      break;
    }
    case 'liquid': {
      const field=Math.sin(x*2.4+Math.sin(y*3+time*.35))+Math.cos(y*2.6+Math.cos(x*3-time*.3));
      h=field*.34+time*.05+(fine?.16:0);
      v=fine?.3+.7*(1-Math.abs(Math.sin(field*5.5-time*.25)))**4:.8+.2*Math.sin(field*2)**2;
      break;
    }
    default:throw Error('Missing adapted pattern');
  }
  return hsv(h,.94,v*brightness);
}

function adaptedColor(p,pattern,time,brightness,options) {
  if(pattern==='gravity'||pattern==='marquee')return adaptedText(p,time,brightness,pattern,cleanMessage(options.message));
  if(pattern==='rain')return adaptedRain(p,time,brightness);
  if(pattern==='lasers')return adaptedLasers(p,time,brightness);
  if(pattern==='warp')return adaptedWarp(p,time,brightness);
  if(pattern==='fireworks')return adaptedFireworks(p,time,brightness);
  return adaptedField(p,pattern,time,brightness);
}

export function frameFor(points,pattern,variant,time,brightness=1,options={}) {
  if(!PATTERNS.some(p=>p.id===pattern))throw Error('Unknown experiment pattern');
  if(!['original','adapted'].includes(variant))throw Error('Unknown pattern version');
  if(pattern==='climber')return climberFrame(points,time,brightness,variant==='adapted');
  if(variant==='original')return originalFrame(points,pattern,time,brightness,options);
  let id=pattern,next,mix=0,sceneTime=time;
  if(pattern==='tour') {
    const scene=time/32,index=Math.floor(scene)%TOUR.length;
    id=TOUR[index];next=TOUR[(index+1)%TOUR.length];sceneTime=time%32;
    mix=Math.max(0,(fract(scene)-.93)/.07);mix=mix*mix*(3-2*mix);
  }
  return points.map(p=>{
    let rgb=adaptedColor(p,id,sceneTime,brightness,options);
    if(mix){const other=adaptedColor(p,next,0,brightness,options);rgb=rgb.map((c,i)=>Math.round(c*(1-mix)+other[i]*mix));}
    return {position:p.position,rgb};
  });
}
