// Convert pinned Boardsesh outlines to our LED addresses. Run only when updating
// the vendored assets: node scripts/import-hold-shapes.mjs BOARDSESH_REPO GRIP_REPO
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const [boardseshRepo,gripRepo]=process.argv.slice(2);
if(!boardseshRepo||!gripRepo)throw Error('Pass local Boardsesh and Grip Connect repository paths.');
const revisions={boardsesh:'cd54e96b5e9483688525afd6d349c96ff9ff6266',grip:'861a0640630ee7edd349833a822e0c6626633fd9'};
const source=(repo,revision,path)=>execFileSync('git',['-C',repo,'show',`${revision}:${path}`],{maxBuffer:20*1024*1024});
const grip=name=>JSON.parse(source(gripRepo,revisions.grip,`examples/aurora/src/data/kilter/${name}.json`));
const holes=new Map(grip('holes').map(p=>[p.id,p]));
const placements=grip('placements').filter(p=>p.layout_id===1&&[1,20].includes(p.set_id));
const leds=grip('leds'),layers=grip('product_sizes_layouts_sets');
const boards=JSON.parse(readFileSync(new URL('../site/boards.json',import.meta.url))).boards.filter(board=>board.family==='Original');
mkdirSync(new URL('../site/holds/',import.meta.url),{recursive:true});
for(const board of boards){
  const sourcePath=`packages/shared/board-art-geometry/src/generated/kilter/1-${board.id}.cjs`;
  const context={module:{exports:{}}};
  runInNewContext(source(boardseshRepo,revisions.boardsesh,sourcePath).toString(),context,{timeout:1000,contextCodeGeneration:{strings:false,wasm:false}});
  const outlines=context.module.exports.outlines;
  const ledByHole=new Map(leds.filter(p=>p.product_size_id===board.id).map(p=>[p.hole_id,p.position]));
  const matches=new Map();
  for(const placement of placements){
    const hole=holes.get(placement.hole_id),led=ledByHole.get(hole.id);
    if(led===undefined)continue;
    if(matches.has(led))throw Error(`Ambiguous LED ${led}`);
    matches.set(led,{placement,hole});
  }
  const layer=layers.find(p=>p.product_size_id===board.id&&p.layout_id===1&&p.set_id===1);
  const png=source(gripRepo,revisions.grip,`examples/aurora/public/img/kilter/${layer.image_filename}`);
  if(png.subarray(1,4).toString()!=='PNG')throw Error('Expected PNG artwork');
  const artSize=[png.readUInt32BE(16),png.readUInt32BE(20)];
  const holds=board.points.map(([position,x,y,setId])=>{
    const match=matches.get(position);
    if(!match||match.hole.x!==x||match.hole.y!==y||match.placement.set_id!==setId)throw Error(`Board ${board.id}, LED ${position}: map differs`);
    return {position,x,y,setId,placementId:match.placement.id,outline:outlines[match.placement.id]||null};
  });
  const data={boardId:board.id,bounds:board.bounds,artSize,revisions,sourcePath,
    notice:'Converted from Boardsesh placement IDs to Rave Board LED addresses. Traced artwork shapes; light rims approximate. See /HOLD-SHAPES-NOTICE.txt and /BOARDSESH-LICENSE.txt.',holds};
  writeFileSync(new URL(`../site/holds/${board.id}.json`,import.meta.url),JSON.stringify(data)+'\n');
  console.log(`${board.name}: ${holds.filter(p=>p.outline).length}/${holds.length} outlines, artwork ${artSize.join('x')}`);
}
writeFileSync(new URL('../site/BOARDSESH-LICENSE.txt',import.meta.url),source(boardseshRepo,revisions.boardsesh,'LICENSE'));
