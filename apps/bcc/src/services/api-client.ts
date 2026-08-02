import axios from 'axios';

import { env } from '@/constants';
import { useSessionStore } from '@/store';
import { createApiClient, createAuthApi } from '@superdreams/api-client';

/**
 * Refreshes the access token out-of-band (bare axios, so it never re-enters the
 * client's own interceptor). On success the rotated tokens are stored; on
 * failure the session is cleared. Returns whether a fresh token is available.
 */
async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken } = useSessionStore.getState();
  if (!refreshToken) return false;
  try {
    const response = await axios.post<{
      data: { accessToken: string; refreshToken: string };
    }>(`${env.VITE_API_BASE_URL}/api/v1/auth/refresh`, { refreshToken }, { withCredentials: true });
    const { accessToken, refreshToken: rotated } = response.data.data;
    useSessionStore.getState().setTokens({ accessToken, refreshToken: rotated });
    return true;
  } catch {
    useSessionStore.getState().clear();
    return false;
  }
}

/**
 * The console's configured API client. The bearer token comes from the session
 * store; a 401 transparently refreshes and retries; an unrecoverable 401 clears
 * the session (the route guard then redirects to the admin login page).
 */
export const apiClient = createApiClient({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true,
  getAuthToken: () => useSessionStore.getState().accessToken,
  refreshAuth: refreshAccessToken,
  onAuthError: () => useSessionStore.getState().clear(),
});

/** Authentication API bound to the console's configured client. */
export const authApi = createAuthApi(apiClient);
