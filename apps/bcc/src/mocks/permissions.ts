/**
 * Mock permission set for the shell. RBAC is **not** wired in this phase; the
 * navigation and route guards are permission-*ready* (they consult these keys),
 * but the data is static. `'*'` grants everything, so every placeholder module
 * is visible. The authentication/RBAC phase supplies real, resolved permissions.
 */
export const WILDCARD_PERMISSION = '*';

export const MOCK_PERMISSIONS: readonly string[] = [WILDCARD_PERMISSION];

/** Returns whether `granted` satisfies the `required` permission (`*` = all). */
export function permissionGranted(granted: readonly string[], required: string): boolean {
  return granted.includes(WILDCARD_PERMISSION) || granted.includes(required);
}
