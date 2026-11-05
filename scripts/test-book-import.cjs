const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {readSupplement,replaceSupplement}=require('./import-book.cjs'),root=fs.mkdtempSync(path.join(os.tmpdir(),'mitchell-book-'));
try{
 for(const file of ['a.tsv','b.tsv','c.tsv','d.tsv','e.tsv'])fs.writeFileSync(path.join(root,file),'eco\tname\tpgn\n');
 const file=path.join(root,'a.tsv');fs.appendFileSync(file,'C50\tQuiet test line\t1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6\n');
 const lines=readSupplement(root);assert.equal(lines.length,1);assert(lines[0].includes('e1g1'));
 const source=fs.readFileSync('src/engine/book.js','utf8');assert.throws(()=>replaceSupplement(source,lines,false),/Already imported/);
 const updated=replaceSupplement(source,lines,true);new vm.Script(updated);
 assert(updated.includes("'e2e4 e7e5 g1f3 b8c6 f1b5"),'Manual main lines retained');
 assert.equal((updated.match(/CC0 opening supplement/g)||[]).length,1);
 assert.throws(()=>replaceSupplement('missing',lines,true),/marker/);
 fs.appendFileSync(file,'C51\tBroken test line\t1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Zz Nf6\n');assert.throws(()=>readSupplement(root),/Invalid SAN/);
 console.log('PASS: legal CC0 import including castling, explicit replacement, manual-line preservation and malformed input rejection');
}finally{fs.rmSync(root,{recursive:true,force:true});}
