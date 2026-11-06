// Original MIT: verify static clock-experiment records without executing them.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const E=require('./engine.cjs')(),T=require('../ui/position-tools.js')(E),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let games=0,plies=0;
for(const directory of process.argv.slice(2)){
 const root=path.resolve(directory),read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8')),summary=read('summary.json'),protocol=read('protocol.json');
 assert.equal(summary.complete,true);assert.equal(summary.games.length,2);assert(/^\d+(?:\.\d+)?\+0$/.test(protocol.control));assert.equal(protocol.concurrency,2);
 const initial=Number(protocol.control.split('+')[0])*1000;assert(initial>=1000&&initial<=300000);
 for(const [name,hash]of Object.entries(summary.files)){assert(!name.includes('/')&&!name.includes('\\')&&name!=='.'&&name!=='..');assert.equal(sha(fs.readFileSync(path.join(root,name))),hash,name);}
 for(let i=0;i<2;i++){
  const stem=String(i+1).padStart(2,'0'),r=read(stem+'.json'),game=T.parsePgn(fs.readFileSync(path.join(root,stem+'.pgn'),'utf8'));
  const {trace,...reported}=r;assert.deepEqual(reported,summary.games[i]);assert.equal(r.completed,true);assert.equal(r.error,null);assert.deepEqual(r.errors,[]);
  assert.deepEqual([r.whiteLevel,r.blackLevel],i===0?[65,52]:[52,65]);assert.equal(game.result,r.over.result);assert.equal(game.moves.length,r.plies);assert.equal(trace.length,r.plies);
  if(protocol.startFen)assert.equal(game.startFen,protocol.startFen);
  let w=initial,b=initial;for(const [index,t]of trace.entries()){assert.equal(t.ply,index+1);assert.equal(t.lastMove,game.moves[index]);assert(Number.isFinite(t.whiteMs)&&t.whiteMs>=0&&t.whiteMs<=w);assert(Number.isFinite(t.blackMs)&&t.blackMs>=0&&t.blackMs<=b);w=t.whiteMs;b=t.blackMs;
   if(t.clockMode!=null)assert(['balanced','saving time','time trouble','emergency','per-move'].includes(t.clockMode));
   if(t.allowanceMs!=null)assert(Number.isFinite(t.allowanceMs)&&t.allowanceMs>=0);
   if(t.overheadMs!=null)assert(Number.isFinite(t.overheadMs)&&t.overheadMs>=20&&t.overheadMs<=2000);
  }
  assert(r.whiteMs>=0&&r.whiteMs<=w);assert(r.blackMs>=0&&r.blackMs<=b);
  if(r.over.reason==='White lost on time')assert.equal(r.whiteMs,0);if(r.over.reason==='Black lost on time')assert.equal(r.blackMs,0);
  games++;plies+=r.plies;
 }
}
assert(games>0,'Supply one or more clock experiment directories');console.log(`PASS: static hashes, clock traces and ${games} legal PGNs (${plies} half-moves); clock losses retained`);
