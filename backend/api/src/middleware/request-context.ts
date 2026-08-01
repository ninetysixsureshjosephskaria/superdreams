import type { FastifyInstance } from 'fastify';

/**
 * Per-request context carried alongside the Fastify request.
 *
 * Currently holds the correlation/request id. Future phases extend this with the
 * authenticated principal and related request-scoped data.
 */
export interface RequestContext {
  requestId: string;
}

/**
 * Attaches a `requestContext` to every incoming request, seeded with the
 * Fastify-generated request id (used as the correlation id in logs).
 */
export function registerRequestContext(app: FastifyInstance): void {
  app.addHook('onRequest', (request, _reply, done) => {
    request.requestContext = { requestId: request.id };
    done();
  });
}
