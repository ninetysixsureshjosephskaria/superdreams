import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '@/utils';

import { collectHealth } from './health.service';

const dependencySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['up', 'down'] },
    latencyMs: { type: 'number' },
    error: { type: 'string' },
  },
  required: ['status'],
};

const healthReportSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
    uptimeSeconds: { type: 'number' },
    timestamp: { type: 'string' },
    services: {
      type: 'object',
      properties: { database: dependencySchema, redis: dependencySchema },
      required: ['database', 'redis'],
    },
  },
  required: ['status', 'uptimeSeconds', 'timestamp', 'services'],
};

const healthResponseSchema = {
  type: 'object',
  properties: { success: { type: 'boolean' }, data: healthReportSchema },
  required: ['success', 'data'],
};

const livenessResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: { status: { type: 'string' }, uptimeSeconds: { type: 'number' } },
      required: ['status', 'uptimeSeconds'],
    },
  },
  required: ['success', 'data'],
};

/**
 * Registers liveness, readiness, and full health endpoints.
 *
 * - `GET /live`   — process liveness only; always 200 while the process runs.
 * - `GET /ready`  — readiness for traffic; 200 only when all dependencies are
 *                   healthy, otherwise 503 (see README "Health & Readiness").
 * - `GET /health` — full structured report of the application and dependencies.
 */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Full health report',
        description: 'Application status plus per-dependency (database, redis) health.',
        response: { 200: healthResponseSchema },
      },
    },
    async (_request, reply) => {
      const report = await collectHealth(app);
      return sendSuccess(reply, report);
    },
  );

  app.get(
    '/ready',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Returns 200 only when all dependencies are healthy; otherwise 503.',
        response: { 200: healthResponseSchema, 503: healthResponseSchema },
      },
    },
    async (_request, reply) => {
      const report = await collectHealth(app);
      const statusCode = report.status === 'ok' ? 200 : 503;
      return sendSuccess(reply, report, statusCode);
    },
  );

  app.get(
    '/live',
    {
      schema: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Confirms the process is running; does not check dependencies.',
        response: { 200: livenessResponseSchema },
      },
    },
    (_request, reply) =>
      sendSuccess(reply, { status: 'ok', uptimeSeconds: Math.round(process.uptime()) }),
  );
}
