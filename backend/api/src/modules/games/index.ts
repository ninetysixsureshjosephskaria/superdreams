import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import {
  createPartnerReferralModule,
  partnerReferralDeps,
  type PartnerReferralService,
} from '@/modules/partner-referral';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createRewardsModule, type RewardService } from '@/modules/rewards';
import { createSettingsModule } from '@/modules/settings';

import { GameEventBus } from './events';
import { GameAuditRepository, GameRepository, SessionRepository } from './repositories';
import { registerGameRoutes } from './routes';
import { GameService } from './services';

export interface GamesModule {
  events: GameEventBus;
  service: GameService;
}

/** Composition root for the Games module. Entry/reward points reuse the Rewards ledger. */
export function createGamesModule(
  db: Database,
  options: {
    events?: GameEventBus;
    rewards?: RewardService;
    partnerReferral?: PartnerReferralService;
  } = {},
): GamesModule {
  const events = options.events ?? new GameEventBus();
  const rewards = options.rewards ?? createRewardsModule(db).service;
  const service = new GameService(
    db,
    new GameRepository(db),
    new SessionRepository(db),
    new GameAuditRepository(),
    rewards,
    events,
    options.partnerReferral,
  );
  return { events, service };
}

/**
 * Wires Games into the application: reuses Authentication for the authenticate
 * preHandler, RBAC guard deps for consistency, and the Rewards module's public
 * service for atomic point movements when charging entry and awarding wins.
 */
export function registerGamesModule(app: FastifyInstance): GamesModule {
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const settings = createSettingsModule(app.db);
  const rewards = createRewardsModule(app.db).service;
  // P3: the Games earning path credits the member's direct active Partner in the
  // same transaction as the win. Shares this rewards instance so the partner credit
  // reuses the same ledger seam.
  const partnerReferral = createPartnerReferralModule(
    app.db,
    partnerReferralDeps(rewards, { authorization: rbac.authorization, settings: settings.service }),
  );
  const module = createGamesModule(app.db, {
    rewards,
    partnerReferral: partnerReferral.service,
  });

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerGameRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { GameEventBus } from './events';
export type { GameEvent, GameEventType, GameEventHandler } from './events';
export { GameService } from './services';
export type {
  GameData,
  GameSessionData,
  PlayResult,
  ScoreResult,
  GameHistoryItem,
  PaginatedHistory,
  GameStatus,
  SessionStatus,
} from './dto';
