const fs = require('node:fs'), zlib = require('node:zlib'), path = require('node:path');
const root = path.resolve(__dirname,'..'), config = require('../src/build.json');
const bytes = fs.readFileSync(path.join(root,'index.html')), sizes = {raw:bytes.length,gzip:zlib.gzipSync(bytes,{level:9}).length};
for(const kind of ['raw','gzip']) if(sizes[kind]>config.sizeBudget[kind]) throw Error(kind+' size '+sizes[kind]+' exceeds budget '+config.sizeBudget[kind]);
console.log('PASS: HTML bytes '+sizes.raw+' / '+config.sizeBudget.raw+'; gzip '+sizes.gzip+' / '+config.sizeBudget.gzip);
