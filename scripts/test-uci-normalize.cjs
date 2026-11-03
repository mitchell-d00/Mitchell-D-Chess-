const assert=require('node:assert/strict'),{normalize}=require('./uci-normalize.cjs');
for(const [input,expected] of [
 ['bestmove a7a8Q','bestmove a7a8q'],
 ['bestmove e2e1N ponder b7b8R','bestmove e2e1n ponder b7b8r'],
 ['info depth 6 score cp 20 pv a7a8Q h2h1B','info depth 6 score cp 20 pv a7a8q h2h1b'],
 ['info string a7a8Q pv b7b8Q','info string a7a8Q pv b7b8Q'],
 ['info depth 7 currmove a7a8R','info depth 7 currmove a7a8r'],
 ['id name Engine Q','id name Engine Q'],
 ['bestmove A7A8Q','bestmove A7A8Q'],
 ['bestmove a7a8K','bestmove a7a8K'],
 ['bestmove a7a8q','bestmove a7a8q'],
 ['bestmove e2e4','bestmove e2e4'],
 ['bestmove (none)','bestmove (none)']
])assert.equal(normalize(input).line,expected);
const E=require('./engine.cjs')(),p=new E.Chess('8/P4pk1/6p1/3Bn3/4P3/4q2P/2p4P/Q6K w - - 0 35');
assert(p.findUci(normalize('bestmove a7a8Q').line.split(' ')[1]));
assert.equal(normalize('bestmove a7a8Q').changes[0].before,'a7a8Q');
console.log('PASS: promotion spelling, ponder/PV fields, untouched identifiers/strings, invalid tokens and saved forfeit position');
