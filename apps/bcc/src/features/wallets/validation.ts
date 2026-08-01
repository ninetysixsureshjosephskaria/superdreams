import { z } from 'zod';

const amountMajor = z
  .number({ invalid_type_error: 'Enter an amount.' })
  .positive('Amount must be greater than zero.')
  .max(1_000_000_000, 'Amount is too large.');

/** Create-wallet form (admin picks a member and currency). */
export const createWalletSchema = z.object({
  memberId: z.string().uuid('Enter a valid member id.'),
  currencyCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code.')
    .transform((value) => value.toUpperCase()),
  status: z.enum(['PENDING', 'ACTIVE']).optional(),
});
export type CreateWalletValues = z.infer<typeof createWalletSchema>;

/** Credit / debit form (amount in major units). */
export const amountFormSchema = z.object({
  amount: amountMajor,
  reference: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
});
export type AmountFormValues = z.infer<typeof amountFormSchema>;

/** Manual adjustment form. */
export const adjustmentFormSchema = z.object({
  direction: z.enum(['CREDIT', 'DEBIT']),
  amount: amountMajor,
  reason: z.string().trim().min(1, 'A reason is required.').max(500),
});
export type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

/** Place-hold form. */
export const holdFormSchema = z.object({
  amount: amountMajor,
  reason: z.string().trim().max(500).optional(),
});
export type HoldFormValues = z.infer<typeof holdFormSchema>;
