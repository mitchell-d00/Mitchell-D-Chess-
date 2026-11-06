<p align="center"><img src="logo.svg" width="96" alt="Mitchell D Chess logo"></p>

# Mitchell D Chess

A complete chess game in a single HTML file. Play the computer at 65 levels
from beginner through neural analysis, play a friend on the same screen, or watch two
computers play each other. A 38-lesson tutorial takes you from how the pieces
move to master-level strategy.

It is free, with no ads, purchases or sign-up, and because it is one HTML file
it also runs offline once saved.

## Play

Open `index.html` in any browser. There is nothing to install or build.

To put it online, turn on GitHub Pages for this repository (Settings → Pages →
deploy from the `main` branch, root folder). The game will be served at
`https://<your-username>.github.io/<repo-name>/`.

Settings, setup choices and tutorial progress are saved in the browser.

See [tests](tests) for published results, raw game records, correctness checks,
and portable commands to repeat the experiments. The engine remains unrated. A completed **200-game benchmark at 1 second per
move** scored **0W–7D–93L against Stockfish 19** and **0W–20D–80L against native
Leorik 3.1.3**, with no forfeits. These results apply to the frozen JavaScript/NNUE
engine, and do not establish an absolute Elo. All games, conditions and repeat
commands are in [modern benchmark evidence](validation/modern/README.md).

Levels **51–65 now use the improved full Mitchell WASM engine**, with automatic
JavaScript fallback. The release remains one offline HTML file and is still
unrated. See [the rollout and validation record](validation/wasm-release.md).

A completed **12-game independent pilot of the WASM release at 1 second/move**
scored **0W–5D–1L against native Leorik 3.1.3** and **3W–2D–1L against Texel
1.06**, with zero forfeits. Six games per opponent is a protocol screening,
not an absolute rating. [Verified results](validation/strength/RESULTS.md) and
[repeat commands](validation/strength/PROTOCOL.md) include every game and setting.

The level ladder now uses increasing clocked thinking allowances and removes
three configuration reversals. A **376-game level audit** found level 65 beat
level 50 **20–0 before and 20–0 after** the changes at a nominal 0.1 s/move.
All 64 adjacent pairs were screened; several remain statistically unresolved,
including a tied 20-game level-16/15 follow-up. These results do not certify a
strictly ordered or Elo-rated ladder. [Results and repeat commands](validation/levels/README.md).

## What is in it

- **Full rules.** Castling, en passant, promotion, check, checkmate, stalemate,
  threefold repetition, the fifty-move rule and insufficient material.
- **65 computer levels in 9 tiers.** Levels are accessibility presets, not verified Elo ratings.

  | Tier | Levels | How it plays |
  | --- | --- | --- |
  | Beginner | 1–5 | Random moves, then one or two moves ahead with many mistakes |
  | Novice | 6–10 | Develops pieces, sees simple threats, starts using openings |
  | Club | 11–15 | Full positional judgement, three to four moves deep, few mistakes |
  | Intermediate | 16–20 | No deliberate mistakes from level 17; deeper search from level 19 |
  | Expert | 21–25 | 1.2 to 2.6 seconds a move with advanced pruning |
  | Master | 26–30 | 3 to 6 seconds a move |
  | Grandmaster (legacy names) | 31–35 | 7.5 to 16 seconds a move |
  | Analysis | 36–50 | Original classical evaluation, 17 to 30 seconds a move |
  | Neural | 51–65 | Trained MIT NNUE evaluation, 32 to 60 seconds a move; unrated |

- **Three modes.** You vs computer (as White, Black or random), two players on
  one device, and computer vs computer with separate levels, a speed setting
  and pause.
- **Visible pause and resume.** A large control beside the board works in all
  casual modes, with or without a clock. Pausing stops clocks, moves, hints and
  computer thinking; Resume continues at the latest position without refilling
  per-move time or delay. A highlighted paused state offers Save for later.
  Short landscape screens place the control at the top of the side panel so the
  board still fits. Official games show why pause is unavailable; a loaded saved
  game starts paused and can be resumed once before normal official play continues.
