import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { normalizeError } from './errors';

export interface ApiClientConfig {
  baseURL: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /**
   * Supplies the bearer token for the `Authorization` header on each request.
   * The app wires this to its session/token source; the client performs no
   * authentication logic itself.
   */
  getAuthToken?: () => string | null | undefined;
  /**
   * Attempts to refresh the access token after a 401. Returns `true` if a fresh
   * token is now available via `getAuthToken`. Called at most once per failed
   * request (single-flight across concurrent 401s). Requests to `/auth/*` never
   * trigger it, so a failing refresh/login cannot recurse.
   */
  refreshAuth?: () => Promise<boolean>;
  /** Invoked when a request is unauthorized and refresh did not recover it. */
  onAuthError?: () => void;
  /** Send cookies on cross-origin requests (needed for the httpOnly refresh cookie). */
  withCredentials?: boolean;
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function isAuthEndpoint(url: string | undefined): boolean {
  return typeof url === 'string' && url.includes('/auth/');
}

/**
 * Creates a configured Axios instance for the Super Dreams API.
 *
 * All API communication goes through service modules built on this client —
 * components must never call it (or `fetch`) directly. The request interceptor
 * attaches the bearer token from `getAuthToken`. The response interceptor
 * transparently refreshes the access token on a 401 (once per request), retries,
 * and otherwise normalizes every failure into a typed `ApiError`.
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeoutMs ?? 15_000,
    withCredentials: config.withCredentials ?? false,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  });

  client.interceptors.request.use((requestConfig) => {
    const token = config.getAuthToken?.();
    if (token) {
      requestConfig.headers.set('Authorization', `Bearer ${token}`);
    }
    return requestConfig;
  });

  // Single-flight refresh: concurrent 401s share one refresh attempt.
  let refreshing: Promise<boolean> | null = null;

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const original = axiosError?.config as RetryableConfig | undefined;
      const status = axiosError?.response?.status;

      if (
        status === 401 &&
        config.refreshAuth &&
        original &&
        !original._retry &&
        !isAuthEndpoint(original.url)
      ) {
        original._retry = true;
        try {
          refreshing ??= config.refreshAuth().finally(() => {
            refreshing = null;
          });
          const refreshed = await refreshing;
          if (refreshed) {
            const token = config.getAuthToken?.();
            if (token) {
              original.headers.set('Authorization', `Bearer ${token}`);
            }
            return client(original);
          }
        } catch {
          // fall through to onAuthError + normalized rejection
        }
        config.onAuthError?.();
      }

      return Promise.reject(normalizeError(error));
    },
  );

  return client;
}
