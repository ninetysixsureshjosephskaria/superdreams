import { z } from 'zod';

import { ValidationError } from '@/errors';

import { numberBoundsFor, selectOptionsFor } from '../registry';

export type SettingValueType =
  'STRING' | 'NUMBER' | 'BOOLEAN' | 'COLOR' | 'SELECT' | 'JSON' | 'ARRAY';

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const settingKey = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[A-Za-z0-9_.-]+$/, 'Letters, numbers, dots, dashes or underscores only.');

export const listSettingsQuerySchema = z.object({
  category: z.string().trim().max(50).optional(),
  search: z.string().trim().max(200).optional(),
});

export const updateSettingsSchema = z.object({
  updates: z.record(settingKey, z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one setting to update.',
  }),
});

export const updateBrandingSchema = z
  .object({
    logoUrl: z.string().trim().max(500).optional(),
    faviconUrl: z.string().trim().max(500).optional(),
    primaryColor: z.string().trim().optional(),
    secondaryColor: z.string().trim().optional(),
    theme: z.string().trim().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one branding value.',
  });

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  key: z.string().trim().max(120).optional(),
  category: z.string().trim().max(50).optional(),
});

export const createFeatureToggleSchema = z.object({
  key: settingKey,
  name: z.string().trim().min(1, 'Required.').max(150),
  description: z.string().trim().max(500).optional(),
  enabled: z.boolean().optional(),
  strategy: z.record(z.string(), z.unknown()).optional(),
});

export const updateFeatureToggleSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    enabled: z.boolean().optional(),
    strategy: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field.' });

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().max(150).optional(),
  message: z.string().trim().max(1000).optional(),
  allowAdminBypass: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const settingIdParamsSchema = z.object({ id: z.string().uuid() });

/**
 * Validates and normalizes a setting value against its type and any registry
 * constraints (SELECT options, numeric bounds). Throws {@link ValidationError}.
 * Returns the coerced value to persist.
 */
export function assertValidValue(
  key: string,
  valueType: SettingValueType,
  value: unknown,
): unknown {
  switch (valueType) {
    case 'STRING': {
      if (typeof value !== 'string') {
        throw new ValidationError(`Setting "${key}" must be a string.`);
      }
      return value;
    }
    case 'COLOR': {
      if (typeof value !== 'string' || !COLOR_RE.test(value)) {
        throw new ValidationError(`Setting "${key}" must be a hex color like #4f46e5.`);
      }
      return value;
    }
    case 'NUMBER': {
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || !Number.isFinite(num)) {
        throw new ValidationError(`Setting "${key}" must be a number.`);
      }
      const bounds = numberBoundsFor(key);
      if (bounds?.min != null && num < bounds.min) {
        throw new ValidationError(`Setting "${key}" must be at least ${bounds.min}.`);
      }
      if (bounds?.max != null && num > bounds.max) {
        throw new ValidationError(`Setting "${key}" must be at most ${bounds.max}.`);
      }
      return num;
    }
    case 'BOOLEAN': {
      if (typeof value !== 'boolean') {
        throw new ValidationError(`Setting "${key}" must be a boolean.`);
      }
      return value;
    }
    case 'SELECT': {
      if (typeof value !== 'string') {
        throw new ValidationError(`Setting "${key}" must be a string option.`);
      }
      const options = selectOptionsFor(key);
      if (options && !options.includes(value)) {
        throw new ValidationError(`Setting "${key}" must be one of: ${options.join(', ')}.`);
      }
      return value;
    }
    case 'ARRAY': {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new ValidationError(`Setting "${key}" must be an array of strings.`);
      }
      return value;
    }
    case 'JSON': {
      if (value === null || typeof value !== 'object') {
        throw new ValidationError(`Setting "${key}" must be a JSON object.`);
      }
      return value;
    }
    default: {
      throw new ValidationError(`Unknown value type for setting "${key}".`);
    }
  }
}
