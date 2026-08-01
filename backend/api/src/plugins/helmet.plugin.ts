import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

import { config } from '@/config';

/**
 * Registers @fastify/helmet security headers.
 *
 * When Swagger UI is enabled, the Content-Security-Policy is relaxed so the docs
 * assets load correctly. With Swagger disabled (e.g. production), Helmet's
 * default CSP is applied.
 */
export async function registerHelmet(app: FastifyInstance): Promise<void> {
  await app.register(helmet, config.swagger.enabled ? { contentSecurityPolicy: false } : {});
}
