const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[],network=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));
  await page.goto('http://localhost:8765/');await context.setOffline(true);
  await page.evaluate(()=>{setup.mode='pvp';setup.tc='none';newGame();playMove('e2e4');});
  const before=await page.evaluate(()=>G.chess.fen());
  await page.click('#importBtn');await page.fill('#importText','1. e5 *');await page.click('#importLoad');await page.locator('#importError').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>G.chess.fen()),before);await page.keyboard.press('Escape');
  const pgn='[Event "Offline import"]\n[White "<img src=x onerror=alert(1)>"]\n1.e4 e5 2.Nf3 (2.Bc4) Nc6 3.Bb5 a6 *';
  await page.click('#importBtn');await page.locator('#importFile').setInputFiles({name:'game.pgn',mimeType:'application/x-chess-pgn',buffer:Buffer.from(pgn)});
  await page.waitForFunction(()=>document.querySelector('#importText').value.includes('Offline import'));
  await page.click('#importLoad');await page.locator('#ov').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>({review:G.review,moves:G.moves.length,clock:G.clock,thinking:G.thinking})),{review:true,moves:6,clock:null,thinking:false});
  assert.equal(await page.locator('img[src=x]').count(),0);
  await page.click('#moves button[data-i="2"]');assert.equal(await page.evaluate(()=>curFen()),await page.evaluate(()=>G.fens[2]));
  await page.evaluate(()=>{window.copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});});
  await page.click('#shareBtn');const url=await page.evaluate(()=>window.copied),fen=await page.evaluate(()=>curFen());assert(url.includes('#fen='));
  await page.goto(url);await page.locator('#importLoad').waitFor();await page.click('#importLoad');await page.locator('#ov').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>G.chess.fen()),fen);
  await page.goto('about:blank');await page.goto(url);assert.equal(await page.evaluate(()=>G.chess.fen()),fen);assert(await page.evaluate(()=>G.review));
  await page.click('#continueBtn');await page.click('#confirmNew');assert.equal(await page.evaluate(()=>G.startFen),fen);assert.equal(await page.evaluate(()=>G.review),false);
  await page.evaluate(()=>openImport('8/8/4k3/8/8/8/8/4K3 b - - 0 42'));await page.click('#importLoad');await page.locator('#ov').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>G.chess.side),8);
  await page.evaluate(()=>{setup.mode='pvp';newGame({startFen:'8/8/4k3/8/8/8/4P3/4K3 b - - 0 42'});playMove('e6f6');});
  assert((await page.evaluate(()=>pgn())).includes('42... Kf6'));assert.equal(await page.locator('#moves .n').first().textContent(),'42.');
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('PASS: offline paste/file import, transactional errors, inert headers, review/navigation, shared-position reload, custom-FEN play and black-start PGN export');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
