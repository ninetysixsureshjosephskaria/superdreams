import { ConflictError, NotFoundError } from '@/errors';
import type { IdentityModule } from '@/modules/identity';

import type { RoleResponse } from '../dto';
import type { RbacEventBus } from '../events';
import type {
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
  RoleRow,
  UserRoleRepository,
} from '../repositories';
import type { PermissionResolver } from './permission-resolver.service';

function toRoleResponse(row: RoleRow): RoleResponse {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Role/permission assignment lifecycle. Reuses Identity for user existence and
 * invalidates the resolver cache on every change so authorization stays correct.
 */
export class RoleService {
  public constructor(
    private readonly identity: IdentityModule,
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly rolePermissions: RolePermissionRepository,
    private readonly userRoles: UserRoleRepository,
    private readonly resolver: PermissionResolver,
    private readonly events: RbacEventBus,
  ) {}

  public async listRoles(): Promise<RoleResponse[]> {
    const rows = await this.roles.listAll();
    return rows.map(toRoleResponse);
  }

  public async assignRoleToUser(
    roleId: string,
    userId: string,
    actorId: string | null,
  ): Promise<void> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found.');
    }
    const user = await this.identity.repositories.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    if (await this.userRoles.exists(userId, roleId)) {
      throw new ConflictError('Role is already assigned to the user.');
    }
    await this.userRoles.assign(userId, roleId, actorId);
    await this.resolver.invalidate(userId);
    await this.events.publish({ type: 'RoleAssigned', userId, roleId, actorId, at: new Date() });
  }

  public async removeRoleFromUser(
    roleId: string,
    userId: string,
    actorId: string | null,
  ): Promise<void> {
    const removed = await this.userRoles.remove(userId, roleId);
    if (!removed) {
      throw new NotFoundError('Role assignment not found.');
    }
    await this.resolver.invalidate(userId);
    await this.events.publish({ type: 'RoleRemoved', userId, roleId, actorId, at: new Date() });
  }

  public async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    actorId: string | null,
  ): Promise<void> {
    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found.');
    }
    const permission = await this.permissions.findById(permissionId);
    if (!permission) {
      throw new NotFoundError('Permission not found.');
    }
    if (await this.rolePermissions.exists(roleId, permissionId)) {
      throw new ConflictError('Permission is already assigned to the role.');
    }
    await this.rolePermissions.assign(roleId, permissionId, actorId);
    await this.invalidateRoleHolders(roleId);
    await this.events.publish({
      type: 'PermissionAssigned',
      roleId,
      permissionId,
      actorId,
      at: new Date(),
    });
  }

  public async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    actorId: string | null,
  ): Promise<void> {
    const removed = await this.rolePermissions.remove(roleId, permissionId);
    if (!removed) {
      throw new NotFoundError('Permission assignment not found.');
    }
    await this.invalidateRoleHolders(roleId);
    await this.events.publish({
      type: 'PermissionRemoved',
      roleId,
      permissionId,
      actorId,
      at: new Date(),
    });
  }

  /** Invalidates the resolver cache for every user holding the given role. */
  private async invalidateRoleHolders(roleId: string): Promise<void> {
    const userIds = await this.userRoles.listUserIdsForRole(roleId);
    for (const userId of userIds) {
      await this.resolver.invalidate(userId);
    }
  }
}
