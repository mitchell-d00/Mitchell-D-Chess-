# UI improvements handoff

## Scope and constraints

User authorized all three bundles in order on November 5, 2026:

1. FEN/PGN import and shareable position links.
2. Onboarding, mobile usability and keyboard accessibility.
3. Named local saves and post-game analysis.

Worktree: `/workspace/Mitchell-D-Chess-ui`, branch `ui/offline-tools`, based on
public `main` revision `09d136d2105eed46b18f0683fc0412ee14ea2479`.
The independent engine research branch is NOT part of this work. The original
`engine-src` script, neural weights, MIT notices and Leorik credit must remain
byte-identical. Preserve the single HTML / offline / Web Worker design, all
65 levels, 38 lessons, clocks, FIDE rules and computer-vs-computer.

## Progress

- [x] Audit current UI: clickable SAN moves, resign confirmation, promotion
  palette, lesson progress and thinking indicators already exist.
- [x] Pass 1: validated FEN/PGN import and shareable positions.
- [x] Pass 2: onboarding, responsive/touch polish and keyboard board access.
- [x] Pass 3: local named saves and post-game worker analysis.
- [x] Final regression checks and documentation.
- [x] Publication (tracked below).

## Decisions

- Build imports transactionally: invalid input must not destroy the current game.
- Imported positions/games open for review without starting clocks or AI.
- Keep parsing outside the immutable chess engine source.
- No server, account, external runtime library or service worker dependency.
- Save records must be versioned, bounded and validated before restoration.
- Analysis is an estimate from this unrated engine, with explicit time budgets;
  never present score differences as a calibrated accuracy or Elo measurement.

## Handoff convention

The pass entries below are chronological checkpoints; their “Next” notes describe
the next action at that checkpoint. The latest status is at the end of this file.

For each pass, append changed files, checks run/results, design constraints,
known limitations and the exact next step. Do not mark unfinished checks passed.

## Pass 1 completed

Files: `ui/position-tools.js`, its embedded `position-tools-src` script and UI
integration in `index.html`, `scripts/embed-ui.cjs`, parser/browser tools tests.

Implemented strict FEN validation, annotated PGN main-line import from paste/file,
transactional error handling, disposable import workers, review without clock/AI,
position sharing via URL hash, and playing a new game from a displayed position.
Custom-FEN searches and hints now use the actual starting FEN. PGN exports and
SAN move rows preserve Black-to-move starts and original full-move numbers.

Verified: `node scripts/test-position-tools.cjs`, `node scripts/test.cjs`, and
`node scripts/browser-tools-test.cjs` (Chromium with network/socket sandbox
permission, page offline). Includes malformed inputs, castling/en passant/
underpromotion, main-line variations, paste/file, inert header text, shared links,
custom starts and export round trips. Engine SHA remains
`61d257391bf643dedc2bf4d561a9e7c34d1d9ce6d52f822dd70431b8c1143bea`.

Limits: one standard-chess PGN, 256 KB, 1,024 half-moves; variations/comments are
not retained. Shared links contain positions, not entire PGNs. A shared file://
position uses the public game URL; importing FEN works entirely offline.
Fresh-page links load for review; hash changes in an existing game request import
confirmation rather than silently discarding it.

Next: pass 2. Add keyboard board navigation with shared touch-move logic, square
ARIA labels, modal focus handling, quick guide/credits visibility, contrast and
mobile targets/layout. Keep the engine script unchanged.

## Pass 2 completed

Files: `index.html`, `scripts/browser-accessibility-test.cjs`.

Added dismissible first-visit tips and a reusable guide; visible source/credits
links; compact mobile header; collapsible setup; labelled 8x8 keyboard grid with
roving focus; arrows/Home/End/Enter/Space/Escape and touch-move enforcement;
keyboard promotion; labelled tabs with arrow navigation; modal focus trap/return;
44px mobile controls; short-landscape layout; high-contrast/blue-sand palettes;
reduced-motion support and live status announcements. Existing pointer and
keyboard paths share the same legal moves and official touch locks.

Verified: `node scripts/browser-accessibility-test.cjs`, rerun after inspecting
portrait/landscape screenshots; `node scripts/browser-tools-test.cjs`; parser and
engine regression checks remain passing. Browser tests cover 64 labels, roving
focus, keyboard e2-e4, FIDE lock/Escape, flipped arrows, knight underpromotion,
modal containment/restoration, persistent tips, contrast, tab keys, viewport
width and target size. Screenshots: `/tmp/chess-mobile-ui.png`,
`/tmp/chess-landscape-ui.png`. Engine source remains byte-identical.

Next: pass 3. Implement versioned bounded local saves with explicit failure
reporting and safe paused restoration; new-game replacement confirmation;
post-game/review analysis using the existing worker, cancellable progress,
move alternatives and a clickable evaluation graph. No server or Elo/accuracy
claims. Finish all regressions, README/tests documentation and publication.

