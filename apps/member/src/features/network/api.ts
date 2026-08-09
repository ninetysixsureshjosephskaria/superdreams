import { apiClient } from '@/services';
import { createNetworkApi } from '@superdreams/api-client';

/** Network / referrals API (Phase 2D) bound to the portal's configured client. */
export const networkApi = createNetworkApi(apiClient);
