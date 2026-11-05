// Original MIT. Verify archived evidence and recompute scores before reporting.
// No archived runner is executed, and no opponent rating is transferred to Mitchell.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function checked(command,args){
  const r=spawnSync(command,args,{cwd:ROOT,encoding:'utf8',timeout:120000});
  if(r.status!==0)throw Error((r.stderr||r.stdout||r.error?.message||'Evidence command failed').trim());return r.stdout;
}
function readArchive(directory){
  const root=path.resolve(directory),read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
  checked(process.execPath,[path.join(__dirname,'verify-evidence.cjs'),root]);
  const snapshot=read('snapshot.json'),config=read('campaign.json'),saved=read('summary.json');
  const result=JSON.parse(checked('python3',[path.join(__dirname,'independent-campaign.py'),path.join(root,'campaign.json'),'--summary-only']));
  assert.equal(snapshot.testedRevision,config.testedRevision,'Revision provenance differs');
  assert.equal(snapshot.htmlSha256,config.htmlSha256,'HTML provenance differs');
  assert.equal(result.completedGames,snapshot.completedGames,'PGN count differs from manifest');
  assert.equal(result.plannedGames,snapshot.plannedGames,'Protocol plan differs from manifest');
  assert.deepEqual(result.opponents,saved.opponents,'Stored summary disagrees with the PGNs');
  const complete=!!snapshot.complete&&result.completedGames===result.plannedGames;
  return {archive:root,purpose:config.purpose||config.event||path.basename(root),status:complete?'complete':'incomplete',
    testedRevision:config.testedRevision,htmlSha256:config.htmlSha256,engineSourceSha256:config.engineSourceSha256||null,
    identity:config.engineIdentity||{backend:config.environment?.MITCHELL_REQUIRE_WASM==='1'?'wasm-required':'legacy-or-unspecified',modelSha256:null},
    timeControl:config.timeControl,concurrency:config.concurrency||1,host:config.host||{},completedGames:result.completedGames,plannedGames:result.plannedGames,
    opponents:Object.entries(result.opponents).map(([name,o])=>{
      const n=o.normalResults.wins+o.normalResults.draws+o.normalResults.losses;
      return {name,completed:o.completed,planned:o.planned,normal:o.normalResults,forfeitResults:o.forfeitResults,forfeits:o.forfeits,
        normalScoreRate:n?(o.normalResults.wins+.5*o.normalResults.draws)/n:null,completedPairs:o.completedNormalPairs,pairedScoreBootstrap95:o.pairedScoreBootstrap95,
        binarySha256:config.opponents[name].sha256||null,source:config.opponents[name].source||null,options:config.opponents[name].options||[]};
    })};
}
function buildReport(directories){
  if(!directories.length)throw Error('Provide one or more archived evidence directories');
  return {schema:1,createdUtc:new Date().toISOString(),ratingStatus:'Unrated; these experiments do not establish an absolute Elo or FIDE rating.',absoluteRating:null,
    method:'Archive hashes and legal PGNs verified; W/D/L and paired intervals recomputed by the repository runner. Forfeits excluded from normal score percentages.',
    experiments:directories.map(readArchive)};
}
const md=value=>String(value??'unknown').replace(/[\r\n]+/g,' ').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','\\|').replaceAll('`','\\`');
const percentage=x=>x==null?'not available':(100*x).toFixed(2)+'%';
function markdown(report,base=ROOT){
  let out='# Reproducible engine-strength results\n\n'+report.ratingStatus+'\n\n'+report.method+'\n';
  for(const e of report.experiments){
    const link=path.relative(base,e.archive).split(path.sep).join('/');
    out+='\n## '+md(e.purpose)+'\n\n**'+e.status.toUpperCase()+' — '+e.completedGames+'/'+e.plannedGames+' games**\n\n';
    out+='Revision: '+md(e.testedRevision)+'. Backend: '+md(e.identity.backend)+'.\n\n';
    out+='Control: '+md(e.timeControl.movetimeSeconds)+(e.timeControl.movetimeSeconds===1?' second/move; ':' seconds/move; ')+md(e.timeControl.equalTimeMarginMs??250)+'ms scheduling grace; '+md(e.timeControl.candidateMoveOverheadMs??20)+'ms Mitchell overhead reservation; '+e.concurrency+' simultaneous game(s).\n\n';
    out+='| Opponent | Games | Normal W/D/L | Forfeits | Normal score | Completed normal pairs | Paired 95% score interval |\n| --- | ---: | --- | ---: | ---: | ---: | --- |\n';
    for(const o of e.opponents){const interval=o.pairedScoreBootstrap95?o.pairedScoreBootstrap95.map(percentage).join('–'):'not computed';out+='| '+[md(o.name),o.completed+'/'+o.planned,[o.normal.wins,o.normal.draws,o.normal.losses].join('/'),o.forfeits,percentage(o.normalScoreRate),o.completedPairs,interval].join(' | ')+' |\n';}
    out+='\nEvidence: ['+md(link)+'](<'+link.replaceAll('>','%3E')+'>). HTML SHA-256: '+md(e.htmlSha256)+'.\n';
    if(e.identity.modelSha256)out+='\nNetwork SHA-256: '+md(e.identity.modelSha256)+'.\n';
    out+='\nIntervals resample whole colour-reversed pairs; small or degenerate samples have no interval. Different revisions, controls and opponents remain separate experiments. Published opponent ratings at other controls are not Mitchell ratings.\n';
  }
  return out;
}
if(require.main===module){
  try{
    const args=process.argv.slice(2),json=args.includes('--json'),at=args.indexOf('--output'),output=at<0?null:args[at+1];
    if(at>=0&&!output)throw Error('--output needs a filename');
    const directories=args.filter((x,i)=>x!=='--json'&&x!=='--output'&&(at<0||i!==at+1));
    if(directories.some(x=>x.startsWith('--')))throw Error('Use --json or --output filename');
    const report=buildReport(directories),body=json?JSON.stringify(report,null,2)+'\n':markdown(report,output?path.dirname(path.resolve(output)):ROOT);
    if(output)fs.writeFileSync(output,body);else process.stdout.write(body);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={buildReport,markdown};
