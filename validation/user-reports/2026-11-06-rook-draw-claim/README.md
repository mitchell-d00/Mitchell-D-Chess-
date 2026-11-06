# Missed fifty-move draw claims in the reported rook ending

This report concerns the newer **128-move checkmate**, not the earlier knight
ending/time forfeit. Black had **99.9 seconds** left when White delivered
128.Ra8#. The supplied metadata records zero observed inactivity and one engine
recovery. The recovery's move is not identified by that version's session count.

The normalized [PGN](game.pgn) retains every supplied SAN move, clock reading
and header; [the tabular input](moves-with-clocks.tsv) stores clocks in seconds.
Only whitespace/formatting was normalized. The actual result remains **1–0**;
an optional draw right does not retroactively invalidate the played checkmate.

## Confirmed fault

The last capture/pawn move before the long rook ending was **56.Kxa4**. The
fifty-move claim becomes available with White's intended **106.Kc3**, or from
the actual board after that move. It remained available for twelve half-moves,
until White's **112.Kxb1** reset the counter.

| Point | Half-move counter | Right/status |
| --- | ---: | --- |
| After 56.Kxa4 | 0 | Counter reset |
| After 105...Ke6 | 99 | White may claim with intended 106.Kc3 |
| After 106.Kc3 | 100 | Black may claim now |
| After 111...Rb1+ | 111 | White still has a claim; it can also take the rook to win |
| After 112.Kxb1 | 0 | Capture resets the counter |
| After 128.Ra8# | 32 | Checkmate with time remaining |

The old AI claim gate used the **opponent's previous** white-relative evaluation.
A searched draw receives a -20 cp draw-avoidance adjustment for the searching
side. On the next turn that became +20 for the other AI, exceeding the old
claim threshold of 15. The engines consequently declined available claims while
the search treated claimable continuations as draws. Those cutoffs also explain
very fast, apparently deep searches; depth 64 here is not evidence of deep
winning technique.

A matched real-browser reproduction confirms the integration error. Both
versions start from the exact position after 106.Kc3, with the previous -20 draw
score seeded and the supplied rounded clock balances:

```text
8/1R6/4k3/8/8/2K5/6r1/8 b - - 100 106
```

Both actual WASM searches return **-20, depth 64, ...Rg1**. The old app declines
the claim and plays ...Rg1. The fixed app claims the legal draw without playing
a move. This single-turn diagnostic is not a strength match. It reproduces the
claim-gate fault, not every original internal evaluation or recovery event.

## Fix

AI claim decisions now use the **fresh current-side search result**. When it is
non-positive or a recovery result is uncertain, the computer can take a legal
current claim or announce its searched move and claim under the intended-move
provisions of FIDE 9.2/9.3. A positive continuation is kept, and an actual
immediate checkmate always takes precedence. In the supplied game White's
winning 112.Kxb1 also remains available if that position is reached.

The actual browser replay claims the draw with intended **106.Kc3**, stopping
after 105...Ke6. A separate replay starting after 106.Kc3 makes Black claim the
current right. There is no arbitrary quiet-position or material adjudication.
The clock is charged before accepting a claim, so an expired clock cannot be
rescued retrospectively. Casual mode keeps its existing automatic fifty-move
end after the move; checkmate and fivefold/75-move rules are unchanged.

Claim type and intended move are retained in game tags and PGN. Post-game
request timings are frozen, including when a claim ends the game without a move.
Future PGNs mark a recovered move in its own comment, for example
`{[%clk 0:01:30.0] Engine recovery: timeout}`. This supplements the session count;
it does not locate the one recovery in the supplied older PGN. Markers represent
known played recoveries in the current session; session diagnostics reset on
restoration. A recovered request that instead ends in a claim has no played
move to annotate.

No neural weights, native binary or search/evaluation code changed. The engine
script remains SHA-256
`b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4`.
MIT/Leorik attribution, all levels/lessons, worker execution and single-file
offline play are preserved. No Elo gain is assigned to this UI/rules correction.

## Evidence and repeat commands

- [Claimable positions recounted from the supplied game](claims.json).
- [Old single-turn behavior](before-turn.json), baseline `f1f8145`.
- [Corrected single-turn behavior](after-turn.json), candidate `268caf1`.
- [Actual intended/current claims and timing/priority checks](browser-claims.json).
- [Evidence hashes and normalization description](manifest.json).
- [Regression check records](checks).

The original 255 half-moves, all clocks and final mate are independently checked.
Unit cases cover current/intended fifty-move and repetition claims, make/unmake
restoration, capture resets, winning continuations, actual 112.Kxb1, and mate.
Real offline worker cases verify fresh-score claims despite a stale opponent
score, unplayed intended moves, preserved tags, casual behavior, frozen timing
metadata and flag-fall priority. Recovery annotations reject malformed content
and round-trip through PGN import.

```sh
node scripts/build.cjs --check
node scripts/test-ai-draw-claims.cjs
node scripts/browser-ai-draw-claims-test.cjs
node scripts/reproduce-draw-claim.cjs --out /path/to/new-empty-directory
```

To repeat the old single turn, save `git show f1f8145:index.html` separately and
set `MITCHELL_TEST_HTML=/path/to/baseline.html`. The script preserves the full
211-ply board history and stops after one reply or a claim. It omits historical
clock annotations in the diagnostic output instead of manufacturing them.
Full input clocks remain in game.pgn. Different timing/TT state can change a
searched move; current/fresh claim behavior is the invariant.
