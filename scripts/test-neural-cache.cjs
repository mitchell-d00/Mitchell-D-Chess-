const assert=require('node:assert/strict'), fs=require('node:fs'), load=require('./engine.cjs');
const bytes=fs.readFileSync('engine/nnue-kernel.wasm'), kernelExports=WebAssembly.Module.exports(new WebAssembly.Module(bytes));
for(const name of ['transition','scoreAt','update','score'])assert(kernelExports.some(x=>x.name===name));
const E=load(),a=new E.Chess(),b=new E.Chess('r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1');
const check=p=>{const fresh=new E.NeuralAccumulator(p);assert.equal(p.nnue.score(p.side),fresh.score(p.side));};
E.neuralEvaluate(a);E.neuralEvaluate(b);
for(let i=0;i<80;i++){
 const p=i%2?a:b,moves=p.legalMoves();if(!moves.length)continue;
 E.NNUE_CONFIG.wasm=i%3!==0;p.make(moves[i%moves.length]);E.neuralEvaluate(p);
 E.NNUE_CONFIG.wasm=!E.NNUE_CONFIG.wasm;check(p);p.unmake();check(p);
}
E.NNUE_CONFIG.wasm=true;
const sibling=new E.Chess();E.neuralEvaluate(sibling);sibling.make(sibling.findUci('e2e4'));sibling.nnue.score(sibling.side);sibling.unmake();
E.NNUE_CONFIG.wasm=false;sibling.make(sibling.findUci('d2d4'));const scalarSibling=sibling.nnue.score(sibling.side);
E.NNUE_CONFIG.wasm=true;assert.equal(sibling.nnue.score(sibling.side),scalarSibling,'Scalar-written sibling must invalidate resident frame');
// Ensure many pending null frames, pop back, and reuse every slot with a sibling.
for(let i=0;i<200;i++)a.makeNull();check(a);
for(let i=0;i<200;i++){a.unmakeNull();if(i%17===0)check(a);}
for(const globals of [{WebAssembly:undefined},{WebAssembly:{Module:function(){throw Error('SIMD unavailable');}}}]){
 const scalar=load('index.html',globals);
 for(const row of require('../validation/neural-reference.json').slice(0,12)){const p=new scalar.Chess(row.fen);scalar.neuralEvaluate(p);assert.equal(p.nnue.score(p.side),row.raw);}
}
// Supported architecture extremes exercise memory sizing, not a replacement model.
for(const hidden of [16,256]){
 const X=load(),weights=Buffer.alloc((768*hidden+3*hidden+1)*2);
 for(let i=0;i<weights.length/2;i++)weights.writeInt16LE((i*17%31)-15,i*2);
 X.NNUE_MODEL.hidden=hidden;X.NNUE_MODEL.data=weights.toString('base64');
 const p=new X.Chess();X.neuralEvaluate(p);
 for(let i=0;i<30;i++){const moves=p.legalMoves();if(!moves.length)break;p.make(moves[(i*11)%moves.length]);X.NNUE_CONFIG.wasm=true;const wasm=p.nnue.score(p.side);X.NNUE_CONFIG.wasm=false;assert.equal(p.nnue.score(p.side),wasm);}
}
console.log('PASS: interleaved position caches, JS/SIMD switches, 200 null frames, sibling reuse, unavailable SIMD, 16/256-hidden memory sizing');
