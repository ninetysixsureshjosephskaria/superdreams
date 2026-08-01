import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  InboxParams,
  NotificationData,
  PaginatedNotifications,
  PreferenceData,
  PreferenceInput,
} from '@superdreams/api-client';

import { notificationsApi } from './api';
import { notificationKeys } from './query-keys';

export function useInbox(params: InboxParams): UseQueryResult<PaginatedNotifications, ApiError> {
  return useQuery({
    queryKey: notificationKeys.inbox(params),
    queryFn: () => notificationsApi.inbox(params),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCount(): UseQueryResult<number, ApiError> {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => notificationsApi.unreadCount(),
  });
}

export function usePreferences(): UseQueryResult<PreferenceData[], ApiError> {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: () => notificationsApi.getPreferences(),
  });
}

function useInboxInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };
}

export function useMarkRead(): UseMutationResult<NotificationData, ApiError, string> {
  const invalidate = useInboxInvalidation();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });
}

export function useArchiveNotification(): UseMutationResult<NotificationData, ApiError, string> {
  const invalidate = useInboxInvalidation();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.archive(id),
    onSuccess: invalidate,
  });
}

export function useUpdatePreferences(): UseMutationResult<
  PreferenceData[],
  ApiError,
  PreferenceInput[]
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: PreferenceInput[]) => notificationsApi.updatePreferences(preferences),
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.preferences, data);
    },
  });
}
