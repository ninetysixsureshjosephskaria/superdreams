#!/usr/bin/env bash
# Run the full quality gate locally (mirrors CI).
set -euo pipefail
cd "$(dirname "$0")/../.."
pnpm format:check
pnpm exec turbo run lint -- --max-warnings=0
pnpm exec turbo run typecheck
pnpm exec turbo run test
pnpm exec turbo run build
echo "All checks passed."
