import { apiClient } from '@/services';
import { createRedemptionRequestsApi, createRewardsApi } from '@superdreams/api-client';

/** Redemption-requests API bound to the portal's configured client (P2). */
export const redemptionApi = createRedemptionRequestsApi(apiClient);

/** Rewards API — used here only to read the member's current points balance. */
export const rewardsApi = createRewardsApi(apiClient);
