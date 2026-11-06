# Clock handling in time trouble

A reported level-65 versus level-52 game at 1 minute with no increment ended
with White losing on time and Black retaining 8.2 seconds. That is a valid
clock win; the screenshot cannot establish their relative playing strength.
A stronger search can still lose at a short time control. No increment also
means that a sufficiently long game can exhaust either player's clock.

Inspection found two avoidable costs in the app:

- A completed AI move could wait for the minimum viewing delay (120 ms at Fast,
  capped at 150 ms for other clocked modes), even with seconds remaining.
- The next search allowance used a reading from the periodic clock tick, which
  could be almost 100 ms old, plus any event-loop delay. A search could even be
  queued after the real remaining time had already elapsed.

The app now charges elapsed turn time immediately before allocating a search,
stops if that tick ends the game, and removes the viewing delay below 10 seconds.
The selected viewing speed still applies in untimed play; its existing clocked
cap applies when 10 seconds or more remain. No clock is refunded, paused or
extended. Search budgets, level shares, native core and neural model are unchanged.
The engine-script SHA-256 remains
`b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4`.

The focused offline browser test checks real worker level-50/65 allocation,
charges an intentionally stale 500 ms clock before budgeting, observes zero
scheduled viewing delay in time trouble, and verifies that an already expired
turn does not dispatch another search. Existing pause tests cover clock/delay
continuity, cancellation and official-play rules.

## Repeat the browser experiment

This is a small integration check, not a strength benchmark or a claim that
flag falls are eliminated. Install the development browser tools as described
in CONTRIBUTING.md, then:

```sh
node scripts/build.cjs --check
node scripts/browser-level-clocks-test.cjs
node scripts/browser-pause-test.cjs
node scripts/browser-clock-games.cjs --out /path/to/new-empty-directory
```

The optional last command plays two complete games, with level 65 and level 52
reversing colours, using actual browser clocks, worker searches, the normal
opening book, casual rules, Fast viewing speed and 60+0 time control. It runs
at most two games simultaneously and can take about two minutes. Each page is
offline after loading. There is no score adjudication or artificial move limit.
Every PGN is replayed legally; the output retains flag falls, incomplete games,
clock traces, HTML/runner hashes, runtime identity and the exact settings.
It refuses to overwrite an existing output directory.

To check the previous release, save its HTML separately and supply
`MITCHELL_TEST_HTML=/path/to/previous.html` to the same command. The output
records the HTML hash independently of the runner revision. Public baseline:
`8ffc05c9498253bf118973fb4c5e9638262b0797`. Fixed app: `6709812`.
Book choices, host load and timed searches are nondeterministic; four example games cannot
establish a rating or guarantee a particular outcome on another device.

## Saved integration games

| Version | White / Black levels | Result | Reason | Remaining W / B |
| --- | --- | --- | --- | --- |
| Before (`8ffc05c`) | 65 / 52 | 0–1 | White flagged after 120 moves | 0 / 10.165 s |
| Before (`8ffc05c`) | 52 / 65 | draw | Stalemate, 141 half-moves | 24.474 / 8.731 s |
| Fixed (`6709812`) | 65 / 52 | draw | Insufficient material, 219 half-moves | 1.348 / 11.125 s |
| Fixed (`6709812`) | 52 / 65 | 1–0 | Black flagged, 295 half-moves | 4.419 / 0 s |

The before and after samples each contain **one flag fall and one draw**.
They show no match-score improvement. The focused regression tests establish
removal of the stale-clock allocation and the viewing hold; these four different
games do not establish a strength gain or immunity to time losses. No further
tuning was performed against these outcomes.

All four PGNs (**895 half-moves**) replayed legally. [Before](before) and
[after](after) contain every game, per-move clock traces and hash manifests.
The frozen runner is from `6709812`; later edits add documentation and static
evidence verification. The candidate's HTML and engine match that commit.

```sh
node scripts/verify-clock-games.cjs \
  validation/clock-management/before validation/clock-management/after
```

This static check validates hashes, legally replays PGNs, checks monotone clock
traces and reconciles summaries without executing archived code. It is included
in the core suite. These games are separate from the 376-game level ladder audit.
