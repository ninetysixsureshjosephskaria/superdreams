import { apiClient } from '@/services';
import { createProfitApi } from '@superdreams/api-client';

/** Daily-profit config & distribution API bound to the admin's client. */
export const profitApi = createProfitApi(apiClient);
