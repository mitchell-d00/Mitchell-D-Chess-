# Offline UI update verification

The three user-authorized passes are implemented in order, with commit/checkpoint
notes in `HANDOFF.md`. Work began from main `09d136d`; the separate original-engine
research branch is not part of this UI work.

## Behavior and limits

1. Strict FEN and legal PGN main-line imports from paste/file use a disposable
   worker and commit only after validation. Input limit: 256 KB, 1,024 half-moves,
   one standard-chess game. Comments/variations are skipped, not retained. Custom
   starting FENs are used by play/hints/export; Black's original move numbers are
   preserved. Shared links contain positions, not whole PGNs. Fresh-page links
   load review; changing a hash during an existing game asks before replacement.
2. Dismissible onboarding, visible source/credits, keyboard 8x8 grid, labelled
   squares, roving focus, shared official touch-move locks, keyboard promotion,
   modal focus trap/return, contrast choices, mobile controls and landscape layout.
   This is functional accessibility testing, not an accessibility certification.
3. Versioned local library of 20 named saves. Structural and legal validation
   precedes replacement; clocks load paused, with rules/player settings, touch
   locks, draw offers and full move history. Storage errors are explicit and do
   not overwrite old saves. New-game and resignation confirmations use accessible
   dialogs. Saves are browser/site-local, not cloud backups; export PGN separately.
   Analysis results are not persisted.
4. Post-game/import review uses the existing engine worker. 100/250/500 ms per
   position, cancellation, stale-result isolation, estimated score changes, best
   alternatives and a clickable graph/list. Shallow/forced-search gaps and mate
   scores are not presented as normal pawn-loss classifications. The heuristic
   “possible” labels are not calibrated accuracy, proof of a blunder, or Elo.

## Invariants

- Single standalone HTML, no external runtime libraries, model requests, accounts
  or network dependency introduced.
- Engine script byte-identical to main, SHA-256
  `61d257391bf643dedc2bf4d561a9e7c34d1d9ce6d52f822dd70431b8c1143bea`.
- Original licence disclosure and full MIT/Leorik notices preserved verbatim.
- 65 levels, 38 lessons, clocks, FIDE mode, computer-vs-computer and existing
  settings retained. No strength or neural replacement claim is made.

## Checks

`ui-checks.json` records final command output/exit codes when verification is
complete. Browser tests serve the single HTML from memory, then disable network
access. This environment requires the permitted socket/network sandbox profile
for Chromium startup; the page itself makes no external requests.

- `test-position-tools.cjs`: immutable engine, FEN invariants, annotated PGN,
  nested variations, castling/en passant/underpromotion, malformed inputs,
  custom-start numbering, round-trip export and hash validation.
- `test-game-library.cjs`: versioned/limited storage, player/clock validation,
  explicit updates/deletes and atomic quota failure behavior.
- `browser-tools-test.cjs`: offline paste/file imports, transactional rejection,
  inert header content, history navigation, share reload, custom-FEN play/export.
- `browser-accessibility-test.cjs`: keyboard legal play, official locks, flipped
  navigation, promotion, dialogs, tips, contrast, tab keys, real mobile taps,
  portrait/landscape overflow and 44px controls.
- `browser-library-analysis-test.cjs`: persisted saves, paused official clocks
  and touch locks, invalid saved-move rejection, actual worker analysis, clickable
  annotations, cancel and stale callback isolation.
- Original browser, core chess, neural inference and hash/move regression checks.

Manual screenshots were inspected in portrait and landscape. This environment
blocks direct file:// navigation; actual page tests use an offline routed HTTP
origin. Clipboard fallback is available when browser permissions disallow copying.
The local-file share action points at the public game; manually importing a FEN
into a saved local copy works without a connection.
