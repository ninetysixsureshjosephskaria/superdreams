import { apiClient } from '@/services';
import { createActivationBonusApi } from '@superdreams/api-client';

/** Activation-bonus config & sweep API bound to the admin's client. */
export const activationBonusApi = createActivationBonusApi(apiClient);
