# Level 65 versus 51: actual browser clocks

This protocol compares the two Standard presets at **60 seconds + 1 second per
move**, matching the user's November 6 example. Both use the current Mitchell
WASM/NNUE engine. This is a comparison of difficulty presets and their clock
policies, not a match against an independently rated engine or an absolute Elo
measurement. No engine, weight, level or clock-policy changes are made for it.

Twenty games use ten prescribed openings from the project's existing book:
Ruy Lopez, Italian, Open Sicilian, French Tarrasch, Caro-Kann Advance, Queen's
Gambit Declined, Slav, King's Indian, English Four Knights and Nimzo-Larsen.
Each opening is played twice, with the levels reversing colours. Both sides
have ten Whites and ten Blacks. The eight opening half-moves are replayed with
full history, but neither charged time nor increment. Both clocks start at 60
seconds after that prefix. Book play remains enabled normally thereafter.
The initial unclocked prefix is identified in PGN headers and has no invented
clock readings.

The actual app selects moves in its worker, assigns search allowances, applies
increment, handles recovery, and determines results. Browser-side wrappers only
record move/reply diagnostics. Personas are disabled. Casual rules and Fast
viewing speed match the user's game; ordinary threefold/fifty-move draws and
dead positions end games normally. There is no extra move-limit, score-based or
material-based adjudication. Flag falls count. An administrative wall timeout
retains an incomplete game rather than manufacturing a result.

Two headless Chromium pages run concurrently on the same host. Background timer
and renderer throttling are disabled, and each page goes offline after loading
the frozen single-file HTML. The native worker is warmed before clocks start.
The run records browser/Node versions, CPU quota, HTML/engine/runner hashes,
prescribed openings, every PGN and a per-move JSONL trace. Trace fields include
remaining clocks, actual backend, allowance, search budget, depth, nodes,
evaluation and recovery. All results, failures, activity and recoveries remain
in the archive. Console progress is supplementary to the archived records.

Book randomness and wall-clock search cutoffs are not seeded: the procedure is
repeatable, but identical moves/results are not promised. Shared-host timing
and a 20-game sample limit conclusions. The earlier two-game, two-second runner
smoke test is excluded from this campaign.

## Run

Development requirements are Node.js, the repository's optional Playwright
dependency and Chromium. Players still only need index.html.

```sh
npm ci
# Or use an existing Chromium via CHROMIUM_PATH.
npx playwright install chromium
export CHROMIUM_PATH="$(node -p 'require("playwright").chromium.executablePath()')"
node scripts/browser-level-match.cjs --out /path/to/new-empty-directory \
  --games 20 --seconds 60 --increment 1 --concurrency 2
node scripts/verify-level-match.cjs /path/to/new-empty-directory
```

The runner refuses to overwrite an output directory. It snapshots the HTML,
runner, loader and PGN tools before the match. Repeat an archived artifact by
passing `--html /path/to/archive/engine-under-test.html`. The archived runner
also works from its repository archive location with the same arguments; give
it an explicit `--html` path. `--concurrency 1` is available for a slower serial
run, and must be reported as a different protocol condition.

`protocol.json` freezes settings and inputs. `progress.json` reports live
progress. `01.pgn`/`01.json`/`01.jsonl` through `20.*` contain each game.
`summary.json` identifies complete/incomplete status and hashes the input and
output files. The verifier checks hashes, colour/opening pairing, legal moves,
earliest terminal positions, results, clocks/increments, backend routing,
recovery counts and independently recounts wins/draws/losses. CI should verify
completed archives statically; it should not rerun a lengthy timed campaign.
