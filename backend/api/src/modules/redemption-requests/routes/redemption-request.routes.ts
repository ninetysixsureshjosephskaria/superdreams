import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { RedemptionRequestController } from '../controllers';
import type { RedemptionRequestService } from '../services';

const REDEMPTION_REQUESTS_PREFIX = '/api/v1/redemption-requests';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;
const REDEMPTION_REQUEST_STATUS = ['PENDING', 'APPROVED', 'REJECTED'];

const submitSchema: FastifySchema = {
  tags: ['Redemption Requests'],
  summary: 'Submit a points-redemption request (member derived from token)',
  security: secured,
  body: {
    type: 'object',
    required: ['pointsRequested'],
    additionalProperties: false,
    properties: {
      pointsRequested: { type: 'integer', minimum: 1 },
      note: { type: 'string', maxLength: 500 },
    },
  },
};

const mineSchema: FastifySchema = {
  tags: ['Redemption Requests'],
  summary: "The authenticated member's latest redemption request",
  security: secured,
};

const listSchema: FastifySchema = {
  tags: ['Redemption Requests'],
  summary: 'List redemption requests (admin)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      status: { type: 'string', enum: REDEMPTION_REQUEST_STATUS },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const idOnlySchema: FastifySchema = {
  tags: ['Redemption Requests'],
  security: secured,
  params: idParams,
};

const rejectSchema: FastifySchema = {
  tags: ['Redemption Requests'],
  summary: 'Reject a redemption request',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: { reason: { type: 'string', maxLength: 500 } },
  },
};

export interface RegisterRedemptionRequestRoutesOptions {
  service: RedemptionRequestService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers member points-redemption request routes under
 * `/api/v1/redemption-requests`. Self-service (`POST /`, `GET /me`) is
 * authentication-only and derives the member from the token. Admin review
 * (`GET /`, `GET /:id`) requires `redemption.request.read`; decisions require
 * `redemption.request.approve` / `redemption.request.reject`. Members and
 * partners never receive the decision permissions (default-deny).
 */
export function registerRedemptionRequestRoutes(
  app: FastifyInstance,
  options: RegisterRedemptionRequestRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new RedemptionRequestController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      instance.post('/', { schema: submitSchema, preHandler: authed }, controller.submit);
      // Static `/me` is registered before any parametric route (Fastify prefers static).
      instance.get('/me', { schema: mineSchema, preHandler: authed }, controller.getMine);
      instance.get(
        '/',
        { schema: listSchema, preHandler: protect(PERMISSIONS.REDEMPTION_REQUEST_READ) },
        controller.list,
      );
      instance.get(
        '/:id',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.REDEMPTION_REQUEST_READ) },
        controller.getById,
      );
      instance.post(
        '/:id/approve',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.REDEMPTION_REQUEST_APPROVE) },
        controller.approve,
      );
      instance.post(
        '/:id/reject',
        { schema: rejectSchema, preHandler: protect(PERMISSIONS.REDEMPTION_REQUEST_REJECT) },
        controller.reject,
      );
      done();
    },
    { prefix: REDEMPTION_REQUESTS_PREFIX },
  );
}
