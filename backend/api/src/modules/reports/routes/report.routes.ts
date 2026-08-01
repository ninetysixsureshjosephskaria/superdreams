import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { ReportController } from '../controllers';
import type { ReportService } from '../services';

const PREFIX = '/api/v1';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const FORMATS = ['CSV', 'XLSX', 'PDF'];
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
const JOB_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];

const filtersSchema = {
  type: 'object',
  properties: {
    dateFrom: { type: 'string' },
    dateTo: { type: 'string' },
    status: { type: 'string' },
    memberId: uuidParam,
    campaignId: uuidParam,
    rewardProgramId: uuidParam,
    walletId: uuidParam,
    channel: { type: 'string' },
  },
} as const;

const listReportsSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'List report definitions',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      category: { type: 'string' },
      source: { type: 'string' },
      sortBy: { type: 'string', enum: ['createdAt', 'name', 'code'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const runSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Run a report and return its result',
  security: secured,
  body: {
    type: 'object',
    required: ['code'],
    properties: { code: { type: 'string' }, filters: filtersSchema },
  },
};

const listExportsSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'List report exports',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      code: { type: 'string' },
      status: { type: 'string', enum: JOB_STATUSES },
      format: { type: 'string', enum: FORMATS },
    },
  },
};

const createExportSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Generate a report export',
  security: secured,
  body: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string' },
      format: { type: 'string', enum: FORMATS },
      filters: filtersSchema,
    },
  },
};

const scheduleBody = {
  type: 'object',
  required: ['code', 'name'],
  properties: {
    code: { type: 'string' },
    name: { type: 'string' },
    frequency: { type: 'string', enum: FREQUENCIES },
    cron: { type: 'string' },
    filters: filtersSchema,
    format: { type: 'string', enum: FORMATS },
  },
} as const;

const createScheduleSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Schedule a report',
  security: secured,
  body: scheduleBody,
};

const updateScheduleSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Update a scheduled report',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      frequency: { type: 'string', enum: FREQUENCIES },
      cron: { type: ['string', 'null'] },
      filters: filtersSchema,
      format: { type: 'string', enum: FORMATS },
      isActive: { type: 'boolean' },
    },
  },
};

const listHistorySchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'List report execution history',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      code: { type: 'string' },
      status: { type: 'string', enum: JOB_STATUSES },
      trigger: { type: 'string', enum: ['RUN', 'EXPORT', 'SCHEDULE'] },
    },
  },
};

const paginatedQuery: FastifySchema = {
  tags: ['Reports'],
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

const saveReportSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Save a report configuration',
  security: secured,
  body: {
    type: 'object',
    required: ['name', 'code'],
    properties: {
      name: { type: 'string' },
      code: { type: 'string' },
      filters: filtersSchema,
      isShared: { type: 'boolean' },
    },
  },
};

const savedFilterSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Save a filter set',
  security: secured,
  body: {
    type: 'object',
    required: ['reportCode', 'name', 'filters'],
    properties: {
      reportCode: { type: 'string' },
      name: { type: 'string' },
      filters: filtersSchema,
    },
  },
};

const favoriteBody: FastifySchema = {
  tags: ['Reports'],
  summary: 'Add a favorite report',
  security: secured,
  body: {
    type: 'object',
    required: ['definitionCode'],
    properties: { definitionCode: { type: 'string' } },
  },
};

const dashboardLayoutSchema: FastifySchema = {
  tags: ['Reports'],
  summary: 'Update the dashboard layout',
  security: secured,
  body: {
    type: 'object',
    required: ['layout'],
    properties: {
      layout: {
        type: 'array',
        items: {
          type: 'object',
          required: ['widgetCode', 'position'],
          properties: {
            widgetCode: { type: 'string' },
            position: { type: 'integer', minimum: 0 },
            size: { type: 'string', enum: ['sm', 'md', 'lg', 'full'] },
          },
        },
      },
    },
  },
};

const tagged: FastifySchema = { tags: ['Reports'], security: secured };
const idOnly: FastifySchema = { tags: ['Reports'], security: secured, params: idParams };

export interface RegisterReportRoutesOptions {
  service: ReportService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers report routes. Admin routes require RBAC; `/reports/me*` are auth-only. */
export function registerReportRoutes(
  app: FastifyInstance,
  options: RegisterReportRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new ReportController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];
  const P = PERMISSIONS;

