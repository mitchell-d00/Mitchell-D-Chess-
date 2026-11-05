// Development bridge used by parity tests and experiments; not a second referee.
const fs=require('node:fs'),path=require('node:path');
module.exports=function loadCore(file='engine/wasm/mitchell.wasm',options={}){
 const exports=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(file)),{env:{clock:()=>Date.now()}}).exports;
 if(exports.__wasm_call_ctors)exports.__wasm_call_ctors();exports.init();if(!exports.set_memory(options.bits??21))throw Error('Unsupported TT size');
 const model=fs.readFileSync('third-party/leorik-128.nnue');new Uint8Array(exports.memory.buffer,exports.model_ptr(),model.length).set(model);
 const source=fs.readFileSync('src/engine/kpk.js','utf8'),bits=Buffer.from(source.match(/var KPK_DATA = '([^']+)'/)[1],'base64');new Uint8Array(exports.memory.buffer,exports.kpk_ptr(),bits.length).set(bits);
 const text=pointer=>{const view=new Uint8Array(exports.memory.buffer);let end=pointer;while(view[end])end++;return Buffer.from(view.subarray(pointer,end)).toString('utf8');};
 return {exports,load(fen){const input=Buffer.from(fen+'\0');if(input.length>8192)throw Error('FEN too long');new Uint8Array(exports.memory.buffer,exports.input_ptr(),input.length).set(input);if(!exports.load())throw Error('WASM rejected FEN');},fen:()=>text(exports.fen_ptr()),legal(){const count=exports.legal();return Array.from(new Int32Array(exports.memory.buffer,exports.moves_ptr(),count));},hash:()=>[exports.hash_lo(),exports.hash_hi()],state:()=>Array.from(new Int32Array(exports.memory.buffer,exports.state_ptr(),8))};
};
