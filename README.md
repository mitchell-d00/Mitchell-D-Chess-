<p align="center"><img src="logo.svg" width="96" alt="Mitchell D Chess logo"></p>

# Mitchell D Chess

A complete chess game in a single HTML file. Play the computer at 18 levels
from beginner to grandmaster, play a friend on the same screen, or watch two
computers play each other. A 38-lesson tutorial takes you from how the pieces
move to master-level strategy.

It is free, with no ads, purchases or sign-up.

## Play

Open `index.html` in any browser. There is nothing to install or build.

To put it online, turn on GitHub Pages for this repository (Settings → Pages →
deploy from the `main` branch, root folder). The game will be served at
`https://<your-username>.github.io/<repo-name>/`.

Settings, setup choices and tutorial progress are saved in the browser.

## What is in it

- **Full rules.** Castling, en passant, promotion, check, checkmate, stalemate,
  threefold repetition, the fifty-move rule and insufficient material.
- **18 computer levels in 6 tiers.**

  | Tier | Levels | How it plays |
  | --- | --- | --- |
  | Beginner | 1–3 | Random moves, then one move ahead with many mistakes |
  | Novice | 4–6 | Two moves ahead, learns to develop and stop hanging pieces |
  | Club | 7–9 | Three moves ahead, knows common openings and pawn structure |
  | Intermediate | 10–12 | Finds tactics; level 12 plays with no deliberate mistakes |
  | Expert | 13–15 | Deeper search, king attacks and endgame technique |
  | Master | 16–18 | Thinks up to 6 seconds a move; level 18 is the strongest |

- **Three modes.** You vs computer (as White, Black or random), two players on
  one device, and computer vs computer with separate levels, a speed setting
  and pause.
- **Tutorial.** 38 lessons in the same six tiers: how each piece moves; check,
  checkmate and special moves; opening principles; tactics like forks, pins,
  skewers and smothered mate; endgames you play out against the computer; and
  master ideas like outposts, pawn structure, candidate moves and prophylaxis.
  The final exam is beating level 12 from the start.
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
worker, so the page stays responsive while it thinks. It uses alpha-beta
search with iterative deepening, a transposition table, quiescence search,
null-move pruning and late-move reductions. Its evaluation weighs material,
piece placement, mobility, pawn structure, passed pawns, rooks on open files
and king safety. Lower levels search less deeply and add controlled mistakes.

## Files

- `index.html`: the whole game: markup, styles, engine, lessons and interface
- `logo.svg`: repository logo and page icon
- `LICENSE`: MIT licence

## License

MIT. See `LICENSE`.
