import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';

import { createIdentityModule, verifyPassword, type IdentityModule } from '../index';
import { UserRepository } from '../repositories';

describe('identity module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let identity: IdentityModule;

  beforeAll(async () => {
    client = new PGlite();
    const pgliteDb = drizzle(client);
    // Applies every migration (Phase 06 platform tables + identity).
    await migrate(pgliteDb, { migrationsFolder: 'drizzle' });
    db = pgliteDb as unknown as Database;
    identity = createIdentityModule(db);
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates an organization', async () => {
    const org = await identity.organizations.createOrganization({ name: 'Acme', slug: 'acme' });
    expect(org.slug).toBe('acme');
    expect(org.isActive).toBe(true);
  });

  it('creates a user with a hashed password (PENDING) and never exposes it', async () => {
    const user = await identity.users.createUser({
      email: 'jane@acme.test',
      password: 'Str0ngPass1',
    });
    expect(user.email).toBe('jane@acme.test');
    expect(user.status).toBe('PENDING');
    expect(Object.keys(user)).not.toContain('passwordHash');

    const repo = new UserRepository(db);
    const row = await repo.findByEmail('jane@acme.test');
    expect(row?.passwordHash).toBeTruthy();
    expect(await verifyPassword(row?.passwordHash ?? '', 'Str0ngPass1')).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    await expect(
      identity.users.createUser({ email: 'jane@acme.test', password: 'An0therPass' }),
    ).rejects.toThrow(/already exists/i);
  });

  it('enforces user lifecycle transitions', async () => {
    const created = await identity.users.createUser({
      email: 'bob@acme.test',
      password: 'Str0ngPass1',
    });
    expect((await identity.users.changeStatus(created.id, 'ACTIVE')).status).toBe('ACTIVE');
    expect((await identity.users.changeStatus(created.id, 'SUSPENDED')).status).toBe('SUSPENDED');
    // SUSPENDED -> INACTIVE is not a permitted transition.
    await expect(identity.users.changeStatus(created.id, 'INACTIVE')).rejects.toThrow();
  });

  it('publishes identity domain events', async () => {
    const seen: string[] = [];
    identity.events.subscribe((event) => {
      seen.push(event.type);
    });
    await identity.users.createUser({ email: 'eve@acme.test', password: 'Str0ngPass1' });
    expect(seen).toContain('UserCreated');
  });
});
