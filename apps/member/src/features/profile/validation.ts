import { z } from 'zod';

const PHONE_RE = /^\+?[1-9]\d{6,14}$/;

/** Self-service profile form (no email/status changes). */
export const profileFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Required.').max(100),
  lastName: z.string().trim().min(1, 'Required.').max(100),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || PHONE_RE.test(value), 'Enter a valid phone number.'),
  bio: z.string().trim().max(2000).optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
