const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  const text=fs.readFileSync('validation/user-reports/2026-11-06-rook-draw-claim/game.pgn','utf8');
  await page.evaluate(text=>{
   window.claimGame=PositionTools.parsePgn(text);window.claimResults=[];
   window.setupClaimPosition=(n,official)=>{
    const record=PositionTools.fromMoves(claimGame.startFen,claimGame.moves.slice(0,n),{},'*');setup.mode='pvp';setup.tc='none';setup.speed='fast';newGame({record});G.clockHist=Array(n).fill(null);
    G.review=false;G.official=official;G.mode='cvc';G.players={w:{type:'ai',level:52},b:{type:'ai',level:65}};
    G.clock={w:136600,b:88700,start:{w:120000,b:120000},running:null,last:0,inc:1000,delay:0,delayLeft:0,per:0,pgn:'120+1'};
    G.evalW=-20;startClock(sideToMove());afterChange();
   };
  },text);
  for(const [n,type]of [[210,'intended'],[211,'current']]){
   await page.evaluate(([n])=>window.setupClaimPosition(n,true),[n]);await page.waitForFunction(()=>!!G.over);
   const r=await page.evaluate(()=>({over:G.over,plies:G.moves.length,claim:G.drawClaim,half:G.chess.half,pgn:pgn(),last:G.lastThink}));
   assert.equal(r.over.result,'1/2-1/2');assert.match(r.over.reason,/fifty-move rule/);assert.equal(r.plies,n);assert.equal(r.claim.type,type);assert.equal(r.last.backend,'wasm');assert.equal(r.half,n===210?99:100);
   const parsed=await page.evaluate(s=>PositionTools.parsePgn(s),r.pgn);assert.equal(parsed.moves.length,n);if(n===210){assert.match(r.pgn,/\[DrawClaimMove "/);assert.match(r.pgn,/intended/);}
   assert.match(parsed.tags.LastThinkReason,/fifty-move rule/);await page.waitForTimeout(100);const frozen=await page.evaluate(()=>PositionTools.parsePgn(pgn()).tags.LastThinkWallMs);assert.equal(frozen,parsed.tags.LastThinkWallMs,'Post-game request timings must stop growing');
   await page.evaluate(r=>window.claimResults.push(r),r);
  }
  await page.evaluate(()=>window.setupClaimPosition(210,false));await page.waitForFunction(()=>!!G.over);
  const casual=await page.evaluate(()=>({plies:G.moves.length,half:G.chess.half,over:G.over,claim:G.drawClaim}));assert.equal(casual.plies,211);assert.equal(casual.half,100);assert.equal(casual.over.result,'1/2-1/2');assert.equal(casual.claim,undefined);
  // Current draw rights must not give away an immediate forced mate.
  await page.evaluate(()=>{setup.mode='pvp';setup.tc='none';setup.rules='official';newGame({startFen:'7k/8/5KQ1/8/8/8/8/8 w - - 100 1'});G.mode='cvc';G.players={w:{type:'ai',level:65},b:{type:'human'}};maybeAI();});await page.waitForFunction(()=>!!G.over);assert.equal(await page.evaluate(()=>G.over.reason),'checkmate');
  // An expired clock wins the race over a late draw claim.
  await page.evaluate(()=>{
   const record=PositionTools.fromMoves(claimGame.startFen,claimGame.moves.slice(0,211),{},'*');setup.mode='pvp';setup.tc='none';newGame({record});G.review=false;G.official=true;G.mode='cvc';G.players={w:{type:'human'},b:{type:'ai',level:65}};
   G.clock={w:60000,b:50,start:{w:120000,b:120000},running:'b',last:performance.now(),inc:1000,delay:0,delayLeft:0,per:0,pgn:'120+1'};
   window.realDrawThink=think;think=()=>{const move=G.chess.uci(G.chess.legalMoves()[0]);G.clock.last=performance.now()-200;return Promise.resolve({move,score:-20,depth:4});};maybeAI();
  });await page.waitForFunction(()=>!!G.over);const late=await page.evaluate(()=>({result:G.over.result,reason:G.over.reason,claim:G.drawClaim}));assert.equal(late.result,'1-0');assert.match(late.reason,/lost on time/);assert.equal(late.claim,undefined);
  if(process.env.MITCHELL_DRAW_REPORT){const results=await page.evaluate(()=>window.claimResults);fs.writeFileSync(process.env.MITCHELL_DRAW_REPORT,JSON.stringify({createdUtc:new Date().toISOString(),htmlSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html')).digest('hex'),results,casual,late},null,2)+'\n');}
  assert.deepEqual(errors,[]);console.log('PASS: actual 120+1 user position claims current/intended fifty-move draws with fresh WASM results; no unplayed move, casual timing, mate priority and flag priority preserved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
