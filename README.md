<p align="center"><img src="logo.svg" width="96" alt="Mitchell D Chess logo"></p>

# Mitchell D Chess

A complete chess game in a single HTML file. Play the computer at 50 levels
from beginner to grandmaster, play a friend on the same screen, or watch two
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

## What is in it

- **Full rules.** Castling, en passant, promotion, check, checkmate, stalemate,
  threefold repetition, the fifty-move rule and insufficient material.
- **50 computer levels in 8 tiers.** Levels are accessibility presets, not verified Elo ratings.

  | Tier | Levels | How it plays |
  | --- | --- | --- |
  | Beginner | 1–5 | Random moves, then one or two moves ahead with many mistakes |
  | Novice | 6–10 | Develops pieces, sees simple threats, starts using openings |
  | Club | 11–15 | Full positional judgement, three to four moves deep, few mistakes |
  | Intermediate | 16–20 | No deliberate mistakes from level 17; deeper search from level 19 |
  | Expert | 21–25 | 1.2 to 2.6 seconds a move with advanced pruning |
  | Master | 26–30 | 3 to 6 seconds a move |
  | Grandmaster (legacy names) | 31–35 | 7.5 to 16 seconds a move |
  | Analysis | 36–50 | 20 to 60 seconds a move; no deliberate mistakes, unrated |

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

**Strength and performance limits:** this remains a classical engine, without
NNUE or imported engine code/model weights. There is no verified 2500+ Elo rating,
and no claim that every successive level wins an equal-time match. Short paired
matches against the original are regression evidence, not a human Elo calibration.
The requested 2–5× NPS increase has not been demonstrated; throughput varies with
position, depth and search changes. See `validation/README.md` for measured runs.
The original MIT licence remains; no GPL components are distributed.

### Reproduce checks and run matches

Only `index.html` is needed to play. Development tools require Node.js:

```sh
node scripts/test.cjs
node scripts/bench.cjs index.html 9
# Save the original locally for paired equal-budget matches:
git show f3617994503541daa41ba44f5d0499df94767fe4:index.html > /tmp/original.html
node scripts/match.cjs --baseline /tmp/original.html --games 24 --ms 1000 --out results.json
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

`node scripts/build-kpk.cjs` deterministically regenerates the embedded KPK data.
`scripts/import-book.cjs /path/to/chess-openings` imports the CC0 supplement into
an unsupplemented version (not needed for the checked-in HTML). The optional
`node scripts/browser-test.cjs` needs Playwright plus Chromium; it tests offline
play, worker responsiveness/cancellation and computer-vs-computer.

## Files

- `index.html`: the whole game: markup, styles, engine, lessons and interface
- `logo.svg`: repository logo and page icon
- `LICENSE`: existing MIT licence
- `scripts/`: optional tests, benchmark, match runner, tuning and data generators
- `validation/`: measured results and limitations

## License

MIT. See `LICENSE`.
