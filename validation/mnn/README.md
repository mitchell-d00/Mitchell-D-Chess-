# Original Mitchell neural training and test cycle

**Research candidate; not approved for main. 3000+ has not been established.**
This is an original first-party model and training/inference pipeline. The first
model improved held-out prediction, but did not demonstrate a playing-strength
improvement in the fresh matches. Main remains at `09d136d`, as requested.

## What is implemented

- The existing legal Mitchell engine, search, worker, 65 levels, clocks, rules,
  38 lessons, opening book and original KPK guidance are retained.
- `engine/mnn.js`: original incrementally updated neural evaluation. No third-party
  chess-engine source, pretrained weights, initialization or training labels.
- `engine/mitchell.mnn`: original **49,296-byte MNN1 model**, trained from a seeded
  random initialization on Mitchell's own classical search. MIT project licence.
- Architecture: 768 sparse piece-square features, shared 32-neuron hidden layer
  per colour perspective, clipped ReLU, and an antisymmetric scalar output.
  Black's perspective swaps piece colours and flips ranks. There is no borrowed
  binary format. `MNN1` specifies a 16-byte little-endian header and signed int16
  biases, embeddings and output weights, with explicit quantization scales.
- The model predicts a correction bounded to **+/-150 centipawns** to the existing
  classical evaluation. This is a hybrid bootstrap, not a replacement for the
  entire classical evaluator. At four pieces or fewer, the original evaluation
  and exact KPK draw guidance are used unchanged.
- Lazy per-ply accumulators update captures, promotions, en passant, castling and
  null moves, and restore on undo. Illegal move generation is never delegated to
  a network. Position legality remains the existing engine's responsibility.
- `engine/mnn-kernel.wat` and the compiled **349-byte WASM SIMD kernel** are new
  original code. The module has no imports; the HTML embeds it. Numerically
  equivalent scalar JS runs when WASM/SIMD is unavailable. No runtime compiler,
  library, network, separate model file or engine download is required.
- The earlier MCE features remain available as a separate ablation mode. The
  zero-weight entropy/ring features are skipped in its hot evaluation path,
  while raw feature extraction remains identical for tuning and replay checks.
- Advanced classical and neural searches share validated staged TT-move ordering.
  Modes have separate TT contexts. Earlier beginner noise/depth presets remain.
  The production strength target is not satisfied by these implementation steps.

The candidate HTML defaults to the experimental original neural mode at levels
51-65 so the archived candidate can be reviewed. The UCI bridge adds `Evaluation`
choices `auto`, `full`, `mce`, `mnn` for controlled ablation. Both match sides use
the same search and runtime when only the neural correction is disabled.

## v1.1 submission audit

The exact supplied ZIP and source are preserved as `submitted-v1.1.zip` and
`submitted-v1.1.js`. `prototype-audit.json` records reproducible blocking defects:
zero moves in a kings-only position with five legal king moves, six illegal
pinned-knight moves, and a score bonus when an enemy piece approaches its own
king. Castling, en passant and promotions are also absent from that source.
The supplied test prints success without assertions. It is not used as a legal
engine or rating opponent. The existing legal Mitchell engine is the foundation;
the submitted code remains historical input evidence only.

```sh
node scripts/audit-mce-prototype.cjs validation/mnn/submitted-v1.1.js
```

## Data and original training

Self-play: **100 games at nominal 40 ms per move**, two simultaneous games, no
book, using only Mitchell's original classical evaluation/search. There were
**98 terminal outcomes and two unfinished games at a 400-ply limit**. Unfinished
games were not labelled as draws. This model uses finite search-score labels,
so valid samples from unfinished games are retained without invented outcomes.

Every second eligible ply after ply 12 was sampled, outside check. The dataset
contains **6,476 replay-verified samples**, including original static scores,
search scores/depths and five deterministic constraint features. Training excludes
samples with fewer than three completed search plies, mate scores, and positions
with four pieces or fewer. These filters are unrelated to whether a game was won.

Starting openings are the frozen repository 50-position EPD. Split by opening:
indices 0-34 train, 35-44 validation, 45-49 final test. Exact child-position
duplicates (first four FEN fields) are removed from later splits, and repeated
starting openings cannot cross splits. Initial split sizes after filtering and
deduplication:

