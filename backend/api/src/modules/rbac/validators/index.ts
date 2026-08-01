import { z } from 'zod';

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
});

export const assignPermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

export const roleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const roleUserParamsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

export const rolePermissionParamsSchema = z.object({
  id: z.string().uuid(),
  permissionId: z.string().uuid(),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});
