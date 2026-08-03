import { useEffect, type ReactNode } from 'react';

import { authApi } from '@/services';
import { readPersistedRefresh, useSessionStore } from '@/store';
import { LoadingScreen } from '@superdreams/ui';

import { loadPermissions } from './use-auth';

/**
 * Restores the admin session on load: if a refresh token was persisted, it
 * rotates for a fresh access token, loads the current user via `/auth/me`, and
 * loads effective permissions. While this runs the app shows a loading screen;
 * afterwards the route guards take over.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    let active = true;

    async function bootstrap(): Promise<void> {
      const store = useSessionStore.getState();
      const { token, remember } = readPersistedRefresh();
      if (!token) {
        store.clear();
        return;
      }
      store.setStatus('loading');
      store.setRemember(remember);
      try {
        const refreshed = await authApi.refresh(token);
        store.setTokens({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
        const user = await authApi.me();
        const { permissions, roles } = user.mustChangePassword
          ? { permissions: [], roles: [] }
          : await loadPermissions(user.id);
        if (!active) return;
        store.completeSession({ user, permissions, roles });
      } catch {
        if (active) store.clear();
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return <LoadingScreen message="Restoring your session…" />;
  }

  return <>{children}</>;
}
