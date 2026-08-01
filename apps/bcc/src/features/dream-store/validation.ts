import { z } from 'zod';

/** Form schemas for the Dream Store admin. Points/stock are non-negative integers. */

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  sku: z.string().min(1, 'SKU is required.'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  points: z.number({ invalid_type_error: 'Points are required.' }).int().min(0),
  stock: z.number({ invalid_type_error: 'Stock is required.' }).int().min(0),
  reorderLevel: z.number({ invalid_type_error: 'Reorder level is required.' }).int().min(0),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']),
  description: z.string().optional(),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number({ invalid_type_error: 'Sort order is required.' }).int().min(0),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const stockAdjustFormSchema = z.object({
  change: z
    .number({ invalid_type_error: 'Change is required.' })
    .int()
    .refine((value) => value !== 0, 'Change must be non-zero.'),
  reason: z.string().min(1, 'A reason is required.'),
});
export type StockAdjustFormValues = z.infer<typeof stockAdjustFormSchema>;
