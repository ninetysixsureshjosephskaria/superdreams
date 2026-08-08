import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createIdentityModule } from '@/modules/identity';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';

import { MemberEventBus } from './events';
import {
  AuditRepository,
  MemberActivityRepository,
  MemberAddressRepository,
  MemberContactRepository,
  MemberDocumentRepository,
  MemberNoteRepository,
  MemberProfileRepository,
  MemberRepository,
  MemberStatusHistoryRepository,
} from './repositories';
import { registerMemberRoutes } from './routes';
import { MemberAccountService, MemberService } from './services';

export interface MembersModule {
  events: MemberEventBus;
  service: MemberService;
  /** Authentication account status for a member (distinct from member.status). */
  accountService: MemberAccountService;
  repositories: {
    members: MemberRepository;
    profiles: MemberProfileRepository;
    notes: MemberNoteRepository;
    documents: MemberDocumentRepository;
  };
}

/** Composition root for the Member Management module. */
export function createMembersModule(
  db: Database,
  events: MemberEventBus = new MemberEventBus(),
): MembersModule {
  const memberRepository = new MemberRepository(db);
  const profileRepository = new MemberProfileRepository(db);
  const noteRepository = new MemberNoteRepository(db);
  const documentRepository = new MemberDocumentRepository(db);
  const addressRepository = new MemberAddressRepository(db);
  const contactRepository = new MemberContactRepository(db);
  const statusHistoryRepository = new MemberStatusHistoryRepository(db);
  const activityRepository = new MemberActivityRepository(db);
  const auditRepository = new AuditRepository(db);

  const service = new MemberService(
    memberRepository,
    profileRepository,
    noteRepository,
    documentRepository,
    addressRepository,
    contactRepository,
    statusHistoryRepository,
    activityRepository,
    auditRepository,
    events,
  );

  // Account (auth) status control on the Members surface (D5). Reuses Identity
  // for the transition, the shared audit repository for the sensitive change, and
  // the auth SessionService to revoke sessions on suspend/deactivate (D7).
  const accountService = new MemberAccountService(
    memberRepository,
    createIdentityModule(db),
    auditRepository,
    createAuthModule(db).sessions,
  );

  return {
    events,
    service,
    accountService,
    repositories: {
      members: memberRepository,
      profiles: profileRepository,
      notes: noteRepository,
      documents: documentRepository,
    },
  };
}

/**
 * Wires Member Management into the application: reuses the Authentication module
 * for the authenticate preHandler and the RBAC module for permission guards.
 */
export function registerMembersModule(app: FastifyInstance): MembersModule {
  const module = createMembersModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerMemberRoutes(app, {
    service: module.service,
    accountService: module.accountService,
    authenticate,
    guardDeps,
    db: app.db,
  });
  return module;
}

export { MemberEventBus } from './events';
export type { MemberEvent, MemberEventType, MemberEventHandler } from './events';
export { MemberService } from './services';
export type { MemberSummary, MemberDetail, PaginatedMembers, MemberStatus } from './dto';
export { isMemberOwner, assertMemberOwner } from './policies';
