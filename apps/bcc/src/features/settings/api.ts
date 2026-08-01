import { apiClient } from '@/services';
import { createSettingsApi } from '@superdreams/api-client';

/** Settings & Administration API bound to the app's configured client. */
export const settingsApi = createSettingsApi(apiClient);
