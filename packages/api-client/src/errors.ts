import axios from 'axios';

import type { ErrorDetail, ErrorResponse, NormalizedError } from '@superdreams/types';

/**
 * A normalized, typed error thrown by the API client and consumed by the UI.
 * Guarantees a stable shape regardless of the underlying failure.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: ErrorDetail[];
  public readonly traceId?: string;

  public constructor(params: NormalizedError) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    if (params.status !== undefined) {
      this.status = params.status;
    }
    if (params.details !== undefined) {
      this.details = params.details;
    }
    if (params.traceId !== undefined) {
      this.traceId = params.traceId;
    }
  }
}

/**
 * Converts any thrown value into a stable `ApiError`. Handles the platform error
 * envelope, timeouts, HTTP errors, and network failures.
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const { response } = error;
    const data = response?.data as Partial<ErrorResponse> | undefined;

    if (data?.success === false && data.error) {
      return new ApiError({
        code: data.error.code,
        message: data.error.message,
        ...(response?.status !== undefined ? { status: response.status } : {}),
        ...(data.error.details !== undefined ? { details: data.error.details } : {}),
        ...(data.traceId !== undefined ? { traceId: data.traceId } : {}),
      });
    }

    if (error.code === 'ECONNABORTED') {
      return new ApiError({ code: 'TIMEOUT', message: 'The request timed out. Please try again.' });
    }

    if (response) {
      return new ApiError({
        code: 'HTTP_ERROR',
        message: error.message,
        status: response.status,
      });
    }

    return new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Please check your connection.',
    });
  }

  if (error instanceof Error) {
    return new ApiError({ code: 'UNKNOWN', message: error.message });
  }

  return new ApiError({ code: 'UNKNOWN', message: 'An unexpected error occurred.' });
}
