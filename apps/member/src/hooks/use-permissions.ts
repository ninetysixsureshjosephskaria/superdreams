import { useCallback, useMemo } from 'react';

import { useSessionStore } from '@/store';

export interface UsePermissionsResult {
  permissions: readonly string[];
  can: (permission: string) => boolean;
}

/**
 * The caller's effective permissions, sourced from the authenticated session.
 * Member self-service routes are gated by authentication rather than fine-grained
 * permissions, so this list is typically empty for portal users.
 */
export function usePermissions(): UsePermissionsResult {
  const permissions = useSessionStore((state) => state.permissions);
  const can = useCallback(
    (permission: string) => permissions.includes('*') || permissions.includes(permission),
    [permissions],
  );
  return useMemo(() => ({ permissions, can }), [permissions, can]);
}
