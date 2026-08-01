import type { z } from 'zod';

import type { UserResponse } from '@/modules/identity';

import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../validators';

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
}

export interface LoginResult {
  user: UserResponse;
  session: { id: string; expiresAt: Date };
  tokens: AuthTokens;
}

export interface SessionSummary {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  current: boolean;
}

/** Login request context resolved from the HTTP request (not user input). */
export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}
