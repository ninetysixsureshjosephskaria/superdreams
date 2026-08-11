import type { Executor } from '@/database/types';
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

  /**
   * Transaction-aware role assignment: performs the idempotent user→role INSERT
   * **through the supplied transaction executor**, so the grant commits (and rolls
   * back) atomically with the caller's own writes — e.g. a partner request flipped
   * to APPROVED in the same transaction. Referential integrity is enforced by the
   * `user_roles` foreign keys (a non-existent role or user makes the INSERT fail,
   * aborting the transaction); the method issues NO base-connection reads, which
   * would deadlock a single-connection transaction. Callers that need role/user
   * pre-validation (with a clean `NotFoundError`) must do it before the
   * transaction — the partner-request flow resolves the partner role id and
   * re-checks the member/user up front.
   *
   * Unlike {@link assignRoleToUser} this is idempotent (already-assigned is a
   * no-op via `onConflictDoNothing`, not a `ConflictError`) and deliberately does
   * NOT invalidate the resolver cache or publish `RoleAssigned` — those non-DB
   * side effects the caller MUST run only after the transaction commits (see
   * {@link finalizeRoleAssignment}). Existing callers of `assignRoleToUser` are
   * unaffected.
   */
  public async assignRoleToUserWithin(
    tx: Executor,
    roleId: string,
    userId: string,
    actorId: string | null,
  ): Promise<void> {
    await this.userRoles.assign(userId, roleId, actorId, tx);
  }

  /**
   * Runs the post-commit side effects for a transactional role assignment:
   * invalidate the resolver cache and publish `RoleAssigned`. Call this only
   * AFTER the enclosing transaction has committed. Mirrors the ordering of
   * {@link assignRoleToUser} (invalidate + publish happen after the durable
   * insert), so RBAC semantics are unchanged.
   */
  public async finalizeRoleAssignment(
    userId: string,
    roleId: string,
    actorId: string | null,
  ): Promise<void> {
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
