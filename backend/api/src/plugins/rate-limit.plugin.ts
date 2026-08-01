import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { config } from '@/config';

/**
 * Registers global rate limiting.
 *
 * Uses the default in-memory store in this phase (no cache backend is wired up
 * yet). A Redis-backed store can be introduced when distributed rate limiting is
 * required.
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
  });
}
