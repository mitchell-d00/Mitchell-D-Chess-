#!/usr/bin/env node
// Original MIT. Generate games using Mitchell's classical search only.
// node scripts/selfplay-mce.cjs --out /tmp/selfplay.jsonl --games 24 --ms 20
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
if(!isMainThread){
 const E=require('./engine.cjs')(workerData.html);
 for(const l of E.LEVELS)if(l.ev==='mce')l.ev='full';
 parentPort.on('message',job=>{
  try{
   const p=new E.Chess(job.fen),moves=[],positions=[];let terminal;
   for(let ply=0;ply<workerData.maxPlies;ply++){
    terminal=p.status();if(terminal)break;
    const r=E.think(job.fen,moves,64,{time:workerData.ms,noBook:true});
    if(ply>=12&&ply%6===0&&!p.inCheck())positions.push({fen:p.fen(),searchScore:r.score,depth:r.depth});
    const m=p.findUci(r.move);if(!m)throw Error('Illegal self-play move '+r.move);p.make(m);moves.push(r.move);
   }
   terminal=terminal||p.status();
   parentPort.postMessage({...job,moves,positions,result:terminal?.result||'*',reason:terminal?.reason||'ply limit; excluded from outcome training'});
  }catch(e){parentPort.postMessage({error:String(e.stack||e)});}
 });
}else{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
 const out=path.resolve(arg('--out','selfplay-mce.jsonl')),games=+arg('--games',24),ms=+arg('--ms',20),maxPlies=+arg('--plies',600),concurrency=+arg('--concurrency',2),html=path.resolve(arg('--html','index.html'));
 if(!Number.isInteger(games)||games<4||games%2||!Number.isFinite(ms)||ms<1||![1,2].includes(concurrency))throw Error('Use positive even games >=4, positive ms, concurrency 1 or 2');
 if(fs.existsSync(out))throw Error('Refusing to overwrite existing data');
 const openings=fs.readFileSync('validation/independent/openings.epd','utf8').trim().split(/\r?\n/);
 const E=require('./engine.cjs')(html),jobs=Array.from({length:games},(_,id)=>({id,pair:id>>1,opening:(id>>1)%openings.length,fen:new E.Chess(openings[(id>>1)%openings.length].split(';')[0].trim()+' 0 1').fen()}));
 const manifest={schema:'mitchell-selfplay-v2',createdUtc:new Date().toISOString(),node:process.version,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),teacher:'Mitchell classical full evaluation + existing search; no imported neural weights',games,ms,maxPlies,concurrency,openingsSha256:crypto.createHash('sha256').update(fs.readFileSync('validation/independent/openings.epd')).digest('hex'),holdoutRule:'Whole opening identity: opening % 4 === 0; repeated openings share split',note:'Timed games need not reproduce identical moves. Unfinished games are not labelled as draws.'};
 fs.writeFileSync(out+'.manifest.json',JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(out,'');
 let completed=0,failed=false;const workers=[];
 const stop=e=>{if(failed)return;failed=true;console.error(e);for(const w of workers)w.terminate();process.exitCode=1;};
 for(let i=0;i<concurrency;i++){
  const w=new Worker(__filename,{workerData:{html,ms,maxPlies}});workers.push(w);
  const next=()=>{if(jobs.length)w.postMessage(jobs.shift());else w.terminate();};
  w.on('error',stop);w.on('message',game=>{
   if(game.error){stop(game.error);return;}
   fs.appendFileSync(out,JSON.stringify(game)+'\n');completed++;
   console.log(JSON.stringify({completed,games,id:game.id,result:game.result,plies:game.moves.length,samples:game.positions.length}));next();
  });next();
 }
}
