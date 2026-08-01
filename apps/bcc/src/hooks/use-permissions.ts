import { useCallback, useMemo } from 'react';

import { MOCK_PERMISSIONS, permissionGranted } from '@/mocks';

export interface UsePermissionsResult {
  permissions: readonly string[];
  can: (permission: string) => boolean;
}

/**
 * Exposes the caller's effective permissions. **Mock in this phase** (see
 * `mocks/permissions`); the authentication/RBAC phase swaps the source for
 * server-resolved permissions without changing consumers.
 */
export function usePermissions(): UsePermissionsResult {
  const permissions = MOCK_PERMISSIONS;
  const can = useCallback(
    (permission: string) => permissionGranted(permissions, permission),
    [permissions],
  );
  return useMemo(() => ({ permissions, can }), [permissions, can]);
}
