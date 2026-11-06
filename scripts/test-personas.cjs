// Original MIT. Preferences must agree across backends and never leak into Standard.
const assert=require('node:assert/strict'),E=require('./engine.cjs')(),w=require('./wasm-core.cjs')();
const bad=[null,{},'attack',{name:'',aggression:0},{name:'a\nb',aggression:5},{name:'x',aggression:101},{name:'x',aggression:1.5},{name:'x',aggression:'50'}];
for(const p of bad)assert.equal(E.normalizePersona(p),null);
assert.equal(E.normalizePersona({name:'  My opponent  ',aggression:50}).name,'My opponent');
let seed=109,checks=0,nonzero=0,different=0;const positions=[];
const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let game=0;game<3;game++){
 const p=new E.Chess();
 for(let ply=0;ply<60;ply++){
  const fen=p.fen();w.load(fen);
  for(const a of [-100,-35,0,65,100]){
   const bias=E.personaBias(p,a);assert.equal(w.exports.persona_bias(a),bias||0);assert(Math.abs(bias)<=60);assert.equal(E.personaBias(p,-a)||0,-bias||0);checks++;if(bias)nonzero++;
  }
  if(ply===16&&game===0)positions.push(fen);
  const ms=p.legalMoves();if(!ms.length)break;p.make(ms[next()%ms.length]);
 }
}
assert(nonzero>100,'Style must actually affect evaluation');
positions.push('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7');
for(const fen of positions){
 const rows=[];
 for(const a of [-100,0,100,0]){
  const p=new E.Chess(fen);
  // Force cold JS/native tables even when repeating the same style.
  new E.Searcher(new E.Chess(),{eval:'mat'});
  const s=new E.Searcher(p,{eval:'nnue',adv:true,aggression:a});s.rootDepth=4;
  const v=s.negamax(4,-1e6,1e6,0,false,0);
  w.load(fen);w.exports.set_style(a);w.exports.reset_tt();
  assert.equal(w.exports.fixed(4,3,1,1,1,0),v||0);assert.equal(w.exports.nodes(),s.nodes);assert.equal(w.exports.result_move(),s.rootBest);assert.equal(w.fen(),fen);assert.equal(p.fen(),fen);
  rows.push({move:s.rootBest,score:v});checks++;
 }
 assert.deepEqual(rows[1],rows[3],'Returning to Standard must clear persona TT entries');
 if(JSON.stringify(rows[0])!==JSON.stringify(rows[2]))different++;
}
assert(different>0,'Defensive and aggressive searches must not be cosmetic');
for(const fen of ['8/8/3k4/8/8/3K4/4R3/8 w - - 0 1','8/8/3k4/8/8/3K4/4P3/8 w - - 0 1'])assert.equal(E.personaBias(new E.Chess(fen),100),0,'Sparse endgames keep the ordinary guidance');
// Both entry points accept styles, obey the requested cap, and reset on the next request.
for(const backend of ['js','wasm'])for(const a of [-100,100,0]){
 const r=E.think(positions[1],[],64,{backend,time:25,noBook:true,persona:{name:'Test',aggression:a}});assert(new E.Chess(positions[1]).findUci(r.move));assert.equal(r.timeBudget,25);if(backend==='wasm')assert.equal(r.backend,'wasm');checks++;
}
for(let level=0;level<65;level++)for(const aggression of [-100,100]){
 const r=E.think(positions[1],[],level,{time:3,noBook:true,persona:{name:'Clock probe',aggression}});
 assert(new E.Chess(positions[1]).findUci(r.move));if(r.timeBudget!==undefined)assert(r.timeBudget<=3);checks++;
}
w.exports.set_style(0);
console.log(`PASS: ${checks} persona checks; bounded/noncosmetic preferences, JS/WASM arithmetic and exact search parity, Standard TT reset, sparse endgames and timed dispatch`);
