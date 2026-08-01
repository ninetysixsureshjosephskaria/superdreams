import type { Database } from '@/database/client';

export type SeedEnvironment = 'development' | 'test' | 'staging' | 'production';

export type SeedRunner = (db: Database) => Promise<void>;

export interface SeedModule {
  name: string;
  environments: SeedEnvironment[];
  run: SeedRunner;
}

/**
 * Registered seeds. Intentionally empty in this phase — **no business or sample
 * data is seeded**. Reference-data and development seeds register here in later
 * phases; the runner remains idempotent.
 */
const registry: SeedModule[] = [];

/** Registers a seed module. */
export function registerSeed(seed: SeedModule): void {
  registry.push(seed);
}

/** Runs all seeds registered for `environment`, returning the applied names. */
export async function runSeeds(db: Database, environment: SeedEnvironment): Promise<string[]> {
  const applied: string[] = [];
  for (const seed of registry) {
    if (seed.environments.includes(environment)) {
      await seed.run(db);
      applied.push(seed.name);
    }
  }
  return applied;
}
