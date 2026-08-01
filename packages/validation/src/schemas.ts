import { z } from 'zod';

/** Email address (trimmed, lowercased). */
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

/** Password with a minimum length and basic complexity. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[0-9]/, 'Include at least one number.');

/** UUID identifier. */
export const uuidSchema = z.string().uuid('Invalid identifier.');

/** E.164-ish phone number. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Enter a valid phone number.');

/** Pagination query parameters (coerced from strings). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** Free-text search query. */
export const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
