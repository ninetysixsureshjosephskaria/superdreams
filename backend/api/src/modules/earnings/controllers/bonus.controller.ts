import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { EarningsActor } from '../dto';
import type { BonusService } from '../services';
import { campaignIdParamsSchema } from '../validators';

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

/** HTTP boundary for Bonus Campaigns. Validation lives in the service (Zod). */
export class BonusController {
  public constructor(private readonly service: BonusService) {}

  public list = async (_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.list() });
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.get(id));
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.create(request.body, actorFrom(request)), 201);
  };

  public update = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.update(id, request.body, actorFrom(request)));
  };

  public remove = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    await this.service.remove(id, actorFrom(request));
    return sendSuccess(reply, { id, deleted: true });
  };

  public applyForDeposit = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.applyForDeposit(request.body, actorFrom(request)));
  };
}