| Split | Unique positions | Baseline residual MSE, cp^2 | Quantized model MSE, cp^2 |
| --- | ---: | ---: | ---: |
| Training | 3,834 | 6,420.88 | 5,686.75 |
| Validation | 1,035 | 6,521.79 | 6,385.22 |
| Final test | 501 | 6,652.27 | 6,385.89 |

The target is the own-search white-relative score minus the own-classical static
score, clipped to +/-150 cp. The baseline predicts zero correction; these metrics
are NOT full chess-score errors, game scores, Elo, or comparisons to Leorik.
The quantized model lowers validation error about **2.1%**, final-test error about
**4.0%**. Final-test labels were assessed only after model selection was complete.
No further architecture or weights were selected using those final-test results.
Future tuning requires another untouched final test set.

`train-mnn.py` implements the sparse-feature model's training with NumPy and
original backpropagation/Adam code: Huber residual loss, L2 regularization,
128-position batches, fixed seed 7181, up to 80 epochs, and 12-epoch patience.
The validation-selected model is from **epoch 1**; later epochs overfit rather
than improving validation. This dataset is still small relative to the model.
Training uses no external engine, neural checkpoint, or labelled chess dataset.
NumPy is a separately installed general development tool, not part of the game.

The frozen teacher HTML, generator, trainer, dataset, input manifests, all epoch
metrics and model SHA are archived. Actual model SHA-256:
`3dd72fef28e46b15fb261f386e314db326bd9ca28f7eb7638b000e75c77d3f01`.
Teacher HTML SHA-256:
`c2dce58f00b59dd6a4ea1a7603ed1e69b939e12bd774e7309323f9277fdb3a5e`.
That teacher contains the earlier original MCE implementation but the generator
explicitly sets all high-level search presets to classical `full` evaluation.
The MCE fitted weights and the new network are not used to generate these labels.

## Completed fresh matches

From the original-neural candidate's side:

| Opponent | Nominal time/move | Games | Wins | Draws | Losses | Forfeits |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Same Mitchell engine, neural correction disabled | 250 ms | 8 | 2 | 3 | 3 | 0 |
| Native Leorik 3.1.3 | 1 s | 4 | 0 | 0 | 4 | 0 |

All twelve games ended normally. Four colour-reversed opening pairs (46-49,
one-based EPD numbering) were used for the classical ablation; two pairs (46-47)
for Leorik. The model was frozen before these games. These openings were outside
training/validation and are the same opening pool as the final position test;
position-test and match results are not independent samples of a rating scale.

Both campaigns overlapped on a shared Linux host with four-core CPU quota,
16 GiB memory limit, Node v24.22.1 and external Fastchess 1.8.2-alpha f618e34.
Each game used one engine thread, no books/pondering/external tablebase files,
no score-based resignation/draw adjudication, no move-limit draws, and equal
250 ms scheduling grace. Built-in endgame knowledge remains enabled. Mitchell
reserves 20 ms inside its move allowance. Leorik uses Hash 32/Threads 1/
Temperature 0; Mitchell uses its existing approximately 36 MB TT. The relatively
large scheduling grace, shared host and tiny samples are unsuitable for a rating.
Actual move times, nodes, starting FENs and termination reasons are in PGN.

Leorik is an independently installed test opponent only. Its official Linux 3.1
release package identifies as **Leorik 3.1.3 PEXT**. Release asset, binary and
network hashes match the provenance in [the earlier MCE report](../mce/README.md).
Neither that executable nor its network is distributed here or used for training
or game play. Native UCI handshake is retained in `leorik-uci.txt`.

These results do not demonstrate an improvement over the classical ablation,
previous production engine, or 3000+ strength. They also are not statistically
conclusive proof of a regression. `decision.json` records the non-promotion.
Keep this result set separate from all earlier MCE, borrowed-network and hash-fix
matches. No absolute Elo can be assigned from this experiment.

## Performance evidence

`performance.json` records a three-repeat, fixed-position make/evaluate/unmake
microbenchmark. Median throughput was approximately **65k evaluations/s with
SIMD versus 31k scalar**, about **2.1x for this neural evaluation path**. Classical
full evaluation was about 78k/s. Checksums agree between scalar and SIMD.
This is neither a whole-engine 2x speedup nor evidence of an Elo gain. Search
visits different trees with different evaluations, and the host is shared.

```sh
node scripts/bench-mnn.cjs /tmp/mnn-performance.json
node scripts/bench.cjs index.html 6 full
node scripts/bench.cjs index.html 6 mnn
```

