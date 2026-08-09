import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { EarningsActor } from '../dto';
import type { ActivationBonusService } from '../services';

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

/** HTTP boundary for the Activation Bonus. Validation lives in the service (Zod). */
export class ActivationController {
  public constructor(private readonly service: ActivationBonusService) {}

  public getConfig = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.getConfig(actorFrom(request)));
  };

  public updateConfig = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.updateConfig(request.body, actorFrom(request)));
  };

  public processMember = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.processMember(request.body, actorFrom(request)));
  };

  public processAll = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.processAll(actorFrom(request)));
  };
}
