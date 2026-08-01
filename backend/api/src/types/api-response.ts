/**
 * Canonical API response envelopes for the Super Dreams platform.
 *
 * Every endpoint — in this foundation and in all future business modules —
 * returns exactly one of these two shapes. This is the single source of truth
 * for the platform response contract (see `docs/dna/06-api.md`).
 */

/** Optional response metadata (e.g. pagination) attached to success responses. */
export type ResponseMeta = Record<string, unknown>;

/**
 * Standard successful response envelope.
 *
 * `message` and `meta` are optional. `meta` typically carries pagination or
 * other contextual information on collection endpoints.
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: ResponseMeta;
}

/** A single error detail, optionally scoped to a request field. */
export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Standard error response envelope.
 *
 * - `error.code` — stable, machine-readable error code.
 * - `error.message` — human-readable summary.
 * - `error.details` — optional field-level errors (e.g. validation failures).
 * - `traceId` — correlation id for the request, for cross-referencing logs.
 */
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
