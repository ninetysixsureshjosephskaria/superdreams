import type { SuccessResponse } from '@superdreams/types';

import { apiClient } from './api-client';

/** Non-business, infrastructure metadata reported by the API root endpoint. */
export interface ApiInfo {
  name: string;
  status: string;
  environment: string;
}

/**
 * Fetches API service metadata from the platform root endpoint. Used to verify
 * end-to-end wiring (Axios → service → TanStack Query); not a business endpoint.
 */
export async function fetchApiInfo(): Promise<ApiInfo> {
  const response = await apiClient.get<SuccessResponse<ApiInfo>>('/');
  return response.data.data;
}
