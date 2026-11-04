// Original MIT: verify archived original self-play and exactly repeat the fit.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root='validation/mce',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const data=zlib.gunzipSync(fs.readFileSync(root+'/selfplay.jsonl.gz')),html=zlib.gunzipSync(fs.readFileSync(root+'/untrained.html.gz'));
const manifest=JSON.parse(fs.readFileSync(root+'/selfplay.manifest.json')),recorded=JSON.parse(fs.readFileSync(root+'/training.json'));
assert.equal(sha(data),recorded.dataSha256);assert.equal(sha(html),manifest.htmlSha256);assert.equal(sha(html),recorded.engineSha256);
const games=data.toString().trim().split('\n').map(x=>JSON.parse(x));assert.equal(games.length,24);assert.equal(new Set(games.map(g=>g.id)).size,24);
const E=require('./engine.cjs')();let positions=0;
for(const g of games){
 const p=new E.Chess(g.fen),samples=[];
 for(let ply=0;ply<g.moves.length;ply++){
  if(ply>=12&&ply%6===0&&!p.inCheck())samples.push(p.fen());
  const move=p.findUci(g.moves[ply]);assert(move,'Invalid archived self-play move');p.make(move);
 }
 assert.deepEqual(samples,g.positions.map(s=>s.fen));assert.equal(p.status()?.result,g.result);positions+=samples.length;
}
for(const pair of recorded.trainingPairs)assert(!recorded.holdoutPairs.includes(pair));
const td=fs.mkdtempSync(path.join(os.tmpdir(),'mce-repeat-'));
try{
 const input=path.join(td,'games.jsonl'),source=path.join(td,'untrained.html'),output=path.join(td,'training.json');fs.writeFileSync(input,data);fs.writeFileSync(source,html);
 const p=spawnSync(process.execPath,['scripts/train-mce.cjs',input,output,'--html',source],{encoding:'utf8',timeout:30000});assert.equal(p.status,0,p.stderr);
 const fitted=path.join(td,'fitted.html');fs.writeFileSync(fitted,zlib.gunzipSync(fs.readFileSync(root+'/fitted.html.gz')));
 assert.deepEqual({...require('./engine.cjs')(fitted).MCE_WEIGHTS},recorded.candidate);
 const actual=JSON.parse(fs.readFileSync(output));delete actual.createdUtc;delete recorded.createdUtc;assert.deepEqual(actual,recorded);
}finally{fs.rmSync(td,{recursive:true,force:true});}
console.log('PASS: 24 completed original self-play games, '+positions+' legal replayed samples, disjoint holdout pairs, archived inputs and exactly reproducible training');
