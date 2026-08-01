import { env } from '@/constants';
import { createApiClient } from '@superdreams/api-client';

/**
 * The app's configured API client, built on the shared factory. All API
 * communication goes through service modules built on this client.
 */
export const apiClient = createApiClient({
  baseURL: env.VITE_API_BASE_URL,
  getAuthToken: () => env.VITE_DEV_ACCESS_TOKEN,
});
