# Modern-opponent evidence

## Completed Stockfish 19 screening

On November 5, 2026, the previous public Level 65 completed **12 games at one
second per move: 0 wins, 0 draws, 12 losses**, with zero forfeits. All games
ended normally. This demonstrates a clear gap to this modern top engine at this
control; it does not establish an Elo or a FIDE rating.

The tested HTML is commit `762c8aea24806a1fbfd582177637a107dd701862`, before the
new SIMD implementation. This is distinct from the 58-game historical campaign
and from the new candidate campaign. Do not add their scores together.

Evidence: [stockfish19-pilot/](stockfish19-pilot/). It includes all PGNs, complete
compressed logs, referee commands/checkpoints, exact adapter/helper and runner,
hash manifests, and machine-readable summaries. `snapshot.json` identifies the
HTML hash and source revision; reconstruct it with `git show <revision>:index.html`.
No external engine executable or network is redistributed.

Conditions:

- Native official `sf_19` release, identified as Stockfish 19, full strength,
  one thread, Hash 32 MB, Ponder false, UCI_LimitStrength false.
- External Fastchess alpha 1.8.2 (`20260726-f618e34`), Node v24.22.1.
- 1 second/move, equal 250ms scheduling grace; Mitchell reserves 20ms inside
  its search budget. Actual times and nodes are retained in PGN.
- One game at a time; no books, external tablebases, pondering, evaluation
  adjudication or arbitrary move-limit draws. Mitchell retains embedded KPK.
- First six openings from the existing frozen 50-position EPD, each with colours
  reversed. No games discarded. The openings were selected without candidate
  evaluations.
- Shared Linux host, four-core CPU quota and 16 GiB memory limit. Development
  timing briefly overlapped this screening; the host is not calibrated hardware.
  Mitchell's approximately 36 MB TT is not exactly matched to 32 MB opponent hash.

Verify hashes, lossless log compression and all legal PGNs:

```sh
node scripts/verify-evidence.cjs validation/modern/stockfish19-pilot
```

## Larger candidate campaign

The new 200-game run is a clean restart, not a continuation or reinterpretation
of the old partial campaign. Its planned opponents are Stockfish 19 and native
Leorik 3.1.3, 100 games each, at one second per move. The latter uses its own
separately installed 640-hidden network, not the game's embedded 128-hidden net.
Both run with one thread and 32 MB hash; concurrency is at most two games.
All 50 openings are paired by colour for each opponent.

Preparation pins the complete HTML, UCI adapter/helper, exact runner, runtime,
manager, opponent binaries and additional model inputs. It records the host,
time control, build identities and every referee command. Checkpoints are saved
after each game; abnormal terminations stop the run. Forfeits are counted and
reported separately, not treated as ordinary strength results.

The campaign started from frozen commit `eec0d23da885fad1944cefc232348978d514f16d` on
`2026-11-05T17:54:55.801712+00:00`. [protocol-200.json](protocol-200.json) is the exact frozen
configuration. [candidate-checkpoint/](candidate-checkpoint/) is a static snapshot
at `2026-11-05T17:59:07.996898+00:00`: **2/200 completed**, explicitly incomplete,
with no forfeits. It is not a live score and is not combined with the completed
12-game baseline screening. The background run continues in the working environment.

Only a completed run should be described as a completed 200-game result.
Checkpoint snapshots are explicitly incomplete and are not live progress.
Even a complete all-loss score would not calibrate a useful absolute rating;
a subsequent pool closer in strength would be needed.

Portable preparation, with opponents installed independently:

```sh
python3 scripts/prepare-benchmark.py --out /path/to/new-empty-run \
  --revision <frozen-commit> --fastchess /path/to/fastchess \
  --opponents /path/to/opponents.json --games-per-opponent 100 \
  --move-seconds 1 --concurrency 2 --purpose 'Modern 200-game candidate benchmark'
python3 /path/to/new-empty-run/runner.py /path/to/new-empty-run/campaign.json
# Resume with the same frozen inputs:
python3 /path/to/new-empty-run/runner.py /path/to/new-empty-run/campaign.json --resume
```

Opponent JSON maps names to `command`, `options`, provenance and optional
`additionalInputs` path-to-SHA256 entries. Set required platform compatibility
environment explicitly in the frozen config. A separately installed GPL opponent
is used only as an external test process; it is never linked or embedded.
