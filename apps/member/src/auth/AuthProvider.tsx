import { useEffect, type ReactNode } from 'react';

import { authApi } from '@/services';
import { readPersistedRefresh, useSessionStore } from '@/store';
import { LoadingScreen } from '@superdreams/ui';

/**
 * Restores the session on load: if a refresh token was persisted, it rotates
 * for a fresh access token and loads the current user via `/auth/me`. While this
 * runs the app shows a loading screen; afterwards the session is either
 * `authenticated` or `unauthenticated` and the route guards take over.
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
        const me = await authApi.me();
        if (!active) return;
        store.completeSession({ user: me.user, permissions: me.permissions });
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
