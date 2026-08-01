#!/usr/bin/env bash
# Remove build artifacts and caches across the workspace.
set -euo pipefail
cd "$(dirname "$0")/../.."
pnpm run clean || true
echo "Cleaned build artifacts and caches."
