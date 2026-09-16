import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildPoints,footprint,frameFor,PATTERNS } from '../site/model.mjs';
import { EFFECTS,TOUR,makeFrame,mapPoints } from '../site/baseline/effects.mjs';
import { encodeFrame,quantize } from '../site/baseline/protocol.mjs';
const boards=JSON.parse(fs.readFileSync(new URL('../site/boards.json',import.meta.url))).boards;
const board=boards.find(b=>b.id===10),points=buildPoints(board);

test('the baseline is frozen byte-for-byte at its recorded source revision',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../baseline-manifest.json',import.meta.url)));
  assert.equal(manifest.sourceCommit,'171728a2d1334a1532f67d36ae727fb952295518');
  for(const [name,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../site/baseline/'+name,import.meta.url))).digest('hex'),hash,name);
});

test('Original classifications survive filtering, and do not leak to Homewall',()=>{
  assert.equal(points.filter(p=>p.kind==='bolt').length,323);assert.equal(points.filter(p=>p.kind==='screw').length,153);
  assert.ok(buildPoints(board,[20]).every(p=>p.kind==='screw'&&p.setId===20));
  assert.throws(()=>buildPoints({...board,family:'Homewall'}),/Original/);
  const hand=points.find(p=>p.kind==='bolt'),foot=points.find(p=>p.kind==='screw');
  assert.equal(footprint(hand,10,.45).radius,10);assert.equal(footprint(foot,10,.45).radius,4.5);
  assert.equal(footprint(hand,10,.2).radius,footprint(hand,10,.8).radius);
});

test('Original variant matches the current app exactly for every included layout',()=>{
  assert.deepEqual(PATTERNS.map(p=>p.id),[...EFFECTS.map(p=>p.id),'tour']);
  for(const b of boards)for(const setIds of [[1,20],[1],[20]])for(const pattern of PATTERNS){
    for(const time of [4,24,31.9,32]){
      const options={message:'CLIMB 42!'};
      assert.deepEqual(frameFor(buildPoints(b,setIds),pattern.id,'original',time,.85,options),makeFrame(mapPoints(b,setIds),pattern.id,time,.85,options));
    }
  }
});

test('adapted patterns remain valid for both protocols and all six Original layouts',()=>{
  assert.equal(boards.length,6);
  for(const b of boards)for(const sets of [[1,20],[1],[20],[]]){const p=buildPoints(b,sets);for(const pattern of PATTERNS)for(const time of [0,4,19.9,20,24,31.9]){
    const frame=frameFor(p,pattern.id,'adapted',time,.85);
    assert.deepEqual(frame.map(led=>led.position),p.map(hold=>hold.position));
    for(const level of [2,3])assert.ok(encodeFrame(frame,level).length>0);
  }}
});

test('every adapted animation uses bright screw-ons after either controller color conversion',()=>{
  const feet=points.map((p,i)=>({p,i})).filter(({p})=>p.kind==='screw');
  for(const pattern of PATTERNS)for(const level of [2,3]){
    const visible=new Set();let peak=0;
    for(let time=0;time<32;time+=.5){
      const frame=frameFor(points,pattern.id,'adapted',time,.85);
      for(const {i} of feet){
        const rgb=quantize(frame[i].rgb,level);
        if(rgb.some(c=>c>0))visible.add(i);
        peak=Math.max(peak,...rgb);
      }
    }
    assert.ok(visible.size>feet.length*.5,`${pattern.id} API ${level}: only ${visible.size} of ${feet.length} screw-ons visible`);
    assert.ok(peak>=170,`${pattern.id} API ${level}: screw-ons never shine brightly`);
  }
});

test('lettering uses screw-ons within the text area, and both versions honor the message',()=>{
  for(const pattern of ['gravity','marquee'])for(const time of [4,24]){
    const adapted=frameFor(points,pattern,'adapted',time,.85);
    const lit=(p,i)=>quantize(adapted[i].rgb,2).some(c=>c>0);
    assert.ok(points.some((p,i)=>p.kind==='screw'&&p.v>=.2&&p.v<=.8&&lit(p,i)),pattern);
    assert.ok(points.some((p,i)=>p.kind==='bolt'&&lit(p,i)),pattern);
  }
  for(const variant of ['original','adapted']){
    assert.notDeepEqual(frameFor(points,'marquee',variant,4,.85,{message:'AAAA'}),frameFor(points,'marquee',variant,4,.85,{message:'IIII'}));
    assert.deepEqual(frameFor(points,'marquee',variant,4,.85,{message:'a <b>'}),frameFor(points,'marquee',variant,4,.85,{message:'A  B'}));
  }
});

test('adapted cycle reaches every scene and remains valid through each transition',()=>{
  TOUR.forEach((id,index)=>{
    assert.deepEqual(frameFor(points,'tour','adapted',index*32+4,.85),frameFor(points,id,'adapted',4,.85));
    for(const level of [2,3])assert.ok(encodeFrame(frameFor(points,'tour','adapted',index*32+31.9,.85),level).length>0);
  });
  for(const pattern of PATTERNS){
    assert.ok(frameFor(points,pattern.id,'adapted',4,0).every(p=>p.rgb.every(c=>c===0)));
    assert.notDeepEqual(frameFor(points,pattern.id,'adapted',4,.85),frameFor(points,pattern.id,'original',4,.85));
  }
});

test('footprint estimates are independent of transmitted animation colors',()=>{
  const before=frameFor(points,'rain','adapted',3,.85);
  for(const p of points){footprint(p,8,.2);footprint(p,8,.8);}
  assert.deepEqual(frameFor(points,'rain','adapted',3,.85),before);
});
