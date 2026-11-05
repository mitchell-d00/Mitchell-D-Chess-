# Comfort and experience ideas

These are proposals for discussion, not features already shipped. Keep play in
one offline HTML file, save settings locally, and preserve official-rule limits.
The current pause/resume work is recorded separately in `HANDOFF.md`.

| Priority | Idea | Player benefit | Scope and tradeoff |
| --- | --- | --- | --- |
| 1 | Automatic recovery slot | Recover the last game after a refresh, crash or accidental tab closure | Separate from the 20 named saves; restore paused with an explicit Resume. Bound writes, handle storage failures and retain clocks/rules/touch locks. Small–medium. |
| 2 | Focus layout | Give the board more room without hunting through panels | A reversible Play/Study layout choice that collapses setup and review; retain clocks, status, pause and navigation. Keep a visible “Show controls” action. Small. |
| 3 | Separate sound and alert controls | Hear checks or low time without every move making noise | Independent move/check/end/clock-alert toggles, volume and a one-click mute. Low-time alerts once per threshold, no surprise autoplay. Optional haptics where supported. Small–medium. |
| 4 | Optional move confirmation | Reduce accidental moves on small touch screens | Casual games only; show destination and a clear confirm/cancel action. Never reinterpret official touch-move obligations. Off by default so experienced players stay fast. Medium. |
| 5 | Named play presets | Start a familiar session in one step | Save combinations of level, colour, clock and rules, e.g. “Relaxed practice” or “10-minute match”. Display the actual settings before starting; replacing a game still asks first. Small. |
| 6 | Text and board readability controls | Make long sessions comfortable on smaller screens or with low vision | Independent text scale, larger coordinates and board sizing; preserve existing contrast palettes and reduced motion. Test 200% text and short landscapes. Medium. |
| 7 | Progressive hints | Help learners think before revealing a move | Three steps: a principle, a relevant piece/square, then the existing move arrow. Clearly mark factual pattern cues; disable during official play. Medium. |
| 8 | Continue a cancelled review | Avoid repeating work and wasting battery | Retain partial results and resume from the first missing position. Distinguish results from different search budgets; clear when the game changes. Medium. |
| 9 | Local lesson practice queue | Revisit mistakes without losing the structure of the 38 lessons | Optional bookmarks and a “Practise again” queue for attempted lessons. No pressure streaks or notifications. Medium. |
| 10 | Portable library backup | Keep named games when changing browser or device | One downloadable JSON archive, validated import and per-entry conflict choices; PGN remains the portable chess format. No account or server. Medium. |
| 11 | Board annotations | Explore a position visually | Clear arrows and square highlights with a touch-friendly drawing mode and an obvious Clear action. Study/casual only, with drawing separate from moving. Medium. |
| 12 | Local session summary | Make progress easier to understand | Games played, lessons completed and bookmarked positions; optional and resettable. Avoid unverified Elo, accuracy or psychological claims. Medium. |

## Suggested next sequence

1. Automatic recovery, because losing a game is the most frustrating failure.
2. Focus layout, because the feature set has grown and the board should stay easy
   to reach on phones.
3. Sound/alert controls, because comfort depends on the player's surroundings.

Ship each independently with a short README entry, handoff checkpoint and offline
browser checks. A useful feature should reduce friction without making the first
screen harder to understand. Existing named saves, confirmations, contrast themes,
promotion options, lesson progress and the guide should be improved where needed
rather than duplicated.
