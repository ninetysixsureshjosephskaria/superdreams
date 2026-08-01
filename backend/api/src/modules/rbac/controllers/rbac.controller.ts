import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { AuthorizationService, PermissionService, RoleService } from '../services';
import {
  assignPermissionSchema,
  assignRoleSchema,
  roleIdParamsSchema,
  rolePermissionParamsSchema,
  roleUserParamsSchema,
  userIdParamsSchema,
} from '../validators';

/** HTTP boundary for RBAC management. Validation via Zod; no authorization logic here. */
export class RbacController {
  public constructor(
    private readonly roles: RoleService,
    private readonly permissions: PermissionService,
    private readonly authorization: AuthorizationService,
  ) {}

  public listRoles = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { roles: await this.roles.listRoles() });
  };

  public listPermissions = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { permissions: await this.permissions.listPermissions() });
  };

  public assignRoleToUser = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id: roleId } = roleIdParamsSchema.parse(request.params);
    const { userId } = assignRoleSchema.parse(request.body);
    const actor = requireAuth(request);
    await this.roles.assignRoleToUser(roleId, userId, actor.userId);
    return sendSuccess(reply, { assigned: true }, 201);
  };

  public removeRoleFromUser = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id: roleId, userId } = roleUserParamsSchema.parse(request.params);
    const actor = requireAuth(request);
    await this.roles.removeRoleFromUser(roleId, userId, actor.userId);
    return sendSuccess(reply, { removed: true });
  };

  public assignPermissionToRole = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id: roleId } = roleIdParamsSchema.parse(request.params);
    const { permissionId } = assignPermissionSchema.parse(request.body);
    const actor = requireAuth(request);
    await this.roles.assignPermissionToRole(roleId, permissionId, actor.userId);
    return sendSuccess(reply, { assigned: true }, 201);
  };

  public removePermissionFromRole = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id: roleId, permissionId } = rolePermissionParamsSchema.parse(request.params);
    const actor = requireAuth(request);
    await this.roles.removePermissionFromRole(roleId, permissionId, actor.userId);
    return sendSuccess(reply, { removed: true });
  };

  public getUserPermissions = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id: userId } = userIdParamsSchema.parse(request.params);
    const resolved = await this.authorization.getEffective(userId);
    return sendSuccess(reply, {
      userId,
      roles: resolved.roleKeys,
      permissions: resolved.permissionKeys,
    });
  };
}
