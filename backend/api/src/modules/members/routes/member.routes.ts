import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import type { Database } from '@/database/client';
import { seedBulkMembers } from '@/database/seed/bulk-members-core';
import { requireAuth } from '@/modules/auth/guards';
import { PERMISSIONS, requirePermission, requireRole, type GuardDeps } from '@/modules/rbac';
import { sendSuccess } from '@/utils';

import { MemberController } from '../controllers';
import type { MemberAccountService, MemberService } from '../services';

/** Default number of demo members generated when no explicit count is provided. */
const DEMO_MEMBER_COUNT = 15;
const DEMO_MEMBER_MAX = 50;

const MEMBERS_PREFIX = '/api/v1/members';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;

const statusEnum = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'ARCHIVED'];

const profileBody = {
  type: 'object',
  properties: {
    dateOfBirth: { type: 'string' },
    gender: { type: 'string' },
    avatarUrl: { type: 'string' },
    bio: { type: 'string' },
  },
} as const;

const listSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'List members (search, filter, sort, paginate)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      status: { type: 'string', enum: statusEnum },
      joinedFrom: { type: 'string' },
      joinedTo: { type: 'string' },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'updatedAt', 'joinedAt', 'lastName', 'status'],
      },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const createSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Create a member',
  security: secured,
  body: {
    type: 'object',
    required: ['firstName', 'lastName', 'email'],
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      status: { type: 'string', enum: statusEnum },
      profile: profileBody,
    },
  },
};

const updateSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Update a member',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
  body: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: ['string', 'null'] },
      profile: profileBody,
    },
  },
};

const idParamsSchema: FastifySchema = {
  tags: ['Members'],
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
};

const statusSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Change member status',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: statusEnum },
      reason: { type: 'string' },
    },
  },
};

const noteBodySchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Add a member note',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
  body: { type: 'object', required: ['body'], properties: { body: { type: 'string' } } },
};

const documentBodySchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Add member document metadata',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string' },
      category: { type: 'string' },
      contentType: { type: 'string' },
      sizeBytes: { type: 'integer', minimum: 0 },
    },
  },
};

const meSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Get my member profile',
  security: secured,
};

const updateMeSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Update my member profile (self-service)',
  security: secured,
  body: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: ['string', 'null'] },
      profile: profileBody,
    },
  },
};

export interface RegisterMemberRoutesOptions {
  service: MemberService;
  /** Authentication account status control (distinct from member profile status). */
  accountService: MemberAccountService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
  /** Database handle — used by the Super Admin demo-member generator. */
  db: Database;
}

/** Body schema for changing a member's authentication account status. */
const accountStatusSchema: FastifySchema = {
  tags: ['Members'],
  summary: 'Change a member’s authentication account status (login access)',
  security: secured,
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DEACTIVATED'] },
      reason: { type: 'string', maxLength: 500 },
    },
  },
};

/**
 * Registers member routes under `/api/v1/members`. Admin routes run
 * authentication then an RBAC permission guard; self-service `/me` routes run
 * authentication only (ownership is enforced in the controller).
 */
