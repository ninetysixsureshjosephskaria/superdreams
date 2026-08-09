import { apiClient } from '@/services';
import { createFinanceApi } from '@superdreams/api-client';

/** Finance API (deposits / withdrawals / limits) bound to the admin's client. */
export const financeApi = createFinanceApi(apiClient);
