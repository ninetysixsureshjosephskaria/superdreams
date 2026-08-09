/** TanStack Query keys for the member's own network / referrals. */
export const networkKeys = {
  all: ['network'] as const,
  me: ['network', 'me'] as const,
  referrals: ['network', 'me', 'referrals'] as const,
  downline: ['network', 'me', 'downline'] as const,
};
