import { apiClient } from '@/services';
import { createCampaignsApi } from '@superdreams/api-client';

/** Campaign Management API bound to the portal's configured client. */
export const campaignsApi = createCampaignsApi(apiClient);
