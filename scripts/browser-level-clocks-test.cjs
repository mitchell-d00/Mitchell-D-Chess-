const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  const worker=await page.evaluate(async()=>{
   const moves=['e2e4','c7c5','g1f3'],p=new E.Chess();for(const u of moves)p.make(p.findUci(u));
   const a=await think(null,moves,49,{time:250,noBook:true}),b=await think(null,moves,64,{time:250,noBook:true});
   return {lower:a.timeBudget,higher:b.timeBudget,legal:!!p.findUci(a.move)&&!!p.findUci(b.move),backend:b.backend};
  });assert(worker.legal);assert.equal(worker.backend,'wasm');assert(worker.higher>2*worker.lower);
  // Hold the response to inspect the actual UI-to-worker allocation boundary.
  const budgets=await page.evaluate(()=>{
   const saved=think;think=()=>new Promise(()=>{});setup.mode='pvp';setup.tc='none';setup.rules='official';newGame();
   const result=[];for(const level of [16,17,50,65]){
    G.mode='cvc';G.players={w:{type:'ai',level},b:{type:'ai',level:1}};G.thinking=false;
    G.clock={w:11000,b:9600,start:{w:60000,b:60000},running:null,last:performance.now(),inc:0,delay:0,delayLeft:0,per:0};
    maybeAI();result.push({level,time:G.thinkBudget,text:document.querySelector('#status').textContent});
   }
   think=saved;G.thinking=false;G.clock=null;G.mode='pvp';newGame();return result;
  });
  assert(budgets.every(r=>r.time>0&&r.text.includes('Clocked thinking allowance')));assert(budgets[1].time>budgets[0].time);assert(budgets[3].time>2*budgets[2].time);
  assert(await page.locator('.clock-budget').count()===0);
  for(const backend of ['wasm','js-fallback']){
   await page.evaluate(backend=>{window.savedLevelThink=think;think=()=>Promise.resolve({move:'e2e4',score:0,depth:4,backend,book:false});setup.mode='pvp';setup.tc='none';setup.speed='fast';newGame();G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};maybeAI();},backend);
   await page.waitForFunction(()=>G.moves.length===1);assert.match(await page.textContent('#engineSource'),backend==='wasm'?/WASM/:/JavaScript fallback/);
   await page.evaluate(()=>{think=window.savedLevelThink;newGame();});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: real worker level-50/65 budget separation; shared UI clock allowance; visible thinking cap, backend/fallback source labels and cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
