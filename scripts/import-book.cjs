// Optional maintenance tool. Usage: node scripts/import-book.cjs /path/to/chess-openings
// The source data is CC0: https://github.com/lichess-org/chess-openings
const fs = require('node:fs'), path = require('node:path');
const E = require('./engine.cjs')();
const groups = new Map();
for (const file of ['a.tsv','b.tsv','c.tsv','d.tsv','e.tsv']) {
  for (const row of fs.readFileSync(path.join(process.argv[2],file),'utf8').trim().split('\n').slice(1)) {
    const [eco,name,pgn] = row.split('\t');
    const sans = pgn.replace(/\d+\./g,'').trim().split(/\s+/);
    if (sans.length < 8 || sans.length > 28 || /Trap|Gambit|Attack:|Defense:.*Accepted/i.test(name)) continue;
    if (!groups.has(eco) || groups.get(eco).length < sans.length) groups.set(eco,sans);
  }
}
const lines = [];
for (const sans of groups.values()) {
  const p = new E.Chess(), us = [];
  for (const san of sans) {
    const m = p.legalMoves().find(m=>p.san(m).replace(/[+#]/g,'') === san.replace(/[+#]/g,''));
    if (!m) throw Error('Invalid SAN '+san+' in '+sans.join(' '));
    us.push(p.uci(m)); p.make(m);
  }
  lines.push(us.join(' '));
}
let html = fs.readFileSync('index.html','utf8');
if (html.includes('// CC0 opening supplement')) throw Error('Already imported');
const marker = "  ].map(function (l) { return l.split(' '); });";
html = html.replace(marker, "    // CC0 opening supplement: lichess-org/chess-openings, one long line per ECO.\n    ,"+lines.map(l=>JSON.stringify(l)).join(',\n    ')+"\n"+marker);
fs.writeFileSync('index.html',html);
console.log('Imported',lines.length,'legally validated lines');
