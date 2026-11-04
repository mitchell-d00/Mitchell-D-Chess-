// Original MIT WAT -> WASM development build; no compiler is loaded by the game.
const fs=require('node:fs');
const modulePath=process.env.WABT_MODULE||'wabt';
require(modulePath)().then(wabt=>{
 const parsed=wabt.parseWat('mnn-kernel.wat',fs.readFileSync('engine/mnn-kernel.wat','utf8'),{simd:true});parsed.resolveNames();parsed.validate({simd:true});
 const {buffer}=parsed.toBinary({canonicalize_lebs:true});fs.writeFileSync('engine/mnn-kernel.wasm',buffer);console.log('Original Mitchell SIMD bytes:',buffer.length);
}).catch(e=>{console.error(e);process.exitCode=1;});
