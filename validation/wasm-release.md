> November 6 personality extension: the current binary now includes an opt-in
> style API. The rollout and match results below describe the earlier binary.
> [Current identity, Standard parity and persona checks](personas/README.md)
> distinguish the extension from those historical strength results.

# Full Mitchell WASM release

The user authorized publishing the tested upgrade now and measuring its rating
later. This supersedes the earlier requirement to hold the candidate off main
until a particular absolute strength was demonstrated. **The engine remains
unrated.** No 2500+, 3000+ or FIDE rating is claimed.

## Player behaviour

- Levels 51–65 use the full Mitchell C++/SIMD WASM search/evaluation core inside
  the existing Web Worker. Levels 1–50 retain their existing JavaScript behaviour.
- The credited MIT Leorik128 weights are unchanged. No new network was trained.
- Unsupported WASM/SIMD, compilation or runtime failures use the existing
  JavaScript engine in the worker. The UI thread never takes over search.
- One self-contained index.html remains sufficient, offline and without runtime
  downloads, accounts, advertisements or installation. All 65 levels, 38 lessons,
  modes, clocks, official rules, analysis and customization remain available.
- Default WASM memory is 32 MiB. The 64 MiB setting is a developer option;
  browser/JavaScript overhead is additional. MIT notices and full credits remain.

The embedded 55,357-byte core is exactly the match-tested binary, SHA-256
`4b399f6260d3aec814b1cb279920eb5e7f99046b4766b7d6a8461a3a3b26e5f0`.
The release changes dispatch/build defaults and player documentation, not the
native search algorithm, evaluation, neural weights or disabled endgame flag.

## Evidence and release checks

The enhanced core scored 20W/15D/5L against the first WASM core in 40 games at
0.1 seconds/move, without forfeits. Equal-memory, identical-tree measurements on
the recorded host showed 1.399x Chromium-worker and 1.540x Node throughput.
These are relative short-control/local performance results, not absolute Elo.
See [the frozen evolution report](wasm-port/evolution/README.md); its original
PGNs, hashes and measurements are preserved.

Release checks passed locally:

- 20 core commands, including native dispatch at neural level boundaries and
  retention of beginner/classical routing, exact match-tested binary, input
  errors, deterministic build, size budget, model/MIT notices and all archived
  200-game evidence.
- 6,013 engine cases plus preparation integration and two complete 40-game
  archive verifications.
- Eight browser suites, including actual WASM use through the application's
  normal worker, 32/64 MiB memory, unavailable/failed WASM fallback, offline play,
  cancellation, clocks, pause/resume, lessons, imports/review, accessibility and
  mobile/tablet touch layouts.

Raw local results are in [wasm-release-checks/](wasm-release-checks/).
index.html is 643,421 bytes raw and 246,561 bytes gzip. The explicit release
budget is 700 KiB raw / 256 KiB gzip; experimental builds retain their separate
768 KiB / 320 KiB budget.

## Build and repeat

```sh
node scripts/build.cjs
node scripts/build.cjs --check
npm test
npm run test:wasm
npm run test:browser
```

The ordinary build embeds WASM and preserves the normal game title and feature
list. `--javascript --output /tmp/mitchell-js.html` creates a diagnostic JS-only
build. `--candidate-wasm --output /tmp/mitchell-candidate.html` creates an
experimental labelled artifact. Both alternate forms require an explicit output.
LLVM is only needed to recompile the core, not to assemble or play the release.
CI verifies the checked-in release and separately compiles/tests the full core.
