import { apiClient } from '@/services';
import { createWalletApi } from '@superdreams/api-client';

/** Wallet Management API bound to the app's configured client. */
export const walletApi = createWalletApi(apiClient);
