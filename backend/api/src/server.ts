import { buildApp } from '@/app';
import { config } from '@/config';

/**
 * Composition root: builds the application, installs signal handlers for
 * graceful shutdown, and starts listening.
 */
async function start(): Promise<void> {
  process.stdout.write('server starting\n');
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
    process.stdout.write('server listening\n');
    app.log.info(`Super Dreams API listening at ${address}`);

    // Start background jobs only once the server is up and dependencies are
    // ready. This is the single place schedulers start (never in `buildApp`),
    // so exactly one runtime instance ticks per process; `app.close()` (SIGINT/
    // SIGTERM) stops it via the onClose hook.
    if (config.scheduler.enabled) {
      app.scheduler.start();
    }
  } catch (error) {
    app.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
