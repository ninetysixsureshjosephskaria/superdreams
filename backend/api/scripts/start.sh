#!/bin/sh
# =============================================================================
# TEMPORARY DIAGNOSTIC startup wrapper — Phase 2 production login outage.
#
# Purpose: make the Railway startup failure COMPLETELY observable. It runs the
# three stages SEQUENTIALLY (migrate -> seed -> server) and, around each one,
# prints an unmistakable stderr marker plus that process's exact exit status —
# which encodes a fatal signal as 128+signal:
#     124 = timed out (SIGTERM from `timeout`)   134 = SIGABRT (native abort)
#     137 = SIGKILL / OOM-killed                  139 = SIGSEGV (native segfault)
#
# Design guarantees (why this reveals what the old command hid):
#   * NO `&&` — a failing stage never short-circuits the ones after it.
#   * NO `set -e` / `set -o pipefail` — the shell can NEVER abort before it has
#     printed a stage's exit code (POSIX /bin/sh/dash also lacks pipefail).
#   * `timeout` bounds migrate and seed, so a HANG becomes a visible non-zero
#     code instead of a silent container restart.
#   * Markers are emitted by the SHELL (not the child), so they still appear
#     even if the child dies by a native abort that loses its buffered stdout.
#   * Each child's stdout AND stderr are captured (`2>&1`).
#
# This is NOT the permanent start command. Once the failing stage is identified,
# revert (Dockerfile CMD + railway.json) to:
#     node dist/migrate.js && node dist/seed.js && exec node dist/server.js
#
# Local use: bound every stage and point at an unreachable DB, e.g.
#     MIGRATE_TIMEOUT=8 SEED_TIMEOUT=8 SERVER_TIMEOUT=8 sh scripts/start.sh
# =============================================================================

MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-120}"
SEED_TIMEOUT="${SEED_TIMEOUT:-180}"
# 0 = run the server unbounded (normal production behaviour). Set >0 locally to
# stop a lazily-listening server so the wrapper can finish and print its code.
SERVER_TIMEOUT="${SERVER_TIMEOUT:-0}"

mark() { printf '\n>>> DIAG %s\n' "$*" >&2; }

mark "WRAPPER begin: node=$(node --version 2>&1) pid=$$ cwd=$(pwd)"

mark "STAGE migrate: begin"
timeout "$MIGRATE_TIMEOUT" node dist/migrate.js 2>&1
MIGRATE_EXIT=$?
mark "STAGE migrate: end exit=$MIGRATE_EXIT"

mark "STAGE seed: begin"
timeout "$SEED_TIMEOUT" node dist/seed.js 2>&1
SEED_EXIT=$?
mark "STAGE seed: end exit=$SEED_EXIT"

mark "STAGE server: begin"
if [ "$SERVER_TIMEOUT" != "0" ]; then
  timeout "$SERVER_TIMEOUT" node dist/server.js 2>&1
else
  node dist/server.js 2>&1
fi
SERVER_EXIT=$?
mark "STAGE server: end exit=$SERVER_EXIT"

mark "WRAPPER end: the server process returned (unexpected while healthy) exit=$SERVER_EXIT"
# Linger briefly so Railway ships these final log lines before it restarts us.
sleep 5
exit "$SERVER_EXIT"
