import type { z } from 'zod';

import type { OrganizationStatus, UserStatus } from '../domain';
import type {
  createOrganizationSchema,
  createUserSchema,
  updateUserProfileSchema,
} from '../validators';

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/** Safe user representation — never exposes the password hash. */
export interface UserResponse {
  id: string;
  organizationId: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: OrganizationStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
