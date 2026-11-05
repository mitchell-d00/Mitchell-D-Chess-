# Level progression checks — November 5, 2026

Level 65 and level 50 are distinguishable in controlled play: level 65 won
20–0 against level 50 in the previous public version, and 20–0 with the new
level policy. Both comparisons used a nominal 100 ms/move control. These are
relative results, not an Elo rating. One long or drawn game does not establish
that two levels have the same strength.

We completed **376 games**, with **zero forfeits**. All **48,404 half-moves**
replayed legally. Every game, including losses by higher levels, is retained.
The evidence does **not** establish that every adjacent level is statistically
stronger. The 65 levels remain accessibility presets, not calibrated ratings.

## Changes made

- Previously, clock allocation could give levels 31–50 the same search settings
  and allowance; levels 51–65 could also collapse to one preset. Lower levels
  now receive increasing shares of a common safe allowance, with level 65 using
  the full allowance. The multiplier is `2 ** ((level - 65) / 12)`.
- Unclocked maxima no longer drop from 60 seconds at level 50 to 10 seconds at
  level 51. Levels 36–50 now progress from 17–30 seconds; levels 51–65 from
  32–60 seconds. Level 65 retains its 60-second maximum.
- Level 5 retains the piece-placement evaluation introduced at level 4; level 6
  retains quiescence introduced earlier. Depth, evaluation tier and maximum
  time no longer decrease at these transitions.
- Noisy beginner/club searches now respect their allotted time. They keep the
  last fully completed root iteration, or a legal static fallback, and report
  actual completed depth. Their depth caps, declining noise and deliberate
  mistake rates remain part of their difficulty.
- Clocked play shows the current maximum thinking allowance. The move-source
  label identifies WASM or JavaScript fallback when that backend reports a
  completed search. Book moves are still labelled separately.
- The match adapter resets the selected level's search table, asserts per-level
  backend routing and freezes the adapter separately from historical HTML.
  The check runner also treats process-launch errors as failures.

The embedded full WASM core and credited network are unchanged. The final app's
`engine-src` is byte-identical to the tested candidate's engine script (SHA-256
`b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4`). Later
changes add UI diagnostics, tests and documentation. Pure JavaScript fallback,
MIT attribution, offline operation and the single-file release are preserved.

## Experiments

Results are higher level W/D/L. Nominal time is the same external per-move
ceiling for both players; each level intentionally applies its own caps/shares.
It is not equal internal search time. No opening-book moves were used.

| Experiment | Frozen game revision | Nominal control | Games | Result |
| --- | --- | --- | --- | --- |
| Previous public level 65 vs 50 | `40ca6e35634aea3ac25eaf048f850aa9722e3ed8` | 0.1 s/move | 20 | 20/0/0 |
| Candidate level 65 vs 50 | `ee1fcaf` | 0.1 s/move | 20 | 20/0/0 |
| Candidate, all 64 adjacent pairs | `ee1fcaf` | 0.1 s/move | 256 | 4 games per pairing; 29 higher-level leads, 17 ties, 18 lower-level leads |
| Candidate targeted follow-ups | `ee1fcaf` | 1 s/move | 80 | See below |

[Full screening tables](SCREENING.md), [follow-up tables](FOLLOWUP.md), and
[before](before-policy.json)/[after](policy.json) resource audits are available.
The screening archive includes its 20-game top comparison plus 256 adjacent
matches. Separate experiments remain separate; we do not pool them into a
rating or suppress unsuccessful results.

The four pairings which lost all four screening games received 20-game
follow-ups, using ten opening positions reversed by colour:

| Pair | W/D/L | Higher-level score | Paired bootstrap 95% interval |
| --- | --- | --- | --- |
| 5 vs 4 | 16/2/2 | 85.0% | 72.5–95.0% |
| 11 vs 10 | 11/1/8 | 57.5% | 32.5–80.0% |
| 16 vs 15 | 9/2/9 | 50.0% | 30.0–67.5% |
| 38 vs 37 | 8/5/7 | 52.5% | 35.0–72.5% |

Only 5 vs 4 has an interval wholly above 50% in this small follow-up sample.
These are exploratory comparisons selected after screening, not a multiple-test
corrected certification. Levels 11/10, 16/15 and 38/37 remain unresolved; so do
other neighbours with only four games. A larger independent opening sample is
needed before claiming a statistically ordered ladder. No additional tuning
was performed against these follow-up outcomes.

## Conditions and limitations

The frozen configurations record full revisions, HTML/core/network/adapter
hashes, Fastchess identity, openings, commands and environment. The referee was
Fastchess 1.8.2 alpha, using one worker per engine, 32 MiB WASM memory, at most
two games concurrently on a shared Linux host, 20 ms adapter overhead and equal
250 ms referee grace. The old top comparison ran one game at a time. Light
editing and unit checks occurred during play; browser/throughput suites were
held until the games finished. Neither host load nor random beginner choices
are deterministic. These short controls are regression screens, not evidence
of classical strength on phones or tablets.

There was no arbitrary move-limit draw or score-based adjudication. Forced,
book, repeated or drawn positions can produce identical moves at different
levels. More time does not guarantee a better move in every position. At very
small allowances integer-millisecond rounding also creates ties: the audits
list them explicitly. Budgets strictly increase across levels 2–65 for the
1 s, 10 s and 60 s supplied allowances checked by the automated test.

Archives: [previous top comparison](before-65-v50), [candidate full screen](adjacent-screen),
[targeted follow-ups](followup-1second). `snapshot.json` hashes all archived
inputs and results; logs are losslessly compressed. Third-party executables
and HTML duplicates are omitted; reconstruct the HTML from its recorded commit
and verify its hash. No external opponent code is embedded in the game.

## Repeat the experiment

Install Node.js 22+, Python 3 and Fastchess separately. From a checkout of this
revision, choose a new empty output directory:

```sh
node scripts/build.cjs --check
node scripts/test-level-progression.cjs
node scripts/audit-levels.cjs > /tmp/level-policy.json

python3 scripts/prepare-level-matches.py \
  --revision HEAD --pairs adjacent --games 4 --top-games 20 \
  --move-seconds 0.1 --concurrency 2 \
  --fastchess /path/to/fastchess --out /path/to/new-level-screen
python3 /path/to/new-level-screen/runner.py /path/to/new-level-screen/campaign.json
python3 scripts/archive-benchmark.py /path/to/new-level-screen/campaign.json /path/to/new-archive
node scripts/verify-evidence.cjs /path/to/new-archive
node scripts/report-strength.cjs /path/to/new-archive --output /path/to/report.md
```

To reproduce the frozen candidate engine, use `--revision ee1fcaf` and inspect
the recorded adapter/preparer hashes; current tooling is pinned separately.
For the targeted sample use a different empty directory and:

```sh
python3 scripts/prepare-level-matches.py \
  --revision ee1fcaf --pairs 5:4,11:10,16:15,38:37 --games 20 \
  --move-seconds 1 --concurrency 2 \
  --fastchess /path/to/fastchess --out /path/to/new-level-followup
```

Use `--games 100` and longer time controls with fresh colour-paired openings for
a more informative next study. The full adjacent ladder can take many hours;
preparation freezes all inputs before the runner starts. Browser checks include
real offline worker level-50/65 budget separation, fallback/source labels and
clock UI wiring. Core checks cover all 65 presets, legal moves, time policies,
noise progression, preparer pinning and historical report compatibility.
