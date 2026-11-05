// Verify archived hashes and replay every move; Fastchess remains the referee.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const E=require('./engine.cjs')(),T=require('../ui/position-tools.js')(E),root=process.argv[2];
if(!root)throw Error('Provide archive directory');
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'snapshot.json'),'utf8'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const [name,hash] of Object.entries(snapshot.files))assert.equal(sha(fs.readFileSync(path.join(root,name))),hash,name);
for(const [name,hash] of Object.entries(snapshot.uncompressedLogs))assert.equal(sha(zlib.gunzipSync(fs.readFileSync(path.join(root,name+'.gz')))),hash,name);
let games=0,plies=0;
for(const name of fs.readdirSync(root).filter(x=>x.endsWith('.pgn'))){
 for(const block of fs.readFileSync(path.join(root,name),'utf8').split(/(?=^\[Event )/m).filter(x=>x.trim())){
  const record=T.parsePgn(block);assert.notEqual(record.result,'*');games++;plies+=record.moves.length;
 }
}
assert.equal(games,snapshot.completedGames);
if(snapshot.complete)assert.equal(games,snapshot.plannedGames);
console.log('PASS: archive SHA-256s, lossless logs and '+games+' legal PGNs ('+plies+' half-moves); complete='+snapshot.complete);
