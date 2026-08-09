import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';

import { CurrencyAuditRepository, CurrencyRepository } from './repositories';
import { registerCurrencyRoutes } from './routes';
import { CurrencyService } from './services';

export interface CurrenciesModule {
  service: CurrencyService;
  repositories: { currencies: CurrencyRepository };
}

/** Composition root for the Currencies module (Phase 2C). */
export function createCurrenciesModule(db: Database): CurrenciesModule {
  const currencies = new CurrencyRepository(db);
  const audit = new CurrencyAuditRepository();
  const service = new CurrencyService(db, currencies, audit);
  return { service, repositories: { currencies } };
}

/** Wires Currencies into the application (auth preHandler + RBAC guards). */
export function registerCurrenciesModule(app: FastifyInstance): CurrenciesModule {
  const module = createCurrenciesModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerCurrencyRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { CurrencyService } from './services';
export { syncCurrencyReference } from './seed';
export type { CurrencyData, CurrencyActor } from './dto';
