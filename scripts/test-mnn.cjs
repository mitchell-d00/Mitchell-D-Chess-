// Original MIT: independent rebuild, incremental deltas and neural search checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),load=require('./engine.cjs'),E=load();
const model=Buffer.from(E.MNN_MODEL.data,'base64'),h=model.readUInt16LE(4);
assert.deepEqual(model,fs.readFileSync('engine/mitchell.mnn'));
const kernel=fs.readFileSync('engine/mnn-kernel.wasm');assert.deepEqual(Buffer.from(fs.readFileSync('index.html','utf8').match(/var MNN_KERNEL_DATA = '([^']+)'/)[1],'base64'),kernel);
if(WebAssembly.validate(kernel))assert.equal(E.mnnWeights().data.buffer.byteLength,262144,'Expected active SIMD memory on this host');
function reference(pos){
 const values=[new Int32Array(h),new Int32Array(h)];for(let side=0;side<2;side++)for(let k=0;k<h;k++)values[side][k]=model.readInt16LE(16+k*2);
 const rows=pos.fen().split(' ')[0].split('/'),chars='PNBRQKpnbrqk';
 for(let r=0;r<8;r++){let file=0;for(const ch of rows[r]){if(/\d/.test(ch)){file+=+ch;continue;}const channel=chars.indexOf(ch),square=(7-r)*8+file++;
  for(let side=0;side<2;side++){const feature=((channel+(side?6:0))%12)*64+(side?square^56:square);for(let k=0;k<h;k++)values[side][k]+=model.readInt16LE(16+2*(h+feature*h+k));}
 }}
 let total=0;for(let k=0;k<h;k++)total+=(Math.max(0,Math.min(256,values[0][k]))-Math.max(0,Math.min(256,values[1][k])))*model.readInt16LE(16+2*((768+1)*h+k));
 return {values,score:Math.max(-150,Math.min(150,Math.sign(total)*Math.round(Math.abs(total)/65536)))||0};
}
let checks=0;
function verify(p){const raw=reference(p),score=E.mnnEvaluate(p),acc=p.mnn,fresh=new E.MitchellAccumulator(p);assert.deepEqual(Array.from(acc.ensure()),[...raw.values[0],...raw.values[1]]);assert.deepEqual(Array.from(acc.ensure()),Array.from(fresh.ensure()));assert.equal(acc.whiteCorrection(),raw.score);const base=E.evaluate(p,'full'),expected=acc.count[acc.ply]<=4?base:base+(p.side?-1:1)*raw.score;assert.equal(score,expected);checks++;}
let seed=7181,p=new E.Chess();
for(let i=0;i<350;i++){
 E.MNN_CONFIG.wasm=i%2===0;verify(p);const moves=p.legalMoves();if(!moves.length){p=new E.Chess();continue;}seed=(Math.imul(seed,1664525)+1013904223)>>>0;const m=moves[seed%moves.length],before=p.fen();p.make(m);
 if(i%3===0){verify(p);p.makeNull();verify(p);p.unmakeNull();verify(p);}p.unmake();assert.equal(p.fen(),before);verify(p);p.make(m);
}
for(const [fen,moves] of [
 ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',['e1g1','e8c8']],
 ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',['e5d6']],
 ['4k3/P7/8/8/8/8/7p/4K3 w - - 0 1',['a7a8n','h2h1r']]
]){const q=new E.Chess(fen);verify(q);for(const u of moves){const m=q.findUci(u);assert(m,u);q.make(m);verify(q);}for(const u of moves){q.unmake();verify(q);}}
function flip(p){const q=new E.Chess();q.b.fill(0);for(let s=0;s<128;s++)if(!(s&0x88)&&p.b[s])q.b[s^112]=p.b[s]^8;q.side=p.side^8;q.kingSq=[p.kingSq[1]^112,p.kingSq[0]^112];q.castle=0;q.ep=-1;q.computeHash();return q;}
for(const row of JSON.parse(fs.readFileSync('validation/mnn/reference.json')).slice(0,64)){const q=new E.Chess(row.fen),f=flip(q);E.mnnEvaluate(q);E.mnnEvaluate(f);assert(q.mnn.whiteCorrection()===-f.mnn.whiteCorrection());}
for(const promotion of ['q','r','b','n']){const q=new E.Chess('8/P7/4k3/8/8/8/7p/4K3 w - - 0 1');verify(q);for(const u of ['a7a8'+promotion,'h2h1'+promotion]){const m=q.findUci(u);assert(m,u);q.make(m);verify(q);}q.unmake();verify(q);q.unmake();verify(q);}
const refFile='validation/mnn/reference.json';if(fs.existsSync(refFile))for(const row of JSON.parse(fs.readFileSync(refFile))){const p=new E.Chess(row.fen);verify(p);assert.equal(p.mnn.whiteCorrection(),row.whiteCorrection);}
for(const fen of [undefined,'k7/8/P1K5/8/8/8/8/8 w - - 0 1'])for(const time of [1,20,150]){const q=new E.Chess(fen),r=E.think(fen,[],64,{time,noBook:true,evaluation:'mnn'});assert(q.findUci(r.move));}
assert.equal(E.mnnEvaluate(new E.Chess('k7/8/P1K5/8/8/8/8/8 w - - 0 1')),0);
const fallback=load('index.html',{WebAssembly:undefined});for(const row of JSON.parse(fs.readFileSync(refFile)).slice(0,32)){const q=new fallback.Chess(row.fen);fallback.mnnEvaluate(q);assert.equal(q.mnn.whiteCorrection(),row.whiteCorrection);}
for(const bad of [model.subarray(0,20),Buffer.alloc(model.length)]){const corrupt=load();corrupt.MNN_MODEL.data=bad.toString('base64');assert.throws(()=>corrupt.mnnWeights(),/Mitchell model/);}
assert.throws(()=>E.think(null,[],64,{evaluation:'invalid'}),/Invalid evaluation mode/);
assert(!fs.readFileSync('index.html','utf8').includes('Thomas Jahn'));
console.log('PASS: '+checks+' independent accumulator/rebuild checks, special moves, null moves, growing stacks, endgame fallback, SIMD/scalar and no-WASM agreement, model rejection, reference scores and legal neural timeouts');