- **Clock-aware computer play at every level.** The computer keeps time for
  long games, shortens searches under pressure and adapts its safety margin to
  observed browser delays. Increment, remaining delay and per-move clocks are
  handled separately. The status shows its saving-time or emergency mode.
  Completed moves have no viewing hold below ten seconds; clocks still run
  normally and flag falls count. Untimed limits are unchanged.
  [Policy, checks and repeat method](validation/clock-aware/README.md).
- **Chess clocks.** Bullet (1+0, 1+1, 2+1), blitz (3+0, 3+2, 5+0, 5+3),
  rapid (10+0, 10+5, 15+10, 25+10) and classical (30+0, 30+20, 60+30, 90+30),
  a per-move timer (10, 30 or 60 seconds a move), or a custom control with
  separate minutes for each side and a bonus as increment or delay. The
  computer manages its own clock.
- **Official rules mode (FIDE Laws of Chess).**
  - Touch-move: once you pick up a piece that can move, you must move it.
  - No take backs, hints or evaluation bar.
  - Draws by threefold repetition or the fifty-move rule must be claimed by
    the player to move. They become automatic at fivefold repetition or after
    75 moves.
  - Stalemate and dead positions are automatic draws.
  - Running out of time loses, unless the opponent cannot possibly checkmate,
    which makes it a draw.
  - Draw offers and resignation. The computer claims draws and accepts or
    declines offers based on its own evaluation.
  - Promotion always asks which piece you want.

  Casual mode keeps take backs and hints, and ends repeated or fifty-move
  positions automatically.
- **Tutorial.** 38 lessons: how each piece moves; check, checkmate and special
  moves; opening principles; tactics like forks, pins, skewers and smothered
  mate; endgames you play out against the computer; and master ideas like
  outposts, pawn structure, candidate moves and prophylaxis. The final exam is
  beating level 18 from the start.
- **Your colours.** Light, dark or automatic theme. 8 board colour sets and
  6 piece colour sets, plus colour pickers for any custom colours.
- **Tools.** Take back, hint arrow, flip board, draw offers, resign, step
  through earlier moves, an evaluation bar, and copy the game as PGN (with
  time control) or the position as FEN.

## Positions, saved games and review

**Why this move?** is available in interactive lessons and casual human-versus-
computer games at levels 1–20. In play it explains the last displayed move; in a
lesson it can reveal the target move or discuss the last move with the lesson's
hint. Cues describe verified board features such as check, captures, promotion,
castling, development and forks. They are short teaching observations, not the
engine's internal reasoning, a guarantee of a good move, or another search. They
are unavailable during official play. Casual lower-level hints also show cues.


- **Import FEN / PGN** accepts pasted text or a local file. It validates the whole
  position/main line before replacing the game and opens for review without a
  clock or computer moves. One standard-chess game, up to 256 KB / 1,024 half-moves;
  comments and variations are skipped. Custom starts and Black-to-move numbering
  are preserved when exporting PGN.
- **Share position** copies a link to the displayed FEN and keeps a visible URL
  dialog open, with Copy again and a manual-copy fallback when clipboard access
  is unavailable. Opening it loads a review
  position. A hash change in an existing game asks before replacement. From a
  saved local HTML, the link points to the public game; FEN import itself works
  entirely offline.
- **Review navigation** shows labelled White-perspective pawn scores, a current-
  position marker and a suggested move with SAN, coordinates and a board arrow.
  Toggle arrows off, flip the board, tap the graph or use its Left/Right/Home/End
  keys. The recommendation always belongs to the displayed position. Scores are
  capped at ±8 in the plot; the text retains the score or identifies mate/no
  completed evaluation. Terminal positions have no suggested move.
