import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionSupport } from '../site/compatibility.mjs';

test('iPhone and iPad are preview-only, including specialist Bluetooth browsers',()=>{
  for(const userAgent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1','Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Bluefy']){
    for(const bluetooth of [true,false]){
      const result=connectionSupport({userAgent,bluetooth});
      assert.equal(result.canConnect,false);assert.equal(result.kind,'ios');
    }
  }
  assert.equal(connectionSupport({userAgent:'Mozilla/5.0 (Macintosh)',platform:'MacIntel',maxTouchPoints:5,bluetooth:true}).kind,'ios');
});

test('Android connection requires actual Bluetooth support and a secure page',()=>{
  assert.equal(connectionSupport({userAgent:'Mozilla/5.0 (Linux; Android 16) Chrome/152',bluetooth:true}).canConnect,true);
  assert.equal(connectionSupport({userAgent:'Mozilla/5.0 (Linux; Android 16) Chrome/152',bluetooth:false}).canConnect,false);
  assert.equal(connectionSupport({userAgent:'Android',bluetooth:true,secure:false}).canConnect,false);
});

test('desktop support is based on capability, not a browser-name guess',()=>{
  assert.equal(connectionSupport({userAgent:'Chrome',bluetooth:false}).canConnect,false);
  assert.equal(connectionSupport({userAgent:'A browser',platform:'MacIntel',maxTouchPoints:0,bluetooth:true}).canConnect,true);
});
