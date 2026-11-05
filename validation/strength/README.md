# Released WASM strength evidence

The completed release pilot at **1 second per move** scored:

| Opponent | Games | Mitchell wins | Draws | Losses | Forfeits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native Leorik 3.1.3 | 6 | 0 | 5 | 1 | 0 |
| Texel 1.06 | 6 | 3 | 2 | 1 | 0 |

This is a protocol/opponent-selection pilot, **not an absolute Elo estimate**.
Three colour-reversed pairs per opponent are too few for the report's paired
interval. This is not a completed 200-game run, and it is not combined with the
older JS-only baseline or the short WASM self-comparisons.

- Tested release: `4bfcb94597d5cd4abb5d84159c84b85092e82327`.
- Mandatory WASM backend, level 65, default 32 MiB module, same credited
  Leorik128 model and exact released core. JavaScript fallback would stop the run.
- Frozen Fastchess alpha 1.8.2 / Node v24.22.1; one thread per engine, at most two
  games simultaneously; four-core host quota / 16 GiB limit recorded in config.
- Nominal 1s/move, 20ms Mitchell overhead reservation, equal 250ms grace.
  Opponent Hash=32 MiB differs from Mitchell's roughly 9 MiB TT inside its
  32 MiB module; the comparison is by clock, not identical hash capacity.
- First three existing EPD positions, each played with colours reversed.
  No books, pondering, external tablebases, score adjudication or arbitrary
  move-limit draws. Embedded KPK remains enabled. No completed games discarded.
- Native Leorik uses its separately pinned 640-hidden model, not the game's
  128-hidden model. Texel 1.06 is a locally built older comparison opponent;
  all source/options/binary hashes are recorded. Reference ratings in historical
  metadata are not transferred onto Mitchell.
- Light filesystem/unit checks ran during the shared-host pilot. Browser and
  throughput suites were held until it completed. The native Leorik PV warnings
  about hypothetical lines continuing past repetition are retained in raw logs;
  every actual game ended normally and every PGN move replayed legally.

[release-pilot-12/](release-pilot-12/) contains all PGNs, complete compressed logs,
commands, recovery state, runtime settings, exact adapter/helper/runner/preparer
and hash manifest. **All 1,606 half-moves replayed legally.** No external opponent
binary or network is redistributed. The teaching update leaves the tested engine
source byte-identical; see [engine identity verification](../teaching-strength-checks/engine-identity.json).

The generated [RESULTS.md](RESULTS.md) and [results.json](results.json) were
produced by verifying hashes, replaying games and recounting results, rather
than copying a hand-entered score. To regenerate:

```sh
npm run strength:report -- validation/strength/release-pilot-12 --output validation/strength/RESULTS.md
npm run strength:report -- validation/strength/release-pilot-12 --json --output validation/strength/results.json
```

See [PROTOCOL.md](PROTOCOL.md) for opponent installation, fresh preparation,
resuming, complete/incomplete archives and a 200-game profile. Larger independent
matches and broader hardware/control coverage remain necessary for a rating.
