import { z } from 'zod';

/** Create / edit notification template form. */
export const templateFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'At least 2 characters.')
    .max(80)
    .regex(/^[A-Za-z0-9_.-]+$/, 'Letters, numbers, dashes, dots or underscores only.'),
  name: z.string().trim().min(1, 'Required.').max(150),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']),
  groupCode: z.enum(['', 'SYSTEM', 'ACCOUNT', 'REWARDS', 'CAMPAIGNS', 'WALLET']).optional(),
  subject: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1, 'A body is required.').max(10_000),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional(),
});
export type TemplateFormValues = z.infer<typeof templateFormSchema>;

/** Send / schedule notification form. */
export const sendFormSchema = z
  .object({
    recipientMemberId: z.string().trim().optional(),
    recipientUserId: z.string().trim().optional(),
    templateCode: z.string().trim().max(80).optional(),
    channel: z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']).optional(),
    subject: z.string().trim().max(300).optional(),
    body: z.string().trim().max(10_000).optional(),
    variablesText: z.string().trim().max(4000).optional(),
    scheduledAt: z.string().trim().optional(),
  })
  .refine((v) => (v.recipientMemberId ?? '').length > 0 || (v.recipientUserId ?? '').length > 0, {
    message: 'Provide a recipient member id or user id.',
    path: ['recipientMemberId'],
  })
  .refine(
    (v) =>
      (v.templateCode ?? '').length > 0 ||
      ((v.channel ?? '').length > 0 && (v.body ?? '').length > 0),
    { message: 'Provide a template code, or a channel and body.', path: ['templateCode'] },
  );
export type SendFormValues = z.infer<typeof sendFormSchema>;

/** Parses `key=value` lines into a variables object. */
export function parseVariables(text: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!text) {
    return result;
  }
  for (const line of text.split(/\n+/)) {
    const index = line.indexOf('=');
    if (index > 0) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (key) {
        result[key] = value;
      }
    }
  }
  return result;
}
