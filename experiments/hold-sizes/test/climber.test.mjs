import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPoints } from '../site/model.mjs';
import { climberFrame } from '../site/climber.mjs';
import { quantize,encodeFrame } from '../site/baseline/protocol.mjs';
const board=JSON.parse(fs.readFileSync(new URL('../site/boards.json',import.meta.url))).boards.find(b=>b.id===10);
const points=buildPoints(board);
function center(time,adapted=false){
 const frame=climberFrame(points,time,.85,adapted);let sum=0,y=0;
 for(let i=0;i<points.length;i++)if(points[i].kind==='bolt'){
  const light=Math.max(...quantize(frame[i].rgb,2));sum+=light;y+=(1-points[i].v*2)*light;
 }
 assert.ok(sum>0,`visible at ${time}s`);return y/sum;
}
test('climber visibly rises, falls, and sends the explosion up from the floor',()=>{
 for(const adapted of [false,true]){
  assert.ok(center(16,adapted)-center(2,adapted)>.55);
  assert.ok(center(19,adapted)-center(21.7,adapted)>.75);
  assert.ok(center(24.8,adapted)-center(22.2,adapted)>.6);
  const green=climberFrame(points,8,.85,adapted).filter(p=>p.rgb.some(c=>c>0));
  assert.ok(green.every(p=>p.rgb[1]>p.rgb[0]&&p.rgb[1]>p.rgb[2]));
  for(const time of [2,18,20,21.7,22.2,24.8,28,31.9])for(const level of [2,3])assert.ok(encodeFrame(climberFrame(points,time,.85,adapted),level).length>0);
  assert.deepEqual(climberFrame(points,2,.85,adapted),climberFrame(points,34,.85,adapted));
  assert.ok(climberFrame(points,31.9,.85,adapted).every(p=>p.rgb.every(c=>c===0)));
 }
});
