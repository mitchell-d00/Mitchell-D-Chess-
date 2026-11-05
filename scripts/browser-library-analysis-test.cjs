const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
 try{
  const page=await browser.newPage(),errors=[],network=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));
  await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  await page.evaluate(()=>{setup.mode='pvp';setup.rules='official';setup.tc='1+1';newGame();playMove('e2e4');activateSquare('e7');});
  await page.click('#gamesBtn');await page.fill('#saveName','My timed game');await page.click('#saveGameBtn');
  const stored=await page.evaluate(()=>{const e=library.list()[0];return library.load(e.id);});assert.equal(stored.game.moves[0],'e2e4');assert.equal(stored.game.touched,'e7');
  await page.click('#newBtn');assert.equal(await page.evaluate(()=>G.moves.length),1);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>G.moves.length),1);
  await page.click('#newBtn');await page.click('#confirmNew');assert.equal(await page.evaluate(()=>G.moves.length),0);await page.reload();
  await page.click('#gamesBtn');await page.locator('[data-load-save]').first().click();await page.locator('#ov').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>({moves:G.moves,paused:G.paused,official:G.official,thinking:G.thinking})),{moves:['e2e4'],paused:true,official:true,thinking:false});
  const clock=await page.evaluate(()=>G.clock.b);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>G.clock.b),clock);
  await page.click('#resumeSavedBtn');assert.equal(await page.evaluate(()=>G.paused),false);assert.equal(await page.evaluate(()=>G.touched),'e7');assert.equal(await page.evaluate(()=>setup.mode),'pvp');
  await page.evaluate(()=>{G.paused=true;cancelThinking();const data=JSON.parse(localStorage.getItem(GameLibrary.KEY));data.games[0].game.moves=['e2e5'];localStorage.setItem(GameLibrary.KEY,JSON.stringify(data));});
  const before=await page.evaluate(()=>G.chess.fen());await page.click('#gamesBtn');await page.locator('[data-load-save]').first().click();await page.locator('#libraryError').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>G.chess.fen()),before);await page.keyboard.press('Escape');
  await page.evaluate(()=>{setup.mode='pvp';setup.rules='casual';setup.tc='none';newGame({record:PositionTools.parsePgn('1. e4 e5 2. Nf3 Nc6 *')});});
  await page.selectOption('#analysisBudget','100');await page.click('#analyseBtn');await page.waitForFunction(()=>G.analysis&&G.analysis.status==='complete',{timeout:15000});
  assert.equal(await page.evaluate(()=>G.analysis.positions.length),5);assert.equal(await page.locator('#analysisMoves .analysis-row').count(),4);
  assert((await page.locator('#analysisProgress').textContent()).includes('not an accuracy score'));
  await page.locator('#analysisMoves [data-analysis-ply="2"]').click();assert.equal(await page.evaluate(()=>G.view),2);
  await page.locator('#analysisCard').screenshot({path:'/tmp/chess-review-ui.png'});
  await page.click('#analyseBtn');await page.click('#cancelAnalysisBtn');assert.equal(await page.evaluate(()=>G.analysis.status),'cancelled');
  await page.click('#analyseBtn');await page.evaluate(()=>newGame());await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>G.analysis),undefined);assert.equal(await page.evaluate(()=>G.moves.length),0);
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('PASS: offline named saves, new-game confirmation, paused official-clock restoration, transactional corrupt-save rejection, real worker review/alternatives/graph, cancellation and stale-result isolation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
