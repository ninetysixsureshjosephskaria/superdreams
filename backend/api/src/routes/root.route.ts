import type { FastifyInstance } from 'fastify';

import { config } from '@/config';
import { sendSuccess } from '@/utils';

/**
 * Registers the root metadata endpoint (`GET /`).
 */
export function registerRootRoute(app: FastifyInstance): void {
  app.get(
    '/',
    {
      schema: {
        tags: ['Meta'],
        summary: 'Service metadata',
        description: 'Returns basic information about the API service.',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { type: 'string' },
                  environment: { type: 'string' },
                  docs: { type: 'string' },
                },
                required: ['name', 'status', 'environment'],
              },
            },
            required: ['success', 'data'],
          },
        },
      },
    },
    (_request, reply) =>
      sendSuccess(reply, {
        name: 'Super Dreams API',
        status: 'ok',
        environment: config.app.env,
        ...(config.swagger.enabled ? { docs: '/docs' } : {}),
      }),
  );
}
