// Optional development benchmark: node scripts/browser-bench.cjs previous.html
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  const fens=[
   'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
   'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7',
   'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
   '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'];
  for(let run=0;run<2;run++)for(const [name,file,mode] of [['previous',process.argv[2],'full'],['mitchell','index.html','mce']]){
   const source=fs.readFileSync(file,'utf8').match(/<script id="engine-src">([\s\S]*?)<\/script>/)[1];
   const result=await page.evaluate(({source,fens,mode})=>new Promise((resolve,reject)=>{
    const handler=`self.onmessage=e=>{try{let nodes=0,ms=0;const cases=[];for(const fen of e.data.fens){const p=new ENGINE.Chess(fen),s=new ENGINE.Searcher(p,{adv:true,eval:e.data.mode});s.rootDepth=9;const t=performance.now();const score=s.negamax(9,-1e6,1e6,0,false,0),elapsed=performance.now()-t;nodes+=s.nodes;ms+=elapsed;cases.push({nodes:s.nodes,ms:elapsed,score});}self.postMessage({nodes,ms,nps:Math.round(nodes*1000/ms),cases});}catch(error){self.postMessage({error:String(error)})}};`;
    const url=URL.createObjectURL(new Blob([source,handler],{type:'text/javascript'})),worker=new Worker(url);URL.revokeObjectURL(url);
    worker.onmessage=e=>{worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage({fens,mode});
   }),{source,fens,mode});
   console.log(JSON.stringify({run:run+1,name,...result}));
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
