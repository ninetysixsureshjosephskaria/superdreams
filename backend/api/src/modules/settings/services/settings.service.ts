import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import type { Executor } from '@/database/types';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';

import { SettingsCache } from '../cache';
import type {
  FeatureToggleData,
  MaintenanceStatus,
  PaginatedHistory,
  PublicSettings,
  SettingActor,
  SettingCategoryData,
  SettingData,
} from '../dto';
import type { SettingEventBus } from '../events';
import { toCategory, toFeatureToggle, toHistory, toMaintenanceWindow, toSetting } from '../mappers';
import type {
  AuditActionType,
  FeatureToggleRepository,
  MaintenanceRepository,
  SettingCategoryRepository,
  SettingHistoryRepository,
  SettingRow,
  SettingsAuditRepository,
  SettingsRepository,
} from '../repositories';
import {
  assertValidValue,
  createFeatureToggleSchema,
  historyQuerySchema,
  listSettingsQuerySchema,
  maintenanceSchema,
  updateBrandingSchema,
  updateFeatureToggleSchema,
  updateSettingsSchema,
} from '../validators';

const MODULE = 'settings';

/**
 * Settings & Administration business logic. Owns platform configuration only —
 * never business logic. Configuration is database-backed, cached in-process
 * (invalidated on every write), versioned in the history table, and audited.
 * Other modules read configuration through {@link getValue} / {@link isFeatureEnabled}.
 */
export class SettingsService {
  private readonly cache: SettingsCache;

  public constructor(
    private readonly db: Database,
    private readonly settings: SettingsRepository,
    private readonly categories: SettingCategoryRepository,
    private readonly history: SettingHistoryRepository,
    private readonly toggles: FeatureToggleRepository,
    private readonly maintenance: MaintenanceRepository,
    private readonly audit: SettingsAuditRepository,
    private readonly events: SettingEventBus,
    cache?: SettingsCache,
  ) {
    this.cache = cache ?? new SettingsCache();
  }

  // --- Read seam for other modules ------------------------------------------

  /** Returns a configuration value by key (cached), or undefined if unset. */
  public async getValue<T = unknown>(key: string): Promise<T | undefined> {
    await this.cache.ensureLoaded(() => this.settings.loadValues());
    return this.cache.get(key) as T | undefined;
  }

  /** Whether a feature toggle is enabled (defaults to false when undefined). */
  public async isFeatureEnabled(key: string): Promise<boolean> {
    const toggle = await this.toggles.findByKey(key);
    return toggle?.enabled ?? false;
  }

  /** Exposed for tests/diagnostics. */
  public cacheLoaded(): boolean {
    return this.cache.isLoaded();
  }

  // --- Settings --------------------------------------------------------------

  public async listSettings(query: unknown): Promise<{ items: SettingData[] }> {
    const parsed = listSettingsQuerySchema.parse(query);
    let rows: SettingRow[];
    if (parsed.search) {
      rows = await this.settings.search(parsed.search);
    } else if (parsed.category) {
      rows = await this.settings.listByCategory(parsed.category.toUpperCase());
    } else {
      rows = await this.settings.listAll();
    }
    return { items: rows.map(toSetting) };
  }

  public async getCategories(): Promise<SettingCategoryData[]> {
    return (await this.categories.listAll()).map(toCategory);
  }

  public async updateSettings(input: unknown, actor: SettingActor): Promise<SettingData[]> {
    const { updates } = updateSettingsSchema.parse(input);
    return this.applyUpdates(updates, actor);
  }

  public async getBranding(): Promise<SettingData[]> {
    return (await this.settings.listByCategory('BRANDING')).map(toSetting);
  }

  public async updateBranding(input: unknown, actor: SettingActor): Promise<SettingData[]> {
    const data = updateBrandingSchema.parse(input);
    const updates: Record<string, unknown> = {};
    for (const [short, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates[`branding.${short}`] = value;
      }
    }
    return this.applyUpdates(updates, actor);
  }

  private async applyUpdates(
    updates: Record<string, unknown>,
    actor: SettingActor,
  ): Promise<SettingData[]> {
    // Validate everything up front so the whole update is atomic.
    const planned: Array<{ row: SettingRow; value: unknown }> = [];
    for (const [key, rawValue] of Object.entries(updates)) {
      const row = await this.settings.findByKey(key);
      if (!row) {
        throw new NotFoundError(`Unknown setting: ${key}.`);
      }
      const value = assertValidValue(key, row.valueType, rawValue);
      if (JSON.stringify(row.value) !== JSON.stringify(value)) {
        planned.push({ row, value });
      }
    }
    if (planned.length === 0) {
      return [];
    }

    const updatedRows = await withTransaction(this.db, async (tx) => {
      const result: SettingRow[] = [];
      for (const { row, value } of planned) {
        const updated = await this.settings.update(row.id, { value }, tx);
        const finalRow = updated ?? row;
        await this.history.append(
          {
            settingId: row.id,
            key: row.key,
            categoryCode: row.categoryCode,
            oldValue: row.value,
            newValue: value,
            version: finalRow.version,
            changedBy: actor.userId,
          },
          tx,
        );
        await this.writeAudit(
          row.id,
          'UPDATE',
          { key: row.key, oldValue: row.value, newValue: value },
          actor,
          tx,
        );
        result.push(finalRow);
      }
      return result;
    });

    this.cache.invalidate();

    const branding = new Set<string>();
    const localization = new Set<string>();
    for (const row of updatedRows) {
      await this.events.publish({
        type: 'SettingUpdated',
        key: row.key,
        categoryCode: row.categoryCode,
        actorId: actor.userId,
        at: new Date(),
      });
      if (row.categoryCode === 'BRANDING') branding.add('x');
      if (row.categoryCode === 'LOCALIZATION') localization.add('x');
      if (row.categoryCode === 'SECURITY') {
        await this.events.publish({
          type: 'SecuritySettingChanged',
          key: row.key,
          actorId: actor.userId,
          at: new Date(),
        });
      }
    }
    if (branding.size > 0) {
      await this.events.publish({ type: 'BrandingUpdated', actorId: actor.userId, at: new Date() });
    }
    if (localization.size > 0) {
      await this.events.publish({
        type: 'LocalizationUpdated',
        actorId: actor.userId,
        at: new Date(),
      });
    }

    return updatedRows.map(toSetting);
  }

