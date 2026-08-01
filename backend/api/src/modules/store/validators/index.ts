import { z } from 'zod';

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
export const productStatusSchema = z.enum(PRODUCT_STATUSES);

export const ORDER_STATUSES = ['PENDING', 'FULFILLED', 'CANCELLED'] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);

export const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const;

const name = z.string().trim().min(1, 'Required.').max(150);
const uuid = z.string().uuid();
const points = z.coerce.number().int().min(0).max(100_000_000);
const stock = z.coerce.number().int().min(0).max(1_000_000);

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  categoryId: uuid.optional(),
  status: productStatusSchema.optional(),
  sortBy: z.enum(['createdAt', 'name', 'points', 'stock']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createProductSchema = z.object({
  name,
  sku: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, dashes or underscores only.'),
  categoryId: uuid.optional(),
  points,
  stock: stock.default(0),
  reorderLevel: stock.default(0),
  status: productStatusSchema.default('DRAFT'),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(500).optional(),
});

export const updateProductSchema = z.object({
  name: name.optional(),
  categoryId: uuid.nullable().optional(),
  points: points.optional(),
  reorderLevel: stock.optional(),
  status: productStatusSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
});

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const createCategorySchema = z.object({
  name,
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only.')
    .optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

export const updateCategorySchema = z
  .object({
    name: name.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field.' });

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  stockStatus: z.enum(STOCK_STATUSES).optional(),
});

export const adjustStockSchema = z.object({
  change: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, 'Change must be non-zero.'),
  reason: z.string().trim().min(1, 'A reason is required.').max(300),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: orderStatusSchema.optional(),
  memberId: uuid.optional(),
  sortBy: z.enum(['createdAt', 'totalPoints', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const redeemSchema = z.object({
  productId: uuid,
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export const storeIdParamsSchema = z.object({ id: z.string().uuid() });
