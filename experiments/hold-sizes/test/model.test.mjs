import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildPoints,footprint,frameFor,PATTERNS } from '../site/model.mjs';
import { makeFrame,mapPoints } from '../site/baseline/effects.mjs';
import { encodeFrame } from '../site/baseline/protocol.mjs';
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
  for(const b of boards)for(const setIds of [[1,20],[1],[20]])for(const pattern of PATTERNS){
    assert.deepEqual(frameFor(buildPoints(b,setIds),pattern.id,'original',4,.85),makeFrame(mapPoints(b,setIds),pattern.id,4,.85));
  }
});

test('adapted patterns remain valid for both protocols and all six Original layouts',()=>{
  assert.equal(boards.length,6);
  for(const b of boards){const p=buildPoints(b);for(const pattern of PATTERNS)for(const time of [0,4,19.9,20,24,31.9]){
    const frame=frameFor(p,pattern.id,'adapted',time,.85);
    assert.deepEqual(frame.map(led=>led.position),p.map(hold=>hold.position));
    for(const level of [2,3])assert.ok(encodeFrame(frame,level).length>0);
  }}
});

test('adapted lettering leaves screw-ons out of the essential text area',()=>{
  const original=frameFor(points,'gravity','original',4,.85),adapted=frameFor(points,'gravity','adapted',4,.85);
  const textFeet=points.map((p,i)=>({p,i})).filter(({p})=>p.kind==='screw'&&p.v>=.09&&p.v<=.91);
  assert.ok(textFeet.some(({i})=>original[i].rgb.some(c=>c>0)));
  assert.ok(textFeet.every(({i})=>adapted[i].rgb.every(c=>c===0)));
  assert.ok(points.some((p,i)=>p.kind==='bolt'&&adapted[i].rgb.some(c=>c>0)));
});

test('footprint estimates are independent of transmitted animation colors',()=>{
  const before=frameFor(points,'rain','adapted',3,.85);
  for(const p of points){footprint(p,8,.2);footprint(p,8,.8);}
  assert.deepEqual(frameFor(points,'rain','adapted',3,.85),before);
});
