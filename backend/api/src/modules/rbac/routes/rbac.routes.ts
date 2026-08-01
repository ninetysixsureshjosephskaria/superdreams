import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import type { RbacModule } from '..';
import { PERMISSIONS } from '../catalog';
import { RbacController } from '../controllers';
import { requirePermission, type GuardDeps } from '../guards';

const RBAC_PREFIX = '/api/v1';
const secured = [{ bearerAuth: [] }];

const uuidParam = { type: 'string', format: 'uuid' } as const;

const listRolesSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'List all roles',
  security: secured,
};

const listPermissionsSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'List all permissions',
  security: secured,
};

const assignRoleUserSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'Assign a role to a user',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
  body: { type: 'object', required: ['userId'], properties: { userId: uuidParam } },
};

const removeRoleUserSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'Remove a role from a user',
  security: secured,
  params: {
    type: 'object',
    required: ['id', 'userId'],
    properties: { id: uuidParam, userId: uuidParam },
  },
};

const assignRolePermissionSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'Assign a permission to a role',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
  body: { type: 'object', required: ['permissionId'], properties: { permissionId: uuidParam } },
};

const removeRolePermissionSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'Remove a permission from a role',
  security: secured,
  params: {
    type: 'object',
    required: ['id', 'permissionId'],
    properties: { id: uuidParam, permissionId: uuidParam },
  },
};

const userPermissionsSchema: FastifySchema = {
  tags: ['Authorization'],
  summary: 'Get a user’s effective permissions',
  security: secured,
  params: { type: 'object', required: ['id'], properties: { id: uuidParam } },
};

export interface RegisterRbacRoutesOptions {
  module: RbacModule;
  /** Authentication preHandler — always runs before authorization guards. */
  authenticate: preHandlerAsyncHookHandler;
}

/**
 * Registers RBAC management routes under `/api/v1`. Every route runs
 * authentication first, then a permission guard (authentication before
 * authorization, always).
 */
export function registerRbacRoutes(app: FastifyInstance, options: RegisterRbacRoutesOptions): void {
  const { module, authenticate } = options;
  const controller = new RbacController(module.roles, module.permissions, module.authorization);
  const guardDeps: GuardDeps = { authorization: module.authorization, events: module.events };

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];

  app.register(
    (instance, _options, done) => {
      instance.get(
        '/roles',
        { schema: listRolesSchema, preHandler: protect(PERMISSIONS.ROLES_READ) },
        controller.listRoles,
      );
      instance.get(
        '/permissions',
        { schema: listPermissionsSchema, preHandler: protect(PERMISSIONS.PERMISSIONS_READ) },
        controller.listPermissions,
      );

      instance.post(
        '/roles/:id/users',
        { schema: assignRoleUserSchema, preHandler: protect(PERMISSIONS.ROLES_ASSIGN) },
        controller.assignRoleToUser,
      );
      instance.delete(
        '/roles/:id/users/:userId',
        { schema: removeRoleUserSchema, preHandler: protect(PERMISSIONS.ROLES_ASSIGN) },
        controller.removeRoleFromUser,
      );

      instance.post(
        '/roles/:id/permissions',
        {
          schema: assignRolePermissionSchema,
          preHandler: protect(PERMISSIONS.ROLE_PERMISSIONS_MANAGE),
        },
        controller.assignPermissionToRole,
      );
      instance.delete(
        '/roles/:id/permissions/:permissionId',
        {
          schema: removeRolePermissionSchema,
          preHandler: protect(PERMISSIONS.ROLE_PERMISSIONS_MANAGE),
        },
        controller.removePermissionFromRole,
      );

      instance.get(
        '/users/:id/permissions',
        { schema: userPermissionsSchema, preHandler: protect(PERMISSIONS.USER_PERMISSIONS_READ) },
        controller.getUserPermissions,
      );

      done();
    },
    { prefix: RBAC_PREFIX },
  );
}
