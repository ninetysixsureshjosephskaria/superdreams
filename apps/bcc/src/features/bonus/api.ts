import { apiClient } from '@/services';
import { createBonusApi } from '@superdreams/api-client';

/** Bonus-campaigns config API bound to the admin's client. */
export const bonusApi = createBonusApi(apiClient);
