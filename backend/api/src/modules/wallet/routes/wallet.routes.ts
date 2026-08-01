import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { WalletController } from '../controllers';
import type { WalletService } from '../services';

const WALLETS_PREFIX = '/api/v1/wallets';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const WALLET_STATUS = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'];
const TXN_TYPE = ['CREDIT', 'DEBIT', 'ADJUSTMENT', 'HOLD', 'RELEASE', 'REVERSAL'];
const DIRECTION = ['CREDIT', 'DEBIT'];

const amountBody = { type: 'integer', minimum: 1 } as const;

const listSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'List wallets (search, filter, sort, paginate)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      status: { type: 'string', enum: WALLET_STATUS },
      currencyCode: { type: 'string' },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'updatedAt', 'openedAt', 'status', 'walletNumber'],
      },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const transactionsQuerySchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'List wallet transactions (ledger)',
  security: secured,
  params: idParams,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      type: { type: 'string', enum: TXN_TYPE },
      direction: { type: 'string', enum: DIRECTION },
      status: { type: 'string', enum: ['POSTED', 'REVERSED'] },
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      minAmountMinor: { type: 'integer', minimum: 0 },
      maxAmountMinor: { type: 'integer', minimum: 0 },
      sortBy: { type: 'string', enum: ['createdAt', 'amountMinor'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const createSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Create a wallet for a member',
  security: secured,
  body: {
    type: 'object',
    required: ['memberId'],
    properties: {
      memberId: uuidParam,
      currencyCode: { type: 'string' },
      status: { type: 'string', enum: WALLET_STATUS },
      limits: {
        type: 'object',
        properties: {
          minBalanceMinor: { type: 'integer' },
          maxBalanceMinor: { type: 'integer', minimum: 0 },
          dailyDebitLimitMinor: { type: 'integer', minimum: 0 },
          singleTransactionLimitMinor: { type: 'integer', minimum: 1 },
          allowNegative: { type: 'boolean' },
        },
      },
    },
  },
};

const statusSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Change wallet status (activate / suspend / close)',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: WALLET_STATUS }, reason: { type: 'string' } },
  },
};

const amountSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Credit or debit a wallet',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['amountMinor'],
    properties: {
      amountMinor: amountBody,
      reference: { type: 'string' },
      description: { type: 'string' },
    },
  },
};

const adjustmentSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Post a manual balance adjustment',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['direction', 'amountMinor', 'reason'],
    properties: {
      direction: { type: 'string', enum: DIRECTION },
      amountMinor: amountBody,
      reason: { type: 'string' },
      reference: { type: 'string' },
    },
  },
};

const holdSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Place a hold on wallet funds',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['amountMinor'],
    properties: {
      amountMinor: amountBody,
      reason: { type: 'string' },
      reference: { type: 'string' },
    },
  },
};

const releaseHoldSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Release a hold',
  security: secured,
  params: {
    type: 'object',
    required: ['id', 'holdId'],
    properties: { id: uuidParam, holdId: uuidParam },
  },
};

const reverseSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Reverse a transaction',
  security: secured,
  params: {
    type: 'object',
    required: ['id', 'transactionId'],
    properties: { id: uuidParam, transactionId: uuidParam },
  },
};

const generateStatementSchema: FastifySchema = {
  tags: ['Wallets'],
  summary: 'Generate a wallet statement',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    properties: { periodStart: { type: 'string' }, periodEnd: { type: 'string' } },
  },
};

const idOnlySchema: FastifySchema = { tags: ['Wallets'], security: secured, params: idParams };
const meSchema: FastifySchema = { tags: ['Wallets'], security: secured };

export interface RegisterWalletRoutesOptions {
  service: WalletService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers wallet routes under `/api/v1/wallets`. Admin routes run
 * authentication then an RBAC permission guard; self-service `/me` routes run
 * authentication only (ownership is enforced in the controller/service).
 */
export function registerWalletRoutes(
  app: FastifyInstance,
  options: RegisterWalletRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new WalletController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      // Self-service (static paths — resolve before `/:id`).
      instance.get('/me', { schema: meSchema, preHandler: authed }, controller.getMine);
      instance.get(
        '/me/balance',
        { schema: meSchema, preHandler: authed },
        controller.getMyBalance,
      );
      instance.get(
        '/me/transactions',
        { schema: meSchema, preHandler: authed },
        controller.listMyTransactions,
      );
      instance.get(
        '/me/statements',
        { schema: meSchema, preHandler: authed },
        controller.listMyStatements,
      );
      instance.get('/me/holds', { schema: meSchema, preHandler: authed }, controller.listMyHolds);

      // Admin.
      instance.get(
        '/',
        { schema: listSchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.list,
      );
      instance.post(
        '/',
        { schema: createSchema, preHandler: protect(PERMISSIONS.WALLET_CREATE) },
        controller.create,
      );
      instance.get(
        '/:id',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.get,
      );
      instance.get(
        '/:id/balance',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.getBalance,
      );
      instance.get(
        '/:id/transactions',
        { schema: transactionsQuerySchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.listTransactions,
      );
      instance.get(
        '/:id/holds',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.listHolds,
      );
      instance.get(
        '/:id/statements',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.listStatements,
      );
      instance.get(
        '/:id/balance/validate',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.WALLET_READ) },
        controller.validateBalance,
      );

      instance.patch(
        '/:id/status',
        { schema: statusSchema, preHandler: protect(PERMISSIONS.WALLET_STATUS) },
        controller.changeStatus,
      );
      instance.post(
        '/:id/credits',
        { schema: amountSchema, preHandler: protect(PERMISSIONS.WALLET_CREDIT) },
        controller.credit,
      );
      instance.post(
        '/:id/debits',
        { schema: amountSchema, preHandler: protect(PERMISSIONS.WALLET_DEBIT) },
        controller.debit,
      );
      instance.post(
        '/:id/adjustments',
        { schema: adjustmentSchema, preHandler: protect(PERMISSIONS.WALLET_ADJUST) },
        controller.adjust,
      );
      instance.post(
        '/:id/holds',
        { schema: holdSchema, preHandler: protect(PERMISSIONS.WALLET_HOLD) },
        controller.placeHold,
      );
      instance.delete(
        '/:id/holds/:holdId',
        { schema: releaseHoldSchema, preHandler: protect(PERMISSIONS.WALLET_HOLD) },
        controller.releaseHold,
      );
      instance.post(
        '/:id/transactions/:transactionId/reversal',
        { schema: reverseSchema, preHandler: protect(PERMISSIONS.WALLET_ADJUST) },
        controller.reverse,
      );
      instance.post(
        '/:id/statements',
        { schema: generateStatementSchema, preHandler: protect(PERMISSIONS.WALLET_STATEMENT) },
        controller.generateStatement,
      );

      done();
    },
    { prefix: WALLETS_PREFIX },
  );
}
