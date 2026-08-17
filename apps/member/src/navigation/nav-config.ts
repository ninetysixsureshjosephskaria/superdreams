import { ROUTES } from '@/constants';

import type { NavItem } from './types';

/**
 * Primary member navigation — the single source of truth for the Member Portal
 * shell (desktop sidebar, mobile bottom bar, "More" drawer and breadcrumbs).
 *
 * The final product design keeps the member navigation intentionally small:
 * Home, Games, Redeem, Network and Profile. Other member pages/APIs still exist in
 * the codebase but are not surfaced in navigation — the Dream Store feature code
 * remains in place (backend intact) but is intentionally NOT navigable from the
 * Member Portal (P2). `primary` items are eligible for the mobile bottom bar; the
 * "More" drawer always lists them all.
 *
 * Super Dreams is a points/rewards product: the monetary Wallet and Earnings pages
 * (member FINANCIAL wallet ledger) are intentionally NOT navigable. Their feature
 * code and backend/APIs remain intact but are not surfaced anywhere in the portal.
 */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'home', label: 'Home', path: ROUTES.home, icon: 'layout-dashboard', primary: true },
  { key: 'games', label: 'Games', path: ROUTES.games, icon: 'monitor', primary: true },
  {
    key: 'redemption',
    label: 'Redeem',
    path: ROUTES.redemption,
    icon: 'gift',
    primary: true,
  },
  { key: 'network', label: 'Network', path: ROUTES.network, icon: 'users', primary: true },
  { key: 'profile', label: 'Profile', path: ROUTES.profile, icon: 'user', primary: true },
];
