import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load variables from a local .env file (no-op if the file is absent).
loadEnv();

/**
 * Parses common truthy/falsy string representations into a boolean, while also
 * accepting real booleans (useful for programmatic defaults).
 */
const booleanFromString = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: z
      .string()
      .url()
      .default('postgres://postgres:postgres@localhost:5432/superdreams'),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    JWT_SECRET: z.string().min(1).default('change-me-in-production'),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
    JWT_ISSUER: z.string().min(1).default('superdreams'),
    JWT_AUDIENCE: z.string().min(1).default('superdreams-api'),

    AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
    AUTH_REFRESH_TTL_SECONDS: z.coerce.number().int().min(300).default(604800),
    AUTH_RESET_TTL_SECONDS: z.coerce.number().int().min(300).default(3600),
    AUTH_VERIFY_TTL_SECONDS: z.coerce.number().int().min(300).default(86400),
    AUTH_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
    AUTH_LOCKOUT_WINDOW_SECONDS: z.coerce.number().int().min(30).default(900),
    AUTH_COOKIE_NAME: z.string().min(1).default('sd_refresh'),
    AUTH_COOKIE_SECURE: booleanFromString.optional(),
    AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    RBAC_CACHE_ENABLED: booleanFromString.default(true),
    RBAC_PERMISSION_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),

    CORS_ORIGINS: z.string().default('*'),

    // Email delivery. `mock` captures locally; `resend` sends via the Resend API.
    EMAIL_PROVIDER: z.enum(['mock', 'resend']).default('mock'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().min(1).default('Super Dreams <onboarding@resend.dev>'),
    // Base URL of the Member Portal, used to build activation / reset links.
    WEB_APP_URL: z.string().url().default('http://localhost:5173'),

    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
    RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),

    // Optional: when unset, the effective default is environment-dependent
    // (enabled outside production, disabled in production). See config.ts.
    SWAGGER_ENABLED: booleanFromString.optional(),

    // Background scheduler runtime (daily profit, tranche maturity, activation
    // sweep). Optional: when unset it is enabled outside the test environment.
    // The tick interval defaults to hourly; every job is idempotent, so a short
    // interval only re-checks, it never double-credits.
    SCHEDULER_ENABLED: booleanFromString.optional(),
    SCHEDULER_INTERVAL_MS: z.coerce.number().int().min(1000).default(3_600_000),
  })
  .superRefine((environment, ctx) => {
    if (
      environment.NODE_ENV === 'production' &&
      (environment.JWT_SECRET === 'change-me-in-production' || environment.JWT_SECRET.length < 16)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'A strong JWT_SECRET (at least 16 characters) is required in production.',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    console.error(`\nInvalid environment configuration:\n${issues}\n`);
    process.exit(1);
  }

  return result.data;
}

/** Validated, strongly-typed environment. Startup aborts if validation fails. */
export const env: Env = parseEnv();
