const fs=require('node:fs'),assert=require('node:assert/strict'),E=require('./engine.cjs')(),T=require('../ui/position-tools.js')(E),claim=require('../src/app/ai-draw-claims.js');
const root='validation/user-reports/2026-11-06-rook-draw-claim/',g=T.parsePgn(fs.readFileSync(root+'game.pgn','utf8'));
assert.equal(g.moves.length,255);assert.equal(g.tags.Termination,'normal');assert.equal(g.tags.SessionInactiveMs,'0');assert.equal(g.tags.SessionEngineRecoveries,'1');
const rows=fs.readFileSync(root+'moves-with-clocks.tsv','utf8').trim().split('\n');assert.equal(rows.length,128);
const annotations=[...fs.readFileSync(root+'game.pgn','utf8').matchAll(/\[%clk ([\d:.]+)\]/g)];assert.equal(annotations.length,255);
let p=new E.Chess(),first=null,lastCapture=null;for(let i=0;i<g.moves.length;i++){const m=p.findUci(g.moves[i]);assert(m);if(E.mFlags(m)&1)lastCapture=i+1;p.make(m);if(!first&&p.claimable())first={ply:i+1,half:p.half};if(i===110)assert.equal(p.half,0);if(i===209)assert.equal(p.half,99);if(i===210)assert.equal(p.half,100);if(i===221)assert.equal(p.half,111);if(i===222)assert.equal(p.half,0);}
assert.deepEqual(first,{ply:211,half:100});assert.equal(lastCapture,223);assert.equal(p.status(true).reason,'checkmate');assert.equal(p.fen(),'R7/8/k1K5/8/8/8/8/8 b - - 32 128');
function position(n){const p=new E.Chess();for(const u of g.moves.slice(0,n))p.make(p.findUci(u));return p;}
for(const n of [210,211,221]){
 p=position(n);const before=p.fen(),hash=[p.lo,p.hi],history=p.hLo.length;
 const r=E.think(null,Array.from(g.moves.slice(0,n)),n%2?64:51,{time:300,noBook:true});assert.equal(r.score,-20);assert(r.depth>0);const decision=claim(p,r);assert(decision);assert.equal(decision.reason,'fifty-move rule');assert.equal(decision.type,n===210?'intended':'current');assert.equal(p.fen(),before);assert.deepEqual([p.lo,p.hi],hash);assert.equal(p.hLo.length,history);
}
// The former next-side lookup inverted the previous root draw contempt:
assert(-(-20)>15,'Old Black claim gate declines after White reports -20');
p=new E.Chess('7k/8/5KQ1/8/8/8/8/8 w - - 100 1');assert.equal(claim(p,{move:'g6g7',score:0,recovery:'timeout'}),null,'An actual mate beats a draw');
p=new E.Chess('5k2/2r5/8/8/8/8/8/2R2K2 w - - 100 1');assert.equal(claim(p,{move:'c1c7',score:500,depth:8}),null,'Keep a positive fresh winning continuation');
p=new E.Chess('5k2/2r5/8/8/8/8/8/2R2K2 w - - 99 1');assert.equal(claim(p,{move:'c1c7',score:-20}),null,'Capture resets the counter');
p=new E.Chess();for(const u of ['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1'])p.make(p.findUci(u));let before=p.fen();assert.equal(p.claimable(),null);let d=claim(p,{move:'f6g8',score:-20,depth:5});assert.equal(d.type,'intended');assert.equal(d.reason,'threefold repetition');assert.equal(p.fen(),before);p.make(p.findUci('f6g8'));assert.equal(claim(p,{move:'e2e4',score:-20}).type,'current');assert.equal(claim(p,{move:'e2e4',score:100}),null);
console.log('PASS: supplied 255-ply mate, first fifty-move right at ply211, fresh native draw scores, intended/current claims, mate/win priority, capture reset, repetitions and restoration');
