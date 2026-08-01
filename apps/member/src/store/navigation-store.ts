import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NavigationState {
  /** Desktop: whether the sidebar is collapsed to icons only. Persisted. */
  isSidebarCollapsed: boolean;
  /** Mobile: whether the "more" navigation drawer is open. */
  isMobileNavOpen: boolean;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

/**
 * Client state: navigation shell UI. The desktop collapse preference is
 * persisted; the mobile drawer state is transient (session-only).
 */
export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isMobileNavOpen: false,
      toggleSidebarCollapsed: () => {
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
      },
      setSidebarCollapsed: (isSidebarCollapsed) => {
        set({ isSidebarCollapsed });
      },
      openMobileNav: () => {
        set({ isMobileNavOpen: true });
      },
      closeMobileNav: () => {
        set({ isMobileNavOpen: false });
      },
      toggleMobileNav: () => {
        set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen }));
      },
    }),
    {
      name: 'superdreams.member.navigation',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    },
  ),
);
