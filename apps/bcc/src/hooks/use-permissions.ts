import { useCallback, useMemo } from 'react';

import { useSessionStore } from '@/store';

export interface UsePermissionsResult {
  permissions: readonly string[];
  can: (permission: string) => boolean;
}

/**
 * The caller's effective permissions, resolved server-side (RBAC) after sign-in.
 * `can(...)` honours the seed-time wildcard `'*'` as well as exact permission
 * keys, so a super-admin passes every gate.
 */
export function usePermissions(): UsePermissionsResult {
  const permissions = useSessionStore((state) => state.permissions);
  const can = useCallback(
    (permission: string) => permissions.includes('*') || permissions.includes(permission),
    [permissions],
  );
  return useMemo(() => ({ permissions, can }), [permissions, can]);
}
