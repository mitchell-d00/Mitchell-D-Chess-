// Real workers with injected interruption points; no UI-thread search or clock refunds.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  await page.evaluate(()=>{
   setup.mode='pvp';setup.tc='none';newGame();worker.terminate();worker=null;
   $('#engine-src').textContent+=`\nconst originalTestHandler=self.onmessage;self.onmessage=e=>{if(e.data.extra&&e.data.extra.injectHang)return;if(e.data.extra&&e.data.extra.injectCrash){setTimeout(()=>{throw Error('injected worker failure');},0);return;}originalTestHandler(e);};`;
  });
  const fallback=await page.evaluate(async()=>{
   const fen='8/1p4pk/4p2p/3pP3/3P1P2/2R3PK/7P/5r2 w - - 0 1';
   const result=await think(fen,[],64,{time:500,noBook:true,maxWallMs:800,fallbackFen:fen,injectHang:true});
   return {result,legal:!!new E.Chess(fen).findUci(result.move),pending:Object.keys(pending).length};
  });assert(fallback.legal);assert.equal(fallback.result.recovery,'timeout');assert.equal(fallback.pending,0);
  const crash=await page.evaluate(async()=>{
   const fen=START,result=await think(null,[],64,{time:500,maxWallMs:1000,fallbackFen:fen,injectCrash:true});return {result,legal:!!new E.Chess(fen).findUci(result.move)};
  });assert(crash.legal);assert.equal(crash.result.recovery,'worker-error');
  const strict=await page.evaluate(async()=>{try{await think(null,['e2e5'],64,{time:20,maxWallMs:1000,fallbackFen:START});return false;}catch(e){return /Invalid move history/.test(String(e));}});assert(strict,'A semantic input error must not be repaired with a provisional move');
  const noFallback=await page.evaluate(async()=>{try{await think(null,[],64,{time:1,maxWallMs:80,injectHang:true});return false;}catch(e){return /timed out/.test(String(e));}});assert(noFallback);
  const cancel=await page.evaluate(async()=>{const p=think(null,[],64,{time:500,maxWallMs:500,fallbackFen:START,injectHang:true}).then(()=>false,()=>true);cancelThinking();return p;});assert(cancel);
  // Normal replies clear the watchdog; an old timer cannot kill the next worker.
  const normal=await page.evaluate(async()=>{const r=await think(null,[],0,{time:20,noBook:true,maxWallMs:1200,fallbackFen:START});window.checkedWorker=worker;return {legal:!!new E.Chess().findUci(r.move),recovery:r.recovery};});assert(normal.legal);assert.equal(normal.recovery,undefined);
  await page.waitForTimeout(1300);assert(await page.evaluate(()=>worker===window.checkedWorker&&Object.keys(pending).length===0));
  // The actual game uses the same recovery, labels it, and exports diagnostics.
  await page.evaluate(()=>{
   setup.mode='pvp';setup.tc='none';newGame();window.actualThink=think;think=(fen,moves,level,extra)=>window.actualThink(fen,moves,level,{...extra,injectHang:true});
   G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};
   G.clock={w:2500,b:60000,start:{w:60000,b:60000},running:'w',last:performance.now(),inc:1000,delay:0,delayLeft:0,per:0,pgn:'60+1'};maybeAI();
  });await page.waitForFunction(()=>G.moves.length===1||!!G.over);
  const game=await page.evaluate(()=>({moves:G.moves.length,remaining:G.clock.w,over:G.over,recoveries:G.engineRecoveries,text:$('#engineSource').textContent,pgn:pgn()}));
  assert.equal(game.moves,1);assert(game.remaining>0&&!game.over);assert.equal(game.recoveries,1);assert.match(game.text,/fallback move/);assert.match(game.pgn,/\[SessionEngineRecoveries "1"\]/);assert.match(game.pgn,/\[LastThinkRecovery "timeout"\]/);assert.match(game.pgn,/\[%clk /);assert.match(game.pgn,/Engine recovery: timeout/);
  await page.evaluate(()=>{think=window.actualThink;setup.mode='pvp';setup.tc='1+1';newGame();G.clock.running=null;G.clock.w=58000;playMove('e2e4');G.clock.running=null;G.clock.b=57000;playMove('e7e5');G.paused=true;});
  const clocked=await page.evaluate(()=>pgn());assert.match(clocked,/e4 \{\[%clk 0:00:59\.0\]\}/);assert.match(clocked,/e5 \{\[%clk 0:00:58\.0\]\}/);
  assert(await page.evaluate(text=>PositionTools.parsePgn(text).moves.length===2,clocked));
  await page.evaluate(()=>{
   setup.mode='pvp';setup.tc='none';newGame();if(worker)worker.terminate();worker=null;window.realWorker=window.Worker;window.workerCreateFailures=0;
   window.Worker=function(){window.workerCreateFailures++;throw Error('creation disabled');};G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};maybeAI();
  });await page.waitForFunction(()=>G.engineFault===true);
  assert(await page.evaluate(()=>window.workerCreateFailures===2&&!G.thinking));assert.match(await page.textContent('#status'),/could not continue/);
  await page.evaluate(()=>{window.Worker=window.realWorker;});await page.getByRole('button',{name:'Retry computer',exact:true}).click();await page.waitForFunction(()=>G.moves.length===1);assert.equal(await page.evaluate(()=>G.engineFault),null);
  for(const response of [null,{move:'e2e5',score:0,depth:0}]){
   await page.evaluate(response=>{setup.mode='pvp';setup.tc='none';newGame();window.invalidReplies=0;think=()=>{window.invalidReplies++;return Promise.resolve(response);};G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};maybeAI();},response);
   await page.waitForFunction(()=>G.engineFault===true);assert(await page.evaluate(()=>G.moves.length===0&&window.invalidReplies===2&&!G.thinking));
  }
  await page.evaluate(()=>{think=window.actualThink;});
  // An injected main-loop stall/visibility gap cannot play a recovered move
  // after official flag fall. This is not a physical iOS suspension test.
  await page.evaluate(()=>{
   setup.mode='pvp';setup.tc='none';setup.rules='official';newGame();window.testHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testHidden});document.dispatchEvent(new Event('visibilitychange'));
   think=(fen,moves,level,extra)=>window.actualThink(fen,moves,level,{...extra,injectHang:true});
   G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};
   G.clock={w:800,b:60000,start:{w:60000,b:60000},running:'w',last:performance.now(),inc:1000,delay:0,delayLeft:0,per:0,pgn:'60+1'};maybeAI();
   const end=performance.now()+1200;while(performance.now()<end){}window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));tickClock();
  });
  await page.waitForFunction(()=>!!G.over);await page.evaluate(()=>{window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;think=window.actualThink;});
  const expired=await page.evaluate(()=>({moves:G.moves.length,clock:G.clock.w,reason:G.over.reason,pgn:pgn(),note:$('#boardmsg').textContent,info:G.lastThink}));
  assert.equal(expired.moves,0);assert.equal(expired.clock,0);assert.match(expired.reason,/lost on time/);assert(expired.info.hiddenMs>=800);assert.match(expired.note,/Browser inactivity/);assert.match(expired.pgn,/\[WhiteClock "0:00:00\.0"\]/);
  assert.deepEqual(errors,[]);
  console.log('PASS: real worker timeout/crash recovery, legal fallback, strict errors/cancellation, one bounded retry and visible retry control, game/PGN clocks and no retroactive moves after an injected inactivity/timer stall');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
