import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import {
  PERMISSIONS,
  requireAnyPermission,
  requirePermission,
  type GuardDeps,
} from '@/modules/rbac';

import { FinanceController } from '../controllers';
import type { FinanceService } from '../services';

const FINANCE_PREFIX = '/api/v1/finance';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const REQUEST_TYPE = ['DEPOSIT', 'WITHDRAW'];
const REQUEST_STATUS = ['PENDING', 'HOLD', 'APPROVED', 'REJECTED'];
const unitsBody = { type: 'integer', minimum: 1 } as const;

const createDepositSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'Submit a deposit request (in units; 1 unit = $30)',
  security: secured,
  body: {
    type: 'object',
    required: ['units'],
    properties: { units: unitsBody, reason: { type: 'string' } },
  },
};

const createWithdrawalSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'Submit a withdrawal request (in units; 1 unit = $30)',
  security: secured,
  body: {
    type: 'object',
    required: ['units'],
    properties: { units: unitsBody, early: { type: 'boolean' }, reason: { type: 'string' } },
  },
};

const listSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'List deposit / withdrawal requests (action queue)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      type: { type: 'string', enum: REQUEST_TYPE },
      status: { type: 'string', enum: REQUEST_STATUS },
      memberId: uuidParam,
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'amountCents'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const decisionSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'Approve / hold a request',
  security: secured,
  params: idParams,
  body: { type: 'object', properties: { reason: { type: 'string' } } },
};

const rejectSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'Reject a request',
  security: secured,
  params: idParams,
  body: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } },
};

const idOnlySchema: FastifySchema = { tags: ['Finance'], security: secured, params: idParams };
const meSchema: FastifySchema = { tags: ['Finance'], security: secured };

const getLimitsSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'Get the system-wide deposit / withdrawal limits policy',
  security: secured,
};

const updateLimitsSchema: FastifySchema = {
  tags: ['Finance'],
  summary: 'Update the system-wide deposit / withdrawal limits policy',
  security: secured,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      minDepositUnits: { type: 'integer', minimum: 1 },
      maxDepositUnits: { type: 'integer', minimum: 1 },
      minWithdrawCents: { type: 'integer', minimum: 0 },
      earlyWithdrawAllowed: { type: 'boolean' },
      earlyWithdrawFeeBps: { type: 'integer', minimum: 0, maximum: 10000 },
      processingMinDays: { type: 'integer', minimum: 0 },
      processingMaxDays: { type: 'integer', minimum: 0 },
    },
  },
};

export interface RegisterFinanceRoutesOptions {
  service: FinanceService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers finance routes under `/api/v1/finance`. Member self-service routes
 * run authentication only (the member id is resolved from the caller's account);
 * admin routes run authentication then an RBAC permission guard. The unified
 * approve/reject/hold guard requires at least one finance-approval permission;
 * the service refines it to the specific request type.
 */
export function registerFinanceRoutes(
  app: FastifyInstance,
  options: RegisterFinanceRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new FinanceController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const canDecide: preHandlerAsyncHookHandler[] = [
    authenticate,
    requireAnyPermission(guardDeps, [
      PERMISSIONS.FINANCE_DEPOSIT_APPROVE,
      PERMISSIONS.FINANCE_WITHDRAW_APPROVE,
    ]),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      // Member self-service (static paths resolve before `/requests/:id`).
      instance.post(
        '/deposits',
        { schema: createDepositSchema, preHandler: authed },
        controller.createDeposit,
      );
      instance.post(
        '/withdrawals',
        { schema: createWithdrawalSchema, preHandler: authed },
        controller.createWithdrawal,
      );
      instance.get('/me/requests', { schema: meSchema, preHandler: authed }, controller.listMine);
      instance.get(
        '/me/tranches',
        { schema: meSchema, preHandler: authed },
        controller.listMyTranches,
      );

      // Tranche lifecycle (Phase 2E).
      instance.post(
        '/me/tranches/:id/early-unlock',
        { schema: idOnlySchema, preHandler: authed },
        controller.earlyUnlockMyTranche,
      );
      instance.post(
        '/tranches/mature',
        { schema: meSchema, preHandler: protect(PERMISSIONS.FINANCE_TRANCHE_MANAGE) },
        controller.runTrancheMaturity,
      );
      instance.post(
        '/tranches/:id/liquidate',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.FINANCE_TRANCHE_MANAGE) },
        controller.liquidateTranche,
      );

      // Limits policy — readable by any authenticated caller (member deposit/withdraw
      // forms need it); only the limits-manage permission may change it.
      instance.get(
        '/limits',
        { schema: getLimitsSchema, preHandler: authed },
        controller.getLimits,
      );
      instance.put(
        '/limits',
        { schema: updateLimitsSchema, preHandler: protect(PERMISSIONS.FINANCE_LIMITS_MANAGE) },
        controller.updateLimits,
      );

      // Admin action queue.
      instance.get(
        '/requests',
        { schema: listSchema, preHandler: protect(PERMISSIONS.FINANCE_READ) },
        controller.list,
      );
      instance.get(
        '/requests/:id',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.FINANCE_READ) },
        controller.get,
      );
      instance.post(
        '/requests/:id/approve',
        { schema: decisionSchema, preHandler: canDecide },
        controller.approve,
      );
      instance.post(
        '/requests/:id/reject',
        { schema: rejectSchema, preHandler: canDecide },
        controller.reject,
      );
      instance.post(
        '/requests/:id/hold',
        { schema: decisionSchema, preHandler: canDecide },
        controller.hold,
      );

      done();
    },
    { prefix: FINANCE_PREFIX },
  );
}
