// Optional CC0 maintenance tool; no downloaded data or runtime dependency.
// node scripts/import-book.cjs /path/to/chess-openings --replace-supplement
const fs=require('node:fs'),path=require('node:path'),ROOT=path.resolve(__dirname,'..');
const E=require('./engine.cjs')(path.join(ROOT,'index.html'));
function readSupplement(directory){
 const groups=new Map();
 for(const file of ['a.tsv','b.tsv','c.tsv','d.tsv','e.tsv']){
  for(const row of fs.readFileSync(path.join(directory,file),'utf8').trim().split('\n').slice(1)){
   const [eco,name,pgn]=row.split('\t');if(!eco||!name||!pgn)throw Error('Malformed CC0 opening row');
   const sans=pgn.replace(/\d+\./g,'').trim().split(/\s+/);
   if(sans.length<8||sans.length>28||/Trap|Gambit|Attack:|Defense:.*Accepted/i.test(name))continue;
   if(!groups.has(eco)||groups.get(eco).length<sans.length)groups.set(eco,sans);
  }
 }
 const lines=[];
 for(const sans of groups.values()){
  const p=new E.Chess(),us=[];
  for(const san of sans){
   const move=p.legalMoves().find(m=>p.san(m).replace(/[+#]/g,'')===san.replace(/[+#]/g,''));
   if(!move)throw Error('Invalid SAN '+san+' in '+sans.join(' '));
   us.push(p.uci(move));p.make(move);
  }
  lines.push(us.join(' '));
 }
 if(!lines.length)throw Error('No eligible opening lines; source was not changed');
 return lines;
}
function replaceSupplement(source,lines,replace){
 if(source.includes('// CC0 opening supplement')){
  if(!replace)throw Error('Already imported; use --replace-supplement');
  source=source.replace(/    \/\/ CC0 opening supplement[\s\S]*?(?=  \]\.map\(function)/,'');
 }
 const marker="  ].map(function (l) { return l.split(' '); });";
 if(source.split(marker).length!==2)throw Error('Opening-book source marker missing or ambiguous');
 return source.replace(marker,"    // CC0 opening supplement: lichess-org/chess-openings, one long line per ECO.\n    ,"+lines.map(l=>JSON.stringify(l)).join(',\n    ')+"\n"+marker);
}
if(require.main===module){
 const lines=readSupplement(process.argv[2]),target=path.join(ROOT,'src/engine/book.js');
 const source=replaceSupplement(fs.readFileSync(target,'utf8'),lines,process.argv.includes('--replace-supplement'));
 fs.writeFileSync(target,source);fs.writeFileSync(path.join(ROOT,'index.html'),require('./build.cjs')());console.log('Imported',lines.length,'legally validated lines');
}
module.exports={readSupplement,replaceSupplement};
