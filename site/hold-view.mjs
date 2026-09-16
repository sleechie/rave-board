import { holdPolygons } from './hold-shapes.mjs?v=7';
const assets=new Map(),renderCache=new WeakMap();
export function loadHoldShapes(board){
  if(board.family!=='Original')return Promise.resolve(null);
  if(!assets.has(board.id)){
    const request=fetch(new URL(`./holds/${board.id}.json`,import.meta.url)).then(response=>{
      if(!response.ok)throw Error('Hold shapes unavailable');return response.json();
    }).then(data=>holdPolygons(board,data));
    assets.set(board.id,request);request.catch(()=>assets.delete(board.id));
  }
  return assets.get(board.id);
}
export function drawHoldShapes(ctx,{board,points,polygons,colors,width,height,ox,oy}){
  if(!polygons)return false;
  const key=[width,height,ox,oy].join(',');let cache=renderCache.get(ctx);
  if(!cache||cache.key!==key||cache.polygons!==polygons){
    const paths=new Map();
    for(const [position,vertices] of polygons){
      if(!vertices)continue;const path=new Path2D();
      for(let i=0;i<vertices.length;i+=2){const x=ox+vertices[i]*width,y=oy+vertices[i+1]*height;i?path.lineTo(x,y):path.moveTo(x,y);}
      path.closePath();paths.set(position,path);
    }
    cache={key,polygons,paths};renderCache.set(ctx,cache);
  }
  const scale=width/(board.bounds[1]-board.bounds[0]);ctx.lineJoin='round';
  for(const p of points){
    const rgb=colors.get(p.position)||[0,0,0],lit=rgb.some(c=>c>0),color=`rgb(${rgb.join(',')})`;
    let path=cache.paths.get(p.position);
    if(!path){path=new Path2D();path.arc(ox+p.u*width,oy+p.v*height,scale*2.7*(p.kind==='screw'?.45:1),0,Math.PI*2);}
    ctx.fillStyle='#191c16';ctx.fill(path);
    ctx.strokeStyle=lit?color:'#333a2c';ctx.lineWidth=lit?Math.max(.7,scale*(p.kind==='screw'?.32:.55)):.6;
    ctx.shadowColor=color;ctx.shadowBlur=lit?scale*(p.kind==='screw'?.9:1.6):0;
    ctx.stroke(path);ctx.shadowBlur=0;
  }
  return true;
}
