import axios, { type AxiosInstance } from 'axios';

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
}

/**
 * Creates a configured Axios instance for the Super Dreams API.
 *
 * All API communication goes through service modules built on this client —
 * components must never call it (or `fetch`) directly. The response interceptor
 * normalizes every failure into a typed `ApiError`. The request interceptor is
 * the seam where auth headers are attached once authentication exists; it
 * performs no authentication logic here.
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeoutMs ?? 15_000,
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

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeError(error)),
  );

  return client;
}
