// Recount a user-supplied game independently of its result/termination headers.
const fs=require('node:fs'),assert=require('node:assert/strict'),E=require('./engine.cjs')(),T=require('../ui/position-tools.js')(E),root='validation/user-reports/2026-11-06-knight-ending/';
const game=T.parsePgn(fs.readFileSync(root+'game.pgn','utf8')),p=new E.Chess(game.startFen),seen=new Map(),claims=[];
seen.set(p.fen().split(' ').slice(0,4).join(' '),1);let maxRepeat=0,maxHalf=0;
for(let i=0;i<game.moves.length;i++){
 const m=p.findUci(game.moves[i]);assert(m);p.make(m);const key=p.fen().split(' ').slice(0,4).join(' '),n=(seen.get(key)||0)+1;seen.set(key,n);maxRepeat=Math.max(maxRepeat,n);maxHalf=Math.max(maxHalf,p.half);if(p.claimable())claims.push(i+1);
 if(i===120)assert.equal(p.fen(),'8/8/4p3/3p2k1/3P4/2P2P2/1n1KN3/8 b - - 16 61');
}
assert.equal(game.moves.length,135);assert.equal(maxRepeat,1);assert.equal(maxHalf,30);assert.deepEqual(claims,[]);assert.equal(p.status(true),null);assert(p.canMate('w'));
const r=JSON.parse(fs.readFileSync(root+'replay.json'));assert.equal(r.finalFen,p.fen());assert.equal(r.finalClaimable,null);assert.equal(r.maxRepetitions,1);assert.equal(r.maxHalfmove,30);
for(const name of ['foreground.json','foreground-after.json']){const trace=JSON.parse(fs.readFileSync(root+name));const q=new E.Chess(game.startFen);for(const u of game.moves.slice(0,121).concat(trace.moves)){const m=q.findUci(u);assert(m);q.make(m);}assert.equal(q.fen(),trace.fen);assert.equal(trace.plies,151);assert.equal(trace.over,null);assert(trace.clocks.b>0&&trace.clocks.w>0);assert.deepEqual(trace.errors,[]);assert.equal(T.parsePgn(trace.pgn).moves.length,151);if(name==='foreground-after.json'){assert.equal(trace.engineRecoveries,0);assert.match(trace.pgn,/CurrentClockPolicy/);assert.match(trace.pgn,/\[%clk /);}}
console.log('PASS: user PGN 135 legal plies, screenshot at ply121, independent position counts, no missed claim, halfmove30 and legal bounded foreground continuation');

const crypto=require('node:crypto'),manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));for(const [name,hash]of Object.entries(manifest.files)){assert(!name.includes('/')&&!name.includes('\\'));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+name)).digest('hex'),hash);}
console.log('PASS: both foreground continuations, zero healthy-search recoveries and immutable user-report evidence hashes');
