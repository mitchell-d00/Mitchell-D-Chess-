// Original MIT. Finite-clock, colour-paired matches through the unmodified game UI/worker.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const OPENINGS=[
 ['Ruy Lopez','e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6'],
 ['Italian','e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6'],
 ['Open Sicilian','e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6'],
 ['French Tarrasch','e2e4 e7e6 d2d4 d7d5 b1d2 g8f6 e4e5 f6d7'],
 ['Caro-Kann Advance','e2e4 c7c6 d2d4 d7d5 e4e5 c8f5 g1f3 e7e6'],
 ['Queens Gambit Declined','d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7'],
 ['Slav','d2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4'],
 ['Kings Indian','d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6'],
 ['English Four Knights','c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5'],
 ['Nimzo-Larsen','b2b3 e7e5 c1b2 b8c6 e2e3 g8f6 f1b5 d7d6']
].map(([name,moves])=>({name,moves:moves.split(' ')}));
function options(argv){
 const allowed=['out','html','games','seconds','increment','concurrency','timeout-minutes'],a={games:20,seconds:60,increment:1,concurrency:2,'timeout-minutes':30};
 for(let i=0;i<argv.length;i+=2){const key=argv[i]?.replace(/^--/,'');if(!argv[i]?.startsWith('--')||!allowed.includes(key)||!argv[i+1])throw Error('Use --out NEW_DIRECTORY [--html HTML --games 20 --seconds 60 --increment 1 --concurrency 2 --timeout-minutes 30]');a[key]=argv[i+1];}
 if(!a.out)throw Error('--out is required');for(const key of allowed.filter(k=>!['out','html'].includes(k)))a[key]=Number(a[key]);
 assert(Number.isInteger(a.games)&&a.games>=2&&a.games<=200&&a.games%2===0,'Games must be even in 2–200');assert([1,2].includes(a.concurrency));assert(a.seconds>=1&&a.seconds<=300&&Number.isFinite(a.seconds));assert(Number.isInteger(a.increment)&&a.increment>=0&&a.increment<=30);assert(a['timeout-minutes']>=1&&a['timeout-minutes']<=120);return a;
}
function totals(games){
 const out={wins65:0,draws:0,losses65:0,flags65:0,flags51:0,recoveries:0};
 for(const g of games){if(!g.completed)continue;const r=g.over.result;if(r==='1/2-1/2')out.draws++;else if((r==='1-0')===(g.whiteLevel===65))out.wins65++;else out.losses65++;
  if(/lost on time|ran out of time/.test(g.over.reason)){const side=/^White/.test(g.over.reason)?'w':'b',level=side==='w'?g.whiteLevel:g.blackLevel;out[level===65?'flags65':'flags51']++;}out.recoveries+=g.engineRecoveries;
 }
 const n=out.wins65+out.draws+out.losses65;return {...out,completed:n,score65:n?(out.wins65+out.draws/2)/n:null};
}
async function main(){
 const a=options(process.argv.slice(2)),out=path.resolve(a.out);if(fs.existsSync(out))throw Error('Output directory must not exist');
 const htmlPath=path.resolve(a.html||process.env.MITCHELL_TEST_HTML||path.join(__dirname,'../index.html')),html=fs.readFileSync(htmlPath);
 const E=require('./engine.cjs')(htmlPath),toolsPath=fs.existsSync(path.join(__dirname,'position-tools.js'))?path.join(__dirname,'position-tools.js'):path.join(__dirname,'../ui/position-tools.js'),T=require(toolsPath)(E);
 for(const opening of OPENINGS){const p=new E.Chess();for(const u of opening.moves){const m=p.findUci(u);assert(m,'Invalid opening '+opening.name);p.make(m);}assert(!p.status(false));assert(E.bookLines.some(line=>opening.moves.every((u,i)=>u===line[i])),'Opening must be in the frozen book');}
 const rev=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});if(rev.error||rev.status!==0)throw rev.error||Error(rev.stderr);
 fs.mkdirSync(out,{recursive:true});for(const [name,data]of [['engine-under-test.html',html],['runner.cjs',fs.readFileSync(__filename)],['engine.cjs',fs.readFileSync(path.join(__dirname,'engine.cjs'))],['position-tools.js',fs.readFileSync(toolsPath)]])fs.writeFileSync(path.join(out,name),data);
 const frozenFiles=Object.fromEntries(fs.readdirSync(out).map(name=>[name,sha(fs.readFileSync(path.join(out,name)))]));
 const protocol={schema:1,startedUtc:new Date().toISOString(),revision:rev.stdout.trim(),htmlSha256:sha(html),engineSha256:sha(html.toString().match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1]),frozenFiles,node:process.version,host:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,cpuMax:fs.existsSync('/sys/fs/cgroup/cpu.max')?fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim():null},games:a.games,levels:[65,51],seconds:a.seconds,increment:a.increment,control:String(a.seconds)+(a.increment?'+'+a.increment:''),concurrency:a.concurrency,timeoutMinutes:a['timeout-minutes'],rules:'casual',speed:'fast',personas:'Standard engine',openings:OPENINGS,notes:['Each opening is played twice with colours reversed. The same first 8 plies are prescribed, not charged or incremented; both clocks start at the supplied main time after that prefix.','Uses actual app clocks, allocation, book and worker; no engine, search-time or move-delay overrides. Worker/network initialization is warmed before clocks start.','Offline after load. Two headless pages share this host; background timer/renderer throttling disabled.','No move-limit, evaluation or material adjudication beyond normal app rules. Administrative wall timeout retains an incomplete game, never manufactures a draw.','Book choices and wall-clock search timing are not seeded; repetition means the protocol is repeatable, not identical move sequences.','Within-engine level comparison only, not an absolute Elo estimate.']};
 const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');write('protocol.json',protocol);
 const games=[],active=new Map();let next=0;
 function progress(){const value={updatedUtc:new Date().toISOString(),expected:a.games,...totals(games),games:games.slice().sort((x,y)=>x.game-y.game),active:Array.from(active,([game,status])=>({game,...status}))};write('progress.json',value);return value;}
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  protocol.browser=browser.version();write('protocol.json',protocol);
  async function run(index){
   const game=index+1,stem=String(game).padStart(2,'0'),opening=OPENINGS[Math.floor(index/2)%OPENINGS.length],levels=index%2?[51,65]:[65,51],page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[],trace=[],startedUtc=new Date().toISOString();let timer,error=null,result;
   active.set(game,{opening:opening.name,white:levels[0],black:levels[1],ply:8});progress();console.log(`START game ${game}/${a.games}: ${levels[0]} white, ${levels[1]} black; ${opening.name}`);
   page.on('pageerror',e=>errors.push(String(e)));
   try{
    await page.exposeFunction('matchMove',row=>{trace.push(row);fs.appendFileSync(path.join(out,stem+'.jsonl'),JSON.stringify(row)+'\n');active.set(game,{opening:opening.name,white:levels[0],black:levels[1],ply:row.ply,whiteMs:row.whiteMs,blackMs:row.blackMs});});
    await page.route('http://localhost:8765/',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://localhost:8765/');await page.context().setOffline(true);
    const warmed=await page.evaluate(async()=>{setup.mode='pvp';setup.tc='none';newGame();return think(null,[],64,{time:1,noBook:true});});assert.equal(warmed.backend,'wasm','Required native backend must be available');
    await page.evaluate(({levels,opening,seconds,increment,game})=>{
     const originalThink=think,originalMove=playMove;window.matchReply=null;
     think=(fen,moves,level,extra)=>originalThink(fen,moves,level,extra).then(r=>{window.matchReply={ply:moves.length,level:level+1,result:r};return r;});
     playMove=(uci,fromAI)=>{
      const ply=G.moves.length,reply=window.matchReply,diag=currentThinkDiagnostic(),timing={clockMode:G.clockMode,allowanceMs:G.thinkBudget,overheadMs:G.aiClockOverhead??null};
      const ok=originalMove(uci,fromAI);if(ok){const r=reply&&reply.ply===ply?reply.result:{};window.matchMove({ply:ply+1,move:uci,whiteMs:G.clock.w,blackMs:G.clock.b,level:reply?.level,backend:r.backend||'',depth:r.depth||0,nodes:r.nodes||0,score:r.score??null,book:!!r.book,recovery:r.recovery||null,timeBudgetMs:r.timeBudget??null,wallMs:diag?.wallMs??null,...timing}).catch(()=>{});}return ok;
     };
     setup.mode='cvc';setup.tc='custom';setup.cw=setup.cb=seconds/60;setup.bonus=increment;setup.btype='inc';setup.rules='casual';setup.speed='fast';setup.persona=setup.personaW=setup.personaB=null;setup.lvlW=levels[0];setup.lvlB=levels[1];
     const record=PositionTools.fromMoves(START,opening.moves,{},'*');newGame({record});
     Object.assign(G,{mode:'cvc',review:false,players:{w:{type:'ai',level:levels[0]},b:{type:'ai',level:levels[1]}},clock:makeClock(),clockHist:Array(opening.moves.length).fill(null),official:false});
     G.tags={...personaTags(G.players),Event:'Mitchell level 65 vs 51 browser match',Round:String(game),Opening:opening.name,PrescribedPlies:String(opening.moves.length),ClocksStartPly:String(opening.moves.length+1)};startClock(sideToMove());afterChange();
    },{levels,opening,seconds:a.seconds,increment:a.increment,game});
    timer=setInterval(()=>{progress();console.log(`PROGRESS ${JSON.stringify({completed:totals(games).completed,active:Array.from(active,([game,state])=>({game,...state}))})}`);},30000);
    try{await page.waitForFunction(()=>!!G.over,{},{timeout:a['timeout-minutes']*60000,polling:250});}catch(e){error=String(e);}
    result=await page.evaluate(()=>({over:G.over,plies:G.moves.length,whiteMs:G.clock.w,blackMs:G.clock.b,engineRecoveries:G.engineRecoveries||0,inactiveMs:gameInactiveMs(),pgn:pgn()}));
    fs.writeFileSync(path.join(out,stem+'.pgn'),result.pgn+'\n');const parsed=T.parsePgn(result.pgn);delete result.pgn;assert.equal(parsed.moves.length,result.plies);assert.equal(parsed.tags.TimeControl,protocol.control);
   }catch(e){error=String(e.stack||e);try{const partial=await page.evaluate(()=>({over:G?.over,plies:G?.moves.length,pgn:G?pgn():''}));if(partial.pgn)fs.writeFileSync(path.join(out,stem+'.pgn'),partial.pgn+'\n');}catch{} }
   finally{
    clearInterval(timer);await page.close();result={game,opening:opening.name,openingMoves:opening.moves,whiteLevel:levels[0],blackLevel:levels[1],startedUtc,finishedUtc:new Date().toISOString(),...result,completed:!!result?.over&&!error&&errors.length===0,error,errors,traceMoves:trace.length};
    write(stem+'.json',result);games.push(result);active.delete(game);progress();console.log(`RESULT ${JSON.stringify(result)}`);
   }
  }
  await Promise.all(Array.from({length:a.concurrency},async()=>{while(next<a.games){const index=next++;await run(index);}}));
 }finally{await browser.close();}
 const summary={schema:1,finishedUtc:new Date().toISOString(),complete:games.length===a.games&&games.every(g=>g.completed),...totals(games),games:games.sort((x,y)=>x.game-y.game),files:Object.fromEntries(fs.readdirSync(out).filter(n=>n!=='summary.json').map(n=>[n,sha(fs.readFileSync(path.join(out,n)))]))};write('summary.json',summary);console.log('SUMMARY '+JSON.stringify({...summary,files:undefined,games:undefined}));if(!summary.complete)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={OPENINGS,options,totals};
