import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

import { config } from '@/config';

/**
 * Registers CORS using the configured allow-list of origins.
 */
export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
}
