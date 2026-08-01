import type { FastifyInstance } from 'fastify';

import { registerCookie } from './cookie.plugin';
import { registerCors } from './cors.plugin';
import { registerHelmet } from './helmet.plugin';
import { registerRateLimit } from './rate-limit.plugin';
import { registerSensible } from './sensible.plugin';
import { registerSwagger } from './swagger.plugin';

/**
 * Registers all Fastify core plugins in a deliberate order.
 *
 * Swagger is registered here (before routes are added by the caller) so the
 * generated OpenAPI specification includes every route schema.
 */
export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await registerSensible(app);
  await registerHelmet(app);
  await registerCors(app);
  await registerCookie(app);
  await registerRateLimit(app);
  await registerSwagger(app);
}
