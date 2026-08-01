import { ROUTES } from '@/constants';

import type { NavItem } from './types';

/**
 * Primary admin navigation. Every future module plugs in here — pages are wired
 * from this single source. Permission gates are intentionally left open in this
 * phase (the shell is permission-ready, not permission-enforcing).
 */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: ROUTES.dashboard, icon: 'layout-dashboard' },
  { key: 'members', label: 'Members', path: ROUTES.members, icon: 'users' },
  { key: 'wallet', label: 'Wallet', path: ROUTES.wallet, icon: 'wallet' },
  { key: 'rewards', label: 'Rewards', path: ROUTES.rewards, icon: 'gift' },
  { key: 'dream-store', label: 'Dream Store', path: ROUTES.dreamStore, icon: 'gift' },
  { key: 'campaigns', label: 'Campaigns', path: ROUTES.campaigns, icon: 'megaphone' },
  { key: 'notifications', label: 'Notifications', path: ROUTES.notifications, icon: 'bell' },
  { key: 'reports', label: 'Reports', path: ROUTES.reports, icon: 'bar-chart' },
  { key: 'settings', label: 'Settings', path: ROUTES.settings, icon: 'settings' },
];