## Pass 3 completed

Files: `ui/game-library.js` (embedded via `scripts/embed-ui.cjs`), `index.html`,
`scripts/test-game-library.cjs`, `scripts/browser-library-analysis-test.cjs`, and
updated browser/tools/accessibility checks. README, tests and
`validation/ui-update.md` describe the user-facing behavior and limits.

Added 20-slot versioned local library, named new saves/explicit updates/deletes,
quota/error feedback, legal replay before replacement, paused restoration of
clocks/player settings/rules/history/view/touch locks/draw offers, and explicit
Resume. Added accessible New Game and resignation confirmations. Restored games
cannot move or charge elapsed closed time before Resume. Saved analyses are
intentionally omitted; rerun review after loading.

Post-game/import review runs finite 100/250/500ms searches in the existing worker,
with progress, cancellation, stale-token isolation, alternatives, heuristic
"possible" labels, graph and move navigation. History is replayed for repetition
status. Mate and insufficient/shallow searches are treated separately; graph gaps
mean no completed evaluation. No accuracy/Elo claim is made. Analysis is disabled
during active games, including FIDE games. Hints/lesson searches now handle worker
cancellation without unhandled rejections.

Verified during implementation: storage unit tests, parser tests, original browser
regressions, offline save/analysis integration including actual worker searches,
paused official clocks and persistent touch lock, reload persistence, corrupt
saved-move rejection and cancellation/stale results. Accessibility additionally
checks real touchscreen e2-e4. Final full-suite output will be recorded in
`validation/ui-checks.json`; do not infer it passed until that file is complete.

Next: final full regression run and engine/licence byte comparisons, mark final
status, then publish the UI-only commits. The research branch must stay separate.

## Final verification completed

All 10 final commands passed; exact commands, UTC timestamps, outputs and exit
codes are committed in `validation/ui-checks.json`. The suite covers the original
engine/neural/hash/campaign/browser checks and all new offline UI checks. Exact
engine-script and licence-disclosure comparisons against base main passed.
Portrait, landscape and game-review screenshots were inspected.

Implementation checkpoints: `b846480` (position tools), `edc17d3` (accessibility),
`16e11f6` (saves/review). The UI does not incorporate the engine research branch.

Next: publish `ui/offline-tools`, merge the reviewed/tested UI changes to main,
and record the publication link/status here. No engine strength claim is added.

## Publication completed

