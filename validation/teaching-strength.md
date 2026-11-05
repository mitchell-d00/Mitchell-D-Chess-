# Post-game teaching and reproducible measurements

This change adds teaching around the existing review and improves strength
measurement tooling. It preserves the released engine source, core and network.
The game remains a single offline HTML file, with 65 levels, 38 lessons, existing
rules/clocks, MIT notices and Leorik attribution.

## Teaching behaviour

What to work on ranks up to three moments from the completed part of a review.
Players can focus on White, Black or both. Selected moments open the position
before the move; Before/After controls keep the original history intact. Move
details describe what was played, a legal reply to examine, the engine's legal
alternative and a short practice takeaway. The existing graph and board arrows
continue to correspond to the displayed position.

Move effects and immediate mate/stalemate facts are derived from legal positions.
Search losses and mistake labels are estimates, with explicit White/Black
perspective. Null/non-finite evaluations and insufficient depth do not receive
normal mistake labels. A verified missed mate in one can be identified directly
from legal SAN even when a search is shallow. Mate scores are never treated as
pawn losses. Playing the engine's own choice is not assigned a loss just because
the next position's deeper search changes its estimate.

Key-moment buttons retain keyboard focus when the board changes. Controls meet
mobile touch targets, long text wraps, and cancelling/replacing a game cannot
populate the new game's teaching with old results. No accuracy percentage,
player rating or invented engine reasoning is displayed. No key moment found
does not mean all moves were best. Teaching remains an in-memory review; save
records keep their existing schema and do not store analysis.

## Measurement behaviour

Preparation now pins the required backend, core and model identity. WASM
revisions with an adapter that cannot reject fallback are refused. Non-secret
external runtime variables can be frozen explicitly; they cannot override the
MITCHELL_ measurement settings. Report generation verifies the archive, replays
PGNs and recounts results using the repository's runner, never archived code.
It separates complete/incomplete runs, normal scores and forfeits, and does not
transfer opponent reference ratings or combine incompatible samples.

A completed 12-game 1-second/move pilot of the released WASM engine scored
0W/5D/1L against native Leorik 3.1.3 and 3W/2D/1L against Texel 1.06, zero
forfeits. All 1,606 half-moves replayed legally. See
[the full evidence and repeat protocol](strength/README.md). The engine remains
unrated; the six-game-per-opponent pilot does not establish an absolute rating.

## Verification

Raw local results: [teaching-strength-checks/](teaching-strength-checks/).
The core suite has 22 commands, including factual teaching fixtures and strength
report tamper/accounting tests. All nine browser suites passed, including a new
real-worker review flow with capture/mate examples, both-side focus,
before/after navigation, keyboard focus, mobile targets, cleanup and zero-move
games. The 6,013 native engine cases and protocol/archive checks also passed.
Focused review/browser checks were repeated after the final presentation and
cleanup changes. CI repeats the complete release and native build checks.

The final HTML remains within the existing 700 KiB raw / 256 KiB gzip release
budget. Engine identity verification compares the frozen 4bfcb94 release against
the updated HTML's engine script; they are byte-identical.
