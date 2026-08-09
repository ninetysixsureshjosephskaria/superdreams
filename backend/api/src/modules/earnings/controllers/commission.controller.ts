import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { EarningsActor } from '../dto';
import type { CommissionService } from '../services';
import { targetIdParamsSchema } from '../validators';

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

/** HTTP boundary for Commission. Validation lives in the service (Zod). */
export class CommissionController {
  public constructor(private readonly service: CommissionService) {}

  public getConfig = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.getConfig(actorFrom(request)));
  };

  public updateReferralRate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.updateReferralRate(request.body, actorFrom(request)),
    );
  };

  public setDefaultTiers = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.setDefaultTiers(request.body, actorFrom(request)));
  };

  public createTarget = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.createTarget(request.body, actorFrom(request)),
      201,
    );
  };

  public deleteTarget = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = targetIdParamsSchema.parse(request.params);
    await this.service.deleteTarget(id, actorFrom(request));
    return sendSuccess(reply, { id, deleted: true });
  };

  public processDeposit = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.processDepositEarnings(request.body, actorFrom(request)),
    );
  };
}
