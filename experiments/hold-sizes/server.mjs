import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('./site/',import.meta.url));
const types={'.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
async function collect(dir,prefix=''){
  const result=new Map();
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.'))continue;
    if(entry.isDirectory())for(const [key,value] of await collect(join(dir,entry.name),prefix+entry.name+'/'))result.set(key,value);
    else if(entry.isFile()&&types[extname(entry.name)])result.set('/'+prefix+entry.name,join(dir,entry.name));
  }
  return result;
}
const files=await collect(root);
files.set('/',join(root,'index.html'));
const server=createServer(async(req,res)=>{
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Permissions-Policy','bluetooth=(self), camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
  if(path==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',experiment:'hold-sizes',version:process.env.RAILWAY_GIT_COMMIT_SHA||'local'}));return;}
  const file=files.get(path);
  if(!file){res.writeHead(404);res.end('Not found');return;}
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':path==='/'?'text/html; charset=utf-8':types[extname(file)],'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);}
  catch{res.writeHead(500);res.end('Unable to load experiment');}
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log(`Hold-size lab listening on ${server.address().port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();});