- **Saved games** keeps up to 20 named games in this browser, with explicit update
  and delete controls. A load is validated first and always starts paused, keeping
  clocks, player levels, rules, move history, touch-move locks and draw offers.
  Resume starts at the latest position without charging time spent closed.
  Storage failures are reported; export PGN for a portable backup. Browser/site
  data is local and can be cleared. Analysis results are not stored in saves.
- **Game review** is available after a game or for imported review records. Choose
  0.1, 0.25 or 0.5 seconds per position; cancel at any time. The worker supplies
  estimated evaluations, alternatives and a clickable graph/move list. Labels
  such as “possible mistake” use heuristic score-change thresholds, not calibrated
  accuracy or Elo. Mate and shallow-search cases are distinguished. Graph gaps
  mean no completed evaluation. The engine remains unrated.
  **What to work on** highlights up to three key moments, with a White/Black
  focus selector and practical takeaways. Select a moment to revisit the position
  before the move, compare it with the played move, inspect the opponent's reply,
  and read factual descriptions of the suggested alternative. Immediate mate
  and stalemate facts are distinguished from estimated score losses; shallow
  searches do not receive confident mistake labels. This review does not assign
  a player rating or an accuracy percentage.

The quick guide explains play/learn, levels, clocks, colours and keyboard controls.
First-visit tips can be dismissed. Source and full MIT/Leorik credits are visible
from the header. Setup can be collapsed; high-contrast palettes, larger mobile
controls and a compact landscape layout are available.

The public engine source and model are unchanged by this UI update. See
[HANDOFF.md](HANDOFF.md) for the three implementation passes and
[UI verification](validation/ui-update.md) for checks and limits.

## Controls

Click a piece and then a square, or drag the piece. Dots show legal moves.

| Action | Key |
| --- | --- |
| Explore board squares (board focused) | Arrow keys; Home / End |
| Select a piece or play a destination | Enter / Space |
| Step back or forward outside the board | ← / → or move buttons |
| Switch Play / Learn tabs (tab focused) | ← / → |
| Cancel a selection or close a dialog | Escape; FIDE touch-move still applies |

## How the computer thinks

The custom engine is written in JavaScript and runs in a background
worker, so the page stays responsive while it thinks. The downloaded HTML
contains everything, including the favicon and endgame bitbase. No fonts,
engines, models or other resources are fetched at runtime.

- **Search:** alpha-beta with iterative deepening and aspiration windows,
  principal variation search, a 2-million-entry transposition table,
  quiescence search with static exchange evaluation, null-move pruning,
  reverse futility pruning, razoring, futility and late-move pruning,
  logarithmic late-move reductions, check extensions, killer moves,
  counter-moves and history heuristics.
- **Evaluation:** material and piece-square tables blended between middlegame
  and endgame, mobility, king safety (attackers on the king zone and pawn
  shelter), pawn structure (doubled, isolated, connected and passed pawns, with
  king distance in the endgame), knight and bishop outposts, rooks on open
  files and the 7th rank, the bishop pair, drawish-endgame detection and
  mop-up technique for mating a lone king.
- **Openings:** a position-indexed book of 454 legally validated main lines and sidelines from the Ruy Lopez and Sicilian
  to the Queen's Gambit, King's Indian and English.
- **Levels:** lower levels search shallower and choose moves with controlled
  noise and occasional deliberate mistakes; higher levels use the full search
  with more thinking time.

### Engine upgrade (November 2026)

Levels 1–35 retain their existing names, depth limits and beginner noise/blunder
settings. Levels 36–50 use the full custom engine with budgets increasing from
17 to 30 seconds. Neural levels 51–65 continue from 32 to 60 seconds, without
resetting the budget at the tier boundary. Clock games calculate a common safe
allowance, then apply increasing per-level effort shares and the preset cap.
This prevents short clocks from erasing all the differences between higher
presets. Time is reserved for worker messages/rendering. Stable best moves can finish early;
unstable searches use more of the budget.

