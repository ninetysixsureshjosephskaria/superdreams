/**
 * Central route path registry. Route definitions and navigation reference these
 * constants so paths are declared in exactly one place.
 *
 * The member navigation is intentionally limited to Home, Games, Redeem, Wallet
 * and Profile. Other member feature pages remain in the codebase but are no
 * longer routed from the portal (the Dream Store page code is retained but not
 * navigable — P2).
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
  redemption: '/redeem',
  wallet: '/wallet',
  network: '/network',
  earnings: '/earnings',
  profile: '/profile',
  unauthorized: '/401',
  forbidden: '/403',
  serverError: '/500',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
