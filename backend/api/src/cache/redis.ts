import { Redis } from 'ioredis';

import { config } from '@/config';

/**
 * Creates the Redis client.
 *
 * Uses lazy connection so startup never blocks on Redis availability; the
 * connection is established on first use (e.g. a health probe). A bounded retry
 * strategy handles transient disconnects.
 */
export function createRedisClient(): Redis {
  return new Redis(config.redis.url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
  });
}
