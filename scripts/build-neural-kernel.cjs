// Development-only compiler: npm install --prefix /tmp/mit-neural-tools wabt@1.0.39
// WABT is Apache-2.0; none of its code is linked into the original kernel.
(async()=>{
 const fs=require('node:fs');
 let compiler;try{compiler=require(process.env.WABT_PATH||'wabt');}catch(error){if(process.env.WABT_PATH)throw error;compiler=require('/tmp/mit-neural-tools/node_modules/wabt');}
 const wabt=await compiler();
 const module=wabt.parseWat('nnue.wat',fs.readFileSync('engine/nnue.wat','utf8'),{simd:true});
 module.validate();const bytes=Buffer.from(module.toBinary({}).buffer);
 fs.writeFileSync('engine/nnue-kernel.wasm',bytes);console.log('Original kernel:',bytes.length,'bytes');
})().catch(e=>{console.error(e);process.exitCode=1;});
