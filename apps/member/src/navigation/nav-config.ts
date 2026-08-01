import { ROUTES } from '@/constants';

import type { NavItem } from './types';

/**
 * Primary member navigation — the single source of truth for the Member Portal
 * shell (desktop sidebar, mobile bottom bar, "More" drawer and breadcrumbs).
 *
 * The final product design keeps the member navigation intentionally small:
 * Home, Games, Dream Store, Wallet and Profile. Other member pages/APIs still
 * exist in the codebase but are not surfaced in navigation. `primary` items are
 * eligible for the mobile bottom bar; the "More" drawer always lists them all.
 */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'home', label: 'Home', path: ROUTES.home, icon: 'layout-dashboard', primary: true },
  { key: 'games', label: 'Games', path: ROUTES.games, icon: 'monitor', primary: true },
  {
    key: 'dream-store',
    label: 'Dream Store',
    path: ROUTES.dreamStore,
    icon: 'gift',
    primary: true,
  },
  { key: 'wallet', label: 'Wallet', path: ROUTES.wallet, icon: 'wallet', primary: true },
  { key: 'profile', label: 'Profile', path: ROUTES.profile, icon: 'user', primary: true },
];
