import type { FastifyReply, FastifyRequest } from 'fastify';

import { NotFoundError } from '@/errors';
import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { RewardActor } from '../dto';
import type { RewardService } from '../services';
import { memberIdParamsSchema, memberTxnParamsSchema, programIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): RewardActor {
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

/** HTTP boundary for Rewards Management. Validation happens in the service (Zod). */
export class RewardController {
  public constructor(private readonly service: RewardService) {}

  // --- Programs ---

  public listPrograms = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listPrograms(request.query));
  };

  public getProgram = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = programIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getProgram(id));
  };

  public createProgram = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const detail = await this.service.createProgram(request.body, actorFrom(request));
    return sendSuccess(reply, detail, 201);
  };

  public updateProgram = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = programIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.updateProgram(id, request.body, actorFrom(request)),
    );
  };

  public changeProgramStatus = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = programIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.changeProgramStatus(id, request.body, actorFrom(request)),
    );
  };

  // --- Member rewards ---

  public getMemberBalance = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { memberId } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getMemberBalance(memberId));
  };

  public getMemberHistory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { memberId } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getMemberHistory(memberId, request.query));
  };

  public allocate = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { memberId } = memberIdParamsSchema.parse(request.params);
    const txn = await this.service.allocate(memberId, request.body, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  public redeem = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { memberId } = memberIdParamsSchema.parse(request.params);
    const redemption = await this.service.redeem(memberId, request.body, actorFrom(request));
    return sendSuccess(reply, redemption, 201);
  };

  public adjust = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { memberId } = memberIdParamsSchema.parse(request.params);
    const txn = await this.service.adjust(memberId, request.body, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  public reverse = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { memberId, transactionId } = memberTxnParamsSchema.parse(request.params);
    const txn = await this.service.reverse(memberId, transactionId, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  // --- Ledger & maintenance ---

  public listTransactions = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listTransactions(request.query));
  };

  public runExpiry = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.processExpirations(request.body, actorFrom(request)),
    );
  };

  // --- Portal self-service (ownership-scoped) ---

  public getMine = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const memberId = await this.mineMemberId(request);
    return sendSuccess(reply, await this.service.getMemberBalance(memberId));
  };

  public getMyHistory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.mineMemberId(request);
    return sendSuccess(reply, await this.service.getMemberHistory(memberId, request.query));
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
