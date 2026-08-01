import type { Redis } from 'ioredis';

import type { ResolvedAuthorization } from '../dto';

/** Cache of effective (resolved) authorization, keyed by user id. */
export interface PermissionCache {
  get(userId: string): Promise<ResolvedAuthorization | null>;
  set(userId: string, value: ResolvedAuthorization): Promise<void>;
  invalidate(userId: string): Promise<void>;
}

/** No-op cache — used when Redis is unavailable or caching is disabled. */
export class NoopPermissionCache implements PermissionCache {
  public get(): Promise<ResolvedAuthorization | null> {
    return Promise.resolve(null);
  }

  public set(): Promise<void> {
    return Promise.resolve();
  }

  public invalidate(): Promise<void> {
    return Promise.resolve();
  }
}

/** Redis-backed cache of effective permissions with a configurable TTL. */
export class RedisPermissionCache implements PermissionCache {
  public constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
    private readonly keyPrefix = 'rbac:perms:',
  ) {}

  private keyFor(userId: string): string {
    return `${this.keyPrefix}${userId}`;
  }

  public async get(userId: string): Promise<ResolvedAuthorization | null> {
    const raw = await this.redis.get(this.keyFor(userId));
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as ResolvedAuthorization;
    } catch {
      return null;
    }
  }

  public async set(userId: string, value: ResolvedAuthorization): Promise<void> {
    const payload = JSON.stringify(value);
    if (this.ttlSeconds > 0) {
      await this.redis.set(this.keyFor(userId), payload, 'EX', this.ttlSeconds);
    } else {
      await this.redis.set(this.keyFor(userId), payload);
    }
  }

  public async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.keyFor(userId));
  }
}
