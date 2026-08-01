import { apiClient } from '@/services';
import { createNotificationsApi } from '@superdreams/api-client';

/** Notification Center API bound to the portal's configured client. */
export const notificationsApi = createNotificationsApi(apiClient);
