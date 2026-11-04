// Original MIT: embed the Mitchell-only evaluator, with no third-party payload.
const fs=require('node:fs');
const file=process.argv[2]||'index.html';let html=fs.readFileSync(file,'utf8');
const start='  // BEGIN EMBEDDED MITCHELL EVALUATOR',end='  // END EMBEDDED MITCHELL EVALUATOR';
const block=start+'\n'+fs.readFileSync('engine/mce.js','utf8')+end+'\n';
const pattern=/  \/\/ BEGIN EMBEDDED MITCHELL EVALUATOR[\s\S]*?  \/\/ END EMBEDDED MITCHELL EVALUATOR\n/;
if(pattern.test(html))html=html.replace(pattern,()=>block);
else html=html.replace('  // ---------- Evaluation ----------',()=>block+'\n  // ---------- Evaluation ----------');
fs.writeFileSync(file,html);
