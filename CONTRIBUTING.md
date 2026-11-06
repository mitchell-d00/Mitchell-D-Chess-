# Contributing

Players only need `index.html`. Opening or saving that file requires no package
installation, network, server or build step.

## Edit and build

Use Node.js 22+ and Python 3. The ordinary build has no third-party dependencies:

```sh
node scripts/build.cjs
node scripts/build.cjs --check
node scripts/check-size.cjs
```

Edit `src/index.template.html`, `src/styles.css`, the ordered engine/app modules
listed in `src/build.json`, the helpers in `ui/`, or `src/lessons.js`. The build
concatenates the private engine scope and application scope in their existing
order; it does not load modules in the browser. Commit sources and regenerated
`index.html` together. Do not edit the release artifact directly.

The pinned MIT network is in `third-party/leorik-128.nnue`; its hash and full
Leorik attribution are retained. Kernel source is `engine/nnue.wat`; inference is
`engine/nnue.js`. To change/recompile the kernel or run browser checks:

```sh
npm ci
npm run build:kernel
npm run build
npm run test:all
```

Install Chromium with `npx playwright install --with-deps chromium` and set
`CHROMIUM_PATH` to `node -p 'require("playwright").chromium.executablePath()'`.
The browser tests serve the checked-in HTML from memory and disable page network
access. Playwright and WABT are development tools, not game runtime dependencies.

## Tests and evidence

Use a focused `scripts/test-*.cjs` for engine/data invariants and a
`scripts/browser-*-test.cjs` for a player flow. Add it to `scripts/checks.cjs`.
Test actual behavior, including cancellation and failure cases where relevant.
Run the applicable suite and `git diff --check` before submitting. CI checks
build reproducibility, the compiled kernel, attribution and raw/gzip size budgets
on pushes and pull requests.

External opponents and match managers must be installed separately. Never add
their executables, code or weights to the HTML or this repository. Freeze inputs,
time controls and hashes before a strength run; retain all games, identify
forfeits, and separate incomplete runs from completed evidence. Do not infer Elo
from a few wins or copy an opponent's published rating onto Mitchell.

Describe changes, checks, limitations and the next action in `HANDOFF.md`.

For comparisons using actual browser clocks, use
`node scripts/browser-level-match.cjs --out /path/to/new-empty-directory`.
The default is 20 colour-paired level-65/51 games at 60+1 with Standard personas.
See [the browser-match protocol](validation/levels/BROWSER-MATCH-PROTOCOL.md).
The runner snapshots the release and its own source; PGNs, per-move clock/search
traces, failures and input hashes are retained. Use
`node scripts/verify-level-match.cjs /path/to/archive` to recount a completed run,
and `node scripts/report-level-match.cjs /path/to/archive` to render its report.
CI audits frozen evidence; it does not rerun the lengthy clocked matches.

## Full WASM engine

The release embeds the original full C++/SIMD engine by default for levels
51–65, with automatic JavaScript fallback. It has a dedicated compilation CI
job and parity/browser gates. See
[engine/wasm/README.md](engine/wasm/README.md) for LLVM 19 build instructions.
`npm run test:wasm` checks the compiled core; `MITCHELL_TEST_HTML` points browser
checks at an alternate artifact without replacing the public `index.html`.
The ordinary `node scripts/build.cjs` produces the WASM-enabled release.
For a JavaScript-only diagnostic build, use
`node scripts/build.cjs --javascript --output /tmp/mitchell-js.html`.
The existing `--candidate-wasm --output ...` form still creates a labelled
experimental artifact. Players need none of these development tools.

To reproduce a paired experiment, build baseline and candidate HTML from their
recorded revisions in separate checkouts, then freeze a new run:

```sh
python3 scripts/prepare-wasm-match.py \
  --baseline-html /path/to/baseline.html --baseline-revision <baseline-commit> \
  --candidate-html /path/to/candidate.html --revision <candidate-commit> \
  --out /path/to/new-empty-run --fastchess /path/to/fastchess \
  --games 40 --move-seconds 0.1
python3 /path/to/new-empty-run/runner.py /path/to/new-empty-run/campaign.json
python3 scripts/archive-benchmark.py /path/to/new-empty-run/campaign.json /path/to/new-archive
node scripts/verify-evidence.cjs /path/to/new-archive
```

