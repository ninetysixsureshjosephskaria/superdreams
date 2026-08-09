import type { FastifyInstance, HTTPMethods } from 'fastify';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from '@/config';
import { sendSuccess } from '@/utils';

/**
 * Runtime diagnostics endpoint (`GET /api/v1/debug/runtime`).
 *
 * Reports the deployed commit, build timestamp, and the registered
 * `/api/v1/members` routes so a stale/mismatched deployment can be diagnosed at
 * a glance. Read-only; no business logic.
 *
 * Production-gated: it is registered only outside production, so it is never
 * publicly reachable on the live deployment (it returns 404 there) while
 * remaining available for local/staging diagnosis.
 */

/** Captured once at module load — the process (deploy) start time. */
const SERVER_STARTED_AT = new Date().toISOString();

/**
 * Build timestamp = mtime of the running bundle. In the production image
 * `dist/*.js` is written by the build and COPYed (mtime preserved), so this is
 * effectively the build time; in dev it is the source file's mtime.
 */
const BUILD_TIMESTAMP: string | null = (() => {
  try {
    return statSync(fileURLToPath(import.meta.url)).mtime.toISOString();
  } catch {
    return null;
  }
})();

/** The member routes this build is expected to register (checked against the live router). */
const MEMBER_ROUTE_CANDIDATES: { method: HTTPMethods; url: string }[] = [
  { method: 'GET', url: '/api/v1/members' },
  { method: 'POST', url: '/api/v1/members' },
  { method: 'GET', url: '/api/v1/members/me' },
  { method: 'PUT', url: '/api/v1/members/me' },
  { method: 'POST', url: '/api/v1/members/demo' },
  { method: 'GET', url: '/api/v1/members/:id' },
  { method: 'PUT', url: '/api/v1/members/:id' },
  { method: 'DELETE', url: '/api/v1/members/:id' },
  { method: 'PATCH', url: '/api/v1/members/:id/status' },
  { method: 'GET', url: '/api/v1/members/:id/activity' },
  { method: 'GET', url: '/api/v1/members/:id/status-history' },
  { method: 'GET', url: '/api/v1/members/:id/notes' },
  { method: 'POST', url: '/api/v1/members/:id/notes' },
  { method: 'GET', url: '/api/v1/members/:id/documents' },
  { method: 'POST', url: '/api/v1/members/:id/documents' },
];

/** Registers the runtime diagnostics route — skipped entirely in production. */
export function registerDebugRoutes(app: FastifyInstance): void {
  if (config.app.isProduction) {
    return;
  }
  app.get(
    '/api/v1/debug/runtime',
    { schema: { tags: ['Meta'], summary: 'Runtime diagnostics (temporary)' } },
    (request, reply) => {
      const server = request.server;
      const hasRoute = (method: HTTPMethods, url: string): boolean => {
        try {
          return server.hasRoute({ method, url });
        } catch {
          return false;
        }
      };

      const memberRoutes = MEMBER_ROUTE_CANDIDATES.filter((r) => hasRoute(r.method, r.url)).map(
        (r) => `${r.method} ${r.url}`,
      );

      let routesTree: string | null = null;
      try {
        routesTree = server.printRoutes({ commonPrefix: false });
      } catch {
        routesTree = null;
      }

      return sendSuccess(reply, {
        commit:
          process.env.RAILWAY_GIT_COMMIT_SHA ??
          process.env.GIT_COMMIT_SHA ??
          process.env.SOURCE_VERSION ??
          'unknown',
        commitMessage: process.env.RAILWAY_GIT_COMMIT_MESSAGE ?? null,
        branch: process.env.RAILWAY_GIT_BRANCH ?? null,
        buildTimestamp: BUILD_TIMESTAMP,
        serverStartedAt: SERVER_STARTED_AT,
        now: new Date().toISOString(),
        members: {
          demoRegistered: hasRoute('POST', '/api/v1/members/demo'),
          routes: memberRoutes,
        },
        routesTree,
      });
    },
  );
}
