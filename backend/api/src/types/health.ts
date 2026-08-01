/**
 * Overall health roll-up status.
 */
export type HealthStatus = 'ok' | 'degraded' | 'down';

/**
 * Health of a single downstream dependency.
 */
export interface DependencyHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

/**
 * Structured health report returned by the health endpoints.
 */
export interface HealthReport {
  status: HealthStatus;
  uptimeSeconds: number;
  timestamp: string;
  services: {
    database: DependencyHealth;
    redis: DependencyHealth;
  };
}
