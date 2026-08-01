import type {
  ListExportsParams,
  ListHistoryParams,
  ListReportsParams,
} from '@superdreams/api-client';

/** TanStack Query keys for the reports feature. */
export const reportKeys = {
  all: ['reports'] as const,
  definitions: (params: ListReportsParams) => [...reportKeys.all, 'definitions', params] as const,
  definition: (id: string) => [...reportKeys.all, 'definition', id] as const,
  categories: () => [...reportKeys.all, 'categories'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  history: (params: ListHistoryParams) => [...reportKeys.all, 'history', params] as const,
  exports: (params: ListExportsParams) => [...reportKeys.all, 'exports', params] as const,
  schedules: (params: { page?: number; pageSize?: number }) =>
    [...reportKeys.all, 'schedules', params] as const,
  saved: (params: { page?: number; pageSize?: number }) =>
    [...reportKeys.all, 'saved', params] as const,
};
