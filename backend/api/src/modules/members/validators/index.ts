import { z } from 'zod';

import { emailSchema, phoneSchema } from '@superdreams/validation';

/** Member statuses (a subset of the shared `record_status` enum). */
export const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED', 'ARCHIVED'] as const;

export const memberStatusSchema = z.enum(MEMBER_STATUSES);

const nameSchema = z.string().trim().min(1, 'Required.').max(100);
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

const profileSchema = z.object({
  dateOfBirth: dateStringSchema.optional(),
  gender: z.string().trim().max(50).optional(),
  avatarUrl: z.string().url('Enter a valid URL.').optional(),
  bio: z.string().trim().max(2000).optional(),
});

export const createMemberSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  status: memberStatusSchema.optional(),
  profile: profileSchema.optional(),
});

export const updateMemberSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.nullable().optional(),
  profile: profileSchema.optional(),
});

/** Fields a member may edit on their own profile (no email/status changes). */
export const updateOwnProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.nullable().optional(),
  profile: profileSchema.optional(),
});

export const changeStatusSchema = z.object({
  status: memberStatusSchema,
  reason: z.string().trim().max(500).optional(),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: memberStatusSchema.optional(),
  joinedFrom: dateStringSchema.optional(),
  joinedTo: dateStringSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'joinedAt', 'lastName', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const addNoteSchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty.').max(4000),
});

export const addDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Required.').max(200),
  category: z.string().trim().max(100).optional(),
  contentType: z.string().trim().max(100).optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
});

export const memberIdParamsSchema = z.object({ id: z.string().uuid() });
