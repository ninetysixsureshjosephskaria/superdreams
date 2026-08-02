// Guarded Husky installer (production-safe).
//
// Git hooks are a local developer convenience — they must never break a
// production or CI/CD install, where devDependencies (and therefore Husky) are
// pruned. Two independent safeguards make this bulletproof:
//
//   1. A fast path that skips outright when NODE_ENV=production or CI=true.
//   2. A try/catch around the Husky import, so that even when the environment
//      does NOT advertise production (e.g. Railway/Nixpacks prunes
//      devDependencies via `--prod` without exporting NODE_ENV to the `prepare`
//      script), a missing `husky` package is a no-op instead of an
//      ERR_MODULE_NOT_FOUND that fails the whole install.
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0);
}

try {
  const husky = (await import('husky')).default;
  console.log(husky());
} catch (error) {
  if (error?.code === 'ERR_MODULE_NOT_FOUND') {
    // Husky is not installed (production/CI install) — nothing to set up.
    process.exit(0);
  }
  throw error;
}
