# Illegal cached-move regression and fix

The first independent-referee campaign was paused after **12 completed games**:
4 wins, 1 draw and 7 losses, including **6 illegal-move forfeits by Mitchell**.
The raw run remains at `/workspace/chess-benchmark-200/`. It is not pooled with
results from the repaired engine, and supplies no absolute Elo estimate.

## Reproduction and cause

All six logged UCI position histories replay legally to the referee's positions.
The bridge therefore did not truncate or misparse those game histories.

The engine generated consecutive low/high Zobrist halves using a linear
xorshift32 transition `T`. For every piece/state key, `high = T(low)`.
Since `T` is linear under XOR, every whole-position signature also satisfied
`positionHigh = T(positionLow)`. The apparent 64-bit hash therefore had only
32 bits of collision resistance. This affected transposition probes, evaluation
caching and repetition signatures.

A deterministic legal random walk found two distinct positions with the same
old low/high signature after 40,867 sampled positions. The exact FENs and old
signature are in `regressions/zobrist-collision.json`. The neural search's
staged hash-move path trusted a matching signature and could make a move that
was not generated for the actual board. A stale promotion could then overwrite
the wrong piece and corrupt make/unmake state.

## Repair

- Generate complete 64-bit Zobrist keys with SplitMix64. BigInt is confined to
  initialization; the search keeps its existing fast int32 low/high operations.
- Validate a cached move against pseudo-legal generated moves **before** trusting
  its bound or making it. An inconsistent entry loses both its move and score.
  Existing king-safety checks still validate moves after make. Move ordering can
  remain deferred, but generation is required for validation.
- Reject invalid replay histories rather than silently searching a truncated
  position. Reject an illegal root selection rather than substituting a move
  that would hide a search fault.
- Automatically pause the campaign on the first abnormal termination, validate
  frozen adapter hashes as well as engine hashes, and retain fault reasons.

This changes engine search behaviour. No pre-fix match score or throughput
number is a benchmark of this repaired revision.

## Checks

`node scripts/test-hash-moves.cjs` covers:

- the real historical collision now producing different position hashes;
- all six illegal-move game histories, with short and one-second-budget searches
  checked against the legal root moves;
- inconsistent TT-entry injection at root and non-root nodes;
- invalid-history rejection;
- incremental hash verification by independent recomputation across make/unmake.

Existing perft, book, KPK, mate, timeout, independent neural-reference,
incremental-accumulator and scalar/SIMD checks also pass. Offline Chromium checks pass. An independent Fastchess preflight played
**12 games from the six former failure positions**, with reversed colours at
100 ms per move. All 12 completed normally: 5 wins, 5 losses and 2 draws, with
**zero illegal moves, disconnects or time forfeits**. These deliberately selected
regression positions are not a strength benchmark. Raw PGN/log records are under
`regressions/referee-preflight/`.

`python scripts/test-campaign.py` also tests normal/forfeit accounting and starts
a stub manager that emits an illegal move; the runner pauses automatically after
that first faulty result and preserves its checkpoint/status instead of filling
the remaining games.

## New campaign

The failed run is preserved and remains paused. The repaired revision starts a
**fresh 200-game run** with the same 100 games per opponent, one-second move
budget, paired openings and documented scheduling grace. It uses a new directory
and new frozen hashes: `/workspace/chess-benchmark-200-fixed/`. The failed games are not discarded from the record or
mixed into the new results. The engine remains **unrated**.
