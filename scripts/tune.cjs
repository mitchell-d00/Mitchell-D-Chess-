// Offline Texel-style tuning of the original evaluator; no libraries or model weights.
// node scripts/tune.cjs match-results.json > candidate-weights.json
// Use many independent completed games; validate candidates in fresh paired matches.
const fs=require('node:fs'),E=require('./engine.cjs')();
const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
// Reconstruct labelled positions by game, to avoid leaking a game's outcome across splits.
const samples=[];
for(let g=0;g<report.results.length;g++){
 const game=report.results[g];if(game.result==='*')continue;
 const p=new E.Chess(game.fen),result=game.result==='1/2-1/2'?0.5:game.result==='1-0'?1:0;
 for(let ply=0;ply<game.moves.length;ply++){
  if(ply>=12&&ply%4===0&&!p.inCheck())samples.push({fen:p.fen(),result,holdout:g%4===0});
  p.make(p.findUci(game.moves[ply]));
 }
}
const defaults={...E.EVAL_WEIGHTS},keys=Object.keys(defaults);
const rows=samples.map(x=>{
 const p=new E.Chess(x.fen),sign=p.side?-1:1,base=sign*E.evaluate(p,'full');
 const features=keys.map(k=>{E.EVAL_WEIGHTS[k]+=16;const v=(sign*E.evaluate(p,'full')-base)/16;E.EVAL_WEIGHTS[k]=defaults[k];return v;});
 return {...x,base,features};
});
if(rows.length<100||!rows.some(r=>r.holdout))throw Error('Need at least 100 labelled positions with held-out games');
function loss(w,holdout){let sum=0,n=0;for(const r of rows){if(r.holdout!==holdout)continue;let cp=r.base;keys.forEach((k,i)=>cp+=(w[k]-defaults[k])*r.features[i]);const predicted=1/(1+10**(-cp/400));sum+=(predicted-r.result)**2;n++;}return sum/n;}
const w={...defaults};
for(const step of [8,4,2,1])for(let pass=0;pass<3;pass++)for(const key of keys){let best=loss(w,false),value=w[key];for(const delta of [-step,step]){const candidate={...w,[key]:Math.max(0,Math.min(64,value+delta))},l=loss(candidate,false);if(l<best){best=l;w[key]=candidate[key];}}}
const before=loss(defaults,true),after=loss(w,true);
console.log(JSON.stringify({positions:rows.length,defaults,candidate:w,trainBefore:loss(defaults,false),trainAfter:loss(w,false),holdoutBefore:before,holdoutAfter:after,recommended:after<before,note:'Experimental candidate only. Apply after larger held-out matches; this script does not change index.html.'},null,2));
