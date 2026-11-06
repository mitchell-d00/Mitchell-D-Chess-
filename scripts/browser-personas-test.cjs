const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html','utf8')}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
  await page.locator('#personaPanel summary').click();
  assert.equal(await page.locator('[data-persona-preset]').inputValue(),'standard');
  await page.locator('[data-persona-preset]').selectOption('2');
  assert.equal(await page.locator('[data-persona-slider]').inputValue(),'65');
  assert.equal(await page.evaluate(()=>G.players.b.persona),undefined,'Settings do not change a running game');
  await page.locator('[data-persona-name]').fill('My attacker');await page.locator('[data-persona-name]').press('Tab');
  await page.locator('#lvl').fill('52');await page.locator('[data-persona-save]').click();
  assert.equal(await page.evaluate(()=>savedOpponents[0].level),52);
  // Start as Black so the actual AI worker must receive the chosen persona.
  await page.locator('#colorSeg [data-c="b"]').click();
  await page.evaluate(()=>{window.personaRequests=[];window.personaReplies=[];window.personaThink=think;think=(f,m,l,x)=>{personaRequests.push({l,extra:JSON.parse(JSON.stringify(x||{}))});return personaThink(f,m,l,{...x,time:25,noBook:true}).then(r=>{personaReplies.push(r);return r;});};});
  await page.locator('#newBtn').click();await page.waitForFunction(()=>G.moves.length===1);
  assert.equal(await page.evaluate(()=>personaRequests[0].extra.persona.name),'My attacker');
  assert.equal(await page.evaluate(()=>personaReplies[0].backend),'wasm');
  const pg=await page.evaluate(()=>pgn());assert.match(pg,/\[WhitePersona "My attacker"\]/);assert.match(pg,/\[WhiteAggression "65"\]/);assert.match(pg,/\[WhiteStylePolicy "style-v1"\]/);
  assert.equal(await page.evaluate(()=>PositionTools.parsePgn(pgn()).tags.WhitePersona),'My attacker');
  // Saved-game validation and restore retain the selected style independently of setup.
  await page.evaluate(()=>{window.personaSave=snapshotGame();const id=library.save('Persona game',personaSave);window.personaSaved=library.load(id);});
  assert.equal(await page.evaluate(()=>personaSave.players.w.persona.aggression),65);
  await page.evaluate(()=>{const s=personaSaved;restoreGame(s,PositionTools.fromMoves(s.game.startFen,s.game.moves,s.game.tags,'*'));});
  assert.equal(await page.evaluate(()=>G.players.w.persona.name),'My attacker');assert.equal(await page.evaluate(()=>G.paused),true);
  // Avoid the unfinished-game confirmation for test setup; actual changes use normal UI.
  await page.evaluate(()=>{setup.mode='cvc';setup.tc='none';setup.personaW=null;setup.personaB=null;newGame();G.paused=true;cancelThinking();G.thinking=false;});
  assert.equal(await page.locator('.persona-editor').count(),2);
  await page.locator('[data-persona="white"] [data-persona-preset]').selectOption('0');
  await page.locator('[data-persona="black"] [data-persona-load]').selectOption('0');
  assert.equal(await page.evaluate(()=>setup.personaW.aggression),-80);assert.equal(await page.evaluate(()=>setup.personaB.aggression),65);assert.equal(await page.evaluate(()=>setup.lvlB),52);
  await page.evaluate(()=>{setup.lvlW=20;setup.lvlB=52;setup.tc='2+1';newGame();});
  await page.waitForFunction(()=>G.moves.length>=2);await page.evaluate(()=>{G.paused=true;cancelThinking();G.thinking=false;});
  const paired=await page.evaluate(()=>({players:G.players,requests:personaRequests.slice(-2),pgn:pgn()}));
  assert.equal(paired.players.w.persona.aggression,-80);assert.equal(paired.players.b.persona.aggression,65);assert.match(paired.pgn,/WhitePersona "Solid Defender"/);assert.match(paired.pgn,/BlackPersona "My attacker"/);
  assert(paired.requests.some(r=>r.extra.persona.aggression===-80));assert(paired.requests.some(r=>r.extra.persona.aggression===65));assert(paired.requests.every(r=>Number.isFinite(r.extra.clockDeadline)&&r.extra.time>0&&r.extra.maxWallMs>0),'Personas use the normal clock allocator and wall limit');
  // Standard is one click, affects the next game, and is a clean worker request.
  await page.locator('#personasOff').click();assert.equal(await page.evaluate(()=>setup.personaW),null);assert.equal(await page.evaluate(()=>G.players.w.persona.name),'Solid Defender');
  await page.evaluate(()=>{setup.mode='pvc';setup.color='b';setup.level=52;newGame();});await page.waitForFunction(()=>G.moves.length===1);
  assert.equal(await page.evaluate(()=>personaRequests.at(-1).extra.persona),undefined);assert.equal(await page.evaluate(()=>G.players.w.persona),undefined);
  assert.match(await page.evaluate(()=>pgn()),/WhitePersona "Standard engine"/);
  // Named opponents survive a reload and support deliberate replacement/deletion.
  await page.reload();await page.waitForSelector('#personaPanel');assert.equal(await page.evaluate(()=>savedOpponents[0].name),'My attacker');
  await page.evaluate(()=>{setup.mode='pvc';setup.color='w';newGame();});
  if(!await page.locator('#personaPanel').evaluate(x=>x.open))await page.locator('#personaPanel summary').click();
  await page.locator('[data-persona-load]').selectOption('0');assert.equal(await page.locator('#lvl').inputValue(),'52');
  await page.locator('[data-persona-slider]').fill('-50');await page.locator('[data-persona-save]').click();assert.equal(await page.evaluate(()=>savedOpponents.length),1);assert.equal(await page.evaluate(()=>savedOpponents[0].aggression),-50);
  await page.locator('[data-persona-load]').selectOption('0');await page.locator('[data-persona-delete]').click();assert.equal(await page.evaluate(()=>savedOpponents.length),0);
  const quota=await page.evaluate(()=>{
   const key='mitchell-d-chess.opponents.v1',prior=localStorage.getItem(key),list=JSON.stringify(savedOpponents),set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Quota','QuotaExceededError');return set.call(this,k,v);};
   try{return{ok:writeOpponents([{name:'Blocked',level:52,aggression:50}]),same:localStorage.getItem(key)===prior&&JSON.stringify(savedOpponents)===list};}finally{Storage.prototype.setItem=set;}
  });assert.equal(quota.ok,false);assert.equal(quota.same,true);
  // Text is escaped and narrow portrait/landscape editors fit without horizontal overflow.
  await page.locator('[data-persona-name]').fill('<img src=x onerror=alert(1)>');await page.locator('[data-persona-name]').press('Tab');await page.evaluate(()=>syncPersonas());assert.equal(await page.locator('#personaEditors img').count(),0);
  for(const [width,height]of [[375,812],[844,390],[768,1024]]){
   await page.setViewportSize({width,height});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Layout ${width}x${height}`);
   assert(await page.locator('[data-persona-slider]').evaluate(x=>x.getBoundingClientRect().height>=44));
  }
  await page.evaluate(()=>{setup.mode='pvp';newGame();});assert.equal(await page.locator('#personaPanel').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS: offline persona UI, real JS/WASM workers, independent sides, clean Standard reset, PGN/save/reload, named profiles, escaped names and mobile layouts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
