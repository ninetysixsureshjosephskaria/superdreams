import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { ProfitController } from '../controllers';
import type { ProfitService } from '../services';

const PREFIX = '/api/v1/profit';
const secured = [{ bearerAuth: [] }];

const bps = { type: 'integer', minimum: 0, maximum: 1_000_000 } as const;

const monthParams = {
  type: 'object',
  required: ['month'],
  properties: { month: { type: 'string' } },
} as const;

const planSchema: FastifySchema = {
  tags: ['Profit'],
  summary: 'Auto-plan a monthly daily-profit schedule (DRAFT)',
  security: secured,
  body: {
    type: 'object',
    required: ['month', 'memberMonthlyBps', 'partnerMonthlyBps'],
    properties: { month: { type: 'string' }, memberMonthlyBps: bps, partnerMonthlyBps: bps },
  },
};
const setDaySchema: FastifySchema = {
  tags: ['Profit'],
  summary: 'Fine-tune one day of a DRAFT schedule',
  security: secured,
  body: {
    type: 'object',
    required: ['day'],
    properties: {
      day: { type: 'string' },
      memberBps: bps,
      partnerBps: bps,
      off: { type: 'boolean' },
    },
  },
};
const monthBodySchema: FastifySchema = {
  tags: ['Profit'],
  summary: 'Publish a monthly schedule',
  security: secured,
  body: { type: 'object', required: ['month'], properties: { month: { type: 'string' } } },
};
const getScheduleSchema: FastifySchema = {
  tags: ['Profit'],
  summary: 'Get a monthly schedule',
  security: secured,
  params: monthParams,
};
const distributeSchema: FastifySchema = {
  tags: ['Profit'],
  summary: 'Distribute daily profit for a day (idempotent)',
  security: secured,
  body: {
    type: 'object',
    required: ['day'],
    properties: { day: { type: 'string' }, memberBps: bps, partnerBps: bps },
  },
};
const historySchema: FastifySchema = {
  tags: ['Profit'],
  summary: 'Distribution history for a date range',
  security: secured,
  querystring: {
    type: 'object',
    required: ['from', 'to'],
    properties: { from: { type: 'string' }, to: { type: 'string' } },
  },
};

export interface RegisterProfitRoutesOptions {
  service: ProfitService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers daily-profit routes under `/api/v1/profit`. */
export function registerProfitRoutes(
  app: FastifyInstance,
  options: RegisterProfitRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new ProfitController(service);
  const schedule = (): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, PERMISSIONS.PROFIT_SCHEDULE),
  ];
  const distribute = (): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, PERMISSIONS.PROFIT_DISTRIBUTE),
  ];

  app.register(
    (instance, _options, done) => {
      instance.post(
        '/schedule/plan',
        { schema: planSchema, preHandler: schedule() },
        controller.planMonth,
      );
      instance.post(
        '/schedule/day',
        { schema: setDaySchema, preHandler: schedule() },
        controller.setDay,
      );
      instance.post(
        '/schedule/publish',
        { schema: monthBodySchema, preHandler: schedule() },
        controller.publish,
      );
      instance.get(
        '/schedule/:month',
        { schema: getScheduleSchema, preHandler: schedule() },
        controller.getSchedule,
      );
      instance.post(
        '/distribute',
        { schema: distributeSchema, preHandler: distribute() },
        controller.distribute,
      );
      instance.get(
        '/history',
        { schema: historySchema, preHandler: distribute() },
        controller.history,
      );
      done();
    },
    { prefix: PREFIX },
  );
}
