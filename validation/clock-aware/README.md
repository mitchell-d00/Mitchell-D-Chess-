# Clock-aware difficulty presets — November 6, 2026

All 65 levels now use a shared clock policy that adapts to a finite main clock,
future moves, remaining delay, increment and observed browser overhead.
Higher levels keep their evaluation/depth/noise settings and increasing shares
of the safe allowance. In emergencies, several presets can reach the same
minimum search budget. Untimed search limits are unchanged.

The previous clock fix removed viewing holds below ten seconds and charged
elapsed turn time before allocation. It still planned for as few as 18 future
moves and had no long-game bank or measured device margin. This update changes
the allocation itself:

- Keep a main-clock bank, bounded by 8% of the initial clock, 8 seconds, and 35%
  of the current balance. The minimum target is 500 ms where the balance allows.
- Plan for 56–72 future moves under comfortable clocks; extend that horizon
  smoothly as the main clock falls below 15 seconds and then 3 seconds.
- Leave a separate dispatch/rendering margin. Reduce search time when recent
  replies exceed their search allowance, and recover gradually after fast replies.
  The learned overhead estimate is bounded to 20–2,000 ms and resets with a new game.
- Use only the currently remaining delay and a conservative share of increment.
  Neither future increment nor a fresh delay is credited early. Per-move timers
  use the current move's remaining time without a future-game bank.
- Recheck the wall-clock allowance when the worker receives a queued request.
  Startup/queueing time cannot silently preserve a stale, larger search allowance.
- Display saving-time, time-trouble or emergency status beside the allowance.
  Completed moves retain the previous no-viewing-hold policy below ten seconds.

Clocks are never refunded, extended or paused for the computer. More conservative
search allocation can change move quality; this is a clock-management update,
not a claimed Elo or proven increase in strength. A clock controller cannot
make a finite no-increment game immune to flag falls.

## Checks

The engine script, native WASM binary and credited MIT network are unchanged.
Engine-source SHA-256 remains
`b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4`.
The release still consists of one offline HTML file; all searches use the worker.

`test-time-management.cjs` exercises all 65 presets through 200 synthetic own
moves at 60+0, with 20, 80 and 150 ms of non-search cost per move: **39,000
turns**, all retaining at least four seconds. These are model-based regression
checks, not chess games or measured device guarantees. For level 65 at 20 ms
cost, the previous allocator exhausted its clock on turn 114; the new allocator
retained about 8.1 seconds after turn 200. The model charges the entire search
allowance plus overhead, updates the learned margin, and uses the level shares.

The focused offline browser test verifies every preset's emergency policy,
actual UI allocation under different measured latencies, expired-turn guards,
no viewing hold, and a real queued worker request whose deadline has expired.
Increment, spent delay, side-specific clocks, per-move timing and overhead
spikes/recovery also have direct regression coverage.

## Repeat

```sh
node scripts/build.cjs --check
node scripts/test-time-management.cjs
node scripts/browser-level-clocks-test.cjs
node scripts/browser-clock-games.cjs --out /path/to/new-empty-directory
```

The last command runs two complete actual-browser games at 60+0, casual rules,
normal opening book and Fast speed, with levels 65/52 reversing colours.
There is no move-limit or score adjudication. Every PGN, flag fall and incomplete
run is retained, with per-move clocks, policy mode, allowance, observed overhead,
HTML/runner hashes and runtime identity. Games are offline after loading.
At most two games run simultaneously on the shared host. The script refuses
to overwrite existing evidence. Book choices and wall-clock searches vary, so
rerunning the experiment will not reproduce identical moves.

Baseline HTML: `edf20f74f3cdfc463832d2f0474fa7e97bddde89`.
Candidate HTML: `56d5895`. The experiment runner is separately frozen at
`d8de6b9`; later changes add tests/evidence/documentation only.
To repeat the baseline with the same runner, save `git show edf20f7:index.html`
to a separate file and set `MITCHELL_TEST_HTML=/path/to/baseline.html`.

## Saved browser results

All **eight games / 952 half-moves** replayed legally. Both versions had zero
flag falls in this sample. This does not demonstrate a lower flag rate; the
regression stress and actual near-empty-clock checks establish the new policy's
specific behavior. The games were different and ended at different lengths.

| Control / version | White / Black | Result | Ending | Plies | Level-65 remaining |
| --- | --- | --- | --- | ---: | ---: |
| 60+0 / previous | 65 / 52 | draw | Insufficient material | 194 | 1.781 s |
| 60+0 / previous | 52 / 65 | draw | Fifty-move rule | 216 | 1.801 s |
| 60+0 / candidate | 65 / 52 | draw | Threefold repetition | 109 | 34.656 s |
| 60+0 / candidate | 52 / 65 | draw | Threefold repetition | 34 | 52.289 s |
| 10+0 ending / previous | 65 / 52 | 1–0 | Checkmate | 83 | 3.369 s |
| 10+0 ending / previous | 52 / 65 | draw | Stalemate | 126 | 1.547 s |
| 10+0 ending / candidate | 65 / 52 | 1–0 | Checkmate | 53 | 8.354 s |
| 10+0 ending / candidate | 52 / 65 | draw | Threefold repetition | 137 | 6.153 s |

Neither control showed a match-score improvement. Do not pool these controls
or copy an opponent rating onto Mitchell. No tuning was performed against these
outcomes. Only lightweight editing ran during games; browser/throughput suites
were held until the games completed. The full **39-command core/browser suite**
then passed. It includes a real cold-worker legal move with 1.4 seconds left,
all-level emergency routing, and static verification of all retained archives.
The kernel/build/attribution and byte-size checks passed as part of that suite.

Evidence: [60+0 previous](before), [60+0 candidate](after),
[10+0 previous](ending-before), [10+0 candidate](ending-after),
[all-level synthetic comparison](allocator-stress.json),
[before resource audit](before-policy.json), [current audit](policy.json),
and [check records](checks). Earlier flagged browser games remain preserved
in [the previous clock report](../clock-management/README.md).
The allocator audit now reads each artifact's embedded allocator, rather than
applying the current allocator to historical HTML; fixtures include initial
clock balances and the default, untrained overhead estimate.

The 60+0 runs used runner `d8de6b9`; the optional short-position support and
ending experiments used runner `3e41627`. Both use the same frozen candidate
HTML from `56d5895`; later changes affect verification, tests and documentation.
To reproduce the ten-second rook ending:

```sh
MITCHELL_CLOCK_SECONDS=10 \
MITCHELL_CLOCK_FEN='8/1p4pk/4p2p/3pP3/3P1P2/2R3PK/7P/5r2 w - - 0 1' \
node scripts/browser-clock-games.cjs --out /path/to/new-ending-run

node scripts/verify-clock-games.cjs \
  validation/clock-aware/before validation/clock-aware/after \
  validation/clock-aware/ending-before validation/clock-aware/ending-after
```

The static checker validates manifests, result summaries, all legal moves,
monotone clock traces and any recorded timing metadata. It executes no archived
runner. Node 24.22.1 and Chromium 155.0.8059.79 were used for these eight games;
the complete platform and exact HTML/runner hashes are in each protocol.
