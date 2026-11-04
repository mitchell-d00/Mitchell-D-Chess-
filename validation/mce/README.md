Historical experiment at revision 3989a92. For the subsequent original neural
pipeline, see [../mnn/README.md](../mnn/README.md). These old results do not
rate the new model.

# Mitchell-only evaluator: rejected promotion experiment

**3000+ has not been established. Main remains unchanged.** This branch preserves
the exact tested Mitchell-only candidate for inspection and further development.
The fitted weights are rejected for promotion: better training loss did not
produce better play in the fresh smoke test. These small matches do not establish
an absolute Elo or statistically prove that either variant is weaker.

## What changed

The playable `index.html` contains only Mitchell's existing engine and original
constraint evaluation. There is no imported network, neural inference payload,
external engine, WASM or runtime download. The original MIT notice remains
visible. The UI, worker search, 65 level budgets, 38 lessons, clocks, FIDE mode,
computer-vs-computer, KPK bitbase and opening book remain. The HTML is 231,399
bytes, compared with 497,243 bytes for the previous release. That size reduction
is not a strength improvement.

The submitted ZIP is preserved as `submitted-prototype.zip`. It is not a complete
chess engine: its Board omits FEN state, search returns a depth-adjusted static
score without generating moves, pin detection includes randomness, and its
material gate can penalize legitimate winning positions. The runtime uses none
of those placeholder implementations. `engine/mce.js` instead implements these
ideas in the tested 0x88 engine with deterministic soft terms for absolute pins,
king-ring attacks, pseudo-safe empty king exits, Shannon entropy of safe
non-pawn destination files, and attacked undefended material. These are ordinary
chess features; thematic names alone confer no proven strength advantage. There
is no unsafe new pruning rule that discards legal sacrifices.

## Original self-play training

All 24 games finished normally, using only Mitchell's classical evaluation and
search at 20 ms nominal per move, with two simultaneous games. No Leorik labels,
weights or third-party engine were used in generation or fitting.

- 484 legal sampled positions were archived and replay-verified.
- 434 positions with more than four pieces were eligible for this fit:
  **338 training / 96 holdout** from nine / three distinct opening pairs.
- Whole opening pairs were held out; outcomes from a paired opening never
  crossed the training/holdout split. Unfinished games would be excluded.
- Five weights were fitted to completed game outcomes using a Texel-style
  sigmoid squared-error objective, bounded coordinate descent and light
  regularization. This is classical feature tuning, not NNUE training.
- Training loss: **0.11799205 → 0.11477674**.
- Holdout loss: **0.08397233 → 0.08128999**, about **3.2% lower**.

| Weight | Hand-set | Fitted experimental |
| --- | ---: | ---: |
| Pin | 10 | 33 |
| King-ring pressure | 3 | 0 |
| King exits | 2 | 10 |
| Mobility entropy | 3 | 0 |
| Loose material | 10 | 36 |

`training.json`'s `recommended: true` means that the fit-only holdout gate passed.
It is NOT approval to promote the weights. The subsequent fresh-game gate did
not pass. `decision.json` records the rejection. The branch HTML deliberately
retains the fitted experimental version to reproduce its recorded tests;
`untrained.html.gz` preserves the hand-set starting point.

The dataset and holdout are far too small to train a generally strong evaluator
or infer an Elo gain. Repeated experimentation on this holdout would make it
validation data, requiring another untouched final test set.

## Completed fresh matches

Results are from the named Mitchell variant's side:

| Variant | Opponent | Nominal move time | Games | Wins | Draws | Losses | Forfeits |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Fitted Mitchell-only MCE | Native Leorik 3.1.3 | 1 s | 4 | 0 | 0 | 4 | 0 |
| Previous borrowed-network Mitchell, revision 09d136d | Native Leorik 3.1.3 | 1 s | 2 | 0 | 0 | 2 | 0 |
| Fitted Mitchell-only MCE | Hand-set Mitchell-only MCE | 0.1 s | 4 | 1 | 0 | 3 | 0 |

All ten referee games ended normally; all completed games and warnings are
preserved. These runs are separate from the earlier 58-game campaign and the
Stockfish/Texel pilots. Do not pool different engine variants into a rating.
There is no demonstrated improvement over the previous neural engine and no
basis for calling the fitted replacement 3000+.

Conditions: Node v24.22.1, Fastchess alpha 1.8.2 build f618e34, one engine thread,
no pondering/books/external tablebase files/score adjudication/move-limit draws,
equal 250 ms scheduling grace and 20 ms Mitchell search overhead per move.
Leorik uses Hash 32 and Temperature 0; Mitchell retains its approximately 36 MB
TT. At 100 ms both Mitchell variants reserve the same 20 ms. Actual thinking
limits and move times are in the manifests/PGNs; equal limits need not mean
equal time used. Built-in KPK guidance remains enabled.

The Leorik runs overlapped on a shared Linux host with four-core CPU quota and
16 GiB memory limit. The fit/hand smoke test began after the previous-version
Leorik run finished. Training was finished before these fresh matches. Brief
development checks also ran on this shared host; this is not isolated calibrated
rating hardware. The nominal 100 ms smoke test, with relatively large scheduling
grace, is particularly unsuitable for an absolute rating.

