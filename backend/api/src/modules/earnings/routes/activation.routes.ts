import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { ActivationController } from '../controllers';
import type { ActivationBonusService } from '../services';

const PREFIX = '/api/v1/activation-bonus';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;

const getSchema: FastifySchema = {
  tags: ['ActivationBonus'],
  summary: 'Get the activation bonus config',
  security: secured,
};
const updateSchema: FastifySchema = {
  tags: ['ActivationBonus'],
  summary: 'Update the activation bonus config',
  security: secured,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      enabled: { type: 'boolean' },
      rewardType: { type: 'string', enum: ['PERCENT', 'FIXED'] },
      value: { type: 'integer', minimum: 0, maximum: 10_000_000 },
      lockDays: { type: 'integer', minimum: 0, maximum: 3650 },
    },
  },
};
const processMemberSchema: FastifySchema = {
  tags: ['ActivationBonus'],
  summary: 'Evaluate + grant the activation bonus for a member (idempotent)',
  security: secured,
  body: { type: 'object', required: ['memberId'], properties: { memberId: uuidParam } },
};
const processAllSchema: FastifySchema = {
  tags: ['ActivationBonus'],
  summary: 'Evaluate + grant the activation bonus network-wide (idempotent)',
  security: secured,
};

export interface RegisterActivationRoutesOptions {
  service: ActivationBonusService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers activation-bonus routes under `/api/v1/activation-bonus` (all `activation.bonus.manage`). */
export function registerActivationRoutes(
  app: FastifyInstance,
  options: RegisterActivationRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new ActivationController(service);
  const manage: preHandlerAsyncHookHandler[] = [
    authenticate,
    requirePermission(guardDeps, PERMISSIONS.ACTIVATION_BONUS_MANAGE),
  ];

  app.register(
    (instance, _options, done) => {
      instance.get('/', { schema: getSchema, preHandler: manage }, controller.getConfig);
      instance.put('/', { schema: updateSchema, preHandler: manage }, controller.updateConfig);
      instance.post(
        '/process',
        { schema: processMemberSchema, preHandler: manage },
        controller.processMember,
      );
      instance.post(
        '/process-all',
        { schema: processAllSchema, preHandler: manage },
        controller.processAll,
      );
      done();
    },
    { prefix: PREFIX },
  );
}
