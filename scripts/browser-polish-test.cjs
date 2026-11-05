// Offline integration and narrow/coarse-pointer stress checks.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const page = await context.newPage(), errors = [], network = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route(/^https?:/, r => {network.push(r.request().url());return r.abort();});
    await page.route('http://localhost:8765/', r => r.fulfill({contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
    await page.goto('http://localhost:8765/'); await context.setOffline(true);

    await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}}));
    await page.click('#shareBtn');
    await page.waitForFunction(()=>document.querySelector('#shareStatus').textContent.startsWith('Copied.'));
    const url = await page.inputValue('#shareUrl');
    assert.equal(url, await page.evaluate(()=>window.copied));
    assert(url.includes('#fen='));
    await page.click('#copyShareBtn'); assert.equal(await page.inputValue('#shareUrl'),url);
    await page.locator('#ov [data-close]').click();
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
    await page.click('#shareBtn');
    await page.waitForFunction(()=>document.querySelector('#shareStatus').textContent.includes('manually'));
    assert.equal(await page.inputValue('#shareUrl'),url);
    await page.locator('#ov [data-close]').click();

    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{window.finishCopy=resolve;})}}));
    await page.click('#shareBtn'); await page.locator('#ov [data-close]').click();
    await page.click('#helpBtn'); await page.evaluate(()=>window.finishCopy());
    assert.match(await page.textContent('#ovBox'),/Play or learn/); await page.keyboard.press('Escape');
    await page.evaluate(()=>{setup.mode='pvc';setup.color='w';setup.level=5;setup.rules='casual';setup.tc='none';newGame();playMove('e2e4');G.paused=true;cancelThinking();});
    await page.click('#whyBtn'); assert.match(await page.textContent('#moveCueText'),/pawn in the centre/);
    await page.evaluate(()=>{setup.rules='official';newGame();}); assert(await page.locator('#whyBtn').isHidden()); assert(await page.locator('#moveCue').isHidden());
    await page.click('#learnTab');
    await page.evaluate(()=>loadLesson(LESSONS.findIndex(l=>l.title==='Develop your pieces'||l.hint&&l.hint.includes('Nf3'))));
    await page.click('#lWhy'); assert.match(await page.textContent('#lessonCard'),/develops the knight|knight can defend/);
    assert.equal(await page.locator('#arrows line').count(),1);

    await page.evaluate(()=>{lessonMove('h2h3');});
    await page.waitForFunction(()=>!LS.busy); assert(await page.locator('#lWhy').isEnabled());
    await page.click('#playTab');
    await page.evaluate(()=>newGame({record:PositionTools.parsePgn('1. e4 e5 2. Nf3 Nc6 *')}));
    await page.selectOption('#analysisBudget','100'); await page.click('#analyseBtn');
    await page.waitForFunction(()=>G.analysis?.status==='complete',null,{timeout:15000});
    await page.evaluate(()=>setView(0));
    assert.match(await page.textContent('#analysisScore'),/Position 0/);
    assert.match(await page.textContent('#analysisBest'),/Suggested:/);
    assert.equal(await page.locator('#arrows line').count(),1);
    const endpoints = await page.evaluate(()=>({from:currentRecommendation().from,to:currentRecommendation().to}));
    assert(await page.evaluate(({from,to})=>!!new E.Chess(curFen()).findUci(from+to),endpoints));
    await page.locator('#analysisGraph').focus(); await page.keyboard.press('ArrowRight'); assert.equal(await page.evaluate(()=>G.view),1);
    await page.keyboard.press('End'); assert.equal(await page.evaluate(()=>G.view),null);
    await page.keyboard.press('Home'); assert.equal(await page.evaluate(()=>G.view),0);
    const graphBox=await page.locator('#analysisGraph').boundingBox();
    await page.touchscreen.tap(graphBox.x+graphBox.width*.6,graphBox.y+graphBox.height/2);
    assert.equal(await page.evaluate(()=>G.view),2);
    await page.uncheck('#analysisArrows'); assert.equal(await page.locator('#arrows line').count(),0);
    await page.check('#analysisArrows');
    const beforeFlip = await page.locator('#arrows line').getAttribute('x1');
    await page.click('#flipBtn'); assert.notEqual(await page.locator('#arrows line').getAttribute('x1'),beforeFlip);
    await page.locator('#analysisCard').screenshot({path:'/tmp/chess-review-polish.png'});
    await page.evaluate(()=>newGame({record:PositionTools.fromFen('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1')}));
    await page.click('#analyseBtn'); await page.waitForFunction(()=>G.analysis?.status==='complete');
    assert.equal(await page.locator('#arrows line').count(),0); assert.match(await page.textContent('#analysisBest'),/Terminal/);

    for (const viewport of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:667,height:375}]) {
      await page.setViewportSize(viewport);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(viewport));
      for (const selector of ['#shareBtn','#helpBtn','#navFirst','#analysisArrows']) {
        const target = selector==='#analysisArrows' ? page.locator('.check-control') : page.locator(selector);
        const box = await target.boundingBox(); assert(box.height>=44,selector+JSON.stringify(viewport));
      }
    }
    await page.setViewportSize({width:320,height:568});
    await page.evaluate(()=>{setup.mode='pvp';setup.rules='casual';newGame({startFen:'8/7P/4k3/8/8/8/8/4K3 w - - 0 1'});showPromo('h7','h8');});
    const promotion=await page.locator('.promo').boundingBox(),board=await page.locator('#boardwrap').boundingBox();
    assert(promotion.x+promotion.width<=board.x+board.width+1,'Edge promotion stays inside board');
    for(const box of await page.locator('.promo button').evaluateAll(buttons=>buttons.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})))) assert(box.w>=44&&box.h>=44);
    await page.locator('.promo [data-p="n"]').tap(); assert.equal(await page.evaluate(()=>G.moves[0]),'h7h8n');
    await page.screenshot({path:'/tmp/chess-narrow-polish.png',fullPage:true});
    assert.deepEqual(errors,[]); assert.deepEqual(network,[]);
    console.log('PASS: persistent share URL and denied clipboard fallback; lesson/low-level cues and official exclusion; real review arrows, flip/toggle/terminal/keyboard graph; six mobile/tablet viewports and edge underpromotion targets');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
