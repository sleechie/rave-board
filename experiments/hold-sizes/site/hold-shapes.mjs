// Geometry is preview-only. It never changes animation colors or LED addresses.
export function holdPolygons(board,data){
  if(data.boardId!==board.id||JSON.stringify(data.bounds)!==JSON.stringify(board.bounds))throw Error('Hold shapes belong to a different board.');
  if(!Array.isArray(data.artSize)||data.artSize.length!==2||!data.artSize.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid artwork dimensions.');
  if(!Array.isArray(data.holds)||data.holds.length!==board.points.length)throw Error('Incomplete hold map.');
  const rows=new Map(board.points.map(p=>[p[0],p]));
  const [left,right,bottom,top]=board.bounds;
  const rx=4/(right-left),ry=4*data.artSize[0]/((right-left)*data.artSize[1]);
  const polygons=new Map();
  for(const hold of data.holds){
    const {position,x,y,setId,outline}=hold,row=rows.get(position);
    if(!row||polygons.has(position)||row[1]!==x||row[2]!==y||row[3]!==setId)throw Error('Hold shapes do not match the LED map.');
    if(outline===null){polygons.set(position,null);continue;}
    if(!Array.isArray(outline)||outline.length<6||outline.length%2||!outline.every(Number.isFinite))throw Error('Invalid hold outline.');
    const cx=(x-left)/(right-left),cy=1-(y-bottom)/(top-bottom);
    polygons.set(position,outline.map((v,i)=>i%2?cy+v*ry:cx+v*rx));
  }
  return polygons;
}
