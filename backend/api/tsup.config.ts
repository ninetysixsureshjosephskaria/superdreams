import { defineConfig } from 'tsup';

/**
 * Production build configuration for the API service.
 *
 * esbuild (via tsup) resolves the `@/*` path alias from tsconfig automatically,
 * so the emitted output is directly runnable with `node dist/server.js`.
 *
 * Workspace `@superdreams/*` packages are consumed as TypeScript source, so they
 * must be bundled (not left external) for the runtime output to be runnable.
 */
export default defineConfig({
  entry: {
    server: 'src/server.ts',
    migrate: 'src/migrate.ts',
    seed: 'src/database/seed/seed.ts',
    'seed-members': 'src/seed-members.ts',
  },
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  bundle: true,
  skipNodeModulesBundle: true,
  noExternal: [/^@superdreams\//],
  dts: false,
});
