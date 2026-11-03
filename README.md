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
and portable commands to repeat the experiments. The engine remains unrated.

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
  | Analysis | 36–50 | Original classical evaluation, 20 to 60 seconds a move |
  | Neural | 51–65 | Trained MIT NNUE evaluation, 10 to 60 seconds a move; unrated |

- **Three modes.** You vs computer (as White, Black or random), two players on
  one device, and computer vs computer with separate levels, a speed setting
  and pause.
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

## Controls

Click a piece and then a square, or drag the piece. Dots show legal moves.

| Action | Key |
| --- | --- |
| Step back or forward through moves | ← → |
| Cancel a selection or close a window | Escape |

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
20 to 60 seconds. Clock games cap those budgets to available time, reserving
some time for worker messages and rendering. Stable best moves can finish early;
unstable searches use more of the budget.

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

The JavaScript inference integration and **405-byte WASM SIMD kernel** are new
code. Piece-square feature deltas are recorded by make/unmake and materialized
only when evaluation needs them. Two perspective accumulators handle captures,
castling, en passant, promotions and null moves. The kernel accelerates their
updates and output evaluation. Neural search also tries the transposition-table
move after validating it against generated moves, deferring ordering of the
remaining moves until it is needed. A numerically equivalent JavaScript fallback works
without WASM or SIMD. Sparse endings retain the classical guidance and exact KPK
bitbase. Levels 1–50 keep their existing evaluation modes and budgets.

Level 51 allows 10 seconds per move; budgets increase to 60 seconds at Level 65.
Clock controls cap these budgets. Level names are presets, not calibrated Elo.
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
improvement only; the two-game losses to Stockfish cannot calibrate a rating.
A larger benchmark against independent, rated engines at documented time controls
is needed before making an absolute strength claim. In particular, 2500+ play at
10–30 seconds per move has not been established.

A separate [200-game independent-engine campaign](validation/independent-campaign.md)
was paused at **58/200 games at 1 second per move**, after an opponent UCI-format
forfeit. The archived snapshot contains 52 normal-play wins, 5 draws and no
normal-play losses, plus one separately reported forfeit win. See [tests](tests)
for the raw evidence, limitations and reproduction commands. No absolute Elo
claim is made.

### Reproduce checks and run matches

Only `index.html` is needed to play. Development tools require Node.js:

```sh
node scripts/test.cjs
node scripts/test-neural.cjs
node scripts/test-hash-moves.cjs
python scripts/test-campaign.py
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
`scripts/import-book.cjs /path/to/chess-openings` imports the CC0 supplement into
an unsupplemented version (not needed for the checked-in HTML). The optional
`node scripts/browser-test.cjs` needs Playwright plus Chromium; it tests offline
play, worker responsiveness/cancellation and computer-vs-computer.

### Rebuild the neural payload

There is no build step to play the checked-in HTML. For development, clone the
pinned Leorik revision in `third-party/README.md` and run:

```sh
node scripts/embed-neural.cjs '/path/to/Leorik/Resources/Leorik 3.1 Networks/128HL-S-5732M-Tmix-Q5-v19.nnue'
```

This embeds `engine/nnue.js`, the supplied network and the checked-in
`engine/nnue-kernel.wasm`. If modifying the kernel, compile its original WAT source
with WABT (`npm install --prefix /tmp/mit-neural-tools wabt@1.0.39`, then
`node scripts/build-neural-kernel.cjs`) before embedding. WABT is a development
compiler, not a browser dependency or linked library. New inference code and the
kernel are MIT-licensed under this project's `LICENSE`; the model retains its
upstream MIT notice.

## Files

- `index.html`: the whole game: markup, styles, engine, lessons and interface
- `logo.svg`: repository logo and page icon
- `LICENSE`: existing MIT licence
- `tests`: results, evidence links and reproducible experiment instructions
- `scripts/`: optional tests, benchmark, match runner, tuning and data generators
- `engine/`: original inference source and SIMD kernel, embedded into the HTML
- `third-party/`: MIT network licence and provenance
- `validation/`: measured results and limitations

## License

MIT. See `LICENSE`.
