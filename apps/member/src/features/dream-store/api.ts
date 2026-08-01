import { apiClient } from '@/services';
import { createDreamStoreApi } from '@superdreams/api-client';

/** Dream Store API bound to the portal's configured client. */
export const dreamStoreApi = createDreamStoreApi(apiClient);
