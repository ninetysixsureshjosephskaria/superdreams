import { apiClient } from '@/services';
import { createReportsApi } from '@superdreams/api-client';

/** Reports & Analytics API bound to the portal's configured client. */
export const reportsApi = createReportsApi(apiClient);
