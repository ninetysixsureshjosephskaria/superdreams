import type { ListMembersParams } from '@superdreams/api-client';

/** TanStack Query keys for the members feature (predictable cache invalidation). */
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: ListMembersParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  activity: (id: string) => [...memberKeys.detail(id), 'activity'] as const,
  notes: (id: string) => [...memberKeys.detail(id), 'notes'] as const,
  documents: (id: string) => [...memberKeys.detail(id), 'documents'] as const,
  statusHistory: (id: string) => [...memberKeys.detail(id), 'status-history'] as const,
  account: (id: string) => [...memberKeys.detail(id), 'account'] as const,
};
