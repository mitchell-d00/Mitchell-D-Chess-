const assert = require('node:assert/strict'), allocate = require('../src/app/time-management.js');
const base = {w:60000,b:120000,inc:0,delayLeft:0,per:0};
assert(allocate(base,'w',60000,120).time>allocate(base,'w',60000,0).time,'Later game receives a shorter planning horizon');
assert(allocate(base,'b',60000,0).time>allocate(base,'w',60000,0).time,'Use the moving side clock');
assert(allocate({...base,inc:2000},'w',60000,0).time>allocate(base,'w',60000,0).time);
assert(allocate({...base,delayLeft:1000},'w',60000,0).time<allocate({...base,delayLeft:5000},'w',60000,0).time,'Spent delay cannot be reclaimed');
assert(allocate({...base,w:2500,per:10000},'w',60000,0).time<2500,'Per-move timer uses actual remaining time');
for(const remaining of [1,20,100,1000,60000,3600000])for(const delayLeft of [0,5000])for(const level of [50,1000,60000]){
 const r=allocate({...base,w:remaining,delayLeft},'w',level,70);
 assert(Number.isInteger(r.time)&&r.time>=1&&r.time<=level);
 assert(r.time<=Math.max(1,remaining+delayLeft-r.reserve));
}
assert.equal(base.w,60000);assert.equal(base.delayLeft,0);
console.log('PASS: bounded clock budgets, side/phase/increment/remaining delay, per-move remainder and scheduling reserve');

// All presets must conserve a finite main clock through a long ending, even
// when dispatch/rendering cost substantially exceeds the search budget.
const E=require('./engine.cjs')(),track=allocate.updateClockOverhead;
for(let level=1;level<=65;level++)for(const cost of [20,80,150]){
 let remaining=60000,overhead=75;
 for(let turn=0;turn<200;turn++){
  const c={...base,w:remaining,start:{w:60000,b:120000}},plan=allocate(c,'w',120000,turn*2,{overheadMs:overhead});
  const search=E.levelThinkTime(level-1,{time:plan.time});
  remaining-=search+cost;overhead=track(overhead,search+cost,search);
  assert(remaining>0,`Level ${level} flagged in synthetic long game, overhead=${cost}`);
 }
 assert(remaining>4000,`No long-game bank at level ${level}, overhead=${cost}`);
}
const rich={...base,start:{w:60000,b:120000}},fresh=allocate(rich,'w',120000,200,{overheadMs:20});
const trouble=allocate({...rich,w:5000},'w',120000,200,{overheadMs:20});
assert(trouble.time<fresh.time/10);assert(trouble.movesLeft>fresh.movesLeft);
assert.equal(trouble.mode,'time trouble');assert.equal(allocate({...rich,w:1000},'w',120000,200).mode,'emergency');
assert(allocate(rich,'w',120000,200,{overheadMs:300}).time<fresh.time,'Measured device overhead must reduce search');
const spike=track(20,301,1);assert(spike>400);assert(track(spike,5,1)<spike,'Recover gradually after a latency spike');
assert.equal(track(75,NaN,undefined),67.5);
// Future increment must not be spent before it is credited. Only remaining
// delay is available, while per-move clocks get a fresh budget on each move.
for(const remaining of [100,1000,5000,60000]){
 const c={...rich,w:remaining,inc:2000},r=allocate(c,'w',120000,200);
 assert(r.time<remaining);assert(r.time>allocate({...c,inc:0},'w',120000,200).time||r.time===1);
 const per=allocate({...c,per:10000},'w',120000,200);assert.equal(per.mode,'per-move');assert.equal(per.bank,0);
}
console.log('PASS: all 65 presets survive 200 synthetic no-increment turns at 20/80/150ms overhead; adaptive reserves, increment/delay/per-move budgets and emergency modes');
