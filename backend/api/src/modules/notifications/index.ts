import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';

import { NotificationEventBus } from './events';
import { createDefaultProviderRegistry, type ProviderRegistry } from './providers';
import {
  NotificationAuditRepository,
  NotificationDeliveryRepository,
  NotificationEventMappingRepository,
  NotificationGroupRepository,
  NotificationLogRepository,
  NotificationPreferenceRepository,
  NotificationQueueRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  RecipientLookupRepository,
} from './repositories';
import { registerNotificationRoutes } from './routes';
import {
  createNotificationScheduler,
  type NotificationScheduler,
} from './schedulers/notification.scheduler';
import { NotificationService } from './services';

export interface NotificationsModule {
  events: NotificationEventBus;
  service: NotificationService;
  scheduler: NotificationScheduler;
}

/** Composition root for the Notification Center module. */
export function createNotificationsModule(
  db: Database,
  options: { events?: NotificationEventBus; providers?: ProviderRegistry } = {},
): NotificationsModule {
  const events = options.events ?? new NotificationEventBus();
  const providers = options.providers ?? createDefaultProviderRegistry();

  const service = new NotificationService(
    db,
    new NotificationTemplateRepository(db),
    new NotificationRepository(db),
    new NotificationQueueRepository(db),
    new NotificationDeliveryRepository(db),
    new NotificationLogRepository(db),
    new NotificationPreferenceRepository(db),
    new NotificationEventMappingRepository(db),
    new NotificationGroupRepository(db),
    new RecipientLookupRepository(db),
    new NotificationAuditRepository(),
    events,
    providers,
  );

  return { events, service, scheduler: createNotificationScheduler(service) };
}

/**
 * Wires the Notification Center into the application: reuses Authentication for
 * the authenticate preHandler and RBAC for permission guards. Delivery uses the
 * default provider registry (in-app real; email/sms/push mocked).
 */
export function registerNotificationsModule(app: FastifyInstance): NotificationsModule {
  const module = createNotificationsModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerNotificationRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { NotificationEventBus } from './events';
export type { NotificationEvent, NotificationEventType, NotificationEventHandler } from './events';
export { NotificationService } from './services';
export { createNotificationScheduler } from './schedulers/notification.scheduler';
export {
  createDefaultProviderRegistry,
  ProviderRegistry,
  type NotificationProvider,
} from './providers';
export type {
  TemplateData,
  NotificationData,
  QueueItemData,
  DeliveryData,
  NotificationLogData,
  PreferenceData,
  PaginatedTemplates,
  PaginatedNotifications,
  NotificationChannel,
  NotificationStatus,
} from './dto';
export { isNotificationOwner, assertNotificationOwner } from './policies';
