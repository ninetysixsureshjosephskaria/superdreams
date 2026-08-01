import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';

import { SettingEventBus } from './events';
import {
  FeatureToggleRepository,
  MaintenanceRepository,
  SettingCategoryRepository,
  SettingHistoryRepository,
  SettingsAuditRepository,
  SettingsRepository,
} from './repositories';
import { registerSettingsRoutes } from './routes';
import { SettingsService } from './services';

export interface SettingsModule {
  events: SettingEventBus;
  service: SettingsService;
}

/** Composition root for the Settings & Administration module. */
export function createSettingsModule(
  db: Database,
  options: { events?: SettingEventBus } = {},
): SettingsModule {
  const events = options.events ?? new SettingEventBus();
  const service = new SettingsService(
    db,
    new SettingsRepository(db),
    new SettingCategoryRepository(db),
    new SettingHistoryRepository(db),
    new FeatureToggleRepository(db),
    new MaintenanceRepository(db),
    new SettingsAuditRepository(),
    events,
  );
  return { events, service };
}

/**
 * Wires Settings & Administration into the application: reuses Authentication for
 * the authenticate preHandler and RBAC for permission guards. The module owns
 * configuration only and never contains business logic.
 */
export function registerSettingsModule(app: FastifyInstance): SettingsModule {
  const module = createSettingsModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerSettingsRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { SettingEventBus } from './events';
export type { SettingEvent, SettingEventType, SettingEventHandler } from './events';
export { SettingsService } from './services';
export { SettingsCache } from './cache';
export type {
  SettingData,
  SettingCategoryData,
  SettingHistoryData,
  FeatureToggleData,
  MaintenanceWindowData,
  MaintenanceStatus,
  PublicSettings,
  SettingValueType,
} from './dto';
