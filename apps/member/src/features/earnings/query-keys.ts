/** TanStack Query keys for the member's earnings (derived from the FINANCIAL ledger). */
export const earningsKeys = {
  all: ['earnings'] as const,
  ledger: ['earnings', 'me', 'ledger'] as const,
};
