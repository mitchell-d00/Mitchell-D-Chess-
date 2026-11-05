const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page = await browser.newPage(), errors = [], network = [];
    page.on('pageerror', e=>errors.push(String(e)));
    await page.route(/^https?:/, r=>{network.push(r.request().url());return r.abort();});
    await page.route('http://localhost:8765/', r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
    await page.goto('http://localhost:8765/');await page.context().setOffline(true);

    // Untimed casual play also offers an obvious pause, with keyboard resume.
    await page.evaluate(()=>{setup.mode='pvp';setup.rules='casual';setup.tc='none';newGame();});
    assert(await page.locator('#pauseBtn').isVisible());
    const controls = await page.locator('#sessionControls').boundingBox(), board = await page.locator('#board').boundingBox();
    assert(controls.y<board.y);await page.click('#pauseBtn');
    assert.equal(await page.textContent('#pauseLabel'),'Resume game');
    assert.equal(await page.locator('#board').getAttribute('aria-readonly'),'true');
    await page.evaluate(()=>{activateSquare('e2');activateSquare('e4');});assert.equal(await page.evaluate(()=>G.moves.length),0);
    await page.locator('#pauseBtn').press('Enter');assert.equal(await page.evaluate(()=>G.paused),false);
    await page.evaluate(()=>{playMove('e2e4');playMove('e7e5');});await page.click('#pauseBtn');
    assert(await page.locator('#undoBtn').isDisabled());await page.click('#navFirst');assert.equal(await page.evaluate(()=>G.view),0);
    await page.click('#savePausedBtn');assert(await page.locator('#saveGameBtn').isVisible());await page.keyboard.press('Escape');
    assert(await page.evaluate(()=>G.paused));await page.click('#pauseBtn');assert.equal(await page.evaluate(()=>G.view),null);

    // Freeze time only after charging elapsed play. Preserve partially used delay.
    const timed = await page.evaluate(()=>{
      setup.tc='custom';setup.cw=1;setup.cb=1;setup.bonus=1;setup.btype='delay';newGame();
      G.clock.delayLeft=700;G.clock.last=performance.now()-200;
      pauseGame();return {remaining:G.clock.w,delay:G.clock.delayLeft};
    });
    assert.equal(timed.remaining,60000);assert(timed.delay<=500&&timed.delay>450);
    await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(()=>({remaining:G.clock.w,delay:G.clock.delayLeft})),timed);
    await page.click('#pauseBtn');
    assert((await page.evaluate(()=>G.clock.delayLeft))<=timed.delay);
    // Per-move clocks must not refill just because Resume was pressed.
    await page.evaluate(()=>{setup.tc='m10';newGame();G.clock.w=5000;pauseGame();});
    const perMove = await page.evaluate(()=>G.clock.w);await page.waitForTimeout(200);await page.click('#pauseBtn');
    const resumed = await page.evaluate(()=>G.clock.w);assert(resumed<=perMove&&resumed>perMove-1000);

    // A completed book result may still be waiting in the UI move-delay timer.
    await page.evaluate(()=>{setup.mode='cvc';setup.tc='none';setup.speed='slow';setup.lvlW=1;setup.lvlB=1;newGame();});
    await page.click('#pauseBtn');await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>G.moves.length),0);
    // An actual long worker search is stopped too; no result can play later.
    await page.evaluate(()=>{setup.lvlW=65;setup.lvlB=65;newGame({startFen:'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'});});
    assert(await page.evaluate(()=>G.thinking&&Object.keys(pending).length>0));await page.click('#pauseBtn');
    assert.equal(await page.evaluate(()=>Object.keys(pending).length),0);
    assert.equal(await page.evaluate(()=>G.thinking),false);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>G.moves.length),0);
    await page.evaluate(()=>{G.players.w.level=1;G.players.b.level=1;setup.speed='fast';});await page.click('#pauseBtn');
    await page.waitForFunction(()=>G.moves.length>=1);await page.click('#pauseBtn');
    const stoppedPly=await page.evaluate(()=>G.moves.length);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>G.moves.length),stoppedPly);

    // In-flight hints cannot put an arrow on a newly paused game.
    await page.evaluate(()=>{setup.mode='pvc';setup.color='w';setup.level=5;setup.tc='none';newGame();});
    await page.click('#hintBtn');await page.click('#pauseBtn');await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>G.hinting),false);assert.equal(await page.locator('#arrows line').count(),0);

    // Official games cannot pause, including CVC, but a restored game can resume.
    await page.evaluate(()=>{setup.mode='pvp';setup.rules='official';setup.tc='1+1';newGame();});
    assert(await page.locator('#pauseBtn').isDisabled());assert.equal(await page.evaluate(()=>pauseGame()),false);
    const officialClock=await page.evaluate(()=>G.clock.w);await page.waitForTimeout(200);assert((await page.evaluate(()=>G.clock.w))<officialClock);
    await page.evaluate(()=>{playMove('e2e4');activateSquare('e7');});
    await page.click('#gamesBtn');await page.fill('#saveName','Resume official');await page.click('#saveGameBtn');
    await page.click('#gamesBtn');await page.locator('[data-load-save]').first().click();await page.locator('#ov').waitFor({state:'hidden'});
    assert.equal(await page.textContent('#sessionTitle'),'Saved game paused');assert(await page.locator('#pauseBtn').isEnabled());
    const savedClock=await page.evaluate(()=>G.clock.b);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>G.clock.b),savedClock);
    await page.click('#pauseBtn');assert.equal(await page.evaluate(()=>G.touched),'e7');assert.equal(await page.evaluate(()=>G.restored),false);assert(await page.locator('#pauseBtn').isDisabled());
    await page.evaluate(()=>{setup.mode='cvc';setup.lvlW=1;setup.lvlB=1;newGame();});assert(await page.locator('#pauseBtn').isDisabled());
    await page.evaluate(()=>newGame({record:PositionTools.fromFen(START)}));assert(await page.locator('#sessionControls').isHidden());
    await page.evaluate(()=>{setup.mode='pvp';setup.rules='casual';setup.tc='none';newGame({startFen:'7k/6Q1/5K2/8/8/8/8/8 b - - 0 1'});});assert(await page.locator('#sessionControls').isHidden());

    await page.locator('#toast').waitFor({state:'hidden'});
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(viewport);await page.evaluate(()=>newGame());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const box=await page.locator('#pauseBtn').boundingBox();assert(box.height>=44);assert(box.y+box.height<=viewport.height,'Pause visible before scrolling');
      await page.click('#pauseBtn');assert(await page.locator('#pauseBtn').isVisible());
      if(viewport.width===390)await page.screenshot({path:'/tmp/chess-pause-mobile.png',fullPage:true});
      if(viewport.width===844){const board=await page.locator('#board').boundingBox();assert(board.y+board.height<=viewport.height,'Landscape board fits vertically');}
      if(viewport.width===844)await page.screenshot({path:'/tmp/chess-pause-landscape.png',fullPage:true});
    }
    await page.click('#learnTab');assert(await page.locator('#sessionControls').isHidden());await page.click('#playTab');assert(await page.locator('#sessionControls').isVisible());
    const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const touch=await touchContext.newPage();touch.on('pageerror',e=>errors.push(String(e)));
    await touch.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
    await touch.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
    await touch.goto('http://localhost:8765/');await touchContext.setOffline(true);
    await touch.evaluate(()=>{setup.mode='pvp';setup.rules='casual';setup.tc='none';newGame();});
    await touch.locator('#pauseBtn').tap();assert(await touch.evaluate(()=>G.paused));
    await touch.locator('#pauseBtn').tap();assert.equal(await touch.evaluate(()=>G.paused),false);await touchContext.close();
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    console.log('PASS: visible untimed/timed pause, keyboard resume, readonly board, save/history, delay/per-move clock continuity, cancelled workers/hints/delayed AI, official guards and restored touch lock, review/end/lesson visibility and three mobile layouts with real touch pause/resume');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
