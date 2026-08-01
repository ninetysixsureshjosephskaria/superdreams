import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members, notificationQueue, users } from '@/database/schema';

import { createNotificationsModule, type NotificationsModule } from '../index';
import {
  InAppProvider,
  MockProvider,
  ProviderRegistry,
  type NotificationProvider,
  type ProviderMessage,
  type ProviderResult,
} from '../providers';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

const USER_ID = '00000000-0000-0000-0000-0000000000c1';
const MEMBER_ID = '00000000-0000-0000-0000-0000000000d1';

/** A provider that always fails — used to exercise retry + dead-letter. */
class FailingProvider implements NotificationProvider {
  public readonly channel = 'EMAIL' as const;
  public readonly name = 'failing-email';
  public send(_message: ProviderMessage): Promise<ProviderResult> {
    return Promise.resolve({
      result: 'FAILED',
      providerMessageId: null,
      error: 'Simulated provider outage.',
    });
  }
}

describe('notifications module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: NotificationsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;

    const providers = new ProviderRegistry();
    providers.register(new InAppProvider());
    providers.register(new FailingProvider());
    providers.register(new MockProvider('SMS', 'mock-sms'));
    mod = createNotificationsModule(db, { providers });

    await db.insert(users).values({ id: USER_ID, email: 'inbox@notifications.test' });
    await db.insert(members).values({
      id: MEMBER_ID,
      memberNumber: 'M-NOTIF01',
      firstName: 'Nora',
      lastName: 'Notify',
      email: 'nora@notifications.test',
      userId: USER_ID,
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates and previews a template', async () => {
    const template = await mod.service.createTemplate(
      {
        code: 'welcome',
        name: 'Welcome',
        channel: 'IN_APP',
        groupCode: 'SYSTEM',
        subject: 'Welcome {{name}}',
        body: 'Hi {{name}}, you have {{points}} points.',
        status: 'ACTIVE',
      },
      ACTOR,
    );
    expect(template.code).toBe('WELCOME');
    expect(template.variables.sort()).toEqual(['name', 'points']);

    const preview = await mod.service.previewTemplate(template.id, { variables: { name: 'Sam' } });
    expect(preview.body).toBe('Hi Sam, you have  points.');
    expect(preview.missingVariables).toContain('points');
  });

  it('rejects a duplicate template code', async () => {
    await expect(
      mod.service.createTemplate(
        { code: 'welcome', name: 'Dup', channel: 'IN_APP', body: 'x' },
        ACTOR,
      ),
    ).rejects.toThrow(/already exists/i);
  });

  it('sends an in-app notification, processes the queue and delivers to the inbox', async () => {
    const notification = await mod.service.send(
      {
        templateCode: 'WELCOME',
        variables: { name: 'Nora', points: 500 },
        recipientMemberId: MEMBER_ID,
      },
      ACTOR,
    );
    expect(notification.status).toBe('QUEUED');
    expect(notification.body).toBe('Hi Nora, you have 500 points.');

    const run = await mod.service.processQueue({}, ACTOR);
    expect(run.processed).toBeGreaterThanOrEqual(1);
    expect(run.sent).toBeGreaterThanOrEqual(1);

    const inbox = await mod.service.getInbox(USER_ID, {});
    expect(inbox.items.some((n) => n.id === notification.id && n.status === 'DELIVERED')).toBe(
      true,
    );
    expect(await mod.service.unreadCount(USER_ID)).toBeGreaterThanOrEqual(1);
  });

  it('marks read / archives inbox notifications', async () => {
    const inbox = await mod.service.getInbox(USER_ID, { status: 'UNREAD' });
    const first = inbox.items[0]!;
    const before = await mod.service.unreadCount(USER_ID);

    await mod.service.markRead(first.id, USER_ID, true);
    expect(await mod.service.unreadCount(USER_ID)).toBe(before - 1);

    await mod.service.archive(first.id, USER_ID);
    const archived = await mod.service.getInbox(USER_ID, { status: 'ARCHIVED' });
    expect(archived.items.some((n) => n.id === first.id)).toBe(true);
  });

  it('is idempotent: re-processing the queue does not re-send', async () => {
    const rerun = await mod.service.processQueue({}, ACTOR);
    expect(rerun.sent).toBe(0);
  });

  it('enforces preferences by suppressing disabled channels', async () => {
    await mod.service.updatePreferences(
      USER_ID,
      { preferences: [{ channel: 'IN_APP', enabled: false }] },
      ACTOR,
    );
    const suppressed = await mod.service.send(
      { channel: 'IN_APP', body: 'Should be suppressed', recipientUserId: USER_ID },
      ACTOR,
    );
    expect(suppressed.status).toBe('CANCELLED');

    // Re-enable for later assertions.
    await mod.service.updatePreferences(
      USER_ID,
      { preferences: [{ channel: 'IN_APP', enabled: true }] },
      ACTOR,
    );
  });

  it('retries then dead-letters a failing delivery', async () => {
    const notification = await mod.service.send(
      { channel: 'EMAIL', subject: 'Hi', body: 'body', recipientUserId: USER_ID },
      ACTOR,
    );
    // maxAttempts default 3 → process 3 times; advance `asOf` past the retry
    // backoff so each requeued attempt becomes due.
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await mod.service.processQueue({ asOf: future }, ACTOR);
    await mod.service.processQueue({ asOf: future }, ACTOR);
    await mod.service.processQueue({ asOf: future }, ACTOR);

    const [queueRow] = await db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.notificationId, notification.id));
    expect(queueRow?.status).toBe('DEAD');

    const final = await mod.service.get(notification.id);
    expect(final.status).toBe('FAILED');

    const deliveries = await mod.service.getDeliveries(notification.id);
    expect(deliveries.filter((d) => d.result === 'FAILED').length).toBe(3);
  });

  it('can retry a dead-lettered notification', async () => {
    const notifications = await mod.service.list({ status: 'FAILED' });
    const failed = notifications.items[0]!;
    const retried = await mod.service.retry(failed.id, ACTOR);
    expect(retried.status).toBe('QUEUED');
  });

  it('schedules a notification for the future (not processed now)', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const scheduled = await mod.service.schedule(
      { channel: 'SMS', body: 'Later', recipientUserId: USER_ID, scheduledAt: future },
      ACTOR,
    );
    expect(scheduled.status).toBe('QUEUED');

    const run = await mod.service.processQueue({}, ACTOR);
    // The scheduled SMS should not be picked up yet.
    const sms = await mod.service.get(scheduled.id);
    expect(sms.status).toBe('QUEUED');
    void run;
  });

  it('searches templates and notifications', async () => {
    const templates = await mod.service.listTemplates({ search: 'welcome' });
    expect(templates.items.some((t) => t.code === 'WELCOME')).toBe(true);
    const notifications = await mod.service.list({ channel: 'IN_APP' });
    expect(notifications.items.every((n) => n.channel === 'IN_APP')).toBe(true);
  });

  it('audits template and notification mutations', async () => {
    const rows = await db.select().from(auditLogs);
    expect(
      rows.some((r) => r.module === 'notifications' && r.entityType === 'notification_template'),
    ).toBe(true);
    expect(rows.some((r) => r.module === 'notifications' && r.entityType === 'notification')).toBe(
      true,
    );
  });
});
