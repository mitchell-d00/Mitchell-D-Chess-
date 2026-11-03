// Paired, equal hard-budget games. No dependencies. External engines are test-only.
// node scripts/match.cjs --baseline old.html --games 12 --ms 100 --out results.json
// node scripts/match.cjs --uci /path/to/stockfish --games 4 --ms 1000 --out results.json
// For stockfish.js supply its local .js path; matching .wasm must sit alongside it.
const fs=require('node:fs'), {spawn}=require('node:child_process');
const args=process.argv.slice(2), get=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const E=require('./engine.cjs')(), B=get('--baseline')?require('./engine.cjs')(get('--baseline')):E;
const ms=+get('--ms',100),games=+get('--games',12),maxPly=+get('--plies',240);
let child,waiters=[],uciLines=[];
function failWaiters(error){const jobs=waiters;waiters=[];for(const job of jobs)job.fail(error);}
function send(s){child.stdin.write(s+'\n');}
function wait(prefix){return new Promise((resolve,reject)=>{
 const done=line=>{if(line.startsWith(prefix)){clearTimeout(timer);resolve(line);return true;}return false;};
 done.fail=error=>{clearTimeout(timer);reject(error);};
 const timer=setTimeout(()=>{waiters=waiters.filter(f=>f!==done);reject(Error('UCI timeout: '+prefix));},30000);
 waiters.push(done);
});}
async function main(){
 if(get('--uci')){
   const file=get('--uci');child=spawn(/\.[cm]?js$/.test(file)?process.execPath:file,/\.[cm]?js$/.test(file)?[file]:[],{stdio:['pipe','pipe','inherit']});
   child.on('error',failWaiters);child.on('exit',(code,signal)=>failWaiters(Error('UCI process exited: '+code+' '+signal)));
   let buf='';child.stdout.on('data',chunk=>{buf+=chunk;let i;while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);uciLines.push(line);waiters=waiters.filter(f=>!f(line));}});
   const ready=wait('uciok');send('uci');await ready;send('setoption name Hash value 32');send('setoption name Threads value 1');const r=wait('readyok');send('isready');await r;
 }
 const openings=[
 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6',
 'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8',
 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6',
 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7',
 'c2c4 e7e5 b1c3 g8f6 g2g3 d7d5 c4d5 f6d5',
 'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7'];
 const report={engineSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync('index.html')).digest('hex'),node:process.version,uciIdentity:uciLines.filter(x=>x.startsWith('id ')),ms,games,maxPly,opponent:get('--uci')||get('--baseline')||'self',results:[],samples:[]};
 for(let g=0;g<games;g++){
  const opening= new E.Chess();for(const u of openings[(g>>1)%openings.length].split(' '))opening.make(opening.findUci(u));
  const fen=opening.fen(),p=new E.Chess(fen),moves=[],samples=[];let status,times=[0,0],nodes=[0,0];const newSide=g%2?8:0;
  if(child)send('ucinewgame');
  for(let ply=0;ply<maxPly;ply++){
   status=p.status();if(status)break;
   const mine=p.side===newSide,idx=mine?0:1,t=performance.now();let u;
   if(!mine&&child){const best=wait('bestmove ');send('position fen '+fen+(moves.length?' moves '+moves.join(' '):''));send('go movetime '+ms);u=(await best).split(/\s+/)[1];}
   else {const r=(mine?E:B).think(fen,moves,34,{time:ms,noBook:true});u=r.move;nodes[idx]+=r.nodes||0;}
   times[idx]+=performance.now()-t;
   const m=p.findUci(u);if(!m)throw Error('Illegal move '+u+' at '+p.fen());
   if(ply>=12&&ply%6===0)samples.push({fen:p.fen(),game:g+1});p.make(m);moves.push(u);
  }
  status=status||p.status();
  const result=status?status.result:'*';const score=result==='*'?null:result==='1/2-1/2'?0.5:(result==='1-0')===(newSide===0)?1:0;
  report.results.push({game:g+1,newColor:newSide?'black':'white',result,score,reason:status?.reason||'ply limit (unfinished)',plies:moves.length,times,nodes,fen,moves});
  if(result!=='*')for(const x of samples)report.samples.push({...x,result:result==='1/2-1/2'?0.5:result==='1-0'?1:0});
  fs.writeFileSync(get('--out','match-results.json'),JSON.stringify(report,null,2));const {moves: omit, ...summary}=report.results.at(-1);console.log(JSON.stringify(summary));
 }
 const completed=report.results.filter(r=>r.score!==null),score=completed.reduce((n,r)=>n+r.score,0),p=score/completed.length;
 console.log(JSON.stringify({completed:completed.length,unfinished:games-completed.length,score,scoreRate:p,relativeElo:p>0&&p<1?400*Math.log10(p/(1-p)):null,note:'Small samples and short time controls do not establish an absolute Elo rating.'}));
 if(child){send('quit');child.kill();}
}
main().catch(e=>{console.error(e);child?.kill();process.exitCode=1;});
