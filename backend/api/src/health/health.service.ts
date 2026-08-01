import type { FastifyInstance } from 'fastify';

import type { DependencyHealth, HealthReport, HealthStatus } from '@/types';
import { withTimeout } from '@/utils';

const PING_TIMEOUT_MS = 2000;

/**
 * Runs a single dependency probe with a timeout, capturing status and latency.
 */
async function checkDependency(probe: () => Promise<void>): Promise<DependencyHealth> {
  const startedAt = performance.now();
  try {
    await withTimeout(probe(), PING_TIMEOUT_MS, 'Health probe timed out');
    return { status: 'up', latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return { status: 'down', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Collects a structured health report across the application's dependencies.
 */
export async function collectHealth(app: FastifyInstance): Promise<HealthReport> {
  const [database, redis] = await Promise.all([
    checkDependency(() => app.databasePing()),
    checkDependency(() => app.redisPing()),
  ]);

  const upCount = [database, redis].filter((dependency) => dependency.status === 'up').length;
  const status: HealthStatus = upCount === 2 ? 'ok' : upCount === 0 ? 'down' : 'degraded';

  return {
    status,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: { database, redis },
  };
}
