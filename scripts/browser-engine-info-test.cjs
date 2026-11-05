const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[],network=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
  await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  await page.evaluate(()=>{setup.mode='pvc';setup.color='b';setup.level=21;setup.tc='none';setup.rules='casual';newGame();});
  await page.waitForFunction(()=>G.moves.length===1);assert.match(await page.textContent('#engineSource'),/opening book/);
  await page.evaluate(()=>{setup.color='w';newGame();playMove('h2h4');});
  await page.waitForFunction(()=>G.moves.length===2);assert.match(await page.textContent('#engineSource'),/out of book/);
  await page.click('#navFirst');assert(await page.locator('#engineSource').isHidden());await page.click('#navLast');assert(await page.locator('#engineSource').isVisible());
  await page.click('#undoBtn');assert(await page.locator('#engineSource').isHidden());
  await page.evaluate(()=>{setup.color='b';newGame({startFen:'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'});});
  await page.waitForFunction(()=>G.moves.length===1);assert.match(await page.textContent('#engineSource'),/custom position/);
  await page.evaluate(()=>newGame({record:PositionTools.fromFen(START)}));assert(await page.locator('#engineSource').isHidden());
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('PASS: real-worker book/out-of-book/custom-position indicators, history hiding and new-record reset offline');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
