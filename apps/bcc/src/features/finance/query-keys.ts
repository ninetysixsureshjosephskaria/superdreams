import type { ListFinancialRequestsParams } from '@superdreams/api-client';

/** Hierarchical query-key factory for the admin finance surface. */
export const financeKeys = {
  all: ['finance'] as const,
  requests: () => [...financeKeys.all, 'requests'] as const,
  requestList: (params: ListFinancialRequestsParams) =>
    [...financeKeys.requests(), params] as const,
  requestDetail: (id: string) => [...financeKeys.all, 'request', id] as const,
  limits: () => [...financeKeys.all, 'limits'] as const,
};
