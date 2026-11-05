// Differential acceptance suite: the JS engine is the port's behavioral reference.
const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('./engine.cjs')(),w=require('./wasm-core.cjs')();
const imports=WebAssembly.Module.imports(new WebAssembly.Module(fs.readFileSync('engine/wasm/mitchell.wasm')));
assert.deepEqual(imports,[{module:'env',name:'clock',kind:'function'}]);
let checks=0,seed=731;
const same=p=>{assert.equal(w.fen(),p.fen());assert.deepEqual(w.hash(),[p.lo,p.hi]);assert.deepEqual(w.legal(),Array.from(p.legalMoves()));checks++;};
const fens=[new E.Chess().fen(),'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1','r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7'];
for(const [fen,depth,n] of [[fens[0],4,197281],[fens[1],3,97862],[fens[2],4,43238]]){w.load(fen);assert.equal(w.exports.perft(depth),BigInt(n));assert.equal(w.fen(),fen);checks++;}
for(let game=0;game<6;game++){
 const p=new E.Chess();w.load(p.fen());let made=0;
 for(let ply=0;ply<100;ply++){
  same(p);
  for(const [mode,id] of [['mat',0],['pst',1],['full',2],['nnue',3]]){assert.equal(w.exports.evaluate(id),(E.evaluate(p,mode)||0),mode+' '+p.fen());checks++;}
  const moves=p.legalMoves();if(!moves.length)break;
  for(const m of moves.filter(m=>E.mFlags(m)&1).slice(0,3)){assert.equal(w.exports.see(m),(p.see(m)||0));checks++;}
  if(ply%19===0&&!p.inCheck()){p.makeNull();w.exports.null_move();same(p);assert.equal(w.exports.evaluate(3),(E.evaluate(p,'nnue')||0));p.unmakeNull();w.exports.unnull();same(p);}
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const m=moves[seed%moves.length];p.make(m);assert(w.exports.play(m));made++;
 }
 while(made--){p.unmake();assert(w.exports.unplay());same(p);}
}
for(const [fen,move]of[
 ['r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1','e1g1'],['r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R b KQkq - 0 1','e8c8'],
 ['4k3/ppp5/8/3pP3/8/8/5PPP/4K3 w - d6 0 1','e5d6'],['4k3/P7/8/8/8/8/5PPP/4K3 w - - 0 1','a7a8n'],['1r2k3/P7/8/8/8/8/5PPP/4K3 w - - 0 1','a7b8q']]){
 const p=new E.Chess(fen);w.load(fen);const m=p.findUci(move);p.make(m);assert(w.exports.play(m));same(p);assert.equal(w.exports.evaluate(3),(E.evaluate(p,'nnue')||0));p.unmake();w.exports.unplay();same(p);
}
for(const row of require('../validation/neural-reference.json')){w.load(row.fen);assert.equal(w.exports.raw_score(),row.raw);checks++;}
// Cold TT comparisons cover search as well as values: identical trees and choices.
for(const fen of fens)for(const mode of ['nnue','full'])for(const depth of [1,3,5,7,9]){
 const p=new E.Chess(fen);new E.Searcher(new E.Chess(),{eval:'mat'});const s=new E.Searcher(p,{adv:true,eval:mode});s.rootDepth=depth;
 const score=s.negamax(depth,-1e6,1e6,0,false,0);w.load(fen);w.exports.reset_tt();assert.equal(w.exports.fixed(depth,mode==='nnue'?3:2,1,1,1,0),(score||0),mode+' d'+depth+' '+fen);
 assert.equal(w.exports.nodes(),s.nodes,'Search tree mismatch '+mode+' d'+depth+' '+fen);assert.equal(w.exports.result_move(),s.rootBest);assert.equal(w.fen(),fen);checks++;
}
// Full game history is replayed, including repetition context.
{const p=new E.Chess();w.load(p.fen());for(const u of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6']){const m=p.findUci(u);p.make(m);w.exports.play(m);}new E.Searcher(new E.Chess(),{eval:'mat'});const s=new E.Searcher(p,{adv:true,eval:'nnue',contempt:20});s.rootDepth=6;const score=s.negamax(6,-1e6,1e6,0,false,0);w.exports.reset_tt();assert.equal(w.exports.fixed(6,3,1,1,1,20),(score||0));assert.equal(w.exports.nodes(),s.nodes);checks++;}
for(const ms of [1,10,50,150]){w.load(fens[1]);const before=w.fen();w.exports.iterate(64,ms,3,1,1,20);assert(w.exports.result_valid());assert(w.legal().includes(w.exports.result_move()));assert.equal(w.fen(),before);checks++;}
assert.equal(w.exports.memory.buffer.byteLength,64*1024*1024);
console.log('PASS: '+checks+' WASM parity checks; perft, ordered legality, hashes, SEE, special moves, all eval modes, exact fixed-depth trees, history and timeout restoration');