  // --- History ---------------------------------------------------------------

  public async getHistory(query: unknown): Promise<PaginatedHistory> {
    const parsed = historyQuerySchema.parse(query);
    const page = await this.history.search(parsed);
    return { ...page, items: page.items.map(toHistory) };
  }

  // --- Feature toggles -------------------------------------------------------

  public async listFeatureToggles(): Promise<FeatureToggleData[]> {
    return (await this.toggles.listAll()).map(toFeatureToggle);
  }

  public async createFeatureToggle(
    input: unknown,
    actor: SettingActor,
  ): Promise<FeatureToggleData> {
    const data = createFeatureToggleSchema.parse(input);
    if (await this.toggles.findByKey(data.key)) {
      throw new ConflictError('A feature toggle with this key already exists.');
    }
    const created = await this.toggles.create({
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      enabled: data.enabled ?? false,
      strategy: data.strategy ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.writeAudit(
      created.id,
      'CREATE',
      { key: created.key, enabled: created.enabled },
      actor,
      this.db,
    );
    await this.events.publish({
      type: 'FeatureToggleChanged',
      key: created.key,
      enabled: created.enabled,
      actorId: actor.userId,
      at: new Date(),
    });
    return toFeatureToggle(created);
  }

  public async updateFeatureToggle(
    id: string,
    input: unknown,
    actor: SettingActor,
  ): Promise<FeatureToggleData> {
    const data = updateFeatureToggleSchema.parse(input);
    const existing = await this.toggles.findById(id);
    if (!existing) {
      throw new NotFoundError('Feature toggle not found.');
    }
    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.description !== undefined) values.description = data.description;
    if (data.enabled !== undefined) values.enabled = data.enabled;
    if (data.strategy !== undefined) values.strategy = data.strategy;
    const updated = (await this.toggles.update(id, values)) ?? existing;
    await this.writeAudit(
      id,
      'UPDATE',
      { key: updated.key, enabled: updated.enabled },
      actor,
      this.db,
    );
    if (data.enabled !== undefined && data.enabled !== existing.enabled) {
      await this.events.publish({
        type: 'FeatureToggleChanged',
        key: updated.key,
        enabled: updated.enabled,
        actorId: actor.userId,
        at: new Date(),
      });
    }
    return toFeatureToggle(updated);
  }

  // --- Maintenance mode ------------------------------------------------------

  public async getMaintenance(asOf: Date = new Date()): Promise<MaintenanceStatus> {
    const active = await this.maintenance.currentActive(asOf);
    return {
      active: active != null,
      window: active ? toMaintenanceWindow(active) : null,
    };
  }

  public async setMaintenance(input: unknown, actor: SettingActor): Promise<MaintenanceStatus> {
    const data = maintenanceSchema.parse(input);
    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      throw new BusinessRuleError('Maintenance start must be before end.');
    }
    // Only one active window at a time.
    await this.maintenance.deactivateActive(actor.userId);

    if (!data.enabled) {
      await this.writeAudit(
        '00000000-0000-0000-0000-000000000000',
        'UPDATE',
        { maintenance: false },
        actor,
        this.db,
      );
      await this.events.publish({
        type: 'MaintenanceModeDisabled',
        actorId: actor.userId,
        at: new Date(),
      });
      return this.getMaintenance();
    }

    const created = await this.maintenance.create({
      title: data.title ?? 'Scheduled maintenance',
      message: data.message ?? 'The platform is undergoing maintenance. Please check back soon.',
      isActive: true,
      allowAdminBypass: data.allowAdminBypass ?? true,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      activatedBy: actor.userId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.writeAudit(
      created.id,
      'CREATE',
      { maintenance: true, title: created.title },
      actor,
      this.db,
    );
    await this.events.publish({
      type: 'MaintenanceModeEnabled',
      windowId: created.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.getMaintenance();
  }

  // --- Public read (non-secret, display-safe) --------------------------------

  public async getPublicSettings(): Promise<PublicSettings> {
    const rows = await this.settings.listAll();
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.isPublic && !row.isSecret) {
        settings[row.key] = row.value;
      }
    }
    const maintenance = await this.getMaintenance();
    return {
      settings,
      maintenance: maintenance.window
        ? {
            active: true,
            title: maintenance.window.title,
            message: maintenance.window.message,
          }
        : null,
    };
  }

  // --- Internals -------------------------------------------------------------

  private async writeAudit(
    entityId: string,
    action: AuditActionType,
    newValue: Record<string, unknown>,
    actor: SettingActor,
    executor: Executor,
  ): Promise<void> {
    await this.audit.write(
      {
        entityType: 'setting',
        entityId,
        action,
        newValue,
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      executor,
    );
  }
}
