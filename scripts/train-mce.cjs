#!/usr/bin/env node
// Original MIT Texel-style tuning on completed Mitchell-only self-play games.
// Fits five soft constraint terms; does not pretend to train a neural network.
const fs=require('node:fs'),crypto=require('node:crypto');
const args=process.argv.slice(2),positional=[];let html='index.html';
for(let i=0;i<args.length;i++){if(args[i]==='--html'){if(!args[i+1])throw Error('Missing --html path');html=args[++i];}else if(args[i].startsWith('--'))throw Error('Unknown option '+args[i]);else positional.push(args[i]);}
const [file,output]=positional;if(!file||positional.length>2)throw Error('Usage: train-mce.cjs selfplay.jsonl [candidate.json] [--html untrained.html]');
const E=require('./engine.cjs')(html),keys=Array.from(E.MCE_KEYS),defaults={...E.MCE_WEIGHTS};
const games=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x)).sort((a,b)=>a.id-b.id);
const rows=[],openingSplits=new Map(),complete=games.filter(g=>['1-0','0-1','1/2-1/2'].includes(g.result));
for(const g of complete){
 const splitGroup=g.opening===undefined?g.pair:g.opening,held=splitGroup%4===0;
 if(openingSplits.has(g.fen)&&openingSplits.get(g.fen)!==held)throw Error('Opening leaked across training/holdout; group repeated openings together');openingSplits.set(g.fen,held);
 const result=g.result==='1/2-1/2'?.5:g.result==='1-0'?1:0;
 for(const sample of g.positions){
  const p=new E.Chess(sample.fen),pieces=Array.from(p.b).filter(Boolean).length;if(pieces<=4||p.inCheck())continue;
  rows.push({base:E.evaluate(p,'full')*(p.side?-1:1),features:Array.from(E.mceFeatures(p)),result,holdout:held,pair:splitGroup});
 }
}
const train=rows.filter(r=>!r.holdout),holdout=rows.filter(r=>r.holdout);
if(train.length<100||holdout.length<30)throw Error('Need >=100 training and >=30 held-out positions from completed games');
const predict=cp=>1/(1+10**(-cp/400));
function loss(weights,data){let error=0;for(const r of data){let cp=r.base;for(let i=0;i<keys.length;i++)cp+=weights[keys[i]]*r.features[i];error+=(predict(cp)-r.result)**2;}return error/data.length;}
const weights={...defaults},regularization=.0000001;
function objective(w){return loss(w,train)+regularization*keys.reduce((s,k)=>s+(w[k]-defaults[k])**2,0);}
// Training data alone chooses weights. Holdout is read once for final rejection.
for(const step of [8,4,2,1])for(let pass=0;pass<5;pass++)for(const key of keys){
 let best=objective(weights),value=weights[key],chosen=value;
 for(const delta of [-step,step]){const candidate={...weights,[key]:Math.max(0,Math.min(48,value+delta))},l=objective(candidate);if(l<best){best=l;chosen=candidate[key];}}
 weights[key]=chosen;
}
const before=loss(defaults,holdout),after=loss(weights,holdout);
const report={schema:'mitchell-constraint-training-v1',createdUtc:new Date().toISOString(),dataSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),engineSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),games:games.length,completedGames:complete.length,unfinishedGames:games.length-complete.length,trainingPositions:train.length,holdoutPositions:holdout.length,trainingPairs:[...new Set(train.map(r=>r.pair))],holdoutPairs:[...new Set(holdout.map(r=>r.pair))],defaults,candidate:weights,trainBefore:loss(defaults,train),trainAfter:loss(weights,train),holdoutBefore:before,holdoutAfter:after,recommended:after<before,policy:'Held-out prediction improvement is required but insufficient: fresh paired matches must also pass. Never promote automatically or infer Elo from training loss.'};
const json=JSON.stringify(report,null,2)+'\n';if(output)fs.writeFileSync(output,json);process.stdout.write(json);
