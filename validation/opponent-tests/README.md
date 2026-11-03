# Independent opponent pilots and protocol-format diagnostic

November 3, 2026. These are opponent-selection pilots, not an absolute rating.
The separate two-game diagnostic exercises a previously observed UCI formatting
fault from a deliberately selected position; it is not a strength sample.

All runs use frozen Level 65 at revision
`bdb5873406a2b3336523f3a19f16c4a1bc9ebd46`, HTML SHA-256
`79e3126ca6cd3537ac9f958f4680790a7d11bfcbee1f352bd4c9fb41c9bbe09a`.
The game HTML and candidate UCI adapter are unchanged from the earlier repaired
58-game snapshot. The orchestration has been generalized for smaller pilots;
`runnerSourceRevision` in the raw manifests is the checkout base, not a claim
that the uncommitted runner changes already existed in that historical commit.
The exact runner used here is frozen as `runner.py` alongside these results;
its hash is in each `snapshot.json`. The maintained runner remains under scripts/.

## Completed opponent-selection results

| Opponent | Games | Mitchell wins | Draws | Mitchell losses | Forfeits | Score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Stockfish 5 | 4 | 0 | 3 | 1 | 0 | 37.5% |
| Texel 1.06 | 4 | 1 | 2 | 1 | 0 | 50.0% |

All eight games ended normally: one Mitchell win, five draws and two losses.
Each pilot has only two opening pairs, so no rating or confidence interval is
reported. Both opponents are candidates for a larger, prospectively frozen pool.

## Conditions

- Fastchess alpha 1.8.2, build `20260726-f618e34`; Node.js v24.22.1.
- Nominal 1 second per move; equal 250 ms scheduling grace; Mitchell reserves
  20 ms inside its search budget. Actual thinking time is recorded in PGN.
- One thread per engine; one game per pilot, with the two pilots overlapping.
  This is a shared Linux host with a four-core CPU quota and 16 GiB memory limit,
  not dedicated calibrated hardware. Opponent compilation briefly overlapped.
- Opponent hash 32 MB; candidate's existing table approximately 36 MB.
- No books, pondering, external tablebase files, referee tablebase adjudication,
  evaluation-based resignations/draws or move-limit draws. Built-in endgame
  knowledge, including Mitchell's embedded KPK bitbase, remains enabled.
- Each four-game pilot uses the first two openings from the frozen 50-position
  EPD, each played with colours reversed. No pilot games were discarded.
- PGN terminations and abnormal results are counted independently by
  `scripts/independent-campaign.py`. The archived 58-game campaign remains
  paused and separate; these games do not complete its planned 200 games.

## Opponent builds

Stockfish 5: official `sf_5` source, revision
`54f8a9cb138a1bc0b0054b98f911fafd8d1b03ad`, unmodified.
Built using `make -j2 build ARCH=x86-64 COMP=gcc`, local GCC 14.
Full skill (default 20), one thread, Hash 32, Ponder false, OwnBook false.

Texel 1.06: official `1.06` source, revision
`b913f4a7454a6a2689e9e9130fe2e62a63944c88`, unmodified.
Local GCC 14 C++11/C GNU99 build with `-O3 -DNDEBUG -msse4.2 -pthread`,
`HAS_CTZ`, `HAS_PREFETCH`, `HAS_POPCNT`, `HAS_RT`, and `-include limits`
for current-compiler compatibility; NUMA not enabled. Exact compile/link argv
are in `texel106/build-commands.json`. Strength 1000 (full), one thread,
Hash 32, Ponder false, OwnBook false; no external tablebase paths configured.

The raw manifests cite CCRL 40/15 entries for version identification. Local
binaries, time control and hardware differ from those measurements. Do not
transfer their published ratings to Mitchell or interpret these pilots as FIDE
calibration. External engine binaries/source are installed separately and are
not distributed in this repository or linked into the MIT game.

## Promotion-case diagnostic

Starting FEN (from the paused campaign's final position):

```
8/P4pk1/6p1/3Bn3/4P3/4q2P/2p4P/Q6K w - - 0 35
```

The EPD supplies the first four fields, so the referee initializes move counters.
Both colours are played. The external MinimalChess 0.6 binary is unchanged;
a separately labelled test-only wrapper lowercases uppercase promotion suffixes
in `bestmove`, `ponder`, `info pv` and `info currmove` coordinate tokens.
It records every adjustment in `normalizations.jsonl`. It neither selects moves
nor repairs illegal coordinates. The original opponent forfeit is preserved.

The two diagnostic games completed normally: **1 Mitchell win, 1 draw, 0 losses**,
with zero forfeits. Thirteen output lines/tokens were normalized, including one
`bestmove a7a8Q` → `bestmove a7a8q`; the other changes were analysis-PV tokens.
This validates the format repair on the saved case, not all possible protocol
errors and not a strength improvement. Referee warnings about analysis PVs
continuing after repetition are retained in the compressed log.

## Evidence formats

Each result subdirectory contains:

- `*.pgn`: complete raw games, starting positions, moves, clocks, nodes, result
  and termination. These are the authoritative results.
- `campaign.json`: original frozen input configuration and binary SHA-256s.
- `*.command.json`, `*.state.json`, `*.done.json`: referee argv, checkpoint and
  completion record. Historical absolute paths must be replaced for a new run.
- `summary.json`, `status.json`: machine-readable accounting and completion.
- `*.log.gz`: losslessly compressed raw referee output. Decompress with
  `gzip -dc filename.log.gz`; no warnings or output were removed.
- `openings.epd`: exact starting positions.
- `snapshot.json`: SHA-256s of archived evidence, original uncompressed log
  hashes, and the runner source hash. It is a static archive, not a live score.

The format diagnostic also contains the raw JSONL audit and exact wrapper/shim.
UCI identification/option handshakes are stored with the native-opponent pilots.
No third-party executable is included.

See the repository-root [tests](../../tests) for result totals, repeat commands,
correctness checks and the larger-match protocol. Time-limited reruns reproduce
inputs and conditions; they need not produce identical moves or scores.
