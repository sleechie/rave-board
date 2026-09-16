import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encodeFrame, apiFromName, BoardTransport, BoardPlayer, delay } from '../site/protocol.mjs';
import { EFFECTS, makeFrame, mapPoints, cornerFrame, gravityPhase } from '../site/effects.mjs';
import { cleanMessage, textDuration } from '../site/lettering.mjs';

// A receiving-side packet decoder. Checks packet boundaries, checksum, markers,
// LED ordering and color bits independently of the sender's implementation.
function decode(bytes, level) {
  let offset = 0, pending = [], frames = [];
  const stride = level === 3 ? 3 : 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset], 1);
    const length = bytes[offset + 1];
    assert.equal(bytes[offset + 3], 2);
    const body = Array.from(bytes.slice(offset + 4, offset + 4 + length));
    assert.equal((body.reduce((a,b) => a+b,0) + bytes[offset+2]) % 256, 255);
    assert.equal(bytes[offset + 4 + length], 3);
    assert.equal((length - 1) % stride, 0);
    const marker = body[0] - (level === 3 ? 81 : 77);
    assert.ok(marker >= 0 && marker <= 3);
    if (marker === 1 || marker === 3) pending = [];
    for (let i = 1; i < body.length; i += stride) {
      pending.push({ position: body[i] + ((level === 3 ? body[i+1] : body[i+1]&3) * 256),
        color: level === 3 ? body[i+2] : body[i+1] & 252 });
    }
    if (marker === 2 || marker === 3) { frames.push(pending); pending = []; }
    offset += length + 5;
  }
  assert.equal(offset, bytes.length);
  return frames;
}

test('matches the independent published Grip Connect API 2 and 3 wire fixtures', () => {
  assert.deepEqual([...encodeFrame([{position:513,rgb:[255,255,255]}],2)], [1,3,176,2,80,1,254,3]);
  assert.deepEqual([...encodeFrame([{position:513,rgb:[255,255,255]}],3)], [1,4,169,2,84,1,2,255,3]);
  assert.deepEqual([...encodeFrame([],2)], [1,1,175,2,80,3]);
  assert.deepEqual([...encodeFrame([],3)], [1,1,171,2,84,3]);
  assert.equal(apiFromName('Kilter Board#751737@3'),3);
  assert.equal(apiFromName('kilterboard'),2);
  assert.throws(() => apiFromName('kilterboard@4'));
  assert.throws(() => encodeFrame([{position:1024,rgb:[255,0,0]}],2));
  assert.throws(() => encodeFrame([{position:1,rgb:[NaN,0,0]}],3));
});

const data = JSON.parse(fs.readFileSync(new URL('../site/boards.json',import.meta.url)));
test('all 16 maps produce valid replacement frames for both controller versions and all 14 modes', () => {
  assert.equal(data.boards.length,16);
  assert.equal(EFFECTS.length,13);
  for (const board of data.boards) {
    const points = mapPoints(board,board.sets.map(s=>s.id));
    assert.ok(points.length >= 100);
    assert.equal(new Set(points.map(p=>p.position)).size,points.length);
    assert.ok(points.every(p=>p.u>0 && p.u<1 && p.v>0 && p.v<1));
    assert.equal(new Set(cornerFrame(points).map(p=>p.position)).size,4);
    for (const level of [2,3]) for (const effect of [...EFFECTS.map(e=>e.id),'tour']) {
      for (const time of [0,21.5,24,143.5,150]) {
        const frame = makeFrame(points,effect,time,0.85);
        const decoded = decode(encodeFrame(frame,level),level);
        assert.equal(decoded.length,1);
        assert.deepEqual(decoded[0].map(p=>p.position),points.map(p=>p.position));
        if (EFFECTS.some(e=>e.id===effect && e.category !== 'new')) {
          assert.ok(new Set(decoded[0].map(p=>p.color)).size > 8);
        }
      }
    }
  }
});

test('sparse frames omit only wire-black LEDs and replace stale lights on both API versions', () => {
  const points=mapPoints(data.boards.find(b=>b.id===10),[1,20]);
  for (const level of [2,3]) {
    const full=makeFrame(points,'rain',2,.85);
    const raw=encodeFrame(full,level), compact=encodeFrame(full,level,{omitDark:true});
    assert.ok(compact.length < raw.length * .4, `Rain should shrink materially (API ${level})`);
    const decodedFull=decode(raw,level)[0], decodedSparse=decode(compact,level)[0];
    assert.deepEqual(decodedSparse,decodedFull.filter(p=>p.color!==0));
    // A subsequent complete frame clears LEDs omitted from that frame.
    const frames=decode([...compact,...encodeFrame([{position:900,rgb:[255,0,0]}],level,{omitDark:true}),...encodeFrame([{position:900,rgb:[1,1,1]}],level,{omitDark:true})],level);
    assert.equal(frames[1].length,1); assert.deepEqual(frames[2],[]);
  }
});

