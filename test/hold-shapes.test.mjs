import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { holdPolygons } from '../site/hold-shapes.mjs';
const boards=JSON.parse(fs.readFileSync(new URL('../site/boards.json',import.meta.url))).boards.filter(b=>b.family==='Original');
const asset=id=>JSON.parse(fs.readFileSync(new URL(`../site/holds/${id}.json`,import.meta.url)));

test('each shape is tied to the exact layout, LED address, position and hold set',()=>{
  const expectedCounts={14:225,8:311,10:476,27:441,7:476,28:641};
  for(const board of boards){
    const data=asset(board.id),polygons=holdPolygons(board,data);
    assert.deepEqual([...polygons.keys()],board.points.map(p=>p[0]));
    assert.equal([...polygons.values()].filter(Boolean).length,expectedCounts[board.id]);
    assert.equal(new Set(data.holds.map(p=>p.placementId)).size,board.points.length);
    for(const vertices of polygons.values())if(vertices){
      assert.ok(vertices.every(Number.isFinite));
      assert.ok(vertices.every(v=>v>=-.05&&v<=1.05),'shapes stay within the board area');
      const xs=vertices.filter((_,i)=>i%2===0),ys=vertices.filter((_,i)=>i%2===1);
      assert.ok(Math.max(...xs)>Math.min(...xs));assert.ok(Math.max(...ys)>Math.min(...ys));
    }
  }
});

test('artwork offsets preserve orientation and each hold own size',()=>{
  const board=boards.find(b=>b.id===10),data=asset(10),polygons=holdPolygons(board,data);
  const hold=data.holds.find(p=>p.setId===20),ring=polygons.get(hold.position);
  // 1080x1170 art spans 144x156 board-coordinate units. Art y points down.
  assert.ok(Math.abs(ring[0]-(hold.x+hold.outline[0]*4)/144)<1e-12);
  assert.ok(Math.abs(ring[1]-(1-hold.y/156+hold.outline[1]*4/156))<1e-12);
  const widths=setId=>data.holds.filter(p=>p.setId===setId).map(p=>{
    const xs=polygons.get(p.position).filter((_,i)=>i%2===0);return Math.max(...xs)-Math.min(...xs);
  }).sort((a,b)=>a-b);
  const bolts=widths(1),feet=widths(20);
  assert.ok(feet[Math.floor(feet.length/2)]<bolts[Math.floor(bolts.length/2)]*.65);
  assert.ok(new Set(bolts.map(v=>v.toFixed(5))).size>200,'bolt-ons retain individual sizes');
});

test('mismatched or damaged geometry is rejected without guessing LED assignments',()=>{
  const board=boards.find(b=>b.id===10);
  const cases=[
    data=>data.boardId=8,
    data=>data.bounds[0]=1,
    data=>data.holds.pop(),
    data=>data.holds[0].position=data.holds[1].position,
    data=>data.holds[0].setId=1,
    data=>data.holds[0].x+=1,
    data=>data.holds[0].outline=[0,NaN,1,1,2,2],
    data=>data.artSize=[0,1170],
  ];
  for(const mutate of cases){const data=asset(10);mutate(data);assert.throws(()=>holdPolygons(board,data));}
});
