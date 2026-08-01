import type { ListTransactionsParams, ListWalletsParams } from '@superdreams/api-client';

/** TanStack Query keys for the wallets feature (predictable cache invalidation). */
export const walletKeys = {
  all: ['wallets'] as const,
  lists: () => [...walletKeys.all, 'list'] as const,
  list: (params: ListWalletsParams) => [...walletKeys.lists(), params] as const,
  details: () => [...walletKeys.all, 'detail'] as const,
  detail: (id: string) => [...walletKeys.details(), id] as const,
  balance: (id: string) => [...walletKeys.detail(id), 'balance'] as const,
  transactions: (id: string, params: ListTransactionsParams) =>
    [...walletKeys.detail(id), 'transactions', params] as const,
  transactionsRoot: (id: string) => [...walletKeys.detail(id), 'transactions'] as const,
  holds: (id: string) => [...walletKeys.detail(id), 'holds'] as const,
  statements: (id: string) => [...walletKeys.detail(id), 'statements'] as const,
};
