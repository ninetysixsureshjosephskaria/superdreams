import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { FinanceActor } from '../dto';
import type { FinanceService } from '../services';
import { requestIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): FinanceActor {
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

/** HTTP boundary for Finance (deposits / withdrawals). Validation lives in the service (Zod). */
export class FinanceController {
  public constructor(private readonly service: FinanceService) {}

  // --- Member self-service ---------------------------------------------------

  public createDeposit = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.service.memberIdForUser(requireAuth(request).userId);
    const result = await this.service.createDeposit(memberId, request.body, actorFrom(request));
    return sendSuccess(reply, result, 201);
  };

  public createWithdrawal = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.service.memberIdForUser(requireAuth(request).userId);
    const result = await this.service.createWithdrawal(memberId, request.body, actorFrom(request));
    return sendSuccess(reply, result, 201);
  };

  public listMine = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const memberId = await this.service.memberIdForUser(requireAuth(request).userId);
    return sendSuccess(reply, { items: await this.service.listByMember(memberId) });
  };

  public listMyTranches = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const memberId = await this.service.memberIdForUser(requireAuth(request).userId);
    return sendSuccess(reply, { items: await this.service.listTranchesByMember(memberId) });
  };

  // --- Admin -----------------------------------------------------------------

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.list(request.query));
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getById(id));
  };

  public approve = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.approve(id, request.body, actorFrom(request)));
  };

  public reject = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.reject(id, request.body, actorFrom(request)));
  };

  public hold = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.hold(id, request.body, actorFrom(request)));
  };

  // --- Tranche lifecycle (Phase 2E) -----------------------------------------

  public runTrancheMaturity = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.matureTranches(actorFrom(request)));
  };

  public earlyUnlockMyTranche = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = requestIdParamsSchema.parse(request.params);
    const userId = requireAuth(request).userId;
    return sendSuccess(
      reply,
      await this.service.earlyUnlockMyTranche(userId, id, actorFrom(request)),
    );
  };

  public liquidateTranche = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = requestIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.earlyUnlockTranche(id, actorFrom(request)));
  };

  // --- Limits policy ---------------------------------------------------------

  public getLimits = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.getLimits(actorFrom(request)));
  };

  public updateLimits = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.updateLimits(request.body, actorFrom(request)));
  };
}
