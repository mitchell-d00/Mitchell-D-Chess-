const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const R=require('./report-strength.cjs'),sample='validation/wasm-port/evolution/match-40';
const report=R.buildReport([sample,'validation/modern/candidate-checkpoint','validation/strength/release-pilot-12']);
assert.equal(report.absoluteRating,null);const complete=report.experiments[0],partial=report.experiments[1];
assert.equal(complete.status,'complete');assert.equal(complete.identity.backend,'wasm-required');assert.deepEqual(complete.opponents[0].normal,{wins:20,draws:15,losses:5});assert.equal(complete.opponents[0].normalScoreRate,.6875);
assert.equal(partial.status,'incomplete');assert.equal(partial.completedGames,2);assert.equal(partial.plannedGames,200);
const pilot=report.experiments[2];assert.equal(pilot.status,'complete');assert.equal(pilot.completedGames,12);assert.equal(pilot.identity.backend,'wasm-required');assert(pilot.opponents.every(o=>o.forfeits===0));
assert.deepEqual(pilot.opponents.find(o=>o.name==='Leorik3.1.3').normal,{wins:0,draws:5,losses:1});assert.deepEqual(pilot.opponents.find(o=>o.name==='Texel1.06').normal,{wins:3,draws:2,losses:1});
const text=R.markdown(report);assert.match(text,/INCOMPLETE — 2\/200/);assert.match(text,/68\.75%/);assert.match(text,/0\.1 seconds\/move/);assert.match(text,/do not establish an absolute Elo/);
const unsafe=structuredClone(report);unsafe.experiments[0].purpose='<script>bad</script>|\nFake result';assert(!R.markdown(unsafe).includes('<script>'));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'strength-report-'));
try{
 fs.cpSync(sample,root,{recursive:true});const p=path.join(root,'summary.json'),data=JSON.parse(fs.readFileSync(p));data.opponents[Object.keys(data.opponents)[0]].wins=999;fs.writeFileSync(p,JSON.stringify(data));
 assert.throws(()=>R.buildReport([root]));
 // Even a freshly hashed but incorrectly tallied summary must fail PGN recount.
 const manifest=path.join(root,'snapshot.json'),snapshot=JSON.parse(fs.readFileSync(manifest));snapshot.files['summary.json']=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');fs.writeFileSync(manifest,JSON.stringify(snapshot));
 assert.throws(()=>R.buildReport([root]),/Stored summary disagrees/);
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log('PASS: verified/recounted strength reports, complete/incomplete separation, native identity, normal scores, escaped text and rejection of tampered or miscounted summaries');
