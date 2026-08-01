import type { ResolvedAuthorization } from '../dto';
import type { PermissionRepository, RoleRepository } from '../repositories';
import type { PermissionCache } from './permission-cache';

/**
 * The single, centralized place effective authorization is computed:
 * user → roles → permissions. Results are cached; callers must invalidate on any
 * role/permission change (the role service does this).
 */
export class PermissionResolver {
  public constructor(
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly cache: PermissionCache,
  ) {}

  public async resolve(userId: string): Promise<ResolvedAuthorization> {
    const cached = await this.cache.get(userId);
    if (cached) {
      return cached;
    }
    const [roleKeys, permissionKeys] = await Promise.all([
      this.roles.listKeysForUser(userId),
      this.permissions.listKeysForUser(userId),
    ]);
    const resolved: ResolvedAuthorization = { roleKeys, permissionKeys };
    await this.cache.set(userId, resolved);
    return resolved;
  }

  public async invalidate(userId: string): Promise<void> {
    await this.cache.invalidate(userId);
  }
}
