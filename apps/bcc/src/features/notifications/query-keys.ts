import type { ListNotificationsParams, ListTemplatesParams } from '@superdreams/api-client';

/** TanStack Query keys for the notifications feature. */
export const notificationKeys = {
  all: ['notifications'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
  templateList: (params: ListTemplatesParams) => [...notificationKeys.templates(), params] as const,
  template: (id: string) => [...notificationKeys.templates(), id] as const,
  list: (params: ListNotificationsParams) => [...notificationKeys.all, 'list', params] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
  queue: () => [...notificationKeys.all, 'queue'] as const,
};
