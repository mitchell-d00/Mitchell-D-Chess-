const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));
  await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  assert.equal(await page.locator('#board [role=gridcell]').count(),64);assert.equal(await page.locator('#board [tabindex="0"]').count(),1);
  assert((await page.locator('.sq[data-sq="e2"]').getAttribute('aria-label')).includes('White pawn'));
  await page.evaluate(()=>{setup.mode='pvp';setup.tc='none';setup.rules='casual';newGame();focusSquare('e2');});
  await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>G.moves[0]),'e2e4');assert.equal(await page.evaluate(()=>document.activeElement.dataset.sq),'e4');
  await page.evaluate(()=>{setup.rules='official';newGame();focusSquare('e2');});await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>G.touched),'e2');assert.equal(await page.evaluate(()=>BV.sel),'e2');
  await page.evaluate(()=>focusSquare('d2'));await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>G.touched),'e2');
  await page.evaluate(()=>focusSquare('e4'));await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>G.moves[0]),'e2e4');
  await page.evaluate(()=>{BV.flipped=true;renderBoard();focusSquare('e2');});await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.sq),'d2');
  await page.evaluate(()=>{setup.rules='casual';newGame({startFen:'8/P7/4k3/8/8/8/8/4K3 w - - 0 1'});focusSquare('a7');});
  await page.keyboard.press('Enter');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await page.locator('.promo button[data-p="n"]').press('Enter');assert.equal(await page.evaluate(()=>G.moves[0]),'a7a8n');
  await page.click('#helpBtn');assert.equal(await page.locator('[role=dialog]').getAttribute('aria-labelledby'),'modalTitle');
  await page.locator('#ovBox button').last().focus();await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement===document.querySelector('#ovBox button')));
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'helpBtn');
  await page.click('#dismissWelcome');await page.reload();assert(await page.locator('#welcomeTip').isHidden());
  await page.click('#setupToggle');assert(await page.locator('#setupFields').isHidden());assert.equal(await page.locator('#setupToggle').getAttribute('aria-expanded'),'false');
  await page.locator('#playTab').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>tab),'learn');await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>tab),'play');
  await page.click('#setBtn');assert.equal(await page.locator('#ovBox').getByText('High contrast',{exact:true}).count(),2);await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert((await page.locator('#helpBtn').boundingBox()).height>=44);
  await page.screenshot({path:'/tmp/chess-mobile-ui.png',fullPage:true});
  await page.setViewportSize({width:844,height:390});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/chess-landscape-ui.png',fullPage:true});
  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),touch=await touchContext.newPage();await touch.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));await touch.goto('http://localhost:8765/');await touchContext.setOffline(true);await touch.evaluate(()=>{setup.mode='pvp';setup.rules='casual';setup.tc='none';newGame();});for(const sq of ['e2','e4']){const box=await touch.locator('.sq[data-sq="'+sq+'"]').boundingBox();await touch.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}assert.equal(await touch.evaluate(()=>G.moves[0]),'e2e4');await touchContext.close();
  assert.deepEqual(errors,[]);console.log('PASS: accessible board/roving focus, keyboard and touch-move legality, flipped navigation, underpromotion, modal trap/return, guide persistence, tabs, contrast, portrait/landscape, real touch taps and 44px targets');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
