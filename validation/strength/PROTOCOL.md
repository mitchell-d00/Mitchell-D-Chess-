# Repeatable strength measurements

Strength runs are development tools. Players still need only the offline
index.html; no opponent engine or match manager is embedded or redistributed.

## Freeze a run

Install Node 22+, Python 3, external Fastchess and each external opponent
separately. Supply an opponents JSON mapping names to `command`, `options`,
source/version information and optional `additionalInputs` file-to-SHA256 pairs.
The latter pins separate opponent networks. All opponent command arguments and
options are retained. A non-secret runtime environment JSON can supply platform
libraries or .NET compatibility settings; never put credentials in this file.

Example entry, after replacing local paths with your installed files:

```json
{
  "Leorik3.1.3": {
    "command": "/path/to/Leorik-3.1.3",
    "options": ["option.Threads=1", "option.Hash=32"],
    "source": "https://github.com/lithander/Leorik/releases",
    "additionalInputs": {
      "/path/to/640HL-S-5288M-Tmix-Q5-v19.nnue": "01540ad378a157b47c1c29b6f2602f7ae10073ccdd538801395082d375e20d61"
    }
  }
}
```

Use the exact recorded release/model for that hash, or compute and document the
hash for the actual model you install. Do not substitute a differently named or
newer engine while retaining an older identity.

```sh
npm run strength:prepare -- --revision <commit> --out /path/to/new-empty-run \
  --fastchess /path/to/fastchess --opponents /path/to/opponents.json \
  --games-per-opponent 100 --move-seconds 1 --concurrency 1 \
  --purpose 'Released WASM 1-second independent benchmark'
```

With two opponents this prepares 200 games. The shipped opening file has 50
positions: 100 games per opponent, each position played with reversed colours.
For a smaller protocol pilot choose six games per opponent. More games require
an appropriately larger local EPD passed with `--openings`; do not cherry-pick
openings after looking at candidate evaluations. Add `--environment /path/to/runtime.json`
only if external runtimes need it. A fresh output folder is required.

Preparation freezes the HTML, UCI adapter/helper, runner/preparer sources,
opening file, runtime/manager/opponent binary hashes and additional model files.
It records time control, host limits, concurrency, source revision and engine
identity. Full-WASM artifacts automatically require native WASM, 32 MiB module
memory, level 65, no opening book and the unchanged endgame setting. An older
adapter that cannot enforce WASM is rejected. Runtime JSON cannot override
MITCHELL_ settings. The same procedure remains available for older JS-only
revisions, clearly labelled as such.

## Run, resume and archive

```sh
python3 /path/to/new-empty-run/runner.py /path/to/new-empty-run/campaign.json
# After an interruption, on the same machine with unchanged frozen inputs:
python3 /path/to/new-empty-run/runner.py /path/to/new-empty-run/campaign.json --resume
python3 scripts/archive-benchmark.py /path/to/new-empty-run/campaign.json /path/to/new-archive
```

The manager uses finite per-move limits, a 20ms Mitchell overhead reservation and
equal 250ms scheduling grace. Keep external opponents at one thread, record all
options, and disable their books/pondering where supported. No arbitrary move
limit or score adjudication is added. Embedded KPK remains available. Opponent
Hash=32 MiB is distinct from Mitchell's 32 MiB total WASM memory / roughly 9 MiB
TT; these are equal-clock comparisons, not perfectly matched hash allocations.

All completed games and abnormal terminations are retained. A forfeit pauses the
run for investigation; it is never silently replaced with another game. Resume
does not permit changing pinned inputs. To repeat the protocol on another host,
prepare a new run with its actual paths and identities rather than editing an
existing frozen record. Outcomes may differ because searches use wall time.

Only completed runs are archived as complete. To preserve an interrupted
checkpoint, use the archiver's explicit `--allow-incomplete`; its report remains
labelled incomplete. External binaries/models are not copied into the archive.
Reconstruct the frozen game with `git show <testedRevision>:index.html` and check
the protocol's `htmlSha256`; reinstall the separately identified opponents.

## Verify and report

```sh
node scripts/verify-evidence.cjs /path/to/new-archive
npm run strength:report -- /path/to/new-archive --output /path/to/results.md
npm run strength:report -- /path/to/new-archive --json --output /path/to/results.json
```

You can pass multiple archive directories. The report first verifies archive
hashes and legally replays PGNs, then recounts results with the repository's
runner. It rejects a stored summary that disagrees with the PGNs, even if that
summary has a fresh hash. It never executes archived runner code.

Each experiment keeps its own source identity, backend requirement, control,
opponents, normal W/D/L, forfeits, normal-play score and complete/incomplete
status. Normal score percentages exclude forfeits. Descriptive intervals
resample whole reversed-colour pairs, with no interval for too few or degenerate
pairs. The reporter keeps distinct controls/revisions separate and deliberately
leaves absolute rating unset.

## What the results establish

A small pilot checks protocol health and helps choose competitive opponents;
it does not calibrate Elo. A larger competitive pool, repeated openings/colours,
reported uncertainty and comparable conditions are needed for a useful engine
rating. A CCRL reference under a different time control/hardware setup is not
Mitchell's rating. Engine-match ratings are also separate from human FIDE Elo.
The UCI tests run under Node on the recorded host; browser/device performance
can differ. Publish the raw evidence and limitations with every claim.
