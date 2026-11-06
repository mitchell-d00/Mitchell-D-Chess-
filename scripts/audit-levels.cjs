// Original MIT: audit every preset and effective clock budget. No Elo claim.
const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),load=require('./engine.cjs'),fallbackAllocate=require('../src/app/time-management.js');
function audit(file='index.html'){
 const source=fs.readFileSync(file,'utf8'),embedded=source.match(/function allocateThinkTime\([\s\S]*?\n\}/),allocate=embedded?vm.runInNewContext('('+embedded[0]+')'):fallbackAllocate;
 const E=load(file),clocks={late:{w:11000,b:9600,start:{w:60000,b:60000},inc:0,delayLeft:0,per:0},increment:{w:60000,b:60000,start:{w:60000,b:60000},inc:2000,delayLeft:0,per:0},perMove:{w:10000,b:10000,start:{w:10000,b:10000},inc:0,delayLeft:0,per:10000}};
 const rows=E.LEVELS.map((L,i)=>{
  const budgets={};for(const [name,clock]of Object.entries(clocks)){const base=allocate(clock,'w',E.levelThinkTime?120000:L.t,216).time;budgets[name]=E.levelThinkTime?E.levelThinkTime(i,{time:base}):L.random?0:L.noise||L.bl?null:base;}
  const fixed=E.levelThinkTime?E.levelThinkTime(i,{time:100}):L.random?0:L.noise||L.bl?null:100;
  return {level:i+1,name:L.name,eval:L.ev||'random',depth:L.d||0,quiescence:!!L.q,advanced:!!L.adv,book:!!L.book,noise:L.noise||0,blunders:L.bl||0,capMs:L.t||null,clockShare:L.clockShare??null,fixed100ms:fixed,clocks:budgets};
 });
 const issues=[],rank={random:0,mat:1,pst:2,full:3,nnue:4};
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i];if(b.depth<a.depth)issues.push({pair:[a.level,b.level],issue:'depth decreases'});if(rank[b.eval]<rank[a.eval])issues.push({pair:[a.level,b.level],issue:'evaluation feature tier decreases'});if(a.quiescence&&!b.quiescence)issues.push({pair:[a.level,b.level],issue:'quiescence disabled'});if(a.capMs&&b.capMs&&b.capMs<=a.capMs)issues.push({pair:[a.level,b.level],issue:'time cap does not increase'});}
 const groups=new Map();for(const r of rows){if(r.level<17)continue;const key=[r.eval,r.depth,r.quiescence,r.advanced,r.book,r.fixed100ms,r.clockShare].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r.level);}
 const roundedBudgetTies=rows.slice(1).filter((r,i)=>r.fixed100ms!==null&&r.fixed100ms===rows[i].fixed100ms).map(r=>[r.level-1,r.level]);
 return {createdUtc:new Date().toISOString(),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),allocationSource:embedded?'embedded HTML':'current fallback',orderedPolicy:!!E.levelThinkTime,rows,issues,identicalTimedPresets:[...groups.values()].filter(g=>g.length>1),rounded100msBudgetTies:roundedBudgetTies,notes:['Budget/resource audit, not a statistical strength proof.','Uses the HTML clock allocator when present, with its default initial overhead estimate.','One-millisecond rounding and forced/book moves can make neighbouring presets behave alike.','Lower noisy presets retain capped maximum depths, noise and deliberate mistakes.']};
}
if(require.main===module)process.stdout.write(JSON.stringify(audit(process.argv[2]||'index.html'),null,2)+'\n');module.exports=audit;
