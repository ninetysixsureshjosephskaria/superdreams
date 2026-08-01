import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { RewardController } from '../controllers';
import type { RewardService } from '../services';

const REWARDS_PREFIX = '/api/v1/rewards';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const programParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;
const memberParams = {
  type: 'object',
  required: ['memberId'],
  properties: { memberId: uuidParam },
} as const;

const PROGRAM_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const RULE_TYPE = ['FIXED', 'PERCENTAGE', 'TIER', 'EVENT', 'MANUAL', 'PROMOTIONAL'];
const TXN_TYPE = ['EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE', 'REVERSAL'];
const DIRECTION = ['CREDIT', 'DEBIT'];
const points = { type: 'integer', minimum: 1 } as const;

const listProgramsSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'List reward programs (search, filter, sort, paginate)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      status: { type: 'string', enum: PROGRAM_STATUS },
      type: { type: 'string', enum: RULE_TYPE },
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'status', 'code'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const createProgramSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Create a reward program',
  security: secured,
  body: {
    type: 'object',
    required: ['code', 'name', 'type'],
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      type: { type: 'string', enum: RULE_TYPE },
      categoryCode: { type: 'string' },
      status: { type: 'string', enum: PROGRAM_STATUS },
      startsAt: { type: 'string' },
      endsAt: { type: 'string' },
      pointsPerUnit: { type: 'integer', minimum: 1 },
      rules: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: RULE_TYPE },
            points: { type: 'integer', minimum: 1 },
            rateBasisPoints: { type: 'integer', minimum: 1 },
            priority: { type: 'integer', minimum: 0 },
          },
        },
      },
      expiry: {
        type: 'object',
        required: ['policy'],
        properties: {
          policy: { type: 'string', enum: ['FIXED_DATE', 'ROLLING', 'NEVER'] },
          fixedDate: { type: 'string' },
          rollingDays: { type: 'integer', minimum: 1 },
        },
      },
    },
  },
};

const updateProgramSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Update a reward program',
  security: secured,
  params: programParams,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: ['string', 'null'] },
      categoryCode: { type: ['string', 'null'] },
      startsAt: { type: ['string', 'null'] },
      endsAt: { type: ['string', 'null'] },
      pointsPerUnit: { type: ['integer', 'null'], minimum: 1 },
    },
  },
};

const programStatusSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Change reward program status',
  security: secured,
  params: programParams,
  body: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: PROGRAM_STATUS }, reason: { type: 'string' } },
  },
};

const memberHistorySchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Member reward history (ledger)',
  security: secured,
  params: memberParams,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      type: { type: 'string', enum: TXN_TYPE },
      direction: { type: 'string', enum: DIRECTION },
      status: { type: 'string', enum: ['POSTED', 'REVERSED'] },
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const allocateSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Allocate / earn points for a member',
  security: secured,
  params: memberParams,
  body: {
    type: 'object',
    properties: {
      programId: uuidParam,
      ruleId: uuidParam,
      points,
      baseValue: { type: 'integer', minimum: 1 },
      description: { type: 'string' },
      reference: { type: 'string' },
      expiresInDays: { type: 'integer', minimum: 1 },
    },
  },
};

const redeemSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Redeem points for a member',
  security: secured,
  params: memberParams,
  body: {
    type: 'object',
    required: ['points'],
    properties: {
      points,
      note: { type: 'string' },
      reference: { type: 'string' },
      walletCreditMinor: { type: 'integer', minimum: 1 },
    },
  },
};

const adjustSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Manually adjust a member point balance',
  security: secured,
  params: memberParams,
  body: {
    type: 'object',
    required: ['direction', 'points', 'reason'],
    properties: {
      direction: { type: 'string', enum: DIRECTION },
      points,
      reason: { type: 'string' },
      reference: { type: 'string' },
    },
  },
};

const reverseSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Reverse a reward transaction',
  security: secured,
  params: {
    type: 'object',
    required: ['memberId', 'transactionId'],
    properties: { memberId: uuidParam, transactionId: uuidParam },
  },
};

const listTransactionsSchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'List reward transactions (global ledger)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      memberId: uuidParam,
      programId: uuidParam,
      type: { type: 'string', enum: TXN_TYPE },
      direction: { type: 'string', enum: DIRECTION },
      status: { type: 'string', enum: ['POSTED', 'REVERSED'] },
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      sortBy: { type: 'string', enum: ['createdAt', 'points'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const expirySchema: FastifySchema = {
  tags: ['Rewards'],
  summary: 'Run reward point expiry processing',
  security: secured,
  body: { type: 'object', properties: { asOf: { type: 'string' } } },
};

const idProgramSchema: FastifySchema = {
  tags: ['Rewards'],
  security: secured,
  params: programParams,
};
const memberBalanceSchema: FastifySchema = {
  tags: ['Rewards'],
  security: secured,
  params: memberParams,
};
const meSchema: FastifySchema = { tags: ['Rewards'], security: secured };

export interface RegisterRewardRoutesOptions {
  service: RewardService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers reward routes under `/api/v1/rewards`. Admin routes run
 * authentication then an RBAC permission guard; self-service `/me` routes run
 * authentication only (ownership is enforced in the controller/service).
 */
export function registerRewardRoutes(
  app: FastifyInstance,
  options: RegisterRewardRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new RewardController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      // Self-service (static paths first).
      instance.get('/me', { schema: meSchema, preHandler: authed }, controller.getMine);
      instance.get(
        '/me/history',
        { schema: meSchema, preHandler: authed },
        controller.getMyHistory,
      );

      // Programs.
      instance.get(
        '/programs',
        { schema: listProgramsSchema, preHandler: protect(PERMISSIONS.REWARD_READ) },
        controller.listPrograms,
      );
      instance.post(
        '/programs',
        { schema: createProgramSchema, preHandler: protect(PERMISSIONS.REWARD_PROGRAM_CREATE) },
        controller.createProgram,
      );
      instance.get(
        '/programs/:id',
        { schema: idProgramSchema, preHandler: protect(PERMISSIONS.REWARD_READ) },
        controller.getProgram,
      );
      instance.put(
        '/programs/:id',
        { schema: updateProgramSchema, preHandler: protect(PERMISSIONS.REWARD_PROGRAM_UPDATE) },
        controller.updateProgram,
      );
      instance.patch(
        '/programs/:id/status',
        { schema: programStatusSchema, preHandler: protect(PERMISSIONS.REWARD_PROGRAM_STATUS) },
        controller.changeProgramStatus,
      );

      // Global ledger + maintenance.
      instance.get(
        '/transactions',
        { schema: listTransactionsSchema, preHandler: protect(PERMISSIONS.REWARD_READ) },
        controller.listTransactions,
      );
      instance.post(
        '/expire',
        { schema: expirySchema, preHandler: protect(PERMISSIONS.REWARD_EXPIRE) },
        controller.runExpiry,
      );

      // Member rewards.
      instance.get(
        '/members/:memberId',
        { schema: memberBalanceSchema, preHandler: protect(PERMISSIONS.REWARD_READ) },
        controller.getMemberBalance,
      );
      instance.get(
        '/members/:memberId/history',
        { schema: memberHistorySchema, preHandler: protect(PERMISSIONS.REWARD_READ) },
        controller.getMemberHistory,
      );
      instance.post(
        '/members/:memberId/allocate',
        { schema: allocateSchema, preHandler: protect(PERMISSIONS.REWARD_ALLOCATE) },
        controller.allocate,
      );
      instance.post(
        '/members/:memberId/redeem',
        { schema: redeemSchema, preHandler: protect(PERMISSIONS.REWARD_REDEEM) },
        controller.redeem,
      );
      instance.post(
        '/members/:memberId/adjust',
        { schema: adjustSchema, preHandler: protect(PERMISSIONS.REWARD_ADJUST) },
        controller.adjust,
      );
      instance.post(
        '/members/:memberId/reverse/:transactionId',
        { schema: reverseSchema, preHandler: protect(PERMISSIONS.REWARD_ADJUST) },
        controller.reverse,
      );

      done();
    },
    { prefix: REWARDS_PREFIX },
  );
}
