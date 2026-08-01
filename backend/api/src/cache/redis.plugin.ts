import type { FastifyInstance } from 'fastify';

import { createRedisClient } from './redis';

/**
 * Wires the Redis client into the Fastify instance.
 *
 * Decorates the instance with the client (`redis`) and a `redisPing` probe, and
 * disconnects during graceful shutdown. Connection errors are logged rather than
 * thrown so a Redis outage never crashes the process.
 */
export function registerRedis(app: FastifyInstance): void {
  const client = createRedisClient();

  client.on('error', (error: Error) => {
    app.log.error({ err: error }, 'Redis client error');
  });

  app.decorate('redis', client);
  app.decorate('redisPing', async () => {
    await client.ping();
  });

  app.addHook('onClose', () => {
    client.disconnect();
  });
}
