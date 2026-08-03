import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { users } from '@/database/schema';
import { hashPassword, verifyPassword } from '@/modules/identity/services';

import { SHARED_PASSWORD, seedBulkMembers } from '../bulk-members-core';

/** Counts the demo member login users (memberNN@superdreams.com). */
async function countDemoMembers(db: Database): Promise<number> {
  const rows = await db.select({ email: users.email }).from(users);
  return rows.filter((r) => /^member\d{2}@superdreams\.com$/.test(r.email)).length;
}

describe('seedBulkMembers (PGlite) — reused by the Generate Demo Members action', () => {
  let client: PGlite;
  let db: Database;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    // An actor user must exist (audit actor) — mirrors production where the admin
    // is seeded before the demo action runs.
    await db.insert(users).values({
      email: 'admin@superdreams.com',
      passwordHash: await hashPassword('ChangeMe123!'),
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'Super Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
  });

  afterAll(async () => {
    await client.close();
  });

  it('generates member01–member15 with the default password on first run', async () => {
    const result = await seedBulkMembers(db, 15);

    expect(result.created).toHaveLength(15);
    expect(result.skipped).toBe(0);
    expect(result.created[0]?.email).toBe('member01@superdreams.com');
    expect(result.created.at(-1)?.email).toBe('member15@superdreams.com');
    expect(await countDemoMembers(db)).toBe(15);

    // Default password is Member123! and is stored hashed (verifiable).
    expect(SHARED_PASSWORD).toBe('Member123!');
    const [member01] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, 'member01@superdreams.com'));
    expect(member01?.passwordHash).toBeTruthy();
    expect(await verifyPassword(member01!.passwordHash!, 'Member123!')).toBe(true);
  });

  it('is idempotent: a second run creates no duplicates and skips all 15', async () => {
    const result = await seedBulkMembers(db, 15);

    expect(result.created).toHaveLength(0);
    expect(result.skipped).toBe(15);
    expect(await countDemoMembers(db)).toBe(15); // still 15 — no duplicates
  });
});
