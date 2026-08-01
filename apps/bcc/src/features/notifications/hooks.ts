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
  CreateTemplateInput,
  DeliveryData,
  ListNotificationsParams,
  ListTemplatesParams,
  NotificationData,
  NotificationLogData,
  NotificationTemplateData,
  PaginatedNotifications,
  PaginatedTemplates,
  QueueItemData,
  QueueRunResult,
  SendNotificationInput,
  UpdateTemplateInput,
} from '@superdreams/api-client';

import { notificationsApi } from './api';
import { notificationKeys } from './query-keys';

export function useTemplates(
  params: ListTemplatesParams,
): UseQueryResult<PaginatedTemplates, ApiError> {
  return useQuery({
    queryKey: notificationKeys.templateList(params),
    queryFn: () => notificationsApi.listTemplates(params),
    placeholderData: keepPreviousData,
  });
}

export function useTemplate(id: string): UseQueryResult<NotificationTemplateData, ApiError> {
  return useQuery({
    queryKey: notificationKeys.template(id),
    queryFn: () => notificationsApi.getTemplate(id),
  });
}

export function useNotifications(
  params: ListNotificationsParams,
): UseQueryResult<PaginatedNotifications, ApiError> {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useNotificationDeliveries(id: string): UseQueryResult<DeliveryData[], ApiError> {
  return useQuery({
    queryKey: [...notificationKeys.detail(id), 'deliveries'],
    queryFn: () => notificationsApi.deliveries(id),
  });
}

export function useNotificationLogs(id: string): UseQueryResult<NotificationLogData[], ApiError> {
  return useQuery({
    queryKey: [...notificationKeys.detail(id), 'logs'],
    queryFn: () => notificationsApi.logs(id),
  });
}

export function useQueueOverview(): UseQueryResult<
  { items: QueueItemData[]; counts: Record<string, number> },
  ApiError
> {
  return useQuery({ queryKey: notificationKeys.queue(), queryFn: () => notificationsApi.queue() });
}

export function useCreateTemplate(): UseMutationResult<
  NotificationTemplateData,
  ApiError,
  CreateTemplateInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => notificationsApi.createTemplate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
    },
  });
}

export function useUpdateTemplate(
  id: string,
): UseMutationResult<NotificationTemplateData, ApiError, UpdateTemplateInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) => notificationsApi.updateTemplate(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
    },
  });
}

export function useSendNotification(): UseMutationResult<
  NotificationData,
  ApiError,
  { input: SendNotificationInput; schedule: boolean }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, schedule }) =>
      schedule ? notificationsApi.schedule(input) : notificationsApi.send(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useProcessQueue(): UseMutationResult<QueueRunResult, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.process(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useRetryNotification(): UseMutationResult<NotificationData, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.retry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useCancelNotification(): UseMutationResult<NotificationData, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
