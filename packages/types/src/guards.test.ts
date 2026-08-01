import { describe, expect, it } from 'vitest';

import type { ApiResponse } from './api';
import { isErrorResponse, isSuccessResponse } from './guards';

describe('response guards', () => {
  const success: ApiResponse<number> = { success: true, data: 42 };
  const failure: ApiResponse<number> = {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Missing.' },
  };

  it('identifies success envelopes', () => {
    expect(isSuccessResponse(success)).toBe(true);
    expect(isErrorResponse(success)).toBe(false);
  });

  it('identifies error envelopes', () => {
    expect(isErrorResponse(failure)).toBe(true);
    expect(isSuccessResponse(failure)).toBe(false);
  });
});
