// Original MIT. Independent static recount of frozen browser-level match evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function verify(directory){
 const root=path.resolve(directory),read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8')),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 const protocol=read('protocol.json'),summary=read('summary.json');
 const checkFiles=files=>{for(const [name,hash]of Object.entries(files)){assert(name===path.basename(name)&&name!=='.'&&name!=='..'&&!name.includes('\\'),'Unsafe evidence path');assert.equal(sha(name),hash,'Evidence hash mismatch: '+name);}};
 checkFiles(summary.files);checkFiles(protocol.frozenFiles);assert.equal(sha('engine-under-test.html'),protocol.htmlSha256);
 const html=fs.readFileSync(path.join(root,'engine-under-test.html'),'utf8');assert.equal(crypto.createHash('sha256').update(html.match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1]).digest('hex'),protocol.engineSha256);
 assert.equal(summary.complete,true,'Incomplete campaigns must not be presented as completed');assert.deepEqual(protocol.levels,[65,51]);assert.equal(protocol.rules,'casual');assert.equal(protocol.personas,'Standard engine');assert([1,2].includes(protocol.concurrency));assert.equal(summary.games.length,protocol.games);assert.equal(protocol.games%2,0);
 const E=require('./engine.cjs')(path.join(root,'engine-under-test.html')),T=require('../ui/position-tools.js')(E);
 let wins=0,draws=0,losses=0,plies=0,traceMoves=0,flags65=0,flags51=0,recoveries=0,backends={},inactiveMs=0;const byColour={white:{wins:0,draws:0,losses:0},black:{wins:0,draws:0,losses:0}};
 for(let index=0;index<protocol.games;index++){
  const stem=String(index+1).padStart(2,'0'),r=read(stem+'.json'),g=T.parsePgn(fs.readFileSync(path.join(root,stem+'.pgn'),'utf8')),trace=fs.readFileSync(path.join(root,stem+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)),opening=protocol.openings[Math.floor(index/2)%protocol.openings.length];
  assert.deepEqual(summary.games[index],r);assert.equal(r.game,index+1);assert.equal(r.completed,true);assert.equal(r.error,null);assert.deepEqual(r.errors,[]);assert.deepEqual([r.whiteLevel,r.blackLevel],index%2?[51,65]:[65,51]);assert.equal(r.opening,opening.name);assert.deepEqual(r.openingMoves,opening.moves);assert.deepEqual(Array.from(g.moves.slice(0,opening.moves.length)),opening.moves);
  assert.equal(g.tags.Round,String(index+1));assert.equal(g.tags.TimeControl,protocol.control);assert.equal(g.tags.PrescribedPlies,String(opening.moves.length));assert.equal(g.tags.ClocksStartPly,String(opening.moves.length+1));assert.match(g.tags.White,new RegExp('level '+r.whiteLevel+' '));assert.match(g.tags.Black,new RegExp('level '+r.blackLevel+' '));
  for(const name of ['White','Black']){assert.equal(g.tags[name+'Persona'],'Standard engine');assert.equal(g.tags[name+'Aggression'],'0');}
  assert.equal(g.moves.length,r.plies);assert.equal(trace.length,r.plies-opening.moves.length);assert.equal(r.traceMoves,trace.length);assert.equal(g.result,r.over.result);
  const p=new E.Chess(g.startFen);let terminal=null;
  for(let i=0;i<g.moves.length;i++){assert.equal(terminal,null,'Moves played after a terminal position');const m=p.findUci(g.moves[i]);assert(m);p.make(m);terminal=p.status(false);}
  if(terminal)assert.deepEqual(JSON.parse(JSON.stringify(terminal)),r.over,'Natural ending must match the board');
  else{
   assert(/lost on time|ran out of time/.test(r.over.reason),'Nonterminal ending must be a recorded flag fall');
   const loser=/^White/.test(r.over.reason)?'w':'b',opp=loser==='w'?'b':'w',expected=p.canMate(opp)?(opp==='w'?'1-0':'0-1'):'1/2-1/2';assert.equal(r.over.result,expected);assert.equal(r[loser==='w'?'whiteMs':'blackMs'],0);
   if((loser==='w'?r.whiteLevel:r.blackLevel)===65)flags65++;else flags51++;
  }
  let w=protocol.seconds*1000,b=w,playedRecoveries=0;
  for(let i=0;i<trace.length;i++){
   const t=trace[i],ply=opening.moves.length+i+1,white=ply%2===1;assert.equal(t.ply,ply);assert.equal(t.move,g.moves[ply-1]);assert.equal(t.level,white?r.whiteLevel:r.blackLevel);assert(Number.isFinite(t.whiteMs)&&t.whiteMs>=0&&t.whiteMs<=w+(white?protocol.increment*1000:0)+.01);assert(Number.isFinite(t.blackMs)&&t.blackMs>=0&&t.blackMs<=b+(!white?protocol.increment*1000:0)+.01);w=t.whiteMs;b=t.blackMs;
   assert(['wasm','js-fallback','clock-fallback'].includes(t.backend));backends[t.backend]=(backends[t.backend]||0)+1;
   assert(Number.isFinite(t.allowanceMs)&&t.allowanceMs>=1&&t.allowanceMs<=E.LEVELS[t.level-1].t);if(t.timeBudgetMs!==null)assert(t.timeBudgetMs>=1&&t.timeBudgetMs<=t.allowanceMs);assert(t.nodes>=0&&Number.isInteger(t.nodes));assert(t.depth>=0&&t.depth<=64);if(t.recovery){assert(['timeout','worker-error'].includes(t.recovery));playedRecoveries++;}
  }
  assert(r.whiteMs>=0&&r.whiteMs<=w+.01);assert(r.blackMs>=0&&r.blackMs<=b+.01);assert(r.engineRecoveries>=playedRecoveries);assert.equal(Number(g.tags.SessionEngineRecoveries),r.engineRecoveries);assert(Math.abs(Number(g.tags.SessionInactiveMs)-r.inactiveMs)<=1);
  const bucket=byColour[r.whiteLevel===65?'white':'black'];if(g.result==='1/2-1/2'){draws++;bucket.draws++;}else if((g.result==='1-0')===(r.whiteLevel===65)){wins++;bucket.wins++;}else{losses++;bucket.losses++;}
  recoveries+=r.engineRecoveries;inactiveMs+=r.inactiveMs;plies+=r.plies;traceMoves+=trace.length;
 }
 for(const [key,value]of Object.entries({wins65:wins,draws,losses65:losses,flags65,flags51,recoveries,completed:protocol.games,score65:(wins+draws/2)/protocol.games}))assert.equal(summary[key],value,'Recount mismatch: '+key);
 return {games:protocol.games,control:protocol.control,wins65:wins,draws,losses65:losses,score65:(wins+draws/2)/protocol.games,byColour,flags65,flags51,recoveries,inactiveMs,plies,traceMoves,backends,htmlSha256:protocol.htmlSha256};
}
if(require.main===module){assert.equal(process.argv.length,3,'Supply one completed match directory');console.log(JSON.stringify(verify(process.argv[2]),null,2));console.log('PASS: frozen identities, complete paired games, legal PGNs/terminal results, per-move clocks, native routing and independent score recount');}
module.exports=verify;
