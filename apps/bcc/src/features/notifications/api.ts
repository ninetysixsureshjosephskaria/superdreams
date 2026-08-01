import { apiClient } from '@/services';
import { createNotificationsApi } from '@superdreams/api-client';

/** Notification Center API bound to the app's configured client. */
export const notificationsApi = createNotificationsApi(apiClient);
