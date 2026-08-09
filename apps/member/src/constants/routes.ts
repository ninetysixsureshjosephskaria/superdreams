/**
 * Central route path registry. Route definitions and navigation reference these
 * constants so paths are declared in exactly one place.
 *
 * The member navigation is intentionally limited to Home, Games, Dream Store,
 * Wallet and Profile. Other member feature pages remain in the codebase but are
 * no longer routed from the portal.
 */
export const ROUTES = {
  home: '/',
  dashboard: '/',
  login: '/login',
  signup: '/signup',
  activate: '/activate',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  changePassword: '/change-password',
  games: '/games',
  dreamStore: '/dream-store',
  wallet: '/wallet',
  network: '/network',
  earnings: '/earnings',
  profile: '/profile',
  unauthorized: '/401',
  forbidden: '/403',
  serverError: '/500',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
