// One-turn diagnostic of the supplied fifty-move position, not a strength match.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
(async()=>{
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--out')throw Error('Use --out /path/to/new-empty-directory');const out=path.resolve(args[1]);if(fs.existsSync(out))throw Error('Output directory must not exist');fs.mkdirSync(out,{recursive:true});
 const html=fs.readFileSync(process.env.MITCHELL_TEST_HTML||'index.html'),game=fs.readFileSync('validation/user-reports/2026-11-06-rook-draw-claim/game.pgn','utf8'),revision=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(revision.error||revision.status!==0)throw revision.error||Error(revision.stderr);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
 const start=await page.evaluate(text=>{
  const g=PositionTools.parsePgn(text),record=PositionTools.fromMoves(g.startFen,g.moves.slice(0,211),{},'*');setup.mode='pvp';setup.tc='none';setup.speed='fast';newGame({record});G.clockHist=Array(211).fill(null);G.review=false;G.official=true;G.mode='cvc';G.players={w:{type:'human'},b:{type:'ai',level:65}};G.evalW=-20;
  G.clock={w:137500,b:88700,start:{w:120000,b:120000},running:null,last:0,inc:1000,delay:0,delayLeft:0,per:0,pgn:'120+1'};
  window.probes=[];const saved=think;think=(...args)=>saved(...args).then(r=>{window.probes.push({score:r&&r.score,depth:r&&r.depth,move:r&&r.move,backend:r&&r.backend,recovery:r&&r.recovery});return r;});
  const before={fen:G.chess.fen(),claimable:G.chess.claimable(),oldGateScore:aiScore('b'),oldGateThreshold:15};startClock('b');afterChange();return before;
 },game);await page.waitForFunction(()=>G.over||G.moves.length>211,{},{timeout:10000});
 const result=await page.evaluate(()=>{tickClock();if(!G.over){G.paused=true;G.token=Math.random();cancelThinking();}return {over:G.over,plies:G.moves.length,claim:G.drawClaim||null,fen:G.chess.fen(),clocks:{w:G.clock.w,b:G.clock.b},probes:window.probes,pgn:pgn()};});
 const report={createdUtc:new Date().toISOString(),runnerRevision:revision.stdout.trim(),htmlSha256:crypto.createHash('sha256').update(html).digest('hex'),method:'Single foreground turn from the actual 211-ply history with provided rounded balances; old gate seeded from the previous -20 draw score. Stop after one move or claim; no match outcome is inferred.',start,...result,errors};fs.writeFileSync(path.join(out,'turn.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,pgn:undefined},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
