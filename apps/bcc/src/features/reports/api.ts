import { apiClient } from '@/services';
import { createReportsApi } from '@superdreams/api-client';

/** Reports & Analytics API bound to the app's configured client. */
export const reportsApi = createReportsApi(apiClient);
