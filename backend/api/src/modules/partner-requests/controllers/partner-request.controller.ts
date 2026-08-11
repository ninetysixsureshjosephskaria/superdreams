import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { PartnerRequestActor } from '../dto';
import type { PartnerRequestService } from '../services';
import { partnerRequestIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): PartnerRequestActor {
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

/** HTTP boundary for Member→Partner requests. Validation lives in the service (Zod). */
export class PartnerRequestController {
  public constructor(private readonly service: PartnerRequestService) {}

  // --- Member self-service (own request only, derived from the token) ---------

  public submit = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const actor = actorFrom(request);
    return sendSuccess(reply, await this.service.submit(actor.userId, request.body, actor), 201);
  };

  public getMine = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const userId = requireAuth(request).userId;
    return sendSuccess(reply, await this.service.getMine(userId));
  };

  // --- Admin review (partner.request.read) ------------------------------------

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.list(request.query));
  };

  public getById = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = partnerRequestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getById(id));
  };

  // --- Admin decisions (partner.request.approve / partner.request.reject) ------

  public approve = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = partnerRequestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.approve(id, actorFrom(request)));
  };

  public reject = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = partnerRequestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.reject(id, request.body, actorFrom(request)));
  };
}
