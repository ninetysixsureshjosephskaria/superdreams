import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { PartnerRequestController } from '../controllers';
import type { PartnerRequestService } from '../services';

const PARTNER_REQUESTS_PREFIX = '/api/v1/partner-requests';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;
const PARTNER_REQUEST_STATUS = ['PENDING', 'APPROVED', 'REJECTED'];

const submitSchema: FastifySchema = {
  tags: ['Partner Requests'],
  summary: 'Submit a Member→Partner upgrade request (member derived from token)',
  security: secured,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: { note: { type: 'string', maxLength: 500 } },
  },
};

const mineSchema: FastifySchema = {
  tags: ['Partner Requests'],
  summary: "The authenticated member's latest partner request",
  security: secured,
};

const listSchema: FastifySchema = {
  tags: ['Partner Requests'],
  summary: 'List partner requests (admin)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      status: { type: 'string', enum: PARTNER_REQUEST_STATUS },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const idOnlySchema: FastifySchema = {
  tags: ['Partner Requests'],
  security: secured,
  params: idParams,
};

const rejectSchema: FastifySchema = {
  tags: ['Partner Requests'],
  summary: 'Reject a partner request',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: { reason: { type: 'string', maxLength: 500 } },
  },
};

export interface RegisterPartnerRequestRoutesOptions {
  service: PartnerRequestService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers Member→Partner request routes under `/api/v1/partner-requests`.
 * Self-service (`POST /`, `GET /me`) is authentication-only and derives the
 * member from the token. Admin review (`GET /`, `GET /:id`) requires
 * `partner.request.read`; decisions require `partner.request.approve` /
 * `partner.request.reject`. The Partner role itself never receives these
 * decision permissions (default-deny).
 */
export function registerPartnerRequestRoutes(
  app: FastifyInstance,
  options: RegisterPartnerRequestRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new PartnerRequestController(service);

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
        { schema: listSchema, preHandler: protect(PERMISSIONS.PARTNER_REQUEST_READ) },
        controller.list,
      );
      instance.get(
        '/:id',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.PARTNER_REQUEST_READ) },
        controller.getById,
      );
      instance.post(
        '/:id/approve',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.PARTNER_REQUEST_APPROVE) },
        controller.approve,
      );
      instance.post(
        '/:id/reject',
        { schema: rejectSchema, preHandler: protect(PERMISSIONS.PARTNER_REQUEST_REJECT) },
        controller.reject,
      );
      done();
    },
    { prefix: PARTNER_REQUESTS_PREFIX },
  );
}
