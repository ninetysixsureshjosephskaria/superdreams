import type { FastifyReply, FastifyRequest } from 'fastify';

import { NotFoundError } from '@/errors';
import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { EarningsActor } from '../dto';
import type { ProfitService } from '../services';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): EarningsActor {
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

/** HTTP boundary for Daily Profit. Validation lives in the service (Zod). */
export class ProfitController {
  public constructor(private readonly service: ProfitService) {}

  public getSchedule = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const schedule = await this.service.getSchedule(request.params);
    if (!schedule) {
      throw new NotFoundError('No schedule for that month.');
    }
    return sendSuccess(reply, schedule);
  };

  public planMonth = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.planMonth(request.body, actorFrom(request)));
  };

  public setDay = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.setDay(request.body, actorFrom(request)));
  };

  public publish = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.publish(request.body, actorFrom(request)));
  };

  public distribute = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.distributeForDay(request.body, actorFrom(request)),
    );
  };

  public history = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.listHistory(request.query) });
  };
}
