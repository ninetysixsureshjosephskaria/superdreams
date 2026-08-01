import { apiClient } from '@/services';
import { createCampaignsApi } from '@superdreams/api-client';

/** Campaign Management API bound to the app's configured client. */
export const campaignsApi = createCampaignsApi(apiClient);
