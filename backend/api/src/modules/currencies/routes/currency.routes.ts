import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { CurrencyController } from '../controllers';
import type { CurrencyService } from '../services';

const CURRENCIES_PREFIX = '/api/v1/currencies';
const secured = [{ bearerAuth: [] }];
const codeParam = { type: 'string', minLength: 3, maxLength: 3 } as const;
const codeParams = { type: 'object', required: ['code'], properties: { code: codeParam } } as const;

const listSchema: FastifySchema = {
  tags: ['Currencies'],
  summary: 'List currencies (fixed internal per-unit table)',
  security: secured,
  querystring: { type: 'object', properties: { activeOnly: { type: 'boolean' } } },
};

const bodyProps = {
  name: { type: 'string' },
  symbol: { type: 'string' },
  decimalDigits: { type: 'integer', minimum: 0, maximum: 6 },
  perUnitValue: { type: 'integer', minimum: 1 },
  flagSlug: { type: 'string' },
  isActive: { type: 'boolean' },
} as const;

const createSchema: FastifySchema = {
  tags: ['Currencies'],
  summary: 'Create a currency',
  security: secured,
  body: {
    type: 'object',
    required: ['code', 'name', 'perUnitValue'],
    properties: { code: codeParam, ...bodyProps },
  },
};

const updateSchema: FastifySchema = {
  tags: ['Currencies'],
  summary: 'Update a currency (not the immutable base)',
  security: secured,
  params: codeParams,
  body: { type: 'object', additionalProperties: false, properties: bodyProps },
};

const codeOnlySchema: FastifySchema = {
  tags: ['Currencies'],
  security: secured,
  params: codeParams,
};

export interface RegisterCurrencyRoutesOptions {
  service: CurrencyService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers currency routes under `/api/v1/currencies`. Reads are available to any
 * authenticated caller (members pick a currency); create/update/delete require the
 * `currency.manage` permission.
 */
export function registerCurrencyRoutes(
  app: FastifyInstance,
  options: RegisterCurrencyRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new CurrencyController(service);

  const manage: preHandlerAsyncHookHandler[] = [
    authenticate,
    requirePermission(guardDeps, PERMISSIONS.CURRENCY_MANAGE),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      instance.get('/', { schema: listSchema, preHandler: authed }, controller.list);
      instance.get('/:code', { schema: codeOnlySchema, preHandler: authed }, controller.get);
      instance.post('/', { schema: createSchema, preHandler: manage }, controller.create);
      instance.put('/:code', { schema: updateSchema, preHandler: manage }, controller.update);
      instance.delete('/:code', { schema: codeOnlySchema, preHandler: manage }, controller.remove);
      done();
    },
    { prefix: CURRENCIES_PREFIX },
  );
}
