# Mitchell WASM SIMD evolution — November 5, 2026

The enhanced experimental candidate completed **20 wins, 15 draws and 5 losses**
against the first full-WASM version: **68.75%**, zero forfeits. This is a
40-game relative comparison at **0.1 seconds per move**, not an absolute Elo or
normal-time rating. The public default remains JavaScript/NNUE.

## Implementation and correctness

Original SIMD memory clearing/copying replaces byte-at-a-time operations in the
freestanding core. Fused NNUE transitions read the previous frame and feature
deltas together and write the target once. Captures, en passant, promotions,
castling, null moves and wrapping 16-bit accumulation retain their original
meaning. Search rules, evaluation, network and default memory are unchanged.

- 5,476 differential checks: perft, ordered moves, full hashes, SEE, every eval
  mode, neural references, special moves, repetition, exact fixed-depth search
  trees and timeout restoration.
- 524 scalar-reference checks with full-range synthetic weights at widths
  16/24/128/256, delayed accumulator updates, special moves and full unmake.
- 13 sparse-endgame fixtures, including stalemate, dead positions and checkmate
  precedence over fifty-move claims. This optional experiment remains **off**.
- All seven existing offline browser suites passed; [browser-checks.json](browser-checks.json)
  contains their full outputs. Four additional dedicated worker scenarios passed:
  native 32/64 MiB, no WASM, and deliberately failed WASM compilation.
- A preparation integration test verifies frozen inputs, required native backend,
  matching networks, and rejection of changed models or existing output folders.

See [correctness.txt](correctness.txt). The network remains Thomas Jahn's credited
MIT Leorik128 model, SHA-256
`794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704`.
No new training or neural model change is claimed.

## Throughput

Both engines use the same four documented positions, depth 11, cold TT per
position and equal 32 MiB WASM memory / 19-bit TT. Warm engines alternate order;
each comparison requires identical scores, moves and node counts.

| Runtime | Repeats | First WASM median NPS | Enhanced median NPS | Speedup |
| --- | ---: | ---: | ---: | ---: |
| Node v24.22.1 | 7 | 1,024,956 | 1,578,370 | 1.540× |
| Chromium 155.0.8059.79 workers | 5 | 1,044,623 | 1,461,207 | 1.399× |

Raw samples: [node-throughput.json](node-throughput.json) and
[browser-throughput.json](browser-throughput.json). Browser runs use fresh
workers, each with two whole-suite warmups. Timings include search/reset and
exclude FEN loading and explicit TT clearing. Measurements finished before the
new match started. These are local four-position measurements; different
hardware, browser versions and positions can give different gains.

A deferred hash-move generation experiment passed the existing differential
suite but measured only 0.940× baseline throughput. It was removed. Its
[measurements](rejected-hash-throughput.json) and [source patch](rejected-hash.patch)
are retained so the rejected trial is not silently omitted.

## Frozen match

See [match-40/](match-40/) for all PGNs, complete compressed referee logs,
commands, adapters, runner, preparation script, recovery state, hashes and
machine-readable results. All **5,934 half-moves** replayed legally.

- Candidate artifact/adapter revision: `7144e46`; core change: `e6023b0`.
- Baseline build revision: `dd1714a`. Both are explicit full-WASM builds.
- Identical frozen UCI adapter, same credited 128-hidden network, one search
  thread, 32 MiB WASM memory and 19-bit TT for each player.
- Nominal 100ms/move, 20ms engine overhead reservation, equal 250ms scheduling
  grace. Actual times and nodes are in PGN. One game at a time on the recorded
  shared host. Light protocol/build checks ran concurrently; no competing match
  or throughput benchmark ran during this experiment.
- First 20 existing EPD openings, each with colours reversed. No books,
  pondering, external tablebases, evaluation adjudication or arbitrary move-limit
  draws. Both retain embedded KPK. No completed games discarded.
- Both players require actual WASM results; fallback faults stop the campaign.
- Descriptive 95% paired bootstrap score interval: **56.25%–80%**, resampling
  whole colour-reversed pairs. A small single-host sample cannot establish a
  hardware-independent gain or absolute rating.

The earlier first-WASM-vs-JS run is archived separately at
[v1-vs-js-40](../v1-vs-js-40/): 20W/19D/1L at the same short control, zero
forfeits. Its TT capacities differ between JS and WASM; do not combine the two
experiments or add their relative Elo differences to infer an absolute rating.

## Repeat and continue

Players need only the resulting HTML; Node and LLVM are development tools.
The final candidate is 643,122 bytes raw / 246,445 bytes gzip, with a 55,357-byte
embedded core. Default WASM memory is 32 MiB, optional developer setting 64 MiB;
browser/JS overhead is additional. The candidate build enforces 768 KiB raw /
320 KiB gzip limits and never overwrites index.html implicitly.

To reproduce the match inputs, build the two declared revisions in separate
checkouts with `node scripts/build.cjs --candidate-wasm --output /path/to/file.html`.
Their checked-in WASM cores can be used directly; recompilation requires LLVM 19.
Use [the portable preparation/archival commands](../../../CONTRIBUTING.md#experimental-full-wasm-engine)
with those revisions, 40 games and 0.1 seconds/move. The protocol is repeatable;
time-based searches need not produce identical game outcomes on another host.

```sh
npm run test:wasm
node scripts/verify-evidence.cjs validation/wasm-port/evolution/match-40
node scripts/compare-wasm.cjs /path/to/baseline.wasm engine/wasm/mitchell.wasm 7 11
MITCHELL_TEST_HTML=/path/to/candidate.html node scripts/browser-wasm-performance.cjs /path/to/baseline.html 5 11
```

[status.json](status.json) identifies the artifact and engine hashes. The final
build adds the completed-benchmark Guide text from main; its engine source is
byte-identical to the frozen match artifact. The strength gate for public
replacement remains unmet. Next work should separately measure search changes,
network alternatives, loss regressions and longer-control independent opponents.
