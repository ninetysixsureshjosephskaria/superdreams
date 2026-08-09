import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { BonusController } from '../controllers';
import type { BonusService } from '../services';

const PREFIX = '/api/v1/bonus-campaigns';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;
const SCOPE = ['FIRST_DEPOSIT', 'ALL_DEPOSITS'];
const FREQ = ['SINGLE', 'MULTI'];

const bodyProps = {
  name: { type: 'string' },
  icon: { type: 'string' },
  scope: { type: 'string', enum: SCOPE },
  frequency: { type: 'string', enum: FREQ },
  rateBps: { type: 'integer', minimum: 0, maximum: 10000 },
  lockDays: { type: 'integer', minimum: 0, maximum: 3650 },
  minUnits: { type: 'integer', minimum: 0 },
  permanent: { type: 'boolean' },
  startAt: { type: 'string' },
  endAt: { type: 'string' },
  enabled: { type: 'boolean' },
} as const;

const listSchema: FastifySchema = {
  tags: ['Bonus'],
  summary: 'List bonus campaigns',
  security: secured,
};
const createSchema: FastifySchema = {
  tags: ['Bonus'],
  summary: 'Create a bonus campaign',
  security: secured,
  body: {
    type: 'object',
    required: ['name', 'scope', 'frequency', 'rateBps'],
    properties: bodyProps,
  },
};
const updateSchema: FastifySchema = {
  tags: ['Bonus'],
  summary: 'Update a bonus campaign',
  security: secured,
  params: idParams,
  body: { type: 'object', additionalProperties: false, properties: bodyProps },
};
const idOnlySchema: FastifySchema = { tags: ['Bonus'], security: secured, params: idParams };
const applySchema: FastifySchema = {
  tags: ['Bonus'],
  summary: 'Apply the eligible bonus campaign to an approved deposit (idempotent)',
  security: secured,
  body: {
    type: 'object',
    required: ['depositRequestId'],
    properties: { depositRequestId: uuidParam },
  },
};

export interface RegisterBonusRoutesOptions {
  service: BonusService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers bonus-campaign routes under `/api/v1/bonus-campaigns` (all `bonus.manage`). */
export function registerBonusRoutes(
  app: FastifyInstance,
  options: RegisterBonusRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new BonusController(service);
  const manage: preHandlerAsyncHookHandler[] = [
    authenticate,
    requirePermission(guardDeps, PERMISSIONS.BONUS_MANAGE),
  ];

  app.register(
    (instance, _options, done) => {
      instance.get('/', { schema: listSchema, preHandler: manage }, controller.list);
      instance.post('/', { schema: createSchema, preHandler: manage }, controller.create);
      instance.post(
        '/apply',
        { schema: applySchema, preHandler: manage },
        controller.applyForDeposit,
      );
      instance.get('/:id', { schema: idOnlySchema, preHandler: manage }, controller.get);
      instance.put('/:id', { schema: updateSchema, preHandler: manage }, controller.update);
      instance.delete('/:id', { schema: idOnlySchema, preHandler: manage }, controller.remove);
      done();
    },
    { prefix: PREFIX },
  );
}
