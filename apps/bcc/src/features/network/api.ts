import { apiClient } from '@/services';
import { createNetworkApi } from '@superdreams/api-client';

/** Network / referrals / invites API (Phase 2D) bound to the admin's client. */
export const networkApi = createNetworkApi(apiClient);
