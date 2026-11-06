# Optional computer personalities — November 6, 2026

The release now has a collapsed **Game setup → Custom opponents · playing
styles** panel. Default is **Standard engine**, with no preference adjustment.
Users can choose a preset, move the slider from -100 (defensive) to +100
(aggressive), and name/save up to twelve opponents with their difficulty level.
White and Black have independent settings in computer-vs-computer. Selections
apply to the next game; the current players, search and clocks are not replaced
mid-game. The global Standard button clears all three setup slots with one click.
The panel is hidden for two human players.

| Preset | Aggression |
| --- | ---: |
| Solid Defender | -80 |
| Positional Player | -35 |
| Tactical Attacker | +65 |
| Gambit Player | +100 |

Presets are named slider positions, not distinct trained networks or verified
ratings. Gambit Player seeks activity; it does not force a gambit opening or
unsound sacrifice. Balanced (0) has exactly the Standard evaluation. Standard
additionally clears the persona name/settings. Difficulty, beginner randomness,
blunder rates, the shared opening book, clocks and official rule handling keep
their existing roles. Styles take effect when the engine searches, so book,
forced and completely random moves can look identical across styles.

## Engine integration and limits

Original MIT `src/engine/personality.js` defines a small side-to-move evaluation
preference using piece activity near the opposing king, pawn advancement,
shelter and piece balance. It is scaled by aggression and remaining material
phase, clamped to ±60 cp per static leaf, and zero at phase <=4 (including KPK,
KRK and the supplied bare-rook draw claim). It does not override mate scores,
legality, draw detection or clock deadlines. It is a preference bias rather than
a guarantee of playing style or tactical safety; search/pruning can amplify its
effect on a returned score. Active styles do extra evaluation work and can
reduce strength. No new Elo or claim of equal strength is made.

JavaScript search and the existing WASM NNUE search both apply it. The generated
`engine/wasm/personality.inc` uses the canonical function's arithmetic. Changing
style clears the native TT; JS includes it in the TT context. The bridge always
sets native style, including resetting to zero on an ordinary request. Analysis
and lessons use Standard unless explicitly supplied a persona. Zero bypasses
the added board scan. Weights, other evaluation features and licensing are
unchanged; Leorik attribution remains visible in the standalone file.

The extension changes the native binary identity. `engine/wasm/release.json`
pins it and its match-tested predecessor; historical match archives remain
immutable. [standard-parity.json](standard-parity.json) alternates warmed old
and new cores across four positions, cold TT, 32 MiB, depth 9, three measured
repeats after warmups. All moves, scores and node counts match. Local median
throughput is about 0.97× the predecessor. This small sample is a correctness
and throughput check, not an equal-time match or strength qualification.

[style-probes.json](style-probes.json) records twelve deterministic legal
positions at fixed depth 4, 64 MiB TT, NNUE, aggression -100/0/+100. One position
changes the selected move (Nh3-f4 versus Bc1-a3). It demonstrates a noncosmetic
effect, not better play. Different time controls or deeper search can change
these choices.

## Persistence and repeat settings

Named opponents are stored only on this device under
`mitchell-d-chess.opponents.v1`. Saving an existing name replaces it; deletion
removes the stored profile but keeps current selections. Storage failures are
reported without replacing the prior list. Old game saves load as Standard;
new saves retain each AI's name/aggression. New PGNs include, for example:

```pgn
[WhitePersona "Solid Defender"]
[WhiteAggression "-80"]
[WhiteStylePolicy "style-v1"]
[BlackPersona "My attacker"]
[BlackAggression "65"]
[BlackStylePolicy "style-v1"]
```

PGN import keeps these headers for review. It does not activate computer players
from imported text. To repeat play, choose the recorded levels, styles and
clock, then start a new game. Engine revision, openings and hardware/timing also
matter; exact timed-game reproduction is not guaranteed.

For an offline Node probe using the exact standalone engine:

```js
const E = require('./scripts/engine.cjs')();
const result = E.think(null, [], 64, {
  time: 1000, noBook: true,
  persona: {name: 'My attacker', aggression: 65}
});
console.log(result);
```

Omit `persona` for Standard. Level indices here are zero-based. The existing
UCI match adapter defaults to Standard; the API example explicitly supplies a
persona, while exported PGNs document which settings a browser game used.

## Repeatable checks

```sh
node scripts/build.cjs --check
node scripts/check-size.cjs
node scripts/test-personas.cjs
node scripts/browser-personas-test.cjs
node scripts/probe-personas.cjs > /tmp/style-probes.json
npm run test:wasm
node scripts/checks.cjs all --report /tmp/persona-checks.json
```

Browser tests require the documented development-only Playwright/Chromium
setup. They load the single HTML and then run offline. The new checks cover
real JS/WASM requests, independent sides, clock allocations/deadlines,
Standard reset, PGN headers, named opponents, reloads, saved-game restoration,
escaping, and 375×812/844×390/768×1024 layouts. Unit checks cover invalid inputs,
bounded bias, native/JS arithmetic and exact active-style search parity,
TT isolation, sparse endgames, and legal timed requests for all 65 levels.

To repeat the before/after comparison, extract the previous binary from
`8a4a55e:engine/wasm/mitchell.wasm` to a separate file, then run:

```sh
node scripts/compare-wasm.cjs /tmp/previous.wasm engine/wasm/mitchell.wasm 3 9
```

The existing LLVM 19 build command regenerates the native core and style include.
The standalone artifact remains below the unchanged 700 KiB raw / 256 KiB gzip
release budgets. No runtime downloads, account, server or external engine was
added.

Completed locally: **45 core/browser commands**, plus the full WASM suite
(5,476 differential, 524 accumulator checks and 13 sparse-endgame fixtures).
The new persona unit suite includes **1,044 checks**. [Full command results](checks.json),
[focused storage-failure follow-up](profile-storage-check.txt), and
[release/evidence hashes](manifest.json) are retained. The final artifact is
680,218 bytes raw / 258,437 bytes gzip. These checks do not rate the personas.