test('Gravity Lab alternates original emblem and readable GRAVITY LAB letters on handholds', () => {
  const points=mapPoints(data.boards.find(b=>b.id===10),[1,20]);
  const mark=makeFrame(points,'gravity',0,1);
  const lit=mark.filter(p=>p.rgb.some(c=>c>0));
  assert.ok(lit.length>60 && lit.length<points.length*.7);
  assert.equal(gravityPhase(0).mode,'logo');assert.equal(gravityPhase(12).mode,'text');
  assert.equal(gravityPhase(8+textDuration('GRAVITY LAB')).mode,'logo');
  const letters=makeFrame(points,'gravity',8+17/4,1);
  const byPosition=new Map(letters.map(p=>[p.position,p.rgb]));
  const expected=['01110','10001','10000','10111','10001','10001','01110'];
  for(let row=0;row<7;row++)for(let col=0;col<5;col++) {
    const hold=points.find(p=>p.textX===col && p.textY===row+6);
    assert.ok(hold,'Handhold grid must be complete');
    assert.equal(byPosition.get(hold.position).some(c=>c>0),expected[row][col]==='1',`G pixel ${col},${row}`);
  }
  assert.ok(points.filter(p=>p.textX===-1).every(p=>byPosition.get(p.position).every(c=>c===0)));
  assert.equal(cleanMessage('<hello> 💚'), 'HELLO');
});

test('fast player removes the old 4 fps ceiling while keeping stop final', async () => {
  const times=[];
  const transport=new BoardTransport({properties:{writeWithoutResponse:true},writeValueWithoutResponse:async()=>{}},3,()=>{},0);
  const player=new BoardPlayer(transport,()=>[{position:1,rgb:[0,255,0]}],()=>times.push(performance.now()));
  player.start();await delay(300);await player.stop();await player.done;
  assert.ok(times.length>=6,`Expected well above 4 fps with instant writes, saw ${times.length} frames/300ms`);
  const count=times.length;await delay(100);assert.equal(times.length,count);
});

test('stopping mid-frame clears AFTER the entire frame, without interleaved writes or later relighting', async () => {
  const writes = []; let active=0, maxActive=0, began;
  const firstWrite = new Promise(resolve => { began=resolve; });
  const transport = new BoardTransport({properties:{writeWithoutResponse:true},writeValueWithoutResponse:async chunk=>{
    maxActive=Math.max(maxActive,++active); began(); await delay(1); writes.push([...chunk]); active--;
  }},3,()=>{},0);
  const frame=Array.from({length:300},(_,i)=>({position:i,rgb:[255,64,128]}));
  const player=new BoardPlayer(transport,()=>frame);
  player.start(); await firstWrite;
  await player.stop(); await player.done;
  assert.equal(maxActive,1);
  assert.ok(writes.every(c=>c.length<=20));
  const decoded=decode(writes.flat(),3);
  assert.equal(decoded.length,2); assert.equal(decoded[0].length,300); assert.deepEqual(decoded[1],[]);
  const count=writes.length; await delay(300); assert.equal(writes.length,count);
});

test('a failed write closes the transport and does not claim a successful clear', async () => {
  let failures=0, sends=0;
  const transport=new BoardTransport({properties:{write:true},writeValueWithResponse:async()=>{
    sends++;throw new Error('Link lost');
  }},2,()=>failures++,0);
  await assert.rejects(transport.send([{position:1,rgb:[255,0,0]}]),/Link lost/);
  await assert.rejects(transport.send([]),/disconnected/);
  assert.equal(failures,1);assert.equal(sends,1);assert.equal(transport.closed,true);
});

test('old browsers with only writeValue still send valid frames', async()=>{
  const writes=[];
  const transport=new BoardTransport({properties:{write:true},writeValue:async c=>writes.push([...c])},2,()=>{},0);
  await transport.send([{position:512,rgb:[0,255,0]}]);
  assert.deepEqual(decode(writes.flat(),2),[[{position:512,color:48}]]);
});
