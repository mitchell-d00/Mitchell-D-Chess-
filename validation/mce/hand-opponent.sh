#!/bin/sh
export MITCHELL_HTML=/workspace/mce-untrained.html
exec /opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node /workspace/mce-vs-leorik/adapter/uci.cjs
