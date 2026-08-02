import { useCallback } from 'react';

import { authApi } from '@/services';
import { useSessionStore, type AuthStatus, type SessionUser } from '@/store';
import type { AuthUser, LoginInput } from '@superdreams/api-client';

export interface UseAuthResult {
  status: AuthStatus;
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

/** Best-effort load of the caller's effective permissions (super-admins have all). */
async function loadPermissions(userId: string): Promise<string[]> {
  try {
    const result = await authApi.getUserPermissions(userId);
    return result.permissions;
  } catch {
    return [];
  }
}

/**
 * Authentication actions + reactive session state for the Business Control
 * Center. Loads RBAC permissions after sign-in so route guards can gate access.
 */
export function useAuth(): UseAuthResult {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  const login = useCallback(async (input: LoginInput): Promise<AuthUser> => {
    const store = useSessionStore.getState();
    const result = await authApi.login(input);
    store.setRemember(input.rememberMe ?? false);
    store.setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    const permissions = result.user.mustChangePassword ? [] : await loadPermissions(result.user.id);
    store.completeSession({ user: result.user, permissions });
    return result.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Best effort — clear the local session regardless of the server result.
    }
    useSessionStore.getState().clear();
  }, []);

  return { status, user, isAuthenticated, login, logout };
}

export { loadPermissions };
