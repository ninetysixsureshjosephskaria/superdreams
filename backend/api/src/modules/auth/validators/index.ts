import { z } from 'zod';

import { emailSchema, passwordSchema } from '@superdreams/validation';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  deviceId: z.string().max(200).optional(),
  deviceName: z.string().max(200).optional(),
  rememberMe: z.boolean().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export const sessionParamsSchema = z.object({
  id: z.string().uuid(),
});
