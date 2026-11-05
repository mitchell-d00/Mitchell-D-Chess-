// MIT. Release routing and the exact match-tested binary, independent of branding.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const E=require('./engine.cjs')(),qualified=require('../validation/wasm-port/evolution/status.json');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('engine/wasm/mitchell.wasm')).digest('hex'),qualified.wasmSha256,'Release must use the match-tested core');
const history=['e2e4','c7c5','g1f3'],p=new E.Chess();for(const u of history)p.make(p.findUci(u));
for(const level of [0,34,49,50,64]){
 const r=E.think(null,history,level,{time:25,noBook:true});assert(p.findUci(r.move));
 if(level>=50)assert.equal(r.backend,'wasm');else assert.notEqual(r.backend,'wasm');
}
assert.equal(E.WASM_CORE.prepare().memory.buffer.byteLength,32*1024*1024);
assert.throws(()=>E.think(null,['e2e5'],64,{time:1,noBook:true}),/Invalid move history/);
assert.throws(()=>E.think(null,[],65,{time:1,noBook:true}),/Invalid engine level/);
console.log('PASS: match-tested release binary, beginner/classical/neural level boundaries, native dispatch, 32 MiB memory and strict input errors');
