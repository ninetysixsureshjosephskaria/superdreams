import { create } from 'zustand';

import type { AuthUser } from '@superdreams/api-client';

/** localStorage/sessionStorage key holding the (rotating) refresh token. */
const REFRESH_STORAGE_KEY = 'sd_bcc_refresh';

/** The signed-in administrator projected for UI consumption. */
export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  roleLabel?: string;
  mustChangePassword: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SetTokensInput {
  accessToken: string;
  refreshToken: string;
}

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  /** Whether the refresh token persists across browser restarts ("remember me"). */
  remember: boolean;
  status: AuthStatus;
  isAuthenticated: boolean;
  setStatus: (status: AuthStatus) => void;
  setRemember: (remember: boolean) => void;
  setTokens: (tokens: SetTokensInput) => void;
  completeSession: (input: { user: AuthUser; permissions?: string[] }) => void;
  clear: () => void;
}

function toSessionUser(user: AuthUser): SessionUser {
  const composed = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return {
    id: user.id,
    name: user.displayName ?? (composed.length > 0 ? composed : user.email),
    email: user.email,
    roleLabel: 'Administrator',
    mustChangePassword: user.mustChangePassword,
  };
}

/** Persists the refresh token to the tier matching the "remember me" choice. */
function persistRefresh(token: string | null, remember: boolean): void {
  try {
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_STORAGE_KEY);
    if (token) {
      (remember ? localStorage : sessionStorage).setItem(REFRESH_STORAGE_KEY, token);
    }
  } catch {
    // Storage may be unavailable (private mode); tokens still live in memory.
  }
}

/** Reads any persisted refresh token, and whether it was a "remember me" token. */
export function readPersistedRefresh(): { token: string | null; remember: boolean } {
  try {
    const local = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (local) return { token: local, remember: true };
    const session = sessionStorage.getItem(REFRESH_STORAGE_KEY);
    if (session) return { token: session, remember: false };
  } catch {
    // ignore
  }
  return { token: null, remember: false };
}

/**
 * Client session state. Starts in `loading` while the app restores a session
 * from a persisted refresh token; the {@link AuthProvider} resolves it to
 * `authenticated` or `unauthenticated` and the route guards take over.
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  permissions: [],
  remember: false,
  status: 'loading',
  isAuthenticated: false,
  setStatus: (status) => set({ status }),
  setRemember: (remember) => set({ remember }),
  setTokens: ({ accessToken, refreshToken }) => {
    persistRefresh(refreshToken, get().remember);
    set({ accessToken, refreshToken });
  },
  completeSession: ({ user, permissions }) => {
    set({
      user: toSessionUser(user),
      permissions: permissions ?? [],
      status: 'authenticated',
      isAuthenticated: true,
    });
  },
  clear: () => {
    persistRefresh(null, false);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: [],
      status: 'unauthenticated',
      isAuthenticated: false,
    });
  },
}));
