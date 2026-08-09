import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { NetworkController } from '../controllers';
import type { InviteService, NetworkService } from '../services';

const NETWORK_PREFIX = '/api/v1/network';
const INVITES_PREFIX = '/api/v1/invites';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;
const codeParams = {
  type: 'object',
  required: ['code'],
  properties: { code: { type: 'string' } },
} as const;

const INVITE_ROLE = ['PARTNER', 'MEMBER'];
const INVITE_STATUS = ['PENDING', 'USED', 'EXPIRED', 'REVOKED'];

const meSchema: FastifySchema = { tags: ['Network'], security: secured };
const idOnlySchema: FastifySchema = { tags: ['Network'], security: secured, params: idParams };
const partnersSchema: FastifySchema = {
  tags: ['Network'],
  summary: 'List partners with downline counts (admin network tree)',
  security: secured,
};

const createInviteSchema: FastifySchema = {
  tags: ['Invites'],
  summary: 'Issue a network join invite',
  security: secured,
  body: {
    type: 'object',
    required: ['role'],
    additionalProperties: false,
    properties: {
      role: { type: 'string', enum: INVITE_ROLE },
      assignedAdminId: uuidParam,
      assignedPartnerId: uuidParam,
      expiresInDays: { type: 'integer', minimum: 1, maximum: 365 },
    },
  },
};

const listInvitesSchema: FastifySchema = {
  tags: ['Invites'],
  summary: 'List invites (filter by role/status)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      role: { type: 'string', enum: INVITE_ROLE },
      status: { type: 'string', enum: INVITE_STATUS },
      sortBy: { type: 'string', enum: ['createdAt', 'expiresAt', 'status'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const codeOnlySchema: FastifySchema = { tags: ['Invites'], security: secured, params: codeParams };

export interface RegisterNetworkRoutesOptions {
  network: NetworkService;
  invites: InviteService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers network routes under `/api/v1/network` and invite routes under
 * `/api/v1/invites`. Member self-service (`/network/me/*`) is authentication-only
 * and scoped to the caller's own subtree; network-wide reads require
 * `network.read`; invite issuance/management requires `invite.send`; invite
 * preview/accept are authentication-only (the accepting user).
 */
export function registerNetworkRoutes(
  app: FastifyInstance,
  options: RegisterNetworkRoutesOptions,
): void {
  const { network, invites, authenticate, guardDeps } = options;
  const controller = new NetworkController(network, invites);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      instance.get(
        '/me',
        { schema: meSchema, preHandler: authed },
        controller.getMyReferralSummary,
      );
      instance.get(
        '/me/referrals',
        { schema: meSchema, preHandler: authed },
        controller.getMyReferrals,
      );
      instance.get(
        '/me/downline',
        { schema: meSchema, preHandler: authed },
        controller.getMyDownline,
      );
      instance.get(
        '/partners',
        { schema: partnersSchema, preHandler: protect(PERMISSIONS.NETWORK_READ) },
        controller.listPartners,
      );
      instance.get(
        '/members/:id',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.NETWORK_READ) },
        controller.getMemberNode,
      );
      done();
    },
    { prefix: NETWORK_PREFIX },
  );

  app.register(
    (instance, _options, done) => {
      instance.post(
        '/',
        { schema: createInviteSchema, preHandler: protect(PERMISSIONS.INVITE_SEND) },
        controller.createInvite,
      );
      instance.get(
        '/',
        { schema: listInvitesSchema, preHandler: protect(PERMISSIONS.INVITE_SEND) },
        controller.listInvites,
      );
      // Static/suffix routes before the bare `/:code` read.
      instance.get(
        '/:code/preview',
        { schema: codeOnlySchema, preHandler: authed },
        controller.previewInvite,
      );
      instance.post(
        '/:code/accept',
        { schema: codeOnlySchema, preHandler: authed },
        controller.acceptInvite,
      );
      instance.post(
        '/:code/revoke',
        { schema: codeOnlySchema, preHandler: protect(PERMISSIONS.INVITE_SEND) },
        controller.revokeInvite,
      );
      instance.get(
        '/:code',
        { schema: codeOnlySchema, preHandler: protect(PERMISSIONS.INVITE_SEND) },
        controller.getInvite,
      );
      instance.delete(
        '/:code',
        { schema: codeOnlySchema, preHandler: protect(PERMISSIONS.INVITE_SEND) },
        controller.deleteInvite,
      );
      done();
    },
    { prefix: INVITES_PREFIX },
  );
}
