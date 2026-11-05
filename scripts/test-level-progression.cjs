const assert=require('node:assert/strict'),E=require('./engine.cjs')(),audit=require('./audit-levels.cjs')(),allocate=require('../src/app/time-management.js');
assert.equal(E.LEVELS.length,65);assert.deepEqual(audit.issues,[]);assert.deepEqual(audit.identicalTimedPresets,[]);
for(let i=2;i<=65;i++){const L=E.LEVELS[i-1];assert(L.clockShare>0&&L.clockShare<=1);if(i>2)assert(L.clockShare>E.LEVELS[i-2].clockShare);}
for(let i=2;i<16;i++){assert(E.LEVELS[i].noise<=E.LEVELS[i-1].noise);assert(E.LEVELS[i].bl<=E.LEVELS[i-1].bl);}
for(const time of [100,1000,10000,60000]){
 let prev=0;for(let i=1;i<65;i++){const value=E.levelThinkTime(i,{time});assert(time>=1000?value>prev:value>=prev,`Reversed clock budget at level ${i+1}, ${time}ms`);assert(value<=time);prev=value;}
}
assert.equal(E.levelThinkTime(49),30000);assert.equal(E.levelThinkTime(50),32000);assert.equal(E.levelThinkTime(64),60000);
const clock={w:11000,b:9600,inc:0,delayLeft:0,per:0},base=allocate(clock,'w',120000,216).time;
assert(E.levelThinkTime(64,{time:base})>2*E.levelThinkTime(49,{time:base}));
const p=new E.Chess();for(let level=1;level<=65;level++){
 const r=E.think(null,[],level-1,{time:20,noBook:true});assert(p.findUci(r.move),`Illegal level ${level}`);
 if(!E.LEVELS[level-1].random)assert.equal(r.timeBudget,E.levelThinkTime(level-1,{time:20}));
}
assert.throws(()=>E.levelThinkTime(65),/Invalid engine level/);
console.log('PASS: all 65 levels legal; monotone feature/depth/cap/clock policies, noise/blunder progression and distinct budgets at 1s–60s; sub-second rounding and statistical strength require separate interpretation');
