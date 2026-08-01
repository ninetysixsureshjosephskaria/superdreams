import type { ListCampaignsParams, ListEnrollmentsParams } from '@superdreams/api-client';

/** TanStack Query keys for the campaigns feature (predictable cache invalidation). */
export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (params: ListCampaignsParams) => [...campaignKeys.lists(), params] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
  enrollments: (id: string, params: ListEnrollmentsParams) =>
    [...campaignKeys.detail(id), 'enrollments', params] as const,
  history: (id: string) => [...campaignKeys.detail(id), 'history'] as const,
  executions: (id: string) => [...campaignKeys.detail(id), 'executions'] as const,
};
