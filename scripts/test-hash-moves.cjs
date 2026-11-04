// Regression coverage for the six illegal-move forfeits found by Fastchess.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const load=require('./engine.cjs'),E=load();
const collision=require('../validation/regressions/zobrist-collision.json');
const pair=collision.positions.map(f=>new E.Chess(f));
assert.notEqual(pair[0].lo+':'+pair[0].hi,pair[1].lo+':'+pair[1].hi,'Historical collision must no longer collide');
for(const row of require('../validation/regressions/illegal-move-positions.json')){
 const p=new E.Chess(row.fen);for(const u of row.moves){const m=p.findUci(u);assert(m,u);p.make(m);}
 assert(!p.findUci(row.illegal),'Fixture must describe an illegal move');
 for(const time of [1,30,980]){const r=E.think(row.fen,row.moves,64,{time,noBook:true});assert(p.findUci(r.move),'Illegal search output '+JSON.stringify(r));}
}
assert.throws(()=>E.think(null,['e2e5'],64,{time:1,noBook:true}),/Invalid move history at ply 1/);
// Verify incremental keys independently by recomputing after make/unmake.
let state=4141,p=new E.Chess();
for(let i=0;i<250;i++){
 const ms=p.legalMoves();if(!ms.length){p=new E.Chess();continue;}state=(Math.imul(state,1664525)+1013904223)>>>0;
 const before=p.fen(),lo=p.lo,hi=p.hi;p.make(ms[state%ms.length]);const childLo=p.lo,childHi=p.hi;p.computeHash();assert.equal(p.lo,childLo);assert.equal(p.hi,childHi);
 p.unmake();assert.equal(p.fen(),before);assert.equal(p.lo,lo);assert.equal(p.hi,hi);
 p.make(ms[state%ms.length]);
}
// Inject an inconsistent entry without exposing TT internals in production.
let source=fs.readFileSync('index.html','utf8').match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1];
source=source.replace('MCE_WEIGHTS: MCE_WEIGHTS,','__tt: {lo:ttLo,hi:ttHi,move:ttMove,score:ttScore,depth:ttDepth,flag:ttFlag}, MCE_WEIGHTS: MCE_WEIGHTS,');
const context={module:{exports:{}}};vm.runInNewContext(source,context);const D=context.module.exports;
for(const ply of [0,1]){
 const q=new D.Chess(collision.positions[1]),s=new D.Searcher(q,{eval:'mce',adv:true,time:5000}),tt=D.__tt,h=q.lo&(tt.lo.length-1),before=q.fen(),legal=q.legalMoves();s.rootDepth=2;
 const wrong=D.sqParse('a7')|(D.sqParse('a8')<<7)|(5<<14);assert(!q.gen(false).includes(wrong));
 tt.lo[h]=q.lo;tt.hi[h]=q.hi;tt.move[h]=wrong;tt.score[h]=99999;tt.depth[h]=99;tt.flag[h]=1;
 const score=s.negamax(2,ply?-50:-1e6,ply?-49:1e6,ply,false,0);
 assert.notEqual(score,99999,'Invalid cached move must invalidate its score');assert.equal(q.fen(),before);
 if(ply===0)assert(legal.includes(s.rootBest));
}
console.log('PASS: historical hash collision, six failed-game positions, TT corruption injection, strict history, incremental hash restoration');
