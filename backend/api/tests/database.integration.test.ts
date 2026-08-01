import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import * as schema from '@/database/schema';

/** Concrete repository over a base-column table, to exercise BaseRepository. */
class SystemConfigRepository extends BaseRepository<typeof schema.systemConfig> {
  public constructor(db: Database) {
    super(db, schema.systemConfig);
  }
}

describe('database foundation (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let repo: SystemConfigRepository;

  beforeAll(async () => {
    client = new PGlite();
    const pgliteDb = drizzle(client, { schema });
    // Verifies migration execution succeeds on a clean database.
    await migrate(pgliteDb, { migrationsFolder: 'drizzle' });
    // Runtime query API is identical to postgres.js; bridge the driver types.
    db = pgliteDb as unknown as Database;
    repo = new SystemConfigRepository(db);
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates all ten base tables', async () => {
    const result = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const names = result.rows.map((row) => row.table_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'system_config',
        'audit_logs',
        'jobs',
        'background_tasks',
        'application_settings',
        'feature_flags',
        'countries',
        'currencies',
        'languages',
        'timezones',
      ]),
    );
  });

  it('base repository create() populates id, timestamps, and version', async () => {
    const created = await repo.create({ key: 'unit.k1', value: { enabled: true } });
    expect(typeof created.id).toBe('string');
    expect(created.version).toBe(1);
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await repo.findById(created.id);
    expect(found?.key).toBe('unit.k1');
  });

  it('soft delete hides the row; restore brings it back and bumps version', async () => {
    const created = await repo.create({ key: 'unit.k2' });

    expect(await repo.softDelete(created.id)).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();

    expect(await repo.restore(created.id)).toBe(true);
    const restored = await repo.findById(created.id);
    expect(restored?.version).toBeGreaterThan(1);
  });

  it('withTransaction rolls back on error', async () => {
    await expect(
      withTransaction(db, async (tx) => {
        await repo.create({ key: 'unit.rollback' }, tx);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const page = await repo.findMany({ pageSize: 100 });
    expect(page.items.some((item) => item.key === 'unit.rollback')).toBe(false);
  });
});
