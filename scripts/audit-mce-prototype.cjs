// Original MIT diagnostic gate for the submitted v1.1 prototype; not a rating test.
// node scripts/audit-mce-prototype.cjs prototype.js [audit.json]
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2];if(!file)throw Error('Supply the submitted JavaScript source');
const sandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox,{timeout:1000});
const M=sandbox.module.exports,E=require('./engine.cjs')(),square=s=>'abcdefgh'[s&7]+((s>>3)+1),uci=m=>square(m.from)+square(m.to);
const kings='4k3/8/8/8/8/8/8/4K3 w - - 0 1',pinned='4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1';
const kingMoves=M.generateMoves(new M.Board(kings)),legal=new E.Chess(kings).legalMoves();
const q=new E.Chess(pinned),illegal=Array.from(M.generateMoves(new M.Board(pinned)),uci).filter(u=>!q.findUci(u));
const near=M.evaluate(new M.Board('4k3/8/8/8/8/8/5n2/4K3 w - - 0 1'),60),far=M.evaluate(new M.Board('4k3/8/5n2/8/8/8/8/4K3 w - - 0 1'),60);
const result={prototype:M.version,eligibleForMatch:kingMoves.length===legal.length&&!illegal.length&&near<=far,kingsOnly:{generated:kingMoves.length,legalExpected:legal.length},pinnedKnight:{illegalMoves:illegal},kingPressure:{near,far,rewardsEnemyNearOwnKing:near>far},decision:'Use existing legal Mitchell engine; prototype is input evidence only and is not loaded by the game.'};
const text=JSON.stringify(result,null,2)+'\n';if(process.argv[3])fs.writeFileSync(process.argv[3],text);process.stdout.write(text);
