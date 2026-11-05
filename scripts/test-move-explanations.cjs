const assert = require('node:assert/strict');
const E = require('./engine.cjs')();
const explain = require('../ui/move-explanations.js')(E).describe;
const cases = [
  [new E.Chess().fen(), 'g1f3', /develops the knight.*centre/],
  [new E.Chess().fen(), 'e2e4', /pawn in the centre/],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1', /castles/],
  ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'e5d6', /en passant/],
  ['8/P7/4k3/8/8/8/8/4K3 w - - 0 1', 'a7a8n', /promotes.*knight/],
  ['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'd1d8', /delivers checkmate/],
  ['r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'b5c7', /attacks the rook on a8 and king on e8/],
  ['4k3/8/8/8/8/8/4q3/4R1K1 w - - 0 1', 'e1e2', /captures the queen on e2/],
  // A blocker prevents the rook attacking the queen; no invented fork.
  ['4k3/q7/8/p7/8/8/8/4R2K w - - 0 1', 'e1a1', /open file|moves the rook/]
];
for (const [fen, move, expected] of cases) {
  const chess = new E.Chess(fen), before = chess.fen();
  const detail = explain(fen, move);
  assert(detail, move); assert.match(detail.text, expected);
  assert.equal(chess.fen(), before, 'Explanations must not mutate a game');
}
assert.equal(explain(new E.Chess().fen(), 'e2e5'), null);
assert.doesNotMatch(explain(cases.at(-1)[0], 'e1a1').text, /attacks.*queen/);
console.log('PASS: factual development, centre, castling, en passant, underpromotion, mate, fork, capture and blocked-ray cues; illegal moves rejected');
