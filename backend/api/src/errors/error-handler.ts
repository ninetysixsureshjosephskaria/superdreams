import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { config } from '@/config';
import type { ErrorDetail } from '@/types';
import { sendError } from '@/utils';

import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

/**
 * Converts a Zod validation failure into canonical error details.
 */
function toZodDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => {
    const field = issue.path.join('.');
    return field.length > 0 ? { field, message: issue.message } : { message: issue.message };
  });
}

/**
 * Maps a 4xx HTTP status to a stable error code for framework/library errors
 * that are not `AppError` instances (e.g. `@fastify/sensible` http errors).
 */
function codeForClientStatus(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 429:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.VALIDATION_ERROR;
  }
}

/**
 * Converts Fastify/AJV schema validation issues into canonical error details.
 */
function toValidationDetails(validation: NonNullable<FastifyError['validation']>): ErrorDetail[] {
  return validation.map((issue) => {
    const field = issue.instancePath ? issue.instancePath.replace(/^\//, '') : '';
    const message = issue.message ?? 'Invalid value';
    return field.length > 0 ? { field, message } : { message };
  });
}

/**
 * Registers the centralized error and not-found handlers.
 *
 * All responses use the canonical error envelope, including the request
 * correlation id as `traceId`. Internal details and stack traces are logged but
 * never returned to clients; in production, unexpected errors return a generic
 * message.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) =>
    sendError(
      reply,
      404,
      ErrorCode.NOT_FOUND,
      `Route ${request.method} ${request.url} was not found.`,
      { traceId: request.id },
    ),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const traceId = request.id;

    // Known, operational application errors.
    if (error instanceof AppError) {
      request.log.info({ err: error, code: error.code }, 'Application error');
      return sendError(reply, error.statusCode, error.code, error.message, { traceId });
    }

    // Zod validation failures raised from services/controllers.
    if (error instanceof ZodError) {
      return sendError(reply, 400, ErrorCode.VALIDATION_ERROR, 'Request validation failed.', {
        details: toZodDetails(error),
        traceId,
      });
    }

    // Fastify schema validation failures.
    if (error.validation) {
      return sendError(reply, 400, ErrorCode.VALIDATION_ERROR, 'Request validation failed.', {
        details: toValidationDetails(error.validation),
        traceId,
      });
    }

    // Framework/library errors that carry a client (4xx) status code.
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      return sendError(
        reply,
        error.statusCode,
        codeForClientStatus(error.statusCode),
        error.message,
        { traceId },
      );
    }

    // Unexpected, non-operational errors: log fully, expose nothing sensitive.
    request.log.error({ err: error }, 'Unhandled error');
    const message = config.app.isProduction ? 'An unexpected error occurred.' : error.message;
    return sendError(reply, 500, ErrorCode.INTERNAL_SERVER_ERROR, message, { traceId });
  });
}
