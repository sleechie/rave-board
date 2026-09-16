import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('the public server serves three pages, safe assets, health and clean redirects', async t=>{
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}});
  const port=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Server startup timed out')),5000);
    child.stdout.on('data',data=>{const match=String(data).match(/listening on (\d+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(Error(`Server exited: ${code}`));});
  });
  const base=`http://127.0.0.1:${port}`;
  for(const path of ['/','/about','/rave','/rave?effect=rain']){
    const response=await fetch(base+path);
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/html/);
    assert.match(await response.text(),/RAVE BOARD/);
    assert.match(response.headers.get('permissions-policy'),/bluetooth=\(self\)/);
  }
  for(const path of ['/server.mjs','/.env','/assets/%2e%2e/%2e%2e/package.json','/README.md','/kilter-trip-source.zip','/not-a-page']){
    assert.equal((await fetch(base+path)).status,404,path);
  }
  assert.equal((await fetch(base+'/%ZZ')).status,400);
  assert.equal((await fetch(base+'/rave',{method:'POST'})).status,405);
  const redirect=await fetch(base+'/rave/?effect=rain',{redirect:'manual'});
  assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/rave?effect=rain');
  const script=await fetch(base+'/app.mjs?v=4');assert.match(script.headers.get('content-type'),/javascript/);
  const head=await fetch(base+'/rave',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await(await fetch(base+'/healthz')).json()).status,'ok');
});
