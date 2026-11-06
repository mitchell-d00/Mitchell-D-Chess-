// MIT. Release identity, reference binary lineage and Standard behavior evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const E=require('./engine.cjs')(),qualified=require('../validation/wasm-port/evolution/status.json');
const release=require('../engine/wasm/release.json'),parity=require('../validation/personas/standard-parity.json');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(sha('engine/wasm/mitchell.wasm'),release.wasmSha256,'Release binary identity');
assert.equal(release.baselineWasmSha256,qualified.wasmSha256,'Preserve match-tested lineage');
assert.equal(sha(release.standardParityEvidence),release.standardParitySha256);
assert.equal(parity.hashes.baseline,qualified.wasmSha256);assert.equal(parity.hashes.candidate,release.wasmSha256);
assert(parity.repeats>=3&&parity.depth>=9);
for(let i=0;i<parity.repeats;i++){
 const tree=name=>parity.runs.find(r=>r.name===name&&r.repeat===i).cases.map(({score,move,nodes})=>({score,move,nodes}));
 assert.deepEqual(tree('baseline'),tree('candidate'),'Standard must preserve recorded fixed-depth trees');
}
const history=['e2e4','c7c5','g1f3'],p=new E.Chess();for(const u of history)p.make(p.findUci(u));
for(const level of [0,34,49,50,64]){
 const r=E.think(null,history,level,{time:25,noBook:true});assert(p.findUci(r.move));
 if(level>=50)assert.equal(r.backend,'wasm');else assert.notEqual(r.backend,'wasm');
}
assert.equal(E.WASM_CORE.prepare().memory.buffer.byteLength,32*1024*1024);
assert.throws(()=>E.think(null,['e2e5'],64,{time:1,noBook:true}),/Invalid move history/);
assert.throws(()=>E.think(null,[],65,{time:1,noBook:true}),/Invalid engine level/);
console.log('PASS: release binary identity and Standard parity to match-tested predecessor, beginner/classical/neural level boundaries, native dispatch, 32 MiB memory and strict input errors');