Both players must use WASM, share the frozen adapter and 32 MiB WASM setting,
and receive colour-reversed openings and equal time controls. Failed backends
stop the campaign. All results and forfeits are retained. The short control
measures relative behavior; it does not establish absolute Elo.

## Independent strength measurements

`npm run strength:prepare -- ...` freezes independent-opponent runs. WASM
revisions automatically require their native backend and record the embedded
core/network identity, rather than counting silent fallback as WASM evidence.
`npm run strength:report -- /path/to/archive --output results.md` verifies hashes,
replays every PGN and recomputes results before reporting. `--json` produces a
machine-readable report with absolute rating left unset. The reporter does not
execute archived code, transfer opponent ratings or combine incompatible runs.
See [the complete protocol](validation/strength/PROTOCOL.md) for setup, runtime
variables, resumable runs, full 200-game preparation and archival commands.

## Level progression

`node scripts/test-level-progression.cjs` checks all 65 presets and legal moves;
`node scripts/audit-levels.cjs [index.html]` exports settings and effective clock
budgets. `scripts/prepare-level-matches.py` freezes colour-paired level matches
with per-level backend assertions. See [the level audit](validation/levels/README.md)
for the complete ladder screening, unresolved neighbours and repeat commands.
Increasing resources are an invariant; statistically increasing playing strength
requires match evidence. Preserve unsuccessful games when changing the ladder.

## Clock-aware play

The shared allocator lives in `src/app/time-management.js`; app dispatch adds
queue-deadline checks and learns excess round-trip time without modifying the
engine or clocks. Run `scripts/test-time-management.cjs` for all-level long-game
stress and `scripts/browser-level-clocks-test.cjs` for actual worker/UI wiring.
Optional real 1+0 browser games and all outcomes are described in
[clock-aware validation](validation/clock-aware/README.md). Keep model-based
stress results separate from chess-game evidence and absolute strength claims.

## Computer interruption reports

`scripts/browser-engine-recovery-test.cjs` uses real workers with injected faults
and checks timeout/crash recovery, strict invalid input, bounded retry, timer
cleanup and official flag timing. `scripts/test-user-knight-ending.cjs` replays
the supplied game and verifies frozen diagnostic evidence. The optional
`scripts/reproduce-user-ending.cjs --out /new/empty/directory` continues the
reported position with its full history. Keep interrupted/partial runs labelled;
[the report](validation/user-reports/2026-11-06-knight-ending/README.md) documents
why its original timeout remains unconfirmed and which PGN timings to inspect.

## AI draw-claim decisions

`src/app/ai-draw-claims.js` makes a pure, reversible current/intended claim
check from the current player's returned score. Do not use the previous
opponent's displayed evaluation. Run `scripts/test-ai-draw-claims.cjs` and
`scripts/browser-ai-draw-claims-test.cjs`; `scripts/reproduce-draw-claim.cjs`
provides the one-turn historical comparison. The supplied rook-game evidence
explains why a legal optional claim was missed without changing its actual result.

## Playing styles

`src/engine/personality.js` defines bounded optional preferences. The WASM
`personality.inc` is generated from that canonical JS function; rebuild the core
with LLVM 19 when changing it, then regenerate `index.html`. Test active styles
and switching back to zero: native and JavaScript TTs must never reuse scores
from a different style. `scripts/test-personas.cjs` checks cross-backend values,
searches and all 65 timed presets; `scripts/browser-personas-test.cjs` checks the
offline UI, workers, clocks, saves and PGN. `scripts/probe-personas.cjs` emits a
repeatable fixed-depth illustration, not rating evidence.

Keep historical match artifacts immutable. `engine/wasm/release.json` records the
new binary and its link to the previous match-tested binary; Standard parity is
recorded separately in `validation/personas/`. New personalities need their own
matches before any strength comparisons. See that folder's README for repeating
the before/after comparison and its limits.
