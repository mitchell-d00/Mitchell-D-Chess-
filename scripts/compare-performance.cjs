// Repeated, alternating comparisons: exact evaluation and fixed-depth search.
// node scripts/compare-performance.cjs /path/to/baseline.html [repeats=5] [depth=8]
const fs = require('node:fs'), crypto = require('node:crypto'), os = require('node:os');
const load = require('./engine.cjs');
const baseline = process.argv[2], repeats = +(process.argv[3] || 5), depth = +(process.argv[4] || 8);
if (!baseline || !Number.isInteger(repeats) || repeats<2) throw Error('Provide baseline HTML and at least two repeats');
const paths = {baseline,candidate:'index.html'}, engines = Object.fromEntries(Object.entries(paths).map(([key,file])=>[key,load(file)]));
const fens = [
 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7',
 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
 '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'];
const walk = [], reference = new engines.baseline.Chess(); let seed=333;
for(let i=0;i<64;i++){const legal=reference.legalMoves();if(!legal.length)break;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const m=legal[seed%legal.length];walk.push(reference.uci(m));reference.make(m);}
function micro(E, rounds, wasm){
 E.NNUE_CONFIG.wasm=wasm;const p=new E.Chess();E.neuralEvaluate(p);
 const moves=walk.map(u=>{const m=p.findUci(u);p.make(m);return m;});for(const m of moves)p.unmake();
 let checksum=0;const start=performance.now();
 for(let n=0;n<rounds;n++){for(const m of moves){p.make(m);checksum+=p.nnue.score(p.side);}for(const m of moves)p.unmake();}
 return {ms:performance.now()-start,evaluations:rounds*moves.length,checksum};
}
function search(E){
 E.NNUE_CONFIG.wasm=true;let nodes=0,ms=0;const cases=[];
 for(const fen of fens){new E.Searcher(new E.Chess(),{eval:'mat'});const p=new E.Chess(fen),s=new E.Searcher(p,{adv:true,eval:'nnue'});s.rootDepth=depth;const start=performance.now();const score=s.negamax(depth,-1e6,1e6,0,false,0),elapsed=performance.now()-start;nodes+=s.nodes;ms+=elapsed;cases.push({score,nodes:s.nodes,ms:elapsed});}
 return {nodes,ms,nps:nodes*1000/ms,cases};
}
const data={createdUtc:new Date().toISOString(),node:process.version,platform:os.platform(),arch:os.arch(),logicalCpus:os.cpus().length,depth,repeats,hashes:Object.fromEntries(Object.entries(paths).map(([key,file])=>[key,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),walk,runs:[]};
for(const E of Object.values(engines)){micro(E,300,true);micro(E,10,false);search(E);}
for(let repeat=0;repeat<repeats;repeat++){
 for(const name of repeat%2?['candidate','baseline']:['baseline','candidate']){
  const E=engines[name],row={repeat,name,microSimd:micro(E,30000,true),microJs:micro(E,100,false),search:search(E)};data.runs.push(row);
  process.stderr.write(name+' repeat '+(repeat+1)+' search '+Math.round(row.search.nps)+' NPS, SIMD '+Math.round(row.microSimd.evaluations*1000/row.microSimd.ms)+' eval/s\n');
 }
 const a=data.runs.at(-2),b=data.runs.at(-1);
 if(a.microSimd.checksum!==b.microSimd.checksum || a.microJs.checksum!==b.microJs.checksum)throw Error('Numerical evaluation changed');
 if(JSON.stringify(a.search.cases.map(x=>[x.score,x.nodes]))!==JSON.stringify(b.search.cases.map(x=>[x.score,x.nodes])))throw Error('Fixed-depth search differs');
}
const median=xs=>{xs.sort((a,b)=>a-b);return xs[Math.floor(xs.length/2)];};
data.medians=Object.fromEntries(Object.keys(engines).map(name=>{const rows=data.runs.filter(x=>x.name===name);return [name,{simdEvaluationsPerSecond:median(rows.map(r=>r.microSimd.evaluations*1000/r.microSimd.ms)),jsEvaluationsPerSecond:median(rows.map(r=>r.microJs.evaluations*1000/r.microJs.ms)),searchNps:median(rows.map(r=>r.search.nps))}];}));
data.ratios=Object.fromEntries(Object.keys(data.medians.baseline).map(key=>[key,data.medians.candidate[key]/data.medians.baseline[key]]));
process.stdout.write(JSON.stringify(data,null,2)+'\n');
