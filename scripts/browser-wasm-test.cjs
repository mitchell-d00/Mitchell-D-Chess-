// MIT. Exercise the actual offline candidate in dedicated browser workers.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const file=process.env.MITCHELL_TEST_HTML;if(!file)throw Error('Set MITCHELL_TEST_HTML to an explicit candidate build');
 const html=fs.readFileSync(file,'utf8'),source=html.match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1];
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.context().setOffline(true);
  for(const mode of ['native32','native64','no-wasm','compile-failure']){
   const result=await page.evaluate(({source,mode})=>new Promise((resolve,reject)=>{
    const prefix=mode==='no-wasm'?'self.WebAssembly=undefined;':mode==='compile-failure'?'WebAssembly.Module=function(){throw Error("test compilation failure")};':'';
    const handler=`self.onmessage=()=>{try{const E=ENGINE;if(!E.WASM_CORE)throw Error('Not a WASM candidate');E.WASM_CORE.config.memory=${JSON.stringify(mode==='native64'?'large':'standard')};const core=E.WASM_CORE.prepare();const memory=core?core.memory.buffer.byteLength:0;const moves=['e2e4','c7c5','g1f3'];const r=E.think(null,moves,64,{time:220,noBook:true});const p=new E.Chess();for(const u of moves)p.make(p.findUci(u));self.postMessage({backend:r.backend,legal:!!p.findUci(r.move),memory,error:E.WASM_CORE.error});}catch(e){self.postMessage({failure:String(e.stack||e)});}};`;
    const url=URL.createObjectURL(new Blob([prefix,source,handler],{type:'text/javascript'})),worker=new Worker(url);URL.revokeObjectURL(url);
    let ticks=0;const pulse=setInterval(()=>ticks++,10),timeout=setTimeout(()=>{worker.terminate();clearInterval(pulse);reject(Error('Worker timed out: '+mode));},15000);
    worker.onmessage=e=>{clearTimeout(timeout);clearInterval(pulse);worker.terminate();resolve({...e.data,ticks});};
    worker.onerror=e=>{clearTimeout(timeout);clearInterval(pulse);worker.terminate();reject(Error(e.message));};worker.postMessage({});
   }),{source,mode});
   assert(!result.failure,result.failure);assert(result.legal);assert(result.ticks>=5,`${mode}: UI heartbeat stopped`);
   assert.equal(result.backend,mode.startsWith('native')?'wasm':'js-fallback');
   assert.equal(result.memory,mode==='native32'?32*1024*1024:mode==='native64'?64*1024*1024:0);
   if(mode==='compile-failure')assert.match(result.error,/test compilation failure/);
   console.log(`PASS: offline worker ${mode}, legal move, responsive UI, backend ${result.backend}`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