export function registerMemberRoutes(
  app: FastifyInstance,
  options: RegisterMemberRoutesOptions,
): void {
  const { service, accountService, authenticate, guardDeps, db } = options;
  const controller = new MemberController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];
  // Super Admin only — the generator writes users/members/wallets/rewards.
  const superAdminOnly: preHandlerAsyncHookHandler[] = [
    authenticate,
    requireRole(guardDeps, 'super-admin'),
  ];

  app.register(
    (instance, _options, done) => {
      // Self-service (static path — resolves before `/:id`).
      instance.get('/me', { schema: meSchema, preHandler: authed }, controller.getMe);
      instance.put('/me', { schema: updateMeSchema, preHandler: authed }, controller.updateMe);

      // Super Admin: generate demo members (idempotent). Reports created/skipped.
      instance.post(
        '/demo',
        {
          schema: {
            tags: ['Members'],
            summary: 'Generate demo members (Super Admin only)',
            security: secured,
            body: {
              type: 'object',
              additionalProperties: false,
              properties: {
                count: { type: 'integer', minimum: 1, maximum: DEMO_MEMBER_MAX },
              },
            },
          },
          preHandler: superAdminOnly,
        },
        async (request, reply) => {
          const body = (request.body ?? {}) as { count?: number };
          const requested = typeof body.count === 'number' ? body.count : DEMO_MEMBER_COUNT;
          const count = Math.min(DEMO_MEMBER_MAX, Math.max(1, Math.trunc(requested)));
          const { userId } = requireAuth(request);
          const { created, skipped } = await seedBulkMembers(db, count, { actorUserId: userId });
          const createdCount = created.length;
          const message =
            createdCount === 0
              ? 'Demo members already exist.'
              : 'Demo members created successfully.';
          return sendSuccess(reply, { created: createdCount, skipped, message });
        },
      );

      // Admin CRUD.
      instance.get(
        '/',
        { schema: listSchema, preHandler: protect(PERMISSIONS.MEMBER_READ) },
        controller.list,
      );
      instance.post(
        '/',
        { schema: createSchema, preHandler: protect(PERMISSIONS.MEMBER_CREATE) },
        controller.create,
      );
      instance.get(
        '/:id',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.MEMBER_READ) },
        controller.get,
      );
      instance.put(
        '/:id',
        { schema: updateSchema, preHandler: protect(PERMISSIONS.MEMBER_UPDATE) },
        controller.update,
      );
      instance.patch(
        '/:id/status',
        { schema: statusSchema, preHandler: protect(PERMISSIONS.MEMBER_STATUS) },
        controller.changeStatus,
      );

      // Authentication account status (login access) — distinct from member
      // profile status (D5). Reads/changes the underlying auth account.
      instance.get(
        '/:id/account',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.ACCOUNT_READ) },
        async (request, reply) => {
          const { id } = request.params as { id: string };
          return sendSuccess(reply, await accountService.getByMemberId(id));
        },
      );
      instance.patch(
        '/:id/account-status',
        { schema: accountStatusSchema, preHandler: protect(PERMISSIONS.ACCOUNT_STATUS) },
        async (request, reply) => {
          const { id } = request.params as { id: string };
          const context = requireAuth(request);
          const userAgent = request.headers['user-agent'];
          const actor = {
            userId: context.userId,
            ipAddress: request.ip.length > 0 ? request.ip : null,
            userAgent: typeof userAgent === 'string' ? userAgent : null,
            correlationId: null,
          };
          return sendSuccess(reply, await accountService.changeStatus(id, request.body, actor));
        },
      );
      instance.delete(
        '/:id',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.MEMBER_DELETE) },
        controller.remove,
      );

      // Sub-resources.
      instance.get(
        '/:id/activity',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.MEMBER_READ) },
        controller.listActivity,
      );
      instance.get(
        '/:id/status-history',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.MEMBER_READ) },
        controller.listStatusHistory,
      );
      instance.get(
        '/:id/notes',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.MEMBER_READ) },
        controller.listNotes,
      );
      instance.post(
        '/:id/notes',
        { schema: noteBodySchema, preHandler: protect(PERMISSIONS.MEMBER_NOTE_CREATE) },
        controller.addNote,
      );
      instance.get(
        '/:id/documents',
        { schema: idParamsSchema, preHandler: protect(PERMISSIONS.MEMBER_READ) },
        controller.listDocuments,
      );
      instance.post(
        '/:id/documents',
        { schema: documentBodySchema, preHandler: protect(PERMISSIONS.MEMBER_DOCUMENT_CREATE) },
        controller.addDocument,
      );

      done();
    },
    { prefix: MEMBERS_PREFIX },
  );
}
