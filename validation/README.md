# Historical classical validation record

This records the previous classical release (`e7fd21a`). For the current
neural upgrade, see [neural-upgrade.md](neural-upgrade.md).

Original opponent: repository commit `f3617994503541daa41ba44f5d0499df94767fe4`.
Node.js v24.22.1, Linux cloud execution environment. These are short regression
runs on shared hardware, not a rating list or proof of GM strength.

| Paired test | Hard budget per move | Upgrade result | Completed |
| --- | --- | --- | --- |
| Original Level 35, initial search/eval upgrade | 100 ms | 9 wins, 1 draw, 2 losses (9½/12) | 12/12 |
| Original Level 35, including KPK integration | 250 ms | 3 wins, 1 draw (3½/4) | 4/4 |
| Native Stockfish 19, one thread, 32 MB hash | 100 ms | 2 losses (0/2) | 2/2 |

Opening positions and colours were paired; neither side used a book. Both custom
engine sides used Level 35 with the same hard time override. In the 100 ms run,
the upgrade actually spent 64.4 s versus 57.4 s for the original across all games;
in the 250 ms run it spent 67.3 s versus 58.9 s. Its revised time management uses
more of the allocation. The raw files include every move, outcome, node totals,
actual elapsed times, and sampled labelled positions. The initial 100 ms run
predates the KPK integration. Labels/provenance reporting were subsequently
clarified without changing the search algorithms.

The native opponent was obtained separately from the official `sf_19` release,
`stockfish-linux-x86-64-universal`. Its executable, source and weights are **not**
part of this project or its HTML. A Stockfish.js CLI attempt did not complete
initialization in this environment; it contributed no results to these tables.

A single four-position depth-9 benchmark recorded:

| Engine | Nodes | Elapsed | NPS |
| --- | --- | --- | --- |
| Original | 199,455 | 1,927 ms | 103,499 |
| Upgrade | 187,593 | 2,029 ms | 92,438 |

The searches visit different trees and use different quiescence rules, so NPS
alone does not measure strength. This run does **not** meet the requested 2–5×
throughput increase. Earlier shallower runs favoured the upgrade; that was not
consistent at greater depth. Benchmark JSONL files preserve the individual cases.

The six-weight Texel-style tuning trial used 320 positions from the 100 ms games,
splitting by whole game. Training loss fell from 0.1049 to 0.0991, but held-out
loss rose from 0.0756 to 0.0975. The candidate was rejected. Default evaluation
weights remain hand chosen; they are not described as trained NNUE weights or a
fully tuned evaluation. Larger, diverse datasets and independent match runs are
still needed.

Passed checks:

- Perft: initial position depth 4 = 197,281; Kiwipete depth 3 = 97,862;
  rook/pawn endgame depth 4 = 43,238, including make/unmake round trips.
- Quiescence mate, fifty-move mate precedence, quiet check evasion, mating knight
  underpromotion, timeouts returning legal moves, all 454 book lines legal.
- KPK rook-pawn draws and winning protected pawns for both colours. Rebuilding
  the bitbase gives 165,676 legal states and 111,282 wins in 24,576 bytes.
- Offline Chromium: 50 selectable levels, 38 lessons, worker move legality,
  UI heartbeat during search, cancellation settlement, book initialization,
  computer-vs-computer, worker-creation failure without UI-thread fallback.
- All inline scripts parse; `git diff --check` passes.

The browser test serves the HTML from memory and disables network connectivity.
Direct `file://` navigation was blocked by the environment's administrator policy,
so file-origin behaviour was not verified here. No external runtime requests
occurred. Browser checks require Playwright/Chromium only as development tools.

At the time of these classical runs there was no calibrated absolute Elo, no
verified 2500+ result at 10–30 seconds per move, no trained NNUE, and no
multiworker/WASM acceleration in that release.
The evidence supports improvement over the original under these short budgets.
