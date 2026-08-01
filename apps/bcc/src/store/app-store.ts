import { create } from 'zustand';

interface AppState {
  /** Whether the application shell has finished its initial setup. */
  isReady: boolean;
  setReady: (ready: boolean) => void;
}

/**
 * Client state: high-level application shell status. Server data must never be
 * stored here — use TanStack Query for that.
 */
export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  setReady: (isReady) => {
    set({ isReady });
  },
}));
