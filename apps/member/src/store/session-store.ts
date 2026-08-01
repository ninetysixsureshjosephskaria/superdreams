import { create } from 'zustand';

import { MOCK_USER } from '@/mocks';

/** Session principal shape. Replaced by the real principal when auth is wired. */
export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  tier?: string;
}

interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
}

/**
 * Client state: the current session.
 *
 * **This phase performs no authentication.** The store is seeded with a static
 * mock member so the portal can render a signed-in experience. The
 * authentication phase replaces the seed with a real login flow (token handling,
 * API calls) — none of which exists here.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: MOCK_USER,
  isAuthenticated: true,
  setUser: (user) => {
    set({ user, isAuthenticated: user !== null });
  },
  clear: () => {
    set({ user: null, isAuthenticated: false });
  },
}));
