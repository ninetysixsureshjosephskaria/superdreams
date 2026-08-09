import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { NetworkActor } from '../dto';
import type { InviteService, NetworkService } from '../services';
import { inviteCodeParamsSchema, memberIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): NetworkActor {
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

/** HTTP boundary for Network / referrals / invites. Validation lives in the services (Zod). */
export class NetworkController {
  public constructor(
    private readonly network: NetworkService,
    private readonly invites: InviteService,
  ) {}

  // --- Member self-service (own network only) --------------------------------

  public getMyReferralSummary = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.network.memberIdForUser(requireAuth(request).userId);
    return sendSuccess(reply, await this.network.getReferralSummary(memberId));
  };

  public getMyReferrals = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.network.memberIdForUser(requireAuth(request).userId);
    return sendSuccess(reply, { items: await this.network.getDirectReferrals(memberId) });
  };

  public getMyDownline = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.network.memberIdForUser(requireAuth(request).userId);
    return sendSuccess(reply, { items: await this.network.getDownline(memberId) });
  };

  // --- Admin network visibility (network.read) -------------------------------

  public listPartners = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.network.listPartnerSummaries() });
  };

  public getMemberNode = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.network.getMemberDetail(id));
  };

  // --- Invites (admin: invite.send) ------------------------------------------

  public createInvite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.invites.create(request.body, actorFrom(request)), 201);
  };

  public listInvites = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.invites.list(request.query));
  };

  public getInvite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code } = inviteCodeParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.invites.getByCode(code));
  };

  public revokeInvite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code } = inviteCodeParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.invites.revoke(code, actorFrom(request)));
  };

  public deleteInvite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code } = inviteCodeParamsSchema.parse(request.params);
    await this.invites.remove(code, actorFrom(request));
    return sendSuccess(reply, { code, deleted: true });
  };

  // --- Invite accept / preview (authenticated caller) ------------------------

  public previewInvite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code } = inviteCodeParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.invites.preview(code));
  };

  public acceptInvite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code } = inviteCodeParamsSchema.parse(request.params);
    const userId = requireAuth(request).userId;
    return sendSuccess(reply, await this.invites.accept(code, userId, actorFrom(request)));
  };
}
