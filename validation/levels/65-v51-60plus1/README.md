# Level 65 versus level 51 — completed 20-game browser match

At **60+1**, level 65 scored **7 wins, 12 draws, 1 loss**: **13/20 (65.00%)**.

All 20 games completed. Level-65 flag falls: **0**; level-51 flag falls: **0**. Recorded engine recoveries: **0**; observed inactivity: **0.00 ms**.

| Level 65 colour | Wins / draws / losses |
| --- | --- |
| White | 2 / 7 / 1 |
| Black | 5 / 5 / 0 |

| Opening | 65 as White | 65 as Black | Games |
| --- | --- | --- | --- |
| Ruy Lopez | D | W | [01](01.pgn), [02](02.pgn) |
| Italian | D | D | [03](03.pgn), [04](04.pgn) |
| Open Sicilian | D | W | [05](05.pgn), [06](06.pgn) |
| French Tarrasch | W | D | [07](07.pgn), [08](08.pgn) |
| Caro-Kann Advance | W | W | [09](09.pgn), [10](10.pgn) |
| Queens Gambit Declined | D | D | [11](11.pgn), [12](12.pgn) |
| Slav | D | D | [13](13.pgn), [14](14.pgn) |
| Kings Indian | D | D | [15](15.pgn), [16](16.pgn) |
| English Four Knights | L | W | [17](17.pgn), [18](18.pgn) |
| Nimzo-Larsen | D | W | [19](19.pgn), [20](20.pgn) |

Both presets use the same NNUE/WASM engine, with personas disabled. They differ in thinking allowance. The openings were colour-reversed in 10 pairs. Each prescribed eight-ply prefix was replayed without clock charge or increment; the 60-second clocks started afterwards. Book play then continued normally. Casual rules, actual app clocks and Fast viewing speed were used. Concurrency was 2 offline browser games on one host.

| Timing diagnostic | Level 65 | Level 51 |
| --- | ---: | ---: |
| Clock seconds spent per played move | 1.09 | 0.64 |
| Mean returned search budget, ms | 1426.23 | 825.70 |
| Median reported completed depth | 15 | 14 |
| Lowest recorded clock, seconds | 42.92 | 60.39 |

Clock cost includes UI/worker/hold time and any final unplayed flagged turn; it is not CPU search time. Search-budget means omit replies without a returned budget (including book/forced moves). Depth is a search diagnostic, not a strength rating.

Endings: fifty-move rule (4); checkmate (8); threefold repetition (4); insufficient material (2); stalemate (2). All 3659 half-moves replay legally; 3499 clocked moves have traces. Actual reply backends: wasm 3499.

This is a small within-engine comparison at one time control, not an absolute Elo estimate or proof that every level is stronger. Book randomness and timed cutoffs are not seeded, so reruns can differ. No score/material/move-limit adjudication or engine changes were used.

Frozen HTML SHA-256: `97b0f0454cf7a3be8e4f2f81440e9de661f6098ede1da72fcebb85860f54bcc2`. Runner revision: `4f96929a49c8badbc4ca82a63407b86bc42721b5`. Started 2026-11-06T14:39:00.920Z; finished 2026-11-06T15:05:04.428Z. Exact host, browser, inputs and file hashes are in [protocol.json](protocol.json) and [summary.json](summary.json).

See [the protocol](../BROWSER-MATCH-PROTOCOL.md). To verify or repeat from the repository:

```sh
node scripts/verify-level-match.cjs validation/levels/65-v51-60plus1
node scripts/report-level-match.cjs validation/levels/65-v51-60plus1
node validation/levels/65-v51-60plus1/runner.cjs --html validation/levels/65-v51-60plus1/engine-under-test.html \
  --out /path/to/new-empty-directory --games 20 --seconds 60 --increment 1 --concurrency 2
```
