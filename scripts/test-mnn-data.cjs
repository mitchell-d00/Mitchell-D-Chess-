// Original MIT: replay original self-play data and verify sampling/base features.
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),E=require('./engine.cjs')();
const root='validation/mnn',data=zlib.gunzipSync(fs.readFileSync(root+'/selfplay.jsonl.gz')),report=JSON.parse(fs.readFileSync(root+'/training.json'));
const games=data.toString().trim().split('\n').map(x=>JSON.parse(x));assert.equal(games.length,100);assert.equal(new Set(games.map(g=>g.id)).size,100);
assert.equal(crypto.createHash('sha256').update(data).digest('hex'),report.dataSha256);
let samples=0,complete=0;
for(const g of games){
 const p=new E.Chess(g.fen);let at=0;
 for(let ply=0;ply<g.moves.length;ply++){
  if(ply>=12&&ply%2===0&&!p.inCheck()){
   const row=g.positions[at++];assert(row);assert.equal(row.fen,p.fen());assert.equal(row.baseWhite,(E.evaluate(p,'full')*(p.side?-1:1))||0);
   const features=Array.from(E.mceFeatures(p));features.forEach((x,i)=>assert(Math.abs(x-row.constraints[i])<1e-10));samples++;
  }
  const m=p.findUci(g.moves[ply]);assert(m,'Illegal archived move '+g.id+' '+ply);p.make(m);
 }
 assert.equal(at,g.positions.length);
 if(g.result==='*'){assert.equal(p.status(),null);assert.equal(g.moves.length,400);}else{assert.equal(p.status()?.result,g.result);complete++;}
}
assert.equal(complete,report.completedGames);assert.equal(samples,6476);
console.log('PASS: 100 original self-play games, 98 completed/2 unfinished, 6476 replayed samples, original static labels and unchanged constraint features');
