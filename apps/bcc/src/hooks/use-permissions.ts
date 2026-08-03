import { useCallback, useMemo } from 'react';

import { useSessionStore } from '@/store';

export interface UsePermissionsResult {
  permissions: readonly string[];
  roles: readonly string[];
  can: (permission: string) => boolean;
  /** True when the caller holds the `super-admin` role. */
  isSuperAdmin: boolean;
}

/**
 * The caller's effective permissions, resolved server-side (RBAC) after sign-in.
 * `can(...)` honours the seed-time wildcard `'*'` as well as exact permission
 * keys, so a super-admin passes every gate.
 */
export function usePermissions(): UsePermissionsResult {
  const permissions = useSessionStore((state) => state.permissions);
  const roles = useSessionStore((state) => state.roles);
  const can = useCallback(
    (permission: string) => permissions.includes('*') || permissions.includes(permission),
    [permissions],
  );
  const isSuperAdmin = roles.includes('super-admin');
  return useMemo(
    () => ({ permissions, roles, can, isSuperAdmin }),
    [permissions, roles, can, isSuperAdmin],
  );
}
