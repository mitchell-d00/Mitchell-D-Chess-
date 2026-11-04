// Original MIT: deterministic evaluation, symmetry, pins, endgames and legality.
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine.cjs')();
const html=fs.readFileSync('index.html','utf8');
assert(!/NNUE_MODEL|NNUE_KERNEL_DATA|NeuralAccumulator|Leorik|Thomas Jahn/.test(html),'No borrowed evaluator or notices for a removed payload in candidate HTML');
assert.equal(E.LEVELS.length,65);for(let i=50;i<65;i++)assert.equal(E.LEVELS[i].ev,'mnn');
const source=html.match(/  \/\/ BEGIN EMBEDDED MITCHELL EVALUATOR\n([\s\S]*?)  \/\/ END EMBEDDED MITCHELL EVALUATOR/)[1];assert.equal(source,fs.readFileSync('engine/mce.js','utf8'));
const pinned=new E.Chess('4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1');assert.equal(E.mceFeatures(pinned)[0],-3);
const unpinned=new E.Chess('3r2k1/8/8/8/8/8/4N3/4K3 w - - 0 1');assert.equal(E.mceFeatures(unpinned)[0],0);
function mirror(p){const q=new E.Chess();q.b.fill(0);for(let s=0;s<128;s++)if(!(s&0x88)&&p.b[s])q.b[119-s]=p.b[s]^8;for(let c=0;c<2;c++)q.kingSq[1-c]=119-p.kingSq[c];q.side=p.side^8;q.castle=0;q.ep=-1;q.computeHash();return q;}
let seed=271828,p=new E.Chess(),checks=0;
for(let i=0;i<160;i++){
 const before=p.fen(),lo=p.lo,hi=p.hi,features=Array.from(E.mceFeatures(p)),value=E.evaluate(p,'mce');
 for(let n=0;n<3;n++){assert.deepEqual(Array.from(E.mceFeatures(p)),features);assert.equal(E.evaluate(p,'mce'),value);}
 assert.equal(p.fen(),before);assert.equal(p.lo,lo);assert.equal(p.hi,hi);
 const pieceCount=Array.from(p.b).filter(Boolean).length,raw=features.reduce((sum,f,k)=>sum+f*E.MCE_WEIGHTS[E.MCE_KEYS[k]],0);assert.equal(value,E.evaluate(p,'full')+(pieceCount<=4?0:(p.side?-1:1)*Math.round(raw)));
 const q=mirror(p),flipped=Array.from(E.mceFeatures(q));features.forEach((f,k)=>assert(Math.abs(f+flipped[k])<1e-10,JSON.stringify({features,flipped,k})));checks++;
 const legal=p.legalMoves();if(!legal.length){p=new E.Chess();continue;}seed=(Math.imul(seed,1664525)+1013904223)>>>0;p.make(legal[seed%legal.length]);
}
for(const fen of ['k7/8/P1K5/8/8/8/8/8 w - - 0 1','8/8/8/8/8/p1k5/8/K7 b - - 0 1'])assert.equal(E.evaluate(new E.Chess(fen),'mce'),0);
for(const fen of [undefined,pinned.fen(),'8/5KP1/7k/8/8/8/8/7R w - - 0 1'])for(const time of [1,30,150]){const p=new E.Chess(fen),r=E.think(fen,[],64,{time,noBook:true});assert(p.findUci(r.move));}
console.log('PASS: Mitchell-only payload, embedded source, pins, '+checks+' deterministic symmetric positions, unchanged boards/hashes, exact KPK draws and legal timed search');
