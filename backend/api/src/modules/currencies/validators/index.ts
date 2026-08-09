import { z } from 'zod';

/** 3-letter ISO-4217 currency code, normalised to upper case. */
export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter ISO currency code.')
  .transform((value) => value.toUpperCase());

const perUnitValueSchema = z.coerce
  .number()
  .int('Enter a per-unit value greater than 0.')
  .positive('Enter a per-unit value greater than 0.')
  .max(100_000_000);

const nameSchema = z.string().trim().min(1).max(120);
const symbolSchema = z.string().trim().max(8);
const flagSlugSchema = z.string().trim().max(64);
const decimalDigitsSchema = z.coerce.number().int().min(0).max(6);

export const createCurrencySchema = z.object({
  code: currencyCodeSchema,
  name: nameSchema,
  symbol: symbolSchema.optional(),
  decimalDigits: decimalDigitsSchema.optional(),
  perUnitValue: perUnitValueSchema,
  flagSlug: flagSlugSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateCurrencySchema = z
  .object({
    name: nameSchema.optional(),
    symbol: symbolSchema.optional(),
    decimalDigits: decimalDigitsSchema.optional(),
    perUnitValue: perUnitValueSchema.optional(),
    flagSlug: flagSlugSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const currencyCodeParamsSchema = z.object({ code: currencyCodeSchema });
export const listCurrenciesQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional(),
});

export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;
