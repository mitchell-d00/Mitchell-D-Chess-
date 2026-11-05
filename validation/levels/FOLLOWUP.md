# Reproducible engine-strength results

Unrated; these experiments do not establish an absolute Elo or FIDE rating.

Archive hashes and legal PGNs verified; W/D/L and paired intervals recomputed by the repository runner. Forfeits excluded from normal score percentages.

## Colour-paired difficulty-level screening

**COMPLETE — 80/80 games**

Revision: ee1fcafc1c70271ddbd7804a6714c12dc37e6641. Backend: asserted per-level routing.

Control: 1 second/move; 250ms scheduling grace; 20ms Mitchell overhead reservation; 2 simultaneous game(s).

| Opponent | Games | Normal W/D/L | Forfeits | Normal score | Completed normal pairs | Paired 95% score interval |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Level5-vs-Level4 | 20/20 | 16/2/2 | 0 | 85.00% | 10 | 72.50%–95.00% |
| Level11-vs-Level10 | 20/20 | 11/1/8 | 0 | 57.50% | 10 | 32.50%–80.00% |
| Level16-vs-Level15 | 20/20 | 9/2/9 | 0 | 50.00% | 10 | 30.00%–67.50% |
| Level38-vs-Level37 | 20/20 | 8/5/7 | 0 | 52.50% | 10 | 35.00%–72.50% |

Evidence: [followup-1second](<followup-1second>). HTML SHA-256: 2211294d2124e920b0ce2e9d8e01f90ef1b5d1b6a0fe0c76a4cf146f752e2fac.

Network SHA-256: 794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704.

Intervals resample whole colour-reversed pairs; small or degenerate samples have no interval. Different revisions, controls and opponents remain separate experiments. Published opponent ratings at other controls are not Mitchell ratings.
