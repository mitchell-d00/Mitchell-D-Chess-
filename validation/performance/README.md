# Expanded NNUE kernel: measurements and limits

The original MIT kernel grows from **405 to 1,206 bytes**. It now handles a whole
move transition in one boundary crossing, fuses ordinary feature deltas and
parent copying, and scores resident accumulator frames. Captures, en passant,
promotions, castling and null moves are supported. A fixed 256-frame cache avoids
unbounded per-position WASM allocations. JS copies preserve correctness when
positions or backends switch; scalar-only browsers remain supported.

The model is unchanged. Tests compare incremental/rebuilt, scalar/SIMD and
independent reference scores, interleaved positions, sibling reuse, 200 null
frames, unavailable SIMD, and 16/256-hidden memory sizing. Fixed-depth benchmark
scores **and node counts match** the baseline in every case. There is no trained
model change or claimed Elo gain.

## Recorded results

Baseline: main `762c8ae`. Candidate: expanded kernel and resident-frame JS path.
Both use neural evaluation and the same four positions. The final runs were
collected after the Stockfish screening finished, with no match competing for CPU.
This remains shared hardware, not a calibrated lab or a cross-device guarantee.

| Median metric | Baseline | Candidate | Ratio |
| --- | ---: | ---: | ---: |
| Chromium worker NNUE evaluations/second | 4,031,919 | 4,821,698 | 1.196× |
| Chromium worker depth-12 search NPS | 584,462 | 602,771 | 1.031× |
| Chromium worker scalar evaluations/second | 787,208 | 811,153 | 1.030× |
| Node VM depth-11 search NPS | 444,893 | 444,802 | 1.000× |
| Node VM NNUE evaluations/second | 3,510,760 | 3,910,743 | 1.114× |

Raw alternating runs, cases, counts, checksums, timings, runtime and input hashes:
[browser.json](browser.json) (seven repeats per variant) and
[node.json](node.json) (five). Node's cross-context scalar path was roughly 3%
slower; absolute Node VM scalar numbers do not describe browser performance.
Small NPS changes are within ordinary host variability; these measurements do
**not** demonstrate a large whole-engine speedup or meet the former 2–5× target.

Each browser sample uses a fresh Worker and warmed evaluator. The search clears
TT context before each case so repeated cache hits do not shrink the benchmark.
Order alternates baseline/candidate, then candidate/baseline. The microbenchmark
replays a fixed legal walk and verifies score checksums. Source scripts are in
`scripts/browser-performance.cjs` and `scripts/compare-performance.cjs`.

```sh
git show 762c8ae:index.html > /tmp/baseline.html
node scripts/browser-performance.cjs /tmp/baseline.html 7 12 > browser.json
node scripts/compare-performance.cjs /tmp/baseline.html 5 11 > node.json
```

Only engine code is executed in these comparisons; small later UI/documentation
edits change the complete HTML hash without changing the measured engine.

## Clock allocation and multiple cores

Browser clock allocation now reserves scheduling time, uses the actual remaining
per-move time and delay, and shortens a conservative planning horizon later in a
game. It does not reset clocks, change beginner blunder settings or change the
UCI fixed-movetime protocol. This heuristic is tested for bounds and continuity;
no strength gain is asserted.

A multiworker search pool is intentionally deferred. Independent workers would
duplicate large TTs and NNUE state, increase battery use and require robust
cancellation and score selection. A shared-TT design adds isolation-header and
offline-file complications. Single-worker fallback/responsiveness are preserved;
parallel search should be a separate measured experiment, not assumed faster.
