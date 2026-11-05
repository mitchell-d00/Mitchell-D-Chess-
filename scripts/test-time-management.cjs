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
