import { z } from 'zod';

import { emailSchema } from '@superdreams/validation';

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

/** Admin member create/edit form schema (reuses shared email validation). */
export const memberFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Required.').max(100),
  lastName: z.string().trim().min(1, 'Required.').max(100),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || PHONE_RE.test(value), 'Enter a valid phone number.'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'ARCHIVED']).optional(),
  bio: z.string().trim().max(2000).optional(),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
