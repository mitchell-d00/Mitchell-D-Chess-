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
  // Survival budgets can coincide after integer rounding in time trouble.
  assert(budgets.every(r=>r.time>0&&r.text.includes('Clocked thinking allowance')));assert(budgets[1].time>=budgets[0].time);assert(budgets[3].time>2*budgets[2].time);
  const expiredRequest=await page.evaluate(()=>think(null,['e2e4','c7c5','g1f3'],64,{time:5000,noBook:true,clockDeadline:performance.timeOrigin+performance.now()-100}));
  assert(expiredRequest.timeBudget<=1,'Worker must reduce stale queued requests to the minimum budget');
  assert(await page.locator('.clock-budget').count()===0);
  const policies=await page.evaluate(()=>{
   const saved=think;think=()=>new Promise(()=>{});setup.mode='pvp';setup.tc='none';newGame();
   try{
    const rows=[];for(let level=1;level<=65;level++){
     G.mode='cvc';G.players={w:{type:'ai',level},b:{type:'human'}};G.thinking=false;G.aiClockOverhead=75;
     G.clock={w:1000,b:60000,start:{w:60000,b:60000},running:null,last:performance.now(),inc:0,delay:0,delayLeft:0,per:0};
     maybeAI();rows.push({level,mode:G.clockMode,time:G.thinkBudget});
    }
    const budgets=[];for(const overhead of [20,300]){G.clock.w=60000;G.thinking=false;G.aiClockOverhead=overhead;maybeAI();budgets.push(G.thinkBudget);}
    return {rows,budgets};
   }finally{think=saved;G.thinking=false;newGame();}
  });
  assert(policies.rows.every(r=>r.mode==='emergency'&&r.time<=1));assert(policies.budgets[1]<policies.budgets[0],'Observed device overhead reduces the actual UI search allocation');
  const trouble=await page.evaluate(async()=>{
   setup.mode='pvp';setup.tc='none';newGame();
   const savedThink=think,savedTimeout=window.setTimeout,timers=[],requests=[];
   try{
    think=(fen,moves,level,extra)=>{requests.push({remaining:G.clock.w,time:extra.time});return Promise.resolve({move:'e2e4',depth:1,score:0});};
    window.setTimeout=(fn,ms)=>{timers.push(ms);return 0;};
    G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};
    G.clock={w:500,b:60000,start:{w:60000,b:60000},running:'w',last:performance.now()-200,inc:0,delay:0,delayLeft:0,per:0};
    maybeAI();await Promise.resolve();
    const charged=requests[0],delay=timers[0];
    G.thinking=false;G.clock.w=5;G.clock.last=performance.now()-20;maybeAI();
    return {charged,delay,requests:requests.length,flagged:!!G.over};
   }finally{think=savedThink;window.setTimeout=savedTimeout;newGame();}
  });
  assert(trouble.charged.remaining<=300&&trouble.charged.remaining>0,'Charge render/dispatch time before budgeting');
  assert.equal(trouble.delay,0,'Do not hold an already chosen move in time trouble');
  assert.equal(trouble.requests,1,'Do not start a search after time has already expired');assert(trouble.flagged);
  for(const backend of ['wasm','js-fallback']){
   await page.evaluate(backend=>{window.savedLevelThink=think;think=()=>Promise.resolve({move:'e2e4',score:0,depth:4,backend,book:false});setup.mode='pvp';setup.tc='none';setup.speed='fast';newGame();G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};maybeAI();},backend);
   await page.waitForFunction(()=>G.moves.length===1);assert.match(await page.textContent('#engineSource'),backend==='wasm'?/WASM/:/JavaScript fallback/);
   await page.evaluate(()=>{think=window.savedLevelThink;newGame();});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: real worker budget separation and queued deadline; all 65 emergency presets, adaptive UI overhead, fresh clock allocation, no viewing hold, expired-turn guard, source labels and cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
