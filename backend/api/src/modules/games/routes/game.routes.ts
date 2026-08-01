import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import type { GuardDeps } from '@/modules/rbac';

import { GameController } from '../controllers/game.controller';
import type { GameService } from '../services';

const PREFIX = '/api/v1';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const listGamesSchema: FastifySchema = {
  tags: ['Games'],
  summary: 'List playable games',
  security: secured,
};

const startSchema: FastifySchema = {
  tags: ['Games'],
  summary: 'Start a game session (charges entry cost)',
  security: secured,
  params: idParams,
};

const scoreSchema: FastifySchema = {
  tags: ['Games'],
  summary: 'Submit a score and receive reward points',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['score'],
    properties: { score: { type: 'integer', minimum: 0 } },
  },
};

const historySchema: FastifySchema = {
  tags: ['Games'],
  summary: 'My play history',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

export interface RegisterGameRoutesOptions {
  service: GameService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers Games routes. All routes are member self-service (auth-only). */
export function registerGameRoutes(app: FastifyInstance, options: RegisterGameRoutesOptions): void {
  const { service, authenticate } = options;
  const controller = new GameController(service);
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      instance.get('/games', { schema: listGamesSchema, preHandler: authed }, controller.listGames);
      instance.get(
        '/games/me/history',
        { schema: historySchema, preHandler: authed },
        controller.myHistory,
      );
      instance.post(
        '/games/:id/start',
        { schema: startSchema, preHandler: authed },
        controller.start,
      );
      instance.post(
        '/games/sessions/:id/score',
        { schema: scoreSchema, preHandler: authed },
        controller.submitScore,
      );
      done();
    },
    { prefix: PREFIX },
  );
}
