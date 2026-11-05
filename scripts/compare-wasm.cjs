// MIT. Same-tree throughput experiment: alternate warmed cores, identical TT.
// node scripts/compare-wasm.cjs baseline.wasm [candidate.wasm] [repeats=5] [depth=11]
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),os=require('node:os');
const load=require('./wasm-core.cjs');
const paths={baseline:process.argv[2],candidate:process.argv[3]||'engine/wasm/mitchell.wasm'};
const repeats=Number(process.argv[4]||5),depth=Number(process.argv[5]||11);
if(!paths.baseline||!Number.isInteger(repeats)||repeats<3||!Number.isInteger(depth)||depth<1||depth>20)throw Error('Provide baseline WASM, at least three repeats and depth 1–20');
const fens=[
 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7',
 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
 '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'];
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const cores=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,load(file,{bits:19})]));
function search(w){
 const cases=[];
 for(const fen of fens){w.load(fen);w.exports.reset_tt();const start=performance.now();const score=w.exports.fixed(depth,3,1,1,1,0),ms=performance.now()-start;assert.equal(w.fen(),fen);cases.push({score,move:w.exports.result_move(),nodes:w.exports.nodes(),ms});}
 const nodes=cases.reduce((n,x)=>n+x.nodes,0),ms=cases.reduce((n,x)=>n+x.ms,0);
 return {cases,nodes,ms,nps:nodes*1000/ms};
}
const data={createdUtc:new Date().toISOString(),node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,depth,repeats,ttBits:19,memoryMiB:32,fens,hashes:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,sha(p)])),modelSha256:sha('third-party/leorik-128.nnue'),runs:[],notes:['Fixed-depth, cold TT per position, warm WASM JIT, alternating order.','Equal nodes/scores/moves required; timing includes search reset, excludes TT clearing and FEN load.','Local throughput evidence, not an Elo or strength estimate.']};
// Separate warmups from measurements, including both engine orderings.
for(let i=0;i<2;i++)for(const w of Object.values(cores))search(w);
for(let repeat=0;repeat<repeats;repeat++){
 const rows={};
 for(const name of repeat%2?['candidate','baseline']:['baseline','candidate']){const row={name,repeat,...search(cores[name])};rows[name]=row;data.runs.push(row);process.stderr.write(`${name} ${repeat+1}: ${Math.round(row.nps)} NPS\n`);}
 const tree=row=>row.cases.map(({score,move,nodes})=>({score,move,nodes}));assert.deepEqual(tree(rows.candidate),tree(rows.baseline),'Search behavior changed');
}
const median=xs=>{const s=xs.toSorted((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
data.medianNps=Object.fromEntries(Object.keys(cores).map(name=>[name,median(data.runs.filter(r=>r.name===name).map(r=>r.nps))]));
data.speedup=data.medianNps.candidate/data.medianNps.baseline;
data.pairedSpeedups=data.runs.filter(r=>r.name==='baseline').map(b=>data.runs.find(c=>c.name==='candidate'&&c.repeat===b.repeat).nps/b.nps);
process.stdout.write(JSON.stringify(data,null,2)+'\n');
