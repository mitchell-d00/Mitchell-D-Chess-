// Optional original MIT UI integration experiment, not a strength benchmark.
// Two colour-reversed games at 1+0, actual clocks/workers/book and Fast speed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const args=process.argv.slice(2),outAt=args.indexOf('--out');
 if(outAt<0||!args[outAt+1]||args.length!==2)throw Error('Use --out /path/to/new-empty-directory; MITCHELL_TEST_HTML optionally selects the HTML');
 const out=path.resolve(args[outAt+1]);if(fs.existsSync(out))throw Error('Output directory must not exist');
 const htmlPath=path.resolve(process.env.MITCHELL_TEST_HTML||'index.html'),html=fs.readFileSync(htmlPath);
 const rev=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(rev.error||rev.status!==0)throw rev.error||Error(rev.stderr);
 fs.mkdirSync(out,{recursive:true});
 const protocol={startedUtc:new Date().toISOString(),htmlPath,htmlSha256:sha(html),runnerRevision:rev.stdout.trim(),runnerSha256:sha(fs.readFileSync(__filename)),node:process.version,host:{platform:os.platform(),arch:os.arch(),cpus:os.cpus().length},control:'60+0',rules:'casual',speed:'fast',book:true,concurrency:2,notes:['UI integration experiment, not an Elo estimate.','Both actual browser clocks run; flag falls count. No move-limit or score adjudication.','Two pages share the same host; no browser CPU throttling is requested.']};
 fs.writeFileSync(path.join(out,'protocol.json'),JSON.stringify(protocol,null,2)+'\n');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  protocol.browser=browser.version();fs.writeFileSync(path.join(out,'protocol.json'),JSON.stringify(protocol,null,2)+'\n');
  const runs=await Promise.allSettled([[65,52],[52,65]].map(async(levels,index)=>{
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   try{
    await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
    await page.evaluate(([white,black])=>{window.clockTrace=[];const move=playMove;playMove=function(uci,fromAI){const ok=move(uci,fromAI);if(ok)window.clockTrace.push({ply:G.moves.length,whiteMs:G.clock.w,blackMs:G.clock.b,source:G.engineSource?.text||'',lastMove:uci});return ok;};setup.mode='cvc';setup.tc='1+0';setup.rules='casual';setup.speed='fast';setup.lvlW=white;setup.lvlB=black;newGame();},levels);
    let error=null;try{await page.waitForFunction(()=>!!G.over,{},{timeout:180000,polling:200});}catch(e){error=String(e);}
    const result=await page.evaluate(()=>({over:G.over,plies:G.moves.length,whiteMs:G.clock.w,blackMs:G.clock.b,pgn:pgn(),trace:window.clockTrace}));
    const pgn=result.pgn;delete result.pgn;const stem=String(index+1).padStart(2,'0');fs.writeFileSync(path.join(out,stem+'.pgn'),pgn+'\n');
    const E=require('./engine.cjs')(htmlPath),T=require('../ui/position-tools.js')(E);assert.equal(T.parsePgn(pgn).moves.length,result.plies);
    Object.assign(result,{whiteLevel:levels[0],blackLevel:levels[1],completed:!!result.over&&!error,error,errors,finishedUtc:new Date().toISOString()});fs.writeFileSync(path.join(out,stem+'.json'),JSON.stringify(result,null,2)+'\n');
    assert(!error&&result.over,'Game must complete');assert.deepEqual(errors,[]);return {...result,trace:undefined};
   }finally{await page.close();}
  }));
  const summary={finishedUtc:new Date().toISOString(),complete:runs.every(r=>r.status==='fulfilled'),games:runs.map(r=>r.status==='fulfilled'?r.value:{error:String(r.reason)}),files:Object.fromEntries(fs.readdirSync(out).map(n=>[n,sha(fs.readFileSync(path.join(out,n)))]))};
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(!summary.complete)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
