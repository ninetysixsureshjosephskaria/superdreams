import { apiClient } from '@/services';
import { createFinanceApi } from '@superdreams/api-client';

/** Finance API (deposits / withdrawals / limits) bound to the portal's client. */
export const financeApi = createFinanceApi(apiClient);
