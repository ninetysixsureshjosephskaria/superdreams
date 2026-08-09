import { apiClient } from '@/services';
import { createCurrenciesApi } from '@superdreams/api-client';

/** Currencies API (fixed internal table) bound to the admin's client. */
export const currenciesApi = createCurrenciesApi(apiClient);
