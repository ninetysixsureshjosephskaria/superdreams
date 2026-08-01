import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

import { config } from '@/config';

/**
 * Registers OpenAPI generation (@fastify/swagger) and the Swagger UI at `/docs`.
 *
 * Must be registered before routes so that route schemas are collected into the
 * generated specification. No-op when Swagger is disabled via configuration.
 */
export async function registerSwagger(app: FastifyInstance): Promise<void> {
  if (!config.swagger.enabled) {
    return;
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Super Dreams API',
        description: 'Super Dreams platform API service.',
        version: '0.0.0',
      },
      servers: [{ url: '/' }],
      tags: [
        { name: 'Meta', description: 'Service metadata.' },
        { name: 'Health', description: 'Liveness, readiness and health checks.' },
        { name: 'Auth', description: 'Authentication, sessions and password management.' },
        { name: 'Authorization', description: 'Roles, permissions and RBAC management.' },
        { name: 'Members', description: 'Member Management (CRUD, status, notes, documents).' },
        {
          name: 'Wallets',
          description: 'Wallet Management (balances, ledger, holds, adjustments, statements).',
        },
        {
          name: 'Rewards',
          description: 'Rewards Management (programs, points earn/redeem/adjust, ledger, expiry).',
        },
        {
          name: 'Campaigns',
          description: 'Campaign Management (lifecycle, audience, rewards, enrollment, execution).',
        },
        {
          name: 'Notifications',
          description: 'Notification Center (templates, queue, delivery, inbox, preferences).',
        },
        {
          name: 'Reports',
          description:
            'Reports & Analytics (read-only reporting, dashboards, exports, schedules, history).',
        },
        {
          name: 'Settings',
          description:
            'Settings & Administration (configuration, feature toggles, maintenance, history).',
        },
        {
          name: 'Dream Store',
          description: 'Dream Store (products, categories, inventory, orders, point redemption).',
        },
        {
          name: 'Games',
          description: 'Games (catalog, play sessions, scores, reward payouts, history).',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}
