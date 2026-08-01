import type { PermissionResponse } from '../dto';
import type { PermissionRepository, PermissionRow } from '../repositories';

function toPermissionResponse(row: PermissionRow): PermissionResponse {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    resource: row.resource,
    action: row.action,
  };
}

/** Read-only access to the permission catalog. */
export class PermissionService {
  public constructor(private readonly permissions: PermissionRepository) {}

  public async listPermissions(): Promise<PermissionResponse[]> {
    const rows = await this.permissions.listAll();
    return rows.map(toPermissionResponse);
  }
}
