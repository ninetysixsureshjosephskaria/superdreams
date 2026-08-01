import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '@/app';

describe('foundation endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns service metadata in the success envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });
    const body = response.json<{ success: boolean; data: { name: string; status: string } }>();

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Super Dreams API');
    expect(body.data.status).toBe('ok');
  });

  it('GET /live reports the process is alive', async () => {
    const response = await app.inject({ method: 'GET', url: '/live' });
    const body = response.json<{ success: boolean; data: { status: string } }>();

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });

  it('GET /health returns a structured report with dependency statuses', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json<{
      success: boolean;
      data: {
        status: string;
        services: { database: { status: string }; redis: { status: string } };
      };
    }>();

    expect(response.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(['ok', 'degraded', 'down']).toContain(body.data.status);
    expect(body.data.services.database).toHaveProperty('status');
    expect(body.data.services.redis).toHaveProperty('status');
  });

  it('unknown routes return the standard 404 error envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/no-such-route' });
    const body = response.json<{
      success: boolean;
      error: { code: string };
      traceId: string;
    }>();

    expect(response.statusCode).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(typeof body.traceId).toBe('string');
  });
});
