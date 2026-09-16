import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./site/', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8' };
const pages = { '/':'index.html', '/about':'about.html', '/rave':'rave.html' };
const aliases = { '/index.html':'/', '/about.html':'/about', '/rave.html':'/rave', '/about/':'/about', '/rave/':'/rave' };
// Only serve intentional public assets. Repo docs, archives and dotfiles stay out.
async function publicFiles(folder, prefix = '') {
  const files = new Map();
  for (const entry of await readdir(folder, { withFileTypes:true })) {
    if (entry.name.startsWith('.')) continue;
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      for (const [name,path] of await publicFiles(join(folder,entry.name),relative+'/')) files.set(name,path);
    } else if (entry.isFile() && types[extname(entry.name)] && extname(entry.name) !== '.html') {
      files.set('/'+relative,resolve(folder,entry.name));
    }
  }
  return files;
}
const assets = await publicFiles(root);
const server = createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','bluetooth=(self), camera=(), microphone=(), geolocation=()');
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{'Allow':'GET, HEAD'}); res.end(); return; }
  let url, path;
  try { url = new URL(req.url,'http://localhost'); path = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400);res.end('Bad request');return; }
  if (path === '/healthz') {
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(req.method==='HEAD' ? undefined : JSON.stringify({ status:'ok', version:process.env.RAILWAY_GIT_COMMIT_SHA || 'local' }));return;
  }
  if (aliases[path]) { res.writeHead(308,{'Location':aliases[path]+url.search});res.end();return; }
  const file = pages[path] ? join(root,pages[path]) : assets.get(path);
  if (!file) { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?undefined:'Page not found.');return; }
  try {
    const info = await stat(file);
    res.writeHead(200,{'Content-Type':types[extname(file)],'Content-Length':info.size,'Cache-Control':pages[path]?'no-cache':'public, max-age=300'});
    if (req.method==='HEAD') res.end();
    else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  } catch { res.writeHead(500);res.end('Unable to load this page.'); }
});
const port = Number(process.env.PORT || 8080);
server.listen(port,'0.0.0.0',()=>console.log(`Rave Board listening on ${server.address().port}`));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();});
