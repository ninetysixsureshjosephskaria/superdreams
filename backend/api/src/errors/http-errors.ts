import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

/** 400 — the request failed validation. */
export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly code = ErrorCode.VALIDATION_ERROR;

  public constructor(message = 'Validation failed.', details?: unknown) {
    super(message, details);
  }
}

/** 401 — authentication is required or has failed. */
export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  public readonly code = ErrorCode.UNAUTHORIZED;

  public constructor(message = 'Authentication is required.', details?: unknown) {
    super(message, details);
  }
}

/** 403 — the authenticated principal lacks permission. */
export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  public readonly code = ErrorCode.FORBIDDEN;

  public constructor(
    message = 'You do not have permission to perform this action.',
    details?: unknown,
  ) {
    super(message, details);
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly code = ErrorCode.NOT_FOUND;

  public constructor(message = 'The requested resource was not found.', details?: unknown) {
    super(message, details);
  }
}

/** 409 — the request conflicts with the current state of the resource. */
export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly code = ErrorCode.CONFLICT;

  public constructor(message = 'The request conflicts with the current state.', details?: unknown) {
    super(message, details);
  }
}

/** 422 — the request is well-formed but violates a business rule. */
export class BusinessRuleError extends AppError {
  public readonly statusCode = 422;
  public readonly code = ErrorCode.BUSINESS_RULE_ERROR;

  public constructor(message = 'The operation violates a business rule.', details?: unknown) {
    super(message, details);
  }
}

/** 500 — an unexpected, non-operational failure. */
export class InternalServerError extends AppError {
  public readonly statusCode = 500;
  public readonly code = ErrorCode.INTERNAL_SERVER_ERROR;

  public constructor(message = 'An unexpected error occurred.', details?: unknown) {
    super(message, details);
  }
}
