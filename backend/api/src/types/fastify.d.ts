import type { Redis } from 'ioredis';

import type { Database } from '@/database';
import type { DatabaseHealth } from '@/database/connection';
import type { RequestContext } from '@/middleware';
import type { AuthContext } from '@/modules/auth/middleware';
import type { ResolvedAuthorization } from '@/modules/rbac/dto';
import type { SchedulerRuntime } from '@/scheduler';

declare module 'fastify' {
  interface FastifyInstance {
    /** Drizzle ORM database client. */
    db: Database;
    /** Probes database connectivity; rejects if unreachable. */
    databasePing: () => Promise<void>;
    /** Rich database health snapshot (connectivity, latency, version, migrations, pool). */
    databaseHealth: () => Promise<DatabaseHealth>;
    /** Redis client. */
    redis: Redis;
    /** Probes Redis connectivity; rejects if unreachable. */
    redisPing: () => Promise<void>;
    /** Background job scheduler runtime. Created at wiring time; started only by
     *  the server process (never in `buildApp`). Stopped on app close. */
    scheduler: SchedulerRuntime;
  }

  interface FastifyRequest {
    /** Per-request context (correlation id and, later, the authenticated principal). */
    requestContext?: RequestContext;
    /** Authenticated principal for the request, or `null` when unauthenticated. */
    auth: AuthContext | null;
    /** Resolved (effective) authorization for the request, or `null` until loaded. */
    authz: ResolvedAuthorization | null;
  }
}
