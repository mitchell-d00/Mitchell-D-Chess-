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
