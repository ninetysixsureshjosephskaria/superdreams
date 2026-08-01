import { apiClient } from '@/services';
import { createRewardsApi } from '@superdreams/api-client';

/** Rewards Management API bound to the app's configured client. */
export const rewardsApi = createRewardsApi(apiClient);