The level-progression correction also keeps piece-placement evaluation on level
5, capture continuation on level 6, and bounds noisy beginner searches by their
clock budget. Levels 2–16 retain their depth/noise/blunder settings, with increasing
time caps and complete fallback scores when a timed root iteration cannot finish.
The thinking status shows the current clocked allowance. These are difficulty
presets, not individually rated engines; adjacent levels can draw, upset one
another or make the same move. Millisecond rounding, book moves and very short
clocks can still make neighbouring presets behave alike.

- Corrected quiescence: no stand-pat in check, all legal evasions and all
  underpromotions retained, with mate taking priority over a fifty-move claim.
- Added capture history, continuation history, singular extensions with excluded
  move searches, and verification of deep null-move cutoffs. Forward pruning
  avoids principal-variation nodes. Timeout recovery retains completed iterations.
- Extended classical evaluation with pawn-safe mobility, pawn attacks on pieces,
  backward pawns, bishop/pawn colour complexes and connected rooks. KBNK guidance
  steers the defending king toward the bishop's mating corners. KQK/KRK retain
  the existing material, king proximity and edge guidance.
- Added an original **24,576-byte KPK bitbase**, embedded as base64. The offline
  retrograde generator covers 165,676 legal canonical positions, with 111,282
  wins. Both pawn colours and all files are supported. These are exact theoretical
  win/draw results without the fifty-move counter; search separately handles draw
  claims. Winning evaluations still use search and positional guidance to convert.
- Reduced evaluation allocation, cached static evaluations by position and move
  number, and separated transposition-table contexts for different evaluation
  modes. Worker errors/cancellations settle pending requests; searches never fall
  back onto the UI thread.
- Expanded the opening book from 52 to 454 lines using public-domain **CC0**
  opening data from [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings),
  revision `3fd6ce992679e4d991a6bb4dade71f2b826c568a`. Entries are indexed by
  position, so known transpositions can rejoin the book. CC0 requires no attribution;
  this link records provenance. All lines are checked for legality.

### MIT neural evaluation upgrade

Levels **51–65** use an incrementally updated **768 → 128 × 2 → 1 NNUE** with
squared clipped ReLU. The trained weights are Thomas Jahn's
`128HL-S-5732M-Tmix-Q5-v19.nnue`, from the MIT-licensed Leorik repository. The
network is embedded in the HTML; it is never downloaded during play. We do not
claim to have trained these weights. Full provenance, the pinned source revision,
and SHA-256 are in `third-party/README.md`.

The full search and evaluation core runs as embedded WASM on levels 51–65.
The JavaScript fallback includes an original **1,206-byte WASM SIMD kernel** for
inference where supported, plus scalar inference when WASM is unavailable.
Piece-square feature deltas are recorded by make/unmake and materialized
only when evaluation needs them. Two perspective accumulators handle captures,
castling, en passant, promotions and null moves. The kernel accelerates their
updates and output evaluation. The expanded kernel keeps a bounded ply-frame
cache, fuses ordinary move deltas with parent copying, and evaluates directly
from the resident frame. JavaScript copies keep backend/position switching safe.
Earlier measurements of the fallback's small kernel on one shared host showed approximately 20% faster
NNUE evaluation and 3% higher fixed-depth whole-search NPS; Node whole-search NPS
was essentially flat. These are limited performance observations, not strength
gains or a 2–5× claim. [Raw runs and method](validation/performance/README.md).
Neural search also tries the transposition-table
move after validating it against generated moves, deferring ordering of the
remaining moves until it is needed. A numerically equivalent JavaScript fallback works
without WASM or SIMD. Sparse endings retain the classical guidance and exact KPK
bitbase. Levels 1–50 keep their existing evaluation modes and budgets.

Level 51 allows 32 seconds per move; budgets increase to 60 seconds at Level 65.
Clock controls cap these budgets. Clock allocation retains a scheduling reserve,
uses the remaining delay rather than refilling it after resume, and shortens its
planning horizon later in the game. The move-time benchmark adapter keeps its
explicit 1-second control and 20ms reserve. Level names are presets, not calibrated Elo.
The original UI, 38 lessons, rules, clocks and computer-vs-computer remain.

