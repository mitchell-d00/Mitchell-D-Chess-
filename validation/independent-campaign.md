# Independent 200-game campaign

**Restart after a correctness fix:** the first run was paused after 12 completed
games, including six illegal-move forfeits. Its raw data remains in
`/workspace/chess-benchmark-200/` and is not mixed with new results. The repaired
engine starts from zero in `/workspace/chess-benchmark-200-fixed/`. See
[hash-move-fix.md](hash-move-fix.md) for the cause, regression cases and validation.

The unsupported absolute Elo estimate has been withdrawn. The failed initial run tested `e87c93e`; the repaired-engine run tested
`bdb5873406a2b3336523f3a19f16c4a1bc9ebd46` against independently released opponents.
It is a benchmark at its stated control, not a calibrated human FIDE rating.

## Published partial results

The repaired run paused at **58/200 completed games**: 53 wins, 5 draws and no
losses, including one opponent forfeit win. Normal-play results alone are
**52 wins, 5 draws, no losses** in 57 games. MinimalChess emitted `a7a8Q`; the
lowercase move is legal, but the uppercase suffix violates UCI format. No
Mitchell fault was recorded in this repaired run. The snapshot and all PGNs are
published under [results-58/](independent/results-58/). See [tests](../tests) for
a portable reproduction guide and the limits of any rating inference.

## Preregistered design

- **200 games at 1 second per move**, as requested: Fruit 2.1 (100 games) and
  MinimalChess 0.6 (100 games).
- Two simultaneous games maximum. Each game has one Mitchell worker and one
  single-threaded opponent. There is no pondering.
- External **Fastchess 1.8.2-alpha** controls the games and applies its own chess
  rules, rather than relying on Mitchell's referee. No score-based resignation
  or draw adjudication, no tablebases, and no arbitrary move-limit draws are set.
- A fixed 250 ms scheduling grace applies equally to both players. Mitchell's
  adapter reserves 20 ms within the nominal budget. PGNs retain actual move
  times; equal maxima do not imply equal time actually used.
- Every opening is played with reversed colours. The fixed EPD file is a
  deterministic SHA-256 ordering of unique positions after up to ten plies of
  the existing CC0/public-domain opening lines; no candidate evaluation was used
  to select positions. The same 50 openings are used for both opponents.
- Books are disabled. Fruit and MinimalChess use 32 MB hash. Mitchell retains
  its existing table (approximately 36 MB). These memory sizes are **not exactly matched**.
- Engine HTML, adapter, opening file and opponent binaries/scripts are frozen or
  hashed in the configuration. The Node runtime and Fastchess build are recorded.
- Each completed game is saved as PGN. Batches checkpoint after every game.
  The run automatically pauses on the first abnormal termination; it does not
  silently continue after illegal moves, disconnects or forfeits.
  Forfeits/crashes are counted and also flagged separately; they will not be
  silently presented as normal playing-strength wins.

## Opponent references

CCRL 40/15 list, page dated **October 30, 2026**:

| Opponent | Listed reference rating | Source |
| --- | --- | --- |
| MinimalChess 0.6 64-bit | 2416 | [CCRL](https://computerchess.org.uk/ccrl/4040/cgi/engine_details.cgi?eng=MinimalChess%200.6%2064-bit) |
| Fruit 2.1 | 2694 | [CCRL](https://computerchess.org.uk/ccrl/4040/cgi/engine_details.cgi?eng=Fruit%202.1) |

These are citations identifying the opponents, not transferred ratings for this
run. Our one-second-per-move control, shared host, runtime, build and hash settings
differ from CCRL. Fruit is built from its unmodified 2.1 source with the supplied
Makefile using the local x86-64 compiler, rather than the historical CCRL binary.
MinimalChess is the official Linux 0.6 release. A performance comparison here cannot
simply add a score-derived Elo difference to these reference numbers.

## Running and resuming

The first, now-paused campaign started on **November 3, 2026 at 17:27 UTC**.
The repaired-engine restart uses `/workspace/chess-benchmark-200-fixed/`:

- `campaign.json`: exact configuration, hashes, opponent provenance and batches.
- `status.json`: live campaign/batch status.
- `summary.json`: completed-game counts and per-opponent W/D/L.
- `*.pgn`: game records, move times, engine identities and termination reasons.
- `*.state.json`: Fastchess recovery checkpoints.
- `*.log`: manager output, warnings and faults.

```sh
python scripts/independent-campaign.py /workspace/chess-benchmark-200-fixed/campaign.json
# After an interruption, with the same frozen engines and dependencies:
python scripts/independent-campaign.py /workspace/chess-benchmark-200-fixed/campaign.json --resume
```

`validation/independent/campaign-config.json` records the repaired-engine restart;
`campaign-config-failed.json` preserves the original failed plan, and
`validation/independent/openings.epd` records the openings. Paths in the config
are local and must be adjusted on another host. The runner requires independently
installed Fastchess and opponent programs. **No external engine, model, match
manager or compatibility library is distributed with this MIT game.**

The runner writes a paired-bootstrap score interval after enough nondegenerate,
complete colour pairs. It does not output an absolute Elo estimate. No interval
is reported for a tiny or degenerate sample. Small samples and one opening pair
are inadequate for rating claims.

At one second per move, the complete campaign takes hours. The running workspace
must remain available. If interrupted, the per-game checkpoints permit resuming;
queued games are not reported as completed. Progress reports are provisional
until all 200 games and fault logs have been reviewed.

## Preflight, excluded from the campaign

Two-game 100 ms checks against Fruit and MinimalChess completed normally. The
Lozza 100 ms check produced two timeout forfeits, so those results are **not**
evidence of playing strength and are excluded. At the requested one-second control, Lozza 3.0 and 9 also lost games on time
(despite equal 250 ms scheduling grace), so they were excluded before the campaign
started. Fruit and MinimalChess remain the two protocol-compatible opponents.
The plan was revised from three opponents to 100 games against each validated
opponent before any campaign games were played. All setup checks, including a
frozen-adapter path error, are outside the 200 campaign games.
