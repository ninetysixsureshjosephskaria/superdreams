import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { CommissionController } from '../controllers';
import type { CommissionService } from '../services';

const PREFIX = '/api/v1/commission';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const tierItem = {
  type: 'object',
  required: ['fromUnits', 'rateBps'],
  properties: {
    fromUnits: { type: 'integer', minimum: 0 },
    toUnits: { type: ['integer', 'null'], minimum: 0 },
    rateBps: { type: 'integer', minimum: 0, maximum: 10000 },
  },
} as const;

const getSchema: FastifySchema = {
  tags: ['Commission'],
  summary: 'Get commission config (default tiers, targets, referral rate)',
  security: secured,
};
const referralSchema: FastifySchema = {
  tags: ['Commission'],
  summary: 'Update the member-referral rate',
  security: secured,
  body: {
    type: 'object',
    required: ['rateBps'],
    properties: { rateBps: { type: 'integer', minimum: 0, maximum: 10000 } },
  },
};
const defaultTiersSchema: FastifySchema = {
  tags: ['Commission'],
  summary: 'Replace the default commission tier table',
  security: secured,
  body: {
    type: 'object',
    required: ['tiers'],
    properties: { tiers: { type: 'array', items: tierItem } },
  },
};
const createTargetSchema: FastifySchema = {
  tags: ['Commission'],
  summary: 'Create a date-ranged commission target',
  security: secured,
  body: {
    type: 'object',
    required: ['startDate', 'endDate', 'tiers'],
    properties: {
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      tiers: { type: 'array', items: tierItem },
    },
  },
};
const processSchema: FastifySchema = {
  tags: ['Commission'],
  summary: 'Process partner commission + referral for an approved deposit (idempotent)',
  security: secured,
  body: {
    type: 'object',
    required: ['depositRequestId'],
    properties: { depositRequestId: uuidParam },
  },
};
const idOnlySchema: FastifySchema = { tags: ['Commission'], security: secured, params: idParams };

export interface RegisterCommissionRoutesOptions {
  service: CommissionService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers commission routes under `/api/v1/commission` (all require `commission.manage`). */
export function registerCommissionRoutes(
  app: FastifyInstance,
  options: RegisterCommissionRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new CommissionController(service);
  const manage: preHandlerAsyncHookHandler[] = [
    authenticate,
    requirePermission(guardDeps, PERMISSIONS.COMMISSION_MANAGE),
  ];

  app.register(
    (instance, _options, done) => {
      instance.get('/', { schema: getSchema, preHandler: manage }, controller.getConfig);
      instance.put(
        '/referral-rate',
        { schema: referralSchema, preHandler: manage },
        controller.updateReferralRate,
      );
      instance.put(
        '/default-tiers',
        { schema: defaultTiersSchema, preHandler: manage },
        controller.setDefaultTiers,
      );
      instance.post(
        '/targets',
        { schema: createTargetSchema, preHandler: manage },
        controller.createTarget,
      );
      instance.delete(
        '/targets/:id',
        { schema: idOnlySchema, preHandler: manage },
        controller.deleteTarget,
      );
      instance.post(
        '/process-deposit',
        { schema: processSchema, preHandler: manage },
        controller.processDeposit,
      );
      done();
    },
    { prefix: PREFIX },
  );
}
