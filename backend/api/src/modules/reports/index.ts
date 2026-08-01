import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';

import { ReportEventBus } from './events';
import type { ExporterRegistry } from './exporters';
import {
  DashboardRepository,
  ReportAuditRepository,
  ReportCatalogRepository,
  ReportExportRepository,
  ReportHistoryRepository,
  ReportScheduleRepository,
  ReportSourceRepository,
  SavedReportRepository,
} from './repositories';
import { registerReportRoutes } from './routes';
import { createReportScheduler, type ReportScheduler } from './schedulers/report.scheduler';
import { ReportService } from './services';

export interface ReportsModule {
  events: ReportEventBus;
  service: ReportService;
  scheduler: ReportScheduler;
}

/** Composition root for the Reports & Analytics module. */
export function createReportsModule(
  db: Database,
  options: { events?: ReportEventBus; exporters?: ExporterRegistry } = {},
): ReportsModule {
  const events = options.events ?? new ReportEventBus();
  const service = new ReportService(
    db,
    new ReportSourceRepository(db),
    new ReportCatalogRepository(db),
    new ReportExportRepository(db),
    new ReportScheduleRepository(db),
    new ReportHistoryRepository(db),
    new DashboardRepository(db),
    new SavedReportRepository(db),
    new ReportAuditRepository(),
    events,
    options.exporters,
  );
  return { events, service, scheduler: createReportScheduler(service) };
}

/**
 * Wires Reports & Analytics into the application: reuses Authentication for the
 * authenticate preHandler and RBAC for permission guards. The module is strictly
 * read-only over the business modules — it never writes to their tables.
 */
export function registerReportsModule(app: FastifyInstance): ReportsModule {
  const module = createReportsModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerReportRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { ReportEventBus } from './events';
export type { ReportEvent, ReportEventType, ReportEventHandler } from './events';
export { ReportService } from './services';
export { createReportScheduler } from './schedulers/report.scheduler';
export {
  createDefaultExporterRegistry,
  ExporterRegistry,
  renderCsv,
  type ReportExporter,
} from './exporters';
export { REPORT_GENERATORS, getGenerator } from './generators';
export type {
  ReportResult,
  ReportDefinitionData,
  ReportExportData,
  ReportScheduleData,
  DashboardData,
  MemberWalletSummary,
  MemberRewardSummary,
} from './dto';
