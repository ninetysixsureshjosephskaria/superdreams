import type { ApiResponse, ErrorResponse, SuccessResponse } from './api';

/** Narrows an API response to a success envelope. */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/** Narrows an API response to an error envelope. */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ErrorResponse {
  return response.success === false;
}
