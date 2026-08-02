/**
 * Central route path registry. Route definitions and navigation reference these
 * constants so paths are declared in exactly one place.
 */
export const ROUTES = {
  home: '/',
  dashboard: '/',
  login: '/login',
  changePassword: '/change-password',
  members: '/members',
  wallet: '/wallet',
  rewards: '/rewards',
  dreamStore: '/dream-store',
  campaigns: '/campaigns',
  notifications: '/notifications',
  reports: '/reports',
  settings: '/settings',
  unauthorized: '/401',
  forbidden: '/403',
  serverError: '/500',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
