import type { AxiosInstance } from 'axios';

/**
 * Authentication API resource — the single, shared definition of the auth HTTP
 * contract used by both frontends (no duplicated API logic). Access tokens are
 * JWTs; refresh tokens are opaque strings. JSON dates are strings over the wire.
 */

export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface AuthUser {
  id: string;
  organizationId: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  status: UserStatus;
  emailVerifiedAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
  deviceName?: string;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
}

export interface LoginResult {
  user: AuthUser;
  session: AuthSession;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** `verificationToken`/`resetToken` are only present outside production (local testing). */
export interface RegisterResult {
  message: string;
  email: string;
  verificationToken?: string;
}

export interface ResendVerificationResult {
  message: string;
  verificationToken?: string;
}

export interface ForgotPasswordResult {
  message: string;
  resetToken?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface AuthApi {
  login(input: LoginInput): Promise<LoginResult>;
  /** Rotates the refresh token. Token comes from the body or the httpOnly cookie. */
  refresh(refreshToken?: string): Promise<RefreshResult>;
  logout(): Promise<void>;
  me(): Promise<AuthUser>;
  changePassword(input: ChangePasswordInput): Promise<{ message: string }>;
  /** Effective roles + permissions for a user (requires users.permissions.read). */
  getUserPermissions(userId: string): Promise<UserPermissions>;
  /** Sign up — creates a pending account and triggers the activation email. */
  register(input: RegisterInput): Promise<RegisterResult>;
  /** Resend the activation email. */
  resendVerification(email: string): Promise<ResendVerificationResult>;
  /** Activate an account with the emailed token. */
  verifyEmail(token: string): Promise<{ verified: boolean }>;
  /** Request a password-reset email. */
  forgotPassword(email: string): Promise<ForgotPasswordResult>;
  /** Reset the password with the emailed token. */
  resetPassword(token: string, password: string): Promise<{ message: string }>;
}

/** Binds the auth resource to a configured API client. */
export function createAuthApi(client: AxiosInstance): AuthApi {
  const base = '/api/v1/auth';
  return {
    async login(input) {
      const response = await client.post<Envelope<LoginResult>>(`${base}/login`, input);
      return response.data.data;
    },
    async refresh(refreshToken) {
      const response = await client.post<Envelope<RefreshResult>>(
        `${base}/refresh`,
        refreshToken ? { refreshToken } : {},
      );
      return response.data.data;
    },
    async logout() {
      await client.post(`${base}/logout`);
    },
    async me() {
      const response = await client.get<Envelope<{ user: AuthUser }>>(`${base}/me`);
      return response.data.data.user;
    },
    async changePassword(input) {
      const response = await client.post<Envelope<{ message: string }>>(
        `${base}/change-password`,
        input,
      );
      return response.data.data;
    },
    async getUserPermissions(userId) {
      const response = await client.get<Envelope<UserPermissions>>(
        `/api/v1/users/${userId}/permissions`,
      );
      return response.data.data;
    },
    async register(input) {
      const response = await client.post<Envelope<RegisterResult>>(`${base}/register`, input);
      return response.data.data;
    },
    async resendVerification(email) {
      const response = await client.post<Envelope<ResendVerificationResult>>(
        `${base}/resend-verification`,
        { email },
      );
      return response.data.data;
    },
    async verifyEmail(token) {
      const response = await client.post<Envelope<{ verified: boolean }>>(`${base}/verify-email`, {
        token,
      });
      return response.data.data;
    },
    async forgotPassword(email) {
      const response = await client.post<Envelope<ForgotPasswordResult>>(
        `${base}/forgot-password`,
        {
          email,
        },
      );
      return response.data.data;
    },
    async resetPassword(token, password) {
      const response = await client.post<Envelope<{ message: string }>>(`${base}/reset-password`, {
        token,
        password,
      });
      return response.data.data;
    },
  };
}
