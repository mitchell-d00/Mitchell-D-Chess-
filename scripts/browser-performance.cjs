// Like-for-like comparison inside real browser workers, alternating fresh workers.
const {chromium}=require('playwright'),fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{
 const baseline=process.argv[2];if(!baseline)throw Error('Provide baseline HTML');
 const repeats=+(process.argv[3]||5),depth=+(process.argv[4]||9);
 const fens=['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'];
 const sources={baseline:fs.readFileSync(baseline,'utf8'),candidate:fs.readFileSync('index.html','utf8')};
 const data={createdUtc:new Date().toISOString(),depth,repeats,hashes:Object.fromEntries(Object.entries(sources).map(([key,text])=>[key,crypto.createHash('sha256').update(text).digest('hex')])),runs:[]};
 const handler=`self.onmessage=e=>{try{const E=ENGINE,{fens,depth}=e.data,p=new E.Chess();E.neuralEvaluate(p);let seed=333,moves=[];
 for(let i=0;i<64;i++){const ms=p.legalMoves();if(!ms.length)break;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const m=ms[seed%ms.length];moves.push(m);p.make(m);}for(const m of moves)p.unmake();
 const micro=(rounds,wasm)=>{E.NNUE_CONFIG.wasm=wasm;let checksum=0;const t=performance.now();for(let n=0;n<rounds;n++){for(const m of moves){p.make(m);checksum+=p.nnue.score(p.side);}for(const m of moves)p.unmake();}return {ms:performance.now()-t,evaluations:rounds*moves.length,checksum};};
 micro(1000,true);micro(100,false);const microSimd=micro(30000,true),microJs=micro(2000,false);E.NNUE_CONFIG.wasm=true;
 let nodes=0,ms=0,cases=[];for(const fen of fens){new E.Searcher(new E.Chess(),{eval:'mat'});const q=new E.Chess(fen),s=new E.Searcher(q,{adv:true,eval:'nnue'});s.rootDepth=depth;const t=performance.now();const score=s.negamax(depth,-1e6,1e6,0,false,0),elapsed=performance.now()-t;nodes+=s.nodes;ms+=elapsed;cases.push({score,nodes:s.nodes,ms:elapsed});}self.postMessage({microSimd,microJs,search:{nodes,ms,nps:nodes*1000/ms,cases}});
 }catch(error){self.postMessage({error:String(error.stack||error)})}};`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage();data.browser=browser.version();
 for(let repeat=0;repeat<repeats;repeat++){
  for(const name of repeat%2?['candidate','baseline']:['baseline','candidate']){
   const source=sources[name].match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1];
   const row=await page.evaluate(({source,handler,fens,depth})=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([source,handler],{type:'text/javascript'})),worker=new Worker(url);URL.revokeObjectURL(url);worker.onmessage=e=>{worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage({fens,depth});}),{source,handler,fens,depth});
   data.runs.push({name,repeat,...row});process.stderr.write(name+' '+(repeat+1)+' '+Math.round(row.search.nps)+' NPS\n');
  }
  const a=data.runs.at(-2),b=data.runs.at(-1);
  if(a.microSimd.checksum!==b.microSimd.checksum||a.microJs.checksum!==b.microJs.checksum||JSON.stringify(a.search.cases.map(x=>[x.score,x.nodes]))!==JSON.stringify(b.search.cases.map(x=>[x.score,x.nodes])))throw Error('Numerical/search differences');
 }
 const median=xs=>xs.sort((a,b)=>a-b)[Math.floor(xs.length/2)];data.medians=Object.fromEntries(Object.keys(sources).map(name=>{const rows=data.runs.filter(x=>x.name===name);return [name,{simdEvaluationsPerSecond:median(rows.map(r=>r.microSimd.evaluations*1000/r.microSimd.ms)),jsEvaluationsPerSecond:median(rows.map(r=>r.microJs.evaluations*1000/r.microJs.ms)),searchNps:median(rows.map(r=>r.search.nps))}];}));data.ratios=Object.fromEntries(Object.keys(data.medians.baseline).map(key=>[key,data.medians.candidate[key]/data.medians.baseline[key]]));
 process.stdout.write(JSON.stringify(data,null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
