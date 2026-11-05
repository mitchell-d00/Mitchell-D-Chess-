# Contributing

Players only need `index.html`. Opening or saving that file requires no package
installation, network, server or build step.

## Edit and build

Use Node.js 22+ and Python 3. The ordinary build has no third-party dependencies:

```sh
node scripts/build.cjs
node scripts/build.cjs --check
node scripts/check-size.cjs
```

Edit `src/index.template.html`, `src/styles.css`, the ordered engine/app modules
listed in `src/build.json`, the helpers in `ui/`, or `src/lessons.js`. The build
concatenates the private engine scope and application scope in their existing
order; it does not load modules in the browser. Commit sources and regenerated
`index.html` together. Do not edit the release artifact directly.

The pinned MIT network is in `third-party/leorik-128.nnue`; its hash and full
Leorik attribution are retained. Kernel source is `engine/nnue.wat`; inference is
`engine/nnue.js`. To change/recompile the kernel or run browser checks:

```sh
npm ci
npm run build:kernel
npm run build
npm run test:all
```

Install Chromium with `npx playwright install --with-deps chromium` and set
`CHROMIUM_PATH` to `node -p 'require("playwright").chromium.executablePath()'`.
The browser tests serve the checked-in HTML from memory and disable page network
access. Playwright and WABT are development tools, not game runtime dependencies.

## Tests and evidence

Use a focused `scripts/test-*.cjs` for engine/data invariants and a
`scripts/browser-*-test.cjs` for a player flow. Add it to `scripts/checks.cjs`.
Test actual behavior, including cancellation and failure cases where relevant.
Run the applicable suite and `git diff --check` before submitting. CI checks
build reproducibility, the compiled kernel, attribution and raw/gzip size budgets
on pushes and pull requests.

External opponents and match managers must be installed separately. Never add
their executables, code or weights to the HTML or this repository. Freeze inputs,
time controls and hashes before a strength run; retain all games, identify
forfeits, and separate incomplete runs from completed evidence. Do not infer Elo
from a few wins or copy an opponent's published rating onto Mitchell.

Describe changes, checks, limitations and the next action in `HANDOFF.md`.

## Full WASM engine

The release embeds the original full C++/SIMD engine by default for levels
51–65, with automatic JavaScript fallback. It has a dedicated compilation CI
job and parity/browser gates. See
[engine/wasm/README.md](engine/wasm/README.md) for LLVM 19 build instructions.
`npm run test:wasm` checks the compiled core; `MITCHELL_TEST_HTML` points browser
checks at an alternate artifact without replacing the public `index.html`.
The ordinary `node scripts/build.cjs` produces the WASM-enabled release.
For a JavaScript-only diagnostic build, use
`node scripts/build.cjs --javascript --output /tmp/mitchell-js.html`.
The existing `--candidate-wasm --output ...` form still creates a labelled
experimental artifact. Players need none of these development tools.

To reproduce a paired experiment, build baseline and candidate HTML from their
recorded revisions in separate checkouts, then freeze a new run:

```sh
python3 scripts/prepare-wasm-match.py \
  --baseline-html /path/to/baseline.html --baseline-revision <baseline-commit> \
  --candidate-html /path/to/candidate.html --revision <candidate-commit> \
  --out /path/to/new-empty-run --fastchess /path/to/fastchess \
  --games 40 --move-seconds 0.1
python3 /path/to/new-empty-run/runner.py /path/to/new-empty-run/campaign.json
python3 scripts/archive-benchmark.py /path/to/new-empty-run/campaign.json /path/to/new-archive
node scripts/verify-evidence.cjs /path/to/new-archive
```

Both players must use WASM, share the frozen adapter and 32 MiB WASM setting,
and receive colour-reversed openings and equal time controls. Failed backends
stop the campaign. All results and forfeits are retained. The short control
measures relative behavior; it does not establish absolute Elo.
