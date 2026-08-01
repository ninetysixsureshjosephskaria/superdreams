#!/usr/bin/env bash
# Report the local toolchain status.
set -uo pipefail
cd "$(dirname "$0")/../.."
echo "Super Dreams — environment doctor"
check() { if command -v "$1" >/dev/null 2>&1; then echo "  ok  $1 $($1 --version 2>&1 | head -1)"; else echo "  --  $1 not found"; fi; }
check node
check pnpm
check docker
check git
printf "  docker daemon: "; docker info >/dev/null 2>&1 && echo "running" || echo "NOT running"
for f in .env .env.development; do [ -f "$f" ] && echo "  ok  $f present" || echo "  --  $f missing"; done
