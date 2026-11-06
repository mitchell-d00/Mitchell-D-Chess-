# Reported knight ending and clock loss — November 6, 2026

The supplied game is preserved in [game.pgn](game.pgn). White was level 52,
Black level 65, at **120+1** under official rules. Black lost on time after
White's 68.Kc2. The PGN does not contain move-clock readings, application build,
worker timings or browser visibility, so the original timeout cause remains
**unconfirmed**. We have not reproduced that forfeit with the page active.

## What the board/history shows

All 135 recorded half-moves replay legally. Independent position counts find
no repeated position; the final half-move counter is 30. There was no threefold
or fifty-move claim to miss. The final board is not terminal, and White has
mating material, so a reported Black flag fall is a valid White win.

The screenshot exactly matches the position after **61.Kd2**, Black to move:

```text
8/8/4p3/3p2k1/3P4/2P2P2/1n1KN3/8 b - - 16 61
```

The apparent waiting moves are plausible defence. At this position, separately
executed **Stockfish 19** and **native Leorik 3.1.3** both choose **61...Nc4+**,
as Mitchell did. With one thread, 32 MiB hash and a 3-second maximum, Stockfish
reported 0 cp and Leorik -32 cp from Black's perspective. Their continuations
also contain knight manoeuvres. Stockfish reported zero tablebase hits; this
is analysis, not proof that the nine-piece position is drawn or a strength rating.
Forcing a pawn move merely to make the board look more active is not justified
by these observations. Search receives a time budget; it has no opponent-clock
move-selection strategy.

[Reference logs, identities and hashes](reference-analysis.json) and the
[exact analysis runner](reference-runner.py.txt) are retained. These external
programs were executed separately. No Stockfish/Leorik engine code or executable
is linked or embedded in Mitchell. Existing credited Leorik neural weights,
MIT notices and project licensing are unchanged.

## Foreground continuation

We replayed the full first 121 half-moves, then continued with the actual offline
browser worker at 120+1, using approximate screenshot balances (White 132s,
Black 102s). Each diagnostic run was deliberately stopped after 30 additional
half-moves; these are **bounded debugging traces, not completed matches**.
They do not recover the user's actual elapsed times.

The released baseline continued through pawn breaks and captures and retained
about 93.37s for Black. Its longest reply was about 2.23s. The recovery candidate
also continued legally, retained positive clocks and used **zero** emergency
recoveries. Neither reproduced the original flag fall. No move-selection,
NNUE weights, native binary or evaluation changes were made to force progress.

Baseline: [foreground.json](foreground.json), source `419d8e4`.
Candidate: [foreground-after.json](foreground-after.json), source `ac13be9`.
Later app changes only name failed requests and expose their reason in PGN.
The engine-source hash remains
`b3ffafe520089cb46296711928ca6d67d0bb4d138329a1c00402fabf19477dd4`.
The original baseline runner is archived as [text](baseline-runner.cjs.txt).
Evidence files are SHA-256 pinned in [manifest.json](manifest.json).

## Reliability gaps fixed

Inspection found a real independent fault path: a worker that never replied had
no request timeout, and an error or empty/illegal result could leave the AI
idle while its clock ran. These gaps are not proven to explain this user's game.

- Clocked play prepares a cheap legal provisional move **inside the worker**,
  using the current validated board, material/piece placement and immediate
  terminal checks. It requires no search table or neural allocation.
- The normal searched reply wins whenever it arrives on time. A watchdog allows
  the planned search plus at least 1 second of setup margin (or three times the
  learned margin), capped by the safe remaining clock allowance.
- A stalled/crashed worker can be replaced using the provisional move. The UI
  labels it as fallback recovery; the stale evaluation is cleared. This is an
  emergency move, not a substitute for ordinary neural search or rated evidence.
- A semantic engine error, including invalid move history, is still rejected.
  It is never repaired with a provisional move. Empty/illegal replies get one
  bounded retry, then a visible Retry computer control. Worker creation failures
  follow that same bounded path instead of silently showing thinking forever.
- Other requests also have bounded response waits. Completion, cancellation and
  replacement clear watchdog timers; stale workers cannot overwrite newer jobs.
- No clocks are paused, refunded or extended. A delayed move is still checked
  against the current clock. Official flags remain flags, even if the browser
  was suspended before either the watchdog or worker could run. Official CVC
  now says to keep the game visible. An observed inactive interval during the
  flagged request is mentioned in the result message without asserting cause.

## New PGN evidence

Clocked exports now include standard `{[%clk H:MM:SS.t]}` readings after moves,
including credited increment or the per-move reset. They round down to tenths.
Unknown historical readings are omitted, not invented. `WhiteClock` and
`BlackClock` record the current/final clock, so an unplayed forfeiting turn can
still be inspected. Delay is not converted into an invented elapsed-move time.

Additional headers identify `CurrentClockPolicy`, session recovery count and
observed inactive wall time, and the last request's side, level, allocated
budget, elapsed wall time, inactive overlap, state, reason, backend and reported
depth. These are not CPU timings. A queued worker may reduce the originally
requested budget. A pending backend/depth is labelled pending. Session counters
reset on a new/restored game; they are not a claim about unobserved prior play.
Observed inactivity includes paused sessions and does not itself prove clock
consumption or an OS cause. No telemetry is transmitted.

Imported PGN comments continue to be ignored as before. Structured local saves
retain their existing clock history, from which these annotations can be exported.
The saved-game format is unchanged.

## Verification and repeat method

Focused real-worker tests inject a hung handler, crash, worker-creation failure,
null reply and illegal reply. They verify legal recovery, strict history errors,
bounded retry, visible retry, cleared timers, cancellation and PGN annotations.
An injected main-thread stall plus visibility event verifies that recovery cannot
play a move after official flag fall. **That is a simulated timing gap, not a
physical iPad/iOS suspension test.** Normal searches in the healthy continuation
required no recovery. The complete core/offline-browser suite is also run.

```sh
node scripts/build.cjs --check
node scripts/test-user-knight-ending.cjs
node scripts/test-position-tools.cjs
node scripts/browser-engine-recovery-test.cjs
node scripts/reproduce-user-ending.cjs --out /path/to/new-empty-directory
```

The reproduction script keeps the complete historical position, levels and
increment. It refuses to overwrite output. Set `MITCHELL_TEST_HTML` to a saved
baseline HTML to compare versions. Its output explicitly says the continuation
is incomplete, and preserves clocks, searched moves, elapsed times and PGN.
Browser scheduling and time-limited search can change the continuation.

To repeat reference analysis, install the reference engine separately, start
its UCI console and use:

```text
uci
setoption name Threads value 1
setoption name Hash value 32
isready
ucinewgame
position fen 8/8/4p3/3p2k1/3P4/2P2P2/1n1KN3/8 b - - 16 61
go movetime 3000
```

Wait for `bestmove` before quitting. This is not a match protocol or an absolute
Elo estimate. For the reported game's actual failure, the next useful evidence
is a fresh PGN with these clock/request fields and whether the page stayed visible.
