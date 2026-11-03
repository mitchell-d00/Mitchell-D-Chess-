// Development-only browser check. Requires Playwright and Chromium installed locally.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[],network=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
 // Serve the single file from memory; no development server or network is needed.
 await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:require('node:fs').readFileSync('index.html','utf8')}));
 await page.goto('http://localhost:8765/');
 await page.context().setOffline(true);
 assert.equal(await page.locator('#lvl').getAttribute('max'),'50');
 assert.equal(await page.locator('#lvlW option').count(),50);
 assert.equal(await page.evaluate(()=>LESSONS.length),38);
 const r=await page.evaluate(async()=>{
   let ticks=0;const timer=setInterval(()=>ticks++,10);
   const result=await think(null,['e2e4','c7c5','g1f3'],49,{time:350,noBook:true});clearInterval(timer);
   const p=new E.Chess();for(const u of ['e2e4','c7c5','g1f3'])p.make(p.findUci(u));
   return {ticks,legal:!!p.findUci(result.move),depth:result.depth};
 });assert(r.legal);assert(r.ticks>=5,'UI heartbeat blocked');
 const cancelled=await page.evaluate(async()=>{const job=think(null,[],49,{time:60000,noBook:true}).then(()=>false,()=>true);cancelThinking();return job;});assert(cancelled);
 const book=await page.evaluate(()=>think(null,[],34));assert(book.book);
 await page.evaluate(()=>{setup.mode='cvc';setup.lvlW=1;setup.lvlB=1;setup.speed='fast';newGame();});
 await page.waitForFunction(()=>G.moves.length>=4);await page.evaluate(()=>{G.paused=true;cancelThinking();});
 // Force worker creation failure: reject without falling back to UI-thread search.
 const failed=await page.evaluate(async()=>{worker.terminate();worker=null;const Saved=window.Worker;window.Worker=function(){throw Error('disabled')};try{await think(null,[],49);return false;}catch{return true;}finally{window.Worker=Saved;worker=makeWorker();}});assert(failed);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log('PASS: offline standalone HTML, 50 levels, 38 lessons, legal worker move, responsive UI, cancellation, book, computer-vs-computer, worker failure');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
