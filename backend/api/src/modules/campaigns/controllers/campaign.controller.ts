import type { FastifyReply, FastifyRequest } from 'fastify';

import { NotFoundError } from '@/errors';
import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { CampaignActor } from '../dto';
import type { CampaignService } from '../services';
import { campaignIdParamsSchema, memberIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): CampaignActor {
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

/** HTTP boundary for Campaign Management. Validation happens in the service (Zod). */
export class CampaignController {
  public constructor(private readonly service: CampaignService) {}

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.list(request.query));
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getDetail(id));
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const detail = await this.service.create(request.body, actorFrom(request));
    return sendSuccess(reply, detail, 201);
  };

  public update = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.update(id, request.body, actorFrom(request)));
  };

  public changeStatus = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.changeStatus(id, request.body, actorFrom(request)),
    );
  };

  public schedule = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.schedule(id, request.body, actorFrom(request)));
  };

  public addTargets = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.addTargets(id, request.body, actorFrom(request)));
  };

  public execute = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    const execution = await this.service.execute(id, request.body, actorFrom(request));
    return sendSuccess(reply, execution, 201);
  };

  public history = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.getHistory(id) });
  };

  public executions = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.getExecutions(id) });
  };

  public enrollments = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.listEnrollments(id, request.query));
  };

  public memberCampaigns = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { memberId } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.getMemberCampaigns(memberId) });
  };

  // --- Portal self-service (ownership-scoped) ---

  public available = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.mineMemberId(request);
    return sendSuccess(reply, { items: await this.service.getAvailableForMember(memberId) });
  };

  public mine = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const memberId = await this.mineMemberId(request);
    return sendSuccess(reply, { items: await this.service.getJoinedForMember(memberId) });
  };

  public enroll = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = campaignIdParamsSchema.parse(request.params);
    const memberId = await this.mineMemberId(request);
    const enrollment = await this.service.enroll(id, memberId, actorFrom(request));
    return sendSuccess(reply, enrollment, 201);
  };

  private async mineMemberId(request: FastifyRequest): Promise<string> {
    const context = requireAuth(request);
    const memberId = await this.service.getMemberIdForUser(context.userId);
    if (!memberId) {
      throw new NotFoundError('No member record is linked to your account.');
    }
    return memberId;
  }
}
