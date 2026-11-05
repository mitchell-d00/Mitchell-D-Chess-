// Real worker searches and real review controls; no substituted engine scores.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e)));await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));
  await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  await page.evaluate(()=>newGame({record:PositionTools.fromMoves('4k3/8/8/8/8/8/4q3/4R1K1 w - - 0 1',['g1h1','e2e1'])}));
  await page.selectOption('#analysisBudget','100');await page.click('#analyseBtn');await page.waitForFunction(()=>G.analysis?.status==='complete',null,{timeout:20000});
  assert.equal(await page.evaluate(()=>G.analysis.rows[0].topic),'Piece safety');
  const moment=page.locator('[data-review-moment="1"]');await moment.focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>G.view),0);assert.equal(await page.evaluate(()=>document.activeElement.dataset.reviewMoment),'1');
  assert.match(await page.textContent('#analysisLessonTitle'),/Before White played Kh1/);
  assert.match(await page.textContent('#analysisReply'),/captures the rook on e1/);assert.match(await page.textContent('#analysisAlternative'),/captures the queen on e2/);
  assert.match(await page.textContent('#analysisLessonTip'),/what your opponent can capture/);
  const recommendation=await page.evaluate(()=>currentRecommendation());assert.equal(recommendation.from,'e1');assert.equal(recommendation.to,'e2');
  const history=await page.evaluate(()=>G.moves.slice());await page.click('#analysisAfterBtn');assert.equal(await page.evaluate(()=>G.view),1);assert.match(await page.textContent('#analysisLessonTitle'),/After White played Kh1/);
  await page.click('#analysisBeforeBtn');assert.equal(await page.evaluate(()=>G.view),0);assert.deepEqual(await page.evaluate(()=>G.moves),history);
  await page.selectOption('#analysisFocus','b');assert.match(await page.textContent('#analysisTakeaways'),/Black: 1 move reviewed/);
  await page.selectOption('#analysisFocus','all');assert.match(await page.textContent('#analysisTakeaways'),/Both players: 2 moves reviewed/);
  for(const viewport of [{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(viewport);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   for(const selector of ['#analysisBeforeBtn','#analysisAfterBtn','[data-review-moment="1"]'])assert((await page.locator(selector).boundingBox()).height>=44);
  }
  await page.evaluate(()=>newGame({record:PositionTools.fromMoves('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',['d1d2','g8f8'])}));
  await page.click('#analyseBtn');await page.waitForFunction(()=>G.analysis?.status==='complete',null,{timeout:20000});
  assert.equal(await page.evaluate(()=>G.analysis.rows[0].label),'Missed mate in one');await page.locator('[data-review-moment="1"]').click();
  assert.match(await page.textContent('#analysisAlternative'),/Rd8#.*checkmate/);assert.match(await page.textContent('#analysisEstimate'),/not converted into pawn losses/);
  await page.evaluate(()=>newGame());assert(await page.locator('#analysisOutput').isHidden());assert(await page.locator('#analysisLesson').isHidden());
  await page.evaluate(()=>newGame({record:PositionTools.fromFen('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1')}));
  await page.click('#analyseBtn');await page.waitForFunction(()=>G.analysis?.status==='complete');assert.match(await page.textContent('#analysisTakeaways'),/0 moves reviewed/);assert(await page.locator('#analysisLesson').isHidden());
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  console.log('PASS: real-worker teaching, key moments and preserved keyboard focus, factual capture/alternative/mate, before-after navigation, side focus, mobile targets, new-game cleanup and zero-move review offline');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
