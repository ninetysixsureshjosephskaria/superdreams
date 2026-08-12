import { ROUTES } from '@/constants';

import type { NavItem, NavSection } from './types';

/**
 * Primary admin navigation, grouped into Super Dreams IA sections. Every module
 * plugs in here — pages are wired from this single source.
 *
 * Permission gates mirror the landing route's `ProtectedRoute` permission in
 * `routes/router.tsx`, so the sidebar never shows a link the route guard would
 * block (frontend visibility only — backend RBAC is unchanged). Items without a
 * `permission` are always visible (their routes carry no permission either).
 */
export const PRIMARY_NAV_SECTIONS: NavSection[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', path: ROUTES.dashboard, icon: 'layout-dashboard' },
    ],
  },
  {
    key: 'members-network',
    label: 'Members & Network',
    items: [
      {
        key: 'members',
        label: 'Members',
        path: ROUTES.members,
        icon: 'users',
        permission: 'member.read',
      },
      {
        key: 'network',
        label: 'Network',
        path: ROUTES.network,
        icon: 'users',
        permission: 'network.read',
      },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      {
        key: 'finance',
        label: 'Finance',
        path: ROUTES.finance,
        icon: 'receipt',
        permission: 'finance.read',
      },
      {
        key: 'wallet',
        label: 'Wallet',
        path: ROUTES.wallet,
        icon: 'wallet',
        permission: 'wallet.read',
      },
      {
        key: 'currencies',
        label: 'Currencies',
        path: ROUTES.currencies,
        icon: 'wallet',
        permission: 'currency.manage',
      },
      {
        key: 'commission',
        label: 'Commission',
        path: ROUTES.commission,
        icon: 'bar-chart',
        permission: 'commission.manage',
      },
      {
        key: 'daily-profit',
        label: 'Daily Profit',
        path: ROUTES.financeProfit,
        icon: 'calendar',
        permission: 'profit.schedule',
      },
      {
        key: 'bonus-campaigns',
        label: 'Bonus Campaigns',
        path: ROUTES.bonusCampaigns,
        icon: 'megaphone',
        permission: 'bonus.manage',
      },
      {
        key: 'activation-bonus',
        label: 'Activation Bonus',
        path: ROUTES.activationBonus,
        icon: 'gift',
        permission: 'activation.bonus.manage',
      },
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement',
    items: [
      {
        key: 'rewards',
        label: 'Rewards',
        path: ROUTES.rewards,
        icon: 'gift',
        permission: 'reward.read',
      },
      {
        key: 'redemption-requests',
        label: 'Redemption Requests',
        path: ROUTES.redemptionRequests,
        icon: 'gift',
        permission: 'redemption.request.read',
      },
      { key: 'dream-store', label: 'Dream Store', path: ROUTES.dreamStore, icon: 'gift' },
      {
        key: 'campaigns',
        label: 'Campaigns',
        path: ROUTES.campaigns,
        icon: 'megaphone',
        permission: 'campaign.read',
      },
      {
        key: 'notifications',
        label: 'Notifications',
        path: ROUTES.notifications,
        icon: 'bell',
        permission: 'notification.read',
      },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        path: ROUTES.reports,
        icon: 'bar-chart',
        permission: 'report.read',
      },
    ],
  },
  {
    key: 'system',
    label: 'System',
    items: [
      {
        key: 'settings',
        label: 'Settings',
        path: ROUTES.settings,
        icon: 'settings',
        permission: 'settings.read',
      },
    ],
  },
];

/**
 * Flat list of every nav item (order preserved), derived from the sections.
 * Kept for consumers that need the ungrouped set (e.g. breadcrumb resolution).
 */
export const PRIMARY_NAV: NavItem[] = PRIMARY_NAV_SECTIONS.flatMap((section) => section.items);