Frozen openings 41 and 42 from the 50-position EPD were used with colours
reversed; the previous-version comparison used only pair 41. These openings were
outside the 12 opening pairs used in self-play fitting. Historical absolute paths
in raw manifests are original records, not portable installation locations.
`workingTreeInputs: true` and a null `testedRevision` explicitly identify the
uncommitted candidate inputs; the exact HTML/adapter hashes identify what ran.
The first fitted/Leorik manifest incorrectly copied the default bdb5873 into
sourceBaseRevision for working-tree inputs; the actual checkout base was 09d136d.
The preserved raw manifest is not rewritten. The helper now records HEAD for
working-tree inputs. Exact payload hashes are authoritative. The preparer was
extended during this experiment; checkout-base metadata is not a claim that
those helper changes already existed in the historical commit.

## External opponent provenance

Leorik is installed separately only as a test opponent. Official release:
https://github.com/lithander/Leorik/releases/tag/3.1

Asset: `Leorik.3.1.Linux.zip`, SHA-256
`3233e7675a571fb0a8751047b5ddde402f2d7774b5bbf0bf2748ccffe7a424f8`.
Its binary identifies as **Leorik 3.1.3 PEXT**, SHA-256
`2d368f275ab19cc86708acb87b8e8cc9ee214273097bfbd3231ac8684402c807`.
The official external network is `640HL-S-5288M-Tmix-Q5-v19.nnue`, SHA-256
`01540ad378a157b47c1c29b6f2602f7ae10073ccdd538801395082d375e20d61`.
The UCI handshake is in `leorik-uci.txt`. The executable and opponent network
are NOT distributed here and are never used during game play or training.
Historical licensing records are retained for prior releases and honest attribution.

Published full-Leorik ratings do not transfer to this candidate, and these
short-control games cannot establish a human/FIDE rating.

## Reproduce and inspect

From the repository root, with Node 24 and Python 3.10+:

```sh
node scripts/test.cjs
node scripts/test-mce.cjs
node scripts/test-mce-training.cjs
node scripts/test-hash-moves.cjs
python scripts/test-campaign.py
node scripts/browser-test.cjs
```

The optional browser test needs separately installed Playwright and Chromium.
It passed offline: 65 levels, 38 lessons, legal worker move, UI heartbeat,
cancellation, book, computer-vs-computer, original MIT notice and worker failure.
The first sandboxed launch was blocked by socket restrictions; the same check
passed with the environment's network/socket permission enabled.

To exactly repeat the fit from archived inputs (unlike generating new timed games):

```sh
gzip -dc validation/mce/selfplay.jsonl.gz > /tmp/mce-selfplay.jsonl
gzip -dc validation/mce/untrained.html.gz > /tmp/mce-untrained.html
node scripts/train-mce.cjs /tmp/mce-selfplay.jsonl /tmp/mce-training.json --html /tmp/mce-untrained.html
```

Only `createdUtc` should differ from `training.json`. The automated check also
replays every archived self-play move and validates terminal outcomes and splits.
The newer generator records repeated opening identity explicitly so a larger
run cannot put the same opening into both splits.

For a new native-opponent match, install Leorik from the official asset separately
and place its supplied network alongside the executable. Make an opponents JSON:

```json
{
  "Leorik3.1.3": {
    "command": "/absolute/path/to/Leorik-3.1.3",
    "options": ["option.Hash=32", "option.Threads=1", "option.Temperature=0"]
  }
}
```

Then freeze the working candidate into a NEW output directory:

```sh
python scripts/prepare-benchmark.py --out /tmp/mce-match --working-tree --opponents /absolute/path/to/opponents.json --games-per-opponent 4 --concurrency 1 --move-seconds 1 --fastchess /absolute/path/to/fastchess
```

Before starting, set `batches[0].openingStart` in the new `campaign.json` to 41 to
repeat this screening protocol; record the external network in the opponent's
`additionalInputs` mapping as in the saved manifests. Then:

```sh
python scripts/independent-campaign.py /tmp/mce-match/campaign.json
```

To repeat the previous borrowed-network comparison, omit `--working-tree` and
use `--revision 09d136d2105eed46b18f0683fc0412ee14ea2479` with two games.
That retrieves the OLD engine from Git; it does not change this branch's HTML.
Time-limited reruns need not produce the same moves or outcomes.

The fit/hand manifest includes the exact original shim, input hashes, clock and
opening settings. `hand-opponent.sh` shows how to run the archived untrained
HTML through the same UCI bridge; replace its absolute paths for your machine.
No external opponent is required to compare these two original variants.

Each match folder contains raw PGN, JSON configuration/status/summary/referee
checkpoints, compressed raw logs, EPD and a SHA-256 snapshot manifest. Logs are
losslessly compressed; warnings such as analysis PVs continuing after repetition
are retained. Summary counts can be recomputed without installing an opponent:

```sh
python scripts/independent-campaign.py validation/mce/fitted-vs-leorik/campaign.json --summary-only
```

## What remains before a production replacement

This prototype did not meet the requested strength target. Five fitted features
and 24 shallow self-play games are not a substitute for a well-trained original
neural evaluator or a broadly tuned classical engine. Further work needs a much
larger, diverse original dataset, an untouched final test set, faster evaluation,
and repeated independent matches at the intended playing controls. The observed
four-position depth-6 development benchmark was approximately 34k NPS for MCE
versus 145k for the old neural engine on this shared host; different trees and a
single run prevent a precise speed comparison, but there is no speedup to claim.
No optimization or strength milestone should be declared from those figures.

Before merging a future candidate, specify the intended computer rating scale,
run a competitive calibrated pool with enough colour-paired games and reported
uncertainty, and demonstrate the requested 3000+ result plus no material
regression against the current release. Training loss and these smoke tests are
insufficient. The owner explicitly chose to keep main unchanged until it qualifies.
