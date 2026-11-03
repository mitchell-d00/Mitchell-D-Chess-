# MIT neural upgrade validation

Baseline: release `e7fd21ab8ff72b8be960a8c9c590ad843b702fca`, Level 50.
Candidate: Level 65, original Mitchell search with the MIT Leorik 128-neuron
network and this project's incremental inference and SIMD kernel.

## Licensing and distribution

`LICENSE` remains byte-for-byte unchanged. The HTML visibly includes the original
Mitchell copyright and full MIT text plus Thomas Jahn's MIT network notice.
`third-party/README.md` pins the model's source revision, size and SHA-256.
No GPL code, binaries, libraries or neural weights are distributed. The WASM
module is original code compiled from `engine/nnue.wat`, has no imports, and is
405 bytes. Its compiled bytes and the entire network are embedded in `index.html`.
Only that HTML is needed to play, including offline.

## Matches

Books were disabled. Colours and opening positions were paired. Every move was
checked for legality, and unfinished games would be marked `*`, not draws.
Budgets are hard maxima; engines may finish early. Recorded times include search
setup and may differ even when their allocations match. These runs use Node
v24.22.1 in a shared Linux cloud environment.

| Opponent | Budget per move | Candidate result |
| --- | --- | --- |
| Previous Level 50, before staged hash ordering | 100 ms | 10 wins, 2 draws: **11/12** |
| Previous Level 50, before staged hash ordering | 1,000 ms | 4 wins: **4/4** |
| Previous Level 50, final staged hash ordering | 100 ms | **10 wins, 1 draw, 1 unfinished** |
| Native Stockfish 19, 1 thread, 32 MB hash (before staged ordering) | 500 ms | 2 losses: **0/2** |

The 100 ms paired results and all moves are in
`neural/vs-level50-100ms.json`. The longer-budget results are in `neural/vs-level50-1000ms-pre-staging.json`.
The final staged-ordering match is in `neural/vs-level50-100ms-final.json`: it
scored 10½/11 completed games. One game hit the 240-ply limit with the neural
side holding queen and knight versus a lone king; it remains **unfinished**,
without awarding a win or draw. A separate continuation from that final FEN
ended in checkmate two plies later, but it is not counted in the original result. The native Stockfish executable is installed only in the
test workspace and is not part of this repository or the HTML.

Short-control wins are evidence of improvement over the baseline. They do not
establish a human FIDE rating or a 2500+ rating at 10–30 seconds per move. No rating
of Leorik's full native engine is transferred to this integration. Absolute GM
strength remains unverified and the UI labels the neural levels unrated.

## Provisional strength estimate

The informal working estimate for Level 65 is **approximately 2600 Elo**, with
a broad **2300–2800** range at its full 60-second budget on a modern desktop.
Confidence is low. This is an engineering guess based on the observed relative
gain and the trained evaluator, not a measured rating, a calibrated FIDE rating,
or a statistical confidence interval. The previous Level 50 has no established
absolute rating, so wins against it cannot anchor an absolute Elo estimate.

Verification of 2500+ play at 10–30 seconds per move still requires larger,
independent matches against suitably calibrated opponents under those controls.
Neither the full native Leorik rating nor Stockfish's rating transfers to this
integration. Keep the measured results above separate from this estimate.

## Whole-search performance

Four fixed positions, depth 9, books disabled; two runs of each implementation:

| Run | Previous Level 50 NPS | Neural NPS | Ratio |
| --- | --- | --- | --- |
| First | 85,575 | 196,765 | 2.30× |
| Repeat | 113,037 | 247,160 | 2.19× |

These first Node measurements predate staged hash ordering. The final staged
Node run recorded 266,128 NPS versus 124,009 NPS (**2.15×**).

The pre-staging neural search visited 68,256 nodes versus 187,593 with classical evaluation;
their evaluation scores cause different trees. Aggregate elapsed times were
347/276 ms for neural versus 2,192/1,660 ms for classical. These are processed
nodes per second on this host, not a guarantee for every device or position.
The WASM path requires SIMD support; the pure JavaScript fallback is slower.
Raw JSONL records are under `neural/`. These Node runs met the 2× throughput
target on this benchmark. Initial browser runs before staged hash ordering showed
only 1.11–1.75× higher NPS. With staged hash ordering, repeated Chromium worker
runs measured:

| Run | Previous NPS | Neural NPS | Ratio |
| --- | --- | --- | --- |
| First | 179,378 | 358,627 | 2.00× |
| Repeat | 190,954 | 351,189 | 1.84× |

Each staged neural run searched 88,043 nodes; elapsed times were 245.5/250.7 ms
versus 1,045.8/982.4 ms for classical. Shared-host load and engine warmup affect
these numbers. This is approximately a 2× gain here, not a universal 2–5× guarantee.
`node scripts/browser-bench.cjs /tmp/level50.html` reproduces this measurement.

A 20-second-budget analysis of Kiwipete (before staged ordering) completed depth
16 and 4,592,973 nodes in 13.5 seconds with neural evaluation, versus depth 13 and
2,395,670 nodes in 17.3 seconds with the previous Level 50. Both chose `e2a6`.
This checks long-search operation, not an absolute strength rating.

## Correctness and UI

- The source template, model and kernel reproduce the embedded payload exactly.
- Standard perft, check evasion, mate, underpromotion, KPK, timeout, opening-book
  legality and transposition tests pass.
- **2,777** checks compare incremental versus freshly rebuilt accumulators,
  including captures, castling, en passant, capture/noncapture promotions,
  null moves and complete unmake sequences. Arrays and scores agree exactly.
- The SIMD and JavaScript implementations agree exactly. Tests also load the
  engine with `WebAssembly` absent and check its fallback scores.
- **250 independently computed NumPy reference positions** agree with the raw
  network scores. The fixture positions are generated by original deterministic
  legal random walks, not copied from an external dataset.
- All first 50 level presets are identical to the previous release.
- Offline Chromium test passes for 65 selectable levels, all 38 lessons, legal
  neural worker moves, UI heartbeat during search, cancellation, opening-book
  initialization, computer-vs-computer, worker creation failure, and both visible
  MIT notices. Runtime HTTP requests are blocked and none occur.
- Direct `file://` navigation remains blocked by this test environment's browser
  administrator policy; browser testing serves the HTML from memory and then
  disables connectivity. No production server is required.

Commands:

```sh
node scripts/test.cjs
node scripts/test-neural.cjs
node scripts/browser-test.cjs
node scripts/bench.cjs index.html 9 nnue
node scripts/match.cjs --baseline /tmp/level50.html --level 65 --baseline-level 50 --games 12 --ms 100 --out neural-results.json
```
