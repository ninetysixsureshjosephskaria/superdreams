import type { ListTransactionsParams } from '@superdreams/api-client';

/** TanStack Query keys for the member's own wallet. */
export const walletKeys = {
  all: ['wallet'] as const,
  me: ['wallet', 'me'] as const,
  financial: ['wallet', 'me', 'financial'] as const,
  financeRequests: ['wallet', 'me', 'finance', 'requests'] as const,
  financeTranches: ['wallet', 'me', 'finance', 'tranches'] as const,
  financeLimits: ['finance', 'limits'] as const,
  financialTransactions: (params: ListTransactionsParams) =>
    ['wallet', 'me', 'financial', 'transactions', params] as const,
  transactions: (params: ListTransactionsParams) =>
    ['wallet', 'me', 'transactions', params] as const,
  statements: ['wallet', 'me', 'statements'] as const,
  holds: ['wallet', 'me', 'holds'] as const,
};
