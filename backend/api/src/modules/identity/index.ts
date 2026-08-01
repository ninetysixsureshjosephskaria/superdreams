import type { Database } from '@/database';

import { IdentityEventBus } from './events';
import { OrganizationRepository, UserRepository } from './repositories';
import { OrganizationService, UserService } from './services';

export interface IdentityModule {
  events: IdentityEventBus;
  users: UserService;
  organizations: OrganizationService;
  repositories: {
    users: UserRepository;
    organizations: OrganizationRepository;
  };
}

/**
 * Composition root for the identity module. The upcoming authentication phase
 * reuses these services (user lookup, password hashing) without changes here.
 */
export function createIdentityModule(
  db: Database,
  events: IdentityEventBus = new IdentityEventBus(),
): IdentityModule {
  const userRepository = new UserRepository(db);
  const organizationRepository = new OrganizationRepository(db);
  return {
    events,
    users: new UserService(userRepository, events),
    organizations: new OrganizationService(organizationRepository, events),
    repositories: { users: userRepository, organizations: organizationRepository },
  };
}

export * from './domain';
export * from './dto';
export * from './events';
export { UserService, OrganizationService, hashPassword, verifyPassword } from './services';
export { UserRepository, OrganizationRepository } from './repositories';
