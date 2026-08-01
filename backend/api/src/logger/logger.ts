import type { LoggerOptions } from 'pino';

import { config } from '@/config';

/**
 * Header/field paths that must never appear in logs.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
];

/**
 * Builds environment-aware Pino logger options for Fastify.
 *
 * - Development: human-readable, colorized output via `pino-pretty`.
 * - Test: silent, to keep test output clean.
 * - Production/staging: structured JSON for log aggregation.
 */
export function buildLoggerOptions(): LoggerOptions {
  const base: LoggerOptions = {
    level: config.log.level,
    redact: { paths: REDACT_PATHS, remove: true },
  };

  if (config.app.isTest) {
    return { ...base, level: 'silent' };
  }

  if (config.app.isProduction) {
    return base;
  }

  return {
    ...base,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  };
}
