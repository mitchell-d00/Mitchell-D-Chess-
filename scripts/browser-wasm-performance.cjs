// MIT. Same-tree throughput check in real Chromium workers, without network.
// MITCHELL_TEST_HTML=candidate.html node scripts/browser-wasm-performance.cjs baseline.html [repeats=5] [depth=11]
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const paths={baseline:process.argv[2],candidate:process.env.MITCHELL_TEST_HTML},repeats=Number(process.argv[3]||5),depth=Number(process.argv[4]||11);
 if(!paths.baseline||!paths.candidate||!Number.isInteger(repeats)||repeats<3||!Number.isInteger(depth)||depth<1||depth>20)throw Error('Provide baseline/candidate HTML, repeats >=3, depth 1–20');
 const fens=['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'];
 const sources=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,fs.readFileSync(p,'utf8')]));
 const data={createdUtc:new Date().toISOString(),depth,repeats,ttBits:19,memoryMiB:32,fens,hashes:Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,crypto.createHash('sha256').update(s).digest('hex')])),runs:[],notes:['Fresh offline worker per measured run, two whole-suite warmups per worker, alternating engine order.','Same fixed-depth scores/moves/nodes required; no playing-strength conclusion.']};
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.context().setOffline(true);data.browser=browser.version();
  for(let repeat=0;repeat<repeats;repeat++){
   const rows={};
   for(const name of repeat%2?['candidate','baseline']:['baseline','candidate']){
    const source=sources[name].match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1];
    const row=await page.evaluate(({source,depth,fens})=>new Promise((resolve,reject)=>{
     const handler=`self.onmessage=e=>{try{const {fens,depth}=e.data,core=ENGINE.WASM_CORE.prepare();if(!core)throw Error(ENGINE.WASM_CORE.error);const run=()=>{const cases=[];for(const fen of fens){coreLoad(core,fen);core.reset_tt();const t=performance.now(),score=core.fixed(depth,3,1,1,1,0),ms=performance.now()-t;cases.push({score,move:core.result_move(),nodes:core.nodes(),ms});}const nodes=cases.reduce((n,x)=>n+x.nodes,0),ms=cases.reduce((n,x)=>n+x.ms,0);return {cases,nodes,ms,nps:nodes*1000/ms,memory:core.memory.buffer.byteLength};};run();run();self.postMessage(run());}catch(e){self.postMessage({failure:String(e.stack||e)});}};`;
     // coreLoad is private to ENGINE, so send FEN through the exported buffer.
     const load=`function coreLoad(core,fen){const b=new Uint8Array(core.memory.buffer,core.input_ptr(),8192);for(let i=0;i<fen.length;i++)b[i]=fen.charCodeAt(i);b[fen.length]=0;if(!core.load())throw Error('FEN rejected');}`;
     const url=URL.createObjectURL(new Blob([source,load,handler],{type:'text/javascript'})),worker=new Worker(url);URL.revokeObjectURL(url);
     const timer=setTimeout(()=>{worker.terminate();reject(Error('Benchmark worker timed out'));},120000);
     worker.onmessage=e=>{clearTimeout(timer);worker.terminate();resolve(e.data);};worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};worker.postMessage({depth,fens});
    }),{source,depth,fens});
    assert(!row.failure,row.failure);assert.equal(row.memory,32*1024*1024);rows[name]=row;data.runs.push({name,repeat,...row});process.stderr.write(`${name} ${repeat+1}: ${Math.round(row.nps)} NPS\n`);
   }
   const tree=row=>row.cases.map(({score,move,nodes})=>({score,move,nodes}));assert.deepEqual(tree(rows.candidate),tree(rows.baseline));
  }
  const median=xs=>{const s=xs.toSorted((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  data.medianNps=Object.fromEntries(Object.keys(paths).map(name=>[name,median(data.runs.filter(r=>r.name===name).map(r=>r.nps))]));data.speedup=data.medianNps.candidate/data.medianNps.baseline;
  process.stdout.write(JSON.stringify(data,null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