The **original MIT copyright and full licence text are retained visibly inside
the HTML**, together with Thomas Jahn's MIT notice. `LICENSE` is unchanged and
`third-party/LEORIK-LICENSE.txt` records the network's licence. No GPL code,
libraries, binaries or weights are distributed. The independently written kernel
has no imports or runtime toolchain dependency.

**Correctness update:** an independent referee found illegal moves caused by
colliding position hashes and unchecked cached moves. The hash generator now
creates full 64-bit keys, cached moves are validated before use, and invalid
move histories fail explicitly. Earlier match and throughput figures predate
this bug fix and do not validate the fixed revision's strength or performance.
See [the hash-move regression report](validation/hash-move-fix.md).

**Strength is unrated.** No absolute Elo estimate is supported by the current
evidence. Wins against our own unrated previous version demonstrate a relative
improvement only. The completed 200-game modern-opponent benchmark shows a clear
gap to Stockfish 19 and native Leorik 3.1.3 at one second per move; it does not
calibrate an absolute rating. Competitive results against a comparable-strength
pool at documented controls are needed. In particular, 2500+ play at 10–30
seconds per move has not been established.

A separate [200-game independent-engine campaign](validation/independent-campaign.md)
was paused at **58/200 games at 1 second per move**, after an opponent UCI-format
forfeit. The archived snapshot contains 52 normal-play wins, 5 draws and no
normal-play losses, plus one separately reported forfeit win. See [tests](tests)
for the raw evidence, limitations and reproduction commands. No absolute Elo
claim is made.

New [opponent-selection pilots](validation/opponent-tests/README.md) at the same
control completed four games each: Stockfish 5 **0W–3D–1L**, Texel 1.06
**1W–2D–1L**, from Mitchell's side, with no forfeits. A separate two-game
promotion-format diagnostic completed normally using a labelled external-engine
adapter. Raw PGNs, configuration, logs, audit and repeat commands are published;
these small samples do not establish Elo.

### Full Mitchell WASM engine

The release ports Mitchell's engine to original freestanding C++
and embeds the compiled WASM in one HTML file. The latest SIMD memory operations
and fused neural transitions preserve fixed-depth moves, scores and node counts.
On the measured host, four-position searches ran about **40% faster in Chromium**
and **54% faster in Node** than the first full-WASM version, at equal memory.

At 0.1 seconds per move, the first WASM version scored **20W–19D–1L** against the
previous JS engine. The enhanced version then scored **20W–15D–5L** against the
first WASM version. Both 40-game experiments completed without forfeits. These
are relative short-control results, not an absolute Elo or normal-time rating.

This engine is now the release default for levels **51–65**. It retains
the credited MIT Leorik network, 32 MiB default WASM memory, worker search and
JavaScript fallback. See [build and test instructions](engine/wasm/README.md) and
[raw performance/match evidence](validation/wasm-port/evolution/README.md).
The user approved publishing the measured upgrade before establishing an
absolute rating. The existing difficulty presets remain unrated.

### Reproduce checks and run matches

Only `index.html` is needed to play. For development, Node.js 22+ assembles the
ordered modules in `src/`, `ui/` and `engine/` into the release file with no build
dependencies. Do not edit the generated HTML directly:

```sh
node scripts/build.cjs
node scripts/build.cjs --check
node scripts/check-size.cjs
# Optional development dependencies for kernel compilation and browser testing:
npm ci
npm run build:kernel
npm run build
npm run test:all
```

GitHub Actions run build, kernel, core and offline browser checks on push/PR. The
size budget is 600 KiB raw / 256 KiB gzip. Legacy `embed-ui.cjs` rebuilds the whole
artifact; `embed-neural.cjs` validates the pinned network before doing the same.
See [CONTRIBUTING.md](CONTRIBUTING.md) for source layout and adding tests.
Individual commands remain available:

