import type { ListRedemptionRequestsParams } from '@superdreams/api-client';

/** Hierarchical query-key factory for the admin redemption-request surface. */
export const redemptionKeys = {
  all: ['redemption-requests'] as const,
  requests: () => [...redemptionKeys.all, 'requests'] as const,
  requestList: (params: ListRedemptionRequestsParams) =>
    [...redemptionKeys.requests(), params] as const,
  requestDetail: (id: string) => [...redemptionKeys.all, 'request', id] as const,
};
