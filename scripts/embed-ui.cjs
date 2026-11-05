// Compatibility command: all modular sources now build together.
const fs=require('node:fs');fs.writeFileSync('index.html',require('./build.cjs')());
console.log('Rebuilt standalone HTML from modular sources.');
