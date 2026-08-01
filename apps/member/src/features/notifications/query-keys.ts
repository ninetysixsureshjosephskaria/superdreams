import type { InboxParams } from '@superdreams/api-client';

/** TanStack Query keys for the member's notifications. */
export const notificationKeys = {
  all: ['notifications'] as const,
  inbox: (params: InboxParams) => ['notifications', 'inbox', params] as const,
  unread: ['notifications', 'unread'] as const,
  preferences: ['notifications', 'preferences'] as const,
};
