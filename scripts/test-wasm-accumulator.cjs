// MIT. Compare fused transitions to the independent scalar JS inference path.
// Synthetic full-range weights stress i16 wraparound and all supported SIMD tails.
const assert=require('node:assert/strict'),loadJs=require('./engine.cjs'),loadWasm=require('./wasm-core.cjs');
let checks=0,seed=99831;
const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(const hidden of [16,24,128,256]){
 const E=loadJs('index.html',{WebAssembly:undefined}),w=loadWasm(undefined,{bits:19});
 const bytes=Buffer.alloc((771*hidden+1)*2);
 for(let i=0;i<bytes.length;i+=2)bytes.writeUInt16LE(random()&65535,i);
 E.NNUE_MODEL.hidden=hidden;E.NNUE_MODEL.data=bytes.toString('base64');
 assert(w.exports.set_hidden(hidden));new Uint8Array(w.exports.memory.buffer,w.exports.model_ptr(),bytes.length).set(bytes);
 const compare=p=>{assert.equal(w.exports.raw_score(),p.nnue.score(p.side)||0,`hidden=${hidden} ${p.fen()}`);assert.equal(w.fen(),p.fen());checks++;};
 const load=fen=>{const p=new E.Chess(fen);p.nnue=new E.NeuralAccumulator(p);w.load(p.fen());compare(p);return p;};
 for(let game=0;game<3;game++){
  const p=load();let made=0;
  for(let ply=0;ply<70;ply++){
   const ms=p.legalMoves();if(!ms.length)break;const m=ms[random()%ms.length];p.make(m);assert(w.exports.play(m));made++;
   // Deliberately leave multiple dirty frames before evaluating.
   if(ply%7===0)compare(p);
   if(ply%13===0&&!p.inCheck()){p.makeNull();w.exports.null_move();compare(p);p.unmakeNull();w.exports.unnull();compare(p);}
  }
  compare(p);while(made--){p.unmake();w.exports.unplay();if(made%5===0)compare(p);}compare(p);
 }
 for(const [fen,u]of[
  ['r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1','e1g1'],
  ['r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R b KQkq - 0 1','e8c8'],
  ['4k3/ppp5/8/3pP3/8/8/5PPP/4K3 w - d6 0 1','e5d6'],
  ['4k3/P7/8/8/8/8/5PPP/4K3 w - - 0 1','a7a8n'],
  ['1r2k3/P7/8/8/8/8/5PPP/4K3 w - - 0 1','a7b8q']]){
  const p=load(fen),m=p.findUci(u);assert(m);p.make(m);assert(w.exports.play(m));compare(p);p.unmake();w.exports.unplay();compare(p);
 }
 assert.equal(w.exports.memory.buffer.byteLength,32*1024*1024);
}
console.log(`PASS: ${checks} scalar/fused accumulator checks with full-range synthetic weights, widths 16/24/128/256, dirty chains, nulls, captures, promotions and castling`);
