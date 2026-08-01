import { apiClient } from '@/services';
import { createDreamStoreApi } from '@superdreams/api-client';

/** Dream Store admin API bound to the console's configured client. */
export const dreamStoreApi = createDreamStoreApi(apiClient);
