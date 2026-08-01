export interface RoleResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionResponse {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  resource: string;
  action: string;
}

/** A user's fully-resolved authorization state (role + permission keys). */
export interface ResolvedAuthorization {
  roleKeys: string[];
  permissionKeys: string[];
}

/** Effective permissions response for a user. */
export interface EffectivePermissions {
  userId: string;
  roles: string[];
  permissions: string[];
}
