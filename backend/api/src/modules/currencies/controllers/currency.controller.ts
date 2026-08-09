import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { CurrencyActor } from '../dto';
import type { CurrencyService } from '../services';
import { currencyCodeParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): CurrencyActor {
  const context = requireAuth(request);
  const userAgent = request.headers['user-agent'];
  const requestId = request.requestContext?.requestId;
  return {
    userId: context.userId,
    ipAddress: request.ip.length > 0 ? request.ip : null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    correlationId: requestId && UUID_RE.test(requestId) ? requestId : null,
  };
}

/** HTTP boundary for Currencies. Validation lives in the service (Zod). */
export class CurrencyController {
  public constructor(private readonly service: CurrencyService) {}

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.list(request.query) });
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { code } = currencyCodeParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.get(code));
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.create(request.body, actorFrom(request)), 201);
  };

  public update = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { code } = currencyCodeParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.update(code, request.body, actorFrom(request)));
  };

  public remove = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { code } = currencyCodeParamsSchema.parse(request.params);
    await this.service.remove(code, actorFrom(request));
    return sendSuccess(reply, { code: code.toUpperCase(), deleted: true });
  };
}
