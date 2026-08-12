import { apiClient } from '@/services';
import { createRedemptionRequestsApi } from '@superdreams/api-client';

/** Redemption-requests API (member points-redemption approval queue) bound to the admin's client. */
export const redemptionApi = createRedemptionRequestsApi(apiClient);
