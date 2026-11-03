const assert = require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const E = require('./engine.cjs')();
function perft(p,d) { if(!d)return 1;let n=0;for(const m of p.legalMoves()){p.make(m);n+=perft(p,d-1);p.unmake();}return n; }
for(const [fen,d,n] of [
  [undefined,4,197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',3,97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',4,43238]
]) {const p=new E.Chess(fen),before=p.fen(); assert.equal(perft(p,d),n);assert.equal(p.fen(),before);}
for(const fen of ['7k/6Q1/5K2/8/8/8/8/8 b - - 0 1','7k/6Q1/5K2/8/8/8/8/8 b - - 100 1']) {
 const p=new E.Chess(fen),s=new E.Searcher(p,{adv:true}); assert.equal(s.qs(-1e6,1e6,0,0),-E.MATE);
}
// In check: the only evasion is a quiet king move; stand-pat is illegal.
{ const p=new E.Chess('7k/8/5K2/8/8/8/8/7R b - - 0 1');const s=new E.Searcher(p,{adv:true});const before=p.fen();s.qs(-1e6,1e6,0,0);assert(s.nodes>1);assert.equal(p.fen(),before); }
// A knight underpromotion delivers mate; quiescence must retain it.
{const p=new E.Chess('8/5KP1/7k/8/8/8/8/7R w - - 0 1');const s=new E.Searcher(p,{adv:true}); assert(s.qs(-1e6,1e6,0,0)>E.MATE-100);}
// Search always returns a legal move, including after a very short hard timeout.
for(const fen of [undefined,'8/8/4k3/8/4P3/4K3/8/8 w - - 0 1']){
 const p=new E.Chess(fen);for(const time of [1,20,80]){const r=E.think(fen,[],49,{time,noBook:true});assert(p.findUci(r.move),JSON.stringify(r));}}
for(const line of E.bookLines){const p=new E.Chess();for(const u of line){const m=p.findUci(u);assert(m,'Illegal book move '+u+' in '+line.join(' '));p.make(m);}}
for(const [fen,win] of [
 ['k7/8/P1K5/8/8/8/8/8 w - - 0 1',false],
 ['k7/4P3/4K3/8/8/8/8/8 w - - 0 1',true],
 ['8/8/8/8/8/p1k5/8/K7 b - - 0 1',false],
 ['8/8/8/8/8/4k3/4p3/K7 b - - 0 1',true]
]){const p=new E.Chess(fen);assert.equal(E.probeKPK(p).win,win);if(!win)assert.equal(E.evaluate(p,'full'),0);}
assert.equal(E.probeKPK(new E.Chess()),null);
{const fen='6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',p=new E.Chess(fen);const r=E.think(fen,[],34,{time:100,noBook:true});p.make(p.findUci(r.move));assert.equal(p.status().reason,'checkmate');}
assert(E.think(null,['c2c4','g8f6','d2d4','e7e6'],34).book,'Book transposition');
assert.equal(E.LEVELS.length,65);
for(const m of fs.readFileSync('index.html','utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
console.log('PASS: perft, checkmate, quiet evasions, underpromotion, timeout, KPK, mate-in-one, book transposition, all '+E.bookLines.length+' book lines, 65 levels, script syntax');
