import { apiClient } from '@/services';
import { createCommissionApi } from '@superdreams/api-client';

/** Commission & referral config API bound to the admin's client. */
export const commissionApi = createCommissionApi(apiClient);
