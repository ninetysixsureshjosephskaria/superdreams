import { z } from 'zod';

/** Create / edit campaign form. */
export const campaignFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'At least 2 characters.')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, dashes or underscores only.'),
  name: z.string().trim().min(1, 'Required.').max(150),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(['PROMOTIONAL', 'REWARD', 'REFERRAL', 'SEASONAL', 'ENGAGEMENT']),
  audienceType: z.enum(['ALL_MEMBERS', 'SEGMENT', 'MANUAL', 'STATUS', 'JOIN_DATE']),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
  requiredStatus: z.enum(['', 'ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  rewardPoints: z
    .number({ invalid_type_error: 'Enter a whole number of points.' })
    .int()
    .positive()
    .optional()
    .or(z.nan().transform(() => undefined)),
});
export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

/** Schedule form. */
export const scheduleFormSchema = z.object({
  scheduleType: z.enum(['IMMEDIATE', 'SCHEDULED', 'RECURRING']),
  startAt: z.string().trim().optional(),
  recurrenceCron: z.string().trim().max(120).optional(),
});
export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;
