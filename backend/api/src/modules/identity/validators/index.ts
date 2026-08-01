import { z } from 'zod';

import { emailSchema, passwordSchema } from '@superdreams/validation';

/** Username: 3–32 chars, letters/numbers/._- */
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, and . _ -');

export const organizationNameSchema = z.string().trim().min(2).max(120);

export const organizationSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric, hyphen-separated.');

const nameSchema = z.string().trim().min(1).max(80);

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  organizationId: z.string().uuid().optional(),
});

export const updateUserProfileSchema = z.object({
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  displayName: z.string().trim().min(1).max(160).optional(),
});

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  description: z.string().trim().max(500).optional(),
});

// Re-export the shared primitives so the identity module has one validation entry point.
export { emailSchema, passwordSchema };
