# Original full-engine WASM candidate

This is a freestanding C++ port of Mitchell's existing MIT engine. It does not
link another chess engine, libc or a C++ runtime. The existing credited MIT
Leorik network and original KPK bits are copied into its memory at initialization.
Only `env.clock` is imported. The JavaScript engine remains the release default.

Build with LLVM/Clang 19 and wasm-ld (development tools only):

    WASM_CXX=clang++-19 WASM_LD=wasm-ld-19 node scripts/build-wasm-core.cjs
    node scripts/test-wasm-parity.cjs
    node scripts/build.cjs --candidate-wasm --output /tmp/mitchell-candidate.html

The candidate is one offline HTML file. The build requires an explicit output
so an experiment cannot silently overwrite index.html. Levels 51–65 use the full
port; lower levels keep existing accessibility settings. Unsupported WASM falls
back to JavaScript inside the worker. Default native memory is 32 MiB, with a
64 MiB developer setting matching the JS TT capacity. Memory never exceeds the
module's 64 MiB cap; this excludes browser/JS overhead.

`tables.inc` and `evaluation.inc` are generated from canonical Mitchell sources.
Differential tests cover rules, ordered moves, FEN/hash restoration, SEE, all eval
modes, NNUE references, special/null moves, exact fixed-depth trees in 64 MiB
mode, repetition and timeouts. Initial suite: 5,476 checks. Signed zero is compared
numerically. Preliminary timing is not a strength qualification.

The optional sparse-endgame experiment recognizes actual stalemate/dead positions
before leaf evaluation. It defaults off and requires separate regression and
match evidence. Browser/fallback, resource and equal-time match gates must pass
before a public backend change. No Elo or GM claim is made.

## SIMD evolution candidate

The next candidate uses original 128-bit SIMD memory clearing/copying and fused
NNUE transitions: the previous accumulator and all move feature deltas are read
in one pass and the new accumulator is written once. Search rules, evaluation,
network and default memory budget are unchanged. The scalar JavaScript fallback
and all MIT notices remain intact.

Run `npm run test:wasm` after building. In addition to 5,476 differential checks,
524 scalar-reference checks use full-range synthetic weights at hidden widths
16/24/128/256, including dirty frame chains and special moves. Thirteen sparse
endgame fixtures cover stalemate, dead positions and mate precedence; that
endgame experiment remains disabled by default.

Explicit browser acceptance, including unsupported/failed WASM compilation:

    MITCHELL_TEST_HTML=/tmp/mitchell-candidate.html node scripts/browser-wasm-test.cjs
    MITCHELL_TEST_HTML=/tmp/mitchell-candidate.html npm run test:browser

Compare two locally built cores/artifacts; both versions must be preserved:

    node scripts/compare-wasm.cjs /tmp/baseline.wasm engine/wasm/mitchell.wasm 7 11
    MITCHELL_TEST_HTML=/tmp/mitchell-candidate.html node scripts/browser-wasm-performance.cjs /tmp/baseline.html 5 11

Both benchmarks alternate warmed engines with identical TT capacity and require
identical nodes, moves and scores. The candidate build enforces the 768 KiB raw /
320 KiB gzip size budget. CI compiles and tests the candidate separately and
uploads the single HTML as an artifact; it does not deploy the candidate.

The first WASM version completed 40 paired games against the frozen JS engine:
**20 wins, 19 draws, 1 loss**, zero forfeits at 0.1 seconds/move. See
[the archived referee records](../../validation/wasm-port/v1-vs-js-40/).
This is relative short-control evidence, not an absolute rating.

The SIMD evolution then completed **20 wins, 15 draws, 5 losses** against that
first WASM version in another 40-game, 0.1-second/move paired experiment, zero
forfeits. It measured 1.399× same-tree browser throughput and 1.540× Node
throughput on the recorded host. See [the complete evolution report](../../validation/wasm-port/evolution/README.md)
for raw samples, all PGNs, qualifications and repeat commands. The public engine
has not been replaced, and the candidate remains unrated.
