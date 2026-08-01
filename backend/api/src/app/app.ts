import fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import { registerRedis } from '@/cache';
import { registerDatabase } from '@/database';
import { registerErrorHandler } from '@/errors';
import { buildLoggerOptions } from '@/logger';
import { registerRequestContext } from '@/middleware';
import { registerPlugins } from '@/plugins';
import { registerRoutes } from '@/routes';

/**
 * Builds and fully initializes the Fastify application.
 *
 * Wiring order is deliberate:
 *  1. request context (correlation id) and infrastructure decorators (db, redis)
 *  2. core plugins — including Swagger, which must precede route registration
 *  3. the centralized error handler
 *  4. routes
 *  5. `ready()` to finalize plugin/route registration (and OpenAPI generation)
 *
 * The returned instance is ready to receive requests (or to be exercised via
 * `inject` in tests) but is not yet listening on a socket.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: buildLoggerOptions(),
    trustProxy: true,
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      return typeof header === 'string' && header.length > 0 ? header : randomUUID();
    },
  });

  registerRequestContext(app);
  registerDatabase(app);
  registerRedis(app);

  await registerPlugins(app);

  registerErrorHandler(app);
  registerRoutes(app);

  await app.ready();

  return app;
}
