// Rebuild the embedded evaluator using a locally checked-out MIT Leorik network.
// node scripts/embed-neural.cjs /path/to/128HL-S-5732M-Tmix-Q5-v19.nnue
const fs=require('node:fs'),crypto=require('node:crypto');
const file=process.argv[2],hidden=+(process.argv[3]||128),net=fs.readFileSync(file);
const expected=(768*hidden+3*hidden+1)*2;
if(hidden<16||hidden>256||hidden%8)throw Error('Supported hidden sizes: multiples of 8 from 16 through 256');
if(net.length!==expected&&net.length!==Math.ceil(expected/64)*64)throw Error('Wrong network size');
let html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('engine/nnue.js','utf8').replace('hidden: 128','hidden: '+hidden).replace('__MODEL__',net.toString('base64')).replace('__KERNEL__',fs.readFileSync('engine/nnue-kernel.wasm').toString('base64'));
const block='  // BEGIN EMBEDDED NEURAL EVALUATOR\n'+source+'  // END EMBEDDED NEURAL EVALUATOR\n';
if(html.includes('// BEGIN EMBEDDED NEURAL EVALUATOR'))html=html.replace(/  \/\/ BEGIN EMBEDDED NEURAL EVALUATOR[\s\S]*?  \/\/ END EMBEDDED NEURAL EVALUATOR\n/,block);
else html=html.replace('  // ---------- Evaluation ----------',block+'\n  // ---------- Evaluation ----------');
fs.writeFileSync('index.html',html);
console.log(JSON.stringify({hidden,bytes:net.length,sha256:crypto.createHash('sha256').update(net).digest('hex')}));
