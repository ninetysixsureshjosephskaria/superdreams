/**
 * Canonical API response envelopes for the Super Dreams platform.
 * Single source of truth for the platform response contract (see
 * `docs/dna/06-api.md`).
 */

/** Optional response metadata (e.g. pagination) attached to success responses. */
export type ResponseMeta = Record<string, unknown>;

/** A single error detail, optionally scoped to a request field. */
export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: ResponseMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  traceId?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * A transport-agnostic, normalized error the UI can rely on regardless of how
 * the failure occurred (HTTP error, network failure, timeout).
 */
export interface NormalizedError {
  code: string;
  message: string;
  status?: number;
  details?: ErrorDetail[];
  traceId?: string;
}
