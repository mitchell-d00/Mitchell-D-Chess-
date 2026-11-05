// Compatibility importer for the pinned MIT model. Players never run this.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const config=require('../src/build.json'),file=process.argv[2]||config.model.path,net=fs.readFileSync(file);
const digest=crypto.createHash('sha256').update(net).digest('hex');
if(digest!==config.model.sha256||process.argv[3]&&+process.argv[3]!==config.model.hidden)throw Error('Model differs from pinned provenance; review src/build.json and attribution before replacing it');
fs.writeFileSync(path.resolve(config.model.path),net);fs.writeFileSync('index.html',require('./build.cjs')());
console.log(JSON.stringify({hidden:config.model.hidden,bytes:net.length,sha256:digest}));
