/** React Query keys for the member redemption feature. */
export const redemptionKeys = {
  all: ['redemption-requests'] as const,
  mine: ['redemption-requests', 'me'] as const,
  balance: ['rewards', 'me'] as const,
};
