// Original MIT. Audit the completed archive and reject false results/evidence.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),verify=require('./verify-level-match.cjs'),report=require('./report-level-match.cjs');
const source=path.resolve(process.argv[2]||'validation/levels/65-v51-60plus1'),valid=verify(source),rendered=report(source);
assert.equal(rendered.data.points65,valid.wins65+valid.draws/2);assert.equal(rendered.data.levels[65].playedMoves+rendered.data.levels[51].playedMoves,valid.traceMoves);assert.equal(rendered.data.pairs.length,valid.games/2);assert(rendered.markdown.includes(`completed ${valid.games}-game browser match`));
if(fs.existsSync(path.join(source,'README.md')))assert.equal(rendered.markdown,fs.readFileSync(path.join(source,'README.md'),'utf8'),'Published Markdown must reproduce exactly');
if(fs.existsSync(path.join(source,'report.json')))assert.deepEqual(rendered.data,JSON.parse(fs.readFileSync(path.join(source,'report.json'))),'Published report must reproduce exactly');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mitchell-level-match-test-'));
try{
 fs.cpSync(source,root,{recursive:true});
 const sumFile=path.join(root,'summary.json'),original=fs.readFileSync(sumFile,'utf8'),traceFile=path.join(root,'01.jsonl'),traceOriginal=fs.readFileSync(traceFile,'utf8');
 let summary=JSON.parse(original);summary.complete=false;fs.writeFileSync(sumFile,JSON.stringify(summary));assert.throws(()=>verify(root),/Incomplete campaigns/);
 summary=JSON.parse(original);summary.wins65++;fs.writeFileSync(sumFile,JSON.stringify(summary));assert.throws(()=>verify(root),/Recount mismatch/);
 fs.writeFileSync(sumFile,original);fs.appendFileSync(traceFile,'{}\n');assert.throws(()=>verify(root),/Evidence hash mismatch/);
 const rows=traceOriginal.trim().split('\n'),row=JSON.parse(rows[0]);row.whiteMs=1e9;rows[0]=JSON.stringify(row);fs.writeFileSync(traceFile,rows.join('\n')+'\n');summary=JSON.parse(original);summary.files['01.jsonl']=crypto.createHash('sha256').update(fs.readFileSync(traceFile)).digest('hex');fs.writeFileSync(sumFile,JSON.stringify(summary));assert.throws(()=>verify(root),/PGN clock disagrees|clock exceeds/);
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log('PASS: '+valid.games+' independently recounted browser games; reproducible report; incomplete, false-score, modified-trace and fabricated-clock rejection');
