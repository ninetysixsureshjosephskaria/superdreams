import type { FastifyReply } from 'fastify';

import type { ErrorDetail, ErrorResponse, SuccessResponse } from '@/types';

/**
 * Sends a standardized success envelope.
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200): FastifyReply {
  const body: SuccessResponse<T> = { success: true, data };
  return reply.code(statusCode).send(body);
}

export interface SendErrorOptions {
  details?: ErrorDetail[];
  traceId?: string;
}

/**
 * Sends a standardized error envelope.
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  options: SendErrorOptions = {},
): FastifyReply {
  const error: ErrorResponse['error'] = {
    code,
    message,
    ...(options.details !== undefined ? { details: options.details } : {}),
  };
  const body: ErrorResponse = {
    success: false,
    error,
    ...(options.traceId !== undefined ? { traceId: options.traceId } : {}),
  };
  return reply.code(statusCode).send(body);
}
