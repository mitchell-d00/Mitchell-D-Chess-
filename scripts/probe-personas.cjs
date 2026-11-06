// Repeatable style demonstration, not a match or rating measurement.
const E=require('./engine.cjs')(),w=require('./wasm-core.cjs')();
let seed=109;const p=new E.Chess(),rows=[];
for(let ply=0;ply<60;ply++){
 const legal=p.legalMoves();if(!legal.length)break;
 if(ply>=12&&ply%4===0){
  const fen=p.fen(),styles=[];
  for(const aggression of [-100,0,100]){
   w.load(fen);w.exports.set_style(aggression);w.exports.reset_tt();
   const score=w.exports.fixed(4,3,1,1,1,0),m=w.exports.result_move();
   if(!legal.includes(m)||w.fen()!==fen)throw Error('Invalid probe result');
   styles.push({aggression,move:p.uci(m),score,nodes:w.exports.nodes()});
  }
  rows.push({fen,styles});
 }
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;p.make(legal[seed%legal.length]);
}
const differentMoves=rows.filter(r=>new Set(r.styles.map(s=>s.move)).size>1).length;
if(!differentMoves)throw Error('No demonstrated move differences');
console.log(JSON.stringify({schema:1,depth:4,mode:'nnue',ttBits:21,seed:109,differentMoves,totalPositions:rows.length,notes:['Deterministic random legal positions show that styles affect decisions.','Fixed-depth illustration; not a strength comparison or Elo measurement.'],rows},null,2));
