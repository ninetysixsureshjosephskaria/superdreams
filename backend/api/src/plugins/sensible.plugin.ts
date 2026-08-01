import sensible from '@fastify/sensible';
import type { FastifyInstance } from 'fastify';

/**
 * Registers @fastify/sensible, adding useful HTTP utilities and error helpers.
 */
export async function registerSensible(app: FastifyInstance): Promise<void> {
  await app.register(sensible);
}