No faster whole-engine search/WASM port is claimed. Further profiling and a much
larger original dataset with deeper labels remain necessary before that work
can be justified as a route to the requested strength.

## Rebuild and repeat

Only the checked-in HTML is needed to play. For developer checks use Node 24,
Python 3.12 and NumPy 2.3.5 for the closest training reproduction. The HTML,
model and kernel are all MIT; the project LICENSE and original visible notice
remain. General compilers/training tools are installed separately.

```sh
node scripts/embed-mce.cjs
node scripts/embed-mnn.cjs engine/mitchell.mnn
node scripts/test.cjs
node scripts/test-mce.cjs
node scripts/test-mnn.cjs
node scripts/test-mnn-data.cjs
python scripts/test-mnn-training.py
node scripts/test-hash-moves.cjs
python scripts/test-campaign.py
node scripts/browser-test.cjs
```

The optional browser test requires separately installed Playwright/Chromium. It
checks offline operation, worker legality, heartbeat/cancellation, all 65 levels,
38 lessons, computer-vs-computer and the original MIT notice. In this environment
Chromium needs the permitted network/socket sandbox profile to launch.

`test-mnn.cjs` covers independent full rebuilds, incremental deltas, all promotion
pieces, null moves, castling/en passant, stack growth, colour symmetry, scalar /
SIMD / absent-WASM agreement, malformed models, exact KPK fallback and legal
short-deadline moves. It also checks 256 independent NumPy reference scores.
`test-mnn-data.cjs` replays the games and verifies every sample and static label.

To repeat the exact fit from archived data:

```sh
gzip -dc validation/mnn/selfplay.jsonl.gz > /tmp/mitchell-selfplay.jsonl
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python validation/mnn/trainer-used.py /tmp/mitchell-selfplay.jsonl --manifest validation/mnn/selfplay.manifest.json --out /tmp/mitchell-repeat
```

The recorded environment reproduces the exact model bytes. Other floating-point
backends/hardware may differ; inspect any mismatch rather than silently accepting
it. `test-mnn-training.py` performs this repetition and checks input/model hashes.

To generate a NEW dataset with original labels:

```sh
node scripts/selfplay-mce.cjs --html index.html --out /tmp/mitchell-new.jsonl --games 100 --ms 40 --plies 400 --sample-every 2 --concurrency 2
OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 python scripts/train-mnn.py /tmp/mitchell-new.jsonl --out /tmp/mitchell-new-fit
```

Output directories are never overwritten. More games are supported, but the
50-opening split and current teacher are bootstrap limits; scale opening diversity,
label depth, deduplication and provenance as well as count. Reusing the same final
set repeatedly invalidates its status as untouched. Neither script embeds or
promotes a model automatically.

To rebuild the original kernel after editing WAT, install WABT separately, e.g.:

```sh
npm install --prefix /tmp/mitchell-tools wabt@1.0.39
WABT_MODULE=/tmp/mitchell-tools/node_modules/wabt node scripts/build-mnn-kernel.cjs
node scripts/embed-mnn.cjs engine/mitchell.mnn
```

For fresh matches use `scripts/prepare-benchmark.py --working-tree` and independently
installed Fastchess/opponents, as documented in [tests](../../tests). The saved
campaign manifests specify exact clock, opening starts, options and input hashes.
A native Leorik opponent JSON can be made as in the earlier MCE report. To repeat
the classical ablation, use Node as opponent `command`, the frozen `adapter/uci.cjs`
as its Fastchess `args=` argument, and `option.Evaluation=full`; candidate `auto`
uses MNN. Both sides inherit the frozen `MITCHELL_HTML`. Use eight games at .25 s
and opening start 46, or four native-Leorik games at 1 s and opening start 46.

Each match directory contains PGN, original JSON configs/argv/checkpoints/status,
compressed complete referee logs, exact EPD, summary and SHA-256 manifest. Absolute
paths are historical records; replace them when preparing a new run. Candidate
inputs were frozen before commit and are marked as working-tree inputs with
exact hashes. `candidate.html.gz` preserves the exact tested HTML. No warnings,
losses or abnormal outcomes were discarded. The runner remains the existing
original `scripts/independent-campaign.py`, with automatic fault pause.

Before merging: a competitive, calibrated independent pool at documented playing
controls, enough paired games with uncertainty, and a demonstrated 3000+ result
plus no material production regression are still required. This first complete
original-neural pipeline cycle does not satisfy that gate.
