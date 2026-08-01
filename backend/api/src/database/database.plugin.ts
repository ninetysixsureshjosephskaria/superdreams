import type { FastifyInstance } from 'fastify';

import { createDatabaseConnection } from '@/database/connection';

/**
 * Wires the database connection into the Fastify instance.
 *
 * Decorates the instance with the Drizzle client (`db`), a `databasePing`
 * connectivity probe, and a rich `databaseHealth` snapshot, and closes the
 * connection during graceful shutdown.
 */
export function registerDatabase(app: FastifyInstance): void {
  const connection = createDatabaseConnection();

  app.decorate('db', connection.db);
  app.decorate('databasePing', connection.ping);
  app.decorate('databaseHealth', connection.health);

  app.addHook('onClose', async () => {
    await connection.close();
  });
}
