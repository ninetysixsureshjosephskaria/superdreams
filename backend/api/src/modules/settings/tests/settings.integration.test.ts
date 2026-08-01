import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, systemSettings, users } from '@/database/schema';

import { createSettingsModule, type SettingsModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

describe('settings module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: SettingsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createSettingsModule(db);
    // Maintenance windows reference users(activated_by).
    await db.insert(users).values({ id: ACTOR.userId, email: 'admin@settings.test' });
  });

  afterAll(async () => {
    await client.close();
  });

  it('seeds categories and settings', async () => {
    const categories = await mod.service.getCategories();
    expect(categories.length).toBe(15);
    const list = await mod.service.listSettings({});
    expect(list.items.length).toBeGreaterThan(30);
    expect(list.items.some((s) => s.key === 'platform.name')).toBe(true);
  });

  it('filters settings by category and search', async () => {
    const branding = await mod.service.listSettings({ category: 'BRANDING' });
    expect(branding.items.every((s) => s.categoryCode === 'BRANDING')).toBe(true);
    const search = await mod.service.listSettings({ search: 'password' });
    expect(search.items.some((s) => s.key === 'security.passwordMinLength')).toBe(true);
  });

  it('caches values and invalidates on update', async () => {
    expect(await mod.service.getValue('platform.name')).toBe('Super Dreams');
    expect(mod.service.cacheLoaded()).toBe(true);

    // Mutate the row directly (bypassing the service) — the cache should stay stale.
    await db
      .update(systemSettings)
      .set({ value: 'Changed Directly' })
      .where(eq(systemSettings.key, 'platform.name'));
    expect(await mod.service.getValue('platform.name')).toBe('Super Dreams');

    // A service update invalidates the cache.
    await mod.service.updateSettings({ updates: { 'platform.name': 'Via Service' } }, ACTOR);
    expect(await mod.service.getValue('platform.name')).toBe('Via Service');
  });

  it('validates values by type and registry constraints', async () => {
    await expect(
      mod.service.updateSettings({ updates: { 'branding.primaryColor': 'not-a-color' } }, ACTOR),
    ).rejects.toThrow(/hex color/i);
    await expect(
      mod.service.updateSettings({ updates: { 'security.passwordMinLength': 2 } }, ACTOR),
    ).rejects.toThrow(/at least/i);
    await expect(
      mod.service.updateSettings({ updates: { 'branding.theme': 'neon' } }, ACTOR),
    ).rejects.toThrow(/one of/i);
    await expect(
      mod.service.updateSettings({ updates: { 'does.not.exist': 1 } }, ACTOR),
    ).rejects.toThrow(/unknown setting/i);
  });

  it('records version history and audits every change', async () => {
    await mod.service.updateSettings({ updates: { 'security.sessionTimeoutMinutes': 30 } }, ACTOR);
    const history = await mod.service.getHistory({ key: 'security.sessionTimeoutMinutes' });
    expect(history.total).toBeGreaterThanOrEqual(1);
    expect(history.items[0]?.newValue).toBe(30);

    const audit = await db.select().from(auditLogs);
    expect(audit.some((r) => r.module === 'settings' && r.entityType === 'setting')).toBe(true);
  });

  it('updates branding through the convenience API', async () => {
    const updated = await mod.service.updateBranding({ primaryColor: '#123456' }, ACTOR);
    expect(updated.some((s) => s.key === 'branding.primaryColor')).toBe(true);
    expect(await mod.service.getValue('branding.primaryColor')).toBe('#123456');
  });

  it('redacts secret values but reports presence', async () => {
    await mod.service.updateSettings({ updates: { 'email.smtpPassword': 'hunter2' } }, ACTOR);
    const list = await mod.service.listSettings({ category: 'EMAIL' });
    const secret = list.items.find((s) => s.key === 'email.smtpPassword');
    expect(secret?.isSecret).toBe(true);
    expect(secret?.value).toBeNull();
    expect(secret?.hasValue).toBe(true);
  });

  it('manages feature toggles', async () => {
    const toggles = await mod.service.listFeatureToggles();
    expect(toggles.length).toBeGreaterThanOrEqual(4);

    const created = await mod.service.createFeatureToggle(
      { key: 'experimental.thing', name: 'Experimental thing', enabled: false },
      ACTOR,
    );
    expect(await mod.service.isFeatureEnabled('experimental.thing')).toBe(false);

    await mod.service.updateFeatureToggle(created.id, { enabled: true }, ACTOR);
    expect(await mod.service.isFeatureEnabled('experimental.thing')).toBe(true);

    await expect(
      mod.service.createFeatureToggle({ key: 'experimental.thing', name: 'Dup' }, ACTOR),
    ).rejects.toThrow(/already exists/i);
  });

  it('toggles maintenance mode on and off', async () => {
    expect((await mod.service.getMaintenance()).active).toBe(false);

    const enabled = await mod.service.setMaintenance(
      { enabled: true, title: 'Upgrade', message: 'Back soon.' },
      ACTOR,
    );
    expect(enabled.active).toBe(true);
    expect(enabled.window?.title).toBe('Upgrade');

    const disabled = await mod.service.setMaintenance({ enabled: false }, ACTOR);
    expect(disabled.active).toBe(false);
  });

  it('exposes only non-secret public settings', async () => {
    const pub = await mod.service.getPublicSettings();
    expect(pub.settings['branding.primaryColor']).toBe('#123456');
    expect(pub.settings['email.smtpPassword']).toBeUndefined();
    expect(pub.settings['security.passwordMinLength']).toBeUndefined();
  });
});
