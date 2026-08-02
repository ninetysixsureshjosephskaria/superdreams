import { z } from 'zod';

/**
 * Validates the Vite-exposed environment. Only `VITE_`-prefixed variables are
 * available on the client. Invalid values fail fast at startup.
 */
const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  VITE_APP_NAME: z.string().min(1).default('Super Dreams — Member Portal'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
});
