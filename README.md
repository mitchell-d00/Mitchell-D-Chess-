<p align="center"><img src="logo.svg" width="96" alt="Mitchell D Chess logo"></p>

# Mitchell D Chess

A complete chess game in a single HTML file. Play the computer at 35 levels
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
- **35 computer levels in 7 tiers.** Each level beat the level below it in
  testing.

  | Tier | Levels | How it plays |
  | --- | --- | --- |
  | Beginner | 1–5 | Random moves, then one or two moves ahead with many mistakes |
  | Novice | 6–10 | Develops pieces, sees simple threats, starts using openings |
  | Club | 11–15 | Full positional judgement, three to four moves deep, few mistakes |
  | Intermediate | 16–20 | No deliberate mistakes from level 17; deeper search from level 19 |
  | Expert | 21–25 | 1.2 to 2.6 seconds a move with advanced pruning |
  | Master | 26–30 | 3 to 6 seconds a move |
  | Grandmaster | 31–35 | 7.5 to 16 seconds a move; level 35 is the strongest |

- **Three modes.** You vs computer (as White, Black or random), two players on
  one device, and computer vs computer with separate levels, a speed setting
  and pause.
- **Tutorial.** 38 lessons: how each piece moves; check, checkmate and special
  moves; opening principles; tactics like forks, pins, skewers and smothered
  mate; endgames you play out against the computer; and master ideas like
  outposts, pawn structure, candidate moves and prophylaxis. The final exam is
  beating level 18 from the start.
- **Your colours.** Light, dark or automatic theme. 8 board colour sets and
  6 piece colour sets, plus colour pickers for any custom colours.
- **Tools.** Take back, hint arrow, flip board, resign, step through earlier
  moves, an evaluation bar, and copy the game as PGN or the position as FEN.

## Controls

Click a piece and then a square, or drag the piece. Dots show legal moves.

| Action | Key |
| --- | --- |
| Step back or forward through moves | ← → |
| Cancel a selection or close a window | Escape |

## How the computer thinks

The engine is written from scratch in JavaScript and runs in a background
worker, so the page stays responsive while it thinks.

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
- **Openings:** a book of over 50 main lines from the Ruy Lopez and Sicilian
  to the Queen's Gambit, King's Indian and English.
- **Levels:** lower levels search shallower and choose moves with controlled
  noise and occasional deliberate mistakes; higher levels use the full search
  with more thinking time.

In testing at equal thinking time, this engine scored 19 out of 24 against the
previous version of the game's top level.

## Files

- `index.html`: the whole game: markup, styles, engine, lessons and interface
- `logo.svg`: repository logo and page icon
- `LICENSE`: MIT licence

## License

MIT. See `LICENSE`.
