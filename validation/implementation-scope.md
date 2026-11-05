# Incremental upgrade scope

This pass addresses the requested first priorities and their supporting checks.

| Area | This pass |
| --- | --- |
| Strength evidence | Audit old partial campaign; complete/archive a 12-game Stockfish 19 screening; freeze and cleanly restart a separate modern 200-game run. Keep all results and forfeit accounting distinct. |
| Maintainability | Extract ordered engine/application sources, template, styles, lessons and pinned network. Dependency-free deterministic build still releases one HTML. |
| Performance | Expand original SIMD kernel and bounded accumulator cache; repeated numerical and throughput comparisons; improve bounded clock allocation. No large NPS/Elo claim. |
| Openings | Keep 454 checked lines, add a subtle book/search indicator, and make the CC0 supplement replaceable from modular sources. |
| Infrastructure | Pinned development lockfile, push/PR core and offline browser CI, compiled-kernel/build checks, raw/gzip budgets and CONTRIBUTING.md. |
| Endgames | Existing KPK and classical sparse guidance remain. More bitbases/KBNK changes should be separately measured against the frozen baseline. |
| Analysis/learning | Existing review and lessons retained; remove an unsupported tournament-strength claim from the final lesson. Multi-PV/PV and a puzzle mode are proposed next engine/UI passes. |
| UX/sharing/multiplayer | Preserve recently tested mobile, keyboard, contrast, pause, animations, imports and position links. History links, external analysis exports and WebRTC are later independent features. |

No runtime Stockfish, external model request, multiplayer service, worker pool,
new absolute Elo claim or engine replacement is introduced. Those are not hidden
dependencies of the build. The larger campaign's completion status is reported
explicitly; restarting it does not turn queued games into evidence.