```sh
node scripts/test.cjs
node scripts/test-neural.cjs
node scripts/test-hash-moves.cjs
python scripts/test-campaign.py
node scripts/test-uci-normalize.cjs
python scripts/test-uci-normalize.py
node scripts/bench.cjs index.html 9 nnue
# Save the original locally for paired equal-budget matches:
git show f3617994503541daa41ba44f5d0499df94767fe4:index.html > /tmp/original.html
node scripts/match.cjs --baseline /tmp/original.html --level 65 --baseline-level 35 --games 24 --ms 1000 --out results.json
# An independently installed UCI opponent is used only for testing:
node scripts/match.cjs --uci /path/to/stockfish --games 12 --ms 1000 --out external-results.json
node scripts/tune.cjs results.json > candidate-weights.json
```

The match runner alternates colours with paired opening positions, checks every
move, disables books, records actual elapsed time and nodes, and marks unfinished
games `*` rather than calling them draws. Equal budgets are hard maxima; engines
may use different amounts. The Texel-style tuner fits six added feature weights
to completed game outcomes, splits whole games into training/holdout sets, and
reports both losses. It never changes the HTML automatically. A small initial
trial worsened held-out loss, so its weights were rejected. Use many diverse games
and fresh matches before promoting candidate weights.

The match runner defaults to new Level 65 versus baseline Level 50. For a local
snapshot of the previous release, use `git show e7fd21a:index.html > /tmp/level50.html`
and pass `--baseline /tmp/level50.html --level 65 --baseline-level 50`.

`node scripts/build-kpk.cjs` deterministically regenerates the embedded KPK data.
`node scripts/import-book.cjs /path/to/chess-openings --replace-supplement`
legally validates and replaces the CC0 supplement in `src/engine/book.js`, then
rebuilds the HTML. Use a reviewed CC0 checkout; the pinned 454 lines stay unchanged
in this update. A small label now distinguishes book moves from searched moves;
custom starts and disabled books are labelled separately. The optional
`node scripts/browser-test.cjs` needs Playwright plus Chromium; it tests offline
play, worker responsiveness/cancellation and computer-vs-computer.

### Rebuild the neural payload

There is no build step to play the checked-in HTML. The already-credited MIT
network is checked in at `third-party/leorik-128.nnue` and pinned by SHA-256 in
`src/build.json`; no download is needed to rebuild. `node scripts/build.cjs`
embeds it with `engine/nnue.js` and `engine/nnue-kernel.wasm`.

To modify the original kernel, use `npm ci`, `npm run build:kernel`, then
`npm run build`. WABT is a development compiler, not a browser dependency or linked
library. Preserve the original and Leorik MIT notices when editing the template.
Changing the model requires deliberately reviewing provenance, the pinned hash
and attribution; the compatibility importer rejects silent replacements.

## Files

- `index.html`: the whole game: markup, styles, engine, lessons and interface
- `logo.svg`: repository logo and page icon
- `LICENSE`: existing MIT licence
- `tests`: results, evidence links and reproducible experiment instructions
- `src/`: template, styles, lessons and ordered engine/application modules
- `ui/`: reusable development helpers embedded into the standalone HTML
- `engine/`: original NNUE JavaScript and WAT/WASM kernels
- `CONTRIBUTING.md`: dependency-free build and test instructions
- `HANDOFF.md`: implementation passes, checks and continuation notes
- `scripts/`: optional tests, benchmark, match runner, tuning and data generators
- `engine/`: original inference source and SIMD kernel, embedded into the HTML
- `third-party/`: MIT network licence and provenance
- `validation/`: measured results and limitations

## License

MIT. See `LICENSE`.

## Comfort ideas

[COMFORT-IDEAS.md](COMFORT-IDEAS.md) records proposed improvements and tradeoffs,
separately from shipped features. The suggested next sequence is automatic game
recovery, a focused board layout, then separate sound and clock-alert controls.
