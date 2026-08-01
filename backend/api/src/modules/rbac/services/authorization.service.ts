import type { ResolvedAuthorization } from '../dto';
import type { PermissionResolver } from './permission-resolver.service';

/**
 * Read-only authorization checks built on the centralized {@link PermissionResolver}.
 * Guards and policies use this; it never mutates assignments.
 */
export class AuthorizationService {
  public constructor(private readonly resolver: PermissionResolver) {}

  public getEffective(userId: string): Promise<ResolvedAuthorization> {
    return this.resolver.resolve(userId);
  }

  public async hasPermission(userId: string, key: string): Promise<boolean> {
    const { permissionKeys } = await this.resolver.resolve(userId);
    return permissionKeys.includes(key);
  }

  public async hasAllPermissions(userId: string, keys: readonly string[]): Promise<boolean> {
    const { permissionKeys } = await this.resolver.resolve(userId);
    return keys.every((key) => permissionKeys.includes(key));
  }

  public async hasAnyPermission(userId: string, keys: readonly string[]): Promise<boolean> {
    const { permissionKeys } = await this.resolver.resolve(userId);
    return keys.some((key) => permissionKeys.includes(key));
  }

  public async hasRole(userId: string, roleKey: string): Promise<boolean> {
    const { roleKeys } = await this.resolver.resolve(userId);
    return roleKeys.includes(roleKey);
  }
}