  app.register(
    (instance, _options, done) => {
      // Dashboards.
      instance.get(
        '/dashboards',
        { schema: tagged, preHandler: protect(P.REPORT_READ) },
        controller.getDashboard,
      );
      instance.put(
        '/dashboards/layout',
        { schema: dashboardLayoutSchema, preHandler: protect(P.REPORT_READ) },
        controller.updateDashboardLayout,
      );

      // Static /reports/* routes (registered before the /reports/:id param route).
      instance.get(
        '/reports',
        { schema: listReportsSchema, preHandler: protect(P.REPORT_READ) },
        controller.listReports,
      );
      instance.get(
        '/reports/categories',
        { schema: tagged, preHandler: protect(P.REPORT_READ) },
        controller.listCategories,
      );
      instance.post(
        '/reports/run',
        { schema: runSchema, preHandler: protect(P.REPORT_READ) },
        controller.run,
      );
      instance.get(
        '/reports/history',
        { schema: listHistorySchema, preHandler: protect(P.REPORT_READ) },
        controller.listHistory,
      );

      // Exports.
      instance.get(
        '/reports/exports',
        { schema: listExportsSchema, preHandler: protect(P.REPORT_READ) },
        controller.listExports,
      );
      instance.post(
        '/reports/exports',
        { schema: createExportSchema, preHandler: protect(P.REPORT_EXPORT) },
        controller.createExport,
      );
      instance.get(
        '/reports/exports/:id',
        { schema: idOnly, preHandler: protect(P.REPORT_READ) },
        controller.getExport,
      );
      instance.get(
        '/reports/exports/:id/download',
        { schema: idOnly, preHandler: protect(P.REPORT_EXPORT) },
        controller.downloadExport,
      );

      // Schedules.
      instance.get(
        '/reports/schedules',
        { schema: listHistorySchema, preHandler: protect(P.REPORT_READ) },
        controller.listSchedules,
      );
      instance.post(
        '/reports/schedule',
        { schema: createScheduleSchema, preHandler: protect(P.REPORT_SCHEDULE) },
        controller.createSchedule,
      );
      instance.patch(
        '/reports/schedules/:id',
        { schema: updateScheduleSchema, preHandler: protect(P.REPORT_SCHEDULE) },
        controller.updateSchedule,
      );
      instance.delete(
        '/reports/schedules/:id',
        { schema: idOnly, preHandler: protect(P.REPORT_SCHEDULE) },
        controller.deleteSchedule,
      );

      // Saved reports.
      instance.get(
        '/reports/saved',
        { schema: paginatedQuery, preHandler: protect(P.REPORT_READ) },
        controller.listSavedReports,
      );
      instance.post(
        '/reports/saved',
        { schema: saveReportSchema, preHandler: protect(P.REPORT_READ) },
        controller.saveReport,
      );
      instance.delete(
        '/reports/saved/:id',
        { schema: idOnly, preHandler: protect(P.REPORT_READ) },
        controller.deleteSavedReport,
      );

      // Saved filters.
      instance.get(
        '/reports/saved-filters',
        { schema: tagged, preHandler: protect(P.REPORT_READ) },
        controller.listSavedFilters,
      );
      instance.post(
        '/reports/saved-filters',
        { schema: savedFilterSchema, preHandler: protect(P.REPORT_READ) },
        controller.createSavedFilter,
      );

      // Favorites.
      instance.get(
        '/reports/favorites',
        { schema: tagged, preHandler: protect(P.REPORT_READ) },
        controller.listFavorites,
      );
      instance.post(
        '/reports/favorites',
        { schema: favoriteBody, preHandler: protect(P.REPORT_READ) },
        controller.addFavorite,
      );
      instance.delete(
        '/reports/favorites/:code',
        { schema: tagged, preHandler: protect(P.REPORT_READ) },
        controller.removeFavorite,
      );

      // Member portal (own data; auth-only).
      instance.get(
        '/reports/me/wallet-summary',
        { schema: tagged, preHandler: authed },
        controller.myWalletSummary,
      );
      instance.get(
        '/reports/me/rewards-summary',
        { schema: tagged, preHandler: authed },
        controller.myRewardSummary,
      );

      // Param route last.
      instance.get(
        '/reports/:id',
        { schema: idOnly, preHandler: protect(P.REPORT_READ) },
        controller.getReport,
      );

      done();
    },
    { prefix: PREFIX },
  );
}
