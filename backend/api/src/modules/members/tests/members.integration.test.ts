import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members as membersTable, users } from '@/database/schema';

import { createMembersModule, type MembersModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

describe('members module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: MembersModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createMembersModule(db);
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates a member with profile, initial status history and activity', async () => {
    const detail = await mod.service.create(
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@members.test',
        phone: '+15551230000',
        profile: { bio: 'Pioneer' },
      },
      ACTOR,
    );
    expect(detail.memberNumber).toMatch(/^M-/);
    expect(detail.status).toBe('PENDING');
    expect(detail.fullName).toBe('Ada Lovelace');
    expect(detail.profile?.bio).toBe('Pioneer');

    const history = await mod.service.listStatusHistory(detail.id);
    expect(history[0]?.toStatus).toBe('PENDING');
    const activity = await mod.service.listActivity(detail.id);
    expect(activity.some((entry) => entry.action === 'member.created')).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    await expect(
      mod.service.create({ firstName: 'A', lastName: 'B', email: 'ada@members.test' }, ACTOR),
    ).rejects.toThrow(/already exists/i);
  });

  it('searches, filters, sorts and paginates', async () => {
    await mod.service.create(
      { firstName: 'Bob', lastName: 'Zimmer', email: 'bob@members.test' },
      ACTOR,
    );
    await mod.service.create(
      { firstName: 'Cara', lastName: 'Young', email: 'cara@members.test' },
      ACTOR,
    );

    const page = await mod.service.list({ page: 1, pageSize: 2, sortBy: 'lastName', order: 'asc' });
    expect(page.pageSize).toBe(2);
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThanOrEqual(3);

    const searched = await mod.service.list({ search: 'lovelace' });
    expect(searched.items.some((member) => member.email === 'ada@members.test')).toBe(true);

    const pending = await mod.service.list({ status: 'PENDING' });
    expect(pending.items.every((member) => member.status === 'PENDING')).toBe(true);
  });

  it('enforces status transitions with history', async () => {
    const member = await mod.service.create(
      { firstName: 'Grace', lastName: 'Hopper', email: 'grace@members.test' },
      ACTOR,
    );
    await mod.service.changeStatus(member.id, { status: 'ACTIVE' }, ACTOR);
    const suspended = await mod.service.changeStatus(
      member.id,
      { status: 'SUSPENDED', reason: 'Under review' },
      ACTOR,
    );
    expect(suspended.status).toBe('SUSPENDED');

    // SUSPENDED -> PENDING is not a permitted transition.
    await expect(
      mod.service.changeStatus(member.id, { status: 'PENDING' }, ACTOR),
    ).rejects.toThrow();
    // No-op transition rejected.
    await expect(
      mod.service.changeStatus(member.id, { status: 'SUSPENDED' }, ACTOR),
    ).rejects.toThrow(/already/i);

    const reactivated = await mod.service.changeStatus(member.id, { status: 'ACTIVE' }, ACTOR);
    expect(reactivated.status).toBe('ACTIVE');
    expect((await mod.service.listStatusHistory(member.id)).length).toBeGreaterThanOrEqual(3);
  });

  it('updates a member and archives (soft-delete)', async () => {
    const member = await mod.service.create(
      { firstName: 'Kate', lastName: 'Sheppard', email: 'kate@members.test' },
      ACTOR,
    );
    const updated = await mod.service.update(
      member.id,
      { lastName: 'Sheppard-Wilson', profile: { gender: 'female' } },
      ACTOR,
    );
    expect(updated.lastName).toBe('Sheppard-Wilson');
    expect(updated.profile?.gender).toBe('female');

    await mod.service.archive(member.id, ACTOR);
    await expect(mod.service.getDetail(member.id)).rejects.toThrow(/not found/i);
  });

  it('adds notes and document metadata', async () => {
    const member = await mod.service.create(
      { firstName: 'Nina', lastName: 'Simone', email: 'nina@members.test' },
      ACTOR,
    );
    const note = await mod.service.addNote(member.id, { body: 'VIP member' }, ACTOR);
    expect(note.body).toBe('VIP member');
    expect(await mod.service.listNotes(member.id)).toHaveLength(1);

    const document = await mod.service.addDocument(
      member.id,
      { name: 'ID.pdf', category: 'identity', sizeBytes: 1024 },
      ACTOR,
    );
    expect(document.name).toBe('ID.pdf');
    expect(await mod.service.listDocuments(member.id)).toHaveLength(1);
  });

  it('writes audit entries for member actions', async () => {
    const rows = await db.select().from(auditLogs);
    expect(rows.some((row) => row.module === 'members' && row.action === 'CREATE')).toBe(true);
  });

  it('supports self-service access by linked user id (ownership path)', async () => {
    await db.insert(users).values({ id: ACTOR.userId, email: 'self-user@members.test' });
    await db.insert(membersTable).values({
      memberNumber: 'M-SELFLINK',
      firstName: 'Self',
      lastName: 'Service',
      email: 'self@members.test',
      userId: ACTOR.userId,
      status: 'ACTIVE',
    });

    const mine = await mod.service.getByUserId(ACTOR.userId);
    expect(mine?.email).toBe('self@members.test');
    expect(mine?.userId).toBe(ACTOR.userId);

    const updated = await mod.service.updateOwnProfile(
      mine?.id ?? '',
      { phone: '+15559998888', profile: { bio: 'Updated by me' } },
      ACTOR,
    );
    expect(updated.phone).toBe('+15559998888');
    expect(updated.profile?.bio).toBe('Updated by me');
  });
});
