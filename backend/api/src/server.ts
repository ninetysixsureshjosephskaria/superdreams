import { buildApp } from '@/app';
import { config } from '@/config';

/**
 * Composition root: builds the application, installs signal handlers for
 * graceful shutdown, and starts listening.
 */
async function start(): Promise<void> {
  const app = await buildApp();

  const shutdown = (signal: NodeJS.Signals): void => {
    app.log.info({ signal }, 'Received shutdown signal');
    void app.close().then(
      () => {
        process.exit(0);
      },
      (error: unknown) => {
        app.log.error({ err: error }, 'Error during graceful shutdown');
        process.exit(1);
      },
    );
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  try {
    const address = await app.listen({ host: config.app.host, port: config.app.port });
    app.log.info(`Super Dreams API listening at ${address}`);
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
