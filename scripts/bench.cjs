// node scripts/bench.cjs [index.html] [depth=5] [full|nnue]
const E=require('./engine.cjs')(process.argv[2]||'index.html');
const depth=+(process.argv[3]||5),mode=process.argv[4]||'full';
const fens=[
'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7',
'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
'8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'];
let total=0,elapsed=0;
for(const fen of fens){const p=new E.Chess(fen),s=new E.Searcher(p,{adv:true,eval:mode});s.rootDepth=depth;const t=performance.now();const score=s.negamax(depth,-1e6,1e6,0,false,0),ms=performance.now()-t;total+=s.nodes;elapsed+=ms;console.log(JSON.stringify({depth,score,nodes:s.nodes,ms:Math.round(ms),nps:Math.round(s.nodes*1000/ms)}));}
console.log(JSON.stringify({nodes:total,ms:Math.round(elapsed),nps:Math.round(total*1000/elapsed)}));
