#!/bin/sh
exec /opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node /workspace/chess-opponent-tests/minimal-format-diagnostic/adapter/uci-normalize.cjs --log /workspace/chess-opponent-tests/minimal-format-diagnostic/normalizations.jsonl -- '/tmp/chess-benchmark-minimalchess/MinimalChess 0.6 Linux/MinimalChessEngine'
