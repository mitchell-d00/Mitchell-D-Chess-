# Reproducible engine-strength results

Unrated; these experiments do not establish an absolute Elo or FIDE rating.

Archive hashes and legal PGNs verified; W/D/L and paired intervals recomputed by the repository runner. Forfeits excluded from normal score percentages.

## Released Mitchell WASM independent-opponent reproducibility pilot

**COMPLETE — 12/12 games**

Revision: 4bfcb94597d5cd4abb5d84159c84b85092e82327. Backend: wasm-required.

Control: 1 second/move; 250ms scheduling grace; 20ms Mitchell overhead reservation; 2 simultaneous game(s).

| Opponent | Games | Normal W/D/L | Forfeits | Normal score | Completed normal pairs | Paired 95% score interval |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Leorik3.1.3 | 6/6 | 0/5/1 | 0 | 41.67% | 3 | not computed |
| Texel1.06 | 6/6 | 3/2/1 | 0 | 66.67% | 3 | not computed |

Evidence: [release-pilot-12](<release-pilot-12>). HTML SHA-256: b661acb96abb62d41d5493aabd67c2d4c9199b39f6ef68001fc799049cc740cf.

Network SHA-256: 794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704.

Intervals resample whole colour-reversed pairs; small or degenerate samples have no interval. Different revisions, controls and opponents remain separate experiments. Published opponent ratings at other controls are not Mitchell ratings.
