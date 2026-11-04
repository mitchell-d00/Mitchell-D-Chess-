// Original MIT controlled evaluation microbenchmark, not a strength measurement.
// node scripts/bench-mnn.cjs [output.json]
const fs=require('node:fs'),load=require('./engine.cjs');
const fens=JSON.parse(fs.readFileSync('validation/mnn/bench-fens.json','utf8')),runs=[];
for(let repeat=0;repeat<3;repeat++)for(const mode of ['full','mce','mnn-js','mnn-simd']){
 const E=load();E.MNN_CONFIG.wasm=mode!=='mnn-js';const evalMode=mode.startsWith('mnn')?'mnn':mode;
 const positions=fens.map(f=>{const p=new E.Chess(f);E.evaluate(p,evalMode);return {p,moves:Array.from(p.legalMoves()).slice(0,10)};});
 let evaluations=0,checksum=0;const start=performance.now();
 for(let round=0;round<10;round++)for(const {p,moves}of positions)for(const m of moves){p.make(m);checksum+=E.evaluate(p,evalMode);p.unmake();evaluations++;}
 const ms=performance.now()-start;runs.push({repeat,mode,evaluations,ms,perSecond:evaluations*1000/ms,checksum});
}
for(let i=0;i<runs.length;i+=4)if(runs[i+2].checksum!==runs[i+3].checksum)throw Error('Scalar/SIMD mismatch');
const report={simdModuleValidated:WebAssembly.validate(fs.readFileSync('engine/mnn-kernel.wasm')),note:'Same fixed parent positions and child moves. Includes make/evaluate/unmake, excludes parent initialization. Shared host; microbenchmark does not predict search speed or Elo.',runs};
const json=JSON.stringify(report,null,2)+'\n';if(process.argv[2])fs.writeFileSync(process.argv[2],json);process.stdout.write(json);
