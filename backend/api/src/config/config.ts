import { env } from './env';

/**
 * Structured, typed application configuration.
 *
 * Grouped by concern (application, logging, database, redis, jwt, cors, rate
 * limiting, swagger) so consumers depend only on the section they need. All
 * values originate from the validated environment.
 */
export const config = {
  app: {
    env: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',
  },
  log: {
    level: env.LOG_LEVEL,
  },
  database: {
    url: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  auth: {
    accessTtlSeconds: env.AUTH_ACCESS_TTL_SECONDS,
    refreshTtlSeconds: env.AUTH_REFRESH_TTL_SECONDS,
    resetTtlSeconds: env.AUTH_RESET_TTL_SECONDS,
    verifyTtlSeconds: env.AUTH_VERIFY_TTL_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    lockout: {
      maxAttempts: env.AUTH_LOCKOUT_MAX_ATTEMPTS,
      windowSeconds: env.AUTH_LOCKOUT_WINDOW_SECONDS,
    },
    cookie: {
      name: env.AUTH_COOKIE_NAME,
      secure: env.AUTH_COOKIE_SECURE ?? env.NODE_ENV === 'production',
      sameSite: env.AUTH_COOKIE_SAMESITE,
    },
  },
  rbac: {
    cacheEnabled: env.RBAC_CACHE_ENABLED,
    permissionCacheTtlSeconds: env.RBAC_PERMISSION_CACHE_TTL_SECONDS,
  },
  cors: {
    origins:
      env.CORS_ORIGINS === '*'
        ? true
        : env.CORS_ORIGINS.split(',')
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0),
  },
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    window: env.RATE_LIMIT_WINDOW,
  },
  swagger: {
    // Disabled by default in production; enabled by default elsewhere. An
    // explicit SWAGGER_ENABLED value always takes precedence.
    enabled: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
  },
} as const;

export type Config = typeof config;
