import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';

import { registerDebugRoutes } from './debug.route';

// Mock the config so `isProduction` can be toggled per test without touching
// NODE_ENV (which would also trigger production env validation).
vi.mock('@/config', () => ({ config: { app: { isProduction: false } } }));

function setProduction(value: boolean): void {
  (config.app as { isProduction: boolean }).isProduction = value;
}

describe('debug runtime endpoint production gate', () => {
  afterEach(() => {
    setProduction(false);
  });

  it('is NOT registered in production (returns 404)', async () => {
    setProduction(true);
    const app = Fastify();
    registerDebugRoutes(app);
    await app.ready();

    expect(app.hasRoute({ method: 'GET', url: '/api/v1/debug/runtime' })).toBe(false);
    const response = await app.inject({ method: 'GET', url: '/api/v1/debug/runtime' });
    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('is available outside production (returns 200)', async () => {
    setProduction(false);
    const app = Fastify();
    registerDebugRoutes(app);
    await app.ready();

    expect(app.hasRoute({ method: 'GET', url: '/api/v1/debug/runtime' })).toBe(true);
    const response = await app.inject({ method: 'GET', url: '/api/v1/debug/runtime' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true });

    await app.close();
  });
});
