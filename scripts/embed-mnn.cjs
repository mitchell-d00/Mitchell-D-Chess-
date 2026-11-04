// Original MIT: package an original MNN1 model into the standalone HTML.
// node scripts/embed-mnn.cjs engine/mitchell.mnn [index.html]
const fs=require('node:fs'),crypto=require('node:crypto');
const model=process.argv[2];if(!model)throw Error('Supply a locally trained original MNN1 model');
const net=fs.readFileSync(model),file=process.argv[3]||'index.html';
if(net.subarray(0,4).toString()!=='MNN1'||net.length<16)throw Error('Expected original MNN1 model');
const h=net.readUInt16LE(4);
if(net.readUInt16LE(6)!==768||h<8||h>128||h%8||net.length!==16+(768+2)*h*2)throw Error('Invalid model shape');
let html=fs.readFileSync(file,'utf8');
const source=fs.readFileSync('engine/mnn.js','utf8').replace('__MNN_MODEL__',net.toString('base64')).replace('__MNN_KERNEL__',fs.readFileSync('engine/mnn-kernel.wasm').toString('base64'));
const block='  // BEGIN EMBEDDED MITCHELL NEURAL EVALUATOR\n'+source+'  // END EMBEDDED MITCHELL NEURAL EVALUATOR\n';
const pattern=/  \/\/ BEGIN EMBEDDED MITCHELL NEURAL EVALUATOR[\s\S]*?  \/\/ END EMBEDDED MITCHELL NEURAL EVALUATOR\n/;
if(pattern.test(html))html=html.replace(pattern,()=>block);
else html=html.replace('  // ---------- Evaluation ----------',()=>block+'\n  // ---------- Evaluation ----------');
fs.writeFileSync(file,html);console.log(JSON.stringify({hidden:h,bytes:net.length,sha256:crypto.createHash('sha256').update(net).digest('hex')}));
