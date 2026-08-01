import { z } from 'zod';

/**
 * Validates the Vite-exposed environment. Only `VITE_`-prefixed variables are
 * available on the client. Invalid values fail fast at startup.
 */
const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  VITE_APP_NAME: z.string().min(1).default('Super Dreams — Business Control Center'),
  // Optional dev-only bearer token for calling the authenticated API before a
  // login UI exists. Supplied via the Authorization header; empty in production.
  VITE_DEV_ACCESS_TOKEN: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_DEV_ACCESS_TOKEN: import.meta.env.VITE_DEV_ACCESS_TOKEN,
});