Merged to main through [PR #1](https://github.com/mitchell-d00/Mitchell-D-Chess-/pull/1),
merge commit `a7fd4ee0ea95464c8be4b01e578eac8b897dd52d`. All three UI passes and
the complete regression artifact are included. This final documentation-only
checkpoint records the actual merge rather than an intended action.

For future changes, edit the UI modules and run `node scripts/embed-ui.cjs` before
committing the standalone `index.html`; rerun the applicable documented checks.
The separate engine candidate still has no approval to replace the public engine.
Do not reinterpret these UI results as an engine-strength benchmark.

## Follow-up: visible sharing, clearer review and teaching cues

User requested visible copied links, richer review, mobile stress checks and short
“why this move?” explanations. Branch `ui/share-review-explanations` starts from
public main `3c47e42`; no engine research is included.

- Share opens a persistent URL dialog, selects the URL, reports copy success or
  failure, and supports repeat/manual copy without losing the link. Closed-dialog
  clipboard callbacks cannot overwrite a later dialog.
- Review adds labelled axes and score text, a current-position guide, keyboard
  graph navigation, SAN/coordinates and toggleable board arrows. Recommendations
  are derived from the displayed position, including when flipped. Terminal
  positions have no arrow. The original review uncertainty/gap handling remains.
- Original MIT `ui/move-explanations.js` is embedded by `scripts/embed-ui.cjs`. It
  describes verified move features without search: mate/check, captures, en passant,
  promotion, castling, direct multi-piece attacks, development, central pawns and
  open files. Other moves get a factual from/to description. No claim of engine
  intent or winning material. Lessons can reveal their accepted target move and
  existing hint; casual levels 1–20 explain the last displayed move or hint. No
  coaching during official play. Cues are not stored in named saves.
- Stress checks exposed tablet buttons below 44px and edge-file promotion overflow.
  Tablet/coarse-pointer controls now retain 44px targets; promotion buttons do too,
  with the palette constrained inside the board. Portrait/landscape screenshots
  were inspected, and graph labels use HTML so they remain readable at narrow widths.

Changed files: `index.html`, `ui/move-explanations.js`, `scripts/embed-ui.cjs`,
`scripts/test-move-explanations.cjs`, `scripts/browser-polish-test.cjs`, README and
`tests`. Final commands/results are recorded in `validation/ui-polish-checks.json`.

Verification complete: all 12 commands passed. New browser cases also cover a
late clipboard callback after a dialog closes, graph selection via touch, and
re-enabling lesson explanations after a wrong attempt resets. Cues are tied to
the game token, displayed position and ply to prevent stale explanations. Exact
engine/licence comparisons and `git diff --check` passed.

Published through [PR #2](https://github.com/mitchell-d00/Mitchell-D-Chess-/pull/2),
merged as `74c975823bfb050dfe037d7154c4f90270f424da`. All 12 check results are
included. No engine replacement or new strength claim is part of this change.

Next maintainer: update `ui/move-explanations.js` and re-embed before committing
`index.html` when changing teaching cues. Keep observed features separate from
claims about move quality. Reproduce the UI checks listed in `tests`; the separate
engine candidate remains subject to its existing qualification requirement.

## Follow-up: visible pause/resume and comfort ideas

User requested clearer pause/resume and a brainstorm of player comforts. Branch
`ui/visible-pause-resume` starts at main `5152cc8`; engine and licence text must
stay unchanged. Only pause/resume is implemented here. Other comfort proposals
are documented, prioritized and explicitly labelled unbuilt in COMFORT-IDEAS.md.

- A primary control sits above the board, or at the top of the side panel in
  short landscapes. Text/icon, a highlighted paused state and explanatory status
  distinguish Pause game from Resume game. All casual modes support it, including
  untimed human play. Save for later opens the existing named-save dialog.
- One guarded transition charges elapsed play before pausing, stops the worker,
  invalidates delayed AI/hint callbacks, clears pending input/selection and prevents
  moves/takebacks. Resume returns to the latest position, retaining clock time and
  remaining delay. It restarts AI search instead of continuing background work.
- Official games cannot be paused, including CVC. A restored official game still
  starts paused and can resume, preserving its touch-move lock; pause is then
  unavailable. Existing review/finished/lesson screens hide the session control.
- The landscape control uses the rail area rather than pushing the board off the
  screen. The compact landscape control omits Save for later; Saved games remains
  in the rail. No new keyboard shortcut or automatic tab/background pause is added.

Files: index.html, scripts/browser-pause-test.cjs, COMFORT-IDEAS.md, README and
`tests`. The new integration check exercises real worker/hint cancellation,
clock/delay continuity, saved official state, keyboard/touch and mobile layouts.
All 13 final commands passed; exact commands, timestamps, outputs and exit codes
are committed in validation/pause-checks.json. Engine/licence comparisons and
`git diff --check` passed. Portrait/landscape screenshots were inspected. Actual
touch pause/resume, an in-flight long search, a delayed book move, cancelled hints,
paused takebacks and an official saved-game touch lock are covered.

Published through [PR #3](https://github.com/mitchell-d00/Mitchell-D-Chess-/pull/3),
merged as `ed2a73f30748accf48d9e99501784c80dbc00ff4`. All 13 results and the
comfort brainstorm are included.

Next maintainer: keep Pause and restored-game Resume using the shared guarded
transitions, preserve remaining clock delay, and invalidate worker callbacks when
pausing. Suggested next comfort work: recovery slot, focus layout, then granular
audio/clock alerts. These remain proposals, not unfinished authorized work.

## Measured build / SIMD upgrade

Latest request explicitly authorizes engine-performance changes, modular source
output and renewed strength measurement. This supersedes earlier UI-only byte
identity requirements for engine code; it does not authorize losing features,
changing model provenance or inventing ratings. Branch: `engine/measured-build-simd`,
based on main `762c8ae`. This is separate from the unqualified Mitchell-only engine
research branch and keeps the credited Leorik network.

- First extracted the old artifact into ordered sources and verified byte-for-byte
  reproduction before any functional change. `src/build.json` orders engine/app
  fragments; template/styles/lessons and UI helpers are separate. `scripts/build.cjs`
  has no external build dependencies and packages one offline HTML. The exact MIT
  network is pinned locally; no rebuild download. Legacy embedders/generators now
  update canonical sources and rebuild rather than leaving the artifact stale.
- Expanded original WAT/WASM 405→1,206 bytes: bounded 256-frame cache, fused move
  transitions and direct frame scoring. JS fallback, special moves, cache eviction,
  backend switching, reference scores and memory growth are checked. Model hash
  remains `794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704`.
- Repeated final benchmarks have identical scores/node counts. Browser medians:
  ~20% faster evaluator and ~3% higher search NPS; Node search flat. Raw output and
  limitations in validation/performance/. No claim of a large NPS or Elo gain.
- Browser clock budgets retain scheduling reserve and actual remaining delay,
  with a shorter planning horizon later in play. UCI one-second protocol unchanged.
  Added book/search/custom-position indicator and a reviewed CC0 replacement tool.
  Opening/endgame data remain unchanged. Removed unsupported tournament-strength
  wording from the final lesson.
- Audited the old paused 58/200 run. A separate frozen baseline screening vs native
  Stockfish 19 completed 12 games: 0W/0D/12L, zero forfeits. Archived every PGN/log
  and replayed all 1,048 half-moves. README and the in-app guide report it honestly.
- Preparation now pins manager/runtime/helper/runner and opponent model inputs.
  The clean modern 200-game campaign will use Stockfish 19 and native Leorik 3.1.3,
  100 paired games each, one second/move, at most two simultaneous games. Do not
  report planned/running games as complete; preserve old and new evidence separately.
- Added pinned development dependencies, CI, CONTRIBUTING.md and 600KiB raw /
  256KiB gzip budgets. The public game still requires no build or dependencies.

Current engine source SHA-256: `f8eeff4baa9e9d719228f4e1d311e79db87110bfa74ed91564899c8c206bbdec`.
Full original/Leorik licence disclosure remains verbatim. Full local suite passed
23 checks, followed by the added focused book-import check; final results are in
validation/upgrade-checks.json. CI and campaign publication remain to be verified.

Next: freeze this candidate commit, cleanly restart/checkpoint the modern 200-game
run, verify push/PR CI, then publish and record exact status. Multiworker search,
more bitbases, multi-PV, puzzles and networking are deferred explicitly in
validation/implementation-scope.md, not silently claimed as implemented.

## Candidate freeze, restart and CI checkpoint

Frozen candidate: `eec0d23da885fad1944cefc232348978d514f16d` (source extraction and
generated release are consecutive commits). Modern run directory:
`/workspace/mitchell-performance/modern-200/`; runner PID 17500 at launch. Exact
protocol is published in validation/modern/protocol-200.json. It uses the frozen
runner.py, immutable engine-under-test.html and adapter/helper copies, so later
documentation changes do not alter an in-flight match.

The snapshot in validation/modern/candidate-checkpoint is **2/200**, dated
`2026-11-05T17:59:07.996898+00:00`, with zero forfeits. Every archived move replayed legally.
It is explicitly incomplete, not a completed strength/rating result. The process
is running in the background; inspect status.json and summary.json for live state.
Do not launch a second runner while campaign.pid names a live process.

Push CI passed: https://github.com/mitchell-d00/Mitchell-D-Chess-/actions/runs/42079323305
PR CI passed: https://github.com/mitchell-d00/Mitchell-D-Chess-/actions/runs/42079520397
Both compiled WAT and checked the generated file before the full suite. The PR is
https://github.com/mitchell-d00/Mitchell-D-Chess-/pull/4. This data-only checkpoint
will trigger a final CI run before merge.

If the environment stops, resume only with the same inputs:
`python /workspace/mitchell-performance/modern-200/runner.py /workspace/mitchell-performance/modern-200/campaign.json --resume`
The binaries/model/runtime must still match their frozen hashes. A new host needs
independently installed dependencies and a newly labelled protocol. To publish a
later checkpoint, use archive-benchmark.py --allow-incomplete into a new directory,
verify-evidence.cjs, and explicitly report its timestamp/completed count. Never
overwrite the historical archive or silently promote an incomplete run.

Next: verify the checkpoint commit in CI, merge the standalone update, and check
Pages. The remaining campaign games continue as authorized long-running work.

## Upgrade publication completed

Merged through [PR #4](https://github.com/mitchell-d00/Mitchell-D-Chess-/pull/4),
merge `0950dddf64fb35d59eeee3df87a5a7f8fb214df6`. Final checkpoint CI passed:
https://github.com/mitchell-d00/Mitchell-D-Chess-/actions/runs/42080097729
https://github.com/mitchell-d00/Mitchell-D-Chess-/actions/runs/42080084832
All 25 checks passed, including the incomplete candidate-evidence archive.

The published candidate checkpoint remains a dated 2/200 snapshot, not the live
count. The separate process at /workspace/mitchell-performance/modern-200 continues
with immutable inputs. Check its status/summary and archive a new dated checkpoint
when reporting later results; do not edit the frozen protocol or combine samples.
The public engine remains unrated. Build/performance/infrastructure changes are
complete; the long-running experiment is explicitly incomplete.

Next maintainer: use src/ and the deterministic build, keep original/Leorik notices
and pinned model hash, and run the relevant checks. CI guards source/artifact and
size agreement. Further search, bitbase, multi-PV or multiplayer work should remain
separate measured changes as described in validation/implementation-scope.md.

## Full Mitchell WASM roadmap — active work

User accepted the six-stage plan (loss regressions, original full WASM port,
controlled search experiments, permissive network comparisons, browser resource
limits and common-endgame work). Branch `engine/wasm-parity-roadmap` starts from
main `8788622`. The independent 200-game baseline keeps running from its frozen
inputs; do not alter them or merge its results with new candidate experiments.

Implemented so far:

- Lazy JS TT allocation saves the UI/referee context its unused 36 MiB search
  table. Searcher allocates on first actual search. Hash-corruption tests now
  observe lazy arrays through test-only getters.
- Original freestanding C++ port under engine/wasm/: 0x88 rules, ordered move
  generation, make/unmake, full 64-bit hash, SEE, original classical/KPK/NNUE
  evaluation, quiescence, pruning, history, TT, iterative search and hard timeout
  restoration. No linked engine, C/C++ runtime or copied GPL code.
- 5,476 initial differential checks pass: perft, random walks/unmake/nulls, all
  eval modes, reference scores, exact fixed-depth scores/moves/node counts,
  repetition history and timeouts. Signed numeric zero is treated numerically
  (+0/-0 have the same chess meaning).
- One embedded WASM module supports 32 MiB default memory (smaller TT) and an
  explicit 64 MiB setting matching the reference TT size. Only a clock function
  is imported. Model and KPK data are passed from existing credited inline data.
- `node scripts/build.cjs --candidate-wasm --output <file>` creates a labelled
  single-HTML experiment; it refuses to overwrite index.html without an explicit
  output. Normal release builds still use JS. Levels below 51 keep the old path.

Compiler setup in this workspace: Debian LLVM 19.1.7 packages extracted under
/tmp/mitchell-llvm (compiler/format/linker only, not distributed). Build:
`LD_LIBRARY_PATH=/tmp/mitchell-llvm/usr/lib/x86_64-linux-gnu WASM_CXX=/tmp/mitchell-llvm/usr/bin/clang++-19 WASM_LD=/tmp/mitchell-llvm/usr/bin/wasm-ld-19 node scripts/build-wasm-core.cjs`.
The compiler generates tables.inc and evaluation.inc from canonical MIT sources.
Output imports only env.clock. Development bridge: scripts/wasm-core.cjs.

Active candidate: /workspace/mitchell-performance/wasm-candidate.html. Do not
promote it based on preliminary NPS (~2x in three Node samples). Next: real
browser candidate/fallback tests, matched games, loss-derived regression suite,
network comparison and exact sparse-endgame experiment. Add reproducible reports
and update the handoff before publication. No rating or promotion gate passed yet.

## Status report checkpoint: completed baseline campaign

The frozen 200-game run completed on 2026-11-05 at 20:14 UTC. Stockfish 19:
0W/7D/93L; native Leorik 3.1.3: 0W/20D/80L. Zero forfeits. These results concern
frozen JS/NNUE candidate eec0d23, not the new full-WASM port. The complete archive
is validation/modern/completed-200 and has been replayed/hash-verified.

The last requested browser-verification tool call was interrupted; its settings
UI edits and test run did not land. No wasm-browser-checks.json exists yet. Do
not claim final browser or match qualification. Original parity run passed 5,476
checks; source/model behavior remains experimental. The candidate has a 32 MiB
default and 64 MiB developer setting, not a verified new settings control yet.
Next: browser/fallback verification, frozen WASM-vs-JS equal-time experiments,
loss regressions and network comparison. All current port work is uncommitted on
engine/wasm-parity-roadmap; the public game still runs the prior JS engine.

## Port checkpoint and strict matched comparison

Full port committed as 3ef7045, strict adapter assertion added in dd1714a. Latest
5,476-check parity rerun passed; report in validation/wasm-port. One actual offline
standalone browser test also passed with the candidate; remaining browser suites
are pending. No settings-UI memory control is claimed.

A 40-game paired comparison at 100ms/move is running from immutable inputs in
/workspace/mitchell-performance/wasm-ablation-strict-40. Candidate default memory
32 MiB uses a smaller TT than the frozen JS baseline. The frozen adapter requires
WASM and faults on fallback, so silent fallback cannot count as a WASM result.
This is relative short-control testing, not an Elo calibration. An earlier
diagnostic pilot in wasm-ablation-40 was stopped to add this assertion; retain
but exclude its results from the strict sample.

The baseline 200-game completion is being published separately through PR #5.
No full-WASM replacement has been merged. Remaining roadmap: complete candidate
browser/resource/fallback gates and matched run, derive loss regressions, compare
permissive networks, validate exact sparse-endgame experiment, then decide whether
any candidate qualifies for promotion.
## Completed 200-game report

The frozen JavaScript/NNUE campaign completed 200/200 games at 20:14 UTC on
2026-11-05. Results: Stockfish 19 0W/7D/93L; Leorik 3.1.3 0W/20D/80L. Zero
forfeits. Full archive in validation/modern/completed-200; all 21,091 half-moves
and archive hashes verified. README, in-app guide and tests now report completed
evidence rather than a running campaign. The older 2-game checkpoint is retained
explicitly as history. No absolute Elo is inferred.

The full-WASM port is separate, uncommitted experimental work in the UI worktree
on engine/wasm-parity-roadmap. It has initial 5,476 parity checks and preliminary
~2x Node speed samples, but is not the engine tested in the completed campaign.
Its first existing offline browser check passed after the interrupted tool call;
remaining browser and matched-game gates are pending. Do not replace the public
engine based on this report. This report-only branch changes no engine source.

## Completed benchmark publication

Merged through PR #5 (74f016fd95cbeb649316eef8a8519a4438006803). The complete
200-game archive and honest README/in-app strength note are now on main; the
public engine code and licences remain unchanged. The full-WASM prototype is
now committed separately on engine/wasm-parity-roadmap (77ae2ae), with 5,476
parity checks, an initial offline-browser pass and a strict 40-game comparison
running. It has not been promoted. Remaining browser/network/endgame experiments
are pending and must not be described as finished.

## WASM SIMD evolution completed — latest status

User requested improving, testing and evolving the new WASM candidate. Work
remains on `engine/wasm-parity-roadmap`; public main is not switched to WASM.
The original Mitchell-only replacement strength gate is still unmet. The
credited MIT Leorik128 network is unchanged; no new training or absolute rating
is claimed.

Implemented original SIMD memory copy/clear and fused neural transitions in
`engine/wasm/mitchell.cpp`. Source core change: e6023b0. The frozen evolution
artifact/adapter is 7144e46, with baseline dd1714a. Versioned LLVM linker PATH
resolution is fixed in the development build. Candidate HTML now enforces its
raw/gzip size budget, and a separate CI workflow compiles, tests and uploads the
single HTML without deploying it. Dedicated worker tests assert native backend,
32/64 MiB memory, no-WASM fallback and compilation-failure fallback. The UCI
adapter resets native TT without unnecessarily allocating the JS search table.

Completed evidence:

- First WASM vs JS: 40 games at 0.1s/move, 20W/19D/1L, no forfeits. Archived
  in validation/wasm-port/v1-vs-js-40; 6,487 half-moves replayed legally.
- Enhanced WASM vs first WASM: 40 games at 0.1s/move, 20W/15D/5L, no forfeits,
  68.75% score; paired bootstrap interval 56.25%–80%. Archived in
  validation/wasm-port/evolution/match-40; 5,934 half-moves replayed legally.
  Same frozen adapter, network, 32 MiB WASM/19-bit TT and one search thread.
  First 20 existing openings reversed by colour, no books, pondering, score
  adjudication or arbitrary move-limit draws. Both require actual WASM.
- Seven alternating Node fixed-depth repetitions: 1.540x median throughput.
  Five alternating fresh Chromium-worker runs: 1.399x. Both use equal memory,
  four positions/depth 11 and identical scores, moves and nodes. These are
  local performance measurements, not an absolute strength calibration.
- 6,013 engine checks (5,476 parity, 524 scalar accumulator stress, 13 sparse
  edge cases), protocol-preparation integration check, 19 core checks, seven
  browser suites and four explicit backend/fallback worker scenarios passed.
- Rejected deferred hash-move generation trial measured 0.940x; reverted. Its
  patch and samples are retained so rejected experiments are visible.

Reports and raw outputs: validation/wasm-port/evolution/README.md and status.json.
The final standalone candidate is
/workspace/mitchell-performance/mitchell-wasm-enhanced.html: 643,122 raw bytes,
246,445 gzip bytes; 55,357-byte core; default 32 MiB / optional 64 MiB WASM.
It only adds main's report-only Guide update to the frozen game artifact; its
engine script is byte-identical to the tested artifact. Normal index.html stays
the JavaScript build. Main's completed 200-game report was merged into this
research branch at 63df5f7; the earlier handoff sections are historical.

Repeat: see CONTRIBUTING.md and scripts/prepare-wasm-match.py, which freeze both
HTMLs and their declared revisions, shared adapter, binaries and settings.
Run the frozen runner, archive with scripts/archive-benchmark.py, then verify
with scripts/verify-evidence.cjs. New tests reject changed networks and existing
output directories. Preserve every completed game and do not combine the two
relative experiments with the independent 200-game baseline.

Next: longer-control independent-opponent screening and broader host coverage;
then isolated search changes, loss-regression corpus and permissive network
comparisons. The optional exact sparse-endgame experiment remains disabled,
despite passing its fixtures, until separately measured. Do not call any
candidate 2500+/3000+ or promote it based on these short relative tests alone.

## User-authorized live upgrade — latest instruction

The user explicitly said: "Let’s upgrade now and rate later." This supersedes
the earlier 3000+ publication prerequisite. Publish the measured improvement;
continue to describe strength as unrated. Do not reapply the old approval gate.

The normal build now embeds full WASM by default for levels 51–65, keeps lower
levels' JS behaviour and worker JS fallback, and preserves the public branding.
Alternate --candidate-wasm/--javascript builds require explicit output paths.
src/build.json controls the default; source modules, index.html and docs are
updated together. Release raw budget is explicitly 700 KiB; gzip stays 256 KiB.
The native core binary, model, search and disabled endgame flag are unchanged.

Local validation: 20 core checks, 6,013 engine cases plus protocol/archive checks,
and all eight browser suites passed. The release UI worker must actually return
backend=wasm for neural search. Tests also cover native 32/64 MiB and unavailable /
failed WASM fallback. Release-level routing checks cover beginner/classical /
neural boundaries and the exact match-tested binary hash. See
validation/wasm-release.md and validation/wasm-release-checks/ for raw results.

Publication uses PR #6 after CI, then verifies the deployed HTML and an actual
neural-level worker move. Preserve MIT/Leorik credits and frozen benchmark data.
Future strength measurement must label the new release separately from the
older JS-only 200-game baseline and the short relative WASM experiments.

## Post-game teaching and reproducible strength measurements

User authorized these next priorities. Branch improve/review-teaching-strength
starts from released main 4bfcb94. The engine script, embedded core and credited
network remain byte-identical to that release; this is an app/tooling update.

Teaching is a separate pure helper in ui/review-teaching.js, embedded by the
normal build. It computes side-correct estimated losses with finite/depth guards,
separates legal mate/stalemate facts, ranks up to three key moments, and gives
played/reply/alternative descriptions plus a practice takeaway. Search estimates
stay labelled as estimates. No accuracy or player rating is generated. Key
moments support White/Black/both focus, Before/After navigation without altering
history, preserved keyboard focus, mobile targets and new-game cache cleanup.

Measurement preparation now pins required WASM/core/model identities, refuses
legacy adapters unable to enforce WASM, and freezes non-secret external runtime
settings without permitting MITCHELL_ overrides. report-strength.cjs verifies
hashes/legal PGNs and recomputes W/D/L/paired intervals using repository code,
rejects inconsistent stored summaries, and separates incomplete runs/forfeits.
Use npm run strength:prepare and strength:report; complete commands and a
200-game profile are in validation/strength/PROTOCOL.md.

Completed independent pilot of the released 4bfcb94 engine: 12 games at 1s/move,
native Leorik 3.1.3 0W/5D/1L; Texel 1.06 3W/2D/1L; zero forfeits. First three
openings reversed by colour, at most two games at once, one thread each, no
books/score adjudication/move-limit draws. All 1,606 half-moves replayed legally.
WASM was required; inputs were frozen before play. Light development/unit work
ran concurrently; browser/throughput suites were held until completion. Preserve
the exact source/preparer/runtime/configuration, raw logs (including Leorik PV
warnings), PGNs and hashes in validation/strength/release-pilot-12. This is a
small protocol pilot, not an absolute rating or a completed 200-game campaign.

See validation/teaching-strength.md for changes/limits and
validation/teaching-strength-checks for raw checks and exact engine identity.
22 core commands, 9 browser suites, 6,013 engine cases plus protocol/archive
checks passed locally. A focused real-worker teaching flow also passed after
final presentation/cleanup edits. Source/browser tests cover actual tactical
examples, both-side scores, non-finite/shallow values, legal alternatives,
mate/stalemate facts, before/after state, focused moments and mobile/keyboard
behaviour. No external opponent code or binary is added to the game.

Next measurement: select a larger competitive pool and use the documented
200-game profile with repeated colour pairs. Keep controls/revisions separate;
do not transfer CCRL or human FIDE ratings. Existing permission to publish
measured improvements while rating work continues remains in force.

## Level progression audit and fixes — November 5, 2026

User asked to test all levels, particularly the apparent similarity of 50/65.
Branch fix/level-progression starts at public main 40ca6e3. This task explicitly
changes engine level/time policy; the earlier UI-only byte-preservation scope
above is historical. Full native WASM binary and credited MIT network remain
unchanged. The release is still one offline HTML with worker searches.

Found: clock limits collapsed 31–50 into identical settings and 51–65 into
identical settings; unclocked cap fell 60s to 10s at 50/51; level 5 discarded PST,
6 discarded quiescence; noisy beginner searches ignored supplied deadlines.
Fixed: increasing per-level clock shares, monotone caps (36–50:17–30s,
51–65:32–60s), retained evaluation/quiescence, bounded noisy iterative root
search with complete-iteration fallback and actual completed depth. Level 65's
60s maximum and full clock allowance are retained. App displays thinking caps
for clocked moves and WASM/fallback backend labels. Tiny millisecond rounding,
forced/book moves and search randomness can still give identical behaviour.

Tooling: freeze candidateLevel/opponent levels independently, colour-reversed
openings, separately pinned current adapter for historical HTML, correct backend
TT resets, and per-level dispatch assertions. Independent campaign/reporting
remain compatible with historical Mitchell65 datasets. The check runner now
fails on a child-process launch error even if the sandbox returns status zero.

Completed 376 games, zero forfeits, 48,404 legal replayed half-moves:
- Before 40ca6e3: 65 vs 50, 20W/0D/0L at nominal 100ms/move.
- Candidate ee1fcaf: 65 vs 50, 20W/0D/0L; all 64 adjacent pairs, 4 games each.
  Adjacent outcomes: higher leads 29, tied 17, lower leads 18.
- Candidate ee1fcaf: 20-game 1s/move follow-ups: 5/4 16W2D2L;
  11/10 11W1D8L; 16/15 9W2D9L; 38/37 8W5D7L.
These exploratory samples do NOT certify every adjacent level stronger or give
an Elo. In particular 16/15 remains tied and other small comparisons unresolved.
No tuning was performed against the follow-up results. All games and losses
are published in validation/levels, including hashes, raw compressed logs,
commands, settings, intervals and exact repeat instructions. Nominal controls
are equal external ceilings; level-specific allowances deliberately differ.

The final engine-src SHA-256 is
b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4,
identical to frozen ee1fcaf; subsequent UI diagnostics do not change the engine.
Offline browser checks cover real-worker 50/65 budgets and source labels.
10 browser suites and 6,013 native engine cases passed, plus native protocol
and archive checks. 27 core checks passed, including verification of all three level archives.

Next: preserve these archives. A larger fresh-opening adjacent-level study at
longer controls is needed to calibrate unresolved neighbours. Do not describe
monotone resources as proven monotone strength. Publication status is recorded
below after CI and live verification.

## Bullet-clock feedback — November 6, 2026

User supplied a 1+0 screenshot: level 65 White flagged; level 52 Black had
8.2 seconds. Branch fix/bullet-clock-overhead starts at released main 8ffc05c.
The clock win counts; this is not evidence of a rated or strictly ordered ladder.
Found a real UI cost: clocked Fast moves retained a 120ms viewing floor even
in time trouble, and allocation could read a nearly 100ms-old clock tick.

Fixed in 6709812: charge elapsed time before maybeAI allocates, stop on an
expired turn, and remove the viewing hold below ten seconds. Above that
threshold existing clocked limits remain; untimed speed controls are unchanged.
Clocks are never refunded or extended. Engine-src remains byte-identical to
8ffc05c and ee1fcaf (SHA b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4).

Expanded the existing offline level-clock browser test with stale-clock,
zero-viewing-delay and expired-search guards. Focused test and full pause suite
passed before real games. Added optional scripts/browser-clock-games.cjs:
two colour-reversed 65/52 games using actual offline browser workers, clocks,
normal book, casual rules, Fast speed and 1+0. It saves every PGN, clock trace,
HTML/runner hashes and host/runtime identity, refuses overwrites and verifies
PGN legality. This optional long experiment is not added to normal CI.

Before release 8ffc05c: 65 White flagged at 240 half-moves, 52 retained
10.165 seconds; reversed colours ended in stalemate at 141 half-moves,
65 retaining 8.731 seconds. Actual clocks reproduce the reported class of loss.
No score or move-limit adjudication, at most two browser games at once on a
shared host. Browser/throughput tests were held while these games ran.
Detailed final results and repeat instructions: validation/clock-management.
A no-increment game can still flag after this fix; outcomes from this small
integration sample must not be presented as a strength gain or an Elo.

Fixed-app sample: 65 White drew by insufficient material at 219 half-moves
with 1.348 seconds left; 65 Black still flagged at 295 half-moves, opponent
retaining 4.419 seconds. Both versions thus scored one draw/one clock loss for
65. Publish this negative result alongside the regression fix. All four PGNs,
895 half-moves, replay legally; archive verifier also checks hashes, summary
consistency and monotone no-increment clock traces.

The new stale-clock regression fails on the previous HTML as expected and
passes on the fixed HTML. The full 37-command existing core/browser suite
passed, plus the newly added static clock-archive check (now in the core suite).
The native engine source is unchanged, so its earlier 6,013 parity cases remain
applicable; normal compilation CI verifies the release again. Check records
are retained in validation/clock-management/checks. Next: publish this bounded
UI correction and retain the flagged candidate game; improving bullet results
beyond this requires a separate, larger clock-aware time-management study.
