// Guarded Husky installer (Husky's official production-safe pattern).
//
// Git hooks are a local developer convenience — they must never run during
// production or CI/CD installs, where devDependencies (and therefore Husky) are
// not present. Skipping early keeps `pnpm install --prod` / NODE_ENV=production
// from failing with "husky: not found".
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0);
}

const husky = (await import('husky')).default;
console.log(husky());
