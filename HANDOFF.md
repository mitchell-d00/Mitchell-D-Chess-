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
- [ ] Pass 2: onboarding, responsive/touch polish and keyboard board access.
- [ ] Pass 3: local named saves and post-game worker analysis.
- [ ] Final regression checks, documentation and publication.

## Decisions

- Build imports transactionally: invalid input must not destroy the current game.
- Imported positions/games open for review without starting clocks or AI.
- Keep parsing outside the immutable chess engine source.
- No server, account, external runtime library or service worker dependency.
- Save records must be versioned, bounded and validated before restoration.
- Analysis is an estimate from this unrated engine, with explicit time budgets;
  never present score differences as a calibrated accuracy or Elo measurement.

## Verification and next action

Next: implement independent position/PGN parsing and round-trip export, then
connect import/share UI and browser checks before beginning pass 2.

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
