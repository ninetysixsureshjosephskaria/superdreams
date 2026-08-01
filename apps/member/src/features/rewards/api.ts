import { apiClient } from '@/services';
import { createRewardsApi } from '@superdreams/api-client';

/** Rewards Management API bound to the portal's configured client. */
export const rewardsApi = createRewardsApi(apiClient);
