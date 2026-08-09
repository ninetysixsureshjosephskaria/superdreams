import type { ProfitHistoryParams } from '@superdreams/api-client';

/** Query-key factory for the daily-profit admin surface. */
export const profitKeys = {
  all: ['profit'] as const,
  schedule: (month: string) => [...profitKeys.all, 'schedule', month] as const,
  history: (params: ProfitHistoryParams) => [...profitKeys.all, 'history', params] as const,
};
