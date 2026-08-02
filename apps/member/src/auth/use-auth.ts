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

/**
 * Authentication actions + reactive session state for the Member Portal.
 * Backed by the shared session store and the real `/api/v1/auth` endpoints.
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
    store.completeSession({ user: result.user });
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
