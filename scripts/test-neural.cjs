const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine.cjs')();
assert.equal(require('node:crypto').createHash('sha256').update(Buffer.from(E.NNUE_MODEL.data,'base64')).digest('hex'),'794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704');
const embedded=fs.readFileSync('index.html','utf8').match(/var NNUE_KERNEL_DATA = '([^']+)'/)[1];
assert.deepEqual(Buffer.from(embedded,'base64'),fs.readFileSync('engine/nnue-kernel.wasm'));
assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(Buffer.from(embedded,'base64'))),[]);
let checks=0;
function verify(p){
 const incremental=E.neuralEvaluate(p),acc=p.nnue;
 const fresh=new E.NeuralAccumulator(p);
 assert.equal(acc.score(p.side),fresh.score(p.side),'incremental mismatch '+p.fen());
 E.NNUE_CONFIG.wasm=false;const scalar=acc.score(p.side);E.NNUE_CONFIG.wasm=true;
 assert.equal(scalar,acc.score(p.side),'JS/SIMD mismatch '+p.fen());
 assert.deepEqual(Array.from(acc.ensure()),Array.from(fresh.ensure()));checks++;
 return incremental;
}
// Random legal walks, complete unmake, artificial null moves, and explicit special moves.
let seed=123456789;
for(let game=0;game<8;game++){
 const p=new E.Chess(),before=p.fen();verify(p);let made=0;
 for(let n=0;n<80;n++){
  const moves=p.legalMoves();if(!moves.length)break;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;p.make(moves[seed%moves.length]);made++;verify(p);
  if(!p.inCheck()){const fen=p.fen();p.makeNull();verify(p);p.unmakeNull();assert.equal(p.fen(),fen);verify(p);}
 }
 while(made--){p.unmake();verify(p);}assert.equal(p.fen(),before);
}
for(const [fen,u] of [
 ['r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1','e1g1'],
 ['r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R b KQkq - 0 1','e8c8'],
 ['4k3/ppp5/8/3pP3/8/8/5PPP/4K3 w - d6 0 1','e5d6'],
 ['4k3/P7/8/8/8/8/5PPP/4K3 w - - 0 1','a7a8n'],
 ['1r2k3/P7/8/8/8/8/5PPP/4K3 w - - 0 1','a7b8q']
]){const p=new E.Chess(fen);verify(p);const m=p.findUci(u);assert(m,u);p.make(m);verify(p);p.unmake();verify(p);assert.equal(p.fen(),fen);}
// Expected raw scores independently computed by NumPy from the published int16 format.
for(const row of JSON.parse(fs.readFileSync('validation/neural-reference.json','utf8'))){const p=new E.Chess(row.fen);verify(p);assert.equal(p.nnue.score(p.side),row.raw);}
for(const time of [1,20,100]){const p=new E.Chess(),r=E.think(null,[],64,{time,noBook:true});assert(p.findUci(r.move));}
const fallback=require('./engine.cjs')('index.html',{WebAssembly:undefined});
for(const row of JSON.parse(fs.readFileSync('validation/neural-reference.json','utf8')).slice(0,12)){const p=new fallback.Chess(row.fen);fallback.neuralEvaluate(p);assert.equal(p.nnue.score(p.side),row.raw);}
console.log('PASS:',checks,'incremental rebuild, special-move, null-move, unmake, JS/SIMD and independent-reference checks');
