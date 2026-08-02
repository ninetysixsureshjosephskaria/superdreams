import type { InferSelectModel } from 'drizzle-orm';

import type { organizations, users } from '@/database/schema';

import type { OrganizationProps, UserProps } from '../domain';
import type { OrganizationResponse, UserResponse } from '../dto';

export type UserRow = InferSelectModel<typeof users>;
export type OrganizationRow = InferSelectModel<typeof organizations>;

/** Maps a persisted user row to domain props (includes lifecycle fields). */
export function toUserProps(row: UserRow): UserProps {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

/** Maps a persisted user row to the safe response DTO (no password hash). */
export function toUserResponse(row: UserRow): UserResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOrganizationProps(row: OrganizationRow): OrganizationProps {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export function toOrganizationResponse(row: OrganizationRow): OrganizationResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
