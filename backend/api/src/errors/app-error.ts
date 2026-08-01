import type { ErrorCode } from './error-codes';

/**
 * Base class for all known (operational) application errors.
 *
 * Operational errors represent expected failure conditions (validation, missing
 * resources, permission denials) and carry an HTTP status code and a stable
 * machine-readable error code. Unknown/programmer errors are handled generically
 * by the centralized error handler and never expose internals.
 */
export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: ErrorCode;
  public readonly isOperational = true;
  public readonly details?: unknown;

  protected constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, new.target);
  }
}
