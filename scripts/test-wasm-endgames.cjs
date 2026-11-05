// MIT. Rule-derived edge cases for the optional exact sparse-endgame experiment.
const assert=require('node:assert/strict'),E=require('./engine.cjs')(),w=require('./wasm-core.cjs')();
const cases=[
 ['stalemate KQK','7k/5K2/6Q1/8/8/8/8/8 b - - 0 1',0],
 ['stalemate KRK','k7/1RK5/8/8/8/8/8/8 b - - 0 1',0],
 ['bare kings','7k/8/8/8/8/8/8/K7 w - - 0 1',0],
 ['one bishop','7k/8/8/8/8/8/8/KB6 w - - 0 1',0],
 ['one knight','7k/8/8/8/8/8/8/KN6 w - - 0 1',0],
 ['same-colour bishops','5b1k/8/8/8/8/8/8/K1B5 w - - 0 1',0],
 ['checkmate KQK','7k/6Q1/5K2/8/8/8/8/8 b - - 0 1',-100000],
 ['checkmate beats fifty-move claim','7k/6Q1/5K2/8/8/8/8/8 b - - 100 1',-100000],
 ['checkmate KRK','R6k/8/6K1/8/8/8/8/8 b - - 0 1',-100000]
];
let checks=0;
for(const [name,fen,expected]of cases){
 const p=new E.Chess(fen),s=new E.Searcher(p,{eval:'nnue',adv:true,exactEndgames:true});
 const js=s.qs(-1e6,1e6,0,0);w.load(fen);w.exports.set_endgames(1);const native=w.exports.quiescence(3,1,-1e6,1e6);
 assert.equal(native,expected,name);assert.equal(js,expected,name+' JS');assert.equal(w.fen(),fen);checks++;
}
// These can admit mate and must never be classified as dead positions.
for(const fen of ['7k/8/6K1/8/8/8/8/BN6 w - - 0 1','7k/8/6K1/8/8/8/8/NN6 w - - 0 1','6nk/8/6K1/8/8/8/8/N7 w - - 0 1']){
 const p=new E.Chess(fen);assert(!p.insufficient());w.load(fen);w.exports.set_endgames(1);const score=w.exports.quiescence(3,1,-1e6,1e6);const s=new E.Searcher(p,{eval:'nnue',adv:true,exactEndgames:true});assert.equal(score,s.qs(-1e6,1e6,0,0)||0);assert.notEqual(score,0);checks++;
}
// Changing the experiment must clear cached context; ordinary mode stays default.
const fen=cases[0][1];w.load(fen);w.exports.set_endgames(0);assert.notEqual(w.exports.quiescence(3,1,-1e6,1e6),0);w.exports.set_endgames(1);assert.equal(w.exports.quiescence(3,1,-1e6,1e6),0);checks++;
console.log(`PASS: ${checks} sparse-endgame checks; stalemate, dead positions, mating material, mate precedence and experiment context`);
