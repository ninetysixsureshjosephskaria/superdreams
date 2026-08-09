import { z } from 'zod';

/** Wallet lifecycle statuses. */
export const WALLET_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'] as const;
export const walletStatusSchema = z.enum(WALLET_STATUSES);

/** Ledger transaction types. */
export const TRANSACTION_TYPES = [
  'CREDIT',
  'DEBIT',
  'ADJUSTMENT',
  'HOLD',
  'RELEASE',
  'REVERSAL',
] as const;
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export const TRANSACTION_DIRECTIONS = ['CREDIT', 'DEBIT'] as const;
export const transactionDirectionSchema = z.enum(TRANSACTION_DIRECTIONS);

export const TRANSACTION_STATUSES = ['POSTED', 'REVERSED'] as const;

/** 3-letter ISO-4217 currency code, normalised to upper case. */
export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter ISO currency code.')
  .transform((value) => value.toUpperCase());

/** A positive amount expressed in integer minor units (e.g. cents). */
export const amountMinorSchema = z.coerce
  .number()
  .int('Amount must be a whole number of minor units.')
  .positive('Amount must be greater than zero.')
  .max(Number.MAX_SAFE_INTEGER);

const referenceSchema = z.string().trim().min(1).max(100);
const reasonSchema = z.string().trim().max(500);

const limitsSchema = z.object({
  minBalanceMinor: z.coerce.number().int().optional(),
  maxBalanceMinor: z.coerce.number().int().nonnegative().optional(),
  dailyDebitLimitMinor: z.coerce.number().int().nonnegative().optional(),
  singleTransactionLimitMinor: z.coerce.number().int().positive().optional(),
  allowNegative: z.boolean().optional(),
});

export const createWalletSchema = z.object({
  memberId: z.string().uuid(),
  /** Economy discriminator (Phase 2). Defaults to LOYALTY for backward compatibility. */
  kind: z.enum(['LOYALTY', 'FINANCIAL']).optional(),
  currencyCode: currencyCodeSchema.optional(),
  status: walletStatusSchema.optional(),
  limits: limitsSchema.optional(),
});

export const creditSchema = z.object({
  amountMinor: amountMinorSchema,
  reference: referenceSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export const debitSchema = creditSchema;

export const adjustmentSchema = z.object({
  direction: transactionDirectionSchema,
  amountMinor: amountMinorSchema,
  reason: reasonSchema.min(1, 'A reason is required for adjustments.'),
  reference: referenceSchema.optional(),
});

export const holdSchema = z.object({
  amountMinor: amountMinorSchema,
  reason: reasonSchema.optional(),
  reference: referenceSchema.optional(),
});

export const changeWalletStatusSchema = z.object({
  status: walletStatusSchema,
  reason: reasonSchema.optional(),
});

export const generateStatementSchema = z.object({
  periodStart: z.string().datetime({ message: 'Use an ISO 8601 timestamp.' }).optional(),
  periodEnd: z.string().datetime({ message: 'Use an ISO 8601 timestamp.' }).optional(),
});

export const listWalletsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: walletStatusSchema.optional(),
  currencyCode: currencyCodeSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'openedAt', 'status', 'walletNumber'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  type: transactionTypeSchema.optional(),
  direction: transactionDirectionSchema.optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minAmountMinor: z.coerce.number().int().nonnegative().optional(),
  maxAmountMinor: z.coerce.number().int().nonnegative().optional(),
  sortBy: z.enum(['createdAt', 'amountMinor']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const walletIdParamsSchema = z.object({ id: z.string().uuid() });
export const holdParamsSchema = z.object({
  id: z.string().uuid(),
  holdId: z.string().uuid(),
});
export const transactionParamsSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
});

/**
 * Query for the portal self-service `/wallets/me*` routes. `kind` selects which
 * wallet to resolve for the caller; defaults to LOYALTY for backward
 * compatibility (FINANCIAL surfaces the units wallet).
 */
export const meWalletQuerySchema = z.object({
  kind: z.enum(['LOYALTY', 'FINANCIAL']).optional(),
});
