import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { MemberController } from '../controllers';
import type { MemberService } from '../services';

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
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers member routes under `/api/v1/members`. Admin routes run
 * authentication then an RBAC permission guard; self-service `/me` routes run
 * authentication only (ownership is enforced in the controller).
 */
export function registerMemberRoutes(
  app: FastifyInstance,
  options: RegisterMemberRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new MemberController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      // Self-service (static path — resolves before `/:id`).
      instance.get('/me', { schema: meSchema, preHandler: authed }, controller.getMe);
      instance.put('/me', { schema: updateMeSchema, preHandler: authed }, controller.updateMe);

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
